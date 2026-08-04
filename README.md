# CharmNest

**Little charms. Big vibes.**

CharmNest is a mobile-first public storefront plus one private **Maker Studio** for bracelets, custom buttons and pins, school drops, customer requests, fulfillment, pricing, payment receipts, brand assets, product photos, and flyers.

## Implemented in this snapshot

- One Maker Studio login and operating lane.
- Public custom-order form requires a private phone number.
- Customers may optionally request Cheyenne, Brooklyn, or no specific Maker.
- Work Queue, Ready, Paid, and Archive order views with filters for status, payment, product, Maker request, fulfillment, customer, phone, email, and order number.
- Paid-but-unfinished orders remain in the Work Queue until the item is ready or completed.
- Studio forms display **No changes**, **Unsaved changes**, **Saving…**, **Saved ✓**, or a clear save error.
- Photos can be assigned to the homepage hero, Bracelets category, Buttons & Pins category, Monthly Drop, public gallery, or no public location.
- The Drops section includes step-by-step instructions and plain-language status definitions.
- Maker can create, edit, publish, sell out, and archive drops.
- Public Buttons & Pins page for graduations, memorials/funerals, birthdays, parties, reunions, showers, and group events.
- Local pickup, local delivery, and non-local shipping workflows with private shipping addresses.
- Confirmed local bracelet pricing: `$2` monthly drop and `$3` local custom.
- Quote-safe estimator for shipping, delivery, buttons, and gift packaging.
- Cash App handle, QR image, payment instructions, and manual cash/Cash App receipt tracking.
- Public receipts mask email and exclude phone numbers, shipping addresses, requested Maker details, and private notes.
- Local Node + SQLite runtime and Cloudflare Worker + D1 + R2 runtime.
- Ordered migration runner with `schema_migrations` receipts.

## Local start

1. Copy `.dev.vars.example` to `.dev.vars`.
2. Generate the Studio password hash with `npm run auth:hash -- "your-password"`.
3. Paste the hash into `MAKER_PASSWORD_HASH`.
4. Set a random `SESSION_SECRET` of at least 32 characters.
5. Run `npm run seed`.
6. Run `npm run check`.
7. Run `npm run dev`.
8. Open `http://localhost:8788` and `http://localhost:8788/studio/`.

## Validation

`npm run check`

`npm run validate` rebuilds `dist/` before structural validation so updater runs cannot validate stale generated pages. The lockfile supports deterministic updater/install behavior.

## Production migrations

Apply migrations in order before deploying the matching Worker routes:

1. `migrations/0002_orders_fulfillment_payments.sql`
2. `migrations/0003_studio_order_workflow.sql`

Do not deploy the new order, phone, employee-request, photo-placement, or Studio workflow routes against an unmigrated production D1 database.
