const fs=require('fs'),path=require('path'),vm=require('vm'),ts=require('typescript'),assert=require('node:assert/strict'),{DatabaseSync}=require('node:sqlite');
let clock=Date.parse('2026-10-14T12:00:00Z');const DAY=86400000;
class TestDate extends Date {static now(){return clock;}}
const cache=new Map();
function load(file){file=path.resolve(file);if(cache.has(file))return cache.get(file);const exports={};cache.set(file,exports);const requireLocal=name=>{if(name==='cloudflare:sockets')return {connect(){throw Error('Unused SMTP')}};if(!name.startsWith('.'))return require(name);let p=path.resolve(path.dirname(file),name);if(!fs.existsSync(p))p+='.ts';return load(p)};vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,require:requireLocal,Date:TestDate,crypto:globalThis.crypto,TextEncoder,TextDecoder,Request,Response,Headers,Blob,URL,URLSearchParams,Uint8Array,ArrayBuffer,atob,btoa,console,setTimeout,clearTimeout});return exports;}
const sql=new DatabaseSync(':memory:');for(const file of fs.readdirSync('backend/migrations').filter(f=>f.endsWith('.sql')).sort())sql.exec(fs.readFileSync('backend/migrations/'+file,'utf8'));
function prepare(q,args=[]){return {bind(...a){return prepare(q,a)},async first(){return sql.prepare(q).get(...args)||null},async all(){return {results:sql.prepare(q).all(...args)}},async run(){return {meta:{changes:Number(sql.prepare(q).run(...args).changes)}}}}}
const DB={prepare,batch:async statements=>{sql.exec('BEGIN');try{const results=[];for(const statement of statements)results.push(await statement.run());sql.exec('COMMIT');return results}catch(e){sql.exec('ROLLBACK');throw e}}};
const env={DB,ALLOWED_ORIGIN:'https://mimflo.test',IP_PEPPER:'test-only',DEV_MODE:'local'},worker=load('backend/index.ts').default;
async function user(id,role='client'){
 const token='test-token-'+id;
 sql.prepare('INSERT INTO users(id,email,email_key,password_hash,first_name,last_name,created_at,email_verified,role) VALUES(?,?,?,?,?,?,?,1,?)').run(id,id+'@example.invalid',id,'unused','Test',id,clock,role);
 sql.prepare('INSERT INTO auth_sessions VALUES(?,?,?)').run(await load('backend/security.ts').digest(token),id,clock+40*DAY);return token;
}
async function request(token,url,body){const response=await worker.fetch(new Request('https://mimflo.test'+url,{method:body?'POST':'GET',headers:{Origin:env.ALLOWED_ORIGIN,Authorization:'Bearer '+token,...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})}),env);return {status:response.status,data:await response.json()};}
(async()=>{
 const starts=clock,owner=await user('owner','owner');
 const expected={sprint:7,intensif:15,performance:20};
 for(const [plan,days] of Object.entries(expected)){
  clock=starts;const token=await user(plan),id='order-'+plan;
  sql.prepare('INSERT INTO requests(id,user_id,plan,created_at) VALUES(?,?,?,?)').run(id,plan,plan,clock);
  const approved=await request(owner,'/admin/action',{action:'review',id,approve:true,paymentChecked:true,reference:'test-reference'});
  assert.equal(approved.status,200,JSON.stringify(approved.data));
  const entitlement=sql.prepare('SELECT * FROM entitlements WHERE user_id=?').get(plan);
  assert.equal(entitlement.starts_at,starts);assert.equal(entitlement.ends_at,starts+days*DAY,plan+' real duration');
  assert.equal((await request(token,'/account',{action:'note',word:'bonjour',definition:'Salutation en français.',category:'Expression'})).status,200,plan+' notes can be saved');
  assert.equal((await request(token,'/account')).data.notes.length,1);
  clock=starts+days*DAY-1;assert.equal((await request(token,'/account')).data.accessType,'paid');
  clock++;assert.equal((await request(token,'/account')).data.accessType,'none');
  assert.equal((await request(token,'/analysis/status')).data.allowed,false);
  assert.equal((await request(token,'/account')).data.notes.length,1,'Personal notes are preserved after expiry');
 }
 const {plans}=load('app/subscription-plans.ts');
 for(const plan of plans){assert.equal(plan.days,expected[plan.id]);assert.ok(plan.features.includes('Accès aux notes'));}
 console.log('PASS: payment approvals grant exactly 7/15/20 days; access stops at the exact deadline; all packs including Sprint save notes; displayed cards match server durations.');
})().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>sql.close());
