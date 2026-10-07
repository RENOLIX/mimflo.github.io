'use client';
import {useEffect,useRef,useState} from 'react';
import {Sparkles,Check} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {memberRequest} from './member-api';
import {ReadingAnalysis} from './reading-report';
import {audioToWav} from './audio-analysis';
import {localPronunciation,cancelLocalPronunciation} from './local-pronunciation';
export const isPhonetic=(a:any)=>a?.kind==='phonetic-experimental';
export function assessmentLabel(a:any){return isPhonetic(a)?'indice phonétique expérimental':a?.kind==='pronunciation'?'prononciation':'fidélité au passage'}
export {ReadingAnalysis} from './reading-report';
export default function ReadingAiPanel({articleId,reference,blob,seconds,maxSeconds,saved,recording,passageIndex,onSaved,onBusy,onRetry}:{articleId:string;reference:string;blob:Blob|null;seconds:number;maxSeconds:number;saved:boolean;recording:boolean;passageIndex:number;onSaved:(result:any)=>void|Promise<void>;onBusy:(busy:boolean)=>void;onRetry?:()=>void}){
 const [consent,setConsent]=useState(false),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[result,setResult]=useState<any>(null),[job,setJob]=useState('');
 const prepared=useRef<any>(null),mounted=useRef(true);
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;cancelLocalPronunciation()}},[]);
 useEffect(()=>{setResult(null);setMessage('');setJob('');setConsent(false);prepared.current=null},[blob]);
 async function analyse(){
  if(!blob||!consent)return;setBusy(true);onBusy(true);setMessage('Préparation de votre lecture…');const key=job||crypto.randomUUID();setJob(key);
  try{
   if(!prepared.current){const permission=await memberRequest('/analysis/status');if(permission.allowed===false)throw new Error(permission.message||'Cette analyse n’est pas incluse dans votre accès.');const wav=await audioToWav(blob,maxSeconds);prepared.current=await localPronunciation(wav,reference,seconds,m=>{if(mounted.current)setMessage(m)})}
   if(!mounted.current)return;
   setMessage('Sauvegarde de l’analyse dans votre espace…');
   const local=prepared.current;
   const data=await memberRequest('/analysis/local',{id:key,consent:true,articleId,passageIndex,seconds:local.analysis.seconds,analysis:local.analysis});
   setResult(data);setMessage('Votre analyse est sauvegardée.');await onSaved({...data,recordingBlob:blob});
  }catch(e:any){if(mounted.current)setMessage(e.message+(prepared.current?' Votre analyse est prête. Réessayez pour sauvegarder, sans la recalculer.':''))}
  finally{if(mounted.current)setBusy(false);onBusy(false)}
 }
 return <section className="reading-ai-panel"><div className="reading-ai-heading"><Sparkles/><div><h3>Analyse phonétique de votre lecture</h3><p>Un modèle acoustique Wav2Vec2 reconnaît les sons français et les aligne au passage. Le premier téléchargement est d’environ 360 Mo, puis le navigateur peut réutiliser le modèle. L’analyse peut prendre plusieurs minutes selon votre appareil.</p></div></div>
  <label className="check-label"><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)} disabled={busy||saved||recording}/>J’autorise l’analyse automatique de cette lecture. Les résultats sont sauvegardés dans mon espace ; mon audio reste sur cet appareil.</label>
  <Button className="btn sage" onClick={analyse} disabled={!blob||seconds<3||seconds>maxSeconds||!consent||busy||saved||recording}>{result?<Check/>:<Sparkles/>}{result?'Analyse sauvegardée':busy?'Analyse de votre lecture…':prepared.current?'Réessayer la sauvegarde':'Analyser et sauvegarder ma lecture'}</Button>
  {busy&&!prepared.current&&<button className="text-link phonetic-cancel" onClick={cancelLocalPronunciation}>Annuler l’analyse</button>}
  {!blob&&<p className="muted small">Choisissez un passage puis enregistrez votre lecture pour commencer.</p>}
  {message&&<p className="notice" role="status" aria-live="polite">{message}</p>}{result&&<ReadingAnalysis analysis={result.analysis} onRetry={onRetry}/>}
 </section>;
}
