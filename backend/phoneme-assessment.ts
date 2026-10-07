type PhonemeEnv={PHONEME_API_URL?:string;PHONEME_API_TOKEN?:string};

export function phonemeConfigured(env:PhonemeEnv){return !!env.PHONEME_API_URL;}

/**
 * Adapter for a hosted French Wav2Vec2/XLS-R inference service.
 * The service receives WAV audio and the reference passage, then returns
 * calibrated word/phoneme/prosody scores. The adapter deliberately does not
 * invent scores when the model service is unavailable.
 */
export async function assessPhonemes(env:PhonemeEnv,audio:Uint8Array,reference:string){
 if(!env.PHONEME_API_URL)throw new Error('PHONEME_NOT_CONFIGURED');
 let binary='';for(const byte of audio)binary+=String.fromCharCode(byte);
 const response=await fetch(env.PHONEME_API_URL,{method:'POST',headers:{'Content-Type':'application/json',...(env.PHONEME_API_TOKEN?{Authorization:'Bearer '+env.PHONEME_API_TOKEN}:{})},body:JSON.stringify({audio: btoa(binary),reference,language:'fr-FR'}),signal:AbortSignal.timeout(55000)});
 if(!response.ok)throw new Error('PHONEME_UNAVAILABLE');
 const data:any=await response.json();
 if(!data?.assessment||typeof data.assessment.score!=='number')throw new Error('INVALID_PHONEME_ASSESSMENT');
 return {transcript:String(data.transcript||''),assessment:{...data.assessment,provider:'wav2vec2-xls-r',kind:'pronunciation',version:3}};
}
