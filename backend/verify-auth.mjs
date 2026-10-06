import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFile,mkdir,writeFile,readdir} from 'node:fs/promises';
import ts from 'typescript';
// Real SQLite constraints and real request handler; inference is a deterministic mock.
const output=new URL('../.qa/auth-tests/',import.meta.url);await mkdir(output,{recursive:true});
for(const [source,name] of [['backend/google-auth.ts','google-auth'],['app/password-rules.ts','password-rules'],['backend/security.ts','security'],['app/countries.ts','countries'],['app/reading-passages.ts','reading-passages'],['backend/reading-analysis.ts','reading-analysis'],['backend/index.ts','index']]){
 let code=ts.transpileModule(await readFile(source,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText;
 code=code.replaceAll("'./google-auth'","'./google-auth.mjs'").replaceAll("'../app/password-rules'","'./password-rules.mjs'").replaceAll("'./security'","'./security.mjs'").replaceAll("'../app/countries'","'./countries.mjs'").replaceAll("'../app/reading-passages'","'./reading-passages.mjs'").replaceAll("'./reading-analysis'","'./reading-analysis.mjs'");await writeFile(new URL(name+'.mjs',output),code);
}
const {default:worker}=await import(new URL('index.mjs',output));const {digest}=await import(new URL('security.mjs',output));const {readingAssessment}=await import(new URL('reading-analysis.mjs',output));
const sql=new DatabaseSync(':memory:');for(const file of (await readdir('backend/migrations')).filter(f=>f.endsWith('.sql')).sort())sql.exec(await readFile('backend/migrations/'+file,'utf8'));
function prepared(query,args=[]){return {query,args,bind(...params){return prepared(query,params)},async first(){return sql.prepare(query).get(...args)||null},async all(){return {results:sql.prepare(query).all(...args)}},async run(){const result=sql.prepare(query).run(...args);return {meta:{changes:Number(result.changes)}}}}}
const DB={prepare:prepared,async batch(items){sql.exec('BEGIN');try{const results=[];for(const item of items)results.push(await item.run());sql.exec('COMMIT');return results;}catch(e){sql.exec('ROLLBACK');throw e}}};

const {hashPassword}=await import(new URL('security.mjs',output));
const {validPassword}=await import(new URL('password-rules.mjs',output));
for(const weak of ['shortA1!','aaaaaaaaaaaa','Abcdefghijk1','ABCDEFGHI1!?','abcdefghij1!','Abcdefghij!?'])assert.equal(validPassword(weak),false);
assert.equal(validPassword('BonjourMonde42!'),true);assert.equal(validPassword('Écolefrançaise42!'),true);
const env={DB,ALLOWED_ORIGIN:'https://renolix.github.io',IP_PEPPER:'qa',DEV_MODE:'local'};
async function req(path,body,token,ip='127.0.0.1'){const r=await worker.fetch(new Request('https://qa.example'+path,{method:body?'POST':'GET',headers:{Origin:env.ALLOWED_ORIGIN,'Content-Type':'application/json','CF-Connecting-IP':ip,...(token?{Authorization:'Bearer '+token}:{})},...(body?{body:JSON.stringify(body)}:{})}),env);return {status:r.status,data:await r.json()};}
assert.equal((await req('/auth/register',{email:'weak@example.com',firstName:'QA',lastName:'Test',consent:true,password:'aaaaaaaaaaaa'})).status,400);
const classic=await req('/auth/register',{email:'classic@gmail.com',firstName:'QA',lastName:'Test',consent:true,password:'BonjourMonde42!'});assert.equal(classic.status,200);
assert.equal((await req('/auth/login',{email:'classic@gmail.com',password:'BonjourMonde42!'})).status,200);
assert.equal((await req('/auth/password',{currentPassword:'BonjourMonde42!',newPassword:'aaaaaaaaaaaa'},classic.data.token)).status,400);
assert.equal((await req('/auth/password',{currentPassword:'BonjourMonde42!',newPassword:'NouveauMot42!'},classic.data.token)).status,200);
assert.equal((await req('/account',undefined,classic.data.token)).data.user,null);
const ownerToken='owner-token';sql.prepare('INSERT INTO users(id,email,email_key,password_hash,first_name,last_name,created_at,role) VALUES (?,?,?,?,?,?,?,?)').run('owner','owner@example.com','owner@example.com',await hashPassword('BonjourMonde42!'),'Owner','QA',Date.now(),'owner');sql.prepare('INSERT INTO auth_sessions VALUES (?,?,?)').run(await digest(ownerToken),'owner',Date.now()+60000);
assert.equal((await req('/admin/action',{action:'createAccount',email:'admin@example.com',firstName:'Admin',lastName:'QA',password:'aaaaaaaaaaaa'},ownerToken)).status,400);
assert.equal((await req('/account',undefined,ownerToken)).data.emailDeliveryEnabled,false);
assert.equal((await req('/auth/google/config')).data.enabled,false);
assert.equal((await req('/auth/google/challenge',{mode:'login',proof:crypto.randomUUID()+crypto.randomUUID()})).status,503);
const clientId='12345-test.apps.googleusercontent.com';assert.equal((await req('/admin/action',{action:'google',clientId},ownerToken)).status,200);
assert.equal((await req('/auth/google/config')).data.clientId,clientId);
const pair=await crypto.subtle.generateKey({name:'RSASSA-PKCS1-v1_5',modulusLength:2048,publicExponent:new Uint8Array([1,0,1]),hash:'SHA-256'},true,['sign','verify']);const jwk=await crypto.subtle.exportKey('jwk',pair.publicKey);jwk.kid='qa';const realFetch=globalThis.fetch;globalThis.fetch=async url=>{assert.equal(url,'https://www.googleapis.com/oauth2/v3/certs');return Response.json({keys:[jwk]})};
const baseClaims={sub:'google-identity-1',email:'new@gmail.com',email_verified:true,iss:'https://accounts.google.com',aud:clientId,exp:Math.floor(Date.now()/1000)+3600,iat:Math.floor(Date.now()/1000),given_name:'Google',family_name:'QA'};
async function jwt(claims,header={alg:'RS256',kid:'qa'}){const h=Buffer.from(JSON.stringify(header)).toString('base64url'),p=Buffer.from(JSON.stringify(claims)).toString('base64url'),sig=await crypto.subtle.sign('RSASSA-PKCS1-v1_5',pair.privateKey,new TextEncoder().encode(h+'.'+p));return h+'.'+p+'.'+Buffer.from(sig).toString('base64url');}
async function challenge(mode='register',consent=true){const proof=crypto.randomUUID()+crypto.randomUUID();const result=await req('/auth/google/challenge',{mode,consent,proof,level:'A2'});assert.equal(result.status,200);return {...result.data,proof};}
async function auth(ch,changes={},proof=ch.proof){return req('/auth/google',{id:ch.id,proof,credential:await jwt({...baseClaims,nonce:ch.nonce,...changes})});}
assert.equal((await req('/auth/google/challenge',{mode:'register',consent:false,proof:crypto.randomUUID()+crypto.randomUUID()})).status,400);
const first=await challenge();assert.equal((await auth(first,{},'wrong-proof')).status,400);
for(const changed of [{aud:'evil-client'},{iss:'evil'},{exp:0},{nonce:'wrong'},{email_verified:false},{iat:Math.floor(Date.now()/1000)+1000}])assert.equal((await auth(first,changed)).status,401);
const forged=(await jwt({...baseClaims,nonce:first.nonce})).split('.');forged[1]=Buffer.from(JSON.stringify({...baseClaims,nonce:first.nonce,sub:'owner'})).toString('base64url');assert.equal((await req('/auth/google',{id:first.id,proof:first.proof,credential:forged.join('.')})).status,401);
const created=await auth(first);assert.equal(created.status,200);const profile=(await req('/account',undefined,created.data.token)).data;assert.equal(profile.user.role,'client');assert.equal(profile.user.emailVerified,true);assert.equal(profile.user.hasPassword,false);assert.equal(profile.profile.level,'A2');assert.equal('google_sub' in profile.profile,false);
assert.equal((await auth(first)).status,400,'One-time challenge cannot replay');
const again=await auth(await challenge('login'));assert.equal(again.status,200);assert.equal((await req('/account',undefined,again.data.token)).data.user.id,profile.user.id);
assert.equal((await auth(await challenge('login'),{sub:'new-unregistered',email:'other@gmail.com'})).status,409,'Login must not silently register');
assert.equal((await auth(await challenge(),{sub:'attacker',email:'cl.a.ssic+alias@gmail.com'})).status,409,'Canonical e-mail collision never links an existing account');
sql.prepare('INSERT INTO articles(id,title,category,level,minutes,intro,paragraphs,updated_at,published) VALUES (?,?,?,?,?,?,?,?,1)').run('trial-article','QA','Société','B1',2,'','["Bonjour"]',Date.now());sql.prepare('INSERT INTO article_packs VALUES (?,?)').run('trial-article','trial');
assert.equal((await req('/account',{action:'trial'},created.data.token)).status,200);
const other=await auth(await challenge(),{sub:'google-identity-2',email:'second@gmail.com'});assert.equal(other.status,200);assert.equal((await req('/account',{action:'trial'},other.data.token)).status,409,'Google cannot bypass IP trial uniqueness');
sql.prepare('UPDATE users SET disabled=1 WHERE id=?').run(profile.user.id);assert.equal((await auth(await challenge('login'))).status,403,'Disabled account cannot sign in');
globalThis.fetch=realFetch;
console.log('PASS: server password requirements, classic login, session revocation, owner-only Google configuration, RSA signatures, audience, issuer, expiry, nonce, proof, verified e-mail, explicit signup, replay, canonical collision, disabled accounts, role and IP trial protection. No external Google requests.');
