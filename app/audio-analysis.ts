export async function audioToWav(blob:Blob,maxSeconds:number){
 const ctx=new AudioContext();
 const bounded=async<T,>(promise:Promise<T>):Promise<T>=>{let timer:ReturnType<typeof setTimeout>;try{return await Promise.race([promise,new Promise<T>((_,reject)=>{timer=setTimeout(()=>reject(new Error('La préparation de cet audio prend trop de temps. Votre enregistrement reste disponible pour réessayer.')),30000)})])}finally{clearTimeout(timer!)}};
 try{
  const source=await bounded(ctx.decodeAudioData(await blob.arrayBuffer()));
  if(source.duration<3||source.duration>maxSeconds+1)throw new Error(`La lecture doit durer entre 3 secondes et ${maxSeconds/60} minutes.`);
  const frames=Math.min(maxSeconds*16000,Math.round(source.duration*16000)),offline=new OfflineAudioContext(1,frames,16000),node=offline.createBufferSource();node.buffer=source;node.connect(offline.destination);node.start();
  const rendered=await bounded(offline.startRendering()),samples=rendered.getChannelData(0),bytes=new Uint8Array(44+samples.length*2),v=new DataView(bytes.buffer);
  const tag=(at:number,s:string)=>{for(let i=0;i<s.length;i++)bytes[at+i]=s.charCodeAt(i)};
  tag(0,'RIFF');v.setUint32(4,bytes.length-8,true);tag(8,'WAVE');tag(12,'fmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,1,true);v.setUint32(24,16000,true);v.setUint32(28,32000,true);v.setUint16(32,2,true);v.setUint16(34,16,true);tag(36,'data');v.setUint32(40,samples.length*2,true);
  for(let i=0;i<samples.length;i++){const x=Math.max(-1,Math.min(1,samples[i]));v.setInt16(44+i*2,x<0?x*32768:x*32767,true)}
  return bytes;
 }finally{await ctx.close()}
}
