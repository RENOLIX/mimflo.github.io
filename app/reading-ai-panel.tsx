'use client';
import {useEffect,useRef,useState} from 'react';
import {Sparkles,Check,Volume2,Activity,ShieldCheck} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {memberRequest} from './member-api';
import {audioToWav} from './audio-analysis';
import {localPronunciation,cancelLocalPronunciation} from './local-pronunciation';
export const isPhonetic=(a:any)=>a?.kind==='phonetic-experimental';
export function assessmentLabel(a:any){return isPhonetic(a)?'indice phonétique expérimental':a?.kind==='pronunciation'?'prononciation':'fidélité au passage'}
const decimal=(n:number)=>Number(n||0).toLocaleString('fr-FR',{maximumFractionDigits:2});
export function ReadingAnalysis({analysis}:{analysis:any}){
 if(isPhonetic(analysis)){
  const groups:{word:string;phones:any[]}[]=[];
  for(const phone of analysis.phonemes||[]){const word=phone.word||groups.at(-1)?.word||'Sons supplémentaires';if(groups.at(-1)?.word===word)groups.at(-1)!.phones.push(phone);else groups.push({word,phones:[phone]})}
  return <section className="reading-ai-result phonetic-result" aria-label="Analyse phonétique de la lecture">
   <div className="phonetic-report-heading"><span className="pill"><Volume2 size={14}/> Analyse des sons</span><span className="phonetic-experimental">Mesure expérimentale · non calibrée</span></div>
   <h3>Votre prononciation, son par son{analysis.passage?' · passage '+analysis.passage:''}</h3>
   <div className="phonetic-summary">
    <div><Sparkles/><strong>{analysis.score}<small>/100</small></strong><span>Indice phonétique</span><p>Probabilités acoustiques du modèle ; sons non reconnus inclus.</p></div>
    <div><Volume2/><strong>{analysis.matchedPercent}<small> %</small></strong><span>Sons attendus reconnus</span><p>{analysis.expectedPhonemes} sons dans le passage · {analysis.recognizedPhonemes} détectés.</p></div>
    <div><Activity/><strong>{analysis.timing?.pauseCount||0}<small> pauses</small></strong><span>Rythme de votre lecture</span><p>{decimal(analysis.timing?.voicedSeconds)} s de voix · {decimal(analysis.timing?.pauseSeconds)} s de pauses.</p></div>
    <div><ShieldCheck/><strong className="phonetic-unrated">Non calibré</strong><span>Accent et note de fluidité</span><p>Le modèle fournit des indices acoustiques, sans note d’accent validée.</p></div>
   </div>
   <p className="phonetic-key">Pour chaque son : <strong>confiance acoustique</strong> du modèle et marge GOP. Une faible confiance peut venir du microphone ou du modèle ; elle ne prouve pas une erreur de prononciation.</p>
   <details className="phonetic-details" open><summary>Détail des phonèmes par mot</summary><div className="phonetic-word-grid">{groups.map((group,i)=><div className="phonetic-word" key={i}><strong>{group.word}</strong><div className="phonetic-phones">{group.phones.map((p:any,j:number)=><div key={j} className={'phonetic-phone '+(p.status==='missing'?'unrecognized':p.status==='added'?'extra':p.confidence<55||p.status==='different'?'uncertain':'detected')}><span className="phonetic-symbol">/{p.expected||p.heard}/</span><b>{p.confidence===null?'—':p.confidence+' %'}</b><small>{p.status==='missing'?'Non reconnu':p.status==='added'?'Son supplémentaire':p.status==='different'?'Détecté : /'+p.heard+'/':'Détecté : /'+p.heard+'/'}</small>{p.gop!==null&&<small>Marge GOP {decimal(p.gop)}</small>}{p.start!==null&&<small>{decimal(p.start)}–{decimal(p.end)} s</small>}</div>)}</div></div>)}</div></details>
   {analysis.timing?.pauses?.length>0&&<details className="phonetic-details"><summary>Pauses de 0,3 seconde ou plus</summary><p>{analysis.timing.pauses.map((p:any)=>`${decimal(p.start)} s : ${decimal(p.seconds)} s`).join(' · ')}</p></details>}
   <ul>{analysis.tips?.map((tip:string)=><li key={tip}>{tip}</li>)}</ul><p className="muted small">{analysis.limitation}</p>
  </section>;
 }
 return <section className="reading-ai-result" aria-label="Résultat de l’analyse de lecture"><h3>Ancienne analyse du texte{analysis.passage?' · passage '+analysis.passage:''}</h3><div className="reading-ai-metrics"><div><strong>{analysis.score}/100</strong><span>Fidélité au passage</span></div><div><strong>{analysis.wordsPerMinute}</strong><span>Mots reconnus / minute</span></div></div><p>{analysis.missing} mots non reconnus · {analysis.different} mots différents · {analysis.added} ajouts</p>{analysis.differences?.length>0&&<details><summary>Voir les écarts repérés</summary><ul>{analysis.differences.map((d:any,i:number)=><li key={i}>{d.kind==='missing'?<>Non reconnu : <strong>{d.expected}</strong></>:d.kind==='added'?<>Ajout reconnu : <strong>{d.heard}</strong></>:<>Dans le texte : <strong>{d.expected}</strong> · reconnu : <strong>{d.heard}</strong></>}</li>)}</ul></details>}<ul>{analysis.tips?.map((tip:string)=><li key={tip}>{tip}</li>)}</ul><p className="muted small">Cette ancienne séance compare le texte reconnu au passage ; elle ne contient pas de mesures phonétiques. Enregistrez une nouvelle lecture pour analyser les sons.</p></section>;
}
export default function ReadingAiPanel({articleId,reference,blob,seconds,maxSeconds,saved,recording,passageIndex,onSaved,onBusy}:{articleId:string;reference:string;blob:Blob|null;seconds:number;maxSeconds:number;saved:boolean;recording:boolean;passageIndex:number;onSaved:(result:any)=>void|Promise<void>;onBusy:(busy:boolean)=>void}){
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
  {message&&<p className="notice" role="status" aria-live="polite">{message}</p>}{result&&<ReadingAnalysis analysis={result.analysis}/>}
 </section>;
}
