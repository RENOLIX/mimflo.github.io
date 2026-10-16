import {AutoModelForCTC,AutoProcessor,env} from './vendor/transformers.min.js';
import {MODEL,REVISION,logSoftmaxRows} from './core.mjs?v=13';
import {resilientInference} from './inference-recovery.mjs?v=2';
env.allowLocalModels=false;env.useBrowserCache=true;
env.backends.onnx.wasm.numThreads=1;
env.backends.onnx.wasm.wasmPaths=new URL('./vendor/',import.meta.url).href;
let pending,queue=Promise.resolve(),notify=()=>{};
const diagnostic=(stage,device)=>{if(/[?&](gpu|cpu)=1/.test(self.location.search))self.postMessage({type:'diagnostic',stage,device});};
async function run(engine,samples){
 const input=await engine.processor(samples);let result;
 try{result=await engine.model(input);return {values:logSoftmaxRows(result.logits.data,result.logits.dims[1],engine.labels.length),frameCount:result.logits.dims[1]};}
 finally{for(const tensor of [...Object.values(input),...Object.values(result||{})]){try{await tensor?.dispose?.();}catch{/* A lost GPU must not mask the inference error or stop CPU recovery. */}}}
}
export function prepareEngine(onProgress){
 if(onProgress)notify=onProgress;
 if(!pending)pending=(async()=>{
  const response=await fetch(`https://huggingface.co/${MODEL}/resolve/${REVISION}/vocab.json`,{signal:AbortSignal.timeout(30000)});
  if(!response.ok)throw Error('La préparation est indisponible. Vérifiez votre connexion puis réessayez.');
  const vocab=await response.json(),labels=[];for(const [phone,index] of Object.entries(vocab))labels[index]=phone;
  const processorPromise=AutoProcessor.from_pretrained(MODEL,{revision:REVISION});
  // Mobile GPU availability is not evidence that it can hold this acoustic model.
  // Use the CPU backend explicitly: some Android drivers advertise WebGPU but
  // cannot allocate even a 192 KB input buffer. UA detection is not sufficient
  // when Chrome is in desktop mode. Never probe that broken path in production.
  let device='wasm';
  diagnostic('model-loading',device);
  const options={revision:REVISION,dtype:'q4',device,progress_callback:p=>{if(p.status==='progress'&&/\.onnx(?:$|_)/.test(p.file||''))notify(Math.min(100,p.progress||0));}};
  let model;
  try{model=await AutoModelForCTC.from_pretrained(MODEL,options);}
  catch(e){if(device==='wasm')throw e;device='wasm';model=await AutoModelForCTC.from_pretrained(MODEL,{...options,device});}
  const engine={model,processor:await processorPromise,vocab,labels,device};
  let fallback;
  engine.useWasm=()=>fallback||(fallback=(async()=>{
   diagnostic('cpu-recovery','wasm');
   try{await engine.model.dispose?.();}catch{/* Device may already be lost. */}
   engine.model=null;
   engine.model=await AutoModelForCTC.from_pretrained(MODEL,{...options,device:'wasm'});
   engine.device='wasm';
  })());
  diagnostic('kernel-warmup',device);
  // Warm short-window kernels while the client is browsing or reading.
  try{await resilientInference(engine,new Float32Array(48000),run);}
  catch(e){try{await engine.model?.dispose?.();}catch{}throw e;}
  return engine;
 })().catch(e=>{pending=null;throw e;});
 return pending;
}
export function inferAudio(samples){
 const task=queue.then(async()=>resilientInference(await prepareEngine(),samples,run));queue=task.catch(()=>{});return task;
}
