import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PUBLIC_PRICING } from '../src/core/constants.mjs';

const dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(dirname, '..');
const source = path.join(root, 'public');
const dist = path.join(root, 'dist');

fs.rmSync(dist, { recursive: true, force: true });
fs.cpSync(source, dist, { recursive: true });

const nav = [
  ['Shop', '/shop/'],
  ['School Drop', '/school-drop/'],
  ['Custom Orders', '/custom-orders/'],
  ['Buttons & Pins', '/buttons-and-pins/'],
  ['Bracelet Styles', '/bracelet-styles/'],
  ['FAQ', '/faq/']
];

function layout({ title, description, content, scripts = [], robots = 'index,follow' }) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="description" content="${description}">
  <meta name="robots" content="${robots}">
  <title>${title} | CharmNest</title>
  <link rel="icon" href="/brand/favicon-placeholder.svg">
  <link rel="stylesheet" href="/styles/main.css">
</head>
<body>
  <a class="skip-link" href="#main">Skip to content</a>
  <header class="site-header">
    <div class="container header-row">
      <a class="brand-link" href="/" aria-label="CharmNest home"><img class="brand-logo js-brand-logo" src="/brand/logo-options/logo-03-beaded-badge-web.webp" alt="CharmNest — Little charms. Big vibes."></a>
      <button class="nav-toggle" type="button" aria-expanded="false" aria-controls="site-nav">Menu</button>
      <nav class="site-nav" id="site-nav" aria-label="Main navigation">${nav.map(([label, url]) => `<a href="${url}">${label}</a>`).join('')}</nav>
    </div>
  </header>
  <main id="main">${content}</main>
  <footer class="site-footer">
    <div class="container footer-grid">
      <div><img class="footer-logo js-brand-logo" src="/brand/logo-options/logo-03-beaded-badge-web.webp" alt="CharmNest"><p>Handmade bracelets, custom buttons, and pins for colors, people, and moments worth keeping.</p></div>
      <div><h3>Explore</h3><p><a href="/school-drop/">Current school drop</a><br><a href="/custom-orders/">Request a custom order</a><br><a href="/buttons-and-pins/">Buttons & pins</a><br><a href="/shipping-and-returns/">Shipping and returns</a></p></div>
      <div><h3>Stay connected</h3><p class="js-social-links">Social and shop links will appear here when connected.</p><p><a href="/contact/">Contact</a><br><a href="/privacy/">Privacy</a><br><a href="/studio/" rel="nofollow">CharmNest Studio</a></p></div>
    </div>
    <div class="container"><p class="small">© 2026 CharmNest. School sales are subject to school rules and approval. Custom products, quantities, timing, and availability must be confirmed.</p></div>
  </footer>
  <script src="/js/main.js" defer></script>
${scripts.map(src => `  <script src="${src}" defer></script>
`).join('')}</body>
</html>`;
}

function write(route, html) {
  const dir = path.join(dist, route);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.html'), html);
}

write('', layout({
  title: 'Handmade Bracelets, Buttons, and Pins',
  description: 'CharmNest makes colorful bracelets plus custom buttons and pins for graduations, memorials, parties, and special events.',
  content: `<section class="hero"><div class="container hero-grid"><div><span class="eyebrow">♡ Handmade with personality</span><h1>Little charms.<br>Big vibes.</h1><p class="lede">Colorful bracelets and custom event buttons made for besties, school spirit, graduations, memorials, parties, gifts, and your own one-of-one vibe.</p><div class="actions"><a class="button button-primary" href="/school-drop/">See the latest drop</a><a class="button button-secondary" href="/custom-orders/">Start a custom order</a></div><p class="small muted">Local monthly-drop bracelets are $2. Local custom bracelets are $3. Delivery, shipping, and button pricing are confirmed per order.</p></div><div class="hero-art"><img class="hero-bracelet" data-photo-placement="hero" src="/images/products/charmnest-hero.png" alt="Pastel beaded and braided bracelets arranged on a pink platform"><div class="hero-card"><strong>Made for the moment</strong><p>Choose a bracelet, a custom round button, or a coordinated event order.</p><span class="price-pill">Monthly drop $2</span><span class="price-pill">Local custom $3</span></div></div></div></section>
  <section class="section section-soft"><div class="container"><div class="section-heading"><span class="eyebrow">What we make</span><h2>Bracelets, buttons, and personal details.</h2></div><div class="grid grid-3"><article class="card product-card"><img data-photo-placement="bracelet-category" src="/images/products/charmnest-beaded.png" alt="Beaded charm bracelet"><h3>Beaded Charm Bracelets</h3><p>Stretch elastic, colorful beads, names, and approved charms.</p><a class="button button-primary" href="/bracelet-styles/">See bracelet styles</a></article><article class="card product-card"><img data-photo-placement="bracelet-category" src="/images/products/charmnest-braided.png" alt="Braided friendship bracelet"><h3>Braided Friendship Bracelets</h3><p>Soft braided colors for friends, groups, and matching sets.</p><a class="button button-secondary" href="/school-drop/">View the drop</a></article><article class="card product-card"><img data-photo-placement="buttons-category" src="/images/products/charmnest-buttons-pins.svg" alt="Illustration of custom round buttons and pin backs"><h3>Custom Buttons & Pins</h3><p>Round pin-back buttons for graduations, memorials, birthdays, parties, reunions, and more.</p><a class="button button-secondary" href="/buttons-and-pins/">Explore buttons</a></article></div></div></section>
  <section class="section"><div class="container grid grid-3"><article class="card"><span class="badge">1</span><h3>Choose the product</h3><p>Pick a monthly-drop bracelet, custom bracelet, or event button.</p></article><article class="card"><span class="badge">2</span><h3>Choose fulfillment</h3><p>Select local pickup, local delivery, or shipping when available.</p></article><article class="card"><span class="badge">3</span><h3>Confirm and pay</h3><p>CharmNest confirms the final design, timing, total, and payment instructions.</p></article></div></section>
  <section id="public-gallery-section" class="section hidden"><div class="container"><div class="section-heading"><span class="eyebrow">Made by CharmNest</span><h2>Recent creations</h2><p class="lede">Approved product photos selected in the private Studio appear here.</p></div><div id="public-photo-gallery" class="public-photo-grid"></div></div></section>
  <section class="section section-soft"><div class="container drop-panel"><div class="grid grid-2"><div><span class="eyebrow">Latest confirmed drop</span><h2 id="home-drop-title">Check back for the next school drop</h2><p id="home-drop-note">The newest confirmed drop will appear here.</p><div id="home-drop-colors" class="drop-colors"></div><div class="actions"><a id="home-tiktok" class="button button-muted" aria-disabled="true">TikTok not connected yet</a><a class="button button-secondary" href="/school-drop/">Drop details</a></div></div><div class="notice notice-pink"><strong>Drop details are flexible.</strong><p id="home-drop-disclaimer">Featured colors, charms, quantities, release dates, and availability may change.</p></div></div></div></section>`,
  scripts: ['/js/drop.js']
}));

write('shop', layout({
  title: 'Shop',
  description: 'Browse CharmNest school drops, custom bracelets, and custom buttons and pins.',
  content: `<section class="section"><div class="container"><div class="section-heading"><span class="eyebrow">Shop CharmNest</span><h1>Choose your vibe.</h1><p class="lede">Local bracelet pricing stays simple. Delivery, shipping, and custom event products are quoted from the details you submit.</p></div><div class="grid grid-4"><article class="card product-card"><img data-photo-placement="bracelet-category" src="/images/products/charmnest-beaded.png" alt="Beaded school-drop bracelet"><span class="badge">Local drop</span><h3>Monthly Beaded Charm</h3><p>Confirmed colors and one basic charm while supplies last.</p><p><strong>$${(PUBLIC_PRICING.localDropBraceletCents / 100).toFixed(0)} each locally</strong></p><a class="button button-primary" href="/school-drop/">See current drop</a></article><article class="card product-card"><img data-photo-placement="bracelet-category" src="/images/products/charmnest-braided.png" alt="Braided school-drop bracelet"><span class="badge">Local drop</span><h3>Monthly Friendship Braid</h3><p>Confirmed colors in a soft braided style.</p><p><strong>$${(PUBLIC_PRICING.localDropBraceletCents / 100).toFixed(0)} each locally</strong></p><a class="button button-primary" href="/school-drop/">See current drop</a></article><article class="card product-card"><img data-photo-placement="bracelet-category" src="/images/products/charmnest-beaded.png" alt="Custom bracelet"><span class="badge">Custom</span><h3>Local Custom Bracelet</h3><p>Choose colors, style, name, short word, or an approved charm.</p><p><strong>$${(PUBLIC_PRICING.localCustomBraceletCents / 100).toFixed(0)} each for local pickup</strong></p><a class="button button-secondary" href="/custom-orders/?product=bracelet">Request a bracelet</a></article><article class="card product-card"><img data-photo-placement="buttons-category" src="/images/products/charmnest-buttons-pins.svg" alt="Custom buttons and pins"><span class="badge">Events</span><h3>Custom Buttons & Pins</h3><p>Round pin-back buttons for celebrations, remembrance, and group events.</p><p><strong>Price confirmed by quantity and design</strong></p><a class="button button-secondary" href="/custom-orders/?product=button">Request buttons</a></article></div></div></section>
  <section class="section section-soft"><div class="container"><div class="section-heading"><h2>What needs a quote?</h2><p>CharmNest will never invent a total. These items display a confirmed subtotal when possible and wait for final pricing.</p></div><ul class="pill-list">${PUBLIC_PRICING.quoteRequired.map(item => `<li>${item}</li>`).join('')}</ul></div></section>`
}));

write('school-drop', layout({
  title: 'School Drop',
  description: 'See the latest confirmed CharmNest school bracelet drop.',
  content: `<section class="section"><div class="container"><div class="section-heading"><span class="eyebrow">Confirmed school drop</span><h1 id="drop-title">The next drop is being prepared.</h1><p class="lede" id="drop-headline">Only confirmed drops are shown publicly.</p></div><div id="drop-content" class="drop-panel"><div class="no-results">There is no published drop yet. Check TikTok for the newest confirmed update.</div></div><div class="notice" style="margin-top:24px"><strong>School Drop Notice</strong><p id="drop-disclaimer">Featured colors, charms, quantities, release dates, and availability may change.</p></div><div class="notice notice-pink" style="margin-top:14px"><strong>Local pricing</strong><p id="drop-pricing-disclaimer">Monthly-drop bracelets are $2 each locally. Delivery, shipping, gift packaging, and larger custom orders may use separate pricing.</p></div></div></section>`,
  scripts: ['/js/drop.js']
}));

write('buttons-and-pins', layout({
  title: 'Custom Buttons and Pins',
  description: 'Request custom round pin-back buttons for graduations, memorials, funerals, birthdays, parties, reunions, and group events.',
  content: `<section class="section"><div class="container hero-grid"><div><span class="eyebrow">Custom event keepsakes</span><h1>Buttons made for the moment.</h1><p class="lede">CharmNest can create round pin-back buttons for graduations, memorials and funerals, birthdays, parties, reunions, showers, teams, and other special events.</p><div class="actions"><a class="button button-primary" href="/custom-orders/?product=button">Request custom buttons</a></div><p class="small muted">Final pricing depends on quantity, artwork, design work, delivery, and shipping. Submit the details first; pay only after CharmNest confirms the total.</p></div><div class="card"><img data-photo-placement="buttons-category" src="/images/products/charmnest-buttons-pins.svg" alt="Pastel illustration of custom round event buttons and a pin back"></div></div></section>
  <section class="section section-soft"><div class="container"><div class="section-heading"><h2>Common button occasions</h2></div><div class="grid grid-3"><article class="card"><h3>Graduations</h3><p>Class year, school colors, graduate name, celebration themes, and group quantities.</p></article><article class="card"><h3>Memorials & Funerals</h3><p>Respectful remembrance buttons with confirmed names, dates, colors, and family-provided artwork.</p></article><article class="card"><h3>Parties & Events</h3><p>Birthdays, reunions, showers, team events, family gatherings, and custom themes.</p></article></div><div class="notice notice-pink" style="margin-top:24px"><strong>Artwork privacy:</strong> Do not upload personal photos through the public site. After CharmNest confirms the request, an adult-managed contact will provide the approved way to share artwork or photos.</div></div></section>`
}));

write('custom-orders', layout({
  title: 'Custom Orders',
  description: 'Request a custom CharmNest bracelet, button, or pin with local pickup, local delivery, or shipping.',
  content: `<section class="section"><div class="container"><div class="section-heading"><span class="eyebrow">Custom order request</span><h1>Tell us what you want to make.</h1><p class="lede">This form creates a request, not an automatic purchase. CharmNest confirms availability, timing, final price, and payment instructions.</p></div>
  <form id="order-form" class="form-card" novalidate>
    <div class="form-grid">
      <div class="field"><label for="firstName">First name</label><input id="firstName" name="firstName" autocomplete="given-name" required></div>
      <div class="field"><label for="contactEmail">Adult-managed contact email</label><input id="contactEmail" name="contactEmail" type="email" autocomplete="email" required></div>
      <div class="field"><label for="phone">Phone number</label><input id="phone" name="phone" type="tel" inputmode="tel" autocomplete="tel" placeholder="(555) 555-5555" required><span class="help">Used only for questions and updates about this order.</span></div>
      <div class="field"><label for="requestedEmployee">Requested Maker <span class="muted">(optional)</span></label><select id="requestedEmployee" name="requestedEmployee"><option value="">No preference</option><option value="cheyenne">Cheyenne</option><option value="brooklyn">Brooklyn</option></select><span class="help">We will try to honor your request, but availability is not guaranteed.</span></div>
      <div class="field"><label for="productType">Product</label><select id="productType" name="productType" required><option value="bracelet">Bracelet</option><option value="button">Custom button or pin</option></select></div>
      <div class="field"><label for="quantity">Quantity</label><input id="quantity" name="quantity" type="number" min="1" max="500" value="1" required></div>
      <div class="field"><label for="neededBy">Needed by</label><input id="neededBy" name="neededBy" type="date"></div>
    </div>

    <fieldset id="bracelet-fields" class="order-fieldset"><legend>Bracelet details</legend><div class="form-grid">
      <div class="field"><label for="orderType">Bracelet order</label><select id="orderType" name="orderType"><option value="custom">Custom bracelet — $3 local pickup</option><option value="monthly-drop">Monthly-drop bracelet — $2 local</option></select></div>
      <div class="field"><label for="braceletStyle">Bracelet style</label><select id="braceletStyle" name="braceletStyle"><option value="">Choose one</option><option value="beaded">Beaded elastic</option><option value="braided">Braided yarn</option><option value="mixed">Mixed set</option></select></div>
      <div class="field field-full"><label>Up to three colors</label><div class="form-grid"><input name="color1" placeholder="Color 1"><input name="color2" placeholder="Color 2"><input name="color3" placeholder="Color 3"></div></div>
      <div class="field"><label for="charm">Basic charm request</label><input id="charm" name="charm" placeholder="Heart, star, flower, surprise..."></div>
      <div class="field"><label for="nameWord">Name or short word</label><input id="nameWord" name="nameWord" maxlength="18"></div>
      <div class="field"><label for="size">Size</label><select id="size" name="size"><option value="small">Small</option><option value="standard" selected>Standard</option><option value="large">Large</option></select></div>
      <div class="field"><label class="check-option"><input name="giftPackaging" type="checkbox"> Add gift pouch and card</label><span class="help">Price must be confirmed if selected.</span></div>
    </div></fieldset>

    <fieldset id="button-fields" class="order-fieldset hidden"><legend>Button or pin details</legend><div class="form-grid">
      <div class="field"><label for="buttonOccasion">Occasion</label><select id="buttonOccasion" name="buttonOccasion"><option value="">Choose one</option><option>Graduation</option><option>Memorial or funeral</option><option>Birthday</option><option>Party</option><option>Reunion</option><option>Shower</option><option>Team or group event</option><option>Other</option></select></div>
      <div class="field"><label for="buttonText">Text on the button</label><input id="buttonText" name="buttonText" maxlength="160" placeholder="Name, year, short message..."></div>
      <div class="field"><label for="themeColors">Theme colors</label><input id="themeColors" name="themeColors" placeholder="Pink and gold, school colors..."></div>
      <div class="field"><label class="check-option"><input id="artworkReady" name="artworkReady" type="checkbox"> I already have artwork or a photo</label><span class="help">Share it only after the request is confirmed.</span></div>
      <div class="field field-full"><label for="designInstructions">Design instructions</label><textarea id="designInstructions" name="designInstructions" rows="5" placeholder="Describe the layout, wording, event, colors, and style."></textarea></div>
    </div></fieldset>

    <fieldset class="order-fieldset"><legend>Pickup, delivery, or shipping</legend>
      <label class="check-option local-toggle"><input id="isLocalOrder" name="isLocalOrder" type="checkbox" checked> This is a local order</label>
      <div id="local-methods" class="choice-row"><label class="check-option"><input type="radio" name="localMethod" value="pickup" checked> Local pickup</label><label class="check-option"><input type="radio" name="localMethod" value="local-delivery"> Local delivery</label></div>
      <div id="shipping-fields" class="form-grid hidden"><div class="field field-full"><label for="address1">Shipping address</label><input id="address1" name="address1" autocomplete="shipping address-line1"></div><div class="field field-full"><label for="address2">Apartment, suite, or unit</label><input id="address2" name="address2" autocomplete="shipping address-line2"></div><div class="field"><label for="city">City</label><input id="city" name="city" autocomplete="shipping address-level2"></div><div class="field"><label for="state">State</label><input id="state" name="state" autocomplete="shipping address-level1"></div><div class="field"><label for="zip">ZIP code</label><input id="zip" name="zip" inputmode="numeric" autocomplete="shipping postal-code"></div></div>
    </fieldset>

    <div class="field"><label for="notes">Additional notes</label><textarea id="notes" name="notes" rows="5" placeholder="Add timing, group, delivery, or other details."></textarea></div>
    <div class="field"><label class="check-option"><input name="consent" type="checkbox" required> I understand this is a request and final details must be confirmed before payment.</label></div>
    <div class="estimate-card"><strong>Current estimate</strong><p id="estimate">Loading current pricing…</p><p id="estimate-note" class="small muted"></p></div>
    <div class="notice notice-pink"><strong>Payment:</strong> Cash and Cash App can be recorded after CharmNest confirms the order. Do not pay an incomplete quote.</div>
    <button class="button button-primary" type="submit">Send custom-order request</button>
    <p id="order-status" class="status" role="status"></p>
  </form>
  <section id="order-confirmation" class="confirmation-card hidden" aria-live="polite"><h2>Request received</h2><p>Your reference is <strong id="confirmation-reference"></strong>.</p><p id="confirmation-estimate"></p><div id="confirmation-payment"></div></section>
  </div></section>`,
  scripts: ['/js/order.js']
}));

write('bracelet-styles', layout({
  title: 'Bracelet Styles',
  description: 'Compare CharmNest beaded charm bracelets and braided friendship bracelets.',
  content: `<section class="section"><div class="container"><div class="section-heading"><span class="eyebrow">Two signature bracelet styles</span><h1>Beaded, braided, or both.</h1></div><div class="grid grid-2"><article class="card"><img data-photo-placement="bracelet-category" src="/images/products/charmnest-beaded.png" alt="Beaded bracelet"><h2>Beaded Charm</h2><ul><li>Stretch elastic</li><li>Colorful beads</li><li>Basic charms in monthly drops</li><li>Names, initials, and approved charms for custom orders</li></ul></article><article class="card"><img data-photo-placement="bracelet-category" src="/images/products/charmnest-braided.png" alt="Braided bracelet"><h2>Friendship Braid</h2><ul><li>Soft yarn or embroidery floss</li><li>Two or three coordinated colors</li><li>Adjustable tie closure</li><li>Great for matching sets</li></ul></article></div><div class="notice" style="margin-top:24px"><strong>Materials and details can change.</strong> Final bead, charm, yarn, and color availability depends on current supplies.</div></div></section>`
}));

write('sizing-and-care', layout({
  title: 'Sizing and Care',
  description: 'CharmNest bracelet sizing and care instructions.',
  content: `<section class="section"><div class="container"><div class="section-heading"><span class="eyebrow">Keep the vibe going</span><h1>Sizing and care</h1></div><div class="grid grid-2"><article class="card"><h2>Measure your wrist</h2><ol><li>Wrap a soft measuring tape or string around the wrist.</li><li>Keep it comfortable, not tight.</li><li>Measure the string against a ruler.</li><li>Add about ¼–½ inch depending on the fit you like.</li></ol></article><article class="card"><h2>Care tips</h2><ul><li>Remove before swimming, bathing, or sports.</li><li>Keep away from perfume, lotion, and harsh cleaners.</li><li>Do not overstretch elastic bracelets.</li><li>Let braided bracelets dry fully if they get damp.</li><li>Store flat or in a small pouch.</li></ul></article></div><div class="notice notice-danger" style="margin-top:24px"><strong>Small-parts notice:</strong> Bracelets, buttons, and pins may contain small or sharp components. Keep away from children under 3 and use pin backs with adult oversight.</div></div></section>`
}));

write('about', layout({
  title: 'About',
  description: 'Meet CharmNest, a young maker brand for bracelets, custom buttons, and pins.',
  content: `<section class="section"><div class="container hero-grid"><div><span class="eyebrow">A young maker brand</span><h1>Color, creativity, and connection.</h1><p class="lede">CharmNest turns favorite colors, little charms, names, artwork, and event ideas into handmade products people can wear and share.</p><p>The business starts with simple local bracelet pricing, controlled custom options, and confirmed quotes for delivery, shipping, buttons, and larger event orders.</p></div><div class="card"><img data-photo-placement="buttons-category" src="/images/products/charmnest-buttons-pins.svg" alt="CharmNest custom products illustration"><p><strong>Privacy matters:</strong> the public site does not publish the maker’s full legal name, exact age, school, home address, personal phone number, or face.</p></div></div></section>`
}));

write('faq', layout({
  title: 'FAQ',
  description: 'Frequently asked questions about CharmNest bracelets, custom buttons, pricing, fulfillment, and payment.',
  content: `<section class="section"><div class="container"><div class="section-heading"><span class="eyebrow">Questions, answered</span><h1>CharmNest FAQ</h1></div><div class="faq"><details><summary>How much are monthly-drop bracelets?</summary><p>Confirmed monthly beaded and braided bracelets are $2 each for eligible local sales.</p></details><details><summary>How much are local custom bracelets?</summary><p>Local custom bracelets are $3 each for pickup. Delivery, shipping, gift packaging, and larger orders may add confirmed fees.</p></details><details><summary>Does CharmNest make buttons and pins?</summary><p>Yes. CharmNest accepts requests for round pin-back buttons for graduations, memorials and funerals, birthdays, parties, reunions, showers, and other group events.</p></details><details><summary>How are button prices calculated?</summary><p>Pricing depends on quantity, artwork, design work, delivery, and shipping. The request form shows a total only when the required prices have been configured; otherwise CharmNest confirms the quote before payment.</p></details><details><summary>Can my order be shipped?</summary><p>Custom bracelets and buttons may be shipped after the address, price, and timing are confirmed. Monthly-drop bracelets are local only.</p></details><details><summary>How can I pay?</summary><p>CharmNest may accept cash or Cash App. Pay only after the order and total are confirmed, and include the order reference when requested.</p></details><details><summary>How do I share a photo for a memorial or graduation button?</summary><p>Do not upload personal photos publicly. Submit the order request first. An adult-managed CharmNest contact will provide the approved way to share artwork after confirmation.</p></details><details><summary>Is submitting the form the same as buying?</summary><p>No. It creates a request. CharmNest must confirm availability, final price, timing, and payment instructions.</p></details></div></div></section>`
}));

write('shipping-and-returns', layout({
  title: 'Shipping and Returns',
  description: 'CharmNest local pickup, delivery, shipping, remake, and return information.',
  content: `<section class="section"><div class="container"><div class="section-heading"><span class="eyebrow">Before you order</span><h1>Pickup, delivery, shipping, and returns</h1><p class="lede">The order form separates local pickup, local delivery, and non-local shipping so the correct price and address can be confirmed.</p></div><div class="grid grid-3"><article class="card"><h2>Local pickup</h2><p>Local monthly-drop bracelets are $2 each. Local custom bracelets are $3 each. Pickup details are confirmed privately.</p></article><article class="card"><h2>Local delivery</h2><p>A delivery fee may apply. The form shows the known product subtotal and waits for the fee if it has not been configured.</p></article><article class="card"><h2>Shipping</h2><p>Shipping requires a complete address. Shipped custom bracelets, buttons, and handling are confirmed before payment.</p></article></div><div class="notice" style="margin-top:24px"><strong>Custom items:</strong> Personalized products usually cannot be returned for a change of mind. Contact CharmNest promptly if an item arrives damaged or does not match the confirmed order.</div></div></section>`
}));

write('contact', layout({
  title: 'Contact',
  description: 'Contact CharmNest about bracelets, buttons, pins, school drops, and custom event orders.',
  content: `<section class="section"><div class="container"><div class="section-heading"><span class="eyebrow">Say hello</span><h1>Contact CharmNest</h1><p class="lede">Use the custom-order form for bracelets, buttons, pins, pickup, delivery, or shipping requests.</p></div><div class="grid grid-3"><article class="card"><h3>Email</h3><p id="contact-email">Not connected yet</p></article><article class="card"><h3>TikTok</h3><p id="contact-tiktok">Not connected yet</p></article><article class="card"><h3>Online shop</h3><p id="contact-etsy">Etsy listings are not connected yet</p></article></div><div class="actions"><a class="button button-primary" href="/custom-orders/">Open custom-order form</a></div></div></section>`
}));

write('privacy', layout({
  title: 'Privacy',
  description: 'CharmNest privacy information for public visitors and custom-order requests.',
  content: `<section class="section"><div class="container"><div class="section-heading"><span class="eyebrow">Privacy</span><h1>What CharmNest collects</h1></div><div class="card"><p>The custom-order form collects a first name, adult-managed contact email, required phone number, optional requested Maker, product preferences, fulfillment choice, and optional order notes. A shipping address is collected only when non-local shipping is selected.</p><p>Phone numbers, shipping addresses, full emails, payment notes, requested Maker details, and internal order details are available only inside the private Maker Studio. Public order receipts mask the email and do not return the phone number or shipping address.</p><p>The public form does not accept personal photo uploads. Artwork for graduation, memorial, or event buttons is shared only after the request is confirmed through an adult-managed contact.</p><p>Public product photos may show hands and wrists, but must not show faces, partial faces, face reflections, school-identifying details, or private information.</p></div></div></section>`
}));

write('404', layout({
  title: 'Page Not Found',
  description: 'The requested CharmNest page was not found.',
  robots: 'noindex,nofollow',
  content: `<section class="section"><div class="container center"><h1>That charm wandered off.</h1><p class="lede" style="margin-inline:auto">The page you requested does not exist.</p><a class="button button-primary" href="/">Return home</a></div></section>`
}));

write('studio', `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>CharmNest Studio</title><link rel="icon" href="/brand/favicon-placeholder.svg"><link rel="stylesheet" href="/styles/studio.css"></head>
<body><main id="studio-app"><section class="studio-login"><div class="login-card"><img src="/brand/logo-options/logo-03-beaded-badge-web.webp" alt="CharmNest" class="login-logo"><h1>CharmNest Studio</h1><p>One private workspace for drops, photos, custom orders, payments, pricing, and flyers.</p><form id="login-form"><input type="hidden" name="username" value="maker"><label>Studio password<input type="password" name="password" autocomplete="current-password" required></label><button type="submit">Sign in</button><p id="login-status" role="status"></p></form><p class="tiny">The password is verified on the server and is not stored in this page or repository.</p></div></section></main><script src="/js/studio.js" defer></script></body>
</html>`);

console.log(`Built CharmNest into ${dist}`);
