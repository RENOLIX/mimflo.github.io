import { prepareEngine, inferAudio } from './engine.mjs?v=5';
import { wavSamples, acousticAssessment, vocalTiming } from './core.mjs?v=13';
import { frenchPhones } from './g2p.mjs?v=11';
import { AcousticStream, acousticWindow } from './stream-cache.mjs?v=1';

let enginePromise, running = false, activeId = null, loadPercent = 0;
let cachedAudio = null, stream = null;
const references = new Map();
const progress = (id, percent, phase, remainingSeconds = null) => self.postMessage({ id, type: 'progress', percent, phase, remainingSeconds });
setInterval(()=>{if(activeId)self.postMessage({id:activeId,type:'activity'});},2000);
async function loadEngine() {
  if (!enginePromise) enginePromise = prepareEngine(percent=>{loadPercent=Math.max(loadPercent,percent);if(activeId)progress(activeId,5+loadPercent*.2,'preparing');}).catch(e=>{enginePromise=null;loadPercent=0;throw e;});
  return enginePromise;
}
self.onmessage = async ({ data }) => {
  if(data.type==='stream-start'){
    const holder={id:data.recordingId,cache:null,chunks:[]};stream=holder;
    try{const engine=await loadEngine();if(stream!==holder)return;holder.cache=new AcousticStream(holder.id,async samples=>(await inferAudio(samples)).values,engine.labels.length);for(const chunk of holder.chunks)holder.cache.append(chunk);holder.chunks=[];if(data.reference&&!references.has(data.reference)){const expected=await frenchPhones(data.reference,engine.vocab);references.set(data.reference,expected);while(references.size>3)references.delete(references.keys().next().value);}}
    catch{if(stream===holder)stream=null;}return;
  }
  if(data.type==='stream-samples'){const holder=stream;if(holder?.id!==data.recordingId||data.sampleRate!==16000)return;const chunk=new Float32Array(data.samples);if(holder.cache)holder.cache.append(chunk);else if(holder.chunks.reduce((n,c)=>n+c.length,0)+chunk.length<=16000*600)holder.chunks.push(chunk);return;}
  if(data.type==='stream-end'){if(stream?.id===data.recordingId)stream.cache?.finish().catch(()=>{});return;}
  if (data.type === 'prepare') { if(!running)activeId=data.id;try { const engine=await loadEngine();if(data.reference&&!references.has(data.reference)){references.set(data.reference,await frenchPhones(data.reference,engine.vocab));while(references.size>3)references.delete(references.keys().next().value);}self.postMessage({id:data.id,type:'prepared',device:engine.device}); } catch(e) { if(/[?&](gpu|cpu)=1/.test(self.location.search))self.postMessage({id:data.id,type:'error',message:String(e)}); } finally { if(!running&&activeId===data.id)activeId=null; } return; }
  if (data.type !== 'analyse') return;
  const { id, reference, articleReference,preferredStartWord, wav, audioHash, recordingId, partial = false, wordPractice = false } = data;
  const targetReference=articleReference||reference;
  if (running) { self.postMessage({ id, type: 'error', message: 'Une analyse est déjà en cours.' }); return; }
  running = true; activeId = id;
  try {
    const samples = wavSamples(new Uint8Array(wav)); vocalTiming(samples);
    if (wordPractice === true) {
      const words = reference.match(/[\p{L}\p{N}]+(?:[’'-][\p{L}\p{N}]+)*/gu) || [];
      if (!words.length || words.length > 12 || samples.length / 16000 < .3 || samples.length / 16000 > 30) throw Error('Répétez uniquement le mot ou l’expression choisi, puis arrêtez l’enregistrement.');
    } else if (samples.length / 16000 > 3600 || samples.length / 16000 < 3) throw Error('La lecture doit durer entre 3 secondes et 60 minutes.');
    progress(id, 5 + loadPercent * .2, 'preparing');
    const { vocab, labels } = await loadEngine();
    progress(id, 25, 'preparing');
    let expected = references.get(targetReference);
    if (!expected) {
      expected = await frenchPhones(targetReference, vocab, { onProgress: fraction => progress(id, 25 + fraction * 7, 'preparing') });
      references.set(targetReference, expected);
      while (references.size > 3) references.delete(references.keys().next().value);
    }
    progress(id, 32, 'analysing');
    // Longer windows reduce repeated context inference on memory-rich devices.
    // Keep the smaller, proven memory footprint when capacity is low or unknown.
    const blockSeconds = 2;
    const hop = 320, block = 16000 * blockSeconds, context = 8000;
    const totalFrames = Math.floor((samples.length - 400) / hop) + 1, width = labels.length;
    // A changed reading start only requires a new alignment, not another audio inference.
    let logp = audioHash && cachedAudio?.hash === audioHash ? cachedAudio.logp : null;
    if(!logp&&recordingId&&stream?.id===recordingId&&stream.cache?.compatible(samples)){
      const cache=stream.cache;progress(id,32+62*Math.min(1,cache.cursor/samples.length),'analysing');
      try{logp=await cache.finish(fraction=>progress(id,32+62*fraction,'analysing'));}catch{/* Recover from the preserved original WAV. */}
    }
    if (!logp) {
      logp = new Float32Array(totalFrames * width);
      const began = performance.now(), blocks = Math.ceil(samples.length / block);
      for (let start = 0, completed = 0; start < samples.length; start += block) {
        {
          const {values:normalized,frameCount}=await inferAudio(acousticWindow(samples,start,block,context));
          const first = start / hop, last = Math.min(totalFrames, (start + block) / hop);
          for (let global = first; global < last; global++) {
            const local = global - start / hop + context / hop;
            if (local >= frameCount) throw Error('La lecture n’a pas pu être traitée entièrement. Réessayez avec cet enregistrement.');
            logp.set(normalized.subarray(local * width, (local + 1) * width), global * width);
          }
        }
        completed++;
        const elapsed = (performance.now() - began) / 1000;
        const remaining = completed >= 2 ? Math.ceil(elapsed / completed * (blocks - completed)) : null;
        progress(id, 32 + 62 * completed / blocks, 'analysing', remaining);
        await new Promise(resolve => setTimeout(resolve, 0));
      }
      // Keep at most one set of acoustic measurements, bounded to 32 MB.
      cachedAudio = audioHash && logp.byteLength <= 32 * 1024 * 1024 ? { hash: audioHash, logp } : null;
    }
    progress(id, 94, 'finishing');
    await new Promise(resolve => setTimeout(resolve, 0));
    const result = acousticAssessment({ logp, frames: totalFrames, width, expected, labels, samples, reference:targetReference, partial,span:!!articleReference,preferredStartWord:preferredStartWord||0 });
    progress(id, 97, 'finishing');
    self.postMessage({ id, type: 'result', result });
  } catch (e) {
    console.error('MimFlo phonetic engine', e);
    const message = /memory|allocation/i.test(e?.message || '')
      ? 'L’appareil manque de mémoire. Fermez les autres onglets puis réessayez. Votre enregistrement reste disponible.'
      : /timeout|fetch|network/i.test(e?.message || '')
      ? 'La préparation n’a pas abouti. Vérifiez votre connexion puis réessayez. Votre enregistrement reste disponible.'
      : 'Analyse interrompue : ' + (e?.message || 'Veuillez réessayer avec votre enregistrement.');
    self.postMessage({ id, type: 'error', message });
  } finally { running = false; activeId = null; }
};
