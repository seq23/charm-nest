(function(){
  const toggle=document.querySelector('.nav-toggle'); const nav=document.querySelector('.site-nav');
  toggle?.addEventListener('click',()=>{const open=nav.classList.toggle('open');toggle.setAttribute('aria-expanded',String(open));});
  fetch('/api/public/settings').then(r=>r.json()).then(({settings})=>{
    if(!settings)return;
    document.querySelectorAll('.js-brand-logo').forEach(img=>{img.src=settings.activeLogoUrl||'/brand/logo-options/logo-03-beaded-badge-web.webp';});
    document.querySelectorAll('.js-social-links').forEach(el=>{
      const links=[];
      if(settings.tiktokUrl)links.push(`<a href="${settings.tiktokUrl}" rel="noopener">TikTok${settings.tiktokHandle?` ${settings.tiktokHandle}`:''}</a>`);
      if(settings.etsyUrl)links.push(`<a href="${settings.etsyUrl}" rel="noopener">Etsy shop</a>`);
      if(settings.contactEmail)links.push(`<a href="mailto:${settings.contactEmail}">${settings.contactEmail}</a>`);
      el.innerHTML=links.length?links.join('<br>'):'Social and shop links are not connected yet.';
    });
    document.querySelectorAll('.js-etsy-link').forEach(link=>{if(settings.etsyUrl){link.href=settings.etsyUrl;link.textContent=link.dataset.label||'Shop on Etsy';link.target='_blank';link.rel='noopener';}});
    const email=document.querySelector('#contact-email'); if(email)email.innerHTML=settings.contactEmail?`<a href="mailto:${settings.contactEmail}">${settings.contactEmail}</a>`:'Not connected yet';
    const tik=document.querySelector('#contact-tiktok'); if(tik)tik.innerHTML=settings.tiktokUrl?`<a href="${settings.tiktokUrl}" rel="noopener">${settings.tiktokHandle||'Open TikTok'}</a>`:'Not connected yet';
    const etsy=document.querySelector('#contact-etsy'); if(etsy)etsy.innerHTML=settings.etsyUrl?`<a href="${settings.etsyUrl}" rel="noopener">Open Etsy shop</a>`:'Etsy listings are not connected yet';
  }).catch(()=>{});
})();
