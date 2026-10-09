'use client';
import {useState,useEffect,useId,type ComponentProps} from 'react';
import {Eye,EyeOff} from 'lucide-react';
import {Input} from '@/components/ui/input';
import './password-input.css';
export default function PasswordInput(props:Omit<ComponentProps<typeof Input>,'type'>){
 const [visible,setVisible]=useState(false),generatedId=useId(),id=props.id||generatedId;
 useEffect(()=>setVisible(false),[props.autoComplete]);
 return <span className="password-input"><Input {...props} id={id} aria-label={props['aria-label']||'Mot de passe'} type={visible?'text':'password'} className={props.className}/><button type="button" className="password-visibility" aria-label={visible?'Masquer le mot de passe':'Afficher le mot de passe'} aria-pressed={visible} aria-controls={id} disabled={props.disabled} onMouseDown={event=>event.preventDefault()} onClick={()=>setVisible(current=>!current)}>{visible?<EyeOff size={19}/>:<Eye size={19}/>}</button></span>;
}
