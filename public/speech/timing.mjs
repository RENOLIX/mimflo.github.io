import { alignPhones } from '../phonetics/core.mjs';
const structural = new Set(['^', '$', '_']);
const significant = phone => !structural.has(phone) && /[\p{L}\p{M}]/u.test(phone);
export function synthesisInput(full, isolated, words, map) {
 const phones = full.filter(phone => !structural.has(phone));
 const labels = isolated.flatMap((line, wordIndex) => line.filter(significant).map(phone => ({ id:phone.codePointAt(0), wordIndex })));
 const reference = phones.map((phone, index) => ({phone,index})).filter(p=>significant(p.phone));
 const pairs = alignPhones(reference.map(p=>({id:p.phone.codePointAt(0)})), labels);
 const wordForPhone = new Map();let wordIndex=0;
 for(const pair of pairs){if(pair.heardIndex!==null)wordIndex=labels[pair.heardIndex].wordIndex;if(pair.expectedIndex!==null)wordForPhone.set(reference[pair.expectedIndex].index,wordIndex);}
 const ids = [...map['^'], ...map['_']], ranges=[];
 phones.forEach((phone,index)=>{const values=map[phone];if(!values?.length)return;const start=ids.length;ids.push(...values,...map['_']);ranges.push({start,end:ids.length,wordIndex:wordForPhone.get(index)??null});});
 ids.push(...map['$']);
 if(!ranges.some(p=>p.wordIndex!==null))throw Error('Les repères de lecture sont indisponibles pour ce texte.');
 return {ids,ranges,words};
}
export function audioWordTimings(input, frames, sampleRate, sampleCount, hop=256){
 if(frames.length!==input.ids.length)throw Error('Repères audio incomplets.');
 const offsets=[0];for(const frame of frames){if(!Number.isFinite(frame)||frame<0)throw Error('Repère audio invalide.');offsets.push(offsets.at(-1)+Math.round(frame)*hop);}
 if(Math.abs(offsets.at(-1)-sampleCount)>hop)throw Error('Les repères ne correspondent pas à cet audio.');
 const words=input.words.map((text,index)=>({index,text,start:null,end:null}));
 for(const range of input.ranges){if(range.wordIndex===null)continue;const word=words[range.wordIndex];word.start??=offsets[range.start]/sampleRate;word.end=offsets[range.end]/sampleRate;}
 for(let i=0;i<words.length;i++){if(words[i].start===null)throw Error('Un mot ne possède pas de repère audio.');words[i].end=words[i+1]?.start??sampleCount/sampleRate;}
 return words;
}
export function wavBytes(samples,rate){
 const bytes=new Uint8Array(44+samples.length*2),v=new DataView(bytes.buffer),write=(at,str)=>[...str].forEach((c,i)=>v.setUint8(at+i,c.charCodeAt(0)));
 write(0,'RIFF');v.setUint32(4,bytes.length-8,true);write(8,'WAVE');write(12,'fmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,1,true);v.setUint32(24,rate,true);v.setUint32(28,rate*2,true);v.setUint16(32,2,true);v.setUint16(34,16,true);write(36,'data');v.setUint32(40,samples.length*2,true);
 for(let i=0;i<samples.length;i++)v.setInt16(44+i*2,Math.round(Math.max(-1,Math.min(1,samples[i]))*32767),true);return bytes;
}
