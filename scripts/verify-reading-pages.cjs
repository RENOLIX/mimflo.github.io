const assert=require('node:assert/strict');
const {buildSync}=require('esbuild');
const vm=require('node:vm');
function load(entry){const context={module:{exports:{}},exports:{},require};context.exports=context.module.exports;vm.runInNewContext(buildSync({entryPoints:[entry],bundle:true,platform:'node',format:'cjs',write:false}).outputFiles[0].text,context);return context.module.exports}
const {paginateReading,readingPageForWord}=load('app/reading-pages.ts');
const {readingWords}=load('app/reading-flow.ts');
const paragraphs=['Un défi pour l’environnement : aujourd’hui, chacun peut agir. '+Array.from({length:25},(_,i)=>`La solution ${i} préserve notre avenir.`).join(' '),'Une deuxième page — avec des mots répétés, des apostrophes et des accents !','!!!'];
const images=[{id:'before',url:'/image.jpg',afterParagraph:-1},{id:'after',url:'/image2.jpg',caption:'Un paysage',afterParagraph:0}];
for(const capacity of [90,200,500]){
 const pages=paginateReading(paragraphs,images,blocks=>blocks.reduce((sum,b)=>sum+(b.kind==='text'?b.text.length:80),0)<=capacity);
 const blocks=pages.flatMap(p=>p.blocks),texts=blocks.filter(b=>b.kind==='text');
 assert.equal(texts.map(b=>b.text).join(''),paragraphs.join(''),'all punctuation and text are preserved');
 assert.equal(JSON.stringify(blocks.filter(b=>b.kind==='image').map(b=>b.image.id)),JSON.stringify(['before','after']));
 const expected=readingWords(paragraphs.join('\n\n')).map(w=>w.text);
 const actual=texts.flatMap(b=>Array.from(readingWords(b.text),(w,i)=>({text:w.text,index:b.firstWord+i})));
 assert.equal(JSON.stringify(actual.map(w=>w.text)),JSON.stringify(expected));
 actual.forEach((word,index)=>{assert.equal(word.index,index);const page=readingPageForWord(pages,index);assert.notEqual(page,null);assert.ok(pages[page].blocks.some(b=>b.kind==='text'&&index>=b.firstWord&&index<b.firstWord+readingWords(b.text).length))});
 assert.equal(readingPageForWord(pages,expected.length),null);
 assert.ok(pages.length>1);
}
const {dailyReadingScores}=load('app/daily-reading-stats.ts');
const now=new Date(2026,9,15,12),session=(date,score,kind='phonetic-experimental')=>({created_at:date.getTime(),analysis:JSON.stringify({kind,score})});
const days=dailyReadingScores([session(now,60),session(now,80),session(new Date(2026,9,14,23),0),session(new Date(2026,9,1),100),session(now,99,'transcription'),{created_at:now.getTime(),analysis:'invalid'}],now);
assert.equal(days.length,7);assert.equal(days[6].score,70);assert.equal(days[6].count,2);assert.equal(days[5].score,0);assert.equal(days[0].score,null);
console.log('PASS: complete text, stable word indexes, image order, automatic word-to-page mapping, real daily score averages and empty days.');
