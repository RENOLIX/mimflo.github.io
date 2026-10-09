export const memberApi=process.env.NEXT_PUBLIC_MEMBER_API||'';
const tokenKey='mimflo-member-token';
export function setMemberToken(token:string){sessionStorage.setItem(tokenKey,token);}
export function clearMemberToken(){sessionStorage.removeItem(tokenKey);}
export async function memberRequest(path:string,body?:any){
 if(!memberApi)throw new Error('La connexion est en cours de configuration. Réessayez bientôt.');
 const token=sessionStorage.getItem(tokenKey),controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),20000);
 try{const r=await fetch(memberApi+path,{method:body?'POST':'GET',headers:{...(body?{'Content-Type':'application/json'}:{}),...(token?{Authorization:'Bearer '+token}:{})},body:body?JSON.stringify(body):undefined,cache:'no-store',signal:controller.signal});
 const data:any=await r.json();if(!r.ok){if(r.status===401)clearMemberToken();throw new Error(data.error||'Le service est indisponible.');}return data;
 }catch(e:any){if(controller.signal.aborted)throw new Error('Le serveur ne répond pas. Vérifiez votre connexion et réessayez.');throw e;}finally{clearTimeout(timeout);}
}
export async function memberAudioRequest(id:string,articleId:string,audio:Uint8Array,passageIndex:number){
 if(!memberApi)throw new Error('L’analyse IA est en cours de configuration.');
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),300000);
 try{const r=await fetch(memberApi+'/analysis?'+new URLSearchParams({id,articleId,consent:'true',passageIndex:String(passageIndex)}),{method:'POST',headers:{'Content-Type':'audio/wav',Authorization:'Bearer '+sessionStorage.getItem(tokenKey)},body:audio as BodyInit,signal:controller.signal});const data:any=await r.json();if(!r.ok)throw new Error(data.error||'L’analyse n’est pas disponible.');return data;}catch(e){if(controller.signal.aborted)throw new Error('L’analyse prend plus de temps que prévu. Réessayez pour récupérer son résultat sans relancer le calcul.');throw e;}finally{clearTimeout(timer)}
}
export async function memberPlacementAudioRequest(id:string,audio:Uint8Array){
 if(!memberApi)throw new Error('Le test de niveau est indisponible.');
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),300000);
 try{const r=await fetch(memberApi+'/placement/audio?'+new URLSearchParams({id,consent:'true'}),{method:'POST',headers:{'Content-Type':'audio/wav',Authorization:'Bearer '+sessionStorage.getItem(tokenKey)},body:audio as BodyInit,signal:controller.signal});const data:any=await r.json();if(!r.ok){if(r.status===401)clearMemberToken();throw new Error(data.error||'Le test de niveau est indisponible.');}return data;}catch(e){if(controller.signal.aborted)throw new Error('L’évaluation prend plus de temps que prévu. Réessayez pour récupérer son résultat.');throw e;}finally{clearTimeout(timer)}
}
