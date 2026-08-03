# CharmNest Validation Summary

**Artifact status:** STRUCTURALLY CHECKED — LOCAL VALIDATION REQUIRED

## Repair applied after updater failure

- The first updater run skipped installation because the artifact had no lockfile, then validated the repository's stale ignored `dist/` output.
- Added `package-lock.json`.
- Changed `npm run validate` to rebuild `dist/` before running structural validation.
- Corrected button-order persistence so an omitted bracelet-only gift-packaging field is stored as `0`, not a null/invalid binding, in both local SQLite and Cloudflare D1 stores.

## Structural checks performed for this repaired artifact

- Source ZIP integrity checked before modification.
- Repository root and identity verified from the uploaded snapshot.
- Required migration, runtime, public page, product illustration, Studio, and test files verified present.
- Generated `dist/` rebuilt from `public/` and page templates.
- JavaScript/module syntax checked.
- ZIP reopened after packaging and its single repository root verified.
- Private reference video frames were not copied into `public/` or `dist/`.

## Validators included for local execution

The repo's `npm run check` command is designed to prove:

- Deterministic static build.
- Required-file, page, asset, internal-link, and unresolved-token checks.
- One active Maker Studio lane and no runtime dependency on `ADULT_PASSWORD_HASH`.
- Migration presence.
- Maker publish/photo/settings/order authority.
- Rejection of the retired Adult login.
- `$2` monthly-drop and `$3` local-custom bracelet pricing.
- Shipping-address requirements and public receipt privacy.
- Button/pin quote behavior before and after pricing configuration.
- Cash/Cash App payment receipt recording.
- Legacy order readability.
- Password hashing and signed-session tamper resistance.

## Not validated in this environment

- The repaired artifact passed `npm run check` in the artifact build environment: deterministic rebuild, structural validator, and 11 automated tests.
- The user's updater must still rerun this repaired ZIP and produce its own local evidence receipt.
- Production D1 migration.
- Live Cloudflare Worker, D1, R2, custom-domain, and browser journeys.
- Cash App QR scanning or external transaction truth.
- Final shipping, delivery, button, or gift-packaging prices.
- Live Etsy checkout, refunds, taxes, shipping labels, or email delivery.
- School authorization or legal/product-safety review.

## Required production order

1. Apply `migrations/0002_orders_fulfillment_payments.sql` to production D1.
2. Deploy the Worker/static asset version.
3. Configure pricing and Cash App settings in Maker Studio.
4. Execute the four required live order/payment journeys.
