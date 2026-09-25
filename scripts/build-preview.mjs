// Builds CleanPro into one self-contained HTML file (CSS and JS inlined) for
// hosts that can only serve a single page. Output: dist-preview/cleanpro.html
import { execSync } from 'node:child_process';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const out = 'dist-preview';
execSync(`npx vite build --mode preview --outDir ${out} --emptyOutDir`, {
  stdio: 'inherit',
  env: { ...process.env, VITE_ROUTER: 'memory' },
});

const assets = join(out, 'assets');
const files = readdirSync(assets);
const read = (ext) => files.filter((f) => f.endsWith(ext)).map((f) => readFileSync(join(assets, f), 'utf8')).join('\n');
// Keep the inline script from being closed early by a literal "</script".
const js = read('.js').replace(/<\/script/gi, '<\\/script');
const css = read('.css');

const html = `<title>CleanPro</title>
<meta name="theme-color" content="#0c2536">
<style>${css}</style>
<div id="root"></div>
<script type="module">${js}</script>
`;
writeFileSync(join(out, 'cleanpro.html'), html);
console.log(`Wrote ${join(out, 'cleanpro.html')} (${(html.length / 1024).toFixed(0)} KB)`);
