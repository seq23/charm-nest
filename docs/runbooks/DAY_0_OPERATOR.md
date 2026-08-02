# CharmNest Day-0 Operator Runbook

## Process map

Public visitor -> views confirmed drop -> submits special-order request -> Adult Admin reviews request.

Maker -> signs in -> creates draft -> uploads no-face photos -> adds public/private notes -> submits for review.

Adult Admin -> reviews copy and images -> approves photos -> publishes drop -> monitors orders -> marks sold out or archives.

## Local setup

1. Copy `.dev.vars.example` to `.dev.vars`.
2. Generate separate Maker and Adult Admin password hashes with `npm run auth:hash -- "password"`.
3. Add a random `SESSION_SECRET` of at least 32 characters.
4. Run `npm run seed`.
5. Run `npm run check`.
6. Run `npm run dev`.

## Photo verification checklist

- Hands and wrists may appear.
- No face, partial face, or face reflection.
- No school name, badge, classroom number, address, or private document.
- Product is clear and accurately represented.
- Adult Admin approval is recorded before public use.

## Manual fallback

If Studio cannot publish, keep the drop in draft, record the intended public copy and selected photo, and do not represent the public site as updated.

## Rollback

- Unpublish by changing the drop to draft or archived.
- Reject or archive an unsafe photo.
- Restore an earlier database backup before provider deployment.
- Rotate Studio passwords and the session secret after suspected exposure.
