'use client';
import {useEffect,useLayoutEffect,useMemo,useRef,useState} from 'react';
import {BookOpen,ChevronLeft,ChevronRight} from 'lucide-react';
import {paginateReading,readingPageForWord,type BookPage,type BookImage} from './reading-pages';
import {fillReadingPage,renderDearFlipPages,type DearFlipPage} from './dearflip-pages';
import './article-flipbook.css';

type SpeechState={activeWord:number|null;activeRange:{first:number;last:number}|null;pointWord:number|null};
type BookApi={open:(pages:DearFlipPage[],initial:number,callbacks:{onReady:()=>void;onPage:(index:number)=>void;onWord:(index:number)=>void;onError:(message:string)=>void})=>void;goTo:(index:number)=>void;speech:(state:SpeechState)=>void;destroy:()=>void};
type BookWindow=Window&{MimFloBook?:BookApi};
type Props={paragraphs:string[];images?:BookImage['image'][];activeWord:number|null;activeRange:{first:number;last:number}|null;followWord:number|null;resumeWord:number;revealRequest?:{word:number;id:number}|null;recording:boolean;listening:boolean;onChooseWord:(index:number)=>void};
export default function ArticleFlipbook({paragraphs,images=[],activeWord,activeRange,followWord,resumeWord,revealRequest,recording,listening,onChooseWord}:Props){
 const probe=useRef<HTMLDivElement>(null),stage=useRef<HTMLDivElement>(null),frame=useRef<HTMLIFrameElement>(null),current=useRef(0),anchor=useRef(0),lastFollow=useRef<number|null>(null),followPosition=useRef(followWord);followPosition.current=followWord;
 const [pages,setPages]=useState<BookPage[]>([]),[page,setPage]=useState(0),[textures,setTextures]=useState<DearFlipPage[]>([]),[frameLoaded,setFrameLoaded]=useState(-1),[frameVersion,setFrameVersion]=useState(0),[ready,setReady]=useState(false),[error,setError]=useState(''),[retry,setRetry]=useState(0);
 const onChoose=useRef(onChooseWord);onChoose.current=onChooseWord;
 const speech=useRef<SpeechState>({activeWord,activeRange,pointWord:!listening?(recording?followWord:resumeWord):null});speech.current={activeWord,activeRange,pointWord:!listening?(recording?followWord:resumeWord):null};
 const source=useMemo(()=>JSON.stringify([paragraphs,images]),[paragraphs,images]);
 const api=()=>((frame.current?.contentWindow as BookWindow|null)?.MimFloBook);
 useLayoutEffect(()=>{
  const element=probe.current,viewport=stage.current;if(!element||!viewport)return;let alive=true,animation=0,lastSize='',version=0;
  const fontReady=Promise.race([document.fonts.load('400 17px Nunito').catch(()=>[]),new Promise(resolve=>setTimeout(resolve,1500))]);
  async function layout(){await fontReady;if(!alive||!element||!element.clientWidth)return;const metric=document.createElement('canvas').getContext('2d')!;metric.font='400 17px Nunito';const size=element.clientWidth+':'+element.clientHeight+':'+metric.measureText('MimFlo : notre environnement').width;if(size===lastSize)return;lastSize=size;const run=++version;setReady(false);setError('');
   const fits=(blocks:BookPage['blocks'])=>{fillReadingPage(element,blocks);const last=element.lastElementChild;return !last||last.getBoundingClientRect().bottom-element.getBoundingClientRect().top<=element.clientHeight-5};
   const next=paginateReading(paragraphs,images,fits);const nextPage=readingPageForWord(next,followPosition.current??anchor.current)??0;current.current=nextPage;setPages(next);setPage(nextPage);
   try{const rendered=await renderDearFlipPages(next,element,()=>alive&&version===run);if(alive&&version===run){setFrameLoaded(-1);setFrameVersion(value=>value+1);setTextures(rendered)}}catch{if(alive&&version===run)setError('La préparation des pages a été interrompue. Réessayez.');}
  }
  const schedule=()=>{cancelAnimationFrame(animation);animation=requestAnimationFrame(()=>void layout())},fontsChanged=()=>{if(alive)schedule()};
  const observer=new ResizeObserver(schedule);observer.observe(viewport);schedule();void document.fonts?.ready.then(fontsChanged);document.fonts?.addEventListener('loadingdone',fontsChanged);
  return()=>{alive=false;version++;cancelAnimationFrame(animation);observer.disconnect();document.fonts?.removeEventListener('loadingdone',fontsChanged)};
 },[source,retry]);
 useEffect(()=>{if(frameLoaded!==frameVersion||!textures.length)return;const book=api();if(!book){setError('Le lecteur n’a pas pu démarrer. Réessayez.');return}setReady(false);setError('');let alive=true;
  const timeout=setTimeout(()=>{if(alive)setError('Le lecteur met plus de temps à démarrer. Réessayez.')},20000);
  try{book.open(textures,current.current,{onReady:()=>{if(!alive)return;clearTimeout(timeout);setReady(true);book.speech(speech.current)},onPage:index=>{if(!alive||!pages[index])return;current.current=index;anchor.current=pages[index].blocks.find(block=>block.kind==='text')?.firstWord??anchor.current;setPage(index);book.speech(speech.current)},onWord:index=>onChoose.current(index),onError:message=>{if(alive){clearTimeout(timeout);setError(message)}}})}catch{clearTimeout(timeout);setError('Le lecteur n’a pas pu démarrer. Réessayez.')}
  return()=>{alive=false;clearTimeout(timeout)};
 },[textures,frameLoaded,frameVersion]);
 useEffect(()=>{api()?.speech(speech.current)},[activeWord,activeRange,followWord,resumeWord,recording,listening,ready]);
 function showPage(next:number){const bounded=Math.max(0,Math.min(pages.length-1,next));if(!pages.length)return;current.current=bounded;anchor.current=pages[bounded].blocks.find(block=>block.kind==='text')?.firstWord??anchor.current;setPage(bounded);api()?.goTo(bounded)}
 useEffect(()=>{if(followWord===null||!pages.length){lastFollow.current=null;return}const next=readingPageForWord(pages,followWord),previous=lastFollow.current===null?null:readingPageForWord(pages,lastFollow.current);if(next!==null&&(previous===null||next!==previous))showPage(next);lastFollow.current=followWord},[followWord,pages]);
 useEffect(()=>{if(listening||recording||!pages.length)return;const next=readingPageForWord(pages,resumeWord);if(next!==null)showPage(next)},[resumeWord,pages]);
 useEffect(()=>{if(!revealRequest)return;const next=readingPageForWord(pages,revealRequest.word);if(next!==null)showPage(next)},[revealRequest,pages]);
 return <section className="article-flipbook" aria-label="Article à feuilleter" data-reader="dearflip"><div className="flipbook-toolbar"><span><BookOpen size={17}/>Votre lecture</span><span className="flipbook-auto">{listening?'Les pages suivent la voix':'Une page à la fois'}</span></div><div className="flipbook-stage" ref={stage} tabIndex={0} aria-label="Pages de l’article" onKeyDown={event=>{if(event.target!==event.currentTarget)return;if(event.key==='ArrowLeft'||event.key==='ArrowRight'){event.preventDefault();showPage(current.current+(event.key==='ArrowRight'?1:-1))}}}>
  <iframe key={retry+':'+frameVersion} ref={frame} className="dearflip-frame" src="/dearflip-reader.html?v=1" title="Lecture de l’article avec DearFlip" onLoad={()=>setFrameLoaded(frameVersion)} allow="fullscreen"/>
  <div className="flipbook-paper flipbook-probe" aria-hidden="true" inert><div className="flipbook-copy reader-follow-text" ref={probe}/></div>
  {!ready&&!error&&<div className="flipbook-loading" role="status"><span/>Préparation de votre lecture…</div>}
  {error&&<div className="flipbook-error" role="status"><p>{error}</p><button onClick={()=>{setFrameLoaded(-1);setRetry(value=>value+1)}}>Réessayer</button></div>}
  <button className="flipbook-arrow previous" onClick={()=>showPage(page-1)} disabled={!ready||page===0} aria-label="Page précédente"><ChevronLeft size={22}/></button><button className="flipbook-arrow next" onClick={()=>showPage(page+1)} disabled={!ready||!pages.length||page===pages.length-1} aria-label="Page suivante"><ChevronRight size={22}/></button>
 </div><nav className="flipbook-navigation" aria-label="Navigation dans l’article"><button onClick={()=>showPage(0)} disabled={!ready||page===0}>Première page</button><span role="status" aria-live="polite">Page <strong>{page+1}</strong> sur {pages.length||1}</span><label>Aller à la page<select aria-label="Aller à la page" value={page} disabled={!ready} onChange={event=>showPage(Number(event.target.value))}>{(pages.length?pages:[{blocks:[]}]).map((_,index)=><option key={index} value={index}>{index+1}</option>)}</select></label></nav></section>;
}
