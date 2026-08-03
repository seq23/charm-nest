# CharmNest Day-0 Operator Runbook

## Process map

Public visitor -> selects bracelet or button/pin -> chooses pickup, local delivery, or shipping -> submits request -> receives masked public receipt and payment guidance.

Maker -> signs into one Studio lane -> reviews private customer and fulfillment details -> confirms quote -> updates order status -> records cash or Cash App payment -> fulfills order.

Maker -> creates/edits drop -> uploads safe photos -> approves them -> publishes or archives the drop.

## Local setup

1. Copy `.dev.vars.example` to `.dev.vars`.
2. Generate the Maker Studio password hash with `npm run auth:hash -- "password"`.
3. Add a random `SESSION_SECRET` of at least 32 characters.
4. Run `npm run seed`.
5. Run `npm run check`.
6. Run `npm run dev`.

## Production activation order

1. Apply D1 migration `0002_orders_fulfillment_payments.sql`.
2. Deploy the Worker and assets.
3. Sign into Maker Studio.
4. Enter confirmed delivery, shipping, button, gift-packaging, and shipped-bracelet prices.
5. Enter the Cash App handle and upload the QR image.
6. Prove one local bracelet request.
7. Prove one shipped request and verify the address is visible only in Studio.
8. Prove one custom button request.
9. Record one cash or Cash App payment.

## Quote safety

- `$2` monthly-drop and `$3` local-custom bracelet prices are confirmed.
- Blank configurable fees remain quote-required.
- Never tell a customer to pay an incomplete quote.
- Use `0` only when a fee has been intentionally confirmed as free.

## Photo and artwork safety

- Public product photos may show hands and wrists.
- No face, partial face, face reflection, school identifier, address, or private document.
- Public customers do not upload personal button artwork.
- Confirm the request first, then use an adult-managed private channel.

## Payment recording

- Mark received only after the Maker verifies the payment.
- Choose cash or Cash App.
- Record the exact amount and date.
- Do not treat the Studio record as automatic provider verification.

## Rollback

- Unpublish by changing a drop to draft or archived.
- Reject or archive an unsafe photo.
- Restore a D1 backup if a migration/deployment failure corrupts production behavior.
- Rotate the Maker password and session secret after suspected exposure.
