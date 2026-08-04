import {
  DROP_STATUSES,
  FULFILLMENT_METHODS,
  LOGO_OPTIONS,
  NUMERIC_SETTING_KEYS,
  ORDER_STATUSES,
  PAYMENT_METHODS,
  PAYMENT_STATUSES,
  PHOTO_PLACEMENTS,
  PHOTO_STATUSES,
  PRODUCT_TYPES,
  REQUESTED_EMPLOYEES
} from './constants.mjs';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/u;
const urlPattern = /^https:\/\//u;
const zipPattern = /^\d{5}(?:-\d{4})?$/u;
const allowedPhotoPlacementIds = new Set(PHOTO_PLACEMENTS.map(item => item.id));

export function cleanText(value, max = 500) {
  return String(value ?? '').replace(/[<>]/gu, '').trim().slice(0, max);
}

function optionalCents(value) {
  if (value === '' || value === null || value === undefined) return null;
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) return null;
  return Math.round(number);
}

function settingCents(settings, key) {
  return optionalCents(settings?.[key]);
}

function formatMoney(cents) {
  return `$${(Number(cents || 0) / 100).toFixed(2)}`;
}

function validPhone(value) {
  const digits = String(value || '').replace(/\D/gu, '');
  return digits.length >= 10 && digits.length <= 15;
}

export function calculateOrderEstimate(data, settings = {}) {
  let estimatedCents = 0;
  const missing = [];

  if (data.productType === 'bracelet') {
    if (data.fulfillmentMethod === 'shipping') {
      const unit = settingCents(settings, 'shippedCustomBraceletCents');
      if (unit === null) missing.push('shipped custom-bracelet unit price');
      else estimatedCents += unit * data.quantity;
    } else {
      const key = data.orderType === 'monthly-drop' ? 'localDropBraceletCents' : 'localCustomBraceletCents';
      const fallback = data.orderType === 'monthly-drop' ? 200 : 300;
      estimatedCents += (settingCents(settings, key) ?? fallback) * data.quantity;
    }

    if (data.productOptions.giftPackaging) {
      const fee = settingCents(settings, 'giftPackagingFeeCents');
      if (fee === null) missing.push('gift-packaging price');
      else estimatedCents += fee;
    }
  }

  if (data.productType === 'button') {
    const unit = settingCents(settings, 'buttonUnitCents');
    const setup = settingCents(settings, 'buttonSetupFeeCents');
    if (unit === null) missing.push('button/pin unit price');
    else estimatedCents += unit * data.quantity;
    if (setup === null) missing.push('button/pin setup or design fee');
    else estimatedCents += setup;
  }

  if (data.fulfillmentMethod === 'local-delivery') {
    const fee = settingCents(settings, 'localDeliveryFeeCents');
    if (fee === null) missing.push('local-delivery fee');
    else estimatedCents += fee;
  }

  if (data.fulfillmentMethod === 'shipping') {
    const fee = settingCents(settings, 'shippingFeeCents');
    if (fee === null) missing.push('shipping and handling fee');
    else estimatedCents += fee;
  }

  const estimateComplete = missing.length === 0;
  const estimateNote = estimateComplete
    ? `Estimated total: ${formatMoney(estimatedCents)}. CharmNest will confirm availability and the final amount.`
    : `Known subtotal: ${formatMoney(estimatedCents)}. Final ${missing.join(', ')} must be confirmed before payment.`;

  return { estimatedCents, estimateComplete, estimateNote, missingEstimateFields: missing };
}

export function validateDrop(input, partial = false) {
  const errors = [];
  const data = {
    name: cleanText(input.name, 80),
    slug: cleanText(input.slug, 80).toLowerCase().replace(/[^a-z0-9-]/gu, '-').replace(/-+/gu, '-').replace(/^-|-$/gu, ''),
    month: cleanText(input.month, 20),
    year: Number(input.year || new Date().getFullYear()),
    headline: cleanText(input.headline, 140),
    publicNotes: cleanText(input.publicNotes, 1200),
    privateNotes: cleanText(input.privateNotes, 2000),
    colors: Array.isArray(input.colors) ? input.colors.map(value => cleanText(value, 30)).filter(Boolean).slice(0, 5) : [],
    colorHexes: Array.isArray(input.colorHexes) ? input.colorHexes.filter(value => /^#[0-9a-f]{6}$/iu.test(value)).slice(0, 5) : [],
    featuredCharm: cleanText(input.featuredCharm, 80),
    beadedAvailable: Boolean(input.beadedAvailable),
    braidedAvailable: Boolean(input.braidedAvailable),
    quantity: Math.max(0, Math.min(999, Number(input.quantity || 0))),
    schoolPriceCents: Math.max(0, Number(input.schoolPriceCents ?? 200)),
    customPriceCents: Math.max(0, Number(input.customPriceCents ?? 300)),
    onlinePriceMinCents: Math.max(0, Number(input.onlinePriceMinCents ?? 0)),
    onlinePriceMaxCents: Math.max(0, Number(input.onlinePriceMaxCents ?? 0)),
    releaseDate: cleanText(input.releaseDate, 20),
    endDate: cleanText(input.endDate, 20),
    tiktokUrl: cleanText(input.tiktokUrl, 300),
    etsyUrl: cleanText(input.etsyUrl, 300),
    status: DROP_STATUSES.includes(input.status) ? input.status : 'draft'
  };
  if (!partial && !data.name) errors.push('Drop name is required.');
  if (!partial && !data.slug) errors.push('Drop slug is required.');
  if (!data.beadedAvailable && !data.braidedAvailable) errors.push('Select at least one bracelet style.');
  if (data.tiktokUrl && !urlPattern.test(data.tiktokUrl)) errors.push('TikTok URL must begin with https://.');
  if (data.etsyUrl && !urlPattern.test(data.etsyUrl)) errors.push('Etsy URL must begin with https://.');
  if (!Number.isFinite(data.year) || data.year < 2026 || data.year > 2100) errors.push('Enter a valid year.');
  return { data, errors };
}

export function validatePhoto(input) {
  const errors = [];
  const placement = allowedPhotoPlacementIds.has(input.placement) ? input.placement : 'unassigned';
  const data = {
    originalName: cleanText(input.originalName, 160),
    mimeType: cleanText(input.mimeType, 80),
    altText: cleanText(input.altText, 240),
    caption: cleanText(input.caption, 500),
    noFacesConfirmed: input.noFacesConfirmed === true,
    status: PHOTO_STATUSES.includes(input.status) ? input.status : 'pending',
    placement,
    placementDropId: placement === 'monthly-drop' ? cleanText(input.placementDropId, 100) : ''
  };
  if (!data.originalName) errors.push('Photo filename is required.');
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(data.mimeType)) errors.push('Only JPEG, PNG, and WebP files are supported.');
  if (!data.altText) errors.push('Photo description is required.');
  if (!data.noFacesConfirmed) errors.push('Confirm that the public photo contains no faces or partial faces.');
  if (data.placement === 'monthly-drop' && !data.placementDropId) errors.push('Choose the monthly drop for this photo.');
  return { data, errors };
}

export function validatePhotoUpdate(input) {
  const errors = [];
  const placement = allowedPhotoPlacementIds.has(input.placement) ? input.placement : '';
  const data = {
    altText: cleanText(input.altText, 240),
    caption: cleanText(input.caption, 500),
    placement,
    placementDropId: placement === 'monthly-drop' ? cleanText(input.placementDropId, 100) : ''
  };
  if (!data.altText) errors.push('Photo description is required.');
  if (!data.placement) errors.push('Choose where the photo should appear.');
  if (data.placement === 'monthly-drop' && !data.placementDropId) errors.push('Choose the monthly drop for this photo.');
  return { data, errors };
}

export function validateOrder(input, settings = {}) {
  const errors = [];
  const productType = PRODUCT_TYPES.includes(input.productType) ? input.productType : '';
  const rawQuantity = Number(input.quantity);
  const quantityLimit = productType === 'button' ? 500 : 25;
  const quantity = Number.isInteger(rawQuantity) && rawQuantity >= 1 && rawQuantity <= quantityLimit ? rawQuantity : 1;
  const fulfillmentMethod = FULFILLMENT_METHODS.includes(input.fulfillmentMethod) ? input.fulfillmentMethod : '';
  const orderType = productType === 'bracelet' && ['monthly-drop', 'custom'].includes(input.orderType) ? input.orderType : 'custom';
  const braceletStyle = ['beaded', 'braided', 'mixed'].includes(input.braceletStyle) ? input.braceletStyle : '';
  const requestedEmployee = REQUESTED_EMPLOYEES.includes(input.requestedEmployee) ? input.requestedEmployee : '';
  const shippingAddress = {
    address1: cleanText(input.shippingAddress?.address1, 160),
    address2: cleanText(input.shippingAddress?.address2, 160),
    city: cleanText(input.shippingAddress?.city, 80),
    state: cleanText(input.shippingAddress?.state, 40),
    zip: cleanText(input.shippingAddress?.zip, 12)
  };
  const productOptions = productType === 'button'
    ? {
        occasion: cleanText(input.buttonOccasion, 80),
        buttonText: cleanText(input.buttonText, 160),
        themeColors: cleanText(input.themeColors, 160),
        artworkReady: input.artworkReady === true,
        designInstructions: cleanText(input.designInstructions, 1600)
      }
    : {
        braceletStyle,
        colors: Array.isArray(input.colors) ? input.colors.map(value => cleanText(value, 40)).filter(Boolean).slice(0, 3) : [],
        charm: cleanText(input.charm, 80),
        nameWord: cleanText(input.nameWord, 18),
        size: ['small', 'standard', 'large'].includes(input.size) ? input.size : 'standard',
        giftPackaging: Boolean(input.giftPackaging)
      };
  const data = {
    firstName: cleanText(input.firstName, 80),
    contactEmail: cleanText(input.contactEmail, 160).toLowerCase(),
    phone: cleanText(input.phone, 40),
    requestedEmployee,
    productType,
    orderType,
    quantity,
    neededBy: cleanText(input.neededBy, 20),
    notes: cleanText(input.notes, 1000),
    fulfillmentMethod,
    shippingAddress,
    productOptions,
    consent: input.consent === true,
    status: ORDER_STATUSES.includes(input.status) ? input.status : 'new'
  };

  if (!data.firstName) errors.push('First name is required.');
  if (!emailPattern.test(data.contactEmail)) errors.push('A valid adult-managed contact email is required.');
  if (!validPhone(data.phone)) errors.push('Enter a valid phone number with at least 10 digits.');
  if (!REQUESTED_EMPLOYEES.includes(input.requestedEmployee ?? '')) errors.push('Choose Cheyenne, Brooklyn, or no preference.');
  if (!data.productType) errors.push('Choose a product type.');
  if (!Number.isInteger(rawQuantity) || rawQuantity < 1 || rawQuantity > quantityLimit) errors.push(`Quantity must be between 1 and ${quantityLimit}.`);
  if (!data.fulfillmentMethod) errors.push('Choose pickup, local delivery, or shipping.');
  if (!data.consent) errors.push('Consent acknowledgment is required.');

  if (data.productType === 'bracelet') {
    if (!productOptions.braceletStyle) errors.push('Choose a bracelet style.');
    if (productOptions.colors.length < 1) errors.push('Choose at least one bracelet color.');
    if (data.orderType === 'monthly-drop' && productOptions.braceletStyle === 'mixed') errors.push('Monthly-drop bracelets must be beaded or braided.');
    if (data.orderType === 'monthly-drop' && data.fulfillmentMethod === 'shipping') errors.push('Monthly-drop bracelets are local only. Choose a custom bracelet for shipping.');
  }

  if (data.productType === 'button') {
    if (!productOptions.occasion) errors.push('Choose the button or pin occasion.');
    if (!productOptions.designInstructions && !productOptions.buttonText) errors.push('Add button text or design instructions.');
  }

  if (data.fulfillmentMethod === 'shipping') {
    if (!shippingAddress.address1) errors.push('Shipping address line 1 is required.');
    if (!shippingAddress.city) errors.push('Shipping city is required.');
    if (!shippingAddress.state) errors.push('Shipping state is required.');
    if (!zipPattern.test(shippingAddress.zip)) errors.push('Enter a valid U.S. ZIP code.');
  }

  return { data: { ...data, ...calculateOrderEstimate(data, settings) }, errors };
}

export function validatePayment(input) {
  const errors = [];
  const paymentStatus = PAYMENT_STATUSES.includes(input.paymentStatus) ? input.paymentStatus : 'unpaid';
  const paymentMethod = PAYMENT_METHODS.includes(input.paymentMethod) ? input.paymentMethod : '';
  const rawAmountPaidCents = Number(input.amountPaidCents || 0);
  const amountPaidCents = Number.isFinite(rawAmountPaidCents) && rawAmountPaidCents >= 0
    ? Math.round(rawAmountPaidCents)
    : 0;
  const data = {
    paymentStatus,
    paymentMethod: paymentStatus === 'received' ? paymentMethod : '',
    amountPaidCents: paymentStatus === 'received' ? amountPaidCents : 0,
    paidAt: paymentStatus === 'received' ? cleanText(input.paidAt, 40) : '',
    paymentNote: cleanText(input.paymentNote, 500)
  };
  if (paymentStatus === 'received' && !paymentMethod) errors.push('Choose cash or Cash App.');
  if (paymentStatus === 'received' && (!Number.isFinite(rawAmountPaidCents) || amountPaidCents <= 0)) errors.push('Enter a valid amount received.');
  return { data, errors };
}

export function validateInternalNote(input) {
  return { data: { internalNote: cleanText(input.internalNote, 1200) }, errors: [] };
}

export function validateSettings(input) {
  const allowedLogos = new Set(LOGO_OPTIONS.map(item => item.id));
  const data = {
    contactEmail: cleanText(input.contactEmail, 160).toLowerCase(),
    websiteUrl: cleanText(input.websiteUrl, 300),
    tiktokUrl: cleanText(input.tiktokUrl, 300),
    tiktokHandle: cleanText(input.tiktokHandle, 80),
    etsyUrl: cleanText(input.etsyUrl, 300),
    cashAppHandle: cleanText(input.cashAppHandle, 80),
    cashAppQrUrl: cleanText(input.cashAppQrUrl, 300),
    paymentInstructions: cleanText(input.paymentInstructions, 800),
    activeLogo: allowedLogos.has(input.activeLogo) ? input.activeLogo : 'logo-03',
    schoolDropNotice: cleanText(input.schoolDropNotice, 1200),
    schoolPricingNotice: cleanText(input.schoolPricingNotice, 1200)
  };
  const errors = [];
  for (const key of NUMERIC_SETTING_KEYS) {
    const raw = input[key];
    if (raw === '' || raw === null || raw === undefined) data[key] = '';
    else {
      const cents = optionalCents(raw);
      if (cents === null) errors.push(`${key} must be a non-negative amount in cents or left blank.`);
      else data[key] = cents;
    }
  }
  for (const [key, value] of Object.entries(data)) {
    if (key.endsWith('Url') && value && key !== 'cashAppQrUrl' && !urlPattern.test(value)) errors.push(`${key} must begin with https://.`);
  }
  if (data.cashAppQrUrl && !data.cashAppQrUrl.startsWith('/media/') && !urlPattern.test(data.cashAppQrUrl)) errors.push('Cash App QR URL must be an uploaded media path or begin with https://.');
  if (data.contactEmail && !emailPattern.test(data.contactEmail)) errors.push('Contact email is invalid.');
  return { data, errors };
}
