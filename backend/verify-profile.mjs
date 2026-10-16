import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {DatabaseSync} from 'node:sqlite';
import {build} from 'esbuild';
import {pronunciationPracticeScore,phonePracticeScore} from '../public/phonetics/score.mjs';
await fs.mkdir('.qa',{recursive:true});
await build({entryPoints:['backend/index.ts'],bundle:true,platform:'node',format:'esm',external:['cloudflare:sockets'],outfile:'.qa/profile-api.mjs'});
const {default:api}=await import('../.qa/profile-api.mjs?'+Date.now());
const db=new DatabaseSync(':memory:');
for(const name of (await fs.readdir('backend/migrations')).filter(n=>n.endsWith('.sql')).sort())db.exec(await fs.readFile('backend/migrations/'+name,'utf8'));
function statement(sql,args=[]){return {bind:(...values)=>statement(sql,values),first:async()=>db.prepare(sql).get(...args)||null,all:async()=>({results:db.prepare(sql).all(...args)}),run:async()=>({meta:{changes:Number(db.prepare(sql).run(...args).changes)}})}}
const env={DB:{prepare:statement,batch:async list=>{db.exec('BEGIN');try{const result=[];for(const item of list)result.push(await item.run());db.exec('COMMIT');return result}catch(e){db.exec('ROLLBACK');throw e}}},ALLOWED_ORIGIN:'https://mimflo.test',DEV_MODE:'local',IP_PEPPER:'local-profile-test'};
const created=Date.now()-86400000;
for(const id of ['one','two']){db.prepare('INSERT INTO users(id,email,email_key,password_hash,first_name,last_name,created_at) VALUES (?,?,?,?,?,?,?)').run(id,id+'@example.invalid',id,'pbkdf2:test','Client',id,created);const hash=Buffer.from(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(id))).toString('base64');db.prepare('INSERT INTO auth_sessions VALUES (?,?,?)').run(hash,id,Date.now()+3600000)}
async function req(user,body){const response=await api.fetch(new Request('https://mimflo.test/account',{method:body?'POST':'GET',headers:{Origin:env.ALLOWED_ORIGIN,'Content-Type':'application/json',...(user?{Authorization:'Bearer '+user}:{})},body:body?JSON.stringify(body):undefined}),env);return {status:response.status,data:await response.json()}}
const form={action:'profile',firstName:'Imene',lastName:'Test',level:'B2',exam:'TCF',source:'',country:'DZ',avatar:'flower'};
assert.equal((await req(null,form)).status,401);
assert.equal((await req('one',form)).status,200);
const saved=await req('one');assert.equal(saved.status,200);assert.equal(saved.data.profile.country,'DZ');assert.equal(saved.data.profile.avatar,'flower');assert.equal(saved.data.profile.created_at,created);assert.equal(saved.data.user.email,'one@example.invalid');
assert.equal((await req('two')).data.profile.country,'');
assert.equal((await req('one',{...form,country:'XX'})).status,400);
assert.equal((await req('one',{...form,avatar:'data:image/svg+xml;base64,PHN2Zz4='})).status,400);
assert.equal((await req('one',{...form,avatar:'data:image/png;base64,YmFk'})).status,400);
assert.equal((await req('one',{...form,avatar:'x'.repeat(80001)})).status,400);
const legacy={...form};delete legacy.country;delete legacy.avatar;assert.equal((await req('one',legacy)).status,200);assert.equal((await req('one')).data.profile.avatar,'flower');
const phones=[...Array.from({length:7},()=>({expected:'a',heard:'a',status:'match',confidence:100})),...Array.from({length:3},()=>({expected:'a',heard:'',status:'missing',confidence:null}))];
const old=Math.round(phones.reduce((n,p)=>n+phonePracticeScore(p),0)/phones.length),gentle=pronunciationPracticeScore(phones);assert.equal(old,70);assert.ok(gentle>old&&gentle<100);assert.equal(pronunciationPracticeScore(phones.slice(7)),0);assert.equal(pronunciationPracticeScore(phones.slice(0,7)),100);assert.equal(pronunciationPracticeScore([{expected:'a',heard:'t',status:'different',confidence:0}]),0);
console.log(JSON.stringify({profile:'persistence, ownership, immutable identity, country and image validation passed',score:{old,gentle,unread:0,perfect:100}}));db.close();
