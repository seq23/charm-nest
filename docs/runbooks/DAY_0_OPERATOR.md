# CharmNest Day-0 Operator Runbook

## Process map

Customer -> chooses bracelet or buttons/pins -> enters email and phone -> optionally requests Cheyenne or Brooklyn -> chooses pickup, delivery, or shipping -> submits request -> receives a privacy-safe confirmation.

Maker -> signs into one Studio -> uses Work Queue while confirming/making -> records payment when received -> marks finished items Ready -> marks fulfilled items Completed -> finds completed/cancelled orders in Archive.

Maker -> uploads a safe photo -> chooses its website location -> approves it -> the approved image appears in the selected public location.

Maker -> creates a Drop as a draft -> assigns an approved Monthly Drop photo -> reviews -> publishes -> marks sold out or archives later.

## Local setup

1. Copy `.dev.vars.example` to `.dev.vars`.
2. Generate the Maker Studio password hash with `npm run auth:hash -- "password"`.
3. Add a random `SESSION_SECRET` of at least 32 characters.
4. Run `npm run seed`.
5. Run `npm run check`.
6. Run `npm run dev`.

## Order views

- **Work Queue:** New, Confirmed, and Making orders. A paid order stays here until it is ready or completed.
- **Ready:** Finished items waiting for pickup, delivery, or shipping.
- **Paid:** Every order whose payment is marked Received, regardless of making status.
- **Archive:** Completed and Cancelled orders. These are saved, not deleted.

Use filters for name, phone, email, order number, status, payment, product, requested Maker, and fulfillment.

## Save-state meanings

- **No changes:** nothing has been edited.
- **Unsaved changes:** the form changed but has not reached the server.
- **Saving…:** the Studio is sending the change.
- **Saved ✓:** the server confirmed the change.
- **Could not save:** the change did not complete; keep the screen open and retry after correcting the error.

## Photo placement

- **Homepage hero:** the large main image near the top of the homepage.
- **Bracelets category:** bracelet product/category images.
- **Buttons & Pins category:** custom button/pin product images.
- **Monthly Drop:** belongs to one selected Drop and can become its cover image.
- **Order example/gallery:** appears in the public Recent Creations gallery.
- **Not currently displayed:** stays private from public placement.

A photo appears publicly only after it is approved and assigned to a public location.

## Drop workflow

1. Create the Drop.
2. Add colors, styles, quantity, dates, and public copy.
3. Save as Draft while preparing.
4. Upload and approve a photo, then assign it to Monthly Drop.
5. Publish when ready.
6. Mark Sold Out when unavailable.
7. Archive when it should leave the active public list.

## Production activation order

1. Apply `0002_orders_fulfillment_payments.sql` if it has not already been applied.
2. Apply `0003_studio_order_workflow.sql`.
3. Deploy the Worker and assets.
4. Sign into Maker Studio.
5. Prove one bracelet request with phone and no Maker preference.
6. Prove one button request assigned to Cheyenne or Brooklyn.
7. Prove one shipped request and verify the address and phone appear only in Studio.
8. Mark one paid unfinished order and confirm it remains in Work Queue and appears in Paid.
9. Mark one order Ready, then Completed, and confirm it moves to Archive.
10. Upload, approve, and place one photo.

## Privacy and safety

- Phone numbers, full emails, shipping addresses, requested Maker details, payment notes, and internal notes stay private in Studio.
- Public product photos may show hands and wrists but no face, partial face, reflection, school identifier, address, or private document.
- Public customers do not upload personal button artwork.
- Confirm button artwork through an adult-managed private channel.

## Rollback

- Change a public Drop back to Draft or Archived.
- Set a photo to Not currently displayed, reject it, or archive it.
- Mark an incorrect payment Unpaid after checking the real record.
- Restore a D1 backup if a migration or deployment failure corrupts production behavior.
- Rotate the Maker password and session secret after suspected exposure.
