export const DROP_STATUSES = Object.freeze(['draft', 'review', 'published', 'sold-out', 'archived']);
export const PHOTO_STATUSES = Object.freeze(['pending', 'approved', 'rejected', 'archived']);
export const ORDER_STATUSES = Object.freeze(['new', 'confirmed', 'making', 'ready', 'completed', 'cancelled']);
export const PAYMENT_STATUSES = Object.freeze(['unpaid', 'received']);
export const PAYMENT_METHODS = Object.freeze(['cash', 'cashapp']);
export const PRODUCT_TYPES = Object.freeze(['bracelet', 'button']);
export const FULFILLMENT_METHODS = Object.freeze(['pickup', 'local-delivery', 'shipping']);
export const ROLES = Object.freeze(['maker']);

export const DEFAULT_SETTINGS = Object.freeze({
  siteName: 'CharmNest',
  tagline: 'Little charms. Big vibes.',
  activeLogo: 'logo-03',
  contactEmail: '',
  websiteUrl: '',
  tiktokUrl: 'https://www.tiktok.com/@da.prettiest55',
  tiktokHandle: '@da.prettiest55',
  etsyUrl: '',
  cashAppHandle: '',
  cashAppQrUrl: '',
  paymentInstructions: 'Pay only after CharmNest confirms your order and total. Include your order reference in the payment note.',
  localDropBraceletCents: 200,
  localCustomBraceletCents: 300,
  localDeliveryFeeCents: '',
  shippedCustomBraceletCents: '',
  shippingFeeCents: '',
  buttonUnitCents: '',
  buttonSetupFeeCents: '',
  giftPackagingFeeCents: '',
  schoolDropNotice: 'Featured colors, charms, quantities, release dates, and availability may change. Some designs are limited and may sell out. Check CharmNest on TikTok for the latest confirmed drop.',
  schoolPricingNotice: 'School pricing applies only to eligible local school sales. Shipped custom products, gift packaging, delivery, and larger orders may use separate pricing.',
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
  localDropBraceletCents: 200,
  localCustomBraceletCents: 300,
  quoteRequired: [
    'Local delivery',
    'Shipped custom bracelets',
    'Custom buttons and pins',
    'Gift packaging'
  ]
});

export const NUMERIC_SETTING_KEYS = Object.freeze([
  'localDropBraceletCents',
  'localCustomBraceletCents',
  'localDeliveryFeeCents',
  'shippedCustomBraceletCents',
  'shippingFeeCents',
  'buttonUnitCents',
  'buttonSetupFeeCents',
  'giftPackagingFeeCents'
]);
