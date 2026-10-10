// A WAV declares its duration from its sample count, without browser timecodes.
export function pcmWav(chunks:Float32Array[],sampleRate:number){
 const frames=chunks.reduce((count,chunk)=>count+chunk.length,0),bytes=new Uint8Array(44+frames*2),view=new DataView(bytes.buffer);
 const tag=(at:number,value:string)=>{for(let i=0;i<value.length;i++)bytes[at+i]=value.charCodeAt(i)};
 tag(0,'RIFF');view.setUint32(4,bytes.length-8,true);tag(8,'WAVE');tag(12,'fmt ');view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,1,true);view.setUint32(24,sampleRate,true);view.setUint32(28,sampleRate*2,true);view.setUint16(32,2,true);view.setUint16(34,16,true);tag(36,'data');view.setUint32(40,frames*2,true);
 let offset=44;for(const chunk of chunks)for(const sample of chunk){const value=Math.max(-1,Math.min(1,sample));view.setInt16(offset,value<0?Math.round(value*32768):Math.round(value*32767),true);offset+=2}
 return new Blob([bytes],{type:'audio/wav'});
}
