import { AutoModelForCTC, AutoProcessor, env } from './vendor/transformers.min.js';
import { MODEL, REVISION, wavSamples, logSoftmaxRows, acousticAssessment, vocalTiming } from './core.mjs?v=10';
import { frenchPhones } from './g2p.mjs?v=10';

env.allowLocalModels = false;
env.useBrowserCache = true;
env.backends.onnx.wasm.numThreads = 1;
env.backends.onnx.wasm.wasmPaths = new URL('./vendor/', import.meta.url).href;
let enginePromise, running = false, activeId = null, loadPercent = 0;
let cachedAudio = null;
const references = new Map();
const progress = (id, percent, phase, remainingSeconds = null) => self.postMessage({ id, type: 'progress', percent, phase, remainingSeconds });
async function loadEngine() {
  if (!enginePromise) enginePromise = (async () => {
    loadPercent = 0;
    const base = `https://huggingface.co/${MODEL}/resolve/${REVISION}/`;
    const v = await fetch(base + 'vocab.json', { signal: AbortSignal.timeout(30000) });
    if (!v.ok) throw Error('La préparation est indisponible. Vérifiez votre connexion puis réessayez.');
    const vocab = await v.json();
    const [model, processor] = await Promise.all([
      AutoModelForCTC.from_pretrained(MODEL, {
        revision: REVISION, dtype: 'q8', device: 'wasm',
        progress_callback: p => {
          // Route warm-up progress to the active analysis instead of its old preparation id.
          if (p.status === 'progress' && /\.onnx(?:$|_)/.test(p.file || '')) {
            loadPercent = Math.max(loadPercent, Math.min(100, p.progress || 0));
            if (activeId) progress(activeId, 5 + loadPercent * .2, 'preparing');
          }
        },
      }),
      AutoProcessor.from_pretrained(MODEL, { revision: REVISION }),
    ]);
    const labels = []; for (const [phone, index] of Object.entries(vocab)) labels[index] = phone;
    return { model, processor, vocab, labels };
  })().catch(e => { enginePromise = null; loadPercent = 0; throw e; });
  return enginePromise;
}
self.onmessage = async ({ data }) => {
  if (data.type === 'prepare') { try { await loadEngine(); } catch { /* Visible retry starts with analyse. */ } return; }
  if (data.type !== 'analyse') return;
  const { id, reference, wav, audioHash, partial = false } = data;
  if (running) { self.postMessage({ id, type: 'error', message: 'Une analyse est déjà en cours.' }); return; }
  running = true; activeId = id;
  try {
    const samples = wavSamples(new Uint8Array(wav)); vocalTiming(samples);
    if (samples.length / 16000 > 3600 || samples.length / 16000 < 3) throw Error('La lecture doit durer entre 3 secondes et 60 minutes.');
    progress(id, 5 + loadPercent * .2, 'preparing');
    const { model, processor, vocab, labels } = await loadEngine();
    progress(id, 25, 'preparing');
    let expected = references.get(reference);
    if (!expected) {
      expected = await frenchPhones(reference, vocab, { onProgress: fraction => progress(id, 25 + fraction * 7, 'preparing') });
      references.set(reference, expected);
      while (references.size > 3) references.delete(references.keys().next().value);
    }
    progress(id, 32, 'analysing');
    // Longer windows reduce repeated context inference on memory-rich devices.
    // Keep the smaller, proven memory footprint when capacity is low or unknown.
    const blockSeconds = Number(self.navigator?.deviceMemory) >= 8 ? 12 : 6;
    const hop = 320, block = 16000 * blockSeconds, context = 16000;
    const totalFrames = Math.floor((samples.length - 400) / hop) + 1, width = labels.length;
    // A changed reading start only requires a new alignment, not another audio inference.
    let logp = audioHash && cachedAudio?.hash === audioHash ? cachedAudio.logp : null;
    if (!logp) {
      logp = new Float32Array(totalFrames * width);
      const began = performance.now(), blocks = Math.ceil(samples.length / block);
      for (let start = 0, completed = 0; start < samples.length; start += block) {
        const from = Math.max(0, start - context), to = Math.min(samples.length, start + block + context);
        const input = await processor(samples.subarray(from, to));
        let result;
        try {
          result = await model(input);
          const logits = result.logits, frameCount = logits.dims[1];
          const normalized = logSoftmaxRows(logits.data, frameCount, width);
          const first = start / hop, last = Math.min(totalFrames, (start + block) / hop);
          for (let global = first; global < last; global++) {
            const local = global - from / hop;
            if (local >= frameCount) throw Error('La lecture n’a pas pu être traitée entièrement. Réessayez avec cet enregistrement.');
            logp.set(normalized.subarray(local * width, (local + 1) * width), global * width);
          }
        } finally {
          for (const tensor of [...Object.values(input), ...Object.values(result || {})]) tensor?.dispose?.();
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
    const result = acousticAssessment({ logp, frames: totalFrames, width, expected, labels, samples, reference, partial });
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
