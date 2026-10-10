import createPiperPhonemize from './vendor/piper_phonemize.mjs?v=7';
import { phonemeTokens, alignPhones } from './core.mjs?v=9';
let instance, processedInputs = 0, output = [];
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
    }
    return full;
  }
  // The bundled CLI retains heap allocations across callMain invocations.
  // Recycle this small runtime before its fixed heap fills, including while
  // converting a long article. The expensive acoustic model stays loaded.
  if (processedInputs + words.length + 1 > 512) instance = null;
  if (!instance) {
    processedInputs = 0;
    instance = await createPiperPhonemize({
      noInitialRun: true,
      locateFile: name => new URL('./vendor/' + name, import.meta.url).href,
      print: line => output.push(JSON.parse(line)), printErr: () => {}, ...options,
    });
  }
  output = [];
  processedInputs += words.length + 1;
  // Full sentence preserves French liaison; individual words only supply display labels.
  try { instance.callMain(['-l', 'fr', '--espeak_data', '/', '--allow_missing_phonemes', '--input', JSON.stringify([{ text: reference }, ...words.map(text => ({ text }))])]); }
  catch (e) { if (e?.status !== 0) {instance = null; processedInputs = 0; console.error('French phonemizer', { words: words.length, outputs: output.length }, e);throw Error('La conversion phonétique du passage a échoué.');} }
  if (output.length !== words.length + 1) throw Error('Conversion française incomplète.');
  const full = phonemeTokens(output[0].phonemes.join(''), vocab);
  const isolated = output.slice(1).flatMap((line, i) => phonemeTokens(line.phonemes.join(''), vocab).map(p => ({ ...p, word: words[i], wordIndex: i })));
  const pairs = alignPhones(full, isolated); let lastWord = words[0], lastIndex = 0;
  for (const pair of pairs) {
    if (pair.heardIndex !== null) { lastWord = isolated[pair.heardIndex].word; lastIndex = isolated[pair.heardIndex].wordIndex; }
    if (pair.expectedIndex !== null) { full[pair.expectedIndex].word = lastWord; full[pair.expectedIndex].wordIndex = lastIndex; }
  }
  return full;
}
