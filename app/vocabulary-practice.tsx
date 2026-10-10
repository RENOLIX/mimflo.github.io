'use client';
import {useEffect,useRef,useState} from 'react';
import {Mic,Square,Volume2,ArrowRight,RotateCcw,Trash2,Sparkles} from 'lucide-react';
import {audioToWav} from './audio-analysis';
import {localPronunciation,prepareLocalPronunciation,cancelLocalPronunciation,type AnalysisProgress} from './local-pronunciation';
import AnalysisLoadingOverlay from './analysis-loading-overlay';
import {listVocabularyAttempts,saveVocabularyAttempt,deleteVocabularyAttempt,type VocabularyAttempt} from './vocabulary-practice-store';
import {reportData,wordFeedback} from './reading-report-data';

type Props={word:string;scope:string;definition:string;readingScore:number|null;disabled:boolean;locked:boolean;onBusy:(busy:boolean)=>void;onListen:()=>void;onChoose:()=>void};
export default function VocabularyPractice({word,scope,definition,readingScore,disabled,locked,onBusy,onListen,onChoose}:Props){
 const [stage,setStage]=useState<'idle'|'starting'|'recording'|'analysing'>('idle'),[open,setOpen]=useState(false),[attempts,setAttempts]=useState<VocabularyAttempt[]>([]),[selected,setSelected]=useState<string|null>(null),[message,setMessage]=useState(''),[audioUrl,setAudioUrl]=useState(''),[progress,setProgress]=useState<AnalysisProgress>({percent:0,phase:'preparing'});
 const mounted=useRef(true),run=useRef(0),busy=useRef(false),recorder=useRef<MediaRecorder|null>(null),stream=useRef<MediaStream|null>(null),player=useRef<HTMLAudioElement|null>(null),timer=useRef<ReturnType<typeof setTimeout>|null>(null),began=useRef(0);
 const current=attempts.find(a=>a.id===selected)||attempts[0],latestScore=attempts.find(a=>a.analysis)?.analysis.score??null;
 useEffect(()=>{mounted.current=true;let active=true;listVocabularyAttempts(scope).then(stored=>{if(active)setAttempts(existing=>[...new Map([...stored,...existing].map(a=>[a.id,a])).values()].sort((a,b)=>b.createdAt-a.createdAt))}).catch(()=>{if(active)setMessage('Le stockage local est indisponible. Gardez cette page ouverte pour conserver vos répétitions.')});return()=>{active=false;mounted.current=false;run.current++;if(timer.current)clearTimeout(timer.current);if(recorder.current?.state==='recording'){recorder.current.onstop=null;recorder.current.stop()}stream.current?.getTracks().forEach(t=>t.stop());if(busy.current){cancelLocalPronunciation();onBusy(false)}}},[scope]);
 useEffect(()=>{if(!current?.blob){setAudioUrl('');return}const url=URL.createObjectURL(current.blob);setAudioUrl(url);return()=>URL.revokeObjectURL(url)},[current?.id,current?.blob]);
 useEffect(()=>{if(disabled||locked||stage!=='idle')player.current?.pause()},[disabled,locked,stage]);
 function lock(value:boolean){busy.current=value;onBusy(value)}
 function update(attempt:VocabularyAttempt){setAttempts(previous=>[attempt,...previous.filter(a=>a.id!==attempt.id)].sort((a,b)=>b.createdAt-a.createdAt));setSelected(attempt.id)}
 async function persist(attempt:VocabularyAttempt){try{await saveVocabularyAttempt(attempt)}catch{if(mounted.current)setMessage('Votre répétition reste disponible dans cette page. Le stockage de cet appareil est indisponible.')}}
 async function analyse(attempt:VocabularyAttempt,operation=++run.current){
  lock(true);setStage('analysing');setProgress({percent:0,phase:'preparing'});setMessage('');
  try{const wav=await audioToWav(attempt.blob,30,.3);if(!mounted.current||operation!==run.current)return;const result=await localPronunciation(wav,word,attempt.seconds,setProgress,false,{wordPractice:true});if(!mounted.current||operation!==run.current)return;const measured={...attempt,analysis:result.analysis};update(measured);await persist(measured);if(mounted.current&&operation===run.current)setProgress({percent:100,phase:'done'});
  }catch(e:any){if(mounted.current&&operation===run.current)setMessage(e.message)}finally{if(mounted.current&&operation===run.current){setStage('idle');lock(false)}}
 }
 async function start(){
  if(disabled||locked||busy.current)return;const operation=++run.current;setOpen(true);setMessage('');setStage('starting');lock(true);
  try{if(!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder)throw Error('Autorisez le microphone dans un navigateur récent pour répéter ce mot.');const media=await navigator.mediaDevices.getUserMedia({audio:true});if(!mounted.current||operation!==run.current){media.getTracks().forEach(t=>t.stop());return}stream.current=media;const rec=new MediaRecorder(media),chunks:BlobPart[]=[];recorder.current=rec;
   rec.ondataavailable=e=>{if(e.data.size)chunks.push(e.data)};
   rec.onerror=()=>{run.current++;if(timer.current)clearTimeout(timer.current);media.getTracks().forEach(t=>t.stop());rec.onstop=null;if(mounted.current){setStage('idle');lock(false);setMessage('L’enregistrement a été interrompu. Vérifiez votre microphone et réessayez.')}};
   rec.onstop=async()=>{if(timer.current)clearTimeout(timer.current);media.getTracks().forEach(t=>t.stop());if(!mounted.current||operation!==run.current)return;setStage('analysing');setProgress({percent:0,phase:'preparing'});const attempt:VocabularyAttempt={id:crypto.randomUUID(),scope,createdAt:Date.now(),seconds:(Date.now()-began.current)/1000,blob:new Blob(chunks,{type:rec.mimeType})};update(attempt);await persist(attempt);if(mounted.current&&operation===run.current)await analyse(attempt,operation)};
   began.current=Date.now();rec.start();setStage('recording');prepareLocalPronunciation();timer.current=setTimeout(()=>{if(rec.state==='recording')rec.stop()},29000);
  }catch(e:any){stream.current?.getTracks().forEach(t=>t.stop());if(mounted.current&&operation===run.current){setStage('idle');lock(false);setMessage(e.name==='NotAllowedError'?'Autorisez le microphone pour répéter le mot.':e.message||'Le microphone est indisponible.')}}
 }
 function stop(){if(recorder.current?.state==='recording'){setStage('analysing');recorder.current.stop()}}
 function cancel(){run.current++;cancelLocalPronunciation();setStage('idle');lock(false);setMessage('Analyse annulée. Votre répétition reste disponible pour réessayer.')}
 async function remove(id:string){try{await deleteVocabularyAttempt(id);setAttempts(previous=>previous.filter(a=>a.id!==id));if(selected===id)setSelected(null)}catch{setMessage('Impossible de supprimer cette répétition. Réessayez.')}}
 const inactive=disabled||locked||stage!=='idle';
 const feedback=current?.analysis?reportData(current.analysis).words.map(wordFeedback):[];
 return <div className={'training-vocabulary-item'+(stage==='recording'?' is-recording':'')}>
  <div className="training-word-row"><div className="training-word-description"><strong>{word}</strong><small>{definition}</small></div>
   <button disabled={inactive} onClick={onListen} aria-label={'Écouter le mot '+word}><Volume2 size={16}/><span>Écouter</span></button>
   <button className="training-word-repeat" disabled={disabled||locked||stage==='starting'||stage==='analysing'} onClick={stage==='recording'?stop:start} aria-label={(stage==='recording'?'Arrêter la répétition de ':'Répéter le mot ')+word}>{stage==='recording'?<Square size={15}/>:<RotateCcw size={15}/>}<span>{stage==='recording'?'Arrêter':'Répéter'}</span></button>
   <button disabled={inactive} onClick={onChoose} aria-label={'Lire depuis le mot '+word}><ArrowRight size={15}/><span>Lire ici</span></button>
   <div className="training-word-scores"><span title="Score de ce mot dans la lecture de l’article">Lecture <b>{readingScore===null?'—':Math.round(readingScore)}</b></span><button disabled={stage!=='idle'} onClick={()=>setOpen(!open)} aria-expanded={open} aria-label={'Voir mes répétitions de '+word}>Répétition <b>{latestScore===null?'—':Math.round(latestScore)}</b></button></div>
  </div>
  {open&&<div className="training-word-practice"><div className="training-word-practice-heading"><strong>À vous : « {word} »</strong><span>Votre voix et vos résultats restent sur cet appareil.</span></div>
   {stage==='starting'&&<p role="status">Autorisez votre microphone…</p>}
   {stage==='recording'&&<div className="training-word-recording"><span/><p>Répétez le mot, puis arrêtez pour recevoir votre score.</p><button onClick={stop}><Square size={14}/>Arrêter et analyser</button></div>}
   {stage==='idle'&&current&&<><div className="training-word-result"><div><small>Score de cette répétition</small><strong>{current.analysis?Math.round(current.analysis.score):'—'}<span>/100</span></strong></div><audio ref={player} controls preload="metadata" src={audioUrl} aria-label={'Écouter ma répétition de '+word}/></div>{feedback.length>0&&<p className="training-word-feedback">{feedback.join(' ')}</p>}<div className="training-word-practice-actions"><button disabled={disabled||locked} onClick={start}><Mic size={14}/>Répéter à nouveau</button>{!current.analysis&&<button disabled={disabled||locked} onClick={()=>analyse(current)}><Sparkles size={14}/>Analyser ma répétition</button>}<button onClick={()=>remove(current.id)}><Trash2 size={14}/>Supprimer</button></div></>}
   {attempts.length>1&&stage==='idle'&&<div className="training-word-history" aria-label={'Historique des répétitions de '+word}>{attempts.map((attempt,index)=><button key={attempt.id} className={current?.id===attempt.id?'selected':''} onClick={()=>setSelected(attempt.id)}><span>Essai {attempts.length-index}</span><b>{attempt.analysis?Math.round(attempt.analysis.score)+'/100':'À analyser'}</b></button>)}</div>}
   {message&&<p className="notice" role="status">{message}</p>}
  </div>}
  {stage==='analysing'&&<AnalysisLoadingOverlay progress={progress} onCancel={cancel}/>}
 </div>;
}
