# CharmNest Phase Ledger

## Full intended system

A public CharmNest storefront for bracelets and custom buttons/pins plus one authenticated Maker Studio that controls drops, photos, orders, fulfillment, private customer details, pricing, Cash App instructions, manual payment receipts, settings, and marketing assets.

## Implemented in this ZIP

### Phase 1B — Unified Studio and expanded custom commerce intake

- Retires the active Adult Admin lane and account selector.
- Uses one fixed Maker Studio account and password hash.
- Gives the Maker every existing drop, photo, settings, order, and publishing operation.
- Adds a public Buttons & Pins page and product entry points.
- Adds bracelet and button/pin order types.
- Adds local pickup, local delivery, and non-local shipping workflows.
- Stores shipping addresses privately and excludes them from public receipts.
- Preserves legacy bracelet orders through migration defaults and serializer fallbacks.
- Replaces the old online estimator with confirmed local prices and quote-safe configurable fees.
- Adds Cash App handle, QR-image upload, and public payment instructions.
- Adds manual cash/Cash App payment recording with status, amount, date, and internal note.
- Adds migration `0002_orders_fulfillment_payments.sql` and an ordered local migration runner.
- Adds expanded automated tests and generated public pages/assets.

## Not implemented in this ZIP

- Production D1 migration execution.
- Production Worker deployment or live provider validation.
- A live Cash App handle or QR image; the client must enter/upload them in Studio.
- Final button, delivery, shipping, gift-packaging, or shipped-bracelet prices; those remain blank until the client confirms them.
- Automatic Cash App transaction verification or reconciliation.
- Public customer photo/artwork upload.
- Etsy checkout changes, Stripe, Shopify, tax calculation, shipping labels, or automated email delivery.
- The separate client pricing flyer discussed earlier.

## Remaining phases

### Phase 2 — Production activation

- Apply migration `0002` to production D1.
- Deploy the updated Worker and static assets.
- Enter confirmed delivery, shipping, button, gift-packaging, and shipped-bracelet pricing.
- Enter the Cash App handle and upload the QR image.
- Prove one local bracelet order, one shipping order, one button order, and one manual payment receipt.

### Phase 3 — Etsy commerce activation

- Create or update Etsy listings and connect the appropriate product links.
- Prove one Etsy order and fulfillment journey.

### Phase 4 — Evidence-based commerce review

- Use real order volume and operating friction to decide whether additional checkout or shipping automation is justified.

## Repair receipt

- Added deterministic lockfile support for the local updater.
- Made `npm run validate` rebuild generated output before checking it.
- Fixed button/pin order persistence for the bracelet-only gift-packaging column.
- Artifact-environment `npm run check`: 14 pages, 24 required files, and 11/11 tests passed.

## Validation status

STRUCTURALLY CHECKED — LOCAL VALIDATION REQUIRED
