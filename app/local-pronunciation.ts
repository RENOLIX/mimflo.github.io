export type AnalysisProgress={percent:number;phase:'preparing'|'analysing'|'finishing'|'saving'|'done';remainingSeconds?:number|null};
type LocalResult={transcript:string;analysis:any};
let worker:Worker|null=null,idle:ReturnType<typeof setTimeout>|undefined;
let rejectActive:(()=>void)|null=null,generation=0;
const results=new Map<string,LocalResult>();
export const ANALYSIS_STALL_MS=120000;
export const ANALYSIS_MAX_MS=600000;
function releaseLater(){clearTimeout(idle);idle=setTimeout(()=>{if(!rejectActive){worker?.terminate();worker=null}},10*60000)}
function getWorker(){clearTimeout(idle);return worker||(worker=new Worker('/phonetics/worker.mjs?v=11',{type:'module'}))}
export function cancelLocalPronunciation(){generation++;if(!rejectActive){if(worker)releaseLater();return;}const reject=rejectActive;rejectActive=null;worker?.terminate();worker=null;clearTimeout(idle);reject();}
export function prepareLocalPronunciation(){
 if(!window.Worker||!window.WebAssembly)return;
 try{getWorker().postMessage({type:'prepare',id:'prepare'});releaseLater()}catch{/* Analysis reports preparation failures. */}
}
export async function localPronunciation(wav:Uint8Array,reference:string,_seconds:number,onProgress?:(progress:AnalysisProgress)=>void,partial=false,options:{wordPractice?:boolean}={}):Promise<LocalResult>{
 if(!window.Worker||!window.WebAssembly)throw new Error('L’analyse nécessite un navigateur récent.');
 const currentGeneration=generation;
 const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',wav as BufferSource))).map(byte=>byte.toString(16).padStart(2,'0')).join('');
 if(currentGeneration!==generation)throw new Error('Analyse annulée. Votre enregistrement reste disponible.');
 const key=hash+':'+partial+':'+!!options.wordPractice+':'+reference,cached=results.get(key);if(cached){onProgress?.({percent:97,phase:'finishing'});return cached;}
 if(rejectActive)throw new Error('Une analyse est déjà en cours.');
 const active=getWorker(),id=crypto.randomUUID();
 return new Promise((resolve,reject)=>{
  let highest=0,lastPhase='',stall:ReturnType<typeof setTimeout>,maximum:ReturnType<typeof setTimeout>;
  function cleanup(){clearTimeout(stall);clearTimeout(maximum);active.removeEventListener('message',message);active.removeEventListener('error',error);if(rejectActive===cancel)rejectActive=null;releaseLater()}
  function cancel(){cleanup();reject(new Error('Analyse annulée. Votre enregistrement reste disponible.'))}
  function timedOut(total=false){active.terminate();if(worker===active)worker=null;cleanup();reject(new Error((total?'Cette analyse prend trop de temps sur cet appareil.':'L’analyse n’avance plus sur cet appareil.')+' Votre enregistrement est conservé : vous pouvez réessayer sans le refaire.'))}
  function armStall(){clearTimeout(stall);stall=setTimeout(()=>timedOut(),ANALYSIS_STALL_MS)}
  function message(e:MessageEvent){
   if(e.data.id!==id)return;
   if(e.data.type==='progress'){
    const value=Number(e.data.percent),phase=e.data.phase;
    if(!Number.isFinite(value)||!['preparing','analysing','finishing'].includes(phase))return;
    const percent=Math.max(highest,Math.min(97,Math.max(0,value)));
    if(percent>highest||phase!==lastPhase)armStall();
    highest=percent;lastPhase=phase;
    const remaining=Number(e.data.remainingSeconds);
    onProgress?.({percent:Math.floor(percent),phase,remainingSeconds:e.data.remainingSeconds!=null&&Number.isFinite(remaining)&&remaining>0?remaining:null});
   }else if(e.data.type==='result'){cleanup();results.set(key,e.data.result);while(results.size>3)results.delete(results.keys().next().value!);onProgress?.({percent:97,phase:'finishing'});resolve(e.data.result)}
   else if(e.data.type==='error'){cleanup();reject(new Error(e.data.message))}
  }
  function error(){active.terminate();if(worker===active)worker=null;cleanup();reject(new Error('L’analyse n’a pas démarré. Vérifiez votre connexion puis réessayez. Votre enregistrement reste disponible.'))}
  active.addEventListener('message',message);active.addEventListener('error',error);rejectActive=cancel;
  armStall();maximum=setTimeout(()=>timedOut(true),ANALYSIS_MAX_MS);
  const buffer=wav.slice().buffer;try{active.postMessage({type:'analyse',id,wav:buffer,audioHash:hash,reference,partial,wordPractice:options.wordPractice===true},[buffer])}catch{error()}
 });
}
