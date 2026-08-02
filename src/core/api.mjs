import { createSession, verifyPassword, verifySession, parseCookies, sessionCookie, clearSessionCookie } from './auth.mjs';
import { DROP_STATUSES, LOGO_OPTIONS, ORDER_STATUSES } from './constants.mjs';
import { validateDrop, validateOrder, validatePhoto, validateSettings } from './validation.mjs';
import { createFlyerSvg } from './flyer.mjs';

const JSON_HEADERS={'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'};
const textEncoder=new TextEncoder();

function json(data,status=200,headers={}) { return new Response(JSON.stringify(data),{status,headers:{...JSON_HEADERS,...headers}}); }
function error(message,status=400,details=[]) { return json({ok:false,error:message,details},status); }
function ok(data={},status=200,headers={}) { return json({ok:true,...data},status,headers); }
function clientKey(request) { return request.headers.get('cf-connecting-ip')||request.headers.get('x-forwarded-for')||'local'; }
function isSecure(request,env) { return new URL(request.url).protocol==='https:' || env.APP_ENV==='production'; }
function sameOrigin(request) { const origin=request.headers.get('origin'); return !origin || origin===new URL(request.url).origin; }

async function bodyJson(request,maxBytes=12_000_000) {
  const length=Number(request.headers.get('content-length')||0);
  if (length>maxBytes) throw new Error('Request is too large.');
  const text=await request.text();
  if (text.length>maxBytes) throw new Error('Request is too large.');
  return text?JSON.parse(text):{};
}

function base64Bytes(value) {
  const normalized=String(value||'').replace(/^data:[^;]+;base64,/u,'');
  if (!normalized) return new Uint8Array();
  const binary=atob(normalized);
  return Uint8Array.from(binary,char=>char.charCodeAt(0));
}

async function authContext(request,env) {
  const token=parseCookies(request).charmnest_session;
  return verifySession(token,env.SESSION_SECRET);
}

function requireRole(session,role) {
  if (!session) return error('Sign in to continue.',401);
  if (role==='adult' && session.role!=='adult') return error('Adult Admin access is required.',403);
  return null;
}

function requireMutation(request,session) {
  if (!sameOrigin(request)) return error('Request origin was rejected.',403);
  if (!session || request.headers.get('x-csrf-token')!==session.csrf) return error('Your session check failed. Refresh the page and try again.',403);
  return null;
}

function publicDrop(drop) {
  if (!drop) return null;
  const { privateNotes,createdBy,...safe }=drop;
  return safe;
}

async function photoDataUri(store,photo) {
  if (!photo?.webKey) return '';
  const media=await store.getMedia(photo.webKey);
  if (!media) return '';
  let binary=''; for (const byte of media.bytes) binary+=String.fromCharCode(byte);
  return `data:${media.type};base64,${btoa(binary)}`;
}

export function createApiHandler({store,env}) {
  return async function handle(request) {
    const url=new URL(request.url);
    const path=url.pathname;
    const method=request.method.toUpperCase();
    try {
      if (path==='/api/public/settings' && method==='GET') {
        const settings=await store.getSettings();
        const active=LOGO_OPTIONS.find(item=>item.id===settings.activeLogo)||LOGO_OPTIONS[0];
        return ok({settings:{...settings,activeLogoUrl:active.url}});
      }
      if (path==='/api/public/drop' && method==='GET') return ok({drop:publicDrop(await store.getCurrentDrop())});
      if (path==='/api/public/drops' && method==='GET') return ok({drops:(await store.listDrops({includePrivate:false})).map(publicDrop)});
      if (path==='/api/orders' && method==='POST') {
        const {data,errors}=validateOrder(await bodyJson(request,100_000));
        if (errors.length) return error('Please correct the order form.',422,errors);
        return ok({order:await store.createOrder(data)},201);
      }
      if (path==='/api/auth/login' && method==='POST') {
        const key=clientKey(request); const limit=await store.checkLoginLimit(key);
        if (!limit.allowed) return error(`Too many attempts. Try again in ${limit.retryAfter} seconds.`,429);
        const input=await bodyJson(request,20_000);
        const username=String(input.username||'').trim().toLowerCase();
        const role=username==='adult'?'adult':username==='maker'?'maker':'';
        const hash=role==='adult'?env.ADULT_PASSWORD_HASH:role==='maker'?env.MAKER_PASSWORD_HASH:'';
        const valid=role && await verifyPassword(String(input.password||''),hash);
        await store.recordLogin(key,Boolean(valid));
        if (!valid) { await store.log({username:username||'unknown',role:'unknown'},'auth.login.failed','auth','',{clientKey:key}); return error('The username or password is not correct.',401); }
        const {token,payload}=await createSession({username,role,secret:env.SESSION_SECRET});
        await store.log(payload,'auth.login.success','auth','',{});
        return ok({session:{username,role,csrf:payload.csrf}},200,{'set-cookie':sessionCookie(token,{secure:isSecure(request,env)})});
      }
      if (path==='/api/auth/session' && method==='GET') {
        const session=await authContext(request,env);
        return session?ok({session:{username:session.username,role:session.role,csrf:session.csrf}}):error('Not signed in.',401);
      }
      if (path==='/api/auth/logout' && method==='POST') return ok({},200,{'set-cookie':clearSessionCookie({secure:isSecure(request,env)})});
      if (path.startsWith('/api/studio/')) {
        const session=await authContext(request,env);
        const roleError=requireRole(session,'maker'); if (roleError) return roleError;
        if (method!=='GET') { const mutationError=requireMutation(request,session); if (mutationError) return mutationError; }
        if (path==='/api/studio/dashboard' && method==='GET') {
          const [drops,photos,activity,settings]=await Promise.all([store.listDrops({includePrivate:true}),store.listPhotos({includePrivate:true}),store.listActivity(30),store.getSettings()]);
          const orders=session.role==='adult'?await store.listOrders({includeEmail:true}):await store.listOrders({includeEmail:false});
          return ok({session:{username:session.username,role:session.role,csrf:session.csrf},drops,photos,orders,activity,settings,logoOptions:LOGO_OPTIONS});
        }
        if (path==='/api/studio/drops' && method==='GET') return ok({drops:await store.listDrops({includePrivate:true})});
        if (path==='/api/studio/drops' && method==='POST') {
          const input=await bodyJson(request,100_000); const {data,errors}=validateDrop(input);
          if (errors.length) return error('Please correct the drop form.',422,errors);
          if (data.status==='published' && session.role!=='adult') data.status='review';
          return ok({drop:await store.createDrop(data,session)},201);
        }
        const dropMatch=path.match(/^\/api\/studio\/drops\/([^/]+)$/u);
        if (dropMatch && method==='GET') { const drop=await store.getDrop(dropMatch[1]); return drop?ok({drop}):error('Drop not found.',404); }
        if (dropMatch && method==='PUT') {
          const input=await bodyJson(request,100_000); const {data,errors}=validateDrop(input);
          if (errors.length) return error('Please correct the drop form.',422,errors);
          const current=await store.getDrop(dropMatch[1]); if (!current) return error('Drop not found.',404);
          if (data.status==='published' && session.role!=='adult') data.status='review';
          const updated=await store.updateDrop(dropMatch[1],data,session); return ok({drop:updated});
        }
        const statusMatch=path.match(/^\/api\/studio\/drops\/([^/]+)\/status$/u);
        if (statusMatch && method==='POST') {
          const input=await bodyJson(request,20_000); const status=String(input.status||'');
          if (!DROP_STATUSES.includes(status)) return error('Invalid drop status.',422);
          if (status==='published' && session.role!=='adult') return error('Only the Adult Admin can publish a drop.',403);
          const drop=await store.setDropStatus(statusMatch[1],status,session); return drop?ok({drop}):error('Drop not found.',404);
        }
        if (path==='/api/studio/photos' && method==='GET') return ok({photos:await store.listPhotos({includePrivate:true})});
        if (path==='/api/studio/photos' && method==='POST') {
          const input=await bodyJson(request,25_000_000); const {data,errors}=validatePhoto(input);
          if (errors.length) return error('Please correct the photo details.',422,errors);
          const variants={original:base64Bytes(input.originalBase64),web:base64Bytes(input.webBase64),thumb:base64Bytes(input.thumbBase64)};
          if (!variants.original.length||!variants.web.length||!variants.thumb.length) return error('All photo versions are required.',422);
          if (variants.original.length>8_000_000) return error('The original photo must be 8 MB or smaller.',413);
          return ok({photo:await store.savePhoto({meta:data,variants},session)},201);
        }
        const photoDecision=path.match(/^\/api\/studio\/photos\/([^/]+)\/decision$/u);
        if (photoDecision && method==='POST') {
          const adultError=requireRole(session,'adult'); if (adultError) return adultError;
          const input=await bodyJson(request,20_000); const decision=['approve','reject','archive'].includes(input.decision)?input.decision:'';
          if (!decision) return error('Invalid photo decision.',422);
          const photo=await store.approvePhoto(photoDecision[1],decision,session); return photo?ok({photo}):error('Photo not found.',404);
        }
        const attachMatch=path.match(/^\/api\/studio\/drops\/([^/]+)\/photos$/u);
        if (attachMatch && method==='POST') {
          const input=await bodyJson(request,20_000); const photo=await store.getPhoto(input.photoId);
          if (!photo) return error('Photo not found.',404);
          if (photo.status!=='approved' && session.role!=='adult') return error('The photo must be approved before it can be attached.',422);
          return ok({drop:await store.attachPhoto(attachMatch[1],photo.id,{isCover:Boolean(input.isCover)},session)});
        }
        if (path==='/api/studio/settings' && method==='PUT') {
          const adultError=requireRole(session,'adult'); if (adultError) return adultError;
          const {data,errors}=validateSettings(await bodyJson(request,100_000));
          if (errors.length) return error('Please correct the settings.',422,errors);
          return ok({settings:await store.updateSettings(data,session)});
        }
        if (path==='/api/studio/orders' && method==='GET') return ok({orders:await store.listOrders({includeEmail:session.role==='adult'})});
        const orderStatus=path.match(/^\/api\/studio\/orders\/([^/]+)\/status$/u);
        if (orderStatus && method==='POST') {
          const adultError=requireRole(session,'adult'); if (adultError) return adultError;
          const input=await bodyJson(request,20_000); if (!ORDER_STATUSES.includes(input.status)) return error('Invalid order status.',422);
          const order=await store.updateOrderStatus(orderStatus[1],input.status,session); return order?ok({order}):error('Order not found.',404);
        }
        const flyerMatch=path.match(/^\/api\/studio\/drops\/([^/]+)\/flyer\.svg$/u);
        if (flyerMatch && method==='GET') {
          const drop=await store.getDrop(flyerMatch[1]); if (!drop) return error('Drop not found.',404);
          const settings=await store.getSettings(); const format=url.searchParams.get('format')||'letter';
          const photo=drop.photos.find(item=>item.isCover)||drop.photos.find(item=>item.status==='approved');
          const svg=createFlyerSvg({drop,settings,format,photoDataUri:await photoDataUri(store,photo)});
          return new Response(svg,{headers:{'content-type':'image/svg+xml; charset=utf-8','content-disposition':`attachment; filename="${drop.slug}-${format}-flyer.svg"`}});
        }
        return error('Studio endpoint not found.',404);
      }
      return null;
    } catch (cause) {
      console.error(cause);
      return error(cause instanceof Error?cause.message:'Unexpected server error.',500);
    }
  };
}
