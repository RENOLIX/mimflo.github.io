'use client';
import {Check,Minus} from 'lucide-react';
import {passwordRules} from './password-rules';
export default function PasswordStrength({value}:{value:string}){
 const rules=passwordRules.map(rule=>({...rule,met:rule.test(value)})),score=rules.filter(rule=>rule.met).length;
 const tone=!value?'empty':score<=2?'weak':score<5?'medium':'strong';
 const label=!value?'À compléter':score<=2?'Faible':score<5?'À renforcer':'Règles respectées';
 return <div className={'password-strength '+tone}><div className="password-strength-title"><span>Solidité du mot de passe</span><strong aria-live="polite">{label}</strong></div><div className="password-meter" role="progressbar" aria-label="Règles du mot de passe respectées" aria-valuemin={0} aria-valuemax={5} aria-valuenow={score} aria-valuetext={`${score} règles sur 5`}><span style={{width:`${value?score*20:0}%`}}/></div><ul className="password-rules">{rules.map(rule=><li className={rule.met?'met':''} key={rule.label}>{rule.met?<Check size={14}/>:<Minus size={14}/>}<span>{rule.label}</span><span className="sr-only">{rule.met?' : respectée':' : à compléter'}</span></li>)}</ul></div>;
}
