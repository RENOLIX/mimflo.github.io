import {pcmWav} from './pcm-audio';

export class MicrophoneRecorder{
 readonly mimeType='audio/wav';
 state:'inactive'|'recording'='inactive';
 ondataavailable:((event:{data:Blob})=>void)|null=null;
 onstop:(()=>void)|null=null;
 onerror:(()=>void)|null=null;
 duration=0;
 private chunks:Float32Array[]=[];
 constructor(private context:AudioContext,private source:MediaStreamAudioSourceNode,private node:AudioWorkletNode){
  node.port.onmessage=({data})=>{
   if(data.type==='samples'){this.chunks.push(data.samples);return;}
   if(data.type==='stopped'){
    const audio=pcmWav(this.chunks,context.sampleRate);this.duration=this.chunks.reduce((n,c)=>n+c.length,0)/context.sampleRate;this.chunks=[];
    source.disconnect();node.disconnect();void context.close().catch(()=>{});
    this.ondataavailable?.({data:audio});this.onstop?.();
   }
  };
  node.onprocessorerror=()=>{this.state='inactive';source.disconnect();node.disconnect();void context.close().catch(()=>{});this.onerror?.()};
 }
 start(){this.chunks=[];this.state='recording';this.node.port.postMessage({type:'start'})}
 stop(){if(this.state!=='recording')return;this.state='inactive';this.node.port.postMessage({type:'stop'})}
 dispose(){this.state='inactive';this.source.disconnect();this.node.disconnect();void this.context.close().catch(()=>{})}
}
export async function createMicrophoneRecorder(media:MediaStream){
 const context=new AudioContext();
 try{
  await context.resume();await context.audioWorklet.addModule('/recording/pcm-worklet.js?v=1');
  const source=context.createMediaStreamSource(media),node=new AudioWorkletNode(context,'mimflo-pcm-recorder',{numberOfInputs:1,numberOfOutputs:1,outputChannelCount:[1]});
  source.connect(node);node.connect(context.destination);
  return new MicrophoneRecorder(context,source,node);
 }catch(error){await context.close().catch(()=>{});throw error}
}
