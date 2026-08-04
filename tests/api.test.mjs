import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { LocalStore } from '../src/local/store.mjs';
import { createApiHandler } from '../src/core/api.mjs';
import { hashPassword } from '../src/core/auth.mjs';

async function setup() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'charmnest-'));
  const store = new LocalStore({ dbPath: path.join(dir, 'db.sqlite'), uploadsDir: path.join(dir, 'uploads') });
  store.init();
  const env = {
    APP_ENV: 'development',
    SESSION_SECRET: '0123456789abcdef0123456789abcdef',
    MAKER_PASSWORD_HASH: await hashPassword('maker-password-123')
  };
  return { dir, store, handle: createApiHandler({ store, env }) };
}

async function login(handle, username = 'maker', password = 'maker-password-123') {
  const response = await handle(new Request('http://local/api/auth/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': `${username}-ip` },
    body: JSON.stringify({ username, password })
  }));
  const data = await response.json();
  if (response.status !== 200) return { response, data };
  return {
    response,
    data,
    auth: {
      cookie: response.headers.get('set-cookie').split(';')[0],
      csrf: data.session.csrf,
      session: data.session
    }
  };
}

function request(url, { method = 'GET', body, auth } = {}) {
  const headers = {};
  if (body) headers['content-type'] = 'application/json';
  if (auth) {
    headers.cookie = auth.cookie;
    headers['x-csrf-token'] = auth.csrf;
  }
  return new Request(`http://local${url}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });
}

const drop = {
  name: 'Spooky Vibes', slug: 'spooky-vibes', month: 'October', year: 2026,
  headline: 'Orange and black', publicNotes: 'Limited seasonal drop.',
  privateNotes: 'Keep two ghost charms for custom orders.', colors: ['Orange', 'Black'],
  colorHexes: ['#ff7a00', '#111111'], featuredCharm: 'Ghost', beadedAvailable: true,
  braidedAvailable: true, quantity: 20, schoolPriceCents: 200, customPriceCents: 300,
  onlinePriceMinCents: 800, onlinePriceMaxCents: 1500, releaseDate: '2026-10-01',
  endDate: '2026-10-31', tiktokUrl: '', etsyUrl: '', status: 'published'
};

const localBracelet = {
  firstName: 'Ava', contactEmail: 'adult@example.com', phone: '(901) 555-0112', requestedEmployee: '', productType: 'bracelet',
  orderType: 'custom', braceletStyle: 'beaded', quantity: 2, colors: ['Pink', 'Gold'],
  charm: 'Heart', nameWord: 'BESTIE', size: 'standard', giftPackaging: false,
  neededBy: '', notes: 'Matching pair', fulfillmentMethod: 'pickup', shippingAddress: {}, consent: true
};

test('Maker Studio performs former adult operations and publishes directly', async () => {
  const { handle } = await setup();
  const { auth } = await login(handle);
  let response = await handle(request('/api/studio/drops', { method: 'POST', body: drop, auth }));
  assert.equal(response.status, 201);
  let data = await response.json();
  assert.equal(data.drop.status, 'published');

  response = await handle(request('/api/public/drop'));
  data = await response.json();
  assert.equal(data.drop.name, 'Spooky Vibes');
  assert.equal('privateNotes' in data.drop, false);

  const photoBody = {
    originalName: 'bracelet.png', mimeType: 'image/png', altText: 'Bracelet on wrist', caption: '',
    noFacesConfirmed: true, originalBase64: 'AQID', webBase64: 'AQID', thumbBase64: 'AQID'
  };
  response = await handle(request('/api/studio/photos', { method: 'POST', body: photoBody, auth }));
  data = await response.json();
  response = await handle(request(`/api/studio/photos/${data.photo.id}/decision`, { method: 'POST', body: { decision: 'approve' }, auth }));
  assert.equal(response.status, 200);
  assert.equal((await response.json()).photo.status, 'approved');
});

test('Adult login is no longer an active Studio lane', async () => {
  const { handle } = await setup();
  const { response } = await login(handle, 'adult', 'maker-password-123');
  assert.equal(response.status, 401);
});

test('Local bracelet estimates use $2 monthly-drop and $3 custom pricing', async () => {
  const { handle } = await setup();
  let response = await handle(request('/api/orders', { method: 'POST', body: localBracelet }));
  let data = await response.json();
  assert.equal(response.status, 201);
  assert.equal(data.order.estimatedCents, 600);
  assert.equal(data.order.estimateComplete, true);

  response = await handle(request('/api/orders', {
    method: 'POST',
    body: { ...localBracelet, orderType: 'monthly-drop', braceletStyle: 'braided', quantity: 2 }
  }));
  data = await response.json();
  assert.equal(data.order.estimatedCents, 400);
  assert.equal(data.order.estimateComplete, true);
});

test('Shipping requires a complete address and public receipts do not expose it', async () => {
  const { handle } = await setup();
  let response = await handle(request('/api/orders', {
    method: 'POST',
    body: { ...localBracelet, fulfillmentMethod: 'shipping', shippingAddress: {} }
  }));
  assert.equal(response.status, 422);

  response = await handle(request('/api/orders', {
    method: 'POST',
    body: {
      ...localBracelet,
      fulfillmentMethod: 'shipping',
      shippingAddress: { address1: '123 Main St', address2: 'Apt 2', city: 'Memphis', state: 'TN', zip: '38103' }
    }
  }));
  const data = await response.json();
  assert.equal(response.status, 201);
  assert.equal(data.order.contactEmail, 'a***@example.com');
  assert.equal('shippingAddress' in data.order, false);
  assert.equal(data.order.estimateComplete, false);
});

test('Button orders remain quote-required until pricing is configured', async () => {
  const { handle, store } = await setup();
  const buttonOrder = {
    firstName: 'Nia', contactEmail: 'parent@example.com', phone: '901-555-0199', requestedEmployee: 'brooklyn', productType: 'button', quantity: 25,
    buttonOccasion: 'Graduation', buttonText: 'Class of 2026', themeColors: 'Pink and gold',
    artworkReady: true, designInstructions: 'Round buttons with stars.', neededBy: '2026-05-20',
    notes: '', fulfillmentMethod: 'pickup', shippingAddress: {}, consent: true
  };
  let response = await handle(request('/api/orders', { method: 'POST', body: buttonOrder }));
  let data = await response.json();
  assert.equal(response.status, 201);
  assert.equal(data.order.productType, 'button');
  assert.equal(data.order.estimateComplete, false);

  store.updateSettings({ buttonUnitCents: 250, buttonSetupFeeCents: 500 }, { username: 'maker', role: 'maker' });
  response = await handle(request('/api/orders', { method: 'POST', body: buttonOrder }));
  data = await response.json();
  assert.equal(data.order.estimateComplete, true);
  assert.equal(data.order.estimatedCents, 6750);
});

test('Maker sees private shipping data and can record cash or Cash App payment', async () => {
  const { handle, store } = await setup();
  store.updateSettings({ shippedCustomBraceletCents: 500, shippingFeeCents: 600 }, { username: 'maker', role: 'maker' });
  const response = await handle(request('/api/orders', {
    method: 'POST',
    body: {
      ...localBracelet,
      fulfillmentMethod: 'shipping',
      shippingAddress: { address1: '123 Main St', address2: '', city: 'Memphis', state: 'TN', zip: '38103' }
    }
  }));
  const created = await response.json();
  const { auth } = await login(handle);

  let studioResponse = await handle(request('/api/studio/dashboard', { auth }));
  let dashboard = await studioResponse.json();
  const order = dashboard.orders.find(item => item.id === created.order.id);
  assert.equal(order.shippingAddress.address1, '123 Main St');

  studioResponse = await handle(request(`/api/studio/orders/${order.id}/payment`, {
    method: 'POST',
    body: { paymentStatus: 'received', paymentMethod: 'cashapp', amountPaidCents: 1600, paidAt: '2026-08-03', paymentNote: 'Confirmed in Cash App.' },
    auth
  }));
  const paid = await studioResponse.json();
  assert.equal(studioResponse.status, 200);
  assert.equal(paid.order.paymentStatus, 'received');
  assert.equal(paid.order.paymentMethod, 'cashapp');
  assert.equal(paid.order.amountPaidCents, 1600);
});

test('Photo upload still requires explicit no-face confirmation', async () => {
  const { handle } = await setup();
  const { auth } = await login(handle);
  const body = {
    originalName: 'bracelet.png', mimeType: 'image/png', altText: 'Bracelet on wrist', caption: '',
    noFacesConfirmed: false, originalBase64: 'AQID', webBase64: 'AQID', thumbBase64: 'AQID'
  };
  let response = await handle(request('/api/studio/photos', { method: 'POST', body, auth }));
  assert.equal(response.status, 422);
  body.noFacesConfirmed = true;
  response = await handle(request('/api/studio/photos', { method: 'POST', body, auth }));
  assert.equal(response.status, 201);
});

test('Legacy bracelet orders remain readable after migration', async () => {
  const { store } = await setup();
  const now = new Date().toISOString();
  store.db.prepare('INSERT INTO orders(id,first_name,contact_email,bracelet_style,quantity,colors_json,charm,name_word,size,needed_by,gift_packaging,notes,estimated_cents,status,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)').run(
    'legacy_order', 'Mia', 'adult@example.com', 'braided', 1, '["Blue"]', '', '', 'standard', '', 0, 'Old order', 600, 'new', now, now
  );
  const order = store.getOrder('legacy_order', { includePrivate: true });
  assert.equal(order.productType, 'bracelet');
  assert.equal(order.braceletStyle, 'braided');
  assert.deepEqual(order.colors, ['Blue']);
});


test('Phone number is required, remains private publicly, and is searchable in Studio', async () => {
  const { handle } = await setup();
  let response = await handle(request('/api/orders', { method: 'POST', body: { ...localBracelet, phone: '' } }));
  assert.equal(response.status, 422);

  response = await handle(request('/api/orders', { method: 'POST', body: localBracelet }));
  const publicResult = await response.json();
  assert.equal(response.status, 201);
  assert.equal('phone' in publicResult.order, false);
  assert.equal('requestedEmployee' in publicResult.order, false);

  const { auth } = await login(handle);
  response = await handle(request('/api/studio/orders?view=work&q=555-0112', { auth }));
  const studioResult = await response.json();
  assert.equal(response.status, 200);
  assert.equal(studioResult.orders.length, 1);
  assert.equal(studioResult.orders[0].phone, '(901) 555-0112');
});

test('Cheyenne, Brooklyn, and no preference are accepted; unknown Maker values are rejected', async () => {
  const { handle } = await setup();
  for (const requestedEmployee of ['', 'cheyenne', 'brooklyn']) {
    const response = await handle(request('/api/orders', { method: 'POST', body: { ...localBracelet, requestedEmployee } }));
    assert.equal(response.status, 201);
  }
  const rejected = await handle(request('/api/orders', { method: 'POST', body: { ...localBracelet, requestedEmployee: 'someone-else' } }));
  assert.equal(rejected.status, 422);

  const { auth } = await login(handle);
  const noPreference = await (await handle(request('/api/studio/orders?requestedEmployee=none', { auth }))).json();
  assert.equal(noPreference.orders.length, 1);
  assert.equal(noPreference.orders[0].requestedEmployee, '');
});

test('Order views separate work, ready, paid, and archive without hiding paid unfinished work', async () => {
  const { handle } = await setup();
  const first = await (await handle(request('/api/orders', { method: 'POST', body: localBracelet }))).json();
  const second = await (await handle(request('/api/orders', { method: 'POST', body: { ...localBracelet, firstName: 'Ready' } }))).json();
  const third = await (await handle(request('/api/orders', { method: 'POST', body: { ...localBracelet, firstName: 'Done' } }))).json();
  const { auth } = await login(handle);

  await handle(request(`/api/studio/orders/${first.order.id}/payment`, {
    method: 'POST', body: { paymentStatus: 'received', paymentMethod: 'cash', amountPaidCents: 600, paidAt: '2026-08-03', paymentNote: '' }, auth
  }));
  await handle(request(`/api/studio/orders/${second.order.id}/status`, { method: 'POST', body: { status: 'ready' }, auth }));
  await handle(request(`/api/studio/orders/${third.order.id}/status`, { method: 'POST', body: { status: 'completed' }, auth }));

  const work = await (await handle(request('/api/studio/orders?view=work', { auth }))).json();
  const ready = await (await handle(request('/api/studio/orders?view=ready', { auth }))).json();
  const paid = await (await handle(request('/api/studio/orders?view=paid', { auth }))).json();
  const archive = await (await handle(request('/api/studio/orders?view=archive', { auth }))).json();
  assert.equal(work.orders.some(order => order.id === first.order.id), true);
  assert.equal(paid.orders.some(order => order.id === first.order.id), true);
  assert.equal(ready.orders.some(order => order.id === second.order.id), true);
  assert.equal(archive.orders.some(order => order.id === third.order.id), true);
});

test('Photo placement is saved, public only after approval, and can attach to a monthly drop', async () => {
  const { handle } = await setup();
  const { auth } = await login(handle);
  const createdDrop = await (await handle(request('/api/studio/drops', { method: 'POST', body: drop, auth }))).json();
  const photoBody = {
    originalName: 'hero.png', mimeType: 'image/png', altText: 'CharmNest products', caption: 'New creations',
    noFacesConfirmed: true, placement: 'hero', placementDropId: '', originalBase64: 'AQID', webBase64: 'AQID', thumbBase64: 'AQID'
  };
  let response = await handle(request('/api/studio/photos', { method: 'POST', body: photoBody, auth }));
  let data = await response.json();
  const photoId = data.photo.id;

  response = await handle(request('/api/public/photos'));
  data = await response.json();
  assert.equal(data.photos.length, 0);

  await handle(request(`/api/studio/photos/${photoId}/decision`, { method: 'POST', body: { decision: 'approve' }, auth }));
  response = await handle(request('/api/public/photos'));
  data = await response.json();
  assert.equal(data.photos[0].placement, 'hero');
  assert.equal('originalName' in data.photos[0], false);
  assert.equal('uploadedBy' in data.photos[0], false);

  response = await handle(request(`/api/studio/photos/${photoId}`, {
    method: 'PUT', body: { altText: 'Monthly drop bracelets', caption: '', placement: 'monthly-drop', placementDropId: createdDrop.drop.id }, auth
  }));
  data = await response.json();
  assert.equal(data.photo.placement, 'monthly-drop');
  assert.equal(data.photo.placementDropId, createdDrop.drop.id);
  const current = await (await handle(request('/api/public/drop'))).json();
  assert.equal(current.drop.photos.some(photo => photo.id === photoId), true);
});

test('Private Studio notes save without appearing in public order receipts', async () => {
  const { handle } = await setup();
  const created = await (await handle(request('/api/orders', { method: 'POST', body: localBracelet }))).json();
  assert.equal('internalNote' in created.order, false);
  const { auth } = await login(handle);
  const response = await handle(request(`/api/studio/orders/${created.order.id}/internal-note`, {
    method: 'POST', body: { internalNote: 'Call before local pickup.' }, auth
  }));
  const data = await response.json();
  assert.equal(response.status, 200);
  assert.equal(data.order.internalNote, 'Call before local pickup.');
  assert.ok(data.savedAt);
});
