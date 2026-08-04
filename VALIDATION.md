# CharmNest Validation Summary

**Artifact status:** STRUCTURALLY CHECKED — LOCAL VALIDATION REQUIRED

## Structural and automated checks designed for this artifact

- Deterministic clean rebuild of `dist/`.
- Required migration, runtime, public page, product illustration, Studio, and test files.
- JavaScript/module syntax.
- Fourteen generated HTML pages and internal asset/link integrity.
- One fixed Maker Studio account and no active Adult lane.
- Required phone and optional requested-Maker order fields.
- Public privacy boundary for phone, email, address, requested Maker, payment notes, and internal notes.
- Work Queue, Ready, Paid, and Archive order filtering.
- Paid-but-unfinished orders remain visible in Work Queue.
- Photo placement persistence and public approved-photo rendering.
- Monthly Drop photo association.
- Visible Studio save-state markers and failure language.
- Drop instructions and status explanations.
- `$2` monthly-drop and `$3` local-custom bracelet pricing.
- Shipping-address requirements and quote-safe pricing.
- Cash/Cash App manual payment recording.
- Legacy order readability.
- Password hashing and session tamper resistance.

## Validation not represented as production proof

- Production D1 migration execution.
- Live Cloudflare Worker, D1, R2, custom-domain, or browser journeys.
- GitHub-to-Cloudflare deployment result.
- Cash App QR scanning or external transaction truth.
- SMS delivery, because SMS is not implemented.
- Live Etsy checkout, refunds, taxes, shipping labels, or email delivery.
- School authorization or legal/product-safety review.

## Required production order

1. Apply `migrations/0002_orders_fulfillment_payments.sql` if production has not already received it.
2. Apply `migrations/0003_studio_order_workflow.sql`.
3. Deploy the Worker and static assets.
4. Prove the required public order and private Studio journeys.
