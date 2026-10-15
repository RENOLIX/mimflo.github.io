import {readingWords} from './reading-flow';
import type {BookBlock,BookPage} from './reading-pages';

export function fillReadingPage(element:HTMLElement,blocks:BookBlock[]){
 element.replaceChildren();
 for(const block of blocks){
  if(block.kind==='text'){const p=document.createElement('p');let at=0;for(const [index,word] of readingWords(block.text).entries()){p.appendChild(document.createTextNode(block.text.slice(at,word.start)));const span=document.createElement('span');span.className='reader-word';span.dataset.word=String(block.firstWord+index);span.textContent=word.text;p.appendChild(span);at=word.end}p.appendChild(document.createTextNode(block.text.slice(at)));element.appendChild(p)}
  else{const figure=document.createElement('figure');figure.className='flipbook-image';const img=document.createElement('img');img.crossOrigin='anonymous';img.src=block.image.url;img.alt=block.image.caption||'';figure.appendChild(img);if(block.image.caption){const caption=document.createElement('figcaption');caption.textContent=block.image.caption;figure.appendChild(caption)}element.appendChild(figure)}
 }
}
export type DearFlipPage={image:string;links:{x:number;y:number;w:number;h:number;dest:string}[]};
const xml=(value:string)=>value.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]!));
export async function renderDearFlipPages(pages:BookPage[],copy:HTMLDivElement,alive:()=>boolean):Promise<DearFlipPage[]>{
 const paper=copy.parentElement!,paperRect=paper.getBoundingClientRect(),width=paper.clientWidth,height=paper.clientHeight,result:DearFlipPage[]=[];
 for(const [pageIndex,page] of pages.entries()){
  if(!alive())return [];fillReadingPage(copy,page.blocks);
  await Promise.all(Array.from(copy.querySelectorAll('img'),image=>image.decode().catch(()=>{})));if(!alive())return [];
  const canvas=document.createElement('canvas'),scale=Math.min(2,window.devicePixelRatio||1);canvas.width=Math.round(width*scale);canvas.height=Math.round(height*scale);const ctx=canvas.getContext('2d')!;ctx.scale(scale,scale);ctx.fillStyle='#fffdf8';ctx.fillRect(0,0,width,height);
  const origin=paper.getBoundingClientRect(),links:DearFlipPage['links']=[];
  // Draw the actual laid-out glyphs. The page texture bends with DearFlip's mesh;
  // its matching annotation rectangles retain word selection and vocal highlighting.
  const walker=document.createTreeWalker(copy,NodeFilter.SHOW_TEXT);let node:Node|null;
  while((node=walker.nextNode())){const value=node.textContent||'',parent=node.parentElement!;if(!value.trim())continue;const style=getComputedStyle(parent),font=`${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;ctx.font=font;ctx.fillStyle=style.color;ctx.textBaseline='alphabetic';const metric=ctx.measureText(value),descent=metric.fontBoundingBoxDescent??parseFloat(style.fontSize)*.2;const range=document.createRange();let line='',lineRect:DOMRect|null=null;
   const draw=()=>{if(lineRect&&line.trim())ctx.fillText(line,lineRect.left-origin.left,lineRect.bottom-origin.top-descent)};
   for(let i=0;i<value.length;i++){range.setStart(node,i);range.setEnd(node,i+1);const rect=range.getBoundingClientRect();if(lineRect&&Math.abs(rect.top-lineRect.top)>.5){draw();line='';lineRect=null}if(!lineRect)lineRect=rect;line+=value[i]}draw();
  }
  for(const image of copy.querySelectorAll('img')){if(image.complete&&image.naturalWidth){const rect=image.getBoundingClientRect(),ratio=Math.min(rect.width/image.naturalWidth,rect.height/image.naturalHeight),w=image.naturalWidth*ratio,h=image.naturalHeight*ratio;ctx.drawImage(image,rect.left-origin.left+(rect.width-w)/2,rect.top-origin.top+(rect.height-h)/2,w,h)}}
  ctx.strokeStyle='#e8dfe5';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(30,height-25);ctx.lineTo(width-46,height-25);ctx.stroke();ctx.font='11px Nunito, sans-serif';ctx.fillStyle='#b3a1b2';ctx.fillText('MimFlo',30,height-11);ctx.fillText(String(pageIndex+1),width-35,height-11);
  for(const word of copy.querySelectorAll<HTMLElement>('[data-word]')){const range=document.createRange();range.selectNodeContents(word);const rect=range.getBoundingClientRect(),style=getComputedStyle(word),font=`${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;ctx.font=font;const descent=ctx.measureText(word.textContent||'').fontBoundingBoxDescent??3;
   const span=`<span class="mimflo-df-word" data-reading-word="${word.dataset.word}" role="button" tabindex="-1" aria-label="Commencer à ${xml(word.textContent||'')}"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${rect.width} ${rect.height}" preserveAspectRatio="none"><rect class="word-bg" width="100%" height="100%" rx="3"/><text x="0" y="${rect.height-descent}" font-family="${xml(style.fontFamily)}" font-size="${parseFloat(style.fontSize)}" font-weight="${style.fontWeight}">${xml(word.textContent||'')}</text></svg></span>`;
   links.push({x:(rect.left-origin.left)/width*100,y:(rect.top-origin.top)/height*100,w:rect.width/width*100,h:rect.height/height*100,dest:'[html]'+span});
  }
  result.push({image:canvas.toDataURL('image/png'),links});
 }
 copy.replaceChildren();return result;
}
