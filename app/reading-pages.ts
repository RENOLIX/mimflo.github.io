import {readingWords} from './reading-flow';

export type BookText={kind:'text';text:string;paragraph:number;firstWord:number};
export type BookImage={kind:'image';image:{id:string;url:string;caption?:string;afterParagraph:number}};
export type BookBlock=BookText|BookImage;
export type BookPage={blocks:BookBlock[]};

// Page boundaries never alter the article or the word indexes used by the audio.
export function paginateReading(paragraphs:string[],images:BookImage['image'][],fits:(blocks:BookBlock[])=>boolean):BookPage[]{
 const pages:BookPage[]=[];let page:BookBlock[]=[],globalWord=0;
 const flush=()=>{if(page.length){pages.push({blocks:page});page=[]}};
 const addImage=(image:BookImage['image'])=>{const block:BookImage={kind:'image',image};if(page.length&&!fits([...page,block]))flush();page.push(block)};
 images.filter(image=>image.afterParagraph===-1).forEach(addImage);
 paragraphs.forEach((paragraph,index)=>{
  const words=readingWords(paragraph);let offset=0;
  if(!words.length){const block:BookText={kind:'text',text:paragraph,paragraph:index,firstWord:globalWord};if(page.length&&!fits([...page,block]))flush();page.push(block)}
  while(offset<words.length){
   const chunk=(count:number):BookText=>({kind:'text',paragraph:index,firstWord:globalWord+offset,text:paragraph.slice(offset?words[offset].start:0,offset+count<words.length?words[offset+count].start:paragraph.length)});
   let low=0,high=words.length-offset;
   while(low<high){const mid=Math.ceil((low+high)/2);if(fits([...page,chunk(mid)]))low=mid;else high=mid-1}
   if(!low&&page.length){flush();continue}
   const count=Math.max(1,low);page.push(chunk(count));offset+=count;if(offset<words.length)flush();
  }
  globalWord+=words.length;
  images.filter(image=>image.afterParagraph===index).forEach(addImage);
 });
 flush();return pages.length?pages:[{blocks:[]}];
}
export function readingPageForWord(pages:BookPage[],word:number){
 const index=pages.findIndex(page=>page.blocks.some(block=>block.kind==='text'&&word>=block.firstWord&&word<block.firstWord+readingWords(block.text).length));
 return index<0?null:index;
}
