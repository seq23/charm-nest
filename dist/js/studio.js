(function () {
  const app = document.querySelector('#studio-app');
  const state = { session: null, csrf: '', data: null, view: 'dashboard' };
  const money = cents => `$${(Number(cents || 0) / 100).toFixed(2)}`;
  const escapeHtml = value => String(value ?? '').replace(/[&<>'"]/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  }[character]));

  async function api(path, options = {}) {
    const headers = { ...(options.headers || {}) };
    if (options.body && !headers['content-type']) headers['content-type'] = 'application/json';
    if (options.method && options.method !== 'GET') headers['x-csrf-token'] = state.csrf;
    const response = await fetch(path, { ...options, headers });
    const contentType = response.headers.get('content-type') || '';
    const data = contentType.includes('json') ? await response.json() : await response.text();
    if (!response.ok) throw new Error((data.details || [data.error || data]).join(' '));
    return data;
  }

  function toast(message) {
    document.querySelector('.toast')?.remove();
    const element = document.createElement('div');
    element.className = 'toast';
    element.textContent = message;
    document.body.append(element);
    setTimeout(() => element.remove(), 3500);
  }

  function statusClass(status) {
    return `status-pill status-${status}`;
  }

  function renderShell() {
    const items = [
      ['dashboard', 'Dashboard'],
      ['drops', 'Drops'],
      ['photos', 'Photos'],
      ['orders', 'Orders & Payments'],
      ['flyers', 'Flyer Builder'],
      ['brand', 'Brand, Pricing & Pay'],
      ['activity', 'Activity Log'],
      ['help', 'Help']
    ];
    app.innerHTML = `<div class="studio-shell"><aside class="studio-sidebar"><img class="studio-logo" src="/brand/logo-options/logo-03-beaded-badge-web.webp" alt="CharmNest"><nav class="studio-nav">${items.map(([id, label]) => `<button data-view="${id}" class="${state.view === id ? 'active' : ''}">${label}</button>`).join('')}</nav><div class="studio-account"><strong>Maker Studio</strong><div class="tiny">One operating lane</div><button id="logout" class="secondary" style="margin-top:10px">Log out</button></div></aside><main class="studio-main"><div id="studio-view"></div></main></div>`;
    document.querySelectorAll('[data-view]').forEach(button => button.addEventListener('click', () => {
      state.view = button.dataset.view;
      renderShell();
    }));
    document.querySelector('#logout').addEventListener('click', logout);
    renderView();
  }

  async function refresh() {
    state.data = await api('/api/studio/dashboard');
    state.session = state.data.session;
    state.csrf = state.session.csrf;
    document.querySelectorAll('.studio-logo').forEach(image => {
      const option = state.data.logoOptions.find(item => item.id === state.data.settings.activeLogo);
      image.src = option?.url || '/brand/logo-options/logo-03-beaded-badge-web.webp';
    });
  }

  async function renderView() {
    const view = document.querySelector('#studio-view');
    if (!view) return;
    view.innerHTML = '<div class="empty">Loading…</div>';
    try {
      await refresh();
      const renderer = {
        dashboard: dashboardView,
        drops: dropsView,
        photos: photosView,
        orders: ordersView,
        flyers: flyersView,
        brand: brandView,
        activity: activityView,
        help: helpView
      }[state.view] || dashboardView;
      view.innerHTML = renderer();
      bindView();
    } catch (error) {
      view.innerHTML = `<div class="empty">${escapeHtml(error.message)}</div>`;
    }
  }

  function top(title, subtitle, button = '') {
    return `<div class="studio-topbar"><div><h1>${title}</h1><p>${subtitle}</p></div>${button}</div>`;
  }

  function dropSummary(drop) {
    return `<div class="summary-row"><span class="${statusClass(drop.status)}">${drop.status}</span><h3>${escapeHtml(drop.name)}</h3><p class="tiny">${escapeHtml((drop.colors || []).join(' + ') || 'No colors yet')}</p><div class="studio-actions"><button class="secondary" data-action="edit-drop" data-id="${drop.id}">Edit</button>${drop.status !== 'published' ? `<button class="primary" data-action="set-status" data-status="published" data-id="${drop.id}">Publish</button>` : ''}</div></div>`;
  }

  function photoCard(photo) {
    return `<article class="photo-card"><img src="${photo.thumbUrl}" alt="${escapeHtml(photo.altText)}"><h3>${escapeHtml(photo.originalName)}</h3><p class="meta">${escapeHtml(photo.altText)}</p><span class="${statusClass(photo.status === 'approved' ? 'published' : photo.status === 'pending' ? 'review' : 'archived')}">${photo.status}</span>${photo.status === 'pending' ? `<div class="studio-actions" style="margin-top:8px"><button class="primary" data-action="photo-decision" data-decision="approve" data-id="${photo.id}">Approve</button><button class="danger" data-action="photo-decision" data-decision="reject" data-id="${photo.id}">Reject</button></div>` : ''}</article>`;
  }

  function dashboardView() {
    const data = state.data;
    const current = data.drops.find(item => item.status === 'published') || data.drops.find(item => item.status === 'sold-out');
    const drafts = data.drops.filter(item => ['draft', 'review'].includes(item.status));
    const unpaid = data.orders.filter(order => order.paymentStatus !== 'received').length;
    return `${top('Dashboard', 'One workspace for every CharmNest operation.', '<button class="primary" data-action="new-drop">+ Create New Drop</button>')}
      <div class="studio-grid cols-4">
        <article class="studio-card quick-card"><h3>Upload Photos</h3><p>Add safe product, hand, or wrist photos.</p><button class="primary" data-action="upload-photo">Upload now</button></article>
        <article class="studio-card quick-card"><h3>Review Orders</h3><p>${data.orders.length} total requests and ${unpaid} without recorded payment.</p><button class="secondary" data-action="go-orders">Open orders</button></article>
        <article class="studio-card quick-card"><h3>Edit Current Drop</h3><p>Update, publish, sell out, or archive.</p><button class="secondary" data-action="edit-drop" data-id="${current?.id || ''}" ${current ? '' : 'disabled'}>Edit drop</button></article>
        <article class="studio-card quick-card"><h3>View Website</h3><p>See what customers can see.</p><a class="primary" style="text-decoration:none;text-align:center" href="/" target="_blank">View site</a></article>
      </div>
      <div class="studio-grid cols-3" style="margin-top:18px">
        <article class="studio-card"><h2>Current Drop</h2>${current ? dropSummary(current) : '<div class="empty">No public drop yet.</div>'}</article>
        <article class="studio-card"><h2>Order Overview</h2><p><span class="metric">${data.orders.length}</span> requests</p><p>${data.orders.filter(order => order.productType === 'button').length} button/pin orders</p><p>${data.orders.filter(order => order.fulfillmentMethod === 'shipping').length} shipping orders</p><p>${data.orders.filter(order => order.paymentStatus === 'received').length} payments received</p></article>
        <article class="studio-card"><h2>Recent Activity</h2>${data.activity.slice(0, 7).map(activity => `<p class="tiny"><strong>${escapeHtml(activity.action)}</strong><br>${new Date(activity.created_at).toLocaleString()}</p>`).join('') || '<p>No activity yet.</p>'}</article>
      </div>
      <div class="studio-grid cols-2" style="margin-top:18px"><article class="studio-card"><h2>Drafts</h2>${drafts.map(dropSummary).join('') || '<div class="empty">No drafts.</div>'}</article><article class="studio-card"><h2>Latest Photos</h2><div class="photo-grid">${data.photos.slice(0, 4).map(photoCard).join('') || '<div class="empty">No photos yet.</div>'}</div></article></div>`;
  }

  function dropsView() {
    return `${top('Drops', 'Create, review, publish, sell out, and archive school drops.', '<button class="primary" data-action="new-drop">+ New Drop</button>')}<div class="studio-card table-wrap"><table class="studio-table"><thead><tr><th>Drop</th><th>Colors</th><th>Status</th><th>Dates</th><th>Actions</th></tr></thead><tbody>${state.data.drops.map(drop => `<tr><td><strong>${escapeHtml(drop.name)}</strong><br><span class="tiny">${escapeHtml(drop.headline)}</span></td><td>${escapeHtml((drop.colors || []).join(' + '))}</td><td><span class="${statusClass(drop.status)}">${drop.status}</span></td><td>${escapeHtml(drop.releaseDate || 'Not set')}<br><span class="tiny">${escapeHtml(drop.endDate || 'No end date')}</span></td><td><div class="studio-actions"><button class="secondary" data-action="edit-drop" data-id="${drop.id}">Edit</button><button class="secondary" data-action="preview-drop" data-id="${drop.id}">Preview</button>${drop.status !== 'published' ? `<button class="primary" data-action="set-status" data-status="published" data-id="${drop.id}">Publish</button>` : ''}${drop.status === 'published' ? `<button class="secondary" data-action="set-status" data-status="sold-out" data-id="${drop.id}">Sold out</button>` : ''}${drop.status !== 'archived' ? `<button class="danger" data-action="set-status" data-status="archived" data-id="${drop.id}">Archive</button>` : ''}</div></td></tr>`).join('') || '<tr><td colspan="5">No drops yet.</td></tr>'}</tbody></table></div>`;
  }

  function photosView() {
    return `${top('Photos', 'Upload, approve, reject, and archive public product photos.', '<button class="primary" data-action="upload-photo">Upload Photos</button>')}<div class="notice notice-pink"><strong>Public photo gate:</strong> Every upload requires a no-face confirmation. Approve only photos without faces, reflections, school-identifying details, or private information.</div><div class="photo-grid" style="margin-top:18px">${state.data.photos.map(photoCard).join('') || '<div class="empty">No photos uploaded.</div>'}</div>`;
  }

  function productLabel(order) {
    if (order.productType === 'button') return 'Custom button / pin';
    return order.orderType === 'monthly-drop' ? 'Monthly-drop bracelet' : 'Custom bracelet';
  }

  function productDetails(order) {
    const options = order.productOptions || {};
    if (order.productType === 'button') {
      return [options.occasion, options.buttonText, options.themeColors, options.designInstructions].filter(Boolean).map(escapeHtml).join('<br>');
    }
    return [options.braceletStyle, (options.colors || []).join(', '), options.nameWord, options.charm].filter(Boolean).map(escapeHtml).join('<br>');
  }

  function fulfillmentDetails(order) {
    const labels = { pickup: 'Local pickup', 'local-delivery': 'Local delivery', shipping: 'Shipping' };
    let details = labels[order.fulfillmentMethod] || order.fulfillmentMethod;
    if (order.fulfillmentMethod === 'shipping' && order.shippingAddress) {
      const address = [order.shippingAddress.address1, order.shippingAddress.address2, `${order.shippingAddress.city || ''}, ${order.shippingAddress.state || ''} ${order.shippingAddress.zip || ''}`].filter(Boolean);
      details += `<br><span class="tiny">${address.map(escapeHtml).join('<br>')}</span>`;
    }
    return details;
  }

  function paymentDate(order) {
    return order.paidAt ? String(order.paidAt).slice(0, 10) : new Date().toISOString().slice(0, 10);
  }

  function orderCard(order) {
    const options = order.productOptions || {};
    return `<article class="studio-card order-card"><div class="order-card-head"><div><span class="badge">${escapeHtml(productLabel(order))}</span><h2>${escapeHtml(order.firstName)} · ${order.quantity}</h2><p class="tiny">${escapeHtml(order.contactEmail)} · ${escapeHtml(order.id)}</p></div><span class="${statusClass(order.status)}">${order.status}</span></div><div class="order-detail-grid"><div><h3>Request</h3><p>${productDetails(order) || 'No product details.'}</p>${order.neededBy ? `<p><strong>Needed by:</strong> ${escapeHtml(order.neededBy)}</p>` : ''}${order.notes ? `<p class="tiny">${escapeHtml(order.notes)}</p>` : ''}</div><div><h3>Fulfillment</h3><p>${fulfillmentDetails(order)}</p><p><strong>Estimate:</strong> ${money(order.estimatedCents)} ${order.estimateComplete ? '' : 'known subtotal'}</p><p class="tiny">${escapeHtml(order.estimateNote)}</p></div></div><div class="order-controls"><label>Order status<select data-order-status="${order.id}">${['new', 'confirmed', 'making', 'ready', 'completed', 'cancelled'].map(status => `<option value="${status}" ${order.status === status ? 'selected' : ''}>${status}</option>`).join('')}</select></label><form class="payment-form" data-payment-order="${order.id}"><label>Payment status<select name="paymentStatus"><option value="unpaid" ${order.paymentStatus !== 'received' ? 'selected' : ''}>Unpaid</option><option value="received" ${order.paymentStatus === 'received' ? 'selected' : ''}>Received</option></select></label><label>Method<select name="paymentMethod"><option value="">Choose</option><option value="cash" ${order.paymentMethod === 'cash' ? 'selected' : ''}>Cash</option><option value="cashapp" ${order.paymentMethod === 'cashapp' ? 'selected' : ''}>Cash App</option></select></label><label>Amount received<input name="amountPaid" type="number" min="0" step="0.01" value="${(Number(order.amountPaidCents || 0) / 100).toFixed(2)}"></label><label>Date received<input name="paidAt" type="date" value="${paymentDate(order)}"></label><label class="full">Internal payment note<input name="paymentNote" value="${escapeHtml(order.paymentNote || '')}" placeholder="Optional receipt or note"></label><button class="primary" type="submit">Save payment</button></form></div></article>`;
  }

  function ordersView() {
    return `${top('Orders & Payments', 'Review customer details, fulfillment, shipping addresses, order status, and manual cash or Cash App receipts.')}<div class="notice notice-pink"><strong>Payment truth:</strong> This records what the Maker confirms. It does not automatically verify Cash App transactions.</div><div class="order-list">${state.data.orders.map(orderCard).join('') || '<div class="empty">No orders yet.</div>'}</div>`;
  }

  function flyersView() {
    const options = state.data.drops.map(drop => `<option value="${drop.id}">${escapeHtml(drop.name)}</option>`).join('');
    return `${top('Flyer Builder', 'Generate a printable flyer, square post, or vertical story from a drop.')}<div class="studio-grid cols-2"><section class="studio-card studio-form"><label>Drop<select id="flyer-drop">${options}</select></label><label>Format<select id="flyer-format"><option value="letter">Printable letter</option><option value="square">Square social post</option><option value="story">Vertical story</option></select></label><div class="studio-actions"><button class="primary" data-action="preview-flyer">Preview flyer</button><a id="download-flyer" class="secondary" href="#">Download SVG</a></div><div class="notice">The flyer uses the approved drop cover photo when available.</div></section><section class="studio-card"><iframe id="flyer-frame" class="flyer-frame" title="Flyer preview"></iframe></section></div>`;
  }

  function moneyInput(name, label, value, help) {
    return `<label>${label}<input name="${name}" type="number" min="0" step="1" value="${value === '' || value === undefined ? '' : Number(value)}" placeholder="Leave blank until confirmed"><span class="helper">${help}</span></label>`;
  }

  function brandView() {
    const settings = state.data.settings;
    return `${top('Brand, Pricing & Payment', 'Manage public links, pricing inputs, Cash App instructions, and the active logo.')}<form id="settings-form" class="studio-form"><h2>Brand & links</h2><div class="logo-grid">${state.data.logoOptions.map(logo => `<label class="logo-card ${settings.activeLogo === logo.id ? 'active' : ''}"><img src="${logo.url}" alt="${escapeHtml(logo.label)}"><span><input type="radio" name="activeLogo" value="${logo.id}" ${settings.activeLogo === logo.id ? 'checked' : ''}> ${escapeHtml(logo.label)}</span></label>`).join('')}</div><div class="form-grid"><label>Public contact email<input name="contactEmail" type="email" value="${escapeHtml(settings.contactEmail)}"></label><label>Website URL<input name="websiteUrl" type="url" value="${escapeHtml(settings.websiteUrl)}" placeholder="https://..."></label><label>TikTok URL<input name="tiktokUrl" type="url" value="${escapeHtml(settings.tiktokUrl)}" placeholder="https://www.tiktok.com/@..."></label><label>TikTok handle<input name="tiktokHandle" value="${escapeHtml(settings.tiktokHandle)}" placeholder="@charmnest"></label><label class="full">Etsy shop URL<input name="etsyUrl" type="url" value="${escapeHtml(settings.etsyUrl)}" placeholder="https://www.etsy.com/shop/..."></label></div><h2>Order pricing in cents</h2><div class="notice">Enter whole cents. Example: $3.00 = 300. Blank values remain quote-required and will not produce a fabricated total.</div><div class="form-grid">${moneyInput('localDropBraceletCents', 'Local monthly-drop bracelet', settings.localDropBraceletCents, 'Confirmed default: 200.')}${moneyInput('localCustomBraceletCents', 'Local custom bracelet', settings.localCustomBraceletCents, 'Confirmed default: 300.')}${moneyInput('localDeliveryFeeCents', 'Local delivery fee', settings.localDeliveryFeeCents, 'Use 0 only when delivery is free.')}${moneyInput('shippedCustomBraceletCents', 'Shipped custom bracelet unit price', settings.shippedCustomBraceletCents, 'Per bracelet before shipping.')}${moneyInput('shippingFeeCents', 'Shipping and handling fee', settings.shippingFeeCents, 'Added once per order.')}${moneyInput('buttonUnitCents', 'Button or pin unit price', settings.buttonUnitCents, 'Per button or pin.')}${moneyInput('buttonSetupFeeCents', 'Button setup or design fee', settings.buttonSetupFeeCents, 'Added once per order. Use 0 if none.')}${moneyInput('giftPackagingFeeCents', 'Gift packaging fee', settings.giftPackagingFeeCents, 'Added once when requested.')}</div><h2>Cash App</h2><div class="form-grid"><label>Cash App handle<input name="cashAppHandle" value="${escapeHtml(settings.cashAppHandle)}" placeholder="$CharmNest"></label><label>Cash App QR image<input name="cashAppQr" type="file" accept="image/jpeg,image/png,image/webp"><span class="helper">PNG, JPEG, or WebP; maximum 3 MB.</span></label><input type="hidden" name="cashAppQrUrl" value="${escapeHtml(settings.cashAppQrUrl)}"><label class="full">Public payment instructions<textarea name="paymentInstructions" rows="4">${escapeHtml(settings.paymentInstructions)}</textarea></label>${settings.cashAppQrUrl ? `<div class="full"><p><strong>Current QR code</strong></p><img class="settings-qr" src="${settings.cashAppQrUrl}" alt="Current Cash App QR code"></div>` : '<div class="full notice">No Cash App QR image has been uploaded.</div>'}</div><h2>Public notices</h2><div class="form-grid"><label class="full">School drop notice<textarea name="schoolDropNotice" rows="4">${escapeHtml(settings.schoolDropNotice)}</textarea></label><label class="full">School pricing notice<textarea name="schoolPricingNotice" rows="3">${escapeHtml(settings.schoolPricingNotice)}</textarea></label></div><button class="primary" type="submit">Save Brand, Pricing & Payment</button></form>`;
  }

  function activityView() {
    return `${top('Activity Log', 'A plain-language receipt of Studio actions.')}<div class="studio-card table-wrap"><table class="studio-table"><thead><tr><th>When</th><th>Who</th><th>Action</th><th>Item</th></tr></thead><tbody>${state.data.activity.map(activity => `<tr><td>${new Date(activity.created_at).toLocaleString()}</td><td>${escapeHtml(activity.actor)}</td><td>${escapeHtml(activity.action)}</td><td>${escapeHtml(activity.entity_type)} ${escapeHtml(activity.entity_id)}</td></tr>`).join('')}</tbody></table></div>`;
  }

  function helpView() {
    return `${top('Help', 'How to use the unified Maker Studio safely.')}<div class="studio-grid cols-2"><article class="studio-card"><h2>Drop workflow</h2><ol><li>Create or edit a drop.</li><li>Upload and approve safe product photos.</li><li>Review public copy, prices, dates, and inventory.</li><li>Publish, mark sold out, or archive.</li></ol></article><article class="studio-card"><h2>Order workflow</h2><ol><li>Review the product and fulfillment method.</li><li>Confirm any quote-required prices privately.</li><li>Update the order status.</li><li>Record cash or Cash App payment only after receipt.</li></ol></article><article class="studio-card"><h2>Button artwork</h2><p>Public customers do not upload personal photos. Confirm the request first, then use an adult-managed private channel for artwork.</p></article><article class="studio-card"><h2>Payment limits</h2><p>The Studio records manual payment confirmation. It does not connect to Cash App or prove a transfer automatically.</p></article></div>`;
  }

  function bindView() {
    document.querySelectorAll('[data-action="new-drop"]').forEach(button => button.addEventListener('click', () => openDropModal()));
    document.querySelectorAll('[data-action="edit-drop"]').forEach(button => button.addEventListener('click', () => {
      const drop = state.data.drops.find(item => item.id === button.dataset.id);
      if (drop) openDropModal(drop);
    }));
    document.querySelectorAll('[data-action="preview-drop"]').forEach(button => button.addEventListener('click', () => previewDrop(state.data.drops.find(item => item.id === button.dataset.id))));
    document.querySelectorAll('[data-action="set-status"]').forEach(button => button.addEventListener('click', () => setStatus(button.dataset.id, button.dataset.status)));
    document.querySelectorAll('[data-action="upload-photo"]').forEach(button => button.addEventListener('click', openPhotoModal));
    document.querySelectorAll('[data-action="photo-decision"]').forEach(button => button.addEventListener('click', () => photoDecision(button.dataset.id, button.dataset.decision)));
    document.querySelectorAll('[data-order-status]').forEach(select => select.addEventListener('change', () => orderStatus(select.dataset.orderStatus, select.value)));
    document.querySelectorAll('[data-payment-order]').forEach(form => form.addEventListener('submit', savePayment));
    document.querySelector('[data-action="go-orders"]')?.addEventListener('click', () => { state.view = 'orders'; renderShell(); });
    document.querySelector('#settings-form')?.addEventListener('submit', saveSettings);
    document.querySelector('[data-action="preview-flyer"]')?.addEventListener('click', updateFlyer);
    document.querySelector('#flyer-drop')?.addEventListener('change', updateFlyer);
    document.querySelector('#flyer-format')?.addEventListener('change', updateFlyer);
    if (state.view === 'flyers') updateFlyer();
  }

  function openModal(html) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `<div class="modal-card"><div class="modal-head"><h2>CharmNest Studio</h2><button class="close" aria-label="Close">×</button></div>${html}</div>`;
    document.body.append(modal);
    modal.querySelector('.close').onclick = () => modal.remove();
    modal.addEventListener('click', event => { if (event.target === modal) modal.remove(); });
    return modal;
  }

  function openDropModal(drop = {}) {
    const colors = drop.colors || [];
    const hexes = drop.colorHexes || [];
    const modal = openModal(`<form id="drop-form" class="studio-form"><div class="form-grid"><label>Drop name<input name="name" value="${escapeHtml(drop.name || '')}" required></label><label>URL slug<input name="slug" value="${escapeHtml(drop.slug || '')}" required></label><label>Month<input name="month" value="${escapeHtml(drop.month || '')}"></label><label>Year<input name="year" type="number" value="${drop.year || 2026}" min="2026"></label><label class="full">Short headline<input name="headline" value="${escapeHtml(drop.headline || '')}"></label><label class="full">Public note<textarea name="publicNotes" rows="4">${escapeHtml(drop.publicNotes || '')}</textarea></label><label class="full">Private Studio note<textarea name="privateNotes" rows="4">${escapeHtml(drop.privateNotes || '')}</textarea></label><label>Color 1<input name="color1" value="${escapeHtml(colors[0] || '')}"></label><label>Color 1 swatch<input name="hex1" type="color" value="${hexes[0] || '#ff7a00'}"></label><label>Color 2<input name="color2" value="${escapeHtml(colors[1] || '')}"></label><label>Color 2 swatch<input name="hex2" type="color" value="${hexes[1] || '#111111'}"></label><label>Color 3<input name="color3" value="${escapeHtml(colors[2] || '')}"></label><label>Color 3 swatch<input name="hex3" type="color" value="${hexes[2] || '#ff78b3'}"></label><label>Featured charm<input name="featuredCharm" value="${escapeHtml(drop.featuredCharm || '')}"></label><label>Planned quantity<input name="quantity" type="number" min="0" value="${drop.quantity || 0}"></label><label class="check-row"><input name="beadedAvailable" type="checkbox" ${drop.beadedAvailable !== false ? 'checked' : ''}> Beaded available</label><label class="check-row"><input name="braidedAvailable" type="checkbox" ${drop.braidedAvailable !== false ? 'checked' : ''}> Braided available</label><label>School price in cents<input name="schoolPriceCents" type="number" value="${drop.schoolPriceCents || 200}"></label><label>Custom price in cents<input name="customPriceCents" type="number" value="${drop.customPriceCents || 300}"></label><label>Release date<input name="releaseDate" type="date" value="${escapeHtml(drop.releaseDate || '')}"></label><label>End date<input name="endDate" type="date" value="${escapeHtml(drop.endDate || '')}"></label><label class="full">TikTok post URL<input name="tiktokUrl" type="url" value="${escapeHtml(drop.tiktokUrl || '')}"></label><label class="full">Etsy listing URL<input name="etsyUrl" type="url" value="${escapeHtml(drop.etsyUrl || '')}"></label><label>Status<select name="status">${['draft', 'review', 'published', 'sold-out', 'archived'].map(status => `<option value="${status}" ${drop.status === status ? 'selected' : ''}>${status}</option>`).join('')}</select></label></div><div class="notice">The Maker Studio can save and publish directly. Review public copy and photo safety before publishing.</div><button class="primary" type="submit">${drop.id ? 'Save changes' : 'Create drop'}</button></form>`);
    modal.querySelector('#drop-form').addEventListener('submit', async event => {
      event.preventDefault();
      const form = new FormData(event.target);
      const body = {
        name: form.get('name'), slug: form.get('slug'), month: form.get('month'), year: Number(form.get('year')),
        headline: form.get('headline'), publicNotes: form.get('publicNotes'), privateNotes: form.get('privateNotes'),
        colors: [form.get('color1'), form.get('color2'), form.get('color3')].filter(Boolean),
        colorHexes: [form.get('hex1'), form.get('hex2'), form.get('hex3')], featuredCharm: form.get('featuredCharm'),
        quantity: Number(form.get('quantity')), beadedAvailable: form.get('beadedAvailable') === 'on', braidedAvailable: form.get('braidedAvailable') === 'on',
        schoolPriceCents: Number(form.get('schoolPriceCents')), customPriceCents: Number(form.get('customPriceCents')),
        onlinePriceMinCents: Number(drop.onlinePriceMinCents || 0), onlinePriceMaxCents: Number(drop.onlinePriceMaxCents || 0),
        releaseDate: form.get('releaseDate'), endDate: form.get('endDate'), tiktokUrl: form.get('tiktokUrl'), etsyUrl: form.get('etsyUrl'), status: form.get('status')
      };
      try {
        await api(drop.id ? `/api/studio/drops/${drop.id}` : '/api/studio/drops', { method: drop.id ? 'PUT' : 'POST', body: JSON.stringify(body) });
        modal.remove();
        toast('Drop saved.');
        renderView();
      } catch (error) { toast(error.message); }
    });
  }

  function previewDrop(drop) {
    if (!drop) return;
    const photo = drop.photos?.find(item => item.isCover) || drop.photos?.[0];
    openModal(`<div class="drop-preview">${photo ? `<img src="${photo.webUrl}" alt="${escapeHtml(photo.altText)}">` : ''}<span class="${statusClass(drop.status)}">${drop.status}</span><h1>${escapeHtml(drop.name)}</h1><p>${escapeHtml(drop.publicNotes)}</p><div class="color-row">${(drop.colorHexes || []).map(hex => `<span class="color-dot" style="background:${hex}"></span>`).join('')}</div><p><strong>School drop:</strong> ${money(drop.schoolPriceCents)} &nbsp; <strong>Custom colors:</strong> ${money(drop.customPriceCents)}</p></div>`);
  }

  async function setStatus(id, status) {
    if (!confirm(`Change this drop to ${status}?`)) return;
    try {
      await api(`/api/studio/drops/${id}/status`, { method: 'POST', body: JSON.stringify({ status }) });
      toast(`Drop changed to ${status}.`);
      renderView();
    } catch (error) { toast(error.message); }
  }

  async function imageVariant(file, max, quality) {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    return new Promise(resolve => canvas.toBlob(resolve, 'image/webp', quality));
  }

  function toBase64(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result).split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  function openPhotoModal() {
    const modal = openModal(`<form id="photo-form" class="studio-form"><label>Product photo<input name="photo" type="file" accept="image/jpeg,image/png,image/webp" capture="environment" required></label><label>Photo description<input name="altText" required></label><label>Caption<input name="caption"></label><label class="check-row"><input name="noFacesConfirmed" type="checkbox" required> I confirm this image contains no face, partial face, or face reflection.</label><div class="notice notice-pink">Check the background for school names, badges, addresses, mirrors, and private information.</div><button class="primary" type="submit">Prepare and upload photo</button><p id="photo-progress"></p></form>`);
    modal.querySelector('#photo-form').addEventListener('submit', async event => {
      event.preventDefault();
      const form = new FormData(event.target);
      const file = form.get('photo');
      const progress = modal.querySelector('#photo-progress');
      try {
        progress.textContent = 'Creating website versions…';
        const web = await imageVariant(file, 1600, .84);
        const thumb = await imageVariant(file, 500, .78);
        progress.textContent = 'Uploading…';
        await api('/api/studio/photos', {
          method: 'POST',
          body: JSON.stringify({
            originalName: file.name, mimeType: file.type, altText: form.get('altText'), caption: form.get('caption'),
            noFacesConfirmed: form.get('noFacesConfirmed') === 'on', originalBase64: await toBase64(file), webBase64: await toBase64(web), thumbBase64: await toBase64(thumb)
          })
        });
        modal.remove();
        toast('Photo uploaded. Review and approve it before public use.');
        renderView();
      } catch (error) { progress.textContent = error.message; }
    });
  }

  async function photoDecision(id, decision) {
    try {
      await api(`/api/studio/photos/${id}/decision`, { method: 'POST', body: JSON.stringify({ decision }) });
      toast(`Photo ${decision === 'approve' ? 'approved' : 'updated'}.`);
      renderView();
    } catch (error) { toast(error.message); }
  }

  async function orderStatus(id, status) {
    try {
      await api(`/api/studio/orders/${id}/status`, { method: 'POST', body: JSON.stringify({ status }) });
      toast('Order status saved.');
      renderView();
    } catch (error) { toast(error.message); }
  }

  async function savePayment(event) {
    event.preventDefault();
    const form = new FormData(event.target);
    const id = event.target.dataset.paymentOrder;
    try {
      await api(`/api/studio/orders/${id}/payment`, {
        method: 'POST',
        body: JSON.stringify({
          paymentStatus: form.get('paymentStatus'),
          paymentMethod: form.get('paymentMethod'),
          amountPaidCents: Math.round(Number(form.get('amountPaid') || 0) * 100),
          paidAt: form.get('paidAt'),
          paymentNote: form.get('paymentNote')
        })
      });
      toast('Payment record saved.');
      renderView();
    } catch (error) { toast(error.message); }
  }

  async function saveSettings(event) {
    event.preventDefault();
    const formData = new FormData(event.target);
    const qrFile = formData.get('cashAppQr');
    formData.delete('cashAppQr');
    const body = Object.fromEntries(formData.entries());
    try {
      if (qrFile instanceof File && qrFile.size) {
        const qr = await api('/api/studio/payment-qr', {
          method: 'POST',
          body: JSON.stringify({ mimeType: qrFile.type, base64: await toBase64(qrFile) })
        });
        body.cashAppQrUrl = qr.url;
      }
      await api('/api/studio/settings', { method: 'PUT', body: JSON.stringify(body) });
      toast('Brand, pricing, and payment settings saved.');
      renderView();
    } catch (error) { toast(error.message); }
  }

  function updateFlyer() {
    const id = document.querySelector('#flyer-drop')?.value;
    const format = document.querySelector('#flyer-format')?.value || 'letter';
    if (!id) return;
    const url = `/api/studio/drops/${id}/flyer.svg?format=${format}`;
    const frame = document.querySelector('#flyer-frame');
    const download = document.querySelector('#download-flyer');
    if (frame) frame.src = url;
    if (download) download.href = url;
  }

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    location.reload();
  }

  async function resume() {
    try {
      const data = await api('/api/auth/session');
      state.session = data.session;
      state.csrf = data.session.csrf;
      renderShell();
    } catch {}
  }

  document.querySelector('#login-form')?.addEventListener('submit', async event => {
    event.preventDefault();
    const form = new FormData(event.target);
    const status = document.querySelector('#login-status');
    status.textContent = 'Signing in…';
    try {
      const data = await api('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username: 'maker', password: form.get('password') })
      });
      state.session = data.session;
      state.csrf = data.session.csrf;
      renderShell();
    } catch (error) { status.textContent = error.message; }
  });

  resume();
})();
