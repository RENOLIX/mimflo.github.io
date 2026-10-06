'use client';
import PasswordStrength from './password-strength';
import {validPassword,passwordRequirements} from './password-rules';
import {useState} from 'react';
import {memberRequest,clearMemberToken} from './member-api';
import {Button} from '@/components/ui/button';
export default function PasswordPanel(){
 const [current,setCurrent]=useState(''),[next,setNext]=useState(''),[confirmation,setConfirmation]=useState(''),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 return <form className="card form-stack" style={{marginTop:24,maxWidth:650}} onSubmit={async e=>{e.preventDefault();if(!validPassword(next)){setMessage(passwordRequirements);return;}if(next!==confirmation){setMessage('Les mots de passe ne correspondent pas.');return;}setBusy(true);try{await memberRequest('/auth/password',{currentPassword:current,newPassword:next});clearMemberToken();window.location.hash='inscription';window.location.reload();}catch(e:any){setMessage(e.message)}finally{setBusy(false)}}}><h2>Sécurité de mon compte</h2><p className="muted small">Après le changement, reconnectez-vous avec votre nouveau mot de passe.</p><label className="field">Mot de passe actuel<input type="password" required autoComplete="current-password" value={current} onChange={e=>setCurrent(e.target.value)}/></label><label className="field">Nouveau mot de passe<input type="password" required minLength={12} maxLength={128} autoComplete="new-password" value={next} onChange={e=>setNext(e.target.value)}/></label><PasswordStrength value={next}/><label className="field">Confirmer le nouveau mot de passe<input type="password" required minLength={12} maxLength={128} autoComplete="new-password" value={confirmation} onChange={e=>setConfirmation(e.target.value)}/></label><Button className="btn" disabled={busy}>Changer mon mot de passe</Button>{message&&<p className="notice" role="alert">{message}</p>}</form>;
}
