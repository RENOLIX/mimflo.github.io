import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {resilientInference,isMobileDevice} from '../public/phonetics/inference-recovery.mjs';
assert.equal(isMobileDevice({userAgent:'Mozilla/5.0 (Linux; Android 13) Chrome/140'}),true);
assert.equal(isMobileDevice({userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0)'}),true);
assert.equal(isMobileDevice({platform:'MacIntel',maxTouchPoints:5}),true);
assert.equal(isMobileDevice({userAgentData:{mobile:true}}),true);
assert.equal(isMobileDevice({platform:'Win32',maxTouchPoints:10}),false);

// Exercise the production queue and model switch, with a GPU that fails only
// after its warm-up succeeded (the failure reported on clients' devices).
const source=await fs.readFile(new URL('../public/phonetics/engine.mjs',import.meta.url),'utf8');
const events=[];let gpuCalls=0,cpuCalls=0;
globalThis.self={location:{search:''},navigator:{gpu:{requestAdapter:async()=>({})}},postMessage(){}};
const originalFetch=globalThis.fetch;
globalThis.fetch=async()=>({ok:true,json:async()=>({a:0,b:1})});
globalThis.__recoveryTest={
 env:{backends:{onnx:{wasm:{}}}},
 AutoProcessor:{from_pretrained:async()=>async samples=>({samples})},
 AutoModelForCTC:{from_pretrained:async(_model,options)=>{
  events.push('load-'+options.device);
  const model=async input=>{
   if(options.device==='webgpu'&&++gpuCalls>1)throw Error("Failed to execute 'createBuffer' on 'GPUDevice': createBuffer failed, size (192000) is too large for the implementation when mappedAtCreation == true");
   if(options.device==='wasm')cpuCalls++;
   return {logits:{data:new Float32Array([input.samples[0],2]),dims:[1,1,2],dispose(){}}};
  };
  model.dispose=async()=>{events.push('dispose-'+options.device);if(options.device==='webgpu')throw Error('Device lost');};
  return model;
 }}
};
const stubbed=source.replace(/^import .*transformers.min.js';$/m,'const {AutoModelForCTC,AutoProcessor,env}=globalThis.__recoveryTest;')
 .replace(/^import .*core.mjs\?v=12';$/m,"const MODEL='test',REVISION='test',logSoftmaxRows=data=>data;")
 .replace("'./inference-recovery.mjs?v=2'",JSON.stringify(new URL('../public/phonetics/inference-recovery.mjs',import.meta.url).href))
 .replace("new URL('./vendor/',import.meta.url).href",JSON.stringify(new URL('../public/phonetics/vendor/',import.meta.url).href));
try {
 const {prepareEngine,inferAudio}=await import('data:text/javascript;base64,'+Buffer.from(stubbed).toString('base64'));
 assert.equal((await prepareEngine()).device,'webgpu');
 const results=await Promise.all([inferAudio(new Float32Array([7])),inferAudio(new Float32Array([9]))]);
 assert.deepEqual(results.map(r=>r.values[0]),[7,9],'The exact failed PCM and next queued window are processed');
 assert.deepEqual(events,['load-webgpu','dispose-webgpu','load-wasm']);
 assert.equal(gpuCalls,2);assert.equal(cpuCalls,2);
 assert.equal((await prepareEngine()).device,'wasm');
 let retries=0;
 await assert.rejects(resilientInference({device:'wasm',useWasm(){retries++;}},new Float32Array(),async()=>{throw Error('CPU unavailable');}),/CPU unavailable/);
 assert.equal(retries,0,'CPU errors must not cause an infinite retry loop');
 // On mobile, even an advertised GPU must not be initialized.
 self.navigator={userAgent:'Mozilla/5.0 (Linux; Android 13)',gpu:{requestAdapter:async()=>{throw Error('Mobile GPU should not be requested');}}};
 const mobile=await import('data:text/javascript;base64,'+Buffer.from(stubbed+'\n// mobile session').toString('base64'));
 assert.equal((await mobile.prepareEngine()).device,'wasm');
 assert.equal((await mobile.inferAudio(new Float32Array([11]))).values[0],11);
 console.log('PASS: runtime GPU buffer failure recovers on CPU with original PCM, queued work continues, lost-device cleanup is tolerated, CPU errors remain bounded.');
}finally{globalThis.fetch=originalFetch;delete globalThis.__recoveryTest;}
