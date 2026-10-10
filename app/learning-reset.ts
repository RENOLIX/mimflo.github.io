let pending:Promise<void>|null=null;
function clearDatabase(name:string){return new Promise<void>((resolve,reject)=>{
 const request=indexedDB.open(name);
 request.onerror=()=>reject(request.error);
 request.onsuccess=()=>{const db=request.result,names=Array.from(db.objectStoreNames);if(!names.length){db.close();resolve();return;}const tx=db.transaction(names,'readwrite');for(const name of names)tx.objectStore(name).clear();tx.oncomplete=()=>{db.close();resolve()};tx.onerror=()=>{db.close();reject(tx.error)};};
})}
export async function resetLearningStorage(value:number){
 const epoch=Number(value);if(!Number.isFinite(epoch)||epoch<=0||Number(localStorage.getItem('mimflo-learning-reset-at'))>=epoch)return;
 if(pending){await pending;return resetLearningStorage(value)}
 pending=(async()=>{
  await Promise.all([clearDatabase('mimflo-recordings'),clearDatabase('mimflo-vocabulary-practice')]);
  for(const key of Object.keys(localStorage))if(key.startsWith('mimflo-reading-cursor:'))localStorage.removeItem(key);
  localStorage.setItem('mimflo-learning-reset-at',String(epoch));
  window.dispatchEvent(new Event('mimflo-placement-updated'));
 })();
 try{await pending}finally{pending=null}
}
