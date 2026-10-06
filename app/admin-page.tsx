'use client';
import {useEffect,useState} from 'react';
import {ShieldCheck,LogOut} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import AdminConsole from './admin-console';
import {memberRequest,setMemberToken,clearMemberToken} from './member-api';
import {siteHref} from './admin-url';
import './members.css';
export default function AdminPage(){
 const [user,setUser]=useState<any>(null),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState(''),[email,setEmail]=useState(''),[password,setPassword]=useState('');
 async function refresh(){const account=await memberRequest('/account');setUser(account.user);}
 useEffect(()=>{refresh().catch(e=>setError(e.message)).finally(()=>setLoading(false));},[]);
 const authorized=['owner','admin'].includes(user?.role);
 async function logout(){setBusy(true);setError('');try{await memberRequest('/auth/logout',{});}catch(e:any){setError(e.message);}finally{clearMemberToken();setUser(null);setPassword('');setBusy(false);}}
 return <div className="admin-site"><header className="admin-header"><a className="admin-brand" href={siteHref} aria-label="MimFlo — retour au site"><img src="/assets/mimflo-logo-3d-transparent.png" alt="MimFlo"/></a><span className="admin-label"><ShieldCheck size={18}/> Administration</span><div className="admin-header-actions"><a href={siteHref}>Voir le site</a>{user&&<Button className="btn secondary" disabled={busy} onClick={logout}><LogOut size={16}/>Déconnexion</Button>}</div></header><main className="main admin-main">{loading?<p className="notice" role="status">Vérification de votre connexion…</p>:authorized?<AdminConsole role={user.role}/>:user?<section className="card admin-login"><ShieldCheck size={32}/><h1>Accès réservé</h1><p>Ce compte ne possède pas les droits d’administration. Connectez-vous avec un compte administrateur MimFlo.</p><Button className="btn" disabled={busy} onClick={logout}>Changer de compte</Button></section>:<section className="admin-login"><span className="eyebrow">ESPACE ADMINISTRATEUR</span><h1>Bienvenue dans votre administration.</h1><p className="muted">Connectez-vous pour gérer vos clients, leurs accès et les articles de vos abonnements.</p><form className="card form-stack" onSubmit={async e=>{e.preventDefault();setBusy(true);setError('');try{const result=await memberRequest('/auth/login',{email,password});setMemberToken(result.token);setPassword('');await refresh();}catch(e:any){setError(e.message);}finally{setBusy(false);}}}><h2>Connexion administrateur</h2><label className="field">E-mail<Input required type="email" maxLength={254} autoComplete="username" value={email} onChange={e=>setEmail(e.target.value)}/></label><label className="field">Mot de passe<Input required type="password" maxLength={128} autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)}/></label><Button className="btn" type="submit" disabled={busy}>{busy?'Connexion…':'Se connecter à l’administration'}</Button>{error&&<p className="notice" role="alert">{error}</p>}</form></section>}</main></div>;
}
