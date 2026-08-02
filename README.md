# CharmNest

**Little charms. Big vibes.**

CharmNest is a mobile-first public bracelet storefront plus a private, role-based **CharmNest Studio** for managing school drops, product photos, special notes, brand assets, special orders, and downloadable flyers.

## What is in this baseline

- Public storefront with school-drop, shop, styles, care, about, FAQ, policies, contact, and custom-order pages.
- `$2` confirmed school-drop bracelets and `$3` local custom-color orders.
- Separate higher online pricing and Etsy-ready product links.
- Five numbered logo concepts plus a placeholder and uploaded-logo slot.
- Private Studio with Maker and Adult Admin roles.
- Drop drafts, review, publishing, sold-out and archive states.
- Public notes separated from private production notes.
- Photo upload, browser-side web optimization, adult approval, and no-face publishing gate.
- Special-order intake stored in the database.
- Flyer previews and downloadable SVG exports.
- Local Node + SQLite runtime for immediate testing.
- Cloudflare Worker + D1 + R2 runtime for the provider-activation phase.

## Local start

1. Copy `.dev.vars.example` to `.dev.vars`.
2. Generate password hashes:

   `npm run auth:hash -- "your-password"`

3. Paste the generated hashes into `.dev.vars`.
4. Set a long random `SESSION_SECRET`.
5. Run:

   `npm run seed`

6. Start:

   `npm run dev`

7. Open `http://localhost:8788` and `http://localhost:8788/studio/`.

## Validation

`npm run check`

This baseline can be fully exercised locally. Cloudflare D1/R2, a production domain, provider secrets, Etsy listings, and payment processing are not configured in this ZIP.
