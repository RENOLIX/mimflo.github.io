import {soundDescription} from './sound-guidance';
export type ReportPhone = {expected:string;heard:string;word:string|null;wordIndex?:number|null;status:string;confidence:number|null;gop:number|null;start:number|null;end:number|null};
export type ReportWord = {index:number;text:string;phones:ReportPhone[];status:'recognized'|'uncertain'|'missing'|'unavailable';confidence:number|null;pause:number|null};
const wordPattern=/[\p{L}\p{N}]+(?:[’'-][\p{L}\p{N}]+)*/gu;
const key=(text:string)=>text.normalize('NFC').toLocaleLowerCase('fr').replaceAll('’',"'");
export const percentage=(value:unknown)=>typeof value==='number'&&Number.isFinite(value)?Math.max(0,Math.min(100,Math.round(value))):null;
export function reportData(analysis:any){
 const reference:string=typeof analysis?.reference==='string'?analysis.reference:'';
 const tokens=Array.from(reference.matchAll(wordPattern));
 const words:ReportWord[]=tokens.map((m,index)=>({index,text:m[0],phones:[],status:'unavailable',confidence:null,pause:null}));
 const phones:ReportPhone[]=Array.isArray(analysis?.phonemes)?analysis.phonemes:[];
 const unindexed:ReportPhone[]=[];
 for(const phone of phones){
  if(!phone.expected)continue;
  const index=phone.wordIndex;
  if(typeof index==='number'&&Number.isInteger(index)&&index>=0&&index<words.length&&phone.word&&key(words[index].text)===key(phone.word))words[index].phones.push(phone);
  else unindexed.push(phone);
 }
 // Older saved readings have labels without occurrence indexes. Do not invent
 // separate measurements for adjacent repeated words such as “nous nous”.
 const groups:{word:string;phones:ReportPhone[]}[]=[];
 for(const phone of unindexed){if(!phone.word)continue;const label=key(phone.word);if(groups.at(-1)?.word===label)groups.at(-1)!.phones.push(phone);else groups.push({word:label,phones:[phone]})}
 let cursor=0;
 for(const group of groups){
  const at=words.findIndex((word,i)=>i>=cursor&&key(word.text)===group.word);
  if(at<0)continue;
  let end=at+1;while(end<words.length&&key(words[end].text)===group.word)end++;
  if(end===at+1&&!words[at].phones.length)words[at].phones=group.phones;
  cursor=end;
 }
 for(const word of words){
  if(!word.phones.length)continue;
  word.confidence=Math.round(word.phones.reduce((sum,p)=>sum+(p.confidence||0),0)/word.phones.length);
  word.status=word.phones.every(p=>p.status==='missing')?'missing':word.phones.every(p=>p.status==='match'&&(p.confidence??0)>=55)?'recognized':'uncertain';
 }
 const pauses=Array.isArray(analysis?.timing?.pauses)?analysis.timing.pauses:[];
 for(const pause of pauses){
  const previous=words.filter(w=>w.phones.some(p=>p.end!==null&&p.end<=pause.start+.08)).at(-1);
  if(previous&&Math.abs(Math.max(...previous.phones.map(p=>p.end??0))-pause.start)<.35)previous.pause=(previous.pause||0)+pause.seconds;
 }
 const segments:{text:string;word:ReportWord|null}[]=[];let at=0;
 tokens.forEach((match,i)=>{const start=match.index!;if(start>at)segments.push({text:reference.slice(at,start),word:null});segments.push({text:match[0],word:words[i]});at=start+match[0].length});
 if(at<reference.length)segments.push({text:reference.slice(at),word:null});
 const expected=phones.filter(p=>p.expected),present=expected.filter(p=>p.status!=='missing'),matched=expected.filter(p=>p.status==='match');
 return {reference,words,segments,phones,score:percentage(analysis?.score),completion:expected.length?Math.round(present.length/expected.length*100):null,precision:present.length?Math.round(matched.length/present.length*100):null,recognizedWords:words.filter(w=>w.status==='recognized').length,practice:words.filter(w=>w.status==='uncertain'||w.status==='missing'),missingPhones:expected.filter(p=>p.status==='missing').length,differentPhones:expected.filter(p=>p.status==='different').length};
}
export function wordFeedback(word:ReportWord){
 const missing=word.phones.filter(p=>p.status==='missing');
 if(word.status==='missing')return 'Les sons de ce mot n’ont pas été reconnus. Vérifiez que vous l’avez lu puis réécoutez votre voix.';
 const different=word.phones.find(p=>p.status==='different');
 if(different)return `Travaillez ${soundDescription(different.expected)}. Son repéré dans votre enregistrement : ${soundDescription(different.heard)}. Écoutez le mot et répétez-le lentement.`;
 if(missing.length)return `À retravailler : ${[...new Set(missing.map(p=>soundDescription(p.expected)))].join(' ; ')}. Ces sons n’ont pas été reconnus. Comparez avec la lecture de référence.`;
 const weak=word.phones.find(p=>(p.confidence??0)<55);
 return weak?`Réécoutez ${soundDescription(weak.expected)}. Répétez le mot dans un endroit calme : la qualité de l’enregistrement peut aussi expliquer cet écart.`:'Écoutez le mot puis répétez-le dans sa phrase.';
}
