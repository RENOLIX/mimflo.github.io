export type AzureSpeechEnv={AZURE_SPEECH_KEY?:string;AZURE_SPEECH_REGION?:string};
export function azureConfigured(env:AzureSpeechEnv){return !!env.AZURE_SPEECH_KEY&&/^[a-z][a-z0-9]+$/.test(env.AZURE_SPEECH_REGION||'');}
function score(v:unknown){if(typeof v!=='number'||!Number.isFinite(v)||v<0||v>100)throw new Error('INVALID_ASSESSMENT');return Math.round(v);}
export function azureAssessment(data:any){
 if(data?.RecognitionStatus!=='Success')throw new Error('NO_SPEECH');
 const best=data.NBest?.[0],p=best?.PronunciationAssessment||best;
 const words=(best?.Words||[]).map((w:any)=>{const a=w.PronunciationAssessment||w;return {word:String(w.Word||''),accuracy:a.AccuracyScore==null?null:score(a.AccuracyScore),error:String(a.ErrorType||'None'),phonemes:(w.Phonemes||[]).map((ph:any)=>({phoneme:String(ph.Phoneme||''),accuracy:score((ph.PronunciationAssessment||ph).AccuracyScore)}))};});
 const assessment={version:2,kind:'pronunciation',provider:'azure',score:score(p?.PronScore),accuracy:score(p?.AccuracyScore),fluency:score(p?.FluencyScore),completeness:score(p?.CompletenessScore),words,tips:[] as string[],limitation:'Évaluation automatique de prononciation en français. Le bruit et la qualité du microphone peuvent influencer les scores. Ce résultat ne certifie pas votre niveau CECRL.'};
 if(assessment.accuracy<80)assessment.tips.push('Écoutez le modèle et répétez lentement les mots signalés, en articulant chaque son.');
 if(assessment.fluency<80)assessment.tips.push('Relisez par groupes de mots, avec des pauses aux signes de ponctuation.');
 if(assessment.completeness<90)assessment.tips.push('Suivez le passage jusqu’au dernier mot, sans en sauter.');
 if(!assessment.tips.length)assessment.tips.push('Continuez à pratiquer ces mots dans des phrases différentes.');
 const transcript=String(best.Display||data.DisplayText||best.Lexical||'').trim();if(!transcript)throw new Error('NO_SPEECH');
 return {transcript,assessment};
}
export async function assessAzure(env:AzureSpeechEnv,audio:Uint8Array,reference:string){
 if(!azureConfigured(env))throw new Error('AZURE_NOT_CONFIGURED');
 const config={ReferenceText:reference,GradingSystem:'HundredMark',Granularity:'Phoneme',Dimension:'Comprehensive',EnableMiscue:true};
 const encoded=new TextEncoder().encode(JSON.stringify(config));let binary='';for(const b of encoded)binary+=String.fromCharCode(b);
 const response=await fetch(`https://${env.AZURE_SPEECH_REGION}.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1?language=fr-FR&format=detailed`,{method:'POST',headers:{'Ocp-Apim-Subscription-Key':env.AZURE_SPEECH_KEY!,'Content-Type':'audio/wav; codecs=audio/pcm; samplerate=16000','Pronunciation-Assessment':btoa(binary),Accept:'application/json'},body:audio as BodyInit,signal:AbortSignal.timeout(55000)});
 if(!response.ok)throw new Error(response.status===429?'AZURE_QUOTA':'AZURE_UNAVAILABLE');
 return azureAssessment(await response.json());
}
