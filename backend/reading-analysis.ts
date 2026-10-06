import {MAX_READING_SECONDS} from '../app/reading-duration';
// This is a reading/transcription assessment, never a phonetic or CEFR score.
export function readingAssessment(expectedText:string,transcript:string,seconds:number){
 const words=(s:string)=>s.toLocaleLowerCase('fr').normalize('NFC').replace(/[’']/g,' ').match(/[\p{L}\p{N}]+/gu)||[];
 const expected=words(expectedText),spoken=words(transcript);
 if(expected.length>2000||spoken.length>2500)throw new Error('Texte trop long pour cette analyse.');
 const rows=expected.length+1,cols=spoken.length+1,dp=new Uint16Array(rows*cols);
 for(let i=0;i<rows;i++)dp[i*cols]=i;for(let j=0;j<cols;j++)dp[j]=j;
 for(let i=1;i<rows;i++)for(let j=1;j<cols;j++)dp[i*cols+j]=Math.min(dp[(i-1)*cols+j]+1,dp[i*cols+j-1]+1,dp[(i-1)*cols+j-1]+(expected[i-1]===spoken[j-1]?0:1));
 const differences:{kind:string;expected?:string;heard?:string}[]=[];let i=expected.length,j=spoken.length,matches=0;
 while(i||j){const value=dp[i*cols+j];if(i&&j&&value===dp[(i-1)*cols+j-1]+(expected[i-1]===spoken[j-1]?0:1)){if(expected[i-1]===spoken[j-1])matches++;else differences.push({kind:'different',expected:expected[i-1],heard:spoken[j-1]});i--;j--;}else if(i&&value===dp[(i-1)*cols+j]+1){differences.push({kind:'missing',expected:expected[--i]});}else differences.push({kind:'added',heard:spoken[--j]});}
 differences.reverse();const score=Math.max(0,Math.round((1-dp[expected.length*cols+spoken.length]/Math.max(1,expected.length))*100));
 const missed=differences.filter(d=>d.kind==='missing').length,changed=differences.filter(d=>d.kind==='different').length,added=differences.filter(d=>d.kind==='added').length;
 const tips=[score>=90?'Le texte reconnu est proche du texte proposé. Continuez à vous entraîner en écoutant le modèle.':'Relisez les passages signalés, une phrase à la fois, puis comparez votre enregistrement au modèle.'];
 if(missed)tips.push('Certains mots ne figurent pas dans la transcription. Vérifiez le passage concerné : une erreur de reconnaissance reste possible.');
 if(changed)tips.push('Écoutez les mots signalés comme différents et répétez-les lentement dans leur phrase.');
 if(added)tips.push('Repérez les ajouts dans votre enregistrement et prenez le temps de suivre le texte.');
 return {version:1,kind:'reading',score,expectedWords:expected.length,recognizedWords:spoken.length,matches,missing:missed,different:changed,added,wordsPerMinute:Math.round(spoken.length/Math.max(1,seconds)*60),differences:differences.slice(0,60),tips,limitation:'Whisper peut se tromper. Ce score compare les mots transcrits au texte : il ne mesure ni les phonèmes, ni l’accent, ni le niveau CECRL.'};
}
export function validateAudio(bytes:Uint8Array,maxSeconds=MAX_READING_SECONDS){
 if(bytes.length<44||bytes.length>44+MAX_READING_SECONDS*32000)throw new Error('Audio invalide ou trop volumineux.');
 const v=new DataView(bytes.buffer),tag=(a:number,n:number)=>String.fromCharCode(...bytes.slice(a,a+n));
 if(tag(0,4)!=='RIFF'||tag(8,4)!=='WAVE'||tag(12,4)!=='fmt '||v.getUint32(16,true)!==16||v.getUint16(20,true)!==1||v.getUint16(22,true)!==1||v.getUint32(24,true)!==16000||v.getUint32(28,true)!==32000||v.getUint16(32,true)!==2||v.getUint16(34,true)!==16||tag(36,4)!=='data'||v.getUint32(40,true)!==bytes.length-44||v.getUint32(4,true)!==bytes.length-8||(bytes.length-44)%2)throw new Error('Format attendu : WAV mono, 16 kHz, 16 bits.');
 const seconds=(bytes.length-44)/32000;if(seconds<3||seconds>maxSeconds)throw new Error(`L’analyse de ce passage accepte une lecture de 3 secondes à ${maxSeconds/60} minutes.`);
 let energy=0,n=0;for(let x=44;x<bytes.length;x+=128){energy+=(v.getInt16(x,true)/32768)**2;n++;}if(Math.sqrt(energy/n)<.002)throw new Error('Aucune voix audible. Vérifiez votre microphone et recommencez.');
 return {seconds,bytes};
}
