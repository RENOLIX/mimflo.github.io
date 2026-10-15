import manifest from './prepared-voice-manifest.json';
import type {VoiceClip} from './timed-voice';
export type PreparedVoice={src:string;duration:number;timings:VoiceClip['timings']};
const catalogue:Record<string,string>=manifest;
const pending=new Map<string,Promise<PreparedVoice|null>>();
export function preparedFrenchVoice(text:string):Promise<PreparedVoice|null>{
 const cached=pending.get(text);if(cached)return cached;
 const task=(async()=>{
  const key=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text)))).map(n=>n.toString(16).padStart(2,'0')).join('');
  const path=catalogue[key];if(!path)return null;
  const response=await fetch(path,{cache:'force-cache',signal:AbortSignal.timeout(10000)});if(!response.ok)throw Error('La lecture audio n’est pas disponible. Réessayez.');
  const voice=await response.json() as PreparedVoice;
  if(!voice.src.startsWith('/speech/ready/')||!voice.timings.length||!Number.isFinite(voice.duration))throw Error('La lecture audio est incomplète. Réessayez.');
  return voice;
 })();pending.set(text,task);task.catch(()=>pending.delete(text));return task;
}
