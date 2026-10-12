'use client';
import {useEffect,useRef,useState} from 'react';
import {readingWords} from './reading-flow';
import {speechSegments,speechWordSegments} from './speech-reading';

export function useArticleListening(text:string,onError:(message:string)=>void){
 const [playing,setPlaying]=useState(false),[activeWord,setActiveWord]=useState<number|null>(null),[completed,setCompleted]=useState(false),[activeRange,setActiveRange]=useState<{first:number;last:number}|null>(null);
 const [paused,setPaused]=useState(false);
 const [speed,setSpeedState]=useState(1.04);
 const resumeWord=useRef(0);
 const generation=useRef(0),owned=useRef(false),utteranceRef=useRef<SpeechSynthesisUtterance|null>(null),requestRef=useRef<{from:number;to:number;whole:boolean}|{expression:string}|null>(null);
 function stop(){setPaused(false);generation.current++;if(owned.current)window.speechSynthesis?.cancel();owned.current=false;setPlaying(false);setActiveWord(null);setActiveRange(null);utteranceRef.current=null;requestRef.current=null;}
 useEffect(()=>()=>{generation.current++;if(owned.current)window.speechSynthesis?.cancel()},[]);
 function play(fromWord=0,toWord=readingWords(text).length,rate=speed,whole=fromWord===0&&toWord===readingWords(text).length){
  if(!window.speechSynthesis){onError('L’écoute n’est pas disponible dans ce navigateur.');return;}
  const synth=window.speechSynthesis,voices=synth.getVoices().filter(voice=>voice.lang.startsWith('fr'));
  const voice=voices.find(v=>v.lang==='fr-FR'&&v.localService)||voices.find(v=>v.lang.startsWith('fr')&&v.localService)||voices.find(v=>v.lang==='fr-FR')||voices[0];
  const words=readingWords(text),phrases=speechSegments(text),segments=voice?.localService?speechSegments(text,fromWord,toWord):speechWordSegments(text,fromWord,toWord);if(!segments.length)return;
  requestRef.current={from:fromWord,to:toWord,whole};
  const run=++generation.current;owned.current=true;synth.cancel();setPaused(false);setPlaying(true);
  let cursor=0;
  function next(){
   if(generation.current!==run)return;
   if(cursor>=segments.length){owned.current=false;setPlaying(false);setActiveWord(null);setActiveRange(null);utteranceRef.current=null;requestRef.current=null;if(whole)setCompleted(true);return;}
   const {first,last,start,text:phrase}=segments[cursor++],utterance=new SpeechSynthesisUtterance(phrase);utteranceRef.current=utterance;
   utterance.lang='fr-FR';utterance.rate=rate;if(voice)utterance.voice=voice;
   const phraseRange=phrases.find(p=>first>=p.first&&first<p.last)||{first,last};
   utterance.onstart=()=>{if(generation.current===run){resumeWord.current=first;setActiveWord(first);setActiveRange({first:phraseRange.first,last:phraseRange.last})}};
   utterance.onboundary=event=>{if(generation.current!==run||event.name==='sentence')return;const character=start+event.charIndex;let at=first;while(at+1<last&&words[at+1].start<=character)at++;resumeWord.current=at;setActiveWord(at)};
   utterance.onend=()=>{if(generation.current!==run)return;resumeWord.current=last;next()};
   utterance.onerror=event=>{if(generation.current!==run)return;owned.current=false;setPlaying(false);setActiveWord(null);setActiveRange(null);utteranceRef.current=null;if(event.error==='canceled'||event.error==='interrupted')return;onError('La lecture vocale a été interrompue. Réessayez dans un navigateur disposant d’une voix française.')};
   try{if(synth.paused)synth.resume();synth.speak(utterance);}catch{owned.current=false;setPlaying(false);setActiveWord(null);setActiveRange(null);utteranceRef.current=null;onError('La voix française est indisponible dans votre navigateur. Réessayez l’écoute.');}
  }
  next();
 }
 function pause(){if(!owned.current)return;generation.current++;window.speechSynthesis.cancel();utteranceRef.current=null;setPlaying(false);setPaused(true);}
 function toggle(){if(playing)pause();else if(paused&&owned.current){const request=requestRef.current;if(request&&'expression' in request)playExpression(request.expression);else if(request)play(resumeWord.current,request.to,speed,request.whole);else play();}else play();}
 function restart(){stop();play();}
 function playExpression(expression:string,rate=speed){
  const words=readingWords(text),parts=readingWords(expression),normalize=(word:string)=>word.toLocaleLowerCase('fr').replaceAll('’',"'");
  const at=words.findIndex((word,index)=>parts.every((part,offset)=>normalize(words[index+offset]?.text||'')===normalize(part.text)));
  if(!parts.length)return;
  if(at>=0){play(at,at+parts.length,rate);return;}
  const synth=window.speechSynthesis;if(!synth){onError('L’écoute n’est pas disponible dans ce navigateur.');return;}
  stop();requestRef.current={expression};const run=++generation.current,utterance=new SpeechSynthesisUtterance(expression);utteranceRef.current=utterance;utterance.lang='fr-FR';utterance.rate=rate;
  const voice=synth.getVoices().find(voice=>voice.lang==='fr-FR')||synth.getVoices().find(voice=>voice.lang.startsWith('fr'));if(voice)utterance.voice=voice;
  owned.current=true;setPlaying(true);utterance.onend=()=>{if(generation.current===run){owned.current=false;setPlaying(false)}};
  utterance.onerror=()=>{if(generation.current===run){owned.current=false;setPlaying(false);onError('La voix française est indisponible. Réessayez l’écoute.')}};
  try{if(synth.paused)synth.resume();synth.speak(utterance)}catch{stop();onError('La voix française est indisponible. Réessayez l’écoute.')}
 }
 function setSpeed(value:number){if(![.8,1.04,1.3].includes(value))return;setSpeedState(value);const request=requestRef.current;if(!playing||!request)return;if('expression' in request)playExpression(request.expression,value);else play(resumeWord.current,request.to,value,request.whole);}
 return {playing,paused,pause,restart,activeWord,activeRange,completed,speed,setSpeed,toggle,stop,playRange:play,playExpression};
}
