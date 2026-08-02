(function(){
  const money=cents=>`$${(Number(cents||0)/100).toFixed(0)}`;
  Promise.all([fetch('/api/public/drop').then(r=>r.json()),fetch('/api/public/settings').then(r=>r.json())]).then(([dropData,settingsData])=>{
    const drop=dropData.drop; const settings=settingsData.settings||{};
    const disclaimer=document.querySelector('#drop-disclaimer'); if(disclaimer)disclaimer.textContent=settings.schoolDropNotice||disclaimer.textContent;
    const priceNotice=document.querySelector('#drop-pricing-disclaimer'); if(priceNotice)priceNotice.textContent=settings.schoolPricingNotice||priceNotice.textContent;
    const homeNotice=document.querySelector('#home-drop-disclaimer'); if(homeNotice)homeNotice.textContent=settings.schoolDropNotice||homeNotice.textContent;
    const homeTitle=document.querySelector('#home-drop-title'), homeNote=document.querySelector('#home-drop-note'), homeColors=document.querySelector('#home-drop-colors'), homeTik=document.querySelector('#home-tiktok');
    if(settings.tiktokUrl&&homeTik){homeTik.href=settings.tiktokUrl;homeTik.className='button button-primary';homeTik.removeAttribute('aria-disabled');homeTik.textContent=`Check TikTok${settings.tiktokHandle?` ${settings.tiktokHandle}`:''}`;}
    if(!drop)return;
    if(homeTitle)homeTitle.textContent=drop.name;
    if(homeNote)homeNote.textContent=drop.headline||drop.publicNotes||'The latest confirmed school drop is live.';
    if(homeColors){homeColors.innerHTML=(drop.colorHexes||[]).map((hex,i)=>`<span class="color-dot" title="${drop.colors?.[i]||'Featured color'}" style="background:${hex}"></span>`).join('');}
    const title=document.querySelector('#drop-title'); if(title)title.textContent=drop.name;
    const headline=document.querySelector('#drop-headline'); if(headline)headline.textContent=drop.headline||'The latest confirmed CharmNest school drop.';
    const content=document.querySelector('#drop-content'); if(content){
      const photo=drop.photos?.find(p=>p.isCover)||drop.photos?.[0];
      const styles=[drop.beadedAvailable?'Beaded elastic with one basic charm':'',drop.braidedAvailable?'Braided friendship bracelet':''].filter(Boolean);
      content.innerHTML=`<div class="grid grid-2"><div>${photo?`<img src="${photo.webUrl}" alt="${photo.altText}" style="width:100%;border-radius:24px;aspect-ratio:4/3;object-fit:cover">`:`<img src="/images/placeholders/beaded.svg" alt="Illustrated bracelet placeholder" style="width:100%;border-radius:24px">`}</div><div><span class="badge">${drop.status==='sold-out'?'Sold out':'Confirmed drop'}</span><h2>${drop.name}</h2><p>${drop.publicNotes||'Limited quantities are available.'}</p><div class="drop-colors">${(drop.colorHexes||[]).map((hex,i)=>`<span class="color-dot" title="${drop.colors?.[i]||'Featured color'}" style="background:${hex}"></span>`).join('')}</div><p><strong>Colors:</strong> ${(drop.colors||[]).join(' + ')||'See current photos'}</p><p><strong>Styles:</strong> ${styles.join(' or ')}</p><p><strong>School drop:</strong> ${money(drop.schoolPriceCents)} &nbsp; <strong>Custom colors:</strong> ${money(drop.customPriceCents)}</p><p><strong>Quantity:</strong> ${drop.quantity>0?`${drop.quantity} planned`:'Limited'}</p><div class="actions">${settings.tiktokUrl?`<a class="button button-primary" href="${settings.tiktokUrl}" rel="noopener">Check TikTok</a>`:'<span class="button button-muted">TikTok not connected</span>'}<a class="button button-secondary" href="/custom-orders/">Request custom</a></div></div></div>`;
    }
  }).catch(()=>{});
})();
