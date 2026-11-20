/* Renders the Ascend: Shield & Sky logo (SVG -> PNG) with headless Chromium.
   usage: NODE_PATH=$(npm root -g) node make-logo.cjs   (needs app/node_modules/@fontsource/fredoka) */
const fs = require('fs'), path = require('path'), { chromium } = require('playwright');
const font = fs.readFileSync(path.join(__dirname, '../app/node_modules/@fontsource/fredoka/files/fredoka-latin-700-normal.woff2')).toString('base64');
const FACE = `@font-face{font-family:'FredokaLogo';font-weight:700;src:url(data:font/woff2;base64,${font}) format('woff2')}`;
const spark = (x, y, r, f = '#fff7c2') => `<path d="M${x},${y - r} Q${x},${y} ${x + r},${y} Q${x},${y} ${x},${y + r} Q${x},${y} ${x - r},${y} Q${x},${y} ${x},${y - r}Z" fill="${f}"/>`;
const SHIELD = 'M252,260 Q382,262 512,196 Q642,262 772,260 L772,470 Q772,660 512,800 Q252,660 252,470 Z';
const DEFS = `<defs>
 <radialGradient id="bg" cx=".5" cy=".26" r=".98"><stop offset="0" stop-color="#8b5cf6"/><stop offset=".4" stop-color="#4338ca"/><stop offset=".78" stop-color="#111a4a"/><stop offset="1" stop-color="#070b1e"/></radialGradient>
 <linearGradient id="planet" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#67e8f9"/><stop offset=".35" stop-color="#2563eb"/><stop offset="1" stop-color="#172554"/></linearGradient>
 <linearGradient id="shield" x1=".12" y1="0" x2=".88" y2="1"><stop offset="0" stop-color="#cffafe"/><stop offset=".38" stop-color="#38bdf8"/><stop offset=".72" stop-color="#4f46e5"/><stop offset="1" stop-color="#4c1d95"/></linearGradient>
 <linearGradient id="gold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fffbd0"/><stop offset=".45" stop-color="#fbbf24"/><stop offset="1" stop-color="#d97706"/></linearGradient>
 <linearGradient id="orbit" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#67e8f9"/><stop offset=".5" stop-color="#fff7c2"/><stop offset="1" stop-color="#f472b6"/></linearGradient>
 <radialGradient id="balloon" cx=".34" cy=".28" r=".82"><stop offset="0" stop-color="#fee2e2"/><stop offset=".3" stop-color="#f87171"/><stop offset=".7" stop-color="#dc2626"/><stop offset="1" stop-color="#7f1d1d"/></radialGradient>
 <radialGradient id="orb" cx=".4" cy=".35" r=".7"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#fbbf24"/></radialGradient>
 <linearGradient id="txt" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset=".55" stop-color="#a5f3fc"/><stop offset="1" stop-color="#c4b5fd"/></linearGradient>
 <filter id="glow" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="26"/></filter>
 <filter id="soft" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="7"/></filter>
 <clipPath id="shclip"><path d="${SHIELD}"/></clipPath>
</defs>`;
const BG = `<rect width="1024" height="1024" fill="url(#bg)"/>
 ${[[120, 150, 3], [260, 90, 2.4], [880, 130, 3.2], [950, 330, 2.2], [70, 420, 2.6], [760, 60, 2], [610, 120, 2], [180, 330, 2], [930, 560, 2.4], [90, 700, 2.4]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#fff" opacity=".85"/>`).join('')}
 <circle cx="512" cy="1560" r="830" fill="#38bdf8" opacity=".55" filter="url(#glow)"/>
 <circle cx="512" cy="1560" r="820" fill="url(#planet)"/>
 <circle cx="512" cy="1560" r="820" fill="none" stroke="#a5f3fc" stroke-width="9" opacity=".9"/>
 <g fill="#fff" opacity=".22"><ellipse cx="260" cy="840" rx="190" ry="26"/><ellipse cx="760" cy="880" rx="230" ry="30"/><ellipse cx="470" cy="930" rx="260" ry="26"/></g>`;
const ART = `
 <path d="${SHIELD}" fill="#22d3ee" opacity=".65" filter="url(#glow)"/>
 <g transform="rotate(-20 512 500)"><path d="M102,500 A410,130 0 0 1 922,500" fill="none" stroke="url(#orbit)" stroke-width="15" stroke-linecap="round" opacity=".9"/></g>
 <path d="${SHIELD}" fill="url(#shield)"/>
 <g clip-path="url(#shclip)"><ellipse cx="385" cy="300" rx="250" ry="105" transform="rotate(-24 385 300)" fill="#fff" opacity=".3"/><path d="M512,196 L512,800" stroke="#fff" stroke-width="5" opacity=".14"/></g>
 <path d="${SHIELD}" fill="none" stroke="url(#gold)" stroke-width="26" stroke-linejoin="round"/>
 <path d="${SHIELD}" transform="translate(512 500) scale(.87) translate(-512 -500)" fill="none" stroke="#fff" stroke-width="6" opacity=".5"/>
 <g transform="translate(512 470) rotate(-8)">
   <ellipse cx="0" cy="8" rx="112" ry="138" fill="#7f1d1d" opacity=".35" filter="url(#soft)"/>
   <path d="M0,134 Q-26,205 10,270" fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round" opacity=".95"/>
   <path d="M-18,138 L18,138 L0,114 Z" fill="#991b1b"/>
   <ellipse cx="0" cy="0" rx="106" ry="134" fill="url(#balloon)"/>
   <ellipse cx="-40" cy="-56" rx="26" ry="48" transform="rotate(-28 -40 -56)" fill="#fff" opacity=".6"/>
 </g>
 <g transform="rotate(-20 512 500)"><path d="M102,500 A410,130 0 0 0 922,500" fill="none" stroke="url(#orbit)" stroke-width="15" stroke-linecap="round"/><circle cx="905" cy="520" r="30" fill="url(#orb)"/><circle cx="905" cy="520" r="52" fill="#fde047" opacity=".35" filter="url(#soft)"/></g>
 ${spark(168, 190, 46)}${spark(872, 250, 36)}${spark(790, 112, 22)}${spark(150, 690, 28, '#a5f3fc')}${spark(905, 760, 26, '#f9a8d4')}`;
const svg = (inner, defs = DEFS, extra = '') => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">${defs}${extra}${inner}</svg>`;
const page = (body, w, h, bg = 'transparent') => `<html><head><style>${FACE}html,body{margin:0;background:${bg};width:${w}px;height:${h}px;overflow:hidden}svg{display:block}</style></head><body>${body}</body></html>`;
const word = (x, y, size, sub, subSize, gap, anchor = 'start') => `<g text-anchor="${anchor}" font-family="FredokaLogo">
  <text x="${x}" y="${y}" font-size="${size}" font-weight="700" letter-spacing="${size * .04}" fill="#3b0764" stroke="#1e1b4b" stroke-width="${size * .08}" stroke-linejoin="round" transform="translate(0 ${size * .035})" opacity=".55">ASCEND</text>
  <text x="${x}" y="${y}" font-size="${size}" font-weight="700" letter-spacing="${size * .04}" fill="url(#txt)" stroke="#312e81" stroke-width="${size * .02}" paint-order="stroke">ASCEND</text>
  <text x="${x}" y="${y + size * .42}" font-size="${subSize}" font-weight="700" letter-spacing="${gap}" fill="#67e8f9">${sub}</text></g>`;
(async () => {
  const b = await chromium.launch(), out = n => path.join(__dirname, n);
  const shot = async (html, w, h, file, transparent) => { const p = await b.newPage({ viewport: { width: w, height: h } }); await p.setContent(html); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(250); await p.screenshot({ path: out(file), omitBackground: !!transparent }); await p.close(); };
  const rounded = `<clipPath id="rr"><rect width="1024" height="1024" rx="230"/></clipPath>`;
  await shot(page(svg(BG + ART), 1024, 1024), 1024, 1024, 'logo-icon-1024.png');                              // store icon (square, full bleed)
  await shot(page(svg(`<g clip-path="url(#rr)">${BG + ART}</g>`, DEFS.replace('</defs>', rounded + '</defs>')), 1024, 1024), 1024, 1024, 'logo-icon-rounded-1024.png', true);
  await shot(page(svg(BG), 1024, 1024), 1024, 1024, 'android-bg.png');                                          // adaptive icon background
  await shot(page(svg(`<g transform="translate(512 512) scale(.7) translate(-512 -500)">${ART}</g>`), 1024, 1024), 1024, 1024, 'android-fg.png', true);   // adaptive foreground (safe zone)
  // horizontal lockup: icon + wordmark
  const lock = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1900 760" width="1900" height="760"><defs>${DEFS.replace(/<\/?defs>/g, '')}${rounded}</defs>
   <g transform="translate(50 60) scale(.64)"><g clip-path="url(#rr)">${BG + ART}</g></g>${word(790, 420, 250, 'SHIELD &amp; SKY', 76, 30)}</svg>`;
  await shot(page(lock, 1900, 760), 1900, 760, 'logo-lockup-transparent.png', true);
  await shot(page(lock, 1900, 760, 'linear-gradient(135deg,#0b1026,#1e3a8a)'), 1900, 760, 'logo-lockup-dark.png');
  // vertical splash master
  const splash = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 2400" width="1280" height="2400"><defs>${DEFS.replace(/<\/?defs>/g, '')}${rounded}<linearGradient id="sbg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0b1026"/><stop offset=".6" stop-color="#1b2a7a"/><stop offset="1" stop-color="#3b2f9e"/></linearGradient></defs>
   <rect width="1280" height="2400" fill="url(#sbg)"/>${Array.from({ length: 90 }, (_, i) => `<circle cx="${(i * 677) % 1280}" cy="${(i * 449) % 2400}" r="${1 + (i % 4) * .8}" fill="#fff" opacity="${.3 + (i % 5) * .15}"/>`).join('')}
   <g transform="translate(240 560) scale(.78)"><g clip-path="url(#rr)">${BG + ART}</g></g>${word(640, 1560, 250, 'SHIELD &amp; SKY', 70, 34, 'middle')}</svg>`;
  await shot(page(splash, 1280, 2400), 1280, 2400, 'splash-master.png');
  await b.close(); console.log('logo files written to', __dirname);
})();
