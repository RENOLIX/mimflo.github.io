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
