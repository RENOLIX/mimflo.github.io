import fs from 'node:fs/promises';import ts from 'typescript';
const source=await fs.readFile('app/pronunciation-score.ts','utf8');
await fs.writeFile('public/phonetics/score.mjs',ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ES2022,target:ts.ScriptTarget.ES2022}}).outputText);
