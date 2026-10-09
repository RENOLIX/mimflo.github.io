import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {DatabaseSync} from 'node:sqlite';
import {build} from 'esbuild';

await fs.mkdir('.qa',{recursive:true});
await build({entryPoints:['backend/index.ts'],bundle:true,platform:'node',format:'esm',external:['cloudflare:sockets'],outfile:'.qa/library-api.mjs'});
const {default:api}=await import('../.qa/library-api.mjs?'+Date.now());
const sqlite=new DatabaseSync(':memory:');
class Statement{
 constructor(sql,values=[]){this.sql=sql;this.values=values}
 bind(...values){return new Statement(this.sql,values)}
 async all(){return {results:sqlite.prepare(this.sql).all(...this.values)}}
 async first(){return sqlite.prepare(this.sql).get(...this.values)||null}
 async run(){const r=sqlite.prepare(this.sql).run(...this.values);return {meta:{changes:Number(r.changes)}}}
}
const DB={prepare:sql=>new Statement(sql),batch:async statements=>{sqlite.exec('BEGIN');try{const results=[];for(const statement of statements)results.push(await statement.run());sqlite.exec('COMMIT');return results}catch(error){sqlite.exec('ROLLBACK');throw error}}};
const env={DB,ALLOWED_ORIGIN:'https://mimflo.test',DEV_MODE:'local',IP_PEPPER:'local-verification-only'};
const DAY=86400000,start=Date.parse('2026-10-09T10:00:00Z'),realNow=Date.now;
let clock=start;Date.now=()=>clock;
const hash=async value=>Buffer.from(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))).toString('base64');
const checks=[];
try{
 const migrations=(await fs.readdir('backend/migrations')).sort();
 for(const name of migrations.filter(n=>n<'0006'))sqlite.exec(await fs.readFile('backend/migrations/'+name,'utf8'));
 for(const [id,pack] of [['one','sprint'],['two','intensif'],['three','performance'],['trial','trial']]){
  sqlite.prepare('INSERT INTO articles(id,title,category,level,minutes,intro,paragraphs,published,updated_at) VALUES (?,?,?,?,?,?,?,?,?)').run(id,'Lecture '+id,'Société','B1',1,'Introduction',JSON.stringify(['Bonjour tout le monde. Nous apprenons ensemble.']),1,start);
  sqlite.prepare('INSERT INTO article_packs VALUES (?,?)').run(id,pack);
 }
 sqlite.exec(await fs.readFile('backend/migrations/0006_general_library.sql','utf8'));
 assert.equal(sqlite.prepare("SELECT count(*) n FROM article_packs WHERE article_id='one'").get().n,3);
 checks.push('Existing paid articles are shared; trial links are preserved');
 async function client(label,plan){
  const uid='client-'+label,token='test-token-'+label;
  sqlite.prepare('INSERT INTO users(id,email,email_key,password_hash,first_name,last_name,email_verified,created_at) VALUES (?,?,?,?,?,?,1,?)').run(uid,label+'@example.invalid',label+'@example.invalid','pbkdf2:test','Client',label,start);
  sqlite.prepare('INSERT INTO auth_sessions VALUES (?,?,?)').run(await hash(token),uid,start+40*DAY);
  if(plan)sqlite.prepare('INSERT INTO entitlements VALUES (?,?,NULL,?,?,?,0,?)').run('pack-'+label,uid,plan,start,start+{sprint:5,intensif:10,performance:15}[plan]*DAY,'test-owner');
  return {uid,token};
 }
 async function req(client,path,body){
  const response=await api.fetch(new Request('https://mimflo.test'+path,{method:body?'POST':'GET',headers:{Origin:env.ALLOWED_ORIGIN,...(client?{Authorization:'Bearer '+client.token}:{}),...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined}),env);
  return {status:response.status,data:await response.json()};
 }
 const sprint=await client('sprint','sprint'),intensif=await client('intensif','intensif'),performance=await client('performance','performance'),free=await client('trial'),none=await client('none');
 for(const user of [sprint,intensif,performance]){
  const response=await req(user,'/account');assert.equal(response.status,200);assert.deepEqual(response.data.articles.map(a=>a.id).sort(),['one','three','two']);
  assert.ok(response.data.articles.every(a=>!('paragraphs' in a)&&!('words' in a)&&!('images' in a)),'Locked article bodies must never leave the server');
 }
 assert.equal((await req(null,'/articles/open',{articleId:'one'})).status,401);
 assert.equal((await req(none,'/articles/open',{articleId:'one'})).status,403);
 checks.push('All three packs receive the same metadata-only catalogue; no access without a pack');
 const race=await Promise.all([req(sprint,'/articles/open',{articleId:'one'}),req(sprint,'/articles/open',{articleId:'two'})]);
 assert.deepEqual(race.map(r=>r.status).sort(),[200,429]);
 const chosen=race.find(r=>r.status===200).data.article.id,other=chosen==='one'?'two':'one';
 const selectedAt=sqlite.prepare('SELECT selected_at FROM paid_article_access WHERE user_id=?').get(sprint.uid).selected_at;
 assert.equal((await req(sprint,'/articles/open',{articleId:chosen})).status,200);
 assert.equal(sqlite.prepare('SELECT selected_at FROM paid_article_access WHERE user_id=?').get(sprint.uid).selected_at,selectedAt,'Reopening must not reset the countdown');
 assert.equal((await req(sprint,'/account',{action:'session',articleId:other,seconds:5})).status,403);
 assert.equal((await req(sprint,'/analysis/local',{id:crypto.randomUUID(),articleId:other,consent:true,passageIndex:0,seconds:5})).status,403);
 assert.equal((await req(sprint,'/articles/open',{articleId:'trial'})).status,404);
 clock=start+DAY-1;assert.equal((await req(sprint,'/articles/open',{articleId:other})).status,429);
 clock=start+DAY;assert.equal((await req(sprint,'/articles/open',{articleId:other})).status,200);
 assert.equal((await req(sprint,'/articles/open',{articleId:chosen})).status,429);
 checks.push('Concurrent choices cannot bypass the 24-hour gate; reopening keeps the deadline; exact 24h boundary unlocks');
 clock=start;const activated=await req(free,'/account',{action:'trial'});assert.equal(activated.status,200);
 assert.deepEqual((await req(free,'/account')).data.articles.map(a=>a.id),['trial']);
 assert.equal((await req(free,'/articles/open',{articleId:'trial'})).status,200);
 assert.equal((await req(free,'/articles/open',{articleId:'one'})).status,403);
 assert.equal((await req(free,'/account',{action:'session',articleId:'trial',seconds:5})).status,200);
 assert.equal((await req(free,'/account',{action:'session',articleId:'trial',seconds:5})).status,409);
 assert.equal(sqlite.prepare('SELECT count(*) n FROM paid_article_access WHERE user_id=?').get(free.uid).n,0);
 clock=start+48*3600000;assert.equal((await req(free,'/articles/open',{articleId:'trial'})).status,403);
 checks.push('Free trial keeps its own article, 48-hour expiry and single session, with no daily gate');
 for(const [user,days] of [[sprint,5],[intensif,10],[performance,15]]){
  clock=start+days*DAY-1;assert.equal((await req(user,'/articles/open',{articleId:'three'})).status,200);
  clock=start+days*DAY;
  const expired=(await req(user,'/account')).data;assert.equal(expired.accessType,'none');assert.equal(expired.articles.length,0);
  assert.equal((await req(user,'/articles/open',{articleId:'three'})).status,403);
  assert.equal((await req(user,'/account',{action:'session',articleId:'three',seconds:5})).status,403);
  assert.equal((await req(user,'/analysis/status')).data.allowed,false);
  assert.equal((await req(user,'/analysis/local',{id:crypto.randomUUID(),articleId:'three',consent:true,passageIndex:0,seconds:5})).status,403);
 }
 checks.push('All packs expire at exactly 5/10/15 × 24h; article, session and analysis requests are then denied');
 const revoked=await client('revoked','sprint');sqlite.prepare('UPDATE entitlements SET revoked=1 WHERE user_id=?').run(revoked.uid);clock=start;
 assert.equal((await req(revoked,'/articles/open',{articleId:'one'})).status,403);
 const importFile='.qa/import-volumes.sql';
 try{
  const sql=await fs.readFile(importFile,'utf8');sqlite.exec(sql);sqlite.exec(sql);
  const imported=sqlite.prepare("SELECT * FROM articles WHERE id LIKE 'volume-%'").all();assert.equal(imported.length,20);
  assert.ok(imported.every(a=>JSON.parse(a.paragraphs).length===38&&a.level==='B2/C1'&&!a.paragraphs.includes('�')));
  assert.equal(sqlite.prepare("SELECT count(*) n FROM article_packs WHERE article_id LIKE 'volume-%' AND pack='trial'").get().n,0);
  assert.equal(sqlite.prepare("SELECT count(*) n FROM article_packs WHERE article_id LIKE 'volume-%'").get().n,60);
  checks.push('20 imported articles retain all 38 paragraphs and French accents; retry is idempotent; trial remains untouched');
 }catch(error){if(error.code!=='ENOENT')throw error}
 await fs.writeFile('.qa/library-verification.json',JSON.stringify({ok:true,checks},null,2));
 console.log('PASS\n'+checks.map(c=>'✓ '+c).join('\n'));
}finally{Date.now=realNow;sqlite.close()}
