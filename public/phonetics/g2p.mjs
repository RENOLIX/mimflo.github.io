import createPiperPhonemize from './vendor/piper_phonemize.mjs';
import { phonemeTokens, alignPhones } from './core.mjs';
let instance, output = [];
export async function frenchPhones(reference, vocab, options = {}) {
  if (!instance) instance = await createPiperPhonemize({
    noInitialRun: true,
    locateFile: name => new URL('./vendor/' + name, import.meta.url).href,
    print: line => output.push(JSON.parse(line)), printErr: () => {}, ...options,
  });
  const words = reference.match(/[\p{L}\p{N}]+(?:[’'-][\p{L}\p{N}]+)*/gu) || [];
  if (!words.length || words.length > 600) throw Error('Choisissez un passage de 1 à 600 mots.');
  output = [];
  // Full sentence preserves French liaison; individual words only supply display labels.
  try { instance.callMain(['-l', 'fr', '--espeak_data', '/', '--allow_missing_phonemes', '--input', JSON.stringify([{ text: reference }, ...words.map(text => ({ text }))])]); }
  catch (e) { if (e?.status !== 0) {console.error('French phonemizer', e);throw Error('La conversion phonétique du passage a échoué.');} }
  if (output.length !== words.length + 1) throw Error('Conversion française incomplète.');
  const full = phonemeTokens(output[0].phonemes.join(''), vocab);
  const isolated = output.slice(1).flatMap((line, i) => phonemeTokens(line.phonemes.join(''), vocab).map(p => ({ ...p, word: words[i] })));
  const pairs = alignPhones(full, isolated); let lastWord = words[0];
  for (const pair of pairs) {
    if (pair.heardIndex !== null) lastWord = isolated[pair.heardIndex].word;
    if (pair.expectedIndex !== null) full[pair.expectedIndex].word = lastWord;
  }
  return full;
}
