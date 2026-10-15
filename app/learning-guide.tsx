'use client';
import {useEffect,useId,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {ArrowRight,BookOpen,Check,Headphones,Mic,NotebookPen,Play,Route,RotateCcw,Sparkles,Target,Volume2,X} from 'lucide-react';
import './learning-guide.css';

const steps=[
 {title:'Lisez et écoutez',copy:'Choisissez votre article. Écoutez la voix : la phrase passe en vert, le mot lu en rouge et les pages tournent automatiquement.',icon:Headphones,tone:'sage',tags:['Écouter l’article','Feuilleter']},
 {title:'Entraînez-vous sur les mots',copy:'Écoutez un mot, puis répétez-le. Réécoutez votre audio et choisissez Analyser. Le bouton + ajoute le mot à vos notes.',icon:NotebookPen,tone:'lilac',tags:['Écouter','Répéter','Mes notes']},
 {title:'Passez aux phrases',copy:'Enregistrez la phrase affichée pour travailler son rythme et ses liaisons. Vous pouvez écouter, supprimer ou analyser chaque essai.',icon:Volume2,tone:'peach',tags:['Une phrase','À votre rythme']},
 {title:'Enregistrez votre lecture',copy:'Utilisez le bouton flottant Enregistrer, puis Arrêter. Votre audio est conservé ; vous pouvez le réécouter avant de lancer l’analyse.',icon:Mic,tone:'rose',tags:['Enregistrer','Analyser']},
 {title:'Consultez vos résultats',copy:'Repérez les sons à retravailler, essayez à nouveau et suivez votre évolution dans Ma progression. Chaque lecture compte.',icon:Sparkles,tone:'lilac',tags:['Mes résultats','Ma progression']},
 {title:'Relevez le défi oral',copy:'En bas de l’article, donnez votre avis sur son sujet en 4 minutes maximum. Recevez une estimation de votre niveau d’expression orale.',icon:Target,tone:'sage',tags:['Défi final','Niveau estimé A1–C2']},
];
export function useLearningGuide(userId:string|undefined,enabled:boolean){
 const [open,setOpen]=useState(false),seen=useRef(new Set<string>());
 const storageKey='mimflo-welcome-guide-v1:'+userId;
 useEffect(()=>{setOpen(false);if(!enabled||!userId||seen.current.has(userId))return;try{if(localStorage.getItem(storageKey)==='seen'){seen.current.add(userId);return}}catch{}
  const timer=setTimeout(()=>setOpen(true),450);return()=>clearTimeout(timer);
 },[userId,enabled]);
 function close(){setOpen(false);if(userId){seen.current.add(userId);try{localStorage.setItem(storageKey,'seen')}catch{}}}
 return {open,show:()=>setOpen(true),close};
}
export default function LearningGuide({onClose}:{onClose:()=>void}){
 const dialog=useRef<HTMLDialogElement>(null),title=useId();
 useEffect(()=>{const element=dialog.current;if(!element)return;const focus=document.activeElement as HTMLElement|null,overflow=document.body.style.overflow;document.body.style.overflow='hidden';element.showModal();return()=>{element.close();document.body.style.overflow=overflow;focus?.focus()}},[]);
 return createPortal(<dialog ref={dialog} className="learning-guide" aria-labelledby={title} onCancel={event=>{event.preventDefault();onClose()}}><header className="guide-header"><div><span className="guide-eyebrow"><Route size={14}/>BIENVENUE DANS VOTRE PARCOURS</span><h2 id={title}>Votre guide, pas à pas.</h2><p>Six étapes pour prendre vos marques et progresser avec MimFlo.</p></div><button className="guide-close" onClick={onClose} aria-label="Fermer le guide"><X size={20}/></button></header><div className="guide-body"><div className="guide-intro"><span><BookOpen size={17}/>Un article, votre rythme</span><span><Check size={17}/>Des essais conservés</span></div><div className="guide-steps">{steps.map((step,index)=>{const Icon=step.icon;return <article className={'guide-step guide-'+step.tone} key={step.title}><div className="guide-step-heading"><span className="guide-number">0{index+1}</span><h3>{step.title}</h3><Icon size={21}/></div><div className="guide-vignette" aria-hidden="true"><span className="guide-illustration"><Icon size={30}/></span><div>{step.tags.map((tag,i)=><span className="guide-tag" key={tag}>{i===0?(index===3?<Mic size={12}/>:index===4?<Sparkles size={12}/>:index===5?<Target size={12}/>:<Play size={12}/>):<Check size={12}/>} {tag}</span>)}</div></div><p>{step.copy}</p></article>})}</div><div className="guide-reassurance"><RotateCcw size={18}/><p>Besoin d’un rappel ? Retrouvez ce guide à tout moment dans <strong>Mon parcours</strong>.</p></div></div><footer className="guide-footer"><span>Un mot après l’autre, avec MimFlo.</span><button onClick={onClose}>C’est parti<ArrowRight size={17}/></button></footer></dialog>,document.body);
}
