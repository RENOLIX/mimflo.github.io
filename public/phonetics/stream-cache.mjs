// Precompute acoustic windows while PCM is captured. Original audio stays local.
export function acousticWindow(samples,start,block=32000,context=8000){
  const from=Math.max(0,start-context),to=Math.min(samples.length,start+block+context);
  const window=new Float32Array(block+2*context);window.set(samples.subarray(from,to),context-(start-from));return window;
}
export class AcousticStream {
  constructor(id, infer, width, block = 32000, context = 8000) {
    this.id=id;this.infer=infer;this.width=width;this.block=block;this.context=context;
    this.samples=new Float32Array(64000);this.length=0;this.cursor=0;
    this.logp=new Float32Array(0);this.task=null;this.sealed=false;this.error=null;
  }
  append(samples) {
    if(this.sealed||this.error)return;
    // Bound retained audio and acoustic data, independently of the recording limit.
    if(this.length+samples.length>16000*600){this.error=new Error('stream cache limit');return;}
    if(this.samples.length<this.length+samples.length){const next=new Float32Array(Math.max(this.length+samples.length,this.samples.length*2));next.set(this.samples.subarray(0,this.length));this.samples=next;}
    for(let i=0;i<samples.length;i++){const x=Math.max(-1,Math.min(1,samples[i]));this.samples[this.length+i]=(x<0?Math.round(x*32768):Math.round(x*32767))/32768;}
    this.length+=samples.length;this.pump();
  }
  compatible(samples) {
    if(this.error||this.length!==samples.length)return false;
    for(let i=0;i<samples.length;i++)if(Math.abs(this.samples[i]-samples[i])>1e-7)return false;
    return true;
  }
  pump(onProgress) {
    if(this.task)return this.task;
    this.task=(async()=>{
      while(!this.error&&(this.sealed?this.cursor<this.length:this.cursor+this.block+this.context<=this.length)){
        const frames=Math.max(0,Math.floor((this.length-400)/320)+1);
        const first=this.cursor/320,last=Math.min(frames,(this.cursor+this.block)/320);
        if(last<=first){this.cursor=this.length;break;}
        const values=await this.infer(acousticWindow(this.samples.subarray(0,this.length),this.cursor,this.block,this.context));
        if(last*this.width>32*1024*1024/4){this.error=new Error('stream cache limit');break;}
        if(this.logp.length<last*this.width){const next=new Float32Array(Math.min(32*1024*1024/4,Math.max(last*this.width,this.logp.length*2)));next.set(this.logp);this.logp=next;}
        for(let frame=first;frame<last;frame++){
          const local=frame-this.cursor/320+this.context/320;
          if((local+1)*this.width>values.length)throw Error('incomplete acoustic window');
          this.logp.set(values.subarray(local*this.width,(local+1)*this.width),frame*this.width);
        }
        this.cursor=Math.min(this.length,this.cursor+this.block);onProgress?.(Math.min(1,this.cursor/this.length));
      }
    })().catch(e=>{this.error=e;}).finally(()=>{this.task=null;});
    return this.task;
  }
  async finish(onProgress) {
    this.sealed=true;await this.task;
    if(this.error)throw this.error;
    await this.pump(onProgress);if(this.error)throw this.error;
    const frames=Math.max(0,Math.floor((this.length-400)/320)+1);
    return this.logp.subarray(0,frames*this.width);
  }
}
