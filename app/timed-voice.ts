import {releaseIdleLocalPronunciation} from './local-pronunciation';
import {cachedFrenchAudio,rememberFrenchAudio} from './french-audio-cache';
export type VoiceClip={blob:Blob;timings:{index:number;text:string;start:number;end:number}[]};
let worker:Worker|null=null,sequence=0,idle:ReturnType<typeof setTimeout>|undefined;
const pending=new Map<number,{resolve:(clip:VoiceClip)=>void;reject:(error:Error)=>void;progress?:(percent:number)=>void}>();
function getWorker(){clearTimeout(idle);if(worker)return worker;worker=new Worker('/speech/worker.mjs?v=2',{type:'module'});worker.onmessage=({data})=>{const request=pending.get(data.id);if(!request)return;if(data.type==='progress'){request.progress?.(data.percent);return}pending.delete(data.id);if(data.type==='audio')request.resolve({blob:new Blob([data.buffer],{type:'audio/wav'}),timings:data.timings});else request.reject(new Error(data.message));if(!pending.size)idle=setTimeout(()=>{worker?.terminate();worker=null},45000)};worker.onerror=()=>{for(const request of pending.values())request.reject(new Error('La voix ne répond pas sur cet appareil. Réessayez.'));pending.clear();worker?.terminate();worker=null};return worker;}
const synthesizing=new Map<string,Promise<VoiceClip>>();
export function synthesizeFrench(text:string,onProgress?:(percent:number)=>void):Promise<VoiceClip>{
 const key=text.trim(),existing=synthesizing.get(key);if(existing)return existing;
 const task=(async()=>{
  const cached=await cachedFrenchAudio(key);if(cached){onProgress?.(100);return cached}
  releaseIdleLocalPronunciation();
  const clip=await new Promise<VoiceClip>((resolve,reject)=>{const id=++sequence;pending.set(id,{resolve,reject,progress:onProgress});try{getWorker().postMessage({type:'synthesize',id,text:key})}catch{pending.delete(id);reject(new Error('La lecture nécessite un navigateur récent.'))}});
  rememberFrenchAudio(key,clip);return clip;
 })();synthesizing.set(key,task);void task.then(()=>synthesizing.delete(key),()=>synthesizing.delete(key));return task;
}
