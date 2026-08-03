# CharmNest

**Little charms. Big vibes.**

CharmNest is a mobile-first public storefront plus one private **Maker Studio** for bracelets, custom buttons and pins, school drops, customer requests, fulfillment, pricing, payment receipts, brand assets, product photos, and flyers.

## Implemented in this snapshot

- One Maker Studio login and operating lane. There is no active Adult Admin lane.
- Maker can create, edit, publish, sell out, and archive drops.
- Maker can upload, approve, reject, and manage public product photos.
- Public buttons-and-pins page for graduations, memorials/funerals, birthdays, parties, reunions, showers, and group events.
- Product-aware custom-order form for bracelets and round pin-back buttons.
- Local-order checkbox with pickup or delivery choices.
- Non-local shipping option with required private shipping address.
- Confirmed local bracelet pricing: `$2` monthly drop and `$3` local custom.
- Quote-safe estimator for shipping, delivery, buttons, and gift packaging. Missing prices do not produce fabricated totals.
- Cash App handle, QR image, and payment-instruction settings.
- Manual cash or Cash App payment receipt tracking in Studio.
- Public receipts mask email and exclude shipping addresses.
- Local Node + SQLite runtime and Cloudflare Worker + D1 + R2 runtime.
- Ordered local migration runner with `schema_migrations` receipts.

## Local start

1. Copy `.dev.vars.example` to `.dev.vars`.
2. Generate the single Studio password hash:

   `npm run auth:hash -- "your-password"`

3. Paste the hash into `MAKER_PASSWORD_HASH`.
4. Set a random `SESSION_SECRET` of at least 32 characters.
5. Run `npm run seed`.
6. Run `npm run dev`.
7. Open `http://localhost:8788` and `http://localhost:8788/studio/`.

## Validation

`npm run check`

`npm run validate` now rebuilds `dist/` before structural validation, so updater runs cannot validate stale generated pages. `npm run check` adds the automated tests. A lockfile is included for deterministic updater/install behavior. Production D1 migration and deployment are separate activation steps.

## Production migration

Before deploying this version to the current production database, apply the new D1 migration through the repo's normal Wrangler migration workflow. The required migration is:

- `migrations/0002_orders_fulfillment_payments.sql`

Do not deploy the new Worker order routes against an unmigrated production D1 database.
