// Never let the browser substitute its default (possibly English) voice.
export function frenchDeviceVoice(synthesis:SpeechSynthesis,waitMs=1200):Promise<SpeechSynthesisVoice|null>{
 const select=()=>{const voices=synthesis.getVoices().filter(voice=>/^fr(?:[-_]|$)/i.test(voice.lang));return voices.find(voice=>voice.localService)||voices[0]||null};
 const voice=select();if(voice)return Promise.resolve(voice);
 return new Promise(resolve=>{
  const finish=(voice:SpeechSynthesisVoice|null)=>{clearTimeout(timer);synthesis.removeEventListener('voiceschanged',changed);resolve(voice)};
  const changed=()=>{const voice=select();if(voice)finish(voice)};
  const timer=setTimeout(()=>finish(select()),waitMs);
  synthesis.addEventListener('voiceschanged',changed);changed();
 });
}
