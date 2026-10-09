'use client';
import {useEffect,useState} from 'react';
import {BookOpen,Clock,LockKeyhole} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {memberRequest} from './member-api';
import Reader from './reader';
import './paid-library.css';

export function remainingTime(milliseconds:number){
 const total=Math.max(0,Math.ceil(milliseconds/1000));
 const days=Math.floor(total/86400),hours=Math.floor(total%86400/3600),minutes=Math.floor(total%3600/60),seconds=total%60;
 return (days?days+' j · ':'')+[hours,minutes,seconds].map(v=>String(v).padStart(2,'0')).join(':');
}
export function PaidLibraryStatus({access,serverTime}:{access:any;serverTime:number}){
 if(!access)return null;
 const ready=serverTime>=access.nextArticleAt,last=access.nextArticleAt>=access.endsAt;
 return <section className="paid-library-status" aria-label="Votre accès à la bibliothèque"><div className="paid-library-intro"><span className="eyebrow">VOTRE BIBLIOTHÈQUE COMMUNE</span><h2>Un article, une journée pour progresser.</h2><p>Choisissez votre lecture parmi tous les articles. Retravaillez-la à votre rythme ; vous pourrez choisir un nouvel article 24 heures après votre dernier choix.</p></div><div className="library-timers"><div><Clock size={20}/><span>Fin de votre abonnement</span><strong>{remainingTime(access.endsAt-serverTime)}</strong><small>{new Date(access.endsAt).toLocaleString('fr-FR')}</small></div><div className={ready?'ready':''}>{ready?<BookOpen size={20}/>:<LockKeyhole size={20}/>}<span>{ready?'Votre prochaine lecture':last?'Votre dernière lecture':'Nouvel article dans'}</span><strong>{ready?'À vous de choisir':last?'À retravailler':remainingTime(access.nextArticleAt-serverTime)}</strong><small>{ready?'1 nouvel article toutes les 24 h':last?'Disponible jusqu’à la fin de votre pack':'Votre article actuel reste disponible.'}</small></div></div></section>;
}
export function PaidArticleReader({articleId,account,save,refresh,back,go}:any){
 const [article,setArticle]=useState<any>(null),[error,setError]=useState(''),[retry,setRetry]=useState(0);
 useEffect(()=>{let active=true;setArticle(null);setError('');memberRequest('/articles/open',{articleId}).then(async data=>{if(active){setArticle(data.article);await refresh()}}).catch(e=>{if(active)setError(e.message);refresh().catch(()=>{})});return()=>{active=false}},[articleId,refresh,retry]);
 if(error)return <section className="card access-gate"><LockKeyhole/><h2>Votre lecture du jour</h2><p role="status">{error}</p><div className="actions"><Button className="btn" onClick={back}>Retour à la bibliothèque</Button><Button className="btn secondary" onClick={()=>setRetry(v=>v+1)}>Réessayer</Button></div></section>;
 if(!article)return <p className="account-loading" role="status">Ouverture de votre article…</p>;
 return <Reader key={articleId} articleId={articleId} account={{...account,articles:[article]}} save={save} refresh={refresh} back={back} go={go}/>;
}
