# CharmNest Phase Ledger

## Full intended system

A public CharmNest storefront for bracelets and custom buttons/pins plus one authenticated Maker Studio that controls drops, photo placement, active and archived orders, fulfillment, private customer details, pricing, Cash App instructions, manual payment receipts, settings, and marketing assets.

## Phase ledger

| Phase | Capability | Status |
| --- | --- | --- |
| Phase 1A | Storefront, drops, photos, Studio foundation | Complete |
| Phase 1B | Unified Maker Studio, buttons/pins, fulfillment, quote-safe pricing, payment records | Complete |
| Phase 1C | Phone intake, requested Maker, save feedback, order views/filters, photo placement, drop instructions | Implemented in this ZIP |
| Phase 2 | Production migration and deployment | Not included |
| Phase 3 | Etsy commerce activation | Not included |
| Phase 4 | Evidence-based commerce review | Not included |

## Implemented in this ZIP

### Phase 1C — Studio workflow clarity and order operations

- Adds required private phone numbers to custom orders.
- Adds optional Cheyenne, Brooklyn, or no-preference Maker requests.
- Keeps phone, requested Maker, shipping address, and internal notes out of public receipts.
- Adds visible Studio states: No changes, Unsaved changes, Saving…, Saved ✓, and save errors.
- Adds Work Queue, Ready, Paid, and Archive views.
- Keeps paid-but-unfinished work visible in Work Queue.
- Moves Ready orders into a dedicated fulfillment view.
- Moves Completed and Cancelled orders into Archive without deleting them.
- Adds filters for customer/order search, status, payment state/method, product, requested Maker, and fulfillment method.
- Adds private internal order notes.
- Adds photo placement controls for hero, bracelet category, buttons category, monthly drop, public gallery, or no public location.
- Adds public rendering for approved Studio-selected hero/category/gallery photos.
- Adds plain-language photo-placement and Drop workflow instructions.
- Adds migration `0003_studio_order_workflow.sql`.
- Updates local SQLite and Cloudflare D1 stores, APIs, tests, validators, docs, and generated output.

## Not implemented in this ZIP

- SMS or text-message notifications.
- Separate Cheyenne and Brooklyn accounts, schedules, payroll, commissions, or performance tracking.
- Automatic Cash App transaction verification.
- Customer accounts or public artwork uploads.
- Permanent deletion of completed orders.
- Production D1 migration or Cloudflare deployment.
- Etsy checkout changes, Stripe, Shopify, tax calculations, shipping labels, or automated email delivery.
- The separate client pricing flyer.

## Remaining phases

### Phase 2 — Production activation

- Apply migrations `0002` and `0003` to production D1 in order.
- Deploy the Worker and generated assets through the connected GitHub/Cloudflare workflow.
- Prove one local bracelet request, one button request, one shipped request, one paid unfinished order, one ready item, one archived item, and one photo placement.

### Phase 3 — Etsy commerce activation

- Create or update Etsy listings and connect the appropriate product links.

### Phase 4 — Evidence-based commerce review

- Use real order volume and operating friction to decide whether more checkout, shipping, or communication automation is justified.

## Validation status

STRUCTURALLY CHECKED — LOCAL VALIDATION REQUIRED
