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

  function applyPlacedPhotos(photos) {
    const groups = new Map();
    for (const photo of photos || []) {
      if (!photo.placement || photo.placement === 'unassigned') continue;
      if (!groups.has(photo.placement)) groups.set(photo.placement, []);
      groups.get(photo.placement).push(photo);
    }

    for (const [placement, items] of groups.entries()) {
      const selected = items[0];
      if (!selected) continue;
      document.querySelectorAll(`[data-photo-placement="${placement}"]`).forEach(image => {
        image.src = selected.webUrl;
        image.alt = selected.altText || image.alt || 'CharmNest product photo';
      });
    }

    const gallery = groups.get('gallery') || [];
    const galleryContainer = document.querySelector('#public-photo-gallery');
    const gallerySection = document.querySelector('#public-gallery-section');
    if (!galleryContainer || !gallerySection || !gallery.length) return;

    galleryContainer.replaceChildren();
    for (const photo of gallery.slice(0, 12)) {
      const card = document.createElement('figure');
      card.className = 'public-photo-card';
      const image = document.createElement('img');
      image.src = photo.webUrl;
      image.alt = photo.altText || 'CharmNest creation';
      card.append(image);
      if (photo.caption) {
        const caption = document.createElement('figcaption');
        caption.textContent = photo.caption;
        card.append(caption);
      }
      galleryContainer.append(card);
    }
    gallerySection.classList.remove('hidden');
  }

  Promise.all([
    fetch('/api/public/settings').then(response => response.json()),
    fetch('/api/public/photos').then(response => response.json()).catch(() => ({ photos: [] }))
  ])
    .then(([{ settings }, { photos }]) => {
      if (settings) {
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
      }
      applyPlacedPhotos(photos);
    })
    .catch(() => {});
})();
