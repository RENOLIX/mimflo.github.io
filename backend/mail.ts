export type SmtpEnv={SMTP_HOST?:string;SMTP_USER?:string;SMTP_PASSWORD?:string;MAIL_FROM?:string;RESEND_API_KEY?:string};
export const mailConfigured=(env:SmtpEnv)=>!!env.MAIL_FROM&&(!!env.RESEND_API_KEY||!!env.SMTP_HOST&&!!env.SMTP_USER&&!!env.SMTP_PASSWORD);
type Mail={to:string;subject:string;text:string};
type MailSocket={readable:ReadableStream<Uint8Array>;writable:WritableStream<Uint8Array>;opened:Promise<unknown>;close:()=>Promise<unknown>};
type Connect=(address:{hostname:string;port:number},options:{secureTransport:'on'})=>MailSocket;
const encoded=(text:string)=>btoa(String.fromCharCode(...new TextEncoder().encode(text)));
export async function sendSmtp(connect:Connect,env:SmtpEnv,mail:Mail){
 const mailbox=(v:string|undefined)=>!!v&&/^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/.test(v)&&!/[\r\n]/.test(v);
 if(!mailbox(mail.to)||!mailbox(env.MAIL_FROM)||!mailbox(env.SMTP_USER)||!env.SMTP_HOST||!/^[a-z0-9.-]+$/i.test(env.SMTP_HOST)||!env.SMTP_PASSWORD||/[\r\n]/.test(mail.subject))throw new Error('Configuration SMTP invalide.');
 const socket=connect({hostname:env.SMTP_HOST,port:465},{secureTransport:'on'}),reader=socket.readable.getReader(),writer=socket.writable.getWriter();let buffer='';
 async function reply(expected:number[]){let count=0;while(true){while(!buffer.includes('\r\n')){const chunk=await reader.read();if(chunk.done)throw new Error('Connexion SMTP interrompue.');buffer+=new TextDecoder().decode(chunk.value);if(buffer.length>16384)throw new Error('Réponse SMTP trop longue.');}const pos=buffer.indexOf('\r\n'),line=buffer.slice(0,pos);buffer=buffer.slice(pos+2);if(++count>100||!/^\d{3}[ -]/.test(line))throw new Error('Réponse SMTP invalide.');if(line[3]==='-')continue;const code=Number(line.slice(0,3));if(!expected.includes(code))throw new Error('Envoi SMTP refusé ('+code+').');return;}}
 async function command(value:string,codes:number[]){await writer.write(new TextEncoder().encode(value+'\r\n'));await reply(codes)}
 let timer:ReturnType<typeof setTimeout>|undefined;
 try{await Promise.race([(async()=>{await socket.opened;await reply([220]);await command('EHLO mimflo.com',[250]);await command('AUTH LOGIN',[334]);await command(encoded(env.SMTP_USER!),[334]);await command(encoded(env.SMTP_PASSWORD!),[235]);await command('MAIL FROM:<'+env.MAIL_FROM+'>',[250]);await command('RCPT TO:<'+mail.to+'>',[250,251]);await command('DATA',[354]);const body=encoded(mail.text).match(/.{1,76}/g)?.join('\r\n')||'';await command(['From: MimFlo <'+env.MAIL_FROM+'>','To: <'+mail.to+'>','Date: '+new Date().toUTCString(),'Message-ID: <'+crypto.randomUUID()+'@mimflo.com>','Subject: =?UTF-8?B?'+encoded(mail.subject)+'?=','MIME-Version: 1.0','Content-Type: text/plain; charset=UTF-8','Content-Transfer-Encoding: base64','',''+body,'.'].join('\r\n'),[250]);})(),new Promise<never>((_,reject)=>{timer=setTimeout(()=>{void socket.close().catch(()=>{});reject(new Error('Le serveur SMTP ne répond pas.'));},15000)})]);}
 finally{if(timer)clearTimeout(timer);reader.releaseLock();writer.releaseLock();await socket.close().catch(()=>{});}
}
export async function sendMail(env:SmtpEnv,mail:Mail){
 if(env.SMTP_HOST&&env.SMTP_USER&&env.SMTP_PASSWORD){const {connect}=await import('cloudflare:sockets');await sendSmtp(connect as unknown as Connect,env,mail);return;}
 if(!env.RESEND_API_KEY||!env.MAIL_FROM)throw new Error('Envoi des e-mails non configuré.');
 const result=await fetch('https://api.resend.com/emails',{method:'POST',signal:AbortSignal.timeout(10000),headers:{Authorization:'Bearer '+env.RESEND_API_KEY,'Content-Type':'application/json'},body:JSON.stringify({from:env.MAIL_FROM,...mail})});if(!result.ok)throw new Error('Envoi des e-mails indisponible.');
}

