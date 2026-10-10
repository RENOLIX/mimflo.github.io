'use client';
import {useState} from 'react';
import VocabularyPractice from './vocabulary-practice';
import {BookOpen,Check,Flame,Headphones,Mic,Sparkles,RotateCcw} from 'lucide-react';
import {readingWords} from './reading-flow';
import {reportData} from './reading-report-data';
import type {ReadingAttempt} from './recording-store';
import './reading-training.css';

export function TrainingProgress({attempts,listened,sessions}:{attempts:ReadingAttempt[];listened:boolean;sessions:any[]}){
 const steps=[{name:'Découvrir l’article',icon:BookOpen,done:true},{name:'Écouter la lecture',icon:Headphones,done:listened},{name:'Enregistrer ma voix',icon:Mic,done:attempts.some(a=>a.seconds>=3)},{name:'Consulter mon analyse',icon:Sparkles,done:attempts.some(a=>a.analysis)},{name:'Retravailler ma lecture',icon:RotateCcw,done:attempts.filter(a=>a.seconds>=3).length>=2}];
 const completed=steps.filter(step=>step.done).length,firstOpen=steps.findIndex(step=>!step.done),percentage=completed*20;
 const dayKey=(date:Date)=>[date.getFullYear(),date.getMonth()+1,date.getDate()].join('-');
 const dates=new Set([...sessions.map(session=>session.created_at),...attempts.filter(a=>a.seconds>=3).map(a=>a.createdAt)].map(value=>dayKey(new Date(value))));
 const today=new Date();let consecutive=0,cursor=new Date(today);
 if(!dates.has(dayKey(cursor)))cursor.setDate(cursor.getDate()-1);
 while(dates.has(dayKey(cursor))){consecutive++;cursor.setDate(cursor.getDate()-1);}
 return <><section className="card training-progress"><span className="section-overline">VOTRE ENTRAÎNEMENT</span><div className="training-progress-summary"><div className="training-progress-ring" style={{background:`conic-gradient(#b79ac9 ${percentage}%,#eee8f1 0)`}}><strong>{percentage}%</strong></div><div><h3>Un pas à la fois</h3><p>{completed}/5 étapes réalisées</p></div></div><div className="training-steps">{steps.map((step,index)=>{const Icon=step.icon;return <div key={step.name} className={step.done?'done':index===firstOpen?'current':''}>{step.done?<Check size={16}/>:<Icon size={16}/>}<span>{step.name}</span><small>{step.done?'Fait':index===firstOpen?'À vous':'À venir'}</small></div>})}</div></section><section className="card training-streak"><span className="section-overline"><Flame size={16}/> VOTRE RÉGULARITÉ</span><h3>{consecutive} jour{consecutive>1?'s':''} de suite</h3><div className="training-week">{Array.from({length:7},(_,index)=>{const date=new Date(today);date.setDate(date.getDate()-6+index);const active=dates.has(dayKey(date));return <div key={index}><span>{date.toLocaleDateString('fr-FR',{weekday:'narrow'})}</span><i className={active?'active':''} aria-label={date.toLocaleDateString('fr-FR')+(active?' : lecture enregistrée':' : aucune lecture')}>{active?<Check size={11}/>:null}</i></div>})}</div><p>Votre activité réelle, un enregistrement après l’autre.</p></section></>;
}
export function TrainingExercises({text,analysis,vocabulary,onListen,onChoose,disabled,practiceScope,onPracticeBusy}:{text:string;analysis:any;vocabulary:string[][];onListen:(start:number,end:number)=>void;onChoose:(index:number)=>void;disabled:boolean;practiceScope:string;onPracticeBusy:(busy:boolean)=>void}){
 const [active,setActive]=useState<number|null>(null);
 const allWords=readingWords(text),data=analysis?reportData(analysis):null,offset=analysis?.articleStartWord||0;
 const difficult=data?.practice.slice(0,8).map(word=>({text:word.text,index:offset+word.index,end:offset+word.index+1,score:word.confidence}))||[];
 const normalize=(word:string)=>word.toLocaleLowerCase('fr').replaceAll('’',"'");
 const rows=difficult.length?difficult:vocabulary.slice(0,8).map(([word])=>{const parts=readingWords(word),index=allWords.findIndex((_,at)=>parts.length>0&&parts.every((part,i)=>normalize(allWords[at+i]?.text||'')===normalize(part.text)));return {text:word,index,end:index+parts.length,score:null}}).filter(word=>word.index>=0);
 return <div className="reader-training-exercises"><section className="training-exercise"><div className="training-section-title"><span>02</span><div><h2>Vocabulaire & sons à travailler</h2><p>Écoutez, répétez et découvrez votre score pour chaque mot.</p></div></div>
 {rows.length?<div className="training-word-list">{rows.map(word=><VocabularyPractice key={practiceScope+':'+word.index+':'+word.text} word={word.text} definition={vocabulary.find(([term])=>normalize(term)===normalize(word.text))?.[1]||'À pratiquer dans votre lecture'} scope={practiceScope+':'+word.index+':'+word.text} readingScore={word.score} disabled={disabled} locked={active!==null&&active!==word.index} onBusy={busy=>{setActive(busy?word.index:null);onPracticeBusy(busy)}} onListen={()=>onListen(word.index,word.end)} onChoose={()=>onChoose(word.index)}/>)}</div>:<p className="training-empty">Les mots à travailler apparaîtront après votre première analyse.</p>}
 <p className="muted small">Comparez le score du mot dans votre lecture avec celui de vos répétitions.</p>
 {vocabulary.length>0&&<details className="training-glossary"><summary>Comprendre le vocabulaire ({vocabulary.length} mots et expressions)</summary><dl>{vocabulary.map(([word,definition])=><div key={word}><dt>{word}</dt><dd>{definition}</dd></div>)}</dl></details>}
 </section></div>;
}
