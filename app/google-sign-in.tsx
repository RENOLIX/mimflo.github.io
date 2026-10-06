'use client';
import {useEffect,useRef,useState} from 'react';
import {memberRequest,setMemberToken} from './member-api';
type GoogleApi={accounts:{id:{initialize:(options:any)=>void;renderButton:(element:HTMLElement,options:any)=>void;cancel:()=>void}}};
let loading:Promise<GoogleApi>|undefined;
function loadGoogle(){if(!loading)loading=new Promise<GoogleApi>((resolve,reject)=>{const existing=(window as any).google;if(existing)return resolve(existing);const script=document.createElement('script');script.src='https://accounts.google.com/gsi/client';script.async=true;script.onload=()=>resolve((window as any).google);script.onerror=()=>{loading=undefined;reject(new Error('Impossible de charger Google. Utilisez votre e-mail ou réessayez.'))};document.head.appendChild(script)});return loading;}
export default function GoogleSignIn({mode,consent=false,level='B1',onComplete}:{mode:'login'|'register';consent?:boolean;level?:string;onComplete:()=>Promise<void>}){
 const host=useRef<HTMLDivElement>(null),complete=useRef(onComplete);complete.current=onComplete;
 const [enabled,setEnabled]=useState<boolean|null>(null),[message,setMessage]=useState(''),[busy,setBusy]=useState(false),[retry,setRetry]=useState(0);
 useEffect(()=>{let active=true;setMessage('');setBusy(false);if(host.current)host.current.replaceChildren();
  (async()=>{try{const config=await memberRequest('/auth/google/config');if(!active)return;setEnabled(config.enabled);if(!config.enabled||mode==='register'&&!consent)return;
   const proof=crypto.randomUUID()+crypto.randomUUID(),challenge=await memberRequest('/auth/google/challenge',{mode,consent,level,proof}),google=await loadGoogle();if(!active||!host.current)return;
   google.accounts.id.initialize({client_id:config.clientId,nonce:challenge.nonce,auto_select:false,ux_mode:'popup',callback:async(response:{credential:string})=>{if(!active)return;setBusy(true);setMessage('');try{const result=await memberRequest('/auth/google',{id:challenge.id,proof,credential:response.credential});if(!active)return;setMemberToken(result.token);await complete.current();}catch(e:any){if(active)setMessage(e.message);}finally{if(active)setBusy(false)}}});
   google.accounts.id.renderButton(host.current,{type:'standard',theme:'outline',size:'large',text:mode==='register'?'signup_with':'signin_with',shape:'pill',locale:'fr',width:Math.min(350,host.current.clientWidth||300)});
  }catch(e:any){if(active)setMessage(e.message)}})();return()=>{active=false};
 },[mode,consent,level,retry]);
 if(enabled===false)return null;
 return <div className="google-auth"><div className="auth-divider"><span>ou avec Google</span></div>{mode==='register'&&!consent?<p className="muted small">Acceptez les conditions ci-dessus pour vous inscrire avec Google.</p>:<div ref={host} className="google-button" aria-label="Connexion avec Google" style={busy?{pointerEvents:'none',opacity:.6}:undefined}/>} {busy&&<p role="status" className="muted small">Connexion avec Google…</p>}{message&&<div className="notice"><p role="alert">{message}</p><button type="button" className="inline-link" onClick={()=>setRetry(n=>n+1)}>Réessayer Google</button></div>}</div>;
}
