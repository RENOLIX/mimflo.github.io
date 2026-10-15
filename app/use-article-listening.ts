'use client';
import {useEffect,useRef,useState} from 'react';
import {readingWords} from './reading-flow';
import {speechSegments} from './speech-reading';
import {synthesizeFrench,type VoiceClip} from './timed-voice';
import {preparedFrenchVoice,type PreparedVoice} from './prepared-voice';
import {LISTENING_SPEEDS,validListeningSpeed} from './listening-speeds';
import {frenchDeviceVoice} from './french-device-voice';
import {cachedFrenchAudio} from './french-audio-cache';
type Track={segments:ReturnType<typeof speechSegments>;cursor:number;whole:boolean;phrases:ReturnType<typeof speechSegments>;reference:string;first:number;last:number;sourceChecked?:boolean;prepared?:PreparedVoice};
export function useArticleListening(text:string,onError:(message:string)=>void){
 const [playing,setPlaying]=useState(false),[paused,setPaused]=useState(false),[loading,setLoading]=useState(false),[percent,setPercent]=useState(0),[activeWord,setActiveWord]=useState<number|null>(null),[activeRange,setActiveRange]=useState<{first:number;last:number}|null>(null),[completed,setCompleted]=useState(false),[speed,setSpeedState]=useState<number>(LISTENING_SPEEDS.normal);
 const spoken=useRef<SpeechSynthesisUtterance|null>(null),articleAudio=useRef<HTMLAudioElement|null>(null);
 const audio=useRef<HTMLAudioElement|null>(null),url=useRef(''),generation=useRef(0),track=useRef<Track|null>(null),clip=useRef<Pick<VoiceClip,'timings'>|null>(null),frame=useRef<number|null>(null),rate=useRef<number>(LISTENING_SPEEDS.normal),prefetch=useRef<{text:string;result:Promise<VoiceClip>}|null>(null),rangeEnd=useRef<number|null>(null);
 function clearFrame(){if(frame.current!==null)cancelAnimationFrame(frame.current);frame.current=null}
 function clearMedia(){clearFrame();if(audio.current){audio.current.onended=null;audio.current.pause()}if(url.current)URL.revokeObjectURL(url.current);url.current='';clip.current=null;rangeEnd.current=null}
 function stop(){generation.current++;if(spoken.current){spoken.current=null;window.speechSynthesis.cancel()}clearMedia();track.current=null;prefetch.current=null;setPlaying(false);setPaused(false);setLoading(false);setActiveWord(null);setActiveRange(null)}
 function player(){if(!audio.current){audio.current=new Audio();audio.current.preload='auto';audio.current.preservesPitch=true;}return audio.current}
 function articlePlayer(){if(!articleAudio.current){articleAudio.current=new Audio();articleAudio.current.preload='auto';articleAudio.current.preservesPitch=true}return articleAudio.current}
 function finish(run:number){if(generation.current!==run)return;const whole=track.current?.whole;clearMedia();track.current=null;setPlaying(false);setPaused(false);setLoading(false);setActiveWord(null);setActiveRange(null);if(whole)setCompleted(true)}
 function follow(run:number){if(generation.current!==run||!audio.current||audio.current.paused||!clip.current||!track.current)return;const current=track.current,t=audio.current.currentTime;if(rangeEnd.current!==null&&t>=rangeEnd.current){finish(run);return}const position=clip.current.timings.find(word=>t>=word.start&&t<word.end)||clip.current.timings.filter(word=>word.start<=t).at(-1)||clip.current.timings[0];if(position){const word=current.prepared?position.index:current.segments[current.cursor].first+position.index;setActiveWord(word);if(current.prepared){const phrase=current.phrases.find(p=>word>=p.first&&word<p.last);if(phrase)setActiveRange(previous=>previous?.first===phrase.first&&previous?.last===phrase.last?previous:{first:phrase.first,last:phrase.last})}}frame.current=requestAnimationFrame(()=>follow(run))}
 function unlock(){const a=player();if(a.src)return;a.src='data:audio/wav;base64,UklGRiYAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQIAAAAAAA==';void a.play().catch(()=>{})}
 async function next(run:number){
  const current=track.current;if(generation.current!==run||!current)return;
  if(!current.sourceChecked){try{const source=await preparedFrenchVoice(current.reference);if(generation.current!==run||track.current!==current)return;current.sourceChecked=true;if(source)current.prepared=source;}catch(error:any){if(generation.current===run){setLoading(false);setPlaying(false);setPaused(true);onError(error.message)}return}}
  if(current.prepared){
   const source=current.prepared;clearMedia();audio.current=articlePlayer();const a=player();clip.current=source;rangeEnd.current=current.last<source.timings.length?source.timings[current.last].start:null;
   if(a.getAttribute('src')!==source.src)a.src=source.src;
   a.currentTime=current.first?source.timings[current.first].start:0;a.playbackRate=rate.current;setActiveWord(current.first);setLoading(true);setPercent(100);a.onended=()=>finish(run);
   try{await a.play();if(generation.current!==run)return;setLoading(false);setPlaying(true);setPaused(false);follow(run)}catch(error:any){if(generation.current!==run)return;setLoading(false);setPlaying(false);setPaused(true);onError(error.name==='NotAllowedError'?'Appuyez sur « Reprendre l’écoute » pour lancer la voix.':'La lecture audio n’a pas pu démarrer. Réessayez.')}
   return;
  }
  if(current.cursor>=current.segments.length){clearMedia();setPlaying(false);setPaused(false);setLoading(false);setActiveWord(null);setActiveRange(null);if(current.whole)setCompleted(true);track.current=null;return}
  const segment=current.segments[current.cursor];clearMedia();setLoading(true);setPercent(0);
  try{
   const result=await(prefetch.current?.text===segment.text?prefetch.current.result:synthesizeFrench(segment.text,value=>{if(generation.current===run)setPercent(Math.round(value))}));
   if(generation.current!==run||track.current!==current)return;clearMedia();clip.current=result;if(audio.current===articleAudio.current)audio.current=null;const a=player();url.current=URL.createObjectURL(result.blob);a.src=url.current;a.playbackRate=rate.current;
   const range=current.phrases.find(p=>segment.first>=p.first&&segment.first<p.last)||segment;setActiveRange({first:range.first,last:range.last});setActiveWord(segment.first);setPercent(100);setLoading(false);
   a.onended=()=>{if(generation.current!==run)return;clearFrame();current.cursor++;void next(run)};
   await a.play();if(generation.current!==run)return;setPlaying(true);setPaused(false);follow(run);
   const following=current.segments[current.cursor+1];prefetch.current=following?{text:following.text,result:synthesizeFrench(following.text)}:null;prefetch.current?.result.catch(()=>{});
  }catch(error:any){if(generation.current!==run)return;clearFrame();setLoading(false);setPlaying(false);setPaused(true);onError(error.name==='NotAllowedError'?'La voix est prête. Appuyez sur « Reprendre l’écoute ».':error.message||'La lecture est indisponible. Réessayez.');}
 }
 function play(fromWord=0,toWord=readingWords(text).length,value=rate.current,whole=fromWord===0&&toWord===readingWords(text).length){
  stop();unlock();const segments=speechSegments(text,fromWord,toWord);if(!segments.length)return;rate.current=value;track.current={segments,cursor:0,whole,phrases:speechSegments(text),reference:text,first:fromWord,last:toWord};setPlaying(true);setLoading(true);void next(++generation.current);
 }
 function pause(){if(spoken.current){window.speechSynthesis.pause();setPlaying(false);setPaused(true);return}if(!track.current){if(loading)stop();return}clearFrame();audio.current?.pause();setPlaying(false);setPaused(true);if(loading){generation.current++;setLoading(false)}}
 async function resume(){if(spoken.current){window.speechSynthesis.resume();setPlaying(true);setPaused(false);return}if(!track.current){play();return}if(!clip.current){setPlaying(true);setPaused(false);setLoading(true);void next(++generation.current);return}const run=generation.current,current=track.current,a=player();a.onended=current.prepared?()=>finish(run):()=>{if(generation.current!==run)return;clearFrame();current.cursor++;void next(run)};try{await a.play();if(generation.current!==run)return;setLoading(false);setPlaying(true);setPaused(false);follow(run)}catch{onError('Appuyez de nouveau sur « Reprendre l’écoute » pour lancer la voix.')}}
 function toggle(){if(playing)pause();else if(paused)void resume();else play()}
 function restart(){play()}
 async function playExpression(expression:string,value=rate.current){
  const isolated=expression.trim();if(!isolated)return;
  stop();const run=generation.current;
  // Speak the actual exercise in isolation, never a time slice of the article.
  // A local French device voice needs no download. Remote device voices expose
  // no reusable audio, so use the cached French synthesizer for those instead.
  setLoading(true);setPlaying(true);
  const segments=speechSegments(isolated);
  const cached=segments.length===1?await cachedFrenchAudio(segments[0].text):null;
  if(generation.current!==run)return;
  const voice=!cached&&'speechSynthesis' in window?await frenchDeviceVoice(window.speechSynthesis):null;
  if(generation.current!==run)return;
  if(voice?.localService){
   const utterance=new SpeechSynthesisUtterance(isolated);
   utterance.voice=voice;
   utterance.lang='fr-FR';utterance.rate=value;spoken.current=utterance;
   utterance.onend=()=>{if(generation.current===run){spoken.current=null;setPlaying(false);setPaused(false)}};
   utterance.onerror=event=>{if(generation.current!==run||event.error==='canceled'||event.error==='interrupted')return;spoken.current=null;setPlaying(false);setPaused(false);onError('La voix française est indisponible sur cet appareil. Réessayez.')};
   setPlaying(true);setPaused(false);setLoading(false);window.speechSynthesis.resume();window.speechSynthesis.speak(utterance);return;
  }
  unlock();rate.current=value;if(cached)prefetch.current={text:segments[0].text,result:Promise.resolve(cached)};track.current={segments,cursor:0,whole:false,phrases:[],reference:isolated,sourceChecked:true,first:0,last:readingWords(isolated).length};setPlaying(true);void next(++generation.current);
 }
 function setSpeed(value:number){if(!validListeningSpeed(value))return;rate.current=value;setSpeedState(value);if(audio.current)audio.current.playbackRate=value}
 useEffect(()=>{let active=true;if('speechSynthesis' in window)void frenchDeviceVoice(window.speechSynthesis);void preparedFrenchVoice(text).then(source=>{if(active&&source){const a=articlePlayer();if(a.getAttribute('src')!==source.src){a.src=source.src;a.load()}}}).catch(()=>{});return()=>{active=false}},[text]);
 useEffect(()=>()=>{generation.current++;if(spoken.current){spoken.current=null;window.speechSynthesis.cancel()}clearMedia();audio.current?.removeAttribute('src');audio.current?.load();audio.current=null;if(articleAudio.current){articleAudio.current.pause();articleAudio.current.removeAttribute('src');articleAudio.current.load();articleAudio.current=null}},[]);
 return {playing,paused,loading,percent,pause,restart,activeWord,activeRange,completed,speed,setSpeed,toggle,stop,playRange:play,playExpression};
}
