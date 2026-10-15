'use client';
import {useEffect,useRef,useState} from 'react';
import {readingWords} from './reading-flow';
import {speechSegments} from './speech-reading';
import {synthesizeFrench,type VoiceClip} from './timed-voice';
import {preparedFrenchVoice,type PreparedVoice} from './prepared-voice';
import {LISTENING_SPEEDS,validListeningSpeed} from './listening-speeds';
type Track={segments:ReturnType<typeof speechSegments>;cursor:number;whole:boolean;phrases:ReturnType<typeof speechSegments>;reference:string;first:number;last:number;sourceChecked?:boolean;prepared?:PreparedVoice};
export function useArticleListening(text:string,onError:(message:string)=>void){
 const [playing,setPlaying]=useState(false),[paused,setPaused]=useState(false),[loading,setLoading]=useState(false),[percent,setPercent]=useState(0),[activeWord,setActiveWord]=useState<number|null>(null),[activeRange,setActiveRange]=useState<{first:number;last:number}|null>(null),[completed,setCompleted]=useState(false),[speed,setSpeedState]=useState<number>(LISTENING_SPEEDS.normal);
 const audio=useRef<HTMLAudioElement|null>(null),url=useRef(''),generation=useRef(0),track=useRef<Track|null>(null),clip=useRef<Pick<VoiceClip,'timings'>|null>(null),frame=useRef<number|null>(null),rate=useRef<number>(LISTENING_SPEEDS.normal),prefetch=useRef<{text:string;result:Promise<VoiceClip>}|null>(null),rangeEnd=useRef<number|null>(null);
 function clearFrame(){if(frame.current!==null)cancelAnimationFrame(frame.current);frame.current=null}
 function clearMedia(){clearFrame();if(audio.current){audio.current.onended=null;audio.current.pause()}if(url.current)URL.revokeObjectURL(url.current);url.current='';clip.current=null;rangeEnd.current=null}
 function stop(){generation.current++;clearMedia();track.current=null;prefetch.current=null;setPlaying(false);setPaused(false);setLoading(false);setActiveWord(null);setActiveRange(null)}
 function player(){if(!audio.current){audio.current=new Audio();audio.current.preload='auto';audio.current.preservesPitch=true;}return audio.current}
 function finish(run:number){if(generation.current!==run)return;const whole=track.current?.whole;clearMedia();track.current=null;setPlaying(false);setPaused(false);setLoading(false);setActiveWord(null);setActiveRange(null);if(whole)setCompleted(true)}
 function follow(run:number){if(generation.current!==run||!audio.current||audio.current.paused||!clip.current||!track.current)return;const current=track.current,t=audio.current.currentTime;if(rangeEnd.current!==null&&t>=rangeEnd.current){finish(run);return}const position=clip.current.timings.find(word=>t>=word.start&&t<word.end)||clip.current.timings.filter(word=>word.start<=t).at(-1)||clip.current.timings[0];if(position){const word=current.prepared?position.index:current.segments[current.cursor].first+position.index;setActiveWord(word);if(current.prepared){const phrase=current.phrases.find(p=>word>=p.first&&word<p.last);if(phrase)setActiveRange(previous=>previous?.first===phrase.first&&previous?.last===phrase.last?previous:{first:phrase.first,last:phrase.last})}}frame.current=requestAnimationFrame(()=>follow(run))}
 function unlock(){const a=player();if(a.src)return;a.src='data:audio/wav;base64,UklGRiYAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQIAAAAAAA==';void a.play().catch(()=>{})}
 async function next(run:number){
  const current=track.current;if(generation.current!==run||!current)return;
  if(!current.sourceChecked){try{const source=await preparedFrenchVoice(current.reference);if(generation.current!==run||track.current!==current)return;current.sourceChecked=true;if(source)current.prepared=source;}catch(error:any){if(generation.current===run){setLoading(false);setPlaying(false);setPaused(true);onError(error.message)}return}}
  if(current.prepared){
   const source=current.prepared;clearMedia();const a=player();clip.current=source;rangeEnd.current=current.last<source.timings.length?source.timings[current.last].start:null;
   if(a.getAttribute('src')!==source.src)a.src=source.src;
   a.currentTime=current.first?source.timings[current.first].start:0;a.playbackRate=rate.current;setActiveWord(current.first);setLoading(true);setPercent(100);a.onended=()=>finish(run);
   try{await a.play();if(generation.current!==run)return;setLoading(false);setPlaying(true);setPaused(false);follow(run)}catch(error:any){if(generation.current!==run)return;setLoading(false);setPlaying(false);setPaused(true);onError(error.name==='NotAllowedError'?'Appuyez sur « Reprendre l’écoute » pour lancer la voix.':'La lecture audio n’a pas pu démarrer. Réessayez.')}
   return;
  }
  if(current.cursor>=current.segments.length){clearMedia();setPlaying(false);setPaused(false);setLoading(false);setActiveWord(null);setActiveRange(null);if(current.whole)setCompleted(true);track.current=null;return}
  const segment=current.segments[current.cursor];clearMedia();setLoading(true);setPercent(0);
  try{
   const result=await(prefetch.current?.text===segment.text?prefetch.current.result:synthesizeFrench(segment.text,value=>{if(generation.current===run)setPercent(Math.round(value))}));
   if(generation.current!==run||track.current!==current)return;clearMedia();clip.current=result;const a=player();url.current=URL.createObjectURL(result.blob);a.src=url.current;a.playbackRate=rate.current;
   const range=current.phrases.find(p=>segment.first>=p.first&&segment.first<p.last)||segment;setActiveRange({first:range.first,last:range.last});setActiveWord(segment.first);setPercent(100);setLoading(false);
   a.onended=()=>{if(generation.current!==run)return;clearFrame();current.cursor++;void next(run)};
   await a.play();if(generation.current!==run)return;setPlaying(true);setPaused(false);follow(run);
   const following=current.segments[current.cursor+1];prefetch.current=following?{text:following.text,result:synthesizeFrench(following.text)}:null;prefetch.current?.result.catch(()=>{});
  }catch(error:any){if(generation.current!==run)return;clearFrame();setLoading(false);setPlaying(false);setPaused(true);onError(error.name==='NotAllowedError'?'La voix est prête. Appuyez sur « Reprendre l’écoute ».':error.message||'La lecture est indisponible. Réessayez.');}
 }
 function play(fromWord=0,toWord=readingWords(text).length,value=rate.current,whole=fromWord===0&&toWord===readingWords(text).length){
  stop();unlock();const segments=speechSegments(text,fromWord,toWord);if(!segments.length)return;rate.current=value;track.current={segments,cursor:0,whole,phrases:speechSegments(text),reference:text,first:fromWord,last:toWord};setPlaying(true);setLoading(true);void next(++generation.current);
 }
 function pause(){if(!track.current)return;clearFrame();audio.current?.pause();setPlaying(false);setPaused(true);if(loading){generation.current++;setLoading(false)}}
 async function resume(){if(!track.current){play();return}if(!clip.current){setPlaying(true);setPaused(false);setLoading(true);void next(++generation.current);return}const run=generation.current,current=track.current,a=player();a.onended=current.prepared?()=>finish(run):()=>{if(generation.current!==run)return;clearFrame();current.cursor++;void next(run)};try{await a.play();if(generation.current!==run)return;setLoading(false);setPlaying(true);setPaused(false);follow(run)}catch{onError('Appuyez de nouveau sur « Reprendre l’écoute » pour lancer la voix.')}}
 function toggle(){if(playing)pause();else if(paused)void resume();else play()}
 function restart(){play()}
 function playExpression(expression:string,value=rate.current){
  const words=readingWords(text),parts=readingWords(expression),normalize=(word:string)=>word.toLocaleLowerCase('fr').replaceAll('’',"'");if(!parts.length)return;
  const at=words.findIndex((word,index)=>parts.every((part,offset)=>normalize(words[index+offset]?.text||'')===normalize(part.text)));
  if(at>=0){play(at,at+parts.length,value,false);return}
  stop();unlock();rate.current=value;track.current={segments:speechSegments(expression),cursor:0,whole:false,phrases:[],reference:expression,first:0,last:parts.length};setPlaying(true);void next(++generation.current);
 }
 function setSpeed(value:number){if(!validListeningSpeed(value))return;rate.current=value;setSpeedState(value);if(audio.current)audio.current.playbackRate=value}
 useEffect(()=>{let active=true;void preparedFrenchVoice(text).then(source=>{if(active&&source&&!track.current){const a=player();a.src=source.src;a.load()}}).catch(()=>{});return()=>{active=false}},[text]);
 useEffect(()=>()=>{generation.current++;clearMedia();audio.current?.removeAttribute('src');audio.current?.load();audio.current=null},[]);
 return {playing,paused,loading,percent,pause,restart,activeWord,activeRange,completed,speed,setSpeed,toggle,stop,playRange:play,playExpression};
}
