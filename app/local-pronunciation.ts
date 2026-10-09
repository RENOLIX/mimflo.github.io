type LocalResult={transcript:string;analysis:any};
let worker:Worker|null=null,idle:ReturnType<typeof setTimeout>|undefined;
let rejectActive:(()=>void)|null=null;
const results=new Map<string,LocalResult>();
function releaseLater(){clearTimeout(idle);idle=setTimeout(()=>{if(!rejectActive){worker?.terminate();worker=null}},10*60000)}
function getWorker(){clearTimeout(idle);return worker||(worker=new Worker('/phonetics/worker.mjs?v=8',{type:'module'}))}
// Closing a finished report keeps the engine available for the next reading.
// Cancellation still stops an active calculation immediately.
export function cancelLocalPronunciation(){if(!rejectActive){if(worker)releaseLater();return;}const reject=rejectActive;rejectActive=null;worker?.terminate();worker=null;clearTimeout(idle);reject();}
export function prepareLocalPronunciation(){
 if(!window.Worker||!window.WebAssembly)return;
 try{getWorker().postMessage({type:'prepare',id:'prepare'});releaseLater()}catch{/* Preparation is optional; analysis reports actionable errors. */}
}
export async function localPronunciation(wav:Uint8Array,reference:string,_seconds:number,onProgress?:(message:string)=>void,partial=false):Promise<LocalResult>{
 if(!window.Worker||!window.WebAssembly)throw new Error('L’analyse nécessite un navigateur récent.');
 const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',wav as BufferSource))).map(byte=>byte.toString(16).padStart(2,'0')).join('');
 const key=hash+':'+partial+':'+reference,cached=results.get(key);if(cached)return cached;
 if(rejectActive)throw new Error('Une analyse est déjà en cours.');
 const active=getWorker(),id=crypto.randomUUID();
 return new Promise((resolve,reject)=>{
  function cleanup(){active.removeEventListener('message',message);active.removeEventListener('error',error);if(rejectActive===cancel)rejectActive=null;releaseLater()}
  function cancel(){cleanup();reject(new Error('Analyse annulée. Votre enregistrement reste disponible.'))}
  function message(e:MessageEvent){if(e.data.id!==id)return;if(e.data.type==='progress')onProgress?.(e.data.message);else if(e.data.type==='result'){cleanup();results.set(key,e.data.result);while(results.size>3)results.delete(results.keys().next().value!);resolve(e.data.result)}else if(e.data.type==='error'){cleanup();reject(new Error(e.data.message))}}
  function error(){cleanup();active.terminate();if(worker===active)worker=null;reject(new Error('L’analyse n’a pas démarré. Vérifiez votre connexion puis réessayez.'))}
  active.addEventListener('message',message);active.addEventListener('error',error);rejectActive=cancel;
  const buffer=wav.slice().buffer;try{active.postMessage({type:'analyse',id,wav:buffer,reference,partial},[buffer])}catch{error()}
 });
}
