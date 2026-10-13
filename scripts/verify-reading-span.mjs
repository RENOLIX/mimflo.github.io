import assert from 'node:assert/strict';import {alignPhones,acousticAssessment,logSoftmaxRows} from '../public/phonetics/core.mjs';
const words=['Bonjour','ici','L’éducation','joue','un','rôle','fondamental','Merci'],ids=[1,2,3,4,5,6,7,8],expected=ids.map((id,wordIndex)=>({id,phone:String(id),word:words[wordIndex],wordIndex}));
const heard=ids.slice(2,7).map(id=>({id}));const pairs=alignPhones(expected,heard,{span:true,preferredPhone:0});
assert.deepEqual(pairs.map(p=>p.expectedIndex),[2,3,4,5,6],'Find the actual phrase even when the old reading cursor is wrong');
const sequence=heard.flatMap(p=>[0,p.id,p.id,0]),width=9,frames=sequence.length,logits=new Float32Array(frames*width).fill(-8);sequence.forEach((id,i)=>logits[i*width+id]=8);
const result=acousticAssessment({logp:logSoftmaxRows(logits,frames,width),frames,width,expected,labels:['blank',...ids.map(String)],samples:Float32Array.from({length:48000},(_,i)=>Math.sin(i*.04)*.2),reference:words.join(' '),span:true,preferredStartWord:0}).analysis;
assert.equal(result.detectedStartWord,2);assert.equal(result.reference,'L’éducation joue un rôle fondamental');assert.equal(result.phonemes[0].wordIndex,0,'Rebase occurrence indexes for server validation');assert.equal(result.score,100);assert.equal(result.alignmentMethod,'span-v1');
console.log('PASS: wrong bookmark does not lower a correctly read later phrase; actual start and exact reference are detected; word indexes remain valid.');
