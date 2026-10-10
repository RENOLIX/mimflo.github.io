class MimfloPcmRecorder extends AudioWorkletProcessor {
 constructor(){super();this.recording=false;this.buffer=new Float32Array(4096);this.at=0;this.port.onmessage=({data})=>{if(data.type==='start'){this.at=0;this.recording=true;}else if(data.type==='stop'){this.recording=false;this.flush();this.port.postMessage({type:'stopped'});}};}
 flush(){if(!this.at)return;const samples=this.buffer.slice(0,this.at);this.port.postMessage({type:'samples',samples},[samples.buffer]);this.at=0;}
 process(inputs,outputs){
  // The microphone is captured, but is never played back through the speakers.
  for(const output of outputs)for(const channel of output)channel.fill(0);
  const channels=inputs[0];if(!this.recording||!channels?.length)return true;
  for(let i=0;i<channels[0].length;i++){let sample=0;for(const channel of channels)sample+=channel[i]||0;this.buffer[this.at++]=sample/channels.length;if(this.at===this.buffer.length)this.flush();}
  return true;
 }
}
registerProcessor('mimflo-pcm-recorder',MimfloPcmRecorder);
