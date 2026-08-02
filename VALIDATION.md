# CharmNest Validation Summary

**Artifact status:** STRUCTURALLY CHECKED — LOCAL VALIDATION REQUIRED

## Completed checks

- `npm run build` passed.
- `npm run validate` passed.
- JavaScript and module syntax checks passed.
- Required-file and page-presence checks passed.
- Five original numbered logo PNGs were verified.
- Thirteen generated HTML pages were verified.
- Internal static links and asset references were checked.
- Private face-containing reference art was verified as excluded from `dist/`.
- `npm test` passed: 5 tests, 0 failures.
- Local HTTP smoke checks returned successful responses for the home page, Studio login page, and public settings API.
- ZIP integrity and packaging-root checks are recorded after packaging.

## Behavior proven by automated tests

- Password hashing and verification.
- Signed-session creation and tamper rejection.
- Maker attempts to publish are downgraded to Adult Admin review.
- Adult Admin can publish a drop and the public API excludes private notes.
- Photo uploads fail without explicit no-face confirmation.
- Accepted photo uploads remain pending until Adult Admin review.
- Public special-order receipts mask the contact email.
- Special-order starting-price calculation.

## Not validated in this environment

- Live Cloudflare Worker deployment.
- Live D1 database and R2 object storage bindings.
- Production secrets, domain, TLS, or provider rate limits.
- Live Etsy listings, payment processing, refunds, shipping labels, or fulfillment.
- Live TikTok, contact-email, website, or Etsy URLs.
- Email delivery from the special-order form.
- School authorization or legal/product-safety review.
- Final product photography or final logo selection.
- Full production browser E2E testing against deployed provider resources.

## Local runtime note

The included Node + SQLite runtime is a working local validation and operating mode. The Cloudflare D1/R2 runtime is implemented structurally and requires Phase 2 provider activation before it can be called live or production-proven.
