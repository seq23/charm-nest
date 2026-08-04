import { createSession, verifyPassword, verifySession, parseCookies, sessionCookie, clearSessionCookie } from './auth.mjs';
import { DROP_STATUSES, LOGO_OPTIONS, ORDER_STATUSES, PHOTO_PLACEMENTS } from './constants.mjs';
import {
  validateDrop,
  validateInternalNote,
  validateOrder,
  validatePayment,
  validatePhoto,
  validatePhotoUpdate,
  validateSettings
} from './validation.mjs';
import { createFlyerSvg } from './flyer.mjs';

const JSON_HEADERS = {
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'no-store',
  'x-content-type-options': 'nosniff'
};

function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), { status, headers: { ...JSON_HEADERS, ...headers } });
}

function error(message, status = 400, details = []) {
  return json({ ok: false, error: message, details }, status);
}

function ok(data = {}, status = 200, headers = {}) {
  return json({ ok: true, ...data }, status, headers);
}

function saved(data = {}, status = 200) {
  return ok({ ...data, savedAt: new Date().toISOString() }, status);
}

function clientKey(request) {
  return request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for') || 'local';
}

function isSecure(request, env) {
  return new URL(request.url).protocol === 'https:' || env.APP_ENV === 'production';
}

function sameOrigin(request) {
  const origin = request.headers.get('origin');
  return !origin || origin === new URL(request.url).origin;
}

async function bodyJson(request, maxBytes = 12_000_000) {
  const length = Number(request.headers.get('content-length') || 0);
  if (length > maxBytes) throw new Error('Request is too large.');
  const text = await request.text();
  if (text.length > maxBytes) throw new Error('Request is too large.');
  return text ? JSON.parse(text) : {};
}

function base64Bytes(value) {
  const normalized = String(value || '').replace(/^data:[^;]+;base64,/u, '');
  if (!normalized) return new Uint8Array();
  const binary = atob(normalized);
  return Uint8Array.from(binary, char => char.charCodeAt(0));
}

async function authContext(request, env) {
  const token = parseCookies(request).charmnest_session;
  return verifySession(token, env.SESSION_SECRET);
}

function requireStudio(session) {
  if (!session) return error('Sign in to continue.', 401);
  if (session.role !== 'maker') return error('Maker Studio access is required.', 403);
  return null;
}

function requireMutation(request, session) {
  if (!sameOrigin(request)) return error('Request origin was rejected.', 403);
  if (!session || request.headers.get('x-csrf-token') !== session.csrf) {
    return error('Your session check failed. Refresh the page and try again.', 403);
  }
  return null;
}

function publicDrop(drop) {
  if (!drop) return null;
  const { privateNotes, createdBy, ...safe } = drop;
  return safe;
}

function publicPhoto(photo) {
  return {
    id: photo.id,
    altText: photo.altText,
    caption: photo.caption,
    placement: photo.placement,
    placementDropId: photo.placementDropId,
    webUrl: photo.webUrl,
    thumbUrl: photo.thumbUrl
  };
}

function publicPaymentSettings(settings, order) {
  const available = Boolean(settings.cashAppHandle || settings.cashAppQrUrl);
  return {
    available,
    canPayNow: available && Boolean(order.estimateComplete),
    cashAppHandle: settings.cashAppHandle || '',
    cashAppQrUrl: settings.cashAppQrUrl || '',
    instructions: settings.paymentInstructions || '',
    amountCents: order.estimatedCents,
    waitForConfirmation: !order.estimateComplete
  };
}

function filterOrders(orders, url) {
  let filtered = [...orders];
  const view = url.searchParams.get('view') || '';
  if (view === 'work') filtered = filtered.filter(order => ['new', 'confirmed', 'making'].includes(order.status));
  if (view === 'ready') filtered = filtered.filter(order => order.status === 'ready');
  if (view === 'paid') filtered = filtered.filter(order => order.paymentStatus === 'received');
  if (view === 'archive') filtered = filtered.filter(order => ['completed', 'cancelled'].includes(order.status));

  const exactFilters = [
    ['status', 'status'],
    ['paymentStatus', 'paymentStatus'],
    ['paymentMethod', 'paymentMethod'],
    ['productType', 'productType'],
    ['requestedEmployee', 'requestedEmployee'],
    ['fulfillmentMethod', 'fulfillmentMethod']
  ];
  for (const [parameter, property] of exactFilters) {
    const value = url.searchParams.get(parameter);
    if (parameter === 'requestedEmployee' && value === 'none') filtered = filtered.filter(order => !order.requestedEmployee);
    else if (value) filtered = filtered.filter(order => String(order[property] || '') === value);
  }

  const query = String(url.searchParams.get('q') || '').trim().toLowerCase();
  if (query) {
    filtered = filtered.filter(order => [order.id, order.firstName, order.contactEmail, order.phone]
      .some(value => String(value || '').toLowerCase().includes(query)));
  }
  return filtered;
}

async function photoDataUri(store, photo) {
  if (!photo?.webKey) return '';
  const media = await store.getMedia(photo.webKey);
  if (!media) return '';
  let binary = '';
  for (const byte of media.bytes) binary += String.fromCharCode(byte);
  return `data:${media.type};base64,${btoa(binary)}`;
}

export function createApiHandler({ store, env }) {
  return async function handle(request) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method.toUpperCase();

    try {
      if (path === '/api/public/settings' && method === 'GET') {
        const settings = await store.getSettings();
        const active = LOGO_OPTIONS.find(item => item.id === settings.activeLogo) || LOGO_OPTIONS[0];
        return ok({ settings: { ...settings, activeLogoUrl: active.url } });
      }

      if (path === '/api/public/photos' && method === 'GET') {
        const photos = (await store.listPhotos({ includePrivate: false }))
          .filter(photo => photo.placement && photo.placement !== 'unassigned')
          .map(publicPhoto);
        return ok({ photos });
      }

      if (path === '/api/public/drop' && method === 'GET') {
        return ok({ drop: publicDrop(await store.getCurrentDrop()) });
      }

      if (path === '/api/public/drops' && method === 'GET') {
        return ok({ drops: (await store.listDrops({ includePrivate: false })).map(publicDrop) });
      }

      if (path === '/api/orders' && method === 'POST') {
        const settings = await store.getSettings();
        const { data, errors } = validateOrder(await bodyJson(request, 120_000), settings);
        if (errors.length) return error('Please correct the order form.', 422, errors);
        const order = await store.createOrder(data);
        return ok({ order, payment: publicPaymentSettings(settings, order) }, 201);
      }

      if (path === '/api/auth/login' && method === 'POST') {
        const key = clientKey(request);
        const limit = await store.checkLoginLimit(key);
        if (!limit.allowed) return error(`Too many attempts. Try again in ${limit.retryAfter} seconds.`, 429);

        const input = await bodyJson(request, 20_000);
        const requestedUsername = String(input.username || 'maker').trim().toLowerCase();
        const validUser = requestedUsername === 'maker';
        const validPassword = validUser && await verifyPassword(String(input.password || ''), env.MAKER_PASSWORD_HASH);
        await store.recordLogin(key, Boolean(validPassword));

        if (!validPassword) {
          await store.log({ username: requestedUsername || 'unknown', role: 'unknown' }, 'auth.login.failed', 'auth', '', { clientKey: key });
          return error('The Studio password is not correct.', 401);
        }

        const { token, payload } = await createSession({ username: 'maker', role: 'maker', secret: env.SESSION_SECRET });
        await store.log(payload, 'auth.login.success', 'auth', '', {});
        return ok(
          { session: { username: payload.username, role: payload.role, csrf: payload.csrf } },
          200,
          { 'set-cookie': sessionCookie(token, { secure: isSecure(request, env) }) }
        );
      }

      if (path === '/api/auth/session' && method === 'GET') {
        const session = await authContext(request, env);
        return session && session.role === 'maker'
          ? ok({ session: { username: session.username, role: session.role, csrf: session.csrf } })
          : error('Not signed in.', 401);
      }

      if (path === '/api/auth/logout' && method === 'POST') {
        return ok({}, 200, { 'set-cookie': clearSessionCookie({ secure: isSecure(request, env) }) });
      }

      if (path.startsWith('/api/studio/')) {
        const session = await authContext(request, env);
        const roleError = requireStudio(session);
        if (roleError) return roleError;
        if (method !== 'GET') {
          const mutationError = requireMutation(request, session);
          if (mutationError) return mutationError;
        }

        if (path === '/api/studio/dashboard' && method === 'GET') {
          const [drops, photos, orders, activity, settings] = await Promise.all([
            store.listDrops({ includePrivate: true }),
            store.listPhotos({ includePrivate: true }),
            store.listOrders({ includePrivate: true }),
            store.listActivity(50),
            store.getSettings()
          ]);
          return ok({
            session: { username: session.username, role: session.role, csrf: session.csrf },
            drops,
            photos,
            orders,
            activity,
            settings,
            logoOptions: LOGO_OPTIONS,
            photoPlacements: PHOTO_PLACEMENTS
          });
        }

        if (path === '/api/studio/drops' && method === 'GET') {
          return ok({ drops: await store.listDrops({ includePrivate: true }) });
        }

        if (path === '/api/studio/drops' && method === 'POST') {
          const { data, errors } = validateDrop(await bodyJson(request, 100_000));
          if (errors.length) return error('Please correct the drop form.', 422, errors);
          return saved({ drop: await store.createDrop(data, session) }, 201);
        }

        const dropMatch = path.match(/^\/api\/studio\/drops\/([^/]+)$/u);
        if (dropMatch && method === 'GET') {
          const drop = await store.getDrop(dropMatch[1]);
          return drop ? ok({ drop }) : error('Drop not found.', 404);
        }

        if (dropMatch && method === 'PUT') {
          const { data, errors } = validateDrop(await bodyJson(request, 100_000));
          if (errors.length) return error('Please correct the drop form.', 422, errors);
          const current = await store.getDrop(dropMatch[1]);
          if (!current) return error('Drop not found.', 404);
          return saved({ drop: await store.updateDrop(dropMatch[1], data, session) });
        }

        const statusMatch = path.match(/^\/api\/studio\/drops\/([^/]+)\/status$/u);
        if (statusMatch && method === 'POST') {
          const input = await bodyJson(request, 20_000);
          const status = String(input.status || '');
          if (!DROP_STATUSES.includes(status)) return error('Invalid drop status.', 422);
          const drop = await store.setDropStatus(statusMatch[1], status, session);
          return drop ? saved({ drop }) : error('Drop not found.', 404);
        }

        if (path === '/api/studio/photos' && method === 'GET') {
          return ok({ photos: await store.listPhotos({ includePrivate: true }) });
        }

        if (path === '/api/studio/photos' && method === 'POST') {
          const input = await bodyJson(request, 25_000_000);
          const { data, errors } = validatePhoto(input);
          if (errors.length) return error('Please correct the photo details.', 422, errors);
          if (data.placement === 'monthly-drop' && !await store.getDrop(data.placementDropId)) return error('The selected drop was not found.', 422);
          const variants = {
            original: base64Bytes(input.originalBase64),
            web: base64Bytes(input.webBase64),
            thumb: base64Bytes(input.thumbBase64)
          };
          if (!variants.original.length || !variants.web.length || !variants.thumb.length) return error('All photo versions are required.', 422);
          if (variants.original.length > 8_000_000) return error('The original photo must be 8 MB or smaller.', 413);
          let photo = await store.savePhoto({ meta: data, variants }, session);
          if (data.placement === 'monthly-drop') photo = await store.updatePhoto(photo.id, data, session);
          return saved({ photo }, 201);
        }

        const photoMatch = path.match(/^\/api\/studio\/photos\/([^/]+)$/u);
        if (photoMatch && method === 'PUT') {
          const input = await bodyJson(request, 40_000);
          const { data, errors } = validatePhotoUpdate(input);
          if (errors.length) return error('Please correct the photo details.', 422, errors);
          if (data.placement === 'monthly-drop' && !await store.getDrop(data.placementDropId)) return error('The selected drop was not found.', 422);
          const photo = await store.updatePhoto(photoMatch[1], data, session);
          return photo ? saved({ photo }) : error('Photo not found.', 404);
        }

        const photoDecision = path.match(/^\/api\/studio\/photos\/([^/]+)\/decision$/u);
        if (photoDecision && method === 'POST') {
          const input = await bodyJson(request, 20_000);
          const decision = ['approve', 'reject', 'archive'].includes(input.decision) ? input.decision : '';
          if (!decision) return error('Invalid photo decision.', 422);
          const photo = await store.approvePhoto(photoDecision[1], decision, session);
          return photo ? saved({ photo }) : error('Photo not found.', 404);
        }

        const attachMatch = path.match(/^\/api\/studio\/drops\/([^/]+)\/photos$/u);
        if (attachMatch && method === 'POST') {
          const input = await bodyJson(request, 20_000);
          const photo = await store.getPhoto(input.photoId);
          if (!photo) return error('Photo not found.', 404);
          if (photo.status !== 'approved') return error('Approve the photo before attaching it to a public drop.', 422);
          return saved({ drop: await store.attachPhoto(attachMatch[1], photo.id, { isCover: Boolean(input.isCover) }, session) });
        }

        if (path === '/api/studio/settings' && method === 'PUT') {
          const { data, errors } = validateSettings(await bodyJson(request, 100_000));
          if (errors.length) return error('Please correct the settings.', 422, errors);
          return saved({ settings: await store.updateSettings(data, session) });
        }

        if (path === '/api/studio/payment-qr' && method === 'POST') {
          const input = await bodyJson(request, 5_000_000);
          const mimeType = String(input.mimeType || '');
          if (!['image/jpeg', 'image/png', 'image/webp'].includes(mimeType)) return error('Cash App QR image must be JPEG, PNG, or WebP.', 422);
          const bytes = base64Bytes(input.base64);
          if (!bytes.length) return error('Cash App QR image is required.', 422);
          if (bytes.length > 3_000_000) return error('Cash App QR image must be 3 MB or smaller.', 413);
          return saved(await store.savePaymentQr({ bytes, mimeType }, session), 201);
        }

        if (path === '/api/studio/orders' && method === 'GET') {
          const orders = await store.listOrders({ includePrivate: true });
          return ok({ orders: filterOrders(orders, url) });
        }

        const orderStatus = path.match(/^\/api\/studio\/orders\/([^/]+)\/status$/u);
        if (orderStatus && method === 'POST') {
          const input = await bodyJson(request, 20_000);
          if (!ORDER_STATUSES.includes(input.status)) return error('Invalid order status.', 422);
          const order = await store.updateOrderStatus(orderStatus[1], input.status, session);
          return order ? saved({ order }) : error('Order not found.', 404);
        }

        const orderPayment = path.match(/^\/api\/studio\/orders\/([^/]+)\/payment$/u);
        if (orderPayment && method === 'POST') {
          const { data, errors } = validatePayment(await bodyJson(request, 20_000));
          if (errors.length) return error('Please correct the payment record.', 422, errors);
          const order = await store.updateOrderPayment(orderPayment[1], data, session);
          return order ? saved({ order }) : error('Order not found.', 404);
        }

        const orderInternalNote = path.match(/^\/api\/studio\/orders\/([^/]+)\/internal-note$/u);
        if (orderInternalNote && method === 'POST') {
          const { data } = validateInternalNote(await bodyJson(request, 20_000));
          const order = await store.updateOrderInternalNote(orderInternalNote[1], data.internalNote, session);
          return order ? saved({ order }) : error('Order not found.', 404);
        }

        const flyerMatch = path.match(/^\/api\/studio\/drops\/([^/]+)\/flyer\.svg$/u);
        if (flyerMatch && method === 'GET') {
          const drop = await store.getDrop(flyerMatch[1]);
          if (!drop) return error('Drop not found.', 404);
          const settings = await store.getSettings();
          const format = url.searchParams.get('format') || 'letter';
          const photo = drop.photos.find(item => item.isCover) || drop.photos.find(item => item.status === 'approved');
          const svg = createFlyerSvg({ drop, settings, format, photoDataUri: await photoDataUri(store, photo) });
          return new Response(svg, {
            headers: {
              'content-type': 'image/svg+xml; charset=utf-8',
              'content-disposition': `attachment; filename="${drop.slug}-${format}-flyer.svg"`
            }
          });
        }

        return error('Studio endpoint not found.', 404);
      }

      return null;
    } catch (cause) {
      console.error(cause);
      return error(cause instanceof Error ? cause.message : 'Unexpected server error.', 500);
    }
  };
}
