(function () {
  const toggle = document.querySelector('.nav-toggle');
  const nav = document.querySelector('.site-nav');
  toggle?.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    toggle.setAttribute('aria-expanded', String(open));
  });

  function link(href, text) {
    const anchor = document.createElement('a');
    anchor.href = href;
    anchor.textContent = text;
    anchor.rel = 'noopener';
    if (href.startsWith('http')) anchor.target = '_blank';
    return anchor;
  }

  function replaceWithLink(container, href, text, fallback) {
    if (!container) return;
    container.replaceChildren(href ? link(href, text) : document.createTextNode(fallback));
  }

  fetch('/api/public/settings')
    .then(response => response.json())
    .then(({ settings }) => {
      if (!settings) return;
      document.querySelectorAll('.js-brand-logo').forEach(image => {
        image.src = settings.activeLogoUrl || '/brand/logo-options/logo-03-beaded-badge-web.webp';
      });

      document.querySelectorAll('.js-social-links').forEach(container => {
        const items = [];
        if (settings.tiktokUrl) items.push(link(settings.tiktokUrl, `TikTok${settings.tiktokHandle ? ` ${settings.tiktokHandle}` : ''}`));
        if (settings.etsyUrl) items.push(link(settings.etsyUrl, 'Etsy shop'));
        if (settings.contactEmail) items.push(link(`mailto:${settings.contactEmail}`, settings.contactEmail));
        container.replaceChildren();
        if (!items.length) {
          container.textContent = 'Social and shop links are not connected yet.';
          return;
        }
        items.forEach((item, index) => {
          if (index) container.append(document.createElement('br'));
          container.append(item);
        });
      });

      document.querySelectorAll('.js-etsy-link').forEach(anchor => {
        if (!settings.etsyUrl) return;
        anchor.href = settings.etsyUrl;
        anchor.textContent = anchor.dataset.label || 'Shop on Etsy';
        anchor.target = '_blank';
        anchor.rel = 'noopener';
      });

      replaceWithLink(document.querySelector('#contact-email'), settings.contactEmail ? `mailto:${settings.contactEmail}` : '', settings.contactEmail, 'Not connected yet');
      replaceWithLink(document.querySelector('#contact-tiktok'), settings.tiktokUrl, settings.tiktokHandle || 'Open TikTok', 'Not connected yet');
      replaceWithLink(document.querySelector('#contact-etsy'), settings.etsyUrl, 'Open Etsy shop', 'Etsy listings are not connected yet');
    })
    .catch(() => {});
})();
