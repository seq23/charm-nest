(function () {
  const app = document.querySelector('#studio-app');
  const state = {
    session: null,
    csrf: '',
    data: null,
    view: 'dashboard',
    orderTab: 'work',
    orderFilters: {
      q: '', status: '', paymentStatus: '', paymentMethod: '', productType: '', requestedEmployee: '', fulfillmentMethod: ''
    }
  };

  const money = cents => `$${(Number(cents || 0) / 100).toFixed(2)}`;
  const escapeHtml = value => String(value ?? '').replace(/[&<>'"]/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  }[character]));
  const titleCase = value => String(value || '').replaceAll('-', ' ').replace(/\b\w/g, letter => letter.toUpperCase());
  const savedTime = value => value ? new Date(value).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

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
    const normalized = status === 'approved' ? 'published' : status === 'pending' ? 'review' : status === 'rejected' ? 'archived' : status;
    return `status-pill status-${normalized}`;
  }

  function saveState(id, label = 'No changes') {
    return `<span id="${id}" class="save-state save-idle" role="status" aria-live="polite">${label}</span>`;
  }

  function setSaveState(target, mode, message = '') {
    const element = typeof target === 'string' ? document.querySelector(`#${target}`) : target;
    if (!element) return;
    const defaults = {
      idle: 'No changes',
      dirty: 'Unsaved changes',
      saving: 'Saving…',
      saved: `Saved ✓ at ${savedTime()}`,
      error: 'Could not save — please try again'
    };
    element.className = `save-state save-${mode}`;
    element.textContent = message || defaults[mode] || defaults.idle;
  }

  function setBusy(form, busy) {
    form?.querySelectorAll('button[type="submit"], input[type="submit"]').forEach(button => { button.disabled = busy; });
  }

  function trackForm(form, stateElement) {
    if (!form || !stateElement) return;
    const dirty = () => setSaveState(stateElement, 'dirty');
    form.addEventListener('input', dirty);
    form.addEventListener('change', dirty);
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
    return `<div class="summary-row"><span class="${statusClass(drop.status)}">${escapeHtml(drop.status)}</span><h3>${escapeHtml(drop.name)}</h3><p class="tiny">${escapeHtml((drop.colors || []).join(' + ') || 'No colors yet')}</p><div class="studio-actions"><button class="secondary" data-action="edit-drop" data-id="${drop.id}">Edit</button>${drop.status !== 'published' ? `<button class="primary" data-action="set-status" data-status="published" data-id="${drop.id}">Publish</button>` : ''}</div></div>`;
  }

  function dashboardView() {
    const data = state.data;
    const current = data.drops.find(item => item.status === 'published') || data.drops.find(item => item.status === 'sold-out');
    const work = data.orders.filter(order => ['new', 'confirmed', 'making'].includes(order.status)).length;
    const ready = data.orders.filter(order => order.status === 'ready').length;
    const unpaid = data.orders.filter(order => order.paymentStatus !== 'received').length;
    return `${top('Dashboard', 'One workspace for every CharmNest operation.', '<button class="primary" data-action="new-drop">+ Create New Drop</button>')}
      <div class="studio-grid cols-4">
        <article class="studio-card quick-card"><h3>Upload Photos</h3><p>Add safe product, hand, or wrist photos and choose where they appear.</p><button class="primary" data-action="upload-photo">Upload now</button></article>
        <article class="studio-card quick-card"><h3>Work Queue</h3><p>${work} orders still being confirmed or made.</p><button class="secondary" data-action="go-orders" data-order-tab="work">Open work queue</button></article>
        <article class="studio-card quick-card"><h3>Ready Items</h3><p>${ready} orders ready for pickup, delivery, or shipping.</p><button class="secondary" data-action="go-orders" data-order-tab="ready">Open ready items</button></article>
        <article class="studio-card quick-card"><h3>View Website</h3><p>See what customers can see.</p><a class="primary" style="text-decoration:none;text-align:center" href="/" target="_blank">View site</a></article>
      </div>
      <div class="studio-grid cols-3" style="margin-top:18px">
        <article class="studio-card"><h2>Current Drop</h2>${current ? dropSummary(current) : '<div class="empty">No public drop yet.</div>'}</article>
        <article class="studio-card"><h2>Order Overview</h2><p><span class="metric">${data.orders.length}</span> total requests</p><p>${work} in the Work Queue</p><p>${ready} ready</p><p>${unpaid} unpaid</p></article>
        <article class="studio-card"><h2>Recent Activity</h2>${data.activity.slice(0, 7).map(activity => `<p class="tiny"><strong>${escapeHtml(activity.action)}</strong><br>${new Date(activity.created_at).toLocaleString()}</p>`).join('') || '<p>No activity yet.</p>'}</article>
      </div>`;
  }

  function dropsView() {
    const instructions = [
      ['1', 'Create the drop', 'Add the name, date, colors, bracelet styles, quantity, and public description.'],
      ['2', 'Add or choose photos', 'Use Photos to approve an image and set its location to Monthly Drop.'],
      ['3', 'Save as a draft', 'Drafts stay private while you prepare them.'],
      ['4', 'Publish the drop', 'Published drops appear on the public Monthly Drop page.'],
      ['5', 'Mark it sold out', 'The drop stays visible but clearly shows Sold Out.'],
      ['6', 'Archive it', 'Archived drops leave the active public list but remain saved here.']
    ];
    return `${top('Drops', 'Follow the steps below to create and control each monthly collection.', '<button class="primary" data-action="new-drop">+ New Drop</button>')}
      <section class="studio-card"><h2>How Drops Work</h2><div class="instruction-grid">${instructions.map(([number, title, copy]) => `<article class="instruction-step"><span>${number}</span><div><h3>${title}</h3><p>${copy}</p></div></article>`).join('')}</div><div class="status-guide"><p><strong>Draft:</strong> private and still being prepared.</p><p><strong>Published:</strong> live on the website.</p><p><strong>Sold out:</strong> visible, but no longer shown as available.</p><p><strong>Archived:</strong> saved privately and removed from the active public list.</p></div></section>
      <div id="drop-action-state" class="action-state-wrap">${saveState('drop-action-save-state')}</div>
      <div class="studio-card table-wrap"><table class="studio-table"><thead><tr><th>Drop</th><th>Colors</th><th>Status</th><th>Dates</th><th>Actions</th></tr></thead><tbody>${state.data.drops.map(drop => `<tr><td><strong>${escapeHtml(drop.name)}</strong><br><span class="tiny">${escapeHtml(drop.headline)}</span></td><td>${escapeHtml((drop.colors || []).join(' + '))}</td><td><span class="${statusClass(drop.status)}">${escapeHtml(drop.status)}</span></td><td>${escapeHtml(drop.releaseDate || 'Not set')}<br><span class="tiny">${escapeHtml(drop.endDate || 'No end date')}</span></td><td><div class="studio-actions"><button class="secondary" data-action="edit-drop" data-id="${drop.id}">Edit</button><button class="secondary" data-action="preview-drop" data-id="${drop.id}">Preview</button>${drop.status !== 'published' ? `<button class="primary" data-action="set-status" data-status="published" data-id="${drop.id}">Publish</button>` : ''}${drop.status === 'published' ? `<button class="secondary" data-action="set-status" data-status="sold-out" data-id="${drop.id}">Sold out</button>` : ''}${drop.status !== 'archived' ? `<button class="danger" data-action="set-status" data-status="archived" data-id="${drop.id}">Archive</button>` : ''}</div></td></tr>`).join('') || '<tr><td colspan="5">No drops yet.</td></tr>'}</tbody></table></div>`;
  }

  function placementOptions(photo) {
    return state.data.photoPlacements.map(item => `<option value="${item.id}" ${photo.placement === item.id ? 'selected' : ''}>${escapeHtml(item.label)}</option>`).join('');
  }

  function dropOptions(selected = '') {
    return `<option value="">Choose a drop</option>${state.data.drops.map(drop => `<option value="${drop.id}" ${selected === drop.id ? 'selected' : ''}>${escapeHtml(drop.name)}</option>`).join('')}`;
  }

  function photoCard(photo) {
    const saveId = `photo-save-${photo.id}`;
    return `<article class="photo-card"><img src="${photo.thumbUrl}" alt="${escapeHtml(photo.altText)}"><div class="photo-card-body"><div class="photo-card-head"><h3>${escapeHtml(photo.originalName)}</h3><span class="${statusClass(photo.status)}">${escapeHtml(photo.status)}</span></div><form class="photo-placement-form" data-photo-form="${photo.id}"><label>Where should this photo appear?<select name="placement">${placementOptions(photo)}</select></label><label class="drop-placement-field ${photo.placement === 'monthly-drop' ? '' : 'hidden'}">Monthly drop<select name="placementDropId">${dropOptions(photo.placementDropId)}</select></label><label>Photo description<input name="altText" value="${escapeHtml(photo.altText)}" required></label><label>Caption<input name="caption" value="${escapeHtml(photo.caption || '')}"></label><p class="photo-location-help" data-placement-help>${escapeHtml(state.data.photoPlacements.find(item => item.id === photo.placement)?.help || '')}</p><div class="save-row"><button class="secondary" type="submit">Save photo location</button>${saveState(saveId)}</div></form>${photo.status === 'pending' ? `<div class="studio-actions"><button class="primary" data-action="photo-decision" data-decision="approve" data-id="${photo.id}" data-save-target="${saveId}">Approve</button><button class="danger" data-action="photo-decision" data-decision="reject" data-id="${photo.id}" data-save-target="${saveId}">Reject</button></div>` : photo.status === 'approved' ? `<div class="studio-actions"><button class="danger" data-action="photo-decision" data-decision="archive" data-id="${photo.id}" data-save-target="${saveId}">Archive</button></div>` : ''}</div></article>`;
  }

  function photosView() {
    const locations = state.data.photoPlacements.filter(item => item.id !== 'unassigned');
    return `${top('Photos', 'Choose exactly where approved photos appear on the public website.', '<button class="primary" data-action="upload-photo">Upload Photos</button>')}
      <section class="studio-card"><h2>Where Photos Go</h2><div class="instruction-grid">${locations.map((item, index) => `<article class="instruction-step"><span>${index + 1}</span><div><h3>${escapeHtml(item.label)}</h3><p>${escapeHtml(item.help)}</p></div></article>`).join('')}</div><div class="notice notice-pink"><strong>Public photo gate:</strong> Approve only photos without faces, partial faces, reflections, school-identifying details, addresses, or private information. A photo must be approved and assigned to a location before it appears publicly.</div></section>
      <div class="photo-grid" style="margin-top:18px">${state.data.photos.map(photoCard).join('') || '<div class="empty">No photos uploaded.</div>'}</div>`;
  }

  function productLabel(order) {
    return order.productType === 'button' ? 'Buttons / Pins' : order.orderType === 'monthly-drop' ? 'Monthly Drop Bracelet' : 'Custom Bracelet';
  }

  function productDetails(order) {
    const options = order.productOptions || {};
    if (order.productType === 'button') {
      return [options.occasion, options.buttonText, options.themeColors, options.designInstructions].filter(Boolean).map(escapeHtml).join('<br>');
    }
    return [titleCase(options.braceletStyle), (options.colors || []).join(' + '), options.charm, options.nameWord, options.size ? `${titleCase(options.size)} size` : '', options.giftPackaging ? 'Gift packaging requested' : ''].filter(Boolean).map(escapeHtml).join('<br>');
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

  function requestedMaker(order) {
    return order.requestedEmployee ? titleCase(order.requestedEmployee) : 'No preference';
  }

  function orderCard(order) {
    const statusSave = `order-status-save-${order.id}`;
    const paymentSave = `order-payment-save-${order.id}`;
    const noteSave = `order-note-save-${order.id}`;
    return `<article class="studio-card order-card"><div class="order-card-head"><div><span class="badge">${escapeHtml(productLabel(order))}</span><h2>${escapeHtml(order.firstName)} · ${order.quantity}</h2><p class="order-contact"><strong>Phone:</strong> ${escapeHtml(order.phone || 'No phone number provided')}<br><strong>Email:</strong> ${escapeHtml(order.contactEmail)}<br><strong>Order:</strong> ${escapeHtml(order.id)}</p><p class="maker-request"><strong>Requested Maker:</strong> ${escapeHtml(requestedMaker(order))}</p></div><span class="${statusClass(order.status)}">${escapeHtml(order.status)}</span></div>
      <div class="order-detail-grid"><div><h3>Request</h3><p>${productDetails(order) || 'No product details.'}</p>${order.neededBy ? `<p><strong>Needed by:</strong> ${escapeHtml(order.neededBy)}</p>` : ''}${order.notes ? `<p class="tiny"><strong>Customer notes:</strong> ${escapeHtml(order.notes)}</p>` : ''}</div><div><h3>Fulfillment</h3><p>${fulfillmentDetails(order)}</p><p><strong>Estimate:</strong> ${money(order.estimatedCents)} ${order.estimateComplete ? '' : 'known subtotal'}</p><p class="tiny">${escapeHtml(order.estimateNote)}</p></div></div>
      <section class="order-control-section"><h3>Order status</h3><div class="save-row"><select data-order-status="${order.id}" data-save-target="${statusSave}">${['new', 'confirmed', 'making', 'ready', 'completed', 'cancelled'].map(status => `<option value="${status}" ${order.status === status ? 'selected' : ''}>${titleCase(status)}</option>`).join('')}</select>${saveState(statusSave)}</div><p class="tiny">Mark Ready when the item is finished. Mark Completed after pickup, delivery, or shipping is finished. Completed and cancelled orders move to Archive.</p></section>
      <form class="payment-form order-control-section" data-payment-order="${order.id}" data-save-target="${paymentSave}"><h3>Payment</h3><div class="form-grid"><label>Payment status<select name="paymentStatus"><option value="unpaid" ${order.paymentStatus !== 'received' ? 'selected' : ''}>Unpaid</option><option value="received" ${order.paymentStatus === 'received' ? 'selected' : ''}>Received</option></select></label><label>Method<select name="paymentMethod"><option value="">Choose</option><option value="cash" ${order.paymentMethod === 'cash' ? 'selected' : ''}>Cash</option><option value="cashapp" ${order.paymentMethod === 'cashapp' ? 'selected' : ''}>Cash App</option></select></label><label>Amount received<input name="amountPaid" type="number" min="0" step="0.01" value="${(Number(order.amountPaidCents || 0) / 100).toFixed(2)}"></label><label>Date received<input name="paidAt" type="date" value="${paymentDate(order)}"></label><label class="full">Payment note<input name="paymentNote" value="${escapeHtml(order.paymentNote || '')}" placeholder="Optional receipt or note"></label></div><div class="save-row"><button class="primary" type="submit">Save payment</button>${saveState(paymentSave)}</div></form>
      <form class="internal-note-form order-control-section" data-note-order="${order.id}" data-save-target="${noteSave}"><h3>Private Studio note</h3><textarea name="internalNote" rows="3" placeholder="Private making, pickup, delivery, or customer-service note">${escapeHtml(order.internalNote || '')}</textarea><div class="save-row"><button class="secondary" type="submit">Save private note</button>${saveState(noteSave)}</div></form>
    </article>`;
  }

  function orderCounts() {
    const orders = state.data.orders;
    return {
      work: orders.filter(order => ['new', 'confirmed', 'making'].includes(order.status)).length,
      ready: orders.filter(order => order.status === 'ready').length,
      paid: orders.filter(order => order.paymentStatus === 'received').length,
      archive: orders.filter(order => ['completed', 'cancelled'].includes(order.status)).length
    };
  }

  function orderInTab(order) {
    if (state.orderTab === 'work') return ['new', 'confirmed', 'making'].includes(order.status);
    if (state.orderTab === 'ready') return order.status === 'ready';
    if (state.orderTab === 'paid') return order.paymentStatus === 'received';
    if (state.orderTab === 'archive') return ['completed', 'cancelled'].includes(order.status);
    return true;
  }

  function filteredOrders() {
    const filters = state.orderFilters;
    const query = filters.q.trim().toLowerCase();
    return state.data.orders.filter(order => {
      if (!orderInTab(order)) return false;
      for (const key of ['status', 'paymentStatus', 'paymentMethod', 'productType', 'requestedEmployee', 'fulfillmentMethod']) {
        if (!filters[key]) continue;
        if (key === 'requestedEmployee' && filters[key] === 'none') {
          if (String(order[key] || '') !== '') return false;
        } else if (String(order[key] || '') !== filters[key]) return false;
      }
      if (query && ![order.id, order.firstName, order.contactEmail, order.phone].some(value => String(value || '').toLowerCase().includes(query))) return false;
      return true;
    });
  }

  function filterOption(value, label, current) {
    return `<option value="${value}" ${current === value ? 'selected' : ''}>${label}</option>`;
  }

  function ordersView() {
    const counts = orderCounts();
    const orders = filteredOrders();
    const f = state.orderFilters;
    const tabs = [
      ['work', 'Work Queue'], ['ready', 'Ready'], ['paid', 'Paid'], ['archive', 'Archive']
    ];
    return `${top('Orders & Payments', 'Keep active work visible, move ready items into their own view, and archive completed or cancelled orders.')}
      <div class="notice notice-pink"><strong>How the views work:</strong> Paid-but-unfinished orders stay in the Work Queue until they are marked Ready or Completed. The Paid view lets you see every order with a recorded payment.</div>
      <div class="order-tabs" role="tablist">${tabs.map(([id, label]) => `<button class="order-tab ${state.orderTab === id ? 'active' : ''}" data-order-tab="${id}" role="tab" aria-selected="${state.orderTab === id}">${label} <span>${counts[id]}</span></button>`).join('')}</div>
      <section class="studio-card filter-panel"><div class="filter-heading"><div><h2>Filter this view</h2><p class="tiny">Search by customer name, phone number, email, or order number.</p></div><button class="secondary" data-action="clear-order-filters">Clear filters</button></div><div class="filter-grid"><label>Search<input id="order-filter-q" value="${escapeHtml(f.q)}" placeholder="Name, phone, email, or order #"></label><label>Status<select id="order-filter-status"><option value="">All statuses</option>${['new','confirmed','making','ready','completed','cancelled'].map(value => filterOption(value, titleCase(value), f.status)).join('')}</select></label><label>Payment<select id="order-filter-payment-status"><option value="">Paid or unpaid</option>${filterOption('unpaid','Unpaid',f.paymentStatus)}${filterOption('received','Received',f.paymentStatus)}</select></label><label>Payment method<select id="order-filter-payment-method"><option value="">Any method</option>${filterOption('cash','Cash',f.paymentMethod)}${filterOption('cashapp','Cash App',f.paymentMethod)}</select></label><label>Product<select id="order-filter-product"><option value="">Any product</option>${filterOption('bracelet','Bracelet',f.productType)}${filterOption('button','Buttons / Pins',f.productType)}</select></label><label>Requested Maker<select id="order-filter-employee"><option value="">Any preference</option>${filterOption('none','No preference',f.requestedEmployee)}${filterOption('cheyenne','Cheyenne',f.requestedEmployee)}${filterOption('brooklyn','Brooklyn',f.requestedEmployee)}</select></label><label>Fulfillment<select id="order-filter-fulfillment"><option value="">Any fulfillment</option>${filterOption('pickup','Local pickup',f.fulfillmentMethod)}${filterOption('local-delivery','Local delivery',f.fulfillmentMethod)}${filterOption('shipping','Shipping',f.fulfillmentMethod)}</select></label></div><div class="studio-actions" style="margin-top:14px"><button class="primary" data-action="apply-order-filters">Apply filters</button></div><p class="view-count">Showing ${orders.length} order${orders.length === 1 ? '' : 's'} in ${tabs.find(([id]) => id === state.orderTab)?.[1]}.</p></section>
      <div class="order-list">${orders.map(orderCard).join('') || '<div class="empty">No orders match this view and filter combination.</div>'}</div>`;
  }

  function flyersView() {
    const options = state.data.drops.map(drop => `<option value="${drop.id}">${escapeHtml(drop.name)}</option>`).join('');
    return `${top('Flyer Builder', 'Generate a printable flyer, square post, or vertical story from a drop.')}<div class="studio-grid cols-2"><section class="studio-card studio-form"><label>Drop<select id="flyer-drop">${options}</select></label><label>Format<select id="flyer-format"><option value="letter">Printable letter</option><option value="square">Square social post</option><option value="story">Vertical story</option></select></label><div class="studio-actions"><button class="primary" data-action="preview-flyer">Preview flyer</button><a id="download-flyer" class="secondary" href="#">Download SVG</a></div><div class="notice">The flyer uses the approved Monthly Drop photo when available.</div></section><section class="studio-card"><iframe id="flyer-frame" class="flyer-frame" title="Flyer preview"></iframe></section></div>`;
  }

  function moneyInput(name, label, value, help) {
    return `<label>${label}<input name="${name}" type="number" min="0" step="1" value="${value === '' || value === undefined ? '' : Number(value)}" placeholder="Leave blank until confirmed"><span class="helper">${help}</span></label>`;
  }

  function brandView() {
    const settings = state.data.settings;
    return `${top('Brand, Pricing & Payment', 'Manage public links, pricing inputs, Cash App instructions, and the active logo.')}<form id="settings-form" class="studio-form"><div class="form-save-header"><h2>Brand & links</h2>${saveState('settings-save-state')}</div><div class="logo-grid">${state.data.logoOptions.map(logo => `<label class="logo-card ${settings.activeLogo === logo.id ? 'active' : ''}"><img src="${logo.url}" alt="${escapeHtml(logo.label)}"><span><input type="radio" name="activeLogo" value="${logo.id}" ${settings.activeLogo === logo.id ? 'checked' : ''}> ${escapeHtml(logo.label)}</span></label>`).join('')}</div><div class="form-grid"><label>Public contact email<input name="contactEmail" type="email" value="${escapeHtml(settings.contactEmail)}"></label><label>Website URL<input name="websiteUrl" type="url" value="${escapeHtml(settings.websiteUrl)}" placeholder="https://..."></label><label>TikTok URL<input name="tiktokUrl" type="url" value="${escapeHtml(settings.tiktokUrl)}" placeholder="https://www.tiktok.com/@..."></label><label>TikTok handle<input name="tiktokHandle" value="${escapeHtml(settings.tiktokHandle)}" placeholder="@charmnest"></label><label class="full">Etsy shop URL<input name="etsyUrl" type="url" value="${escapeHtml(settings.etsyUrl)}" placeholder="https://www.etsy.com/shop/..."></label></div><h2>Order pricing in cents</h2><div class="notice">Enter whole cents. Example: $3.00 = 300. Blank values remain quote-required and will not produce a made-up total.</div><div class="form-grid">${moneyInput('localDropBraceletCents', 'Local monthly-drop bracelet', settings.localDropBraceletCents, 'Confirmed default: 200.')}${moneyInput('localCustomBraceletCents', 'Local custom bracelet', settings.localCustomBraceletCents, 'Confirmed default: 300.')}${moneyInput('localDeliveryFeeCents', 'Local delivery fee', settings.localDeliveryFeeCents, 'Use 0 only when delivery is free.')}${moneyInput('shippedCustomBraceletCents', 'Shipped custom bracelet unit price', settings.shippedCustomBraceletCents, 'Per bracelet before shipping.')}${moneyInput('shippingFeeCents', 'Shipping and handling fee', settings.shippingFeeCents, 'Added once per order.')}${moneyInput('buttonUnitCents', 'Button or pin unit price', settings.buttonUnitCents, 'Per button or pin.')}${moneyInput('buttonSetupFeeCents', 'Button setup or design fee', settings.buttonSetupFeeCents, 'Added once per order. Use 0 if none.')}${moneyInput('giftPackagingFeeCents', 'Gift packaging fee', settings.giftPackagingFeeCents, 'Added once when requested.')}</div><h2>Cash App</h2><div class="form-grid"><label>Cash App handle<input name="cashAppHandle" value="${escapeHtml(settings.cashAppHandle)}" placeholder="$CharmNest"></label><label>Cash App QR image<input name="cashAppQr" type="file" accept="image/jpeg,image/png,image/webp"><span class="helper">PNG, JPEG, or WebP; maximum 3 MB.</span></label><input type="hidden" name="cashAppQrUrl" value="${escapeHtml(settings.cashAppQrUrl)}"><label class="full">Public payment instructions<textarea name="paymentInstructions" rows="4">${escapeHtml(settings.paymentInstructions)}</textarea></label>${settings.cashAppQrUrl ? `<div class="full"><p><strong>Current QR code</strong></p><img class="settings-qr" src="${settings.cashAppQrUrl}" alt="Current Cash App QR code"></div>` : '<div class="full notice">No Cash App QR image has been uploaded.</div>'}</div><h2>Public notices</h2><div class="form-grid"><label class="full">School drop notice<textarea name="schoolDropNotice" rows="4">${escapeHtml(settings.schoolDropNotice)}</textarea></label><label class="full">School pricing notice<textarea name="schoolPricingNotice" rows="3">${escapeHtml(settings.schoolPricingNotice)}</textarea></label></div><div class="save-row"><button class="primary" type="submit">Save Brand, Pricing & Payment</button>${saveState('settings-save-state-bottom')}</div></form>`;
  }

  function activityView() {
    return `${top('Activity Log', 'A plain-language receipt of Studio actions.')}<div class="studio-card table-wrap"><table class="studio-table"><thead><tr><th>When</th><th>Who</th><th>Action</th><th>Item</th></tr></thead><tbody>${state.data.activity.map(activity => `<tr><td>${new Date(activity.created_at).toLocaleString()}</td><td>${escapeHtml(activity.actor)}</td><td>${escapeHtml(activity.action)}</td><td>${escapeHtml(activity.entity_type)} ${escapeHtml(activity.entity_id)}</td></tr>`).join('')}</tbody></table></div>`;
  }

  function helpView() {
    return `${top('Help', 'How to use the unified Maker Studio safely.')}<div class="studio-grid cols-2"><article class="studio-card"><h2>Drop workflow</h2><ol><li>Create the drop and save it as a draft.</li><li>Upload a safe photo and choose Monthly Drop as its location.</li><li>Review public copy, prices, dates, and inventory.</li><li>Publish, mark sold out, or archive.</li></ol></article><article class="studio-card"><h2>Order workflow</h2><ol><li>Use Work Queue for new, confirmed, and making orders.</li><li>Mark the order Ready when the item is finished.</li><li>Record cash or Cash App only after it is received.</li><li>Mark Completed after the customer receives the item.</li></ol></article><article class="studio-card"><h2>Photo workflow</h2><p>Upload, approve, and choose a website location. The Hero is the large homepage image. Category photos appear with Bracelets or Buttons & Pins. Gallery photos appear in Recent Creations. Monthly Drop photos belong to one selected drop.</p></article><article class="studio-card"><h2>Save messages</h2><p><strong>Unsaved changes</strong> means the screen has been edited. <strong>Saving…</strong> means the Studio is working. <strong>Saved ✓</strong> confirms the change reached the server. An error message means it did not save.</p></article></div>`;
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
    document.querySelectorAll('[data-action="photo-decision"]').forEach(button => button.addEventListener('click', () => photoDecision(button.dataset.id, button.dataset.decision, button.dataset.saveTarget)));

    document.querySelectorAll('[data-photo-form]').forEach(form => {
      const saveElement = form.querySelector('.save-state');
      trackForm(form, saveElement);
      const placement = form.querySelector('[name="placement"]');
      const dropField = form.querySelector('.drop-placement-field');
      const help = form.querySelector('[data-placement-help]');
      placement.addEventListener('change', () => {
        dropField.classList.toggle('hidden', placement.value !== 'monthly-drop');
        const item = state.data.photoPlacements.find(candidate => candidate.id === placement.value);
        help.textContent = item?.help || '';
      });
      form.addEventListener('submit', savePhotoPlacement);
    });

    document.querySelectorAll('[data-order-status]').forEach(select => {
      select.addEventListener('change', () => orderStatus(select.dataset.orderStatus, select.value, select.dataset.saveTarget));
    });
    document.querySelectorAll('[data-payment-order]').forEach(form => {
      trackForm(form, document.querySelector(`#${form.dataset.saveTarget}`));
      form.addEventListener('submit', savePayment);
    });
    document.querySelectorAll('[data-note-order]').forEach(form => {
      trackForm(form, document.querySelector(`#${form.dataset.saveTarget}`));
      form.addEventListener('submit', saveInternalNote);
    });

    document.querySelectorAll('[data-order-tab]').forEach(button => button.addEventListener('click', () => {
      state.orderTab = button.dataset.orderTab;
      if (button.dataset.action === 'go-orders') state.view = 'orders';
      renderShell();
    }));
    document.querySelector('[data-action="go-orders"]')?.addEventListener('click', event => {
      state.view = 'orders';
      state.orderTab = event.currentTarget.dataset.orderTab || 'work';
      renderShell();
    });
    document.querySelector('[data-action="clear-order-filters"]')?.addEventListener('click', () => {
      state.orderFilters = { q: '', status: '', paymentStatus: '', paymentMethod: '', productType: '', requestedEmployee: '', fulfillmentMethod: '' };
      renderView();
    });
    const filterBindings = [
      ['#order-filter-q', 'q'], ['#order-filter-status', 'status'], ['#order-filter-payment-status', 'paymentStatus'],
      ['#order-filter-payment-method', 'paymentMethod'], ['#order-filter-product', 'productType'],
      ['#order-filter-employee', 'requestedEmployee'], ['#order-filter-fulfillment', 'fulfillmentMethod']
    ];
    for (const [selector, key] of filterBindings) {
      const element = document.querySelector(selector);
      if (!element) continue;
      element.addEventListener('input', () => { state.orderFilters[key] = element.value; });
      element.addEventListener('change', () => { state.orderFilters[key] = element.value; });
    }
    document.querySelector('[data-action="apply-order-filters"]')?.addEventListener('click', () => renderView());
    document.querySelector('#order-filter-q')?.addEventListener('keydown', event => {
      if (event.key === 'Enter') { event.preventDefault(); renderView(); }
    });

    const settingsForm = document.querySelector('#settings-form');
    if (settingsForm) {
      trackForm(settingsForm, document.querySelector('#settings-save-state'));
      settingsForm.addEventListener('input', () => setSaveState('settings-save-state-bottom', 'dirty'));
      settingsForm.addEventListener('change', () => setSaveState('settings-save-state-bottom', 'dirty'));
      settingsForm.addEventListener('submit', saveSettings);
    }
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
    const saveId = 'modal-drop-save-state';
    const modal = openModal(`<form id="drop-form" class="studio-form"><div class="form-save-header"><p><strong>${drop.id ? 'Edit this drop' : 'Create a new drop'}</strong></p>${saveState(saveId)}</div><div class="form-grid"><label>Drop name<input name="name" value="${escapeHtml(drop.name || '')}" required></label><label>URL slug<input name="slug" value="${escapeHtml(drop.slug || '')}" required></label><label>Month<input name="month" value="${escapeHtml(drop.month || '')}"></label><label>Year<input name="year" type="number" value="${drop.year || 2026}" min="2026"></label><label class="full">Short headline<input name="headline" value="${escapeHtml(drop.headline || '')}"></label><label class="full">Public note<textarea name="publicNotes" rows="4">${escapeHtml(drop.publicNotes || '')}</textarea></label><label class="full">Private Studio note<textarea name="privateNotes" rows="4">${escapeHtml(drop.privateNotes || '')}</textarea></label><label>Color 1<input name="color1" value="${escapeHtml(colors[0] || '')}"></label><label>Color 1 swatch<input name="hex1" type="color" value="${hexes[0] || '#ff7a00'}"></label><label>Color 2<input name="color2" value="${escapeHtml(colors[1] || '')}"></label><label>Color 2 swatch<input name="hex2" type="color" value="${hexes[1] || '#111111'}"></label><label>Color 3<input name="color3" value="${escapeHtml(colors[2] || '')}"></label><label>Color 3 swatch<input name="hex3" type="color" value="${hexes[2] || '#ff78b3'}"></label><label>Featured charm<input name="featuredCharm" value="${escapeHtml(drop.featuredCharm || '')}"></label><label>Planned quantity<input name="quantity" type="number" min="0" value="${drop.quantity || 0}"></label><label class="check-row"><input name="beadedAvailable" type="checkbox" ${drop.beadedAvailable !== false ? 'checked' : ''}> Beaded available</label><label class="check-row"><input name="braidedAvailable" type="checkbox" ${drop.braidedAvailable !== false ? 'checked' : ''}> Braided available</label><label>School price in cents<input name="schoolPriceCents" type="number" value="${drop.schoolPriceCents || 200}"></label><label>Custom price in cents<input name="customPriceCents" type="number" value="${drop.customPriceCents || 300}"></label><label>Release date<input name="releaseDate" type="date" value="${escapeHtml(drop.releaseDate || '')}"></label><label>End date<input name="endDate" type="date" value="${escapeHtml(drop.endDate || '')}"></label><label class="full">TikTok post URL<input name="tiktokUrl" type="url" value="${escapeHtml(drop.tiktokUrl || '')}"></label><label class="full">Etsy listing URL<input name="etsyUrl" type="url" value="${escapeHtml(drop.etsyUrl || '')}"></label><label>Status<select name="status">${['draft', 'review', 'published', 'sold-out', 'archived'].map(status => `<option value="${status}" ${drop.status === status ? 'selected' : ''}>${titleCase(status)}</option>`).join('')}</select></label></div><div class="notice">Save as Draft while preparing. Publishing makes the drop live. Sold Out keeps it visible. Archived removes it from the active public list.</div><div class="save-row"><button class="primary" type="submit">${drop.id ? 'Save changes' : 'Create drop'}</button>${saveState(`${saveId}-bottom`)}</div></form>`);
    const formElement = modal.querySelector('#drop-form');
    trackForm(formElement, modal.querySelector(`#${saveId}`));
    formElement.addEventListener('input', () => setSaveState(`${saveId}-bottom`, 'dirty'));
    formElement.addEventListener('change', () => setSaveState(`${saveId}-bottom`, 'dirty'));
    formElement.addEventListener('submit', async event => {
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
      setBusy(event.target, true);
      setSaveState(saveId, 'saving');
      setSaveState(`${saveId}-bottom`, 'saving');
      try {
        const result = await api(drop.id ? `/api/studio/drops/${drop.id}` : '/api/studio/drops', { method: drop.id ? 'PUT' : 'POST', body: JSON.stringify(body) });
        setSaveState(saveId, 'saved', `Saved ✓ at ${savedTime(result.savedAt)}`);
        setSaveState(`${saveId}-bottom`, 'saved', `Saved ✓ at ${savedTime(result.savedAt)}`);
        await new Promise(resolve => setTimeout(resolve, 500));
        modal.remove();
        renderView();
      } catch (error) {
        setSaveState(saveId, 'error', `Could not save — ${error.message}`);
        setSaveState(`${saveId}-bottom`, 'error', `Could not save — ${error.message}`);
      } finally { setBusy(event.target, false); }
    });
  }

  function previewDrop(drop) {
    if (!drop) return;
    const photo = drop.photos?.find(item => item.isCover) || drop.photos?.[0];
    openModal(`<div class="drop-preview">${photo ? `<img src="${photo.webUrl}" alt="${escapeHtml(photo.altText)}">` : ''}<span class="${statusClass(drop.status)}">${escapeHtml(drop.status)}</span><h1>${escapeHtml(drop.name)}</h1><p>${escapeHtml(drop.publicNotes)}</p><div class="color-row">${(drop.colorHexes || []).map(hex => `<span class="color-dot" style="background:${hex}"></span>`).join('')}</div><p><strong>School drop:</strong> ${money(drop.schoolPriceCents)} &nbsp; <strong>Custom colors:</strong> ${money(drop.customPriceCents)}</p></div>`);
  }

  async function setStatus(id, status) {
    const language = {
      published: 'Publish this drop on the public website?',
      'sold-out': 'Mark this drop Sold Out? It will remain visible but unavailable.',
      archived: 'Archive this drop? It will leave the active public list but stay saved in Studio.'
    };
    if (!confirm(language[status] || `Change this drop to ${status}?`)) return;
    setSaveState('drop-action-save-state', 'saving');
    try {
      const result = await api(`/api/studio/drops/${id}/status`, { method: 'POST', body: JSON.stringify({ status }) });
      setSaveState('drop-action-save-state', 'saved', `Saved ✓ at ${savedTime(result.savedAt)}`);
      await new Promise(resolve => setTimeout(resolve, 450));
      renderView();
    } catch (error) { setSaveState('drop-action-save-state', 'error', `Could not save — ${error.message}`); }
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
    const saveId = 'photo-upload-save-state';
    const modal = openModal(`<form id="photo-form" class="studio-form"><div class="form-save-header"><p><strong>Upload and place a photo</strong></p>${saveState(saveId)}</div><label>Product photo<input name="photo" type="file" accept="image/jpeg,image/png,image/webp" capture="environment" required></label><label>Where should it appear?<select name="placement">${state.data.photoPlacements.map(item => `<option value="${item.id}">${escapeHtml(item.label)}</option>`).join('')}</select></label><label id="upload-drop-field" class="hidden">Monthly drop<select name="placementDropId">${dropOptions('')}</select></label><p id="upload-placement-help" class="photo-location-help">${escapeHtml(state.data.photoPlacements[0]?.help || '')}</p><label>Photo description<input name="altText" required></label><label>Caption<input name="caption"></label><label class="check-row"><input name="noFacesConfirmed" type="checkbox" required> I confirm this image contains no face, partial face, or face reflection.</label><div class="notice notice-pink">Check the background for school names, badges, addresses, mirrors, and private information.</div><div class="save-row"><button class="primary" type="submit">Prepare and upload photo</button>${saveState(`${saveId}-bottom`)}</div><p id="photo-progress"></p></form>`);
    const formElement = modal.querySelector('#photo-form');
    trackForm(formElement, modal.querySelector(`#${saveId}`));
    formElement.addEventListener('input', () => setSaveState(`${saveId}-bottom`, 'dirty'));
    formElement.addEventListener('change', () => setSaveState(`${saveId}-bottom`, 'dirty'));
    const placement = formElement.querySelector('[name="placement"]');
    placement.addEventListener('change', () => {
      formElement.querySelector('#upload-drop-field').classList.toggle('hidden', placement.value !== 'monthly-drop');
      formElement.querySelector('#upload-placement-help').textContent = state.data.photoPlacements.find(item => item.id === placement.value)?.help || '';
    });
    formElement.addEventListener('submit', async event => {
      event.preventDefault();
      const form = new FormData(event.target);
      const file = form.get('photo');
      const progress = modal.querySelector('#photo-progress');
      setBusy(event.target, true);
      setSaveState(saveId, 'saving');
      setSaveState(`${saveId}-bottom`, 'saving');
      try {
        progress.textContent = 'Creating website versions…';
        const web = await imageVariant(file, 1600, .84);
        const thumb = await imageVariant(file, 500, .78);
        progress.textContent = 'Uploading…';
        const result = await api('/api/studio/photos', {
          method: 'POST',
          body: JSON.stringify({
            originalName: file.name, mimeType: file.type, altText: form.get('altText'), caption: form.get('caption'),
            placement: form.get('placement'), placementDropId: form.get('placementDropId'),
            noFacesConfirmed: form.get('noFacesConfirmed') === 'on', originalBase64: await toBase64(file), webBase64: await toBase64(web), thumbBase64: await toBase64(thumb)
          })
        });
        setSaveState(saveId, 'saved', `Saved ✓ at ${savedTime(result.savedAt)}`);
        setSaveState(`${saveId}-bottom`, 'saved', `Saved ✓ at ${savedTime(result.savedAt)}`);
        progress.textContent = 'Uploaded. Approve the photo before it can appear publicly.';
        await new Promise(resolve => setTimeout(resolve, 650));
        modal.remove();
        renderView();
      } catch (error) {
        setSaveState(saveId, 'error', `Could not save — ${error.message}`);
        setSaveState(`${saveId}-bottom`, 'error', `Could not save — ${error.message}`);
        progress.textContent = error.message;
      } finally { setBusy(event.target, false); }
    });
  }

  async function savePhotoPlacement(event) {
    event.preventDefault();
    const form = event.target;
    const id = form.dataset.photoForm;
    const saveElement = form.querySelector('.save-state');
    const data = new FormData(form);
    setBusy(form, true);
    setSaveState(saveElement, 'saving');
    try {
      const result = await api(`/api/studio/photos/${id}`, { method: 'PUT', body: JSON.stringify({ placement: data.get('placement'), placementDropId: data.get('placementDropId'), altText: data.get('altText'), caption: data.get('caption') }) });
      setSaveState(saveElement, 'saved', `Saved ✓ at ${savedTime(result.savedAt)}`);
    } catch (error) { setSaveState(saveElement, 'error', `Could not save — ${error.message}`); }
    finally { setBusy(form, false); }
  }

  async function photoDecision(id, decision, saveTarget) {
    setSaveState(saveTarget, 'saving');
    try {
      const result = await api(`/api/studio/photos/${id}/decision`, { method: 'POST', body: JSON.stringify({ decision }) });
      setSaveState(saveTarget, 'saved', `Saved ✓ at ${savedTime(result.savedAt)}`);
      await new Promise(resolve => setTimeout(resolve, 450));
      renderView();
    } catch (error) { setSaveState(saveTarget, 'error', `Could not save — ${error.message}`); }
  }

  async function orderStatus(id, status, saveTarget) {
    setSaveState(saveTarget, 'saving');
    const select = document.querySelector(`[data-order-status="${id}"]`);
    if (select) select.disabled = true;
    try {
      const result = await api(`/api/studio/orders/${id}/status`, { method: 'POST', body: JSON.stringify({ status }) });
      setSaveState(saveTarget, 'saved', `Saved ✓ at ${savedTime(result.savedAt)}`);
      await new Promise(resolve => setTimeout(resolve, 450));
      renderView();
    } catch (error) { setSaveState(saveTarget, 'error', `Could not save — ${error.message}`); }
    finally { if (select) select.disabled = false; }
  }

  async function savePayment(event) {
    event.preventDefault();
    const formElement = event.target;
    const form = new FormData(formElement);
    const id = formElement.dataset.paymentOrder;
    const saveTarget = formElement.dataset.saveTarget;
    setBusy(formElement, true);
    setSaveState(saveTarget, 'saving');
    try {
      const result = await api(`/api/studio/orders/${id}/payment`, {
        method: 'POST',
        body: JSON.stringify({
          paymentStatus: form.get('paymentStatus'), paymentMethod: form.get('paymentMethod'),
          amountPaidCents: Math.round(Number(form.get('amountPaid') || 0) * 100), paidAt: form.get('paidAt'), paymentNote: form.get('paymentNote')
        })
      });
      setSaveState(saveTarget, 'saved', `Saved ✓ at ${savedTime(result.savedAt)}`);
      await refresh();
    } catch (error) { setSaveState(saveTarget, 'error', `Could not save — ${error.message}`); }
    finally { setBusy(formElement, false); }
  }

  async function saveInternalNote(event) {
    event.preventDefault();
    const formElement = event.target;
    const data = new FormData(formElement);
    const id = formElement.dataset.noteOrder;
    const saveTarget = formElement.dataset.saveTarget;
    setBusy(formElement, true);
    setSaveState(saveTarget, 'saving');
    try {
      const result = await api(`/api/studio/orders/${id}/internal-note`, { method: 'POST', body: JSON.stringify({ internalNote: data.get('internalNote') }) });
      setSaveState(saveTarget, 'saved', `Saved ✓ at ${savedTime(result.savedAt)}`);
    } catch (error) { setSaveState(saveTarget, 'error', `Could not save — ${error.message}`); }
    finally { setBusy(formElement, false); }
  }

  async function saveSettings(event) {
    event.preventDefault();
    const formElement = event.target;
    const formData = new FormData(formElement);
    const qrFile = formData.get('cashAppQr');
    formData.delete('cashAppQr');
    const body = Object.fromEntries(formData.entries());
    setBusy(formElement, true);
    setSaveState('settings-save-state', 'saving');
    setSaveState('settings-save-state-bottom', 'saving');
    try {
      if (qrFile instanceof File && qrFile.size) {
        const qr = await api('/api/studio/payment-qr', { method: 'POST', body: JSON.stringify({ mimeType: qrFile.type, base64: await toBase64(qrFile) }) });
        body.cashAppQrUrl = qr.url;
      }
      const result = await api('/api/studio/settings', { method: 'PUT', body: JSON.stringify(body) });
      const message = `Saved ✓ at ${savedTime(result.savedAt)}`;
      setSaveState('settings-save-state', 'saved', message);
      setSaveState('settings-save-state-bottom', 'saved', message);
      await refresh();
    } catch (error) {
      const message = `Could not save — ${error.message}`;
      setSaveState('settings-save-state', 'error', message);
      setSaveState('settings-save-state-bottom', 'error', message);
    } finally { setBusy(formElement, false); }
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
      const data = await api('/api/auth/login', { method: 'POST', body: JSON.stringify({ username: 'maker', password: form.get('password') }) });
      state.session = data.session;
      state.csrf = data.session.csrf;
      renderShell();
    } catch (error) { status.textContent = error.message; }
  });

  resume();
})();
