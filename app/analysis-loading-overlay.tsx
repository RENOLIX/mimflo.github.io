'use client';
import {useEffect,useId,useRef} from 'react';
import {createPortal} from 'react-dom';
import type {AnalysisProgress} from './local-pronunciation';
import './analysis-loading-overlay.css';

export default function AnalysisLoadingOverlay({canCancel=true,onCancel,progress}:{canCancel?:boolean;onCancel:()=>void;progress?:AnalysisProgress}){
 const dialog=useRef<HTMLDialogElement>(null),titleId=useId();
 useEffect(()=>{
  const element=dialog.current;if(!element)return;
  const previousOverflow=document.body.style.overflow;
  document.body.style.overflow='hidden';
  element.showModal();
  return()=>{element.close();document.body.style.overflow=previousOverflow};
 },[]);
 return createPortal(<dialog ref={dialog} className="analysis-loading-dialog" aria-labelledby={titleId} aria-modal="true" onCancel={event=>{event.preventDefault();if(canCancel)onCancel()}}>
  <div className="analysis-loading-mark" aria-hidden="true"><span className="analysis-loading-orbit"/><img src="/assets/mascot-transparent.webp" width="90" height="90" alt=""/></div>
  <h2 id={titleId} role="status">Analyse en cours…</h2>
  {progress&&<div className="analysis-loading-percent" role="progressbar" aria-label="Avancement de l’analyse" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress.percent}><strong>{progress.percent}<span>%</span></strong></div>}
 </dialog>,document.body);
}
