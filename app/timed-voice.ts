import {releaseIdleLocalPronunciation} from './local-pronunciation';
export type VoiceClip={blob:Blob;timings:{index:number;text:string;start:number;end:number}[]};
let worker:Worker|null=null,sequence=0,idle:ReturnType<typeof setTimeout>|undefined;
const pending=new Map<number,{resolve:(clip:VoiceClip)=>void;reject:(error:Error)=>void;progress?:(percent:number)=>void}>();
function getWorker(){clearTimeout(idle);if(worker)return worker;worker=new Worker('/speech/worker.mjs?v=1',{type:'module'});worker.onmessage=({data})=>{const request=pending.get(data.id);if(!request)return;if(data.type==='progress'){request.progress?.(data.percent);return}pending.delete(data.id);if(data.type==='audio')request.resolve({blob:new Blob([data.buffer],{type:'audio/wav'}),timings:data.timings});else request.reject(new Error(data.message));if(!pending.size)idle=setTimeout(()=>{worker?.terminate();worker=null},45000)};worker.onerror=()=>{for(const request of pending.values())request.reject(new Error('La voix ne répond pas sur cet appareil. Réessayez.'));pending.clear();worker?.terminate();worker=null};return worker;}
export function synthesizeFrench(text:string,onProgress?:(percent:number)=>void):Promise<VoiceClip>{
 releaseIdleLocalPronunciation();
 return new Promise((resolve,reject)=>{const id=++sequence;pending.set(id,{resolve,reject,progress:onProgress});try{getWorker().postMessage({type:'synthesize',id,text})}catch{pending.delete(id);reject(new Error('La lecture nécessite un navigateur récent.'))}});
}
