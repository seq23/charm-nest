import { DEFAULT_SETTINGS, NUMERIC_SETTING_KEYS } from './constants.mjs';

export function nowIso() {
  return new Date().toISOString();
}

export function newId(prefix) {
  return `${prefix}_${crypto.randomUUID().replaceAll('-', '')}`;
}

export function decodeJson(value, fallback) {
  try { return JSON.parse(value); } catch { return fallback; }
}

export function serializeDrop(row, photos = []) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    month: row.month,
    year: row.year,
    headline: row.headline,
    publicNotes: row.public_notes,
    privateNotes: row.private_notes,
    colors: decodeJson(row.colors_json, []),
    colorHexes: decodeJson(row.color_hexes_json, []),
    featuredCharm: row.featured_charm,
    beadedAvailable: Boolean(row.beaded_available),
    braidedAvailable: Boolean(row.braided_available),
    quantity: row.quantity,
    schoolPriceCents: row.school_price_cents,
    customPriceCents: row.custom_price_cents,
    onlinePriceMinCents: row.online_price_min_cents,
    onlinePriceMaxCents: row.online_price_max_cents,
    releaseDate: row.release_date,
    endDate: row.end_date,
    tiktokUrl: row.tiktok_url,
    etsyUrl: row.etsy_url,
    status: row.status,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    publishedAt: row.published_at,
    photos
  };
}

export function serializePhoto(row) {
  if (!row) return null;
  return {
    id: row.id,
    originalKey: row.original_key,
    webKey: row.web_key,
    thumbKey: row.thumb_key,
    originalName: row.original_name,
    mimeType: row.mime_type,
    sizeBytes: row.size_bytes,
    altText: row.alt_text,
    caption: row.caption,
    noFacesConfirmed: Boolean(row.no_faces_confirmed),
    status: row.status,
    uploadedBy: row.uploaded_by,
    createdAt: row.created_at,
    approvedBy: row.approved_by,
    approvedAt: row.approved_at,
    webUrl: `/media/${encodeURIComponent(row.web_key)}`,
    thumbUrl: `/media/${encodeURIComponent(row.thumb_key)}`
  };
}

function legacyProductOptions(row) {
  return {
    braceletStyle: row.bracelet_style || '',
    colors: decodeJson(row.colors_json, []),
    charm: row.charm || '',
    nameWord: row.name_word || '',
    size: row.size || 'standard',
    giftPackaging: Boolean(row.gift_packaging)
  };
}

export function serializeOrder(row, { includePrivate = false } = {}) {
  if (!row) return null;
  const productOptions = decodeJson(row.product_options_json, null) || legacyProductOptions(row);
  const shippingAddress = decodeJson(row.shipping_address_json, {});
  const order = {
    id: row.id,
    firstName: row.first_name,
    contactEmail: includePrivate ? row.contact_email : maskEmail(row.contact_email),
    productType: row.product_type || 'bracelet',
    orderType: row.order_type || 'custom',
    productOptions,
    braceletStyle: productOptions.braceletStyle || row.bracelet_style || '',
    colors: productOptions.colors || decodeJson(row.colors_json, []),
    charm: productOptions.charm || row.charm || '',
    nameWord: productOptions.nameWord || row.name_word || '',
    size: productOptions.size || row.size || 'standard',
    giftPackaging: Boolean(productOptions.giftPackaging ?? row.gift_packaging),
    quantity: row.quantity,
    neededBy: row.needed_by,
    notes: row.notes,
    fulfillmentMethod: row.fulfillment_method || 'pickup',
    estimatedCents: row.estimated_cents,
    estimateComplete: row.estimate_complete === undefined ? true : Boolean(row.estimate_complete),
    estimateNote: row.estimate_note || '',
    status: row.status,
    paymentStatus: row.payment_status || 'unpaid',
    paymentMethod: row.payment_method || '',
    amountPaidCents: row.amount_paid_cents || 0,
    paidAt: row.paid_at || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
  if (includePrivate) {
    order.shippingAddress = shippingAddress;
    order.paymentNote = row.payment_note || '';
  }
  return order;
}

export function maskEmail(value) {
  const [name, domain] = String(value || '').split('@');
  if (!name || !domain) return '';
  return `${name.slice(0, 1)}***@${domain}`;
}

export function mergeSettings(rows) {
  const values = { ...DEFAULT_SETTINGS };
  for (const row of rows) values[row.key] = row.value;
  for (const key of NUMERIC_SETTING_KEYS) {
    if (values[key] === '') continue;
    const number = Number(values[key]);
    values[key] = Number.isFinite(number) ? number : '';
  }
  return values;
}
