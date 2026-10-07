type LocalResult={transcript:string;analysis:any};
let recognizerPromise:Promise<any>|null=null;

function wavSamples(wav:Uint8Array){
 const view=new DataView(wav.buffer,wav.byteOffset,wav.byteLength),start=view.getUint32(40,true)+44;
 const samples=new Float32Array((wav.byteLength-start)/2);
 for(let i=0;i<samples.length;i++)samples[i]=view.getInt16(start+i*2,true)/32768;
 return samples;
}
function words(text:string){return text.toLocaleLowerCase('fr').normalize('NFC').replace(/[’']/g,' ').match(/[\p{L}\p{N}]+/gu)||[]}
function compare(reference:string,spoken:string,seconds:number){
 const expected=words(reference),heard=words(spoken),missing=expected.filter((w,i)=>heard[i]!==w).length;
 const score=Math.max(0,Math.round((1-missing/Math.max(1,expected.length))*100));
 const wpm=Math.round(heard.length/Math.max(1,seconds)*60);
 const fluency=Math.max(0,Math.min(100,100-Math.min(60,Math.abs(wpm-125)*.7)));
 return {version:4,kind:'text-fidelity-fallback',provider:'whisper-text-fidelity',score,pronunciationScore:score,fluencyScore:Math.round(fluency),accentScore:null,expectedWords:expected.length,recognizedWords:heard.length,missing,different:0,added:Math.max(0,heard.length-expected.length),wordsPerMinute:wpm,differences:[],tips:['Comparaison textuelle de secours : elle ne constitue pas une note de prononciation phonétique.'],limitation:'Le moteur phonétique français OpenPronounce est encore en cours d’installation. Cette comparaison ne mesure ni les phonèmes ni l’accent.'};
}
async function recognizer(){
 if(!recognizerPromise)recognizerPromise=(async()=>{const load=new Function('return import("https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.7.2")');const {pipeline,env}=await load();env.allowRemoteModels=true;env.useBrowserCache=true;return pipeline('automatic-speech-recognition','Xenova/wav2vec2-large-xlsr-53-french',{device:'wasm'});})();
 return recognizerPromise;
}
export async function localPronunciation(wav:Uint8Array,reference:string,seconds:number,onProgress?:(message:string)=>void):Promise<LocalResult>{
 onProgress?.('Téléchargement du modèle vocal gratuit…');const model=await recognizer();onProgress?.('Analyse de votre prononciation sur cet appareil…');const result=await model(wavSamples(wav),{sampling_rate:16000,return_timestamps:true});const transcript=String(result?.text||'').trim();if(!transcript)throw new Error('Aucune parole reconnue.');return {transcript,analysis:compare(reference,transcript,seconds)};
}

