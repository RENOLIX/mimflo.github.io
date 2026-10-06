type GoogleClaims={sub:string;email:string;email_verified:boolean;given_name?:string;family_name?:string;name?:string;hd?:string;nonce:string;aud:string;iss:string;exp:number;iat:number};
let cachedKeys:JsonWebKey[]=[];
let keysExpire=0;
function bytes(value:string){if(!/^[A-Za-z0-9_-]+$/.test(value))throw new Error('Token invalide');return Uint8Array.from(atob(value.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0));}
function parse(value:string){return JSON.parse(new TextDecoder().decode(bytes(value)));}
export async function verifyGoogleToken(token:string,clientId:string,nonce:string):Promise<GoogleClaims>{
 if(token.length>12000)throw new Error('Token invalide');
 const parts=token.split('.');if(parts.length!==3)throw new Error('Token invalide');
 const header=parse(parts[0]);if(header.alg!=='RS256'||typeof header.kid!=='string')throw new Error('Signature invalide');
 if(Date.now()>keysExpire){const response=await fetch('https://www.googleapis.com/oauth2/v3/certs',{signal:AbortSignal.timeout(10000)});if(!response.ok)throw new Error('Google indisponible');const data=await response.json() as {keys:JsonWebKey[]};cachedKeys=data.keys;keysExpire=Date.now()+300000;}
 const jwk=cachedKeys.find(key=>(key as JsonWebKey&{kid?:string}).kid===header.kid);if(!jwk)throw new Error('Clé inconnue');
 const key=await crypto.subtle.importKey('jwk',jwk,{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['verify']);
 if(!await crypto.subtle.verify('RSASSA-PKCS1-v1_5',key,bytes(parts[2]),new TextEncoder().encode(parts[0]+'.'+parts[1])))throw new Error('Signature invalide');
 const claims=parse(parts[1]) as GoogleClaims,time=Math.floor(Date.now()/1000);
 if(claims.aud!==clientId||!['accounts.google.com','https://accounts.google.com'].includes(claims.iss)||!Number.isFinite(claims.exp)||claims.exp<=time||!Number.isFinite(claims.iat)||claims.iat>time+60||typeof claims.sub!=='string'||!claims.sub||claims.sub.length>255||claims.nonce!==nonce||claims.email_verified!==true||typeof claims.email!=='string'||claims.email.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(claims.email))throw new Error('Identité Google invalide');
 return claims;
}
