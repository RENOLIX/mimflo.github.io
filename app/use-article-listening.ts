'use client';
import {useEffect,useRef,useState} from 'react';
import {readingWords} from './reading-flow';

export function useArticleListening(text:string,onError:(message:string)=>void){
 const [playing,setPlaying]=useState(false),[activeWord,setActiveWord]=useState<number|null>(null),[completed,setCompleted]=useState(false);
 const generation=useRef(0),owned=useRef(false);
 function stop(){generation.current++;if(owned.current)window.speechSynthesis?.cancel();owned.current=false;setPlaying(false);setActiveWord(null);}
 useEffect(()=>()=>{generation.current++;if(owned.current)window.speechSynthesis?.cancel()},[]);
 function play(fromWord=0,toWord=readingWords(text).length){
  if(!window.speechSynthesis){onError('L’écoute n’est pas disponible dans ce navigateur.');return;}
  const synth=window.speechSynthesis,voices=synth.getVoices().filter(voice=>voice.lang.startsWith('fr'));
  // Local voices provide word boundary events. Remote voices are queued one
  // word at a time so the highlight follows actual playback, never a timer.
  const voice=voices.find(v=>v.localService&&v.lang==='fr-FR')||voices.find(v=>v.localService)||voices.find(v=>v.lang==='fr-FR')||voices[0];
  const words=readingWords(text);if(!words.length)return;
  const run=++generation.current;owned.current=true;synth.cancel();setPlaying(true);
  let cursor=fromWord,wordMode=!voice?.localService;
  function next(){
   if(generation.current!==run)return;
   if(cursor>=toWord){owned.current=false;setPlaying(false);setActiveWord(null);if(fromWord===0&&toWord===words.length)setCompleted(true);return;}
   const first=cursor,last=Math.min(toWord,first+(wordMode?1:25)),start=first===0?0:words[first].start;
   const end=last<words.length?words[last].start:text.length,utterance=new SpeechSynthesisUtterance(text.slice(start,end).trimEnd());
   utterance.lang='fr-FR';utterance.rate=.88;if(voice)utterance.voice=voice;
   let boundaries=0;
   utterance.onstart=()=>{if(generation.current===run)setActiveWord(first)};
   utterance.onboundary=event=>{if(generation.current!==run||event.name==='sentence')return;boundaries++;const character=start+event.charIndex;let at=first;while(at+1<last&&words[at+1].start<=character)at++;setActiveWord(at)};
   utterance.onend=()=>{if(generation.current!==run)return;if(!wordMode&&!boundaries)wordMode=true;cursor=last;next()};
   utterance.onerror=event=>{if(generation.current!==run||event.error==='canceled'||event.error==='interrupted')return;owned.current=false;setPlaying(false);setActiveWord(null);onError('La lecture vocale a été interrompue. Réessayez dans un navigateur disposant d’une voix française.')};
   try{if(synth.paused)synth.resume();synth.speak(utterance);}catch{owned.current=false;setPlaying(false);setActiveWord(null);onError('La voix française est indisponible dans votre navigateur. Réessayez l’écoute.');}
  }
  next();
 }
 function toggle(){if(playing)stop();else play();}
 function playExpression(expression:string){
  const words=readingWords(text),parts=readingWords(expression),normalize=(word:string)=>word.toLocaleLowerCase('fr').replaceAll('’',"'");
  const at=words.findIndex((word,index)=>parts.every((part,offset)=>normalize(words[index+offset]?.text||'')===normalize(part.text)));
  if(at>=0){play(at,at+parts.length);return;}
  const synth=window.speechSynthesis;if(!synth){onError('L’écoute n’est pas disponible dans ce navigateur.');return;}
  stop();const run=++generation.current,utterance=new SpeechSynthesisUtterance(expression);utterance.lang='fr-FR';utterance.rate=.88;
  const voice=synth.getVoices().find(voice=>voice.lang==='fr-FR')||synth.getVoices().find(voice=>voice.lang.startsWith('fr'));if(voice)utterance.voice=voice;
  owned.current=true;setPlaying(true);utterance.onend=()=>{if(generation.current===run){owned.current=false;setPlaying(false)}};
  utterance.onerror=()=>{if(generation.current===run){owned.current=false;setPlaying(false);onError('La voix française est indisponible. Réessayez l’écoute.')}};
  try{if(synth.paused)synth.resume();synth.speak(utterance)}catch{stop();onError('La voix française est indisponible. Réessayez l’écoute.')}
 }
 return {playing,activeWord,completed,toggle,stop,playRange:play,playExpression};
}
