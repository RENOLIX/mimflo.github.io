import assert from 'node:assert/strict';
const base='http://127.0.0.1:5173';
const anonymous=await fetch(base+'/api/account');assert.equal(anonymous.status,200);assert.equal((await anonymous.json()).user,null);
const unauth=await fetch(base+'/api/account',{method:'POST',headers:{'Content-Type':'application/json',Origin:base},body:JSON.stringify({action:'note',word:'test',definition:'test'})});assert.equal(unauth.status,401);
const login=await fetch(base+'/signin-with-chatgpt?return_to=/',{redirect:'manual'});const cookie=login.headers.get('set-cookie')?.split(';')[0];assert.ok(cookie);
async function req(body,origin=base){const r=await fetch(base+'/api/account',{method:'POST',headers:{'Content-Type':'application/json',Cookie:cookie,Origin:origin},body:JSON.stringify(body)});const text=await r.text();let data;try{data=JSON.parse(text)}catch{data={error:text}}return{status:r.status,data}}
async function read(){const r=await fetch(base+'/api/account',{headers:{Cookie:cookie}});assert.equal(r.status,200);return r.json()}
assert.equal((await req({action:'profile',firstName:'Test',lastName:'MimFlo',level:'B1',exam:'TCF',source:'Autre',consent:true},'https://unexpected.example')).status,403);
assert.equal((await req({action:'profile',firstName:'Test',lastName:'MimFlo',level:'ZZ',consent:true})).status,400);
assert.equal((await req({action:'profile',firstName:'Test',lastName:'MimFlo',level:'B1',exam:'TCF',source:'Autre',consent:true})).status,200);
assert.equal((await req({action:'trial'})).status,200);
const note=await req({action:'note',word:'prendre confiance',definition:'Devenir plus à l’aise.'});assert.equal(note.status,200);
assert.equal((await read()).notes.find(n=>n.id===note.data.id).word,'prendre confiance');
assert.equal((await req({action:'session',articleId:'reseaux',seconds:2,transcript:''})).status,400);
assert.equal((await req({action:'session',articleId:'reseaux',seconds:12,transcript:'Aujourd’hui les réseaux sociaux occupent une place importante dans notre vie quotidienne'})).status,200);
assert.equal((await req({action:'session',articleId:'reseaux',seconds:12,transcript:''})).status,403);
const state=await read();assert.equal(state.profile.first_name,'Test');assert.equal(state.notes.length,1);assert.equal(state.sessions.length,1);assert.ok(state.sessions[0].coverage>0);assert.ok(state.profile.trial_at);
assert.equal((await req({action:'plan',plan:'intensif'})).status,200);assert.equal((await read()).profile.selected_plan,'intensif');
console.log(JSON.stringify({passed:true,checks:['Anonymous writes rejected','Cross-origin writes rejected','Profile validation','Profile persisted','Trial started once','Vocabulary persisted after new request','Short session rejected','Session persisted','Trial session limit enforced','Plan selection persisted']}));
