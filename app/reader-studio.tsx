'use client';
import {useEffect,useId,useRef,type ReactNode} from 'react';
import {createPortal} from 'react-dom';
import {X,AudioLines,Sparkles} from 'lucide-react';

export default function ReaderStudio({children,count,tab,onTab,onClose,busy}:{children:ReactNode;count:number;tab:'analysis'|'history';onTab:(tab:'analysis'|'history')=>void;onClose:()=>void;busy:boolean}){
 const dialog=useRef<HTMLDialogElement>(null),headingId=useId();
 useEffect(()=>{const element=dialog.current;if(!element)return;const overflow=document.body.style.overflow;document.body.style.overflow='hidden';element.showModal();return()=>{element.close();document.body.style.overflow=overflow}},[]);
 return createPortal(<dialog ref={dialog} className="reader-studio" aria-labelledby={headingId} onCancel={event=>{event.preventDefault();if(!busy)onClose()}}>
  <header className="reader-studio-header"><div><span className="section-overline">VOTRE ESPACE DE LECTURE</span><h2 id={headingId}>Écoutez. Analysez. Progressez.</h2></div><button className="reader-studio-close" onClick={onClose} disabled={busy} aria-label="Revenir à l’article"><X size={20}/></button></header>
  <nav className="reader-studio-tabs" aria-label="Vos lectures"><button aria-pressed={tab==='analysis'} onClick={()=>onTab('analysis')} disabled={busy}><Sparkles size={17}/>Ma lecture</button><button aria-pressed={tab==='history'} onClick={()=>onTab('history')} disabled={busy}><AudioLines size={17}/>Mes enregistrements <span>{count}</span></button></nav>
  <div className="reader-studio-body">{children}</div>
 </dialog>,document.body);
}
