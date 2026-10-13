import * as ort from './vendor/ort.mjs';
import createPhonemize from '../phonetics/vendor/piper_phonemize.mjs';
import { synthesisInput,audioWordTimings,wavBytes } from './timing.mjs';
ort.env.wasm.numThreads=1;ort.env.wasm.proxy=false;ort.env.wasm.wasmPaths=new URL('./vendor/',import.meta.url).href;
let engine,phonemizer,lines=[],calls=0,chain=Promise.resolve();
async function cachedModel(id){
 const manifest=await(await fetch(new URL('./model.json',import.meta.url))).json(),url=new URL('./cached-model/'+manifest.sha256,import.meta.url).href;let cache;try{cache=await caches.open('mimflo-french-voice-model-v1');const hit=await cache.match(url);if(hit)return await hit.arrayBuffer()}catch{}
 const parts=[];let received=0;
 for(const name of manifest.parts){const response=await fetch(new URL('./'+name,import.meta.url),{signal:AbortSignal.timeout(90000)});if(!response.ok)throw Error('La voix est momentanément indisponible. Réessayez.');const reader=response.body.getReader();while(true){const {done,value}=await reader.read();if(done)break;parts.push(value);received+=value.length;self.postMessage({id,type:'progress',percent:Math.min(80,received/manifest.size*80)});}}
 const blob=new Blob(parts),buffer=await blob.arrayBuffer();const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',buffer))).map(b=>b.toString(16).padStart(2,'0')).join('');if(digest!==manifest.sha256)throw Error('La préparation de la voix est incomplète. Réessayez.');try{await cache?.put(url,new Response(blob))}catch{}return buffer;
}
async function load(id){if(!engine)engine=(async()=>{const config=await(await fetch(new URL('./fr-siwis.json',import.meta.url))).json();const session=await ort.InferenceSession.create(await cachedModel(id),{executionProviders:['wasm'],graphOptimizationLevel:'all'});return {config,session}})().catch(e=>{engine=null;throw e});return engine;}
async function phonemes(text,words){
 if(!phonemizer||calls>512){calls=0;phonemizer=await createPhonemize({noInitialRun:true,locateFile:name=>new URL('../phonetics/vendor/'+name,import.meta.url).href,print:line=>lines.push(JSON.parse(line)),printErr:()=>{}})}
 lines=[];calls+=words.length+1;
 try{phonemizer.callMain(['-l','fr','--espeak_data','/','--allow_missing_phonemes','--input',JSON.stringify([{text},...words.map(text=>({text}))])])}catch(e){if(e?.status!==0){phonemizer=null;throw Error('La préparation de la lecture a échoué. Réessayez.')}}
 if(lines.length!==words.length+1)throw Error('La préparation du texte est incomplète.');return lines.map(line=>line.phonemes);
}
async function synthesize({id,text}){
 let audioCache,key;try{key=new URL('./cached/'+Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text)))).map(b=>b.toString(16).padStart(2,'0')).join(''),import.meta.url).href;audioCache=await caches.open('mimflo-french-voice-audio-v1');const hit=await audioCache.match(key);if(hit){const timings=JSON.parse(decodeURIComponent(hit.headers.get('X-MimFlo-Timings'))),buffer=await hit.arrayBuffer();self.postMessage({id,type:'audio',timings,buffer},[buffer]);return}}catch{}
 const words=text.match(/[\p{L}\p{N}]+(?:[’'-][\p{L}\p{N}]+)*/gu)||[];if(!words.length||words.length>80)throw Error('Choisissez une phrase plus courte.');
 const {config,session}=await load(id);self.postMessage({id,type:'progress',percent:85});const [full,...isolated]=await phonemes(text,words),input=synthesisInput(full,isolated,words,config.phoneme_id_map);
 const results=await session.run({input:new ort.Tensor('int64',BigInt64Array.from(input.ids,BigInt),[1,input.ids.length]),input_lengths:new ort.Tensor('int64',BigInt64Array.of(BigInt(input.ids.length)),[1]),scales:new ort.Tensor('float32',Float32Array.of(config.inference.noise_scale,config.inference.length_scale,config.inference.noise_w),[3])});
 const samples=results.output.data,frames=results['/Ceil_output_0'].data,timings=audioWordTimings(input,frames,config.audio.sample_rate,samples.length),wav=wavBytes(samples,config.audio.sample_rate);
 try{if(audioCache&&key){await audioCache.put(key,new Response(wav,{headers:{'Content-Type':'audio/wav','X-MimFlo-Timings':encodeURIComponent(JSON.stringify(timings))}}));const keys=await audioCache.keys();for(const old of keys.slice(0,Math.max(0,keys.length-100)))await audioCache.delete(old)}}catch{}
 for(const value of Object.values(results))value.dispose();const buffer=wav.buffer;self.postMessage({id,type:'audio',timings,buffer},[buffer]);
}
self.onmessage=({data})=>{if(data.type!=='synthesize')return;chain=chain.then(()=>synthesize(data)).catch(e=>self.postMessage({id:data.id,type:'error',message:e.message||'La lecture est indisponible. Réessayez.'}));};
