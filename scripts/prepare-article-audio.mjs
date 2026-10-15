// Run after exporting published articles; native inference happens on the publisher's machine.
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
import {synthesisInput} from '../public/speech/timing.mjs';
const utils=await build({stdin:{contents:"export {speechSegments} from './app/speech-reading'; export {readingWords,articleText} from './app/reading-flow';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',write:false});
const {speechSegments,readingWords,articleText}=await import('data:text/javascript;base64,'+Buffer.from(utils.outputFiles[0].text).toString('base64'));
const phase=process.argv[2],file='.qa/article-audio-jobs.json';
if(phase==='plan'){
 const data=JSON.parse((await fs.readFile(process.argv[3]||'scripts/article-voice-catalogue.json','utf8')).replace(/^\uFEFF/,'')),articles=data[0]?.results||data;
 const jobs=articles.map(article=>{const text=articleText(JSON.parse(article.paragraphs));return {id:article.id,title:article.title,hash:createHash('sha256').update(text).digest('hex'),text,segments:speechSegments(text).map(segment=>({...segment,words:readingWords(segment.text).map(w=>w.text)}))}});
 await fs.mkdir('.qa',{recursive:true});
 await fs.writeFile(file,JSON.stringify(jobs));console.log(JSON.stringify({articles:jobs.length,words:jobs.reduce((n,j)=>n+readingWords(j.text).length,0),segments:jobs.reduce((n,j)=>n+j.segments.length,0)}));
}else if(phase==='align'){
 const jobs=JSON.parse(await fs.readFile(file,'utf8')),config=JSON.parse(await fs.readFile('public/speech/fr-siwis.json','utf8'));
 for(const article of jobs)for(const segment of article.segments){const [full,...words]=segment.phonemes;segment.input=synthesisInput(full,words,segment.words,config.phoneme_id_map);delete segment.phonemes}
 await fs.writeFile(file,JSON.stringify(jobs));console.log('Aligned phonemes to the exact words of each article.');
}else if(phase==='manifest'){
 const entries=(await fs.readdir('public/speech/ready')).filter(name=>/^[a-f0-9]{64}\.json$/.test(name));
 await fs.writeFile('app/prepared-voice-manifest.json',JSON.stringify(Object.fromEntries(entries.map(name=>[name.slice(0,-5),'/speech/ready/'+name]))));console.log(`Manifest: ${entries.length} prepared readings.`);
}else throw Error('Use plan, align or manifest');
