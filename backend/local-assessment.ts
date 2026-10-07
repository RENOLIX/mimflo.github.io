const model='onnx-community/wav2vec2-lv-60-espeak-cv-ft-ONNX';
const revision='c69750f5043e5e1f8a71ab95dd3b98338c280c92';
const number=(v:unknown,min:number,max:number):number=>{if(typeof v!=='number'||!Number.isFinite(v)||v<min||v>max)throw Error('Mesure acoustique invalide.');return v;};
const label=(v:unknown,max=120)=>{if(typeof v!=='string'||v.length>max)throw Error('Libellé phonétique invalide.');return v;};
export function validateLocalAssessment(input:any,reference:string,seconds:number,passage:number){
 if(!input||input.kind!=='phonetic-experimental'||input.version!==5||input.model!==model||input.revision!==revision||input.reference!==reference)throw Error('Cette analyse ne correspond pas au passage choisi.');
 if(Math.abs(number(input.seconds,3,600)-seconds)>.6)throw Error('La durée de l’analyse ne correspond pas à la lecture.');
 if(!Array.isArray(input.phonemes)||!input.phonemes.length||input.phonemes.length>5000)throw Error('Détail phonétique incomplet.');
 const referenceWords=reference.match(/[\p{L}\p{N}]+(?:[’'-][\p{L}\p{N}]+)*/gu)||[];
 const phonemes=input.phonemes.map((p:any)=>{
  const expected=label(p.expected,12),heard=label(p.heard,12),status=p.status;
  if(!['match','different','missing','added'].includes(status)||status==='missing'&&(!expected||heard)||status==='added'&&(expected||!heard)||['match','different'].includes(status)&&(!expected||!heard)||status==='match'&&expected!==heard||status==='different'&&expected===heard)throw Error('Alignement phonétique invalide.');
  const absent=status==='missing';
  const start=absent?null:number(p.start,0,seconds),end=absent?null:number(p.end,start!,seconds);
  const word=p.word===null?null:label(p.word);
  const wordIndex=p.wordIndex==null?null:number(p.wordIndex,0,referenceWords.length-1);
  if(wordIndex!==null&&(!Number.isInteger(wordIndex)||referenceWords[wordIndex]!==word))throw Error('Le mot mesuré ne correspond pas au passage.');
  return {expected,heard,status,word,wordIndex,confidence:absent||status==='added'?null:number(p.confidence,0,100),gop:absent||status==='added'?null:number(p.gop,-100,100),start,end};
 });
 const expectedPhonemes=phonemes.filter((p:any)=>p.expected).length;if(!expectedPhonemes)throw Error('Aucun son attendu.');
 const score=Math.round(phonemes.reduce((s:number,p:any)=>s+(p.expected?p.confidence||0:0),0)/expectedPhonemes);
 const timing=input.timing;if(!timing||!Array.isArray(timing.pauses)||timing.pauses.length>2000)throw Error('Mesures temporelles invalides.');
 const pauses=timing.pauses.map((p:any)=>({start:number(p.start,0,seconds),seconds:number(p.seconds,.3,seconds-p.start+.05)}));
 const voicedSeconds=number(timing.voicedSeconds,.2,seconds+.04),pauseSeconds=pauses.reduce((s:number,p:any)=>s+p.seconds,0);
 if(pauseSeconds>seconds+.1)throw Error('Durée des pauses invalide.');
 return {version:5,kind:'phonetic-experimental',provider:'wav2vec2-lv60-phoneme-ctc',model,revision,method:'CTC forced alignment + mean phone posterior + log posterior margin (GOP-style)',calibrated:false,source:'device',score,pronunciationScore:score,accentScore:null,fluencyScore:null,phonemes,expectedPhonemes,recognizedPhonemes:phonemes.filter((p:any)=>p.heard).length,matchedPercent:Math.round(phonemes.filter((p:any)=>p.status==='match').length/expectedPhonemes*100),seconds,passage,reference,timing:{voicedSeconds,pauseCount:pauses.length,pauseSeconds:Math.round(pauseSeconds*100)/100,pauses,phonesPerSecond:number(timing.phonesPerSecond,0,200),clipped:!!timing.clipped,noiseHigh:!!timing.noiseHigh},tips:Array.isArray(input.tips)?input.tips.slice(0,8).map((t:any)=>label(t,500)):[],limitation:'Indice acoustique expérimental calculé sur votre appareil. L’accent et la fluidité ne sont pas calibrés ; aucune équivalence avec Azure ni niveau CECRL n’est établi.'};
}
