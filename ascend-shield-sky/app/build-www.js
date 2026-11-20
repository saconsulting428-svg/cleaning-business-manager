/* Copies the web game into app/www for Capacitor, and bundles the Fredoka font so the app looks the same offline. */
const fs = require('fs'), path = require('path');
const root = path.resolve(__dirname, '..'), www = path.join(__dirname, 'www');
fs.rmSync(www, { recursive: true, force: true });
fs.mkdirSync(path.join(www, 'fonts'), { recursive: true });
let html = fs.readFileSync(path.join(root, 'index.html'), 'utf8')
  .replace(/<link rel="preconnect"[^>]*>\s*/g, '')
  .replace(/<link href="https:\/\/fonts\.googleapis\.com[^>]*>\s*/g, '');
fs.writeFileSync(path.join(www, 'index.html'), html);
for (const d of ['css', 'js']) fs.cpSync(path.join(root, d), path.join(www, d), { recursive: true });
let face = '';
for (const w of [400, 500, 600, 700]) {
  const f = `fredoka-latin-${w}-normal.woff2`;
  fs.copyFileSync(path.join(__dirname, 'node_modules/@fontsource/fredoka/files', f), path.join(www, 'fonts', f));
  face += `@font-face{font-family:'Fredoka';font-style:normal;font-weight:${w};font-display:swap;src:url(../fonts/${f}) format('woff2')}\n`;
}
const cssPath = path.join(www, 'css/style.css'); fs.writeFileSync(cssPath, face + fs.readFileSync(cssPath, 'utf8'));
console.log('www ready:', fs.readdirSync(www).join(', '));
