import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { LocalStore } from './store.mjs';
import { createApiHandler } from '../core/api.mjs';

const dirname=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(dirname,'../..');
const dist=path.join(root,'dist');

function loadVars(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const vars={};
  for (const line of fs.readFileSync(filePath,'utf8').split(/\r?\n/u)) {
    const trimmed=line.trim(); if (!trimmed||trimmed.startsWith('#')) continue;
    const index=trimmed.indexOf('='); if (index<1) continue;
    vars[trimmed.slice(0,index)]=trimmed.slice(index+1).replace(/^['"]|['"]$/gu,'');
  }
  return vars;
}

const env={...loadVars(path.join(root,'.dev.vars')),...process.env,APP_ENV:process.env.APP_ENV||loadVars(path.join(root,'.dev.vars')).APP_ENV||'development'};
if (!env.MAKER_PASSWORD_HASH||!env.SESSION_SECRET) {
  console.error('Missing MAKER_PASSWORD_HASH or SESSION_SECRET. Copy .dev.vars.example to .dev.vars and configure it.');
  process.exit(1);
}
if (!fs.existsSync(dist)) {
  const result=spawnSync(process.execPath,[path.join(root,'scripts/build.mjs')],{stdio:'inherit'});
  if (result.status!==0) process.exit(result.status||1);
}

const store=new LocalStore(); store.init();
const api=createApiHandler({store,env});

const mimeTypes={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.ico':'image/x-icon','.txt':'text/plain; charset=utf-8'};
const securityHeaders={
  'x-content-type-options':'nosniff','x-frame-options':'DENY','referrer-policy':'strict-origin-when-cross-origin',
  'permissions-policy':'camera=(self), microphone=(), geolocation=()',
  'content-security-policy':"default-src 'self'; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'"
};

function nodeRequest(req) {
  const protocol='http'; const host=req.headers.host||'localhost';
  const url=`${protocol}://${host}${req.url}`;
  const init={method:req.method,headers:req.headers};
  if (!['GET','HEAD'].includes(req.method||'GET')) init.body=req, init.duplex='half';
  return new Request(url,init);
}

async function sendNode(res,response) {
  res.statusCode=response.status;
  for (const [key,value] of response.headers) res.setHeader(key,value);
  for (const [key,value] of Object.entries(securityHeaders)) if (!res.hasHeader(key)) res.setHeader(key,value);
  if (!response.body) { res.end(); return; }
  const reader=response.body.getReader();
  while (true) { const {done,value}=await reader.read(); if (done) break; res.write(Buffer.from(value)); }
  res.end();
}

function staticFile(urlPath) {
  const clean=decodeURIComponent(urlPath).replaceAll('..','');
  let candidate=path.join(dist,clean);
  if (clean.endsWith('/')) candidate=path.join(candidate,'index.html');
  if (!path.extname(candidate)) {
    if (fs.existsSync(candidate)&&fs.statSync(candidate).isDirectory()) candidate=path.join(candidate,'index.html');
    else if (fs.existsSync(`${candidate}.html`)) candidate=`${candidate}.html`;
  }
  if (!candidate.startsWith(dist)||!fs.existsSync(candidate)||!fs.statSync(candidate).isFile()) return null;
  return candidate;
}

const server=http.createServer(async(req,res)=>{
  try {
    const request=nodeRequest(req); const url=new URL(request.url);
    if (url.pathname.startsWith('/media/')) {
      const key=decodeURIComponent(url.pathname.slice('/media/'.length)); const media=store.getMedia(key);
      if (!media) return sendNode(res,new Response('Not found',{status:404}));
      return sendNode(res,new Response(media.bytes,{headers:{'content-type':media.type,'cache-control':'private, max-age=3600'}}));
    }
    const apiResponse=await api(request); if (apiResponse) return sendNode(res,apiResponse);
    const file=staticFile(url.pathname); if (file) {
      const type=mimeTypes[path.extname(file).toLowerCase()]||'application/octet-stream';
      return sendNode(res,new Response(fs.readFileSync(file),{headers:{'content-type':type,'cache-control':type.startsWith('text/html')?'no-cache':'public, max-age=3600'}}));
    }
    return sendNode(res,new Response(fs.readFileSync(path.join(dist,'404/index.html')),{status:404,headers:{'content-type':'text/html; charset=utf-8'}}));
  } catch (error) {
    console.error(error); return sendNode(res,new Response('Server error',{status:500}));
  }
});
const port=Number(env.PORT||8788);
server.listen(port,()=>console.log(`CharmNest running at http://localhost:${port}`));
