import type {VoiceClip} from './timed-voice';

// Same version and key as the French synthesis worker. Read the saved sound
// before starting that worker (and its WebAssembly runtime) again.
const memory=new Map<string,VoiceClip>();
const lookups=new Map<string,Promise<VoiceClip|null>>();
let bytes=0;
export function rememberFrenchAudio(text:string,clip:VoiceClip){
 const key=text.trim(),old=memory.get(key);if(old)bytes-=old.blob.size;
 memory.delete(key);memory.set(key,clip);bytes+=clip.blob.size;
 while(memory.size>100||bytes>16*1024*1024){const first=memory.keys().next().value!;bytes-=memory.get(first)!.blob.size;memory.delete(first)}
}
export function cachedFrenchAudio(text:string):Promise<VoiceClip|null>{
 const key=text.trim(),hit=memory.get(key);
 if(hit){memory.delete(key);memory.set(key,hit);return Promise.resolve(hit)}
 const pending=lookups.get(key);if(pending)return pending;
 const task=(async()=>{
  try{
   if(typeof caches==='undefined')return null;
   const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(key)))).map(n=>n.toString(16).padStart(2,'0')).join('');
   const cache=await caches.open('mimflo-french-voice-audio-v2');
   const url=new URL('/speech/cached/'+hash,location.origin).href,response=await cache.match(url);
   if(!response)return null;
   const timings=JSON.parse(decodeURIComponent(response.headers.get('X-MimFlo-Timings')||'')),blob=await response.blob();
   if(!blob.size||!Array.isArray(timings)||!timings.length||!timings.every(t=>Number.isInteger(t.index)&&typeof t.text==='string'&&Number.isFinite(t.start)&&Number.isFinite(t.end)&&t.end>=t.start)){
    await cache.delete(url);return null;
   }
   const clip={blob,timings};rememberFrenchAudio(key,clip);return clip;
  }catch{return null} // Private browsing or an evicted cache must not block speech.
 })();lookups.set(key,task);void task.finally(()=>lookups.delete(key));return task;
}
