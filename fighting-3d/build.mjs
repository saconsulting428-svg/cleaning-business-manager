// Bundles everything into ONE standalone HTML file: street-clash-3d.html
import { build } from 'esbuild'; import fs from 'fs';
const r = await build({ entryPoints: ['src/main.js'], bundle: true, minify: true, format: 'iife', write: false, target: 'es2020', legalComments: 'none' });
let html = fs.readFileSync('index.html', 'utf8');
const js = r.outputFiles[0].text.replace(/<\/script>/g, '<\\/script>');
html = html.replace('<script type="module" src="./src/main.js"></script>', () => '<script>' + js + '</script>');
fs.writeFileSync('street-clash-3d.html', html); console.log('built', (html.length / 1024) | 0, 'KB');
