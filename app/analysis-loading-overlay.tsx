'use client';
import {useEffect,useId,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {Clock3,CheckCircle2} from 'lucide-react';
import type {AnalysisProgress} from './local-pronunciation';
import {hasCompletedPronunciation} from './local-pronunciation';
import './analysis-loading-overlay.css';

export default function AnalysisLoadingOverlay({canCancel=true,onCancel,progress}:{canCancel?:boolean;onCancel:()=>void;progress?:AnalysisProgress}){
 const dialog=useRef<HTMLDialogElement>(null),titleId=useId();
 const [firstAnalysis]=useState(()=>!hasCompletedPronunciation());
 const noticeId=useId();
 useEffect(()=>{
  const element=dialog.current;if(!element)return;
  const previousOverflow=document.body.style.overflow;
  document.body.style.overflow='hidden';
  element.showModal();
  return()=>{element.close();document.body.style.overflow=previousOverflow};
 },[]);
 return createPortal(<dialog ref={dialog} className={'analysis-loading-dialog'+(firstAnalysis?' has-first-analysis-notice':'')} aria-labelledby={titleId} aria-describedby={firstAnalysis?noticeId:undefined} aria-modal="true" onCancel={event=>{event.preventDefault();if(canCancel)onCancel()}}>
  <div className="analysis-loading-mark" aria-hidden="true"><span className="analysis-loading-orbit"/></div>
  <h2 id={titleId} role="status">Analyse en cours…</h2>
  {progress&&<div className="analysis-loading-percent" role="progressbar" aria-label="Avancement de l’analyse" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress.percent}><strong>{progress.percent}<span>%</span></strong></div>}
  {firstAnalysis&&<aside className="analysis-first-notice" id={noticeId} aria-label="À savoir pour votre première analyse">
   <div className="analysis-first-notice-heading"><span className="analysis-first-notice-icon" aria-hidden="true"><Clock3 size={19}/></span><span>Votre première analyse</span><span className="analysis-first-notice-time">Jusqu’à 10 min</span></div>
   <p>La première analyse peut prendre <strong>jusqu’à 10 minutes</strong>, selon votre appareil.</p>
   <p className="analysis-first-notice-instruction">Gardez cette page ouverte pendant l’analyse.</p>
   <div className="analysis-first-notice-reassurance"><CheckCircle2 size={15} aria-hidden="true"/><span>Votre enregistrement reste conservé.</span></div>
  </aside>}
 </dialog>,document.body);
}
