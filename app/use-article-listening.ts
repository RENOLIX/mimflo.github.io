'use client';
import {useEffect,useRef,useState} from 'react';
import {readingWords} from './reading-flow';
import {speechSegments} from './speech-reading';

export function useArticleListening(text:string,onError:(message:string)=>void){
 const [playing,setPlaying]=useState(false),[activeWord,setActiveWord]=useState<number|null>(null),[completed,setCompleted]=useState(false),[activeRange,setActiveRange]=useState<{first:number;last:number}|null>(null);
 const generation=useRef(0),owned=useRef(false),utteranceRef=useRef<SpeechSynthesisUtterance|null>(null);
 function stop(){generation.current++;if(owned.current)window.speechSynthesis?.cancel();owned.current=false;setPlaying(false);setActiveWord(null);setActiveRange(null);utteranceRef.current=null;}
 useEffect(()=>()=>{generation.current++;if(owned.current)window.speechSynthesis?.cancel()},[]);
 function play(fromWord=0,toWord=readingWords(text).length){
  if(!window.speechSynthesis){onError('L’écoute n’est pas disponible dans ce navigateur.');return;}
  const synth=window.speechSynthesis,voices=synth.getVoices().filter(voice=>voice.lang.startsWith('fr'));
  const voice=voices.find(v=>v.lang==='fr-FR'&&/Google|Natural|Online/i.test(v.name))||voices.find(v=>v.lang==='fr-FR')||voices[0];
  const words=readingWords(text),segments=speechSegments(text,fromWord,toWord);if(!segments.length)return;
  const run=++generation.current;owned.current=true;synth.cancel();setPlaying(true);
  let cursor=0;
  function next(){
   if(generation.current!==run)return;
   if(cursor>=segments.length){owned.current=false;setPlaying(false);setActiveWord(null);setActiveRange(null);utteranceRef.current=null;if(fromWord===0&&toWord===words.length)setCompleted(true);return;}
   const {first,last,start,text:phrase}=segments[cursor++],utterance=new SpeechSynthesisUtterance(phrase);utteranceRef.current=utterance;
   utterance.lang='fr-FR';utterance.rate=1.04;if(voice)utterance.voice=voice;
   utterance.onstart=()=>{if(generation.current===run){setActiveWord(first);setActiveRange({first,last})}};
   // Use real word events when available; otherwise highlight the spoken phrase.
   utterance.onboundary=event=>{if(generation.current!==run||event.name==='sentence')return;const character=start+event.charIndex;let at=first;while(at+1<last&&words[at+1].start<=character)at++;setActiveWord(at);setActiveRange({first:at,last:at+1})};
   utterance.onend=next;
   utterance.onerror=event=>{if(generation.current!==run)return;owned.current=false;setPlaying(false);setActiveWord(null);setActiveRange(null);utteranceRef.current=null;if(event.error==='canceled'||event.error==='interrupted')return;onError('La lecture vocale a été interrompue. Réessayez dans un navigateur disposant d’une voix française.')};
   try{if(synth.paused)synth.resume();synth.speak(utterance);}catch{owned.current=false;setPlaying(false);setActiveWord(null);setActiveRange(null);utteranceRef.current=null;onError('La voix française est indisponible dans votre navigateur. Réessayez l’écoute.');}
  }
  next();
 }
 function toggle(){if(playing)stop();else play();}
 function playExpression(expression:string){
  const words=readingWords(text),parts=readingWords(expression),normalize=(word:string)=>word.toLocaleLowerCase('fr').replaceAll('’',"'");
  const at=words.findIndex((word,index)=>parts.every((part,offset)=>normalize(words[index+offset]?.text||'')===normalize(part.text)));
  if(!parts.length)return;
  if(at>=0){play(at,at+parts.length);return;}
  const synth=window.speechSynthesis;if(!synth){onError('L’écoute n’est pas disponible dans ce navigateur.');return;}
  stop();const run=++generation.current,utterance=new SpeechSynthesisUtterance(expression);utteranceRef.current=utterance;utterance.lang='fr-FR';utterance.rate=1.04;
  const voice=synth.getVoices().find(voice=>voice.lang==='fr-FR')||synth.getVoices().find(voice=>voice.lang.startsWith('fr'));if(voice)utterance.voice=voice;
  owned.current=true;setPlaying(true);utterance.onend=()=>{if(generation.current===run){owned.current=false;setPlaying(false)}};
  utterance.onerror=()=>{if(generation.current===run){owned.current=false;setPlaying(false);onError('La voix française est indisponible. Réessayez l’écoute.')}};
  try{if(synth.paused)synth.resume();synth.speak(utterance)}catch{stop();onError('La voix française est indisponible. Réessayez l’écoute.')}
 }
 return {playing,activeWord,activeRange,completed,toggle,stop,playRange:play,playExpression};
}
