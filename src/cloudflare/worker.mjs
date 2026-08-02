import { CloudflareStore } from './store.mjs';
import { createApiHandler } from '../core/api.mjs';

const security={
  'x-content-type-options':'nosniff','x-frame-options':'DENY','referrer-policy':'strict-origin-when-cross-origin',
  'permissions-policy':'camera=(self), microphone=(), geolocation=()',
  'content-security-policy':"default-src 'self'; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'"
};
function secure(response){const h=new Headers(response.headers);for(const[k,v]of Object.entries(security))h.set(k,v);return new Response(response.body,{status:response.status,statusText:response.statusText,headers:h});}
export default {async fetch(request,env){const store=new CloudflareStore(env);await store.init();const api=createApiHandler({store,env});const url=new URL(request.url);if(url.pathname.startsWith('/media/')){const key=decodeURIComponent(url.pathname.slice(7));const media=await store.getMedia(key);return secure(media?new Response(media.bytes,{headers:{'content-type':media.type,'cache-control':'private,max-age=3600'}}):new Response('Not found',{status:404}));}const result=await api(request);if(result)return secure(result);return secure(await env.ASSETS.fetch(request));}};
