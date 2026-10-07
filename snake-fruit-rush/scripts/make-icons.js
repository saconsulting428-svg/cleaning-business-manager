// Renders assets/icon.svg-derived artwork to PNGs in resources/ (inputs for @capacitor/assets).
// Needs Playwright + Chromium (dev-time only): node scripts/make-icons.js
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const path = require('path');
const out = path.join(__dirname, '..', 'resources');
const art = '<path d="M12 44c10 0 8-18 20-18s8 14 20 14" fill="none" stroke="#3ef0c4" stroke-width="9" stroke-linecap="round"/><circle cx="50" cy="40" r="3" fill="#06202e"/><circle cx="46" cy="14" r="8" fill="#ff4757"/><path d="M46 7q2-4 6-4q-1 4-6 4z" fill="#4cd964"/>';
const pages = {
  'icon-only.png': [1024, 1024, `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="1024" height="1024"><rect width="64" height="64" fill="#0b4a5c"/>${art}</svg>`],
  'icon-background.png': [1024, 1024, '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="1024" height="1024"><rect width="64" height="64" fill="#0b4a5c"/></svg>'],
  // adaptive foreground: art scaled into the ~66% safe zone
  'icon-foreground.png': [1024, 1024, `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="1024" height="1024"><g transform="translate(32 32) scale(.62) translate(-32 -28)">${art}</g></svg>`],
  'splash.png': [2732, 2732, `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2732 2732" width="2732" height="2732"><rect width="2732" height="2732" fill="#06202e"/><g transform="translate(1066 1066) scale(9.5)"><rect width="64" height="64" rx="14" fill="#0b4a5c"/>${art}</g></svg>`]
};
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium' });
  for (const [name, [w, h, svg]] of Object.entries(pages)) {
    const p = await b.newPage({ viewport: { width: w, height: h } });
    await p.setContent(`<body style="margin:0;background:transparent">${svg}</body>`);
    await p.screenshot({ path: path.join(out, name), omitBackground: true });
    await p.close();
  }
  await b.close();
  require('fs').copyFileSync(path.join(out, 'splash.png'), path.join(out, 'splash-dark.png'));
})();
