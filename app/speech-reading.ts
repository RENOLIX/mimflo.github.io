import {readingWords} from './reading-flow';

// Complete phrases preserve rhythm and liaisons with network voices.
export function speechSegments(text:string,fromWord=0,toWord=readingWords(text).length){
 const words=readingWords(text),segments:{first:number;last:number;start:number;text:string}[]=[];
 let first=Math.max(0,fromWord);const limit=Math.min(toWord,words.length);
 while(first<limit){
  let last=first+1,clause=0;const start=first===0?0:words[first].start;
  while(last<limit){const between=text.slice(words[last-1].end,words[last].start);if(/[.!?…\n]/.test(between))break;if(/[,;:]/.test(between))clause=last;if(words[last].end-start>450||last-first>=65){if(clause>first+5)last=clause;break;}last++;}
  const end=last<words.length?words[last].start:text.length;
  segments.push({first,last,start,text:text.slice(start,end).trimEnd()});first=last;
 }
 return segments;
}

