export const DROP_STATUSES = Object.freeze(['draft', 'review', 'published', 'sold-out', 'archived']);
export const PHOTO_STATUSES = Object.freeze(['pending', 'approved', 'rejected', 'archived']);
export const ORDER_STATUSES = Object.freeze(['new', 'confirmed', 'making', 'ready', 'completed', 'cancelled']);
export const ROLES = Object.freeze(['maker', 'adult']);

export const DEFAULT_SETTINGS = Object.freeze({
  siteName: 'CharmNest',
  tagline: 'Little charms. Big vibes.',
  activeLogo: 'placeholder',
  contactEmail: '',
  websiteUrl: '',
  tiktokUrl: '',
  tiktokHandle: '',
  etsyUrl: '',
  schoolDropNotice: 'Featured colors, charms, quantities, release dates, and availability may change. Some designs are limited and may sell out. Check CharmNest on TikTok for the latest confirmed drop.',
  schoolPricingNotice: 'School pricing applies only to eligible local school sales. Online custom products, gift packaging, shipping, marketplace fees, and larger orders use separate online pricing.',
  photoRule: 'Hands and wrists are allowed. Faces, partial faces, and face reflections are not allowed on public pages.'
});

export const LOGO_OPTIONS = Object.freeze([
  { id: 'placeholder', label: 'Placeholder logo', url: '/brand/placeholder-logo.svg' },
  { id: 'logo-01', label: 'Logo 01 — Bubble Heart', url: '/brand/logo-options/logo-01-bubble-heart-web.webp' },
  { id: 'logo-02', label: 'Logo 02 — Heart Nest', url: '/brand/logo-options/logo-02-heart-nest-web.webp' },
  { id: 'logo-03', label: 'Logo 03 — Beaded Badge', url: '/brand/logo-options/logo-03-beaded-badge-web.webp' },
  { id: 'logo-04', label: 'Logo 04 — Braided CN', url: '/brand/logo-options/logo-04-braided-cn-web.webp' },
  { id: 'logo-05', label: 'Logo 05 — Charm Bracelet', url: '/brand/logo-options/logo-05-charm-bracelet-web.webp' },
  { id: 'uploaded', label: 'Uploaded selected logo', url: '/media/brand/selected-logo' }
]);

export const PUBLIC_PRICING = Object.freeze({
  schoolDropCents: 200,
  schoolCustomCents: 300,
  online: [
    ['Custom braided bracelet', '$6–$8'],
    ['Custom elastic color bracelet', '$8–$10'],
    ['Name bracelet', '$10–$12'],
    ['Bead-and-charm bracelet', '$12–$15'],
    ['Matching braided pair', '$12–$16'],
    ['Matching charm pair', '$20–$24'],
    ['Mixed bestie set', '$16–$20'],
    ['Bracelet stack', '$24–$36'],
    ['Party packs', '$40–$90']
  ]
});
