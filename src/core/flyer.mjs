function escapeXml(value='') {
  return String(value).replace(/[<>&'"]/gu, char => ({'<':'&lt;','>':'&gt;','&':'&amp;',"'":'&apos;','"':'&quot;'}[char]));
}

function dimensions(format) {
  if (format==='square') return [1080,1080];
  if (format==='story') return [1080,1920];
  return [816,1056];
}

export function createFlyerSvg({ drop, settings, format='letter', photoDataUri='' }) {
  const [width,height]=dimensions(format);
  const compact=format==='square';
  const story=format==='story';
  const titleY=story?180:compact?130:110;
  const photoY=story?520:compact?330:320;
  const photoH=story?650:compact?390:360;
  const priceY=photoY+photoH+90;
  const noteY=priceY+170;
  const colors=(drop.colors||[]).join(' + ') || 'Current featured colors';
  const image = photoDataUri ? `<image href="${photoDataUri}" x="${width*.1}" y="${photoY}" width="${width*.8}" height="${photoH}" preserveAspectRatio="xMidYMid slice" clip-path="url(#photoClip)"/>` : `<rect x="${width*.1}" y="${photoY}" width="${width*.8}" height="${photoH}" rx="36" fill="#ffe5f2"/><text x="${width/2}" y="${photoY+photoH/2}" text-anchor="middle" fill="#7b2f59" font-family="Arial" font-size="34" font-weight="700">Add an approved bracelet photo</text>`;
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#fff8fc"/><stop offset="1" stop-color="#ffd7e9"/></linearGradient>
    <clipPath id="photoClip"><rect x="${width*.1}" y="${photoY}" width="${width*.8}" height="${photoH}" rx="36"/></clipPath>
  </defs>
  <rect width="${width}" height="${height}" fill="url(#bg)"/>
  <circle cx="${width*.12}" cy="${height*.08}" r="12" fill="#ffd166"/><circle cx="${width*.88}" cy="${height*.1}" r="12" fill="#b8f2e6"/>
  <text x="${width/2}" y="${titleY}" text-anchor="middle" fill="#f83f91" font-family="Trebuchet MS, Arial" font-size="${story?98:compact?76:64}" font-weight="800">CharmNest</text>
  <text x="${width/2}" y="${titleY+(story?70:55)}" text-anchor="middle" fill="#5a2143" font-family="Arial" font-size="${story?38:compact?31:28}" font-weight="700">${escapeXml(settings.tagline||'Little charms. Big vibes.')}</text>
  <rect x="${width*.11}" y="${titleY+(story?105:85)}" width="${width*.78}" height="${story?90:74}" rx="24" fill="#f83f91"/>
  <text x="${width/2}" y="${titleY+(story?164:134)}" text-anchor="middle" fill="#fff" font-family="Arial" font-size="${story?44:compact?34:29}" font-weight="800">${escapeXml(drop.name||'Current School Drop')}</text>
  ${image}
  <text x="${width/2}" y="${photoY+photoH+48}" text-anchor="middle" fill="#5a2143" font-family="Arial" font-size="${story?34:compact?28:24}" font-weight="700">${escapeXml(colors)}</text>
  <g transform="translate(${width*.09} ${priceY})">
    <rect width="${width*.38}" height="120" rx="28" fill="#fff" stroke="#ffacd0" stroke-width="4"/>
    <text x="${width*.19}" y="44" text-anchor="middle" fill="#5a2143" font-family="Arial" font-size="25" font-weight="700">SCHOOL DROP</text>
    <text x="${width*.19}" y="98" text-anchor="middle" fill="#f83f91" font-family="Arial" font-size="62" font-weight="900">$${(drop.schoolPriceCents/100).toFixed(0)}</text>
  </g>
  <g transform="translate(${width*.53} ${priceY})">
    <rect width="${width*.38}" height="120" rx="28" fill="#fff" stroke="#ffacd0" stroke-width="4"/>
    <text x="${width*.19}" y="44" text-anchor="middle" fill="#5a2143" font-family="Arial" font-size="25" font-weight="700">CUSTOM COLORS</text>
    <text x="${width*.19}" y="98" text-anchor="middle" fill="#f83f91" font-family="Arial" font-size="62" font-weight="900">$${(drop.customPriceCents/100).toFixed(0)}</text>
  </g>
  <text x="${width/2}" y="${noteY}" text-anchor="middle" fill="#5a2143" font-family="Arial" font-size="${story?32:compact?25:21}" font-weight="700">Check TikTok for the latest confirmed drop.</text>
  <text x="${width/2}" y="${noteY+42}" text-anchor="middle" fill="#7b2f59" font-family="Arial" font-size="${story?28:compact?22:19}">${escapeXml(settings.tiktokHandle||settings.tiktokUrl||'TikTok link available on the website')}</text>
  <text x="${width/2}" y="${noteY+82}" text-anchor="middle" fill="#7b2f59" font-family="Arial" font-size="${story?26:compact?20:18}">${escapeXml(settings.contactEmail||'Contact email available on the website')}</text>
  <foreignObject x="${width*.08}" y="${height-(story?260:compact?130:125)}" width="${width*.84}" height="${story?210:100}">
    <div xmlns="http://www.w3.org/1999/xhtml" style="font-family:Arial;color:#6c3a55;text-align:center;font-size:${story?24:compact?17:15}px;line-height:1.35">Featured colors, charms, quantities, release dates, and availability may change. Some designs are limited and may sell out. School sales may require school approval.</div>
  </foreignObject>
</svg>`;
}
