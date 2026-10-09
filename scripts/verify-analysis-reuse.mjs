import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {build} from 'esbuild';
await fs.mkdir('.qa',{recursive:true});
await build({entryPoints:['app/local-pronunciation.ts'],bundle:true,platform:'node',format:'esm',outfile:'.qa/local-pronunciation-test.mjs'});
const nativeTimeout=globalThis.setTimeout;
globalThis.setTimeout=(fn,ms,...args)=>{const timer=nativeTimeout(fn,ms,...args);if(ms===600000)timer.unref();return timer};
let created=0,analysed=0,terminated=0,hold=false;
class Worker extends EventTarget{
 constructor(){super();created++}
 postMessage(message){if(message.type==='prepare')return;analysed++;if(!hold)queueMicrotask(()=>this.dispatchEvent(new MessageEvent('message',{data:{id:message.id,type:'result',result:{transcript:'',analysis:{score:42,reference:message.reference}}}})))}
 terminate(){terminated++}
}
globalThis.window={Worker,WebAssembly};globalThis.Worker=Worker;
const {prepareLocalPronunciation,localPronunciation,cancelLocalPronunciation}=await import('../.qa/local-pronunciation-test.mjs');
const wav=new Uint8Array([1,2,3]);
prepareLocalPronunciation();assert.equal(created,1);
const result=await localPronunciation(wav,'Bonjour',3);assert.equal(analysed,1);
cancelLocalPronunciation();assert.equal(terminated,0,'Closing a finished report keeps its engine warm');
assert.deepEqual(await localPronunciation(wav,'Bonjour',3),result);assert.equal(analysed,1,'The identical audio and reference reuses the calculated result');
await localPronunciation(wav,'Autre texte',3);assert.equal(analysed,2,'Changing the reference requires a fresh analysis');assert.equal(created,1,'Successive recordings share the loaded engine');
hold=true;const pending=localPronunciation(new Uint8Array([4,5,6]),'Bonjour',3);await new Promise(resolve=>nativeTimeout(resolve,5));cancelLocalPronunciation();await assert.rejects(pending,/annulée/);assert.equal(terminated,1,'Cancellation stops active inference');
prepareLocalPronunciation();assert.equal(created,2,'A cancelled engine is replaced for the next recording');
console.log('PASS: engine preparation/reuse, result cache bound to audio and text, immediate cancellation and restart. Worker inference mocked; no speed or accuracy claim.');
