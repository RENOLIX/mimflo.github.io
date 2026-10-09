const DB_NAME='mimflo-recordings';
const STORE='audio';

function openDb():Promise<IDBDatabase>{
  return new Promise((resolve,reject)=>{
    if(typeof indexedDB==='undefined'){reject(new Error('Le stockage audio local n’est pas disponible.'));return;}
    const request=indexedDB.open(DB_NAME,2);
    request.onupgradeneeded=()=>{if(!request.result.objectStoreNames.contains(STORE))request.result.createObjectStore(STORE);if(!request.result.objectStoreNames.contains('attempts'))request.result.createObjectStore('attempts',{keyPath:'id'});};
    request.onsuccess=()=>resolve(request.result);
    request.onerror=()=>reject(request.error||new Error('Stockage audio indisponible.'));
  });
}
export async function saveRecording(id:string,blob:Blob){const db=await openDb();return new Promise<void>((resolve,reject)=>{const tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).put(blob,id);tx.oncomplete=()=>{db.close();resolve()};tx.onerror=()=>{db.close();reject(tx.error)}})}
export async function getRecording(id:string){const db=await openDb();return new Promise<Blob|null>((resolve,reject)=>{const tx=db.transaction(STORE,'readonly');const request=tx.objectStore(STORE).get(id);request.onsuccess=()=>{db.close();resolve(request.result||null)};request.onerror=()=>{db.close();reject(request.error)}})}
export async function deleteRecording(id:string){return removeAttempt(id);}

export type ReadingAttempt={id:string;userId:string;articleId:string;createdAt:number;seconds:number;startWord:number;endWord:number|null;nextWord:number|null;transcript:string;saved:boolean;analysis?:any};
export async function storeAttempt(attempt:ReadingAttempt,blob?:Blob){const db=await openDb();return new Promise<void>((resolve,reject)=>{const tx=db.transaction(['attempts',STORE],'readwrite');tx.objectStore('attempts').put(attempt);if(blob)tx.objectStore(STORE).put(blob,attempt.id);tx.oncomplete=()=>{db.close();resolve()};tx.onerror=()=>{db.close();reject(tx.error)}})}
export async function listAttempts(userId:string,articleId:string){const db=await openDb();return new Promise<ReadingAttempt[]>((resolve,reject)=>{const tx=db.transaction('attempts','readonly'),request=tx.objectStore('attempts').getAll();request.onsuccess=()=>{db.close();resolve((request.result as ReadingAttempt[]).filter(a=>a.userId===userId&&a.articleId===articleId).sort((a,b)=>b.createdAt-a.createdAt))};request.onerror=()=>{db.close();reject(request.error)}})}
export async function removeAttempt(id:string){const db=await openDb();return new Promise<void>((resolve,reject)=>{const tx=db.transaction(['attempts',STORE],'readwrite');tx.objectStore('attempts').delete(id);tx.objectStore(STORE).delete(id);tx.oncomplete=()=>{db.close();resolve()};tx.onerror=()=>{db.close();reject(tx.error)}})}
