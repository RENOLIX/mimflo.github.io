type LocalResult={transcript:string;analysis:any};
let worker:Worker|null=null;
let rejectActive:(()=>void)|null=null;
export function cancelLocalPronunciation(){const reject=rejectActive;rejectActive=null;worker?.terminate();worker=null;reject?.();}
export function localPronunciation(wav:Uint8Array,reference:string,_seconds:number,onProgress?:(message:string)=>void,partial=false):Promise<LocalResult>{
 if(!window.Worker||!window.WebAssembly)return Promise.reject(new Error('L’analyse phonétique nécessite un navigateur récent avec WebAssembly.'));
 if(!worker)worker=new Worker('/phonetics/worker.mjs?v=7',{type:'module'});
 const active=worker,id=crypto.randomUUID();
 return new Promise((resolve,reject)=>{
  function cleanup(){active.removeEventListener('message',message);active.removeEventListener('error',error);rejectActive=null}
  function message(e:MessageEvent){if(e.data.id!==id)return;if(e.data.type==='progress')onProgress?.(e.data.message);else if(e.data.type==='result'){cleanup();resolve(e.data.result)}else if(e.data.type==='error'){cleanup();reject(new Error(e.data.message))}}
  function error(){cleanup();cancelLocalPronunciation();reject(new Error('Le moteur phonétique n’a pas démarré. Vérifiez votre connexion puis réessayez.'))}
  active.addEventListener('message',message);active.addEventListener('error',error);
  rejectActive=()=>{cleanup();reject(new Error('Analyse annulée. Votre enregistrement reste disponible.'))};
  const buffer=wav.slice().buffer;active.postMessage({type:'analyse',id,wav:buffer,reference,partial},[buffer]);
 });
}
