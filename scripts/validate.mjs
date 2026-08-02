import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const required=['package.json','README.md','PHASE_LEDGER.md','wrangler.toml','migrations/0001_init.sql','src/core/api.mjs','src/local/server.mjs','src/cloudflare/worker.mjs','dist/index.html','dist/studio/index.html','dist/styles/main.css','dist/styles/studio.css'];
const errors=[];
for(const file of required)if(!fs.existsSync(path.join(root,file)))errors.push(`Missing required file: ${file}`);
const logos=fs.readdirSync(path.join(root,'public/brand/logo-options')).filter(f=>f.endsWith('-original.png'));
if(logos.length!==5)errors.push(`Expected 5 original logo PNGs; found ${logos.length}.`);
if(fs.existsSync(path.join(root,'dist/reference')))errors.push('Private reference directory leaked into dist.');
const files=[];function walk(dir){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,entry.name);if(entry.isDirectory())walk(p);else files.push(p);}}
walk(path.join(root,'src'));walk(path.join(root,'scripts'));walk(path.join(root,'public/js'));
for(const file of files.filter(f=>/\.(m?js)$/u.test(f))){const r=spawnSync(process.execPath,['--check',file],{encoding:'utf8'});if(r.status!==0)errors.push(`Syntax error in ${path.relative(root,file)}: ${r.stderr.trim()}`);}
const distFiles=[];walkDist(path.join(root,'dist'));function walkDist(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,e.name);if(e.isDirectory())walkDist(p);else distFiles.push(p);}}
for(const file of distFiles.filter(f=>/\.(html|js|css|json|svg)$/u.test(f))){const text=fs.readFileSync(file,'utf8');if(/\{\{[^}]+\}\}|REPLACE_WITH_REAL|TODO_STUB/u.test(text))errors.push(`Unresolved token in ${path.relative(root,file)}`);}
const htmlFiles=distFiles.filter(f=>f.endsWith('.html'));for(const file of htmlFiles){const html=fs.readFileSync(file,'utf8');for(const match of html.matchAll(/(?:href|src)="(\/[^"?#]+)"/gu)){const url=match[1];if(url.startsWith('/api/')||url.startsWith('/media/'))continue;let target=path.join(root,'dist',url);if(url.endsWith('/'))target=path.join(target,'index.html');if(!path.extname(target)&&fs.existsSync(`${target}.html`))target=`${target}.html`;if(!fs.existsSync(target))errors.push(`Broken internal asset/link ${url} in ${path.relative(root,file)}`);}}
if(errors.length){console.error(errors.map(e=>`- ${e}`).join('\n'));process.exit(1);}console.log(`Validation passed: ${required.length} required files, ${logos.length} original logos, ${htmlFiles.length} HTML pages.`);
