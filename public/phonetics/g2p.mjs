import createPiperPhonemize from './vendor/piper_phonemize.mjs?v=7';
import { phonemeTokens, alignPhones } from './core.mjs?v=10';
let instance, processedInputs = 0, output = [];
const wordCaches = new WeakMap();
export async function frenchPhones(reference, vocab, options = {}) {
  const tokens = [...reference.matchAll(/[\p{L}\p{N}]+(?:[’'-][\p{L}\p{N}]+)*/gu)], words = tokens.map(token => token[0]);
  if (!words.length || words.length > 10000) throw Error('Le texte doit contenir entre 1 et 10 000 mots.');
  // The bundled eSpeak bridge accepts small JSON input batches. Bound both
  // sentence context and per-word label requests before entering its WASM ABI.
  const batchWords = 30;
  if (words.length > batchWords) {
    const full = [];
    for (let offset = 0; offset < words.length; offset += batchWords) {
      const end = Math.min(words.length, offset + batchWords);
      const text = reference.slice(offset === 0 ? 0 : tokens[offset].index, tokens[end]?.index ?? reference.length).trim();
      full.push(...(await frenchPhones(text, vocab, options)).map(phone => ({ ...phone, wordIndex: phone.wordIndex + offset })));
      options.onProgress?.(end / words.length);
    }
    return full;
  }
  // The bundled CLI retains heap allocations across callMain invocations.
  // Recycle this small runtime before its fixed heap fills, including while
  // converting a long article. The expensive acoustic model stays loaded.
  let wordCache = wordCaches.get(vocab);
  if (!wordCache) { wordCache = new Map(); wordCaches.set(vocab, wordCache); }
  const missing = [...new Set(words)].filter(word => !wordCache.has(word));
  if (processedInputs + words.length + missing.length > 1024) instance = null;
  if (!instance) {
    processedInputs = 0;
    instance = await createPiperPhonemize({
      noInitialRun: true,
      locateFile: name => new URL('./vendor/' + name, import.meta.url).href,
      print: line => output.push(JSON.parse(line)), printErr: () => {}, ...options,
    });
  }
  output = [];
  processedInputs += words.length + missing.length;
  // Full sentence preserves French liaison; individual words only supply display labels.
  try { instance.callMain(['-l', 'fr', '--espeak_data', '/', '--allow_missing_phonemes', '--input', JSON.stringify([{ text: reference }, ...missing.map(text => ({ text }))])]); }
  catch (e) { if (e?.status !== 0) {instance = null; processedInputs = 0; console.error('French phonemizer', { words: words.length, outputs: output.length }, e);throw Error('La conversion phonétique du passage a échoué.');} }
  if (output.length !== missing.length + 1) throw Error('Conversion française incomplète.');
  const full = phonemeTokens(output[0].phonemes.join(''), vocab);
  output.slice(1).forEach((line, i) => wordCache.set(missing[i], phonemeTokens(line.phonemes.join(''), vocab)));
  const isolated = words.flatMap((word, i) => wordCache.get(word).map(p => ({ ...p, word, wordIndex: i })));
  while (wordCache.size > 4096) wordCache.delete(wordCache.keys().next().value);
  const pairs = alignPhones(full, isolated); let lastWord = words[0], lastIndex = 0;
  for (const pair of pairs) {
    if (pair.heardIndex !== null) { lastWord = isolated[pair.heardIndex].word; lastIndex = isolated[pair.heardIndex].wordIndex; }
    if (pair.expectedIndex !== null) { full[pair.expectedIndex].word = lastWord; full[pair.expectedIndex].wordIndex = lastIndex; }
  }
  return full;
}
