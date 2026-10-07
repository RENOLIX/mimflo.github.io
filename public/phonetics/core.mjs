// Pure acoustic analysis; no language-model transcription or generated audio.
export const MODEL = 'onnx-community/wav2vec2-lv-60-espeak-cv-ft-ONNX';
export const REVISION = 'c69750f5043e5e1f8a71ab95dd3b98338c280c92';
export const KIND = 'phonetic-experimental';

export function wavSamples(bytes) {
  const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const tag = at => String.fromCharCode(...bytes.subarray(at, at + 4));
  if (bytes.length < 44 || tag(0) !== 'RIFF' || tag(8) !== 'WAVE') throw Error('Fichier WAV invalide.');
  let fmt, audio;
  for (let at = 12; at + 8 <= bytes.length;) {
    const size = v.getUint32(at + 4, true), end = at + 8 + size;
    if (end > bytes.length) throw Error('Fichier audio incomplet.');
    if (tag(at) === 'fmt ') {
      if (size < 16) throw Error('En-tête audio incomplet.');
      fmt = [v.getUint16(at + 8, true), v.getUint16(at + 10, true), v.getUint32(at + 12, true), v.getUint16(at + 22, true)];
    }
    if (tag(at) === 'data') audio = [at + 8, size];
    at = end + size % 2;
  }
  if (!fmt || fmt.join(',') !== '1,1,16000,16' || !audio || audio[1] % 2) throw Error('Format requis : WAV mono, 16 kHz, PCM 16 bits.');
  const samples = new Float32Array(audio[1] / 2);
  for (let i = 0; i < samples.length; i++) samples[i] = v.getInt16(audio[0] + i * 2, true) / 32768;
  return samples;
}

export function phonemeTokens(ipa, vocab) {
  // Nasal vowels and affricates are indivisible labels in the model vocabulary.
  const labels = Object.keys(vocab).filter(p => !/[<>|]/.test(p)).sort((a, b) => b.length - a.length);
  const cleaned = ipa.normalize('NFD').replace(/[ˈˌ.,!?;:ːˑ\-…\u200d\u200c]/g, '').replace(/g/g, 'ɡ');
  const result = [];
  for (let i = 0; i < cleaned.length;) {
    if (/\s/.test(cleaned[i])) { i++; continue; }
    const phone = labels.find(p => cleaned.startsWith(p.normalize('NFD'), i));
    if (!phone) throw Error('Son français non pris en charge : ' + cleaned.slice(i, i + 2));
    result.push({ phone, id: vocab[phone] }); i += phone.normalize('NFD').length;
  }
  return result;
}

export function logSoftmaxRows(logits, frames, width) {
  const out = new Float32Array(logits.length);
  for (let t = 0; t < frames; t++) {
    const at = t * width; let max = -Infinity, sum = 0;
    for (let c = 0; c < width; c++) max = Math.max(max, logits[at + c]);
    for (let c = 0; c < width; c++) sum += Math.exp(logits[at + c] - max);
    const z = max + Math.log(sum);
    for (let c = 0; c < width; c++) out[at + c] = logits[at + c] - z;
  }
  return out;
}

export function greedyPhones(logp, frames, width, labels, blank = 0) {
  const phones = []; let previous = blank;
  for (let t = 0; t < frames; t++) {
    let best = 0;
    for (let c = 1; c < width; c++) if (logp[t * width + c] > logp[t * width + best]) best = c;
    if (best !== blank) {
      if (best === previous) phones[phones.length - 1].endFrame = t + 1;
      else phones.push({ id: best, phone: labels[best], startFrame: t, endFrame: t + 1 });
    }
    previous = best;
  }
  return phones;
}

export function alignPhones(expected, heard) {
  const n = expected.length, m = heard.length, cols = m + 1;
  if (n * m > 12000000) throw Error('Ce passage est trop long pour cet appareil.');
  const costs = new Uint16Array((n + 1) * cols);
  for (let i = 0; i <= n; i++) costs[i * cols] = i;
  for (let j = 0; j <= m; j++) costs[j] = j;
  for (let i = 1; i <= n; i++) for (let j = 1; j <= m; j++) {
    costs[i * cols + j] = Math.min(costs[(i - 1) * cols + j] + 1, costs[i * cols + j - 1] + 1, costs[(i - 1) * cols + j - 1] + (expected[i - 1].id === heard[j - 1].id ? 0 : 1));
  }
  const aligned = []; let i = n, j = m;
  while (i || j) {
    const here = costs[i * cols + j];
    if (i && j && here === costs[(i - 1) * cols + j - 1] + (expected[i - 1].id === heard[j - 1].id ? 0 : 1)) {
      aligned.push({ expectedIndex: --i, heardIndex: --j, status: expected[i].id === heard[j].id ? 'match' : 'different' });
    } else if (i && here === costs[(i - 1) * cols + j] + 1) aligned.push({ expectedIndex: --i, heardIndex: null, status: 'missing' });
    else aligned.push({ expectedIndex: null, heardIndex: --j, status: 'added' });
  }
  return aligned.reverse();
}

export function ctcAlign(logp, frames, width, targets, blank = 0) {
  if (!targets.length) return [];
  const states = targets.length * 2 + 1;
  if (frames * states > 70000000) throw Error('Alignement trop volumineux. Choisissez un passage plus court.');
  const labels = Array.from({ length: states }, (_, s) => s % 2 ? targets[(s - 1) / 2] : blank);
  let prev = new Float32Array(states).fill(-Infinity), next = new Float32Array(states);
  const trace = new Uint8Array(frames * states);
  prev[0] = logp[blank]; prev[1] = logp[targets[0]];
  for (let t = 1; t < frames; t++) {
    next.fill(-Infinity);
    for (let s = 0; s < states; s++) {
      let best = prev[s], step = 0;
      if (s > 0 && prev[s - 1] > best) { best = prev[s - 1]; step = 1; }
      if (s > 1 && s % 2 && labels[s] !== labels[s - 2] && prev[s - 2] > best) { best = prev[s - 2]; step = 2; }
      next[s] = best + logp[t * width + labels[s]]; trace[t * states + s] = step;
    }
    [prev, next] = [next, prev];
  }
  let s = prev[states - 1] > prev[states - 2] ? states - 1 : states - 2;
  if (!Number.isFinite(prev[s])) return null;
  const spans = Array.from({ length: targets.length }, () => ({ startFrame: Infinity, endFrame: 0, frames: [] }));
  for (let t = frames - 1; t >= 0; t--) {
    if (s % 2) { const span = spans[(s - 1) / 2]; span.startFrame = t; span.endFrame = Math.max(span.endFrame, t + 1); span.frames.push(t); }
    if (t) s -= trace[t * states + s];
  }
  return spans;
}

export function vocalTiming(samples, sampleRate = 16000) {
  const hop = Math.round(sampleRate * .02), energy = [];
  let peak = 0, clipped = 0;
  for (let at = 0; at < samples.length; at += hop) {
    let sum = 0; const end = Math.min(samples.length, at + hop);
    for (let i = at; i < end; i++) { sum += samples[i] ** 2; peak = Math.max(peak, Math.abs(samples[i])); if (Math.abs(samples[i]) > .995) clipped++; }
    energy.push(Math.sqrt(sum / (end - at)));
  }
  if (peak < .004) throw Error('L’enregistrement est silencieux. Vérifiez votre microphone puis recommencez.');
  const sorted = [...energy].sort((a, b) => a - b), floor = sorted[Math.floor(sorted.length * .1)] || 0;
  const threshold = Math.max(.008, Math.min(.035, floor * 2.5));
  const voiced = energy.map(x => x >= threshold);
  const first = voiced.indexOf(true), last = voiced.lastIndexOf(true);
  if (first < 0 || voiced.filter(Boolean).length < 10) throw Error('Votre voix est trop faible. Rapprochez-vous du microphone.');
  const pauses = []; let start = -1;
  for (let i = first; i <= last + 1; i++) {
    if (i <= last && !voiced[i] && start < 0) start = i;
    if ((i > last || voiced[i]) && start >= 0) { if (i - start >= 15) pauses.push({ start: Math.round(start * 20) / 1000, seconds: Math.round((i - start) * 20) / 1000 }); start = -1; }
  }
  return { voicedSeconds: Math.round(voiced.filter(Boolean).length * 2) / 100, pauseCount: pauses.length, pauseSeconds: Math.round(pauses.reduce((sum, p) => sum + p.seconds, 0) * 100) / 100, pauses, clipped: clipped / samples.length > .01, noiseHigh: floor > .04 };
}

export function anchoredCtc(logp, frames, width, present, expected, heard) {
  const spans = [];
  // Bound both memory and alignment drift for long paid readings.
  for (let at = 0; at < present.length; at += 64) {
    const group = present.slice(at, at + 64);
    const from = Math.max(0, heard[group[0].heardIndex].startFrame - 2);
    const to = Math.min(frames, heard[group.at(-1).heardIndex].endFrame + 2);
    const aligned = ctcAlign(logp.subarray(from * width, to * width), to - from, width, group.map(p => expected[p.expectedIndex].id));
    for (let i = 0; i < group.length; i++) {
      const span = aligned?.[i];
      spans.push(span ? { startFrame: span.startFrame + from, endFrame: span.endFrame + from, frames: span.frames.map(t => t + from) } : null);
    }
  }
  return spans;
}

export function acousticAssessment({ logp, frames, width, expected, labels, samples, reference }) {
  const seconds = samples.length / 16000, timing = vocalTiming(samples);
  const heard = greedyPhones(logp, frames, width, labels), alignment = alignPhones(expected, heard);
  if (!heard.length) throw Error('Aucun phonème reconnu. Vérifiez le microphone et la langue du passage.');
  // Omitted phones have no acoustic interval; they cannot be assigned invented timestamps.
  const present = alignment.filter(p => p.expectedIndex !== null && p.heardIndex !== null);
  const spans = anchoredCtc(logp, frames, width, present, expected, heard);
  const frameSeconds = .02;
  let cursor = 0;
  const phones = alignment.map(pair => {
    if (pair.expectedIndex === null) return { expected: '', heard: heard[pair.heardIndex].phone, word: null, wordIndex: null, status: 'added', confidence: null, gop: null, start: Math.round(heard[pair.heardIndex].startFrame * 20) / 1000, end: Math.round(heard[pair.heardIndex].endFrame * 20) / 1000 };
    const target = expected[pair.expectedIndex];
    if (pair.heardIndex === null) return { expected: target.phone, heard: '', word: target.word ?? null, wordIndex: target.wordIndex ?? null, status: 'missing', confidence: null, gop: null, start: null, end: null };
    const detected = heard[pair.heardIndex], forced = spans?.[cursor++];
    // Use observed boundaries when forced alignment fails; report this in the method.
    // A forced path may slide onto a neighbouring sound when words were misread.
    // Anchor the measurement to the observed sound, never borrow that neighbour's probability.
    const anchored = forced?.frames?.filter(t => t >= detected.startFrame && t < detected.endFrame) || [];
    const usedFrames = anchored.length ? anchored : Array.from({ length: detected.endFrame - detected.startFrame }, (_, i) => detected.startFrame + i);
    let posterior = 0, margin = 0;
    for (const t of usedFrames) {
      const at = t * width; let alternative = -Infinity;
      for (let c = 1; c < width; c++) if (c !== target.id) alternative = Math.max(alternative, logp[at + c]);
      posterior += Math.exp(logp[at + target.id]); margin += logp[at + target.id] - alternative;
    }
    return { expected: target.phone, heard: detected.phone, word: target.word ?? null, wordIndex: target.wordIndex ?? null, status: pair.status, confidence: Math.round(posterior / usedFrames.length * 100), gop: Math.round(margin / usedFrames.length * 100) / 100, start: Math.round(detected.startFrame * frameSeconds * 100) / 100, end: Math.min(seconds, Math.round(detected.endFrame * frameSeconds * 100) / 100) };
  });
  const measured = phones.filter(p => p.expected && p.confidence !== null);
  const matched = phones.filter(p => p.status === 'match').length;
  // Unread sounds contribute zero; otherwise a tiny correctly read fragment would score 100.
  const score = Math.round(measured.reduce((s, p) => s + p.confidence, 0) / Math.max(1, expected.length));
  const recognized = heard.map(p => p.phone).join(' ');
  const tips = [];
  const weak = [...measured].filter(p => p.confidence < 55 || p.status === 'different').sort((a, b) => a.confidence - b.confidence).slice(0, 4);
  for (const p of weak) tips.push(`Retravaillez le son /${p.expected}/${p.word ? ' dans « ' + p.word + ' »' : ''}${p.heard !== p.expected ? ' : le modèle a détecté /' + p.heard + '/' : ''}. Écoutez votre lecture puis répétez lentement.`);
  if (phones.some(p => p.status === 'missing')) tips.push('Des sons du passage n’ont pas été reconnus. Vérifiez que vous avez lu tout le passage ; la reconnaissance peut aussi manquer un son.');
  if (timing.pauseCount) tips.push('Écoutez les pauses repérées et entraînez-vous à lire par groupes de mots. Les pauses de ponctuation restent naturelles.');
  if (timing.clipped || timing.noiseHigh) tips.push('Le son est saturé ou bruyant. Refaites la lecture dans un endroit calme avant de comparer les indices.');
  if (!tips.length) tips.push('Les sons attendus sont bien représentés dans cette lecture. Comparez plusieurs lectures du même passage.');
  return { transcript: recognized, analysis: { version: 5, kind: KIND, provider: 'wav2vec2-lv60-phoneme-ctc', model: MODEL, revision: REVISION, method: 'CTC forced alignment + mean phone posterior + log posterior margin (GOP-style)', calibrated: false, score, pronunciationScore: score, accentScore: null, fluencyScore: null, phonemes: phones, matchedPercent: Math.round(matched / expected.length * 100), expectedPhonemes: expected.length, recognizedPhonemes: heard.length, seconds: Math.round(seconds * 100) / 100, timing: { ...timing, phonesPerSecond: Math.round(heard.length / Math.max(.2, timing.voicedSeconds) * 10) / 10 }, reference, tips, limitation: 'Indice acoustique expérimental : il mesure les probabilités du modèle phonétique et les sons manquants. Il n’est pas une note validée de prononciation. L’accent et la fluidité ne sont pas calibrés ; aucune équivalence avec Azure ni niveau CECRL n’est établi.' } };
}
