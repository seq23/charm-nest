(function () {
  const form = document.querySelector('#order-form');
  if (!form) return;

  const elements = {
    productType: form.querySelector('[name="productType"]'),
    quantity: form.querySelector('[name="quantity"]'),
    orderType: form.querySelector('[name="orderType"]'),
    braceletStyle: form.querySelector('[name="braceletStyle"]'),
    giftPackaging: form.querySelector('[name="giftPackaging"]'),
    isLocalOrder: form.querySelector('[name="isLocalOrder"]'),
    braceletFields: document.querySelector('#bracelet-fields'),
    buttonFields: document.querySelector('#button-fields'),
    localMethods: document.querySelector('#local-methods'),
    shippingFields: document.querySelector('#shipping-fields'),
    estimate: document.querySelector('#estimate'),
    estimateNote: document.querySelector('#estimate-note'),
    status: document.querySelector('#order-status'),
    confirmation: document.querySelector('#order-confirmation'),
    confirmationReference: document.querySelector('#confirmation-reference'),
    confirmationEstimate: document.querySelector('#confirmation-estimate'),
    confirmationPayment: document.querySelector('#confirmation-payment')
  };

  let settings = {
    localDropBraceletCents: 200,
    localCustomBraceletCents: 300,
    localDeliveryFeeCents: '',
    shippedCustomBraceletCents: '',
    shippingFeeCents: '',
    buttonUnitCents: '',
    buttonSetupFeeCents: '',
    giftPackagingFeeCents: ''
  };

  function cents(value) {
    if (value === '' || value === null || value === undefined) return null;
    const number = Number(value);
    return Number.isFinite(number) && number >= 0 ? Math.round(number) : null;
  }

  function money(value) {
    return `$${(Number(value || 0) / 100).toFixed(2)}`;
  }

  function setRequired(container, required) {
    container.querySelectorAll('[data-required-when-visible]').forEach(input => {
      input.required = required;
    });
  }

  function fulfillmentMethod() {
    if (!elements.isLocalOrder.checked) return 'shipping';
    return form.querySelector('[name="localMethod"]:checked')?.value || 'pickup';
  }

  function payload() {
    const data = new FormData(form);
    return {
      firstName: data.get('firstName'),
      contactEmail: data.get('contactEmail'),
      productType: data.get('productType'),
      orderType: data.get('orderType'),
      braceletStyle: data.get('braceletStyle'),
      quantity: Number(data.get('quantity') || 1),
      colors: [data.get('color1'), data.get('color2'), data.get('color3')].filter(Boolean),
      charm: data.get('charm'),
      nameWord: data.get('nameWord'),
      size: data.get('size'),
      giftPackaging: data.get('giftPackaging') === 'on',
      buttonOccasion: data.get('buttonOccasion'),
      buttonText: data.get('buttonText'),
      themeColors: data.get('themeColors'),
      artworkReady: data.get('artworkReady') === 'on',
      designInstructions: data.get('designInstructions'),
      neededBy: data.get('neededBy'),
      notes: data.get('notes'),
      fulfillmentMethod: fulfillmentMethod(),
      shippingAddress: {
        address1: data.get('address1'),
        address2: data.get('address2'),
        city: data.get('city'),
        state: data.get('state'),
        zip: data.get('zip')
      },
      consent: data.get('consent') === 'on'
    };
  }

  function calculate(data) {
    let total = 0;
    const missing = [];

    if (data.productType === 'bracelet') {
      if (data.fulfillmentMethod === 'shipping') {
        const unit = cents(settings.shippedCustomBraceletCents);
        if (unit === null) missing.push('shipped custom-bracelet price');
        else total += unit * data.quantity;
      } else {
        const unit = data.orderType === 'monthly-drop'
          ? cents(settings.localDropBraceletCents) ?? 200
          : cents(settings.localCustomBraceletCents) ?? 300;
        total += unit * data.quantity;
      }
      if (data.giftPackaging) {
        const fee = cents(settings.giftPackagingFeeCents);
        if (fee === null) missing.push('gift-packaging price');
        else total += fee;
      }
    }

    if (data.productType === 'button') {
      const unit = cents(settings.buttonUnitCents);
      const setup = cents(settings.buttonSetupFeeCents);
      if (unit === null) missing.push('button/pin unit price');
      else total += unit * data.quantity;
      if (setup === null) missing.push('button/pin setup fee');
      else total += setup;
    }

    if (data.fulfillmentMethod === 'local-delivery') {
      const fee = cents(settings.localDeliveryFeeCents);
      if (fee === null) missing.push('local-delivery fee');
      else total += fee;
    }

    if (data.fulfillmentMethod === 'shipping') {
      const fee = cents(settings.shippingFeeCents);
      if (fee === null) missing.push('shipping and handling');
      else total += fee;
    }

    return { total, missing };
  }

  function updateVisibility() {
    const buttons = elements.productType.value === 'button';
    elements.braceletFields.classList.toggle('hidden', buttons);
    elements.buttonFields.classList.toggle('hidden', !buttons);
    elements.braceletStyle.required = !buttons;
    form.querySelector('[name="buttonOccasion"]').required = buttons;

    const local = elements.isLocalOrder.checked;
    elements.localMethods.classList.toggle('hidden', !local);
    elements.shippingFields.classList.toggle('hidden', local);
    elements.shippingFields.querySelectorAll('input').forEach(input => {
      input.required = !local && input.name !== 'address2';
    });

    const monthly = elements.orderType.value === 'monthly-drop';
    if (monthly && !local) {
      elements.orderType.value = 'custom';
    }
  }

  function updateEstimate() {
    updateVisibility();
    const data = payload();
    const { total, missing } = calculate(data);
    if (missing.length) {
      elements.estimate.textContent = `${money(total)} known subtotal`;
      elements.estimateNote.textContent = `Final ${missing.join(', ')} must be confirmed before payment.`;
    } else {
      elements.estimate.textContent = `${money(total)} estimated total`;
      elements.estimateNote.textContent = 'CharmNest will confirm availability and the final amount before payment.';
    }
  }

  function showPayment(payment, order) {
    const container = elements.confirmationPayment;
    container.replaceChildren();
    const heading = document.createElement('h3');
    heading.textContent = 'Payment';
    container.append(heading);

    if (payment.waitForConfirmation) {
      const notice = document.createElement('p');
      notice.textContent = 'Wait for CharmNest to confirm the final total before paying.';
      container.append(notice);
      return;
    }

    if (!payment.available) {
      const notice = document.createElement('p');
      notice.textContent = 'CharmNest will send payment instructions after confirming the order.';
      container.append(notice);
      return;
    }

    const amount = document.createElement('p');
    amount.textContent = `Confirmed estimate: ${money(payment.amountCents)}. Include reference ${order.id} in the payment note.`;
    container.append(amount);

    if (payment.cashAppHandle) {
      const handle = document.createElement('p');
      const strong = document.createElement('strong');
      strong.textContent = `Cash App: ${payment.cashAppHandle}`;
      handle.append(strong);
      container.append(handle);
    }

    if (payment.cashAppQrUrl) {
      const image = document.createElement('img');
      image.className = 'payment-qr';
      image.src = payment.cashAppQrUrl;
      image.alt = 'CharmNest Cash App QR code';
      container.append(image);
    }

    if (payment.instructions) {
      const instructions = document.createElement('p');
      instructions.textContent = payment.instructions;
      container.append(instructions);
    }
  }

  form.addEventListener('input', updateEstimate);
  form.addEventListener('change', updateEstimate);

  form.addEventListener('submit', async event => {
    event.preventDefault();
    elements.status.className = 'status';
    elements.status.textContent = 'Sending request…';
    elements.confirmation.classList.add('hidden');
    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload())
      });
      const data = await response.json();
      if (!response.ok) throw new Error((data.details || [data.error]).join(' '));
      elements.status.className = 'status success';
      elements.status.textContent = 'Request received.';
      elements.confirmationReference.textContent = data.order.id;
      elements.confirmationEstimate.textContent = data.order.estimateNote || `Estimated total: ${money(data.order.estimatedCents)}.`;
      showPayment(data.payment, data.order);
      elements.confirmation.classList.remove('hidden');
      elements.confirmation.scrollIntoView({ behavior: 'smooth', block: 'start' });
      form.reset();
      elements.isLocalOrder.checked = true;
      updateEstimate();
    } catch (error) {
      elements.status.className = 'status error';
      elements.status.textContent = error.message;
    }
  });

  const requestedProduct = new URLSearchParams(location.search).get('product');
  if (requestedProduct === 'button' || requestedProduct === 'bracelet') elements.productType.value = requestedProduct;

  fetch('/api/public/settings')
    .then(response => response.json())
    .then(data => {
      if (data.settings) settings = { ...settings, ...data.settings };
      updateEstimate();
    })
    .catch(updateEstimate);
})();
