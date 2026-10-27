// Builds one self-contained HTML file (Phaser, all scripts, levels and fonts inlined) for quick desktop/phone testing.
//   node tools/build-single-html.mjs [out.html]
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const www = path.join(path.dirname(fileURLToPath(import.meta.url)), '../www');
let html = fs.readFileSync(path.join(www, 'index.html'), 'utf8');
html = html.replace(/url\((fonts\/[^)]+\.woff2)\)/g, (m, f) => 'url(data:font/woff2;base64,' + fs.readFileSync(path.join(www, f)).toString('base64') + ')');
html = html.replace(/<script src="([^"]+)"><\/script>/g, (m, src) => '<script>' + fs.readFileSync(path.join(www, src), 'utf8').replace(/<\/script>/g, '<\\/script>') + '</script>');
const out = process.argv[2] || path.join(www, '../Snake_Fruit_Rush_2.0_test.html');
fs.writeFileSync(out, html);
console.log(out, (html.length / 1e6).toFixed(2) + ' MB');
