import {countryCodes} from '../app/countries';
export function validateProfileDetails(input:any,current:any={}){
 const country=input.country===undefined?(current.country||''):input.country;
 if(typeof country!=='string'||(country&&!countryCodes.includes(country)))throw Error('Choisissez un pays valide.');
 const avatar=input.avatar===undefined?(current.avatar||'initials'):input.avatar;
 if(typeof avatar!=='string'||avatar.length>80000)throw Error('La photo de profil est trop volumineuse.');
 if(!['initials','mascot','sun','flower','book'].includes(avatar)){
  const match=avatar.match(/^data:image\/(webp|png|jpeg);base64,([A-Za-z0-9+/=]+)$/);
  if(!match)throw Error('Choisissez une photo JPEG, PNG ou WebP.');
  let bytes:string;try{bytes=atob(match[2])}catch{throw Error('Photo invalide.')}
  const valid=match[1]==='webp'?bytes.startsWith('RIFF')&&bytes.slice(8,12)==='WEBP':match[1]==='png'?bytes.startsWith('\x89PNG\r\n\x1a\n'):bytes.startsWith('\xff\xd8\xff');
  if(!valid)throw Error('Le format de la photo est invalide.');
 }
 return {country,avatar};
}
