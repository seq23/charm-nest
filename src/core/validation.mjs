import { DROP_STATUSES, PHOTO_STATUSES, ORDER_STATUSES, LOGO_OPTIONS } from './constants.mjs';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/u;
const urlPattern = /^https:\/\//u;

export function cleanText(value, max = 500) {
  return String(value ?? '').replace(/[<>]/gu, '').trim().slice(0, max);
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
    onlinePriceMinCents: Math.max(0, Number(input.onlinePriceMinCents ?? 600)),
    onlinePriceMaxCents: Math.max(0, Number(input.onlinePriceMaxCents ?? 1500)),
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
  const data = {
    originalName: cleanText(input.originalName, 160),
    mimeType: cleanText(input.mimeType, 80),
    altText: cleanText(input.altText, 240),
    caption: cleanText(input.caption, 500),
    noFacesConfirmed: input.noFacesConfirmed === true,
    status: PHOTO_STATUSES.includes(input.status) ? input.status : 'pending'
  };
  if (!data.originalName) errors.push('Photo filename is required.');
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(data.mimeType)) errors.push('Only JPEG, PNG, and WebP files are supported.');
  if (!data.altText) errors.push('Photo description is required.');
  if (!data.noFacesConfirmed) errors.push('Confirm that the public photo contains no faces or partial faces.');
  return { data, errors };
}

export function validateOrder(input) {
  const errors = [];
  const quantity = Math.max(1, Math.min(25, Number(input.quantity || 1)));
  const style = ['beaded', 'braided', 'mixed'].includes(input.braceletStyle) ? input.braceletStyle : '';
  const data = {
    firstName: cleanText(input.firstName, 80),
    contactEmail: cleanText(input.contactEmail, 160).toLowerCase(),
    braceletStyle: style,
    quantity,
    colors: Array.isArray(input.colors) ? input.colors.map(value => cleanText(value, 40)).filter(Boolean).slice(0, 3) : [],
    charm: cleanText(input.charm, 80),
    nameWord: cleanText(input.nameWord, 18),
    size: ['small', 'standard', 'large'].includes(input.size) ? input.size : 'standard',
    neededBy: cleanText(input.neededBy, 20),
    giftPackaging: Boolean(input.giftPackaging),
    notes: cleanText(input.notes, 1000),
    consent: input.consent === true,
    status: ORDER_STATUSES.includes(input.status) ? input.status : 'new'
  };
  if (!data.firstName) errors.push('First name is required.');
  if (!emailPattern.test(data.contactEmail)) errors.push('A valid adult-managed contact email is required.');
  if (!data.braceletStyle) errors.push('Choose a bracelet style.');
  if (data.colors.length < 1) errors.push('Choose at least one color.');
  if (!data.consent) errors.push('Consent acknowledgment is required.');
  const base = style === 'braided' ? 600 : style === 'mixed' ? 1600 : 800;
  let estimatedCents = base * quantity;
  if (data.nameWord) estimatedCents += 200 * quantity;
  if (data.charm && style !== 'braided') estimatedCents += 200 * quantity;
  if (data.giftPackaging) estimatedCents += 200;
  return { data: { ...data, estimatedCents }, errors };
}

export function validateSettings(input) {
  const allowedLogos = new Set(LOGO_OPTIONS.map(item => item.id));
  const data = {
    contactEmail: cleanText(input.contactEmail, 160).toLowerCase(),
    websiteUrl: cleanText(input.websiteUrl, 300),
    tiktokUrl: cleanText(input.tiktokUrl, 300),
    tiktokHandle: cleanText(input.tiktokHandle, 80),
    etsyUrl: cleanText(input.etsyUrl, 300),
    activeLogo: allowedLogos.has(input.activeLogo) ? input.activeLogo : 'placeholder',
    schoolDropNotice: cleanText(input.schoolDropNotice, 1200),
    schoolPricingNotice: cleanText(input.schoolPricingNotice, 1200)
  };
  const errors = [];
  for (const [key, value] of Object.entries(data)) {
    if ((key.endsWith('Url')) && value && !urlPattern.test(value)) errors.push(`${key} must begin with https://.`);
  }
  if (data.contactEmail && !emailPattern.test(data.contactEmail)) errors.push('Contact email is invalid.');
  return { data, errors };
}
