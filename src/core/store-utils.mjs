import { DEFAULT_SETTINGS } from './constants.mjs';

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

export function serializeOrder(row, includeEmail = true) {
  if (!row) return null;
  return {
    id: row.id,
    firstName: row.first_name,
    contactEmail: includeEmail ? row.contact_email : maskEmail(row.contact_email),
    braceletStyle: row.bracelet_style,
    quantity: row.quantity,
    colors: decodeJson(row.colors_json, []),
    charm: row.charm,
    nameWord: row.name_word,
    size: row.size,
    neededBy: row.needed_by,
    giftPackaging: Boolean(row.gift_packaging),
    notes: row.notes,
    estimatedCents: row.estimated_cents,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export function maskEmail(value) {
  const [name, domain] = String(value || '').split('@');
  if (!name || !domain) return '';
  return `${name.slice(0, 1)}***@${domain}`;
}

export function mergeSettings(rows) {
  const values = { ...DEFAULT_SETTINGS };
  for (const row of rows) values[row.key] = row.value;
  return values;
}
