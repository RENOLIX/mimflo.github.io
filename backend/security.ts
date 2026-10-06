const encoder=new TextEncoder();
export const b64=(b:ArrayBuffer)=>btoa(String.fromCharCode(...new Uint8Array(b)));
export async function digest(value:string){return b64(await crypto.subtle.digest('SHA-256',encoder.encode(value)));}
export function emailKey(value:string){const email=value.trim().toLowerCase();const [local,domain]=email.split('@');return domain==='gmail.com'||domain==='googlemail.com'?local.split('+')[0].replaceAll('.','')+'@gmail.com':email;}
export async function hashPassword(password:string,salt=b64(crypto.getRandomValues(new Uint8Array(16)).buffer)){const key=await crypto.subtle.importKey('raw',encoder.encode(password),'PBKDF2',false,['deriveBits']);const hash=await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt:encoder.encode(salt),iterations:100000},key,256);return `pbkdf2:100000:${salt}:${b64(hash)}`;}
export async function checkPassword(password:string,stored:string){const parts=stored.split(':');if(parts.length!==4)return false;const actual=await hashPassword(password,parts[2]);if(actual.length!==stored.length)return false;let diff=0;for(let i=0;i<actual.length;i++)diff|=actual.charCodeAt(i)^stored.charCodeAt(i);return diff===0;}
