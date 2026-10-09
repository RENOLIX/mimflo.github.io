import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {DatabaseSync} from 'node:sqlite';
import {build} from 'esbuild';
import {CEFR_LEVELS,placementQuestions,publicPlacementQuestions,gradePlacement} from '../backend/placement-questions.ts';
import {readingWords} from '../app/reading-flow.ts';
await fs.mkdir('.qa',{recursive:true});
await build({entryPoints:['app/speech-reading.ts'],bundle:true,platform:'node',format:'esm',outfile:'.qa/speech-reading.mjs'});
const {speechSegments}=await import('../.qa/speech-reading.mjs');

const text='Le samedi matin, je prends le temps de lire et de discuter avec mes amis. Ensuite, nous allons au parc. '+Array(300).fill('ensemble').join(' ');
const segments=speechSegments(text);
assert.equal(segments[0].text,'Le samedi matin, je prends le temps de lire et de discuter avec mes amis.');
assert.ok(segments.length<readingWords(text).length/10,'Network speech stays continuous rather than one utterance per word');
assert.deepEqual(segments.flatMap(segment=>readingWords(segment.text).map(word=>word.text)),readingWords(text).map(word=>word.text),'Chunking loses or duplicates no words');
assert.equal(speechSegments(text,3,5)[0].text,'je prends');
assert.ok(publicPlacementQuestions().every(q=>!('answer' in q)));
const correct=Object.fromEntries(placementQuestions.map(q=>[q.id,q.answer]));
for(const [index,level] of CEFR_LEVELS.entries()){
 const answers=Object.fromEntries(placementQuestions.map(q=>[q.id,CEFR_LEVELS.indexOf(q.level)<=index?q.answer:(q.answer+1)%4]));
 assert.equal(gradePlacement(answers).level,level,'All six levels are represented');
}
assert.throws(()=>gradePlacement({}),/24 questions/);
assert.throws(()=>gradePlacement({...correct,'a1-1':9}),/24 questions/);
await fs.mkdir('.qa',{recursive:true});
await build({entryPoints:['backend/index.ts'],bundle:true,platform:'node',format:'esm',external:['cloudflare:sockets'],outfile:'.qa/placement-api.mjs'});
const {default:api}=await import('../.qa/placement-api.mjs?'+Date.now());
const db=new DatabaseSync(':memory:');
for(const migration of (await fs.readdir('backend/migrations')).filter(name=>name.endsWith('.sql')).sort())db.exec(await fs.readFile('backend/migrations/'+migration,'utf8'));
class Statement{constructor(sql,values=[]){this.sql=sql;this.values=values}bind(...values){return new Statement(this.sql,values)}async first(){return db.prepare(this.sql).get(...this.values)||null}async all(){return {results:db.prepare(this.sql).all(...this.values)}}async run(){return {meta:{changes:Number(db.prepare(this.sql).run(...this.values).changes)}}}}
let inference=0,badEvidence=false,insufficient=false;
const transcript='Chaque matin, je prépare mon petit déjeuner puis je vais travailler en bus. L’année dernière, j’ai changé de ville et cette expérience m’a appris à connaître de nouvelles personnes. À mon avis, la technologie nous aide à communiquer mais elle peut aussi nous isoler. Il est donc important de garder du temps pour rencontrer ses amis et pour discuter sans regarder son téléphone.';
const env={DB:{prepare:sql=>new Statement(sql),batch:async statements=>{db.exec('BEGIN');try{const results=[];for(const s of statements)results.push(await s.run());db.exec('COMMIT');return results}catch(error){db.exec('ROLLBACK');throw error}}},ALLOWED_ORIGIN:'https://mimflo.test',DEV_MODE:'local',IP_PEPPER:'test-only',AI_ENABLED:'true',AI:{run:async model=>{inference++;return model.includes('whisper')?{text:insufficient?'Bonjour':transcript}:{response:JSON.stringify({level:'B2',reason:'Discours développé dans cet échantillon de test.',strengths:['Arguments reliés.'],improvements:['Nuancer davantage.'],evidence:[{quote:badEvidence?'Cette phrase a été inventée':'la technologie nous aide à communiquer',observation:'Une opinion personnelle est formulée.'}]})}}}};
const hash=async value=>Buffer.from(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))).toString('base64');
async function client(name,access=true){const token=crypto.randomUUID();db.prepare('INSERT INTO users(id,email,email_key,password_hash,first_name,last_name,email_verified,created_at,trial_at) VALUES(?,?,?,?,?,?,1,?,?)').run(name,name+'@example.invalid',name,'test-only','Test',name,Date.now(),access?Date.now():null);db.prepare('INSERT INTO auth_sessions VALUES(?,?,?)').run(await hash(token),name,Date.now()+600000);return token;}
const token=await client('trial'),other=await client('other'),expired=await client('expired',false);
async function request(token,path,body,audio){const response=await api.fetch(new Request('https://mimflo.test'+path,{method:body||audio?'POST':'GET',headers:{Origin:env.ALLOWED_ORIGIN,...(token?{Authorization:'Bearer '+token}:{}),...(audio?{'Content-Type':'audio/wav'}:body?{'Content-Type':'application/json'}:{})},body:audio||body&&JSON.stringify(body)}),env);return {status:response.status,origin:response.headers.get('Access-Control-Allow-Origin'),data:await response.json()};}
function wav(seconds){const bytes=new Uint8Array(44+seconds*32000),v=new DataView(bytes.buffer),tag=(at,s)=>{for(let i=0;i<s.length;i++)bytes[at+i]=s.charCodeAt(i)};tag(0,'RIFF');v.setUint32(4,bytes.length-8,true);tag(8,'WAVE');tag(12,'fmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,1,true);v.setUint32(24,16000,true);v.setUint32(28,32000,true);v.setUint16(32,2,true);v.setUint16(34,16,true);tag(36,'data');v.setUint32(40,bytes.length-44,true);for(let i=44;i<bytes.length;i+=2)v.setInt16(i,5000*Math.sin(i*.07),true);return bytes;}
assert.equal((await request(null,'/placement')).status,401);
assert.equal((await request(expired,'/placement/start',{})).status,403);
assert.equal((await request(token,'/placement')).data.questions.length,24);
const start=await request(token,'/placement/start',{});assert.equal(start.status,200);const id=start.data.id;
assert.equal((await request(token,'/placement/start',{})).data.id,id,'A reload resumes its own unfinished test');
assert.equal((await request(other,'/placement/answers',{id,answers:correct})).status,404);
assert.equal((await request(token,'/placement/answers',{id,answers:{}})).status,400);
assert.equal((await request(token,'/placement/answers',{id,answers:correct})).status,200);
assert.equal((await request(token,'/placement/audio?id='+id+'&consent=false',null,wav(20))).status,400);
assert.equal((await request(token,'/placement/audio?id='+id+'&consent=true',null,wav(5))).status,422);
assert.equal(inference,0,'Invalid audio and missing consent never invoke inference');
const completed=await request(token,'/placement/audio?id='+id+'&consent=true',null,wav(45));assert.equal(completed.status,200,JSON.stringify(completed));assert.equal(completed.data.result.level,'B2');assert.equal(completed.data.result.quiz.level,'C2');assert.equal(completed.data.result.seconds,45,'Oral evaluation is not limited to thirty seconds');assert.equal(inference,2);
assert.equal((await request(token,'/placement/audio?id='+id+'&consent=true',null,wav(45))).status,200);assert.equal(inference,2,'Retries return the stored result without repeating inference');
assert.equal((await request(token,'/placement/start',{})).status,409,'One completed placement is included in a trial');
assert.equal((await request(token,'/placement')).data.latest.result.level,'B2','The level is restored after reload');
const second=(await request(other,'/placement/start',{})).data.id;await request(other,'/placement/answers',{id:second,answers:correct});badEvidence=true;
const failed=await request(other,'/placement/audio?id='+second+'&consent=true',null,wav(45));assert.equal(failed.status,503);assert.equal(failed.origin,env.ALLOWED_ORIGIN,'Errors retain CORS headers');assert.equal(db.prepare('SELECT result FROM placement_tests WHERE id=?').get(second).result,null,'Invented evidence never produces a stored level');
insufficient=true;
assert.equal((await request(other,'/placement/audio?id='+second+'&consent=true',null,wav(45))).status,422);
const before=inference;assert.equal((await request(other,'/placement/audio?id='+second+'&consent=true',null,wav(45))).status,429);assert.equal(inference,before,'Failed retries cannot bypass the free inference budget');
console.log('PASS: continuous French speech without word pauses, six-level quiz, authenticated placement, ownership, consent, 45-second oral answer, persisted indicative level, real-quote validation, no fabricated result, idempotency, CORS and bounded inference retries. Inference was mocked; accuracy is not certified.');
