import assert from 'node:assert/strict';import fs from 'node:fs/promises';import {build} from 'esbuild';
await build({entryPoints:['app/local-pronunciation.ts'],bundle:true,platform:'node',format:'esm',outfile:'.qa/analysis-progress-test.mjs'});
const nativeTimeout=globalThis.setTimeout;let serial=0,created=0,last,terminated=0;const timers=new Map();
globalThis.setTimeout=(fn,ms)=>{const id=++serial;timers.set(id,{fn,ms});return id};globalThis.clearTimeout=id=>timers.delete(id);
class Worker extends EventTarget{constructor(){super();created++}postMessage(message){last={worker:this,...message}}terminate(){terminated++}}
globalThis.Worker=Worker;globalThis.window={Worker,WebAssembly};
const {localPronunciation,cancelLocalPronunciation,ANALYSIS_STALL_MS,ANALYSIS_MAX_MS}=await import('../.qa/analysis-progress-test.mjs');
const flush=()=>new Promise(resolve=>nativeTimeout(resolve,5));
async function started(){for(let i=0;i<100&&!last;i++)await flush();assert.ok(last);return last}
const emit=(job,data)=>job.worker.dispatchEvent(new MessageEvent('message',{data:{id:job.id,...data}}));
let updates=[];const p=localPronunciation(new Uint8Array([1,2,3]),'Bonjour',30,x=>updates.push(x));const job=await started();
assert.match(job.audioHash,/^[a-f0-9]{64}$/,'Acoustic cache is tied to the actual audio');
emit(job,{type:'progress',percent:25,phase:'preparing'});const stall=[...timers].find(([_,t])=>t.ms===ANALYSIS_STALL_MS)[0];
emit(job,{type:'progress',percent:25,phase:'preparing'});assert.ok(timers.has(stall),'Repeated stagnant progress cannot postpone the timeout');
emit(job,{type:'progress',percent:8,phase:'preparing'});assert.equal(updates.at(-1).percent,25,'Progress never moves backwards');
emit(job,{type:'progress',percent:45,phase:'analysing',remainingSeconds:42});assert.equal(updates.at(-1).remainingSeconds,42);assert.equal(timers.has(stall),false,'Completed work renews the stall deadline');
emit(job,{type:'progress',percent:NaN,phase:'analysing'});assert.equal(updates.at(-1).percent,45);
emit(job,{type:'progress',percent:100,phase:'finishing'});assert.equal(updates.at(-1).percent,97,'Only successful persistence may display 100%');
emit(job,{type:'result',result:{analysis:{score:10},transcript:''}});await p;assert.ok(![...timers.values()].some(t=>t.ms===ANALYSIS_STALL_MS),'Success clears the stall deadline');
last=null;const stalled=localPronunciation(new Uint8Array([4]),'Bonjour',30);await started();const rejected=assert.rejects(stalled,/n’avance plus/);[...timers.values()].find(t=>t.ms===ANALYSIS_STALL_MS).fn();await rejected;assert.equal(terminated,1);
last=null;const total=localPronunciation(new Uint8Array([5]),'Bonjour',30);await started();const bounded=assert.rejects(total,/prend trop de temps/);[...timers.values()].find(t=>t.ms===ANALYSIS_MAX_MS).fn();await bounded;assert.equal(terminated,2);
const count=created;last=null;const early=localPronunciation(new Uint8Array([6]),'Bonjour',30);const cancelled=assert.rejects(early,/annulée/);cancelLocalPronunciation();await cancelled;assert.equal(created,count,'Cancellation during hashing must not start a hidden worker');
last=null;const word=localPronunciation(new Uint8Array([1,2,3]),'Bonjour',1,undefined,false,{wordPractice:true});const wordJob=await started();assert.equal(wordJob.wordPractice,true,'Word repetitions use a separate mode and cannot borrow a cached whole-reading result');emit(wordJob,{type:'result',result:{analysis:{score:25},transcript:''}});assert.equal((await word).analysis.score,25);
console.log('PASS: real progress routing, monotonic percent, estimated time, bounded stalls and total duration, clean retry and early cancellation. Worker inference mocked.');

