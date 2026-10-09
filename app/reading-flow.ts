export const readingWordPattern=/[\p{L}\p{N}]+(?:[’'-][\p{L}\p{N}]+)*/gu;
export function readingWords(text:string){return Array.from(text.matchAll(readingWordPattern),match=>({text:match[0],start:match.index!,end:match.index!+match[0].length}));}
export function articleText(paragraphs:string[]){return paragraphs.join('\n\n');}
export function readingRange(text:string,startWord=0,endWord=readingWords(text).length){
 const words=readingWords(text);
 if(!Number.isInteger(startWord)||!Number.isInteger(endWord)||startWord<0||endWord<=startWord||endWord>words.length)throw new Error('Le point de lecture est invalide.');
 return text.slice(startWord===0?0:words[startWord].start,endWord<words.length?words[endWord].start:text.length).trim();
}
const normalize=(word:string)=>word.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('fr').replaceAll('’',"'");
// Only move the cursor when actual recognized words support the match.
// The unspoken suffix has no penalty; repeated words keep occurrence indexes.
export function transcriptProgress(text:string,transcript:string,startWord:number){
 const words=readingWords(text),heard=readingWords(transcript).map(word=>normalize(word.text));
 if(!heard.length||startWord>=words.length)return null;
 const expected=words.slice(startWord,startWord+heard.length*2+12).map(word=>normalize(word.text));
 const width=heard.length+1,costs=new Uint32Array((expected.length+1)*width);
 for(let i=0;i<=expected.length;i++)costs[i*width]=i;
 for(let j=0;j<=heard.length;j++)costs[j]=j;
 let end=0,best=heard.length;
 for(let i=1;i<=expected.length;i++){
  for(let j=1;j<=heard.length;j++)costs[i*width+j]=Math.min(costs[(i-1)*width+j]+1,costs[i*width+j-1]+1,costs[(i-1)*width+j-1]+(expected[i-1]===heard[j-1]?0:1));
  if(costs[i*width+heard.length]<best){best=costs[i*width+heard.length];end=i;}
 }
 let i=end,j=heard.length,matches=0;
 while(i&&j){const value=costs[i*width+j];if(value===costs[(i-1)*width+j-1]+(expected[i-1]===heard[j-1]?0:1)){if(expected[i-1]===heard[j-1])matches++;i--;j--;}else if(value===costs[(i-1)*width+j]+1)i--;else j--;}
 if(matches<Math.min(2,heard.length)||matches<heard.length*.5)return null;
 // An unfinished final word must be read again, rather than skipped.
 const last=heard.at(-1)!,candidate=expected[end];
 const partial=candidate&&last.length>=2&&candidate!==last&&candidate.startsWith(last);
 return {endWord:startWord+end+(partial?1:0),nextWord:startWord+end};
}
export function acousticProgress(analysis:any,startWord:number,totalWords:number){
 const phones=Array.isArray(analysis?.phonemes)?analysis.phonemes:[];
 const present=phones.filter((phone:any)=>phone.expected&&phone.heard&&Number.isInteger(phone.wordIndex)&&typeof phone.start==='number');
 if(!present.length)return null;
 const lastIndex=Math.max(...present.map((phone:any)=>phone.wordIndex));
 const lastPhones=phones.filter((phone:any)=>phone.expected&&phone.wordIndex===lastIndex);
 const unfinished=lastPhones.at(-1)?.status==='missing';
 return {endWord:Math.min(totalWords,startWord+lastIndex+1),nextWord:Math.min(totalWords,startWord+lastIndex+(unfinished?0:1))};
}
