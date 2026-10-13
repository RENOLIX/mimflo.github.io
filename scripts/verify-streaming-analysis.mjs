import assert from 'node:assert/strict';
import {AcousticStream} from '../public/phonetics/stream-cache.mjs';
import {phonePracticeScore,pronunciationPracticeScore} from '../public/phonetics/score.mjs';
const input=Float32Array.from({length:16000*7+117},(_,i)=>Math.sin(i*.03)*.2),quantized=Float32Array.from(input,x=>(x<0?Math.round(x*32768):Math.round(x*32767))/32768);
let calls=0;const infer=async samples=>{calls++;await new Promise(r=>setTimeout(r,1));return Float32Array.from({length:Math.floor((samples.length-400)/320)+1},(_,i)=>samples[i*320+200]);};
const stream=new AcousticStream('reading-1',infer,1);
for(let i=0;i<input.length;i+=4096){stream.append(input.subarray(i,i+4096));await stream.task;}
const before=calls;assert.ok(stream.cursor>=16000*4,'Acoustic windows are measured before the analysis button');
assert.ok(stream.compatible(quantized));const different=quantized.slice();different[2]+=.1;assert.equal(stream.compatible(different),false,'Do not reuse another recording');
const result=await stream.finish();assert.ok(calls-before<=1,'Only the last incomplete window remains after stopping');
assert.equal(result.length,Math.floor((input.length-400)/320)+1);for(let i=0;i<result.length;i++)assert.equal(result[i],quantized[i*320+200],'No missing or shifted audio frame');
assert.equal(phonePracticeScore({expected:'e',heard:'e',status:'match',confidence:35}),90,'Model uncertainty is not directly used as a learner grade');
assert.ok(phonePracticeScore({expected:'e',heard:'ɛ',status:'different',confidence:5})>phonePracticeScore({expected:'e',heard:'t',status:'different',confidence:5}),'Nearby French sounds receive partial credit');
assert.equal(pronunciationPracticeScore([{expected:'e',heard:'',status:'missing'}]),0,'Missing readings do not receive an invented good score');
assert.equal(pronunciationPracticeScore([{expected:'e',heard:'e',status:'match',confidence:100},{expected:'e',heard:'',status:'missing'}]),50,'Unread sounds remain in the denominator');
console.log('PASS: streaming PCM matches original WAV; cached windows reused; only final window after stop; progressive proximity score retains true omissions.');
