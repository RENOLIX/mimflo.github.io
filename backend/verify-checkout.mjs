import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {DatabaseSync} from 'node:sqlite';
import {build} from 'esbuild';

await fs.mkdir('.qa',{recursive:true});
await build({entryPoints:['backend/index.ts'],bundle:true,platform:'node',format:'esm',external:['cloudflare:sockets'],outfile:'.qa/checkout-api.mjs'});
const {default:api}=await import('../.qa/checkout-api.mjs?'+Date.now());
const db=new DatabaseSync(':memory:');
for(const name of (await fs.readdir('backend/migrations')).filter(n=>n.endsWith('.sql')).sort())db.exec(await fs.readFile('backend/migrations/'+name,'utf8'));
function statement(sql,args=[]){return {bind:(...values)=>statement(sql,values),first:async()=>db.prepare(sql).get(...args)||null,all:async()=>({results:db.prepare(sql).all(...args)}),run:async()=>({meta:{changes:Number(db.prepare(sql).run(...args).changes)}})}}
const env={DB:{prepare:statement,batch:async list=>{db.exec('BEGIN');try{const result=[];for(const item of list)result.push(await item.run());db.exec('COMMIT');return result}catch(e){db.exec('ROLLBACK');throw e}}},ALLOWED_ORIGIN:'https://mimflo.test',DEV_MODE:'local',IP_PEPPER:'local-checkout-test'};
const plans=[['sprint','9V88R3WTPU4PS','10.00',7],['intensif','PZMUSTBZ6QGSL','15.00',15],['performance','WXGAA5VBZCXBQ','20.00',20]];
for(const id of ['owner',...plans.map(p=>p[0])]){
 db.prepare('INSERT INTO users(id,email,email_key,password_hash,first_name,last_name,role,email_verified,created_at) VALUES (?,?,?,?,?,?,?,?,?)').run(id,id+'@example.invalid',id,'pbkdf2:test','Client',id,id==='owner'?'owner':'client',1,Date.now());
 const hash=Buffer.from(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(id))).toString('base64');db.prepare('INSERT INTO auth_sessions VALUES (?,?,?)').run(hash,id,Date.now()+3600000);
}
async function req(user,path,body){const response=await api.fetch(new Request(env.ALLOWED_ORIGIN+path,{method:body?'POST':'GET',headers:{Origin:env.ALLOWED_ORIGIN,'Content-Type':'application/json',...(user?{Authorization:'Bearer '+user}:{})},body:body?JSON.stringify(body):undefined}),env);return {status:response.status,data:await response.json()}}
const customer={firstName:'Client',lastName:'Test',country:'DZ',address:'1 rue du Test',city:'Alger',postalCode:'16000',phone:'+213555000000',level:'B2',exam:'TCF',email:'spoofed@example.invalid'};
try{
 assert.equal((await req(null,'/checkout')).status,401);
 assert.equal((await req(null,'/checkout',{plan:'sprint',customer,consent:true})).status,401);
 const config=await req('sprint','/checkout');assert.equal(config.status,200);assert.equal(config.data.paypalReady,true);assert.equal(config.data.paypalPlans.length,3);
 for(const invalid of ['unknown','__proto__','constructor','toString',null,{},['sprint']])assert.equal((await req('sprint','/checkout',{plan:invalid,customer,consent:true})).status,400);
 assert.equal((await req('sprint','/checkout',{plan:'sprint',customer:{...customer,country:'XX'},consent:true})).status,400);
 assert.equal((await req('sprint','/checkout',{plan:'sprint',customer,consent:false})).status,400);
 const orders=[];
 for(const [plan,hostedButton,amount,days] of plans){
  // Deliberately conflicting payment input must never affect server selection.
  const response=await req(plan,'/checkout',{plan,customer,consent:true,amount:'0.01',paypalUrl:'https://attacker.invalid',payment:{plan:'performance',amount:'0.01',url:'https://attacker.invalid'},status:'approved'});
  assert.equal(response.status,200);const order=response.data;orders.push({plan,id:order.id,days});
  assert.equal(order.plan,plan);assert.equal(order.amount,amount);assert.equal(order.currency,'USD');assert.equal(order.paypalUrl,'https://www.paypal.com/ncp/payment/'+hostedButton);assert.equal(order.paypalReady,true);
  const stored=db.prepare('SELECT * FROM requests WHERE id=?').get(order.id);assert.equal(stored.user_id,plan);assert.equal(stored.plan,plan);assert.equal(stored.status,'pending');
  const payment=JSON.parse(stored.payment);assert.equal(payment.url,order.paypalUrl);assert.equal(payment.amount,amount);assert.equal(payment.hostedButtonId,hostedButton);assert.equal(JSON.parse(stored.customer).email,plan+'@example.invalid');
  assert.equal(db.prepare('SELECT selected_plan FROM users WHERE id=?').get(plan).selected_plan,plan);
  const retry=await req(plan,'/checkout',{plan,customer,consent:true});assert.equal(retry.data.id,order.id);assert.equal(retry.data.paypalUrl,order.paypalUrl);assert.equal(db.prepare('SELECT count(*) n FROM requests WHERE user_id=?').get(plan).n,1);
 }
 assert.equal(db.prepare('SELECT count(*) n FROM entitlements').get().n,0,'Choosing payment never marks an order as paid');
 assert.equal((await req('sprint','/checkout',{plan:'intensif',customer,consent:true})).status,409);
 const overview=await req('owner','/admin/overview');assert.equal(overview.status,200);assert.equal(overview.data.paypalPlans.length,3);for(const order of orders)assert.equal(JSON.parse(overview.data.requests.find(r=>r.id===order.id).payment).plan,order.plan);
 assert.equal((await req('sprint','/admin/action',{action:'review',id:orders[0].id,approve:true,paymentChecked:true,reference:'TEST'})).status,403);
 for(const order of orders){
  assert.equal((await req('owner','/admin/action',{action:'review',id:order.id,approve:true,paymentChecked:false,reference:'TEST'})).status,400);
  assert.equal((await req('owner','/admin/action',{action:'review',id:order.id,approve:true,paymentChecked:true,reference:'LOCAL-TEST-PAYPAL'})).status,200);
  const entitlement=db.prepare('SELECT * FROM entitlements WHERE request_id=?').get(order.id);assert.equal(entitlement.plan,order.plan);assert.equal(entitlement.ends_at-entitlement.starts_at,order.days*86400000);
 }
 console.log('PASS: all 3 PayPal links, server-selected pack/amount, order/admin persistence, retry reuse, account required, tampered input rejected/ignored, manual activation 7/15/20 days. No payment performed.');
}finally{db.close()}
