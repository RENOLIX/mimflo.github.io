'use client';
import {useEffect,useId,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import type {AnalysisProgress} from './local-pronunciation';
import './analysis-loading-overlay.css';

export default function AnalysisLoadingOverlay({canCancel=true,onCancel,progress}:{canCancel?:boolean;onCancel:()=>void;progress?:AnalysisProgress}){
 const dialog=useRef<HTMLDialogElement>(null),titleId=useId();
 const [elapsed,setElapsed]=useState(0);
 useEffect(()=>{const began=Date.now(),timer=setInterval(()=>setElapsed(Math.floor((Date.now()-began)/1000)),1000);return()=>clearInterval(timer)},[]);
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
  {progress&&<div className="analysis-loading-progress">
   <div className="analysis-loading-percent"><strong>{progress.percent}<span>%</span></strong><span>{progress.phase==='preparing'?'Préparation de votre analyse':progress.phase==='analysing'?'Analyse de votre lecture':progress.phase==='saving'?'Sauvegarde de votre résultat':progress.phase==='done'?'Votre résultat est prêt':'Finalisation de votre bilan'}</span></div>
   <div className="analysis-loading-track" role="progressbar" aria-label="Avancement de l’analyse" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress.percent}><span style={{width:progress.percent+'%'}}/></div>
   <p className="analysis-loading-estimate">{progress.remainingSeconds?<>Temps restant estimé : {progress.remainingSeconds<60?'moins d’une minute':'environ '+Math.ceil(progress.remainingSeconds/60)+' min'}</>:progress.phase==='analysing'?'Estimation du temps restant…':progress.phase==='preparing'?'La première préparation peut prendre plus de temps.':'Encore un instant…'}</p>
  </div>}
  <p className="analysis-loading-elapsed">Temps écoulé : {Math.floor(elapsed/60)}:{String(elapsed%60).padStart(2,'0')}</p>
  <button type="button" className="analysis-loading-cancel" onClick={onCancel} disabled={!canCancel}>Annuler</button>
 </dialog>,document.body);
}
