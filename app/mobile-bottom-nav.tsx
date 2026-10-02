'use client';
import {Home,BookOpen,Target,BarChart3,User} from 'lucide-react';

const items=[
 {view:'accueil',label:'Accueil',Icon:Home},
 {view:'bibliotheque',label:'Articles',Icon:BookOpen},
 {view:'parcours',label:'Parcours',Icon:Target},
 {view:'progression',label:'Progrès',Icon:BarChart3},
 {view:'profil',label:'Mon espace',Icon:User},
];
export default function MobileBottomNav({view,go}:{view:string;go:(view:string)=>void}){
 const active=view==='article'?'bibliotheque':['profil','inscription','notes'].includes(view)?'profil':view;
 return <nav className="mobile-bottom-nav" aria-label="Navigation mobile">{items.map(({view:destination,label,Icon})=><button key={destination} type="button" onClick={()=>go(destination)} aria-current={active===destination?'page':undefined}><span><Icon aria-hidden="true"/></span>{label}</button>)}</nav>;
}
