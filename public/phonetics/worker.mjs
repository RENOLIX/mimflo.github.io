import { AutoModelForCTC, AutoProcessor, env } from './vendor/transformers.min.js';
import { MODEL, REVISION, wavSamples, logSoftmaxRows, acousticAssessment, vocalTiming } from './core.mjs?v=7';
import { frenchPhones } from './g2p.mjs?v=7';
env.allowLocalModels = false;
env.useBrowserCache = true;
env.backends.onnx.wasm.numThreads = 1;
env.backends.onnx.wasm.wasmPaths = new URL('./vendor/', import.meta.url).href;
let enginePromise, running = false;
const progress = (id, message, percent) => self.postMessage({ id, type: 'progress', message, percent });
async function loadEngine(id) {
  if (!enginePromise) enginePromise = (async () => {
    const base = `https://huggingface.co/${MODEL}/resolve/${REVISION}/`;
    const v = await fetch(base + 'vocab.json'); if (!v.ok) throw Error('Le dictionnaire phonétique est inaccessible. Vérifiez votre connexion.');
    const vocab = await v.json();
    const model = await AutoModelForCTC.from_pretrained(MODEL, {
      revision: REVISION, dtype: 'q8', device: 'wasm',
      progress_callback: p => {
        if (p.status === 'progress') progress(id, `Téléchargement du modèle : ${Math.floor(p.progress || 0)} %`, Math.floor(p.progress || 0));
        else if (p.status === 'initiate') progress(id, 'Préparation du modèle phonétique…');
      },
    });
    const processor = await AutoProcessor.from_pretrained(MODEL, { revision: REVISION });
    const labels = []; for (const [phone, index] of Object.entries(vocab)) labels[index] = phone;
    return { model, processor, vocab, labels };
  })().catch(e => { enginePromise = null; throw e; });
  return enginePromise;
}
self.onmessage = async ({ data }) => {
  if (data.type === 'prepare') { try { await loadEngine(data.id); } catch { /* Retry with visible errors when analysis is requested. */ } return; }
  if (data.type !== 'analyse') return;
  const { id, reference, wav, partial = false } = data;
  if (running) { self.postMessage({ id, type: 'error', message: 'Une analyse est déjà en cours.' }); return; }
  running = true;
  try {
    const samples = wavSamples(new Uint8Array(wav)); vocalTiming(samples);
    if (samples.length / 16000 > 3600 || samples.length / 16000 < 3) throw Error('La lecture doit durer entre 3 secondes et 60 minutes.');
    const { model, processor, vocab, labels } = await loadEngine(id);
    progress(id, 'Conversion du passage en phonèmes français…');
    const expected = await frenchPhones(reference, vocab);
    // Six-second windows bound attention memory; one second of context on either side.
    const hop = 320, block = 16000 * 6, context = 16000;
    const totalFrames = Math.floor((samples.length - 400) / hop) + 1, width = labels.length;
    const logp = new Float32Array(totalFrames * width);
    for (let start = 0; start < samples.length; start += block) {
      const from = Math.max(0, start - context), to = Math.min(samples.length, start + block + context);
      const input = await processor(samples.subarray(from, to));
      const result = await model(input), logits = result.logits;
      const frameCount = logits.dims[1], normalized = logSoftmaxRows(logits.data, frameCount, width);
      const first = start / hop, last = Math.min(totalFrames, (start + block) / hop);
      for (let global = first; global < last; global++) {
        const local = global - from / hop;
        if (local >= frameCount) throw Error('Le modèle a produit un alignement incomplet.');
        logp.set(normalized.subarray(local * width, (local + 1) * width), global * width);
      }
      for (const tensor of [...Object.values(input), ...Object.values(result)]) tensor?.dispose?.();
      progress(id, `Analyse des sons : ${Math.min(100, Math.round((start + block) / samples.length * 100))} %`);
      await new Promise(resolve => setTimeout(resolve, 0));
    }
    progress(id, 'Alignement CTC et calcul des indices acoustiques…');
    const result = acousticAssessment({ logp, frames: totalFrames, width, expected, labels, samples, reference, partial });
    self.postMessage({ id, type: 'result', result });
  } catch (e) {
    console.error('MimFlo phonetic engine', e);
    self.postMessage({ id, type: 'error', message: /memory|allocation/i.test(e?.message || '') ? 'Mémoire insuffisante. Fermez les autres onglets puis essayez une lecture plus courte sur un ordinateur.' : 'Analyse phonétique interrompue : ' + (e?.message || 'erreur du moteur vocal') });
  } finally { running = false; }
};
