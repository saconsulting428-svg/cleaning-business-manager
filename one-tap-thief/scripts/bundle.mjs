// Builds dist/OneTapThief.html — the whole game (JS + CSS inlined) as ONE standalone file that works offline,
// including from file:// on a phone or desktop.   npm run bundle
import { build } from 'esbuild';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = join(fileURLToPath(import.meta.url), '..', '..');
const out = await build({ entryPoints: [join(root, 'src/main.js')], bundle: true, minify: true, format: 'iife', write: false, target: 'es2019' });
const js = out.outputFiles[0].text.replace(/<\/script>/g, '<\\/script>');
const css = readFileSync(join(root, 'src/ui/styles.css'), 'utf8');
let html = readFileSync(join(root, 'index.html'), 'utf8');
html = html.replace(/\s*<link rel="icon"[^>]*>/, '')
  .replace('<link rel="stylesheet" href="src/ui/styles.css">', () => `<style>${css}</style>`)
  .replace('<script type="module" src="src/main.js"></script>', () => `<script>${js}</script>`);
mkdirSync(join(root, 'dist'), { recursive: true });
writeFileSync(join(root, 'dist/OneTapThief.html'), html);
console.log(`dist/OneTapThief.html  ${(html.length / 1024).toFixed(0)} KB (single file, no external requests)`);
