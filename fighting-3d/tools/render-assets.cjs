// Renders KAI's presentation assets (turnaround, expressions, animation sheet, portrait) and exports the GLB + textures.
// Usage: node tools/render-assets.cjs   (needs: npm run build, and playwright with a Chromium)
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright'); const fs = require('fs'); const path = require('path');
const out = path.join(__dirname, '..', 'assets', 'kai'); fs.mkdirSync(path.join(out, 'textures'), { recursive: true });
const sharp = (() => { try { return require('sharp'); } catch (e) { return null; } })();
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
  await p.goto('file://' + path.join(__dirname, '..', 'street-clash-3d.html') + '?q=medium'); await p.waitForFunction(() => window.__sc, { timeout: 120000 }); await p.waitForTimeout(1500);
  await p.evaluate(() => { __sc.game.openViewer('kai'); document.querySelector('#viewer').style.display = 'none'; });
  const shot = async (name, clip) => { await p.waitForTimeout(1800); await p.screenshot({ path: path.join(out, 'raw_' + name + '.png'), clip }); };
  for (const v of ['front', 'left', 'back', 'right']) { await p.evaluate(v => __sc.game.viewerView(v), v); await shot('view_' + v, { x: 380, y: 0, width: 520, height: 720 }); }
  await p.evaluate(() => __sc.game.viewerView('face'));
  for (const e of ['neutral', 'angry', 'shouting', 'focused', 'smirk', 'serious']) { await p.evaluate(e => __sc.game.viewerExpr(e), e); await shot('expr_' + e, { x: 380, y: 20, width: 520, height: 500 }); }
  await p.evaluate(() => { __sc.game.viewerExpr('auto'); __sc.game.viewerView('three'); const V = __sc.game.v.view; V.az = .6; V.el = .04; V.dist = 1.9; V.ty = 1.48; V.fov = 26; }); await shot('portrait', { x: 380, y: 0, width: 520, height: 720 });
  await p.evaluate(() => { const V = __sc.game.v.view; V.az = .55; V.el = .06; V.dist = 5.2; V.ty = .95; V.fov = 28; });
  const anims = [['idle', 10], ['walkF', 20], ['walkB', 20], ['dodge', 16], ['jab', 7], ['cross', 12], ['lkick', 10], ['hkick', 16], ['upper', 11], ['sweep', 13], ['special1', 16], ['special2', 20], ['block', 10], ['hit', 6], ['jump', 20], ['knockdown', 30], ['victory', 50], ['defeat', 70]];
  for (const [a, t] of anims) { await p.evaluate(a => __sc.game.viewerPlay(a), a); await p.evaluate(t => { const g = __sc.game, v = g.v; for (let i = 0; i < t; i++) { v.acc += 1 / 60; g.viewerTick(0); } for (let i = 0; i < 2; i++) __sc.gfx.render(1 / 60); }, t); await p.screenshot({ path: path.join(out, 'raw_anim_' + a + '.png'), clip: { x: 380, y: 60, width: 520, height: 660 } }); }
  // GLB + textures
  await p.evaluate(() => { __sc.game.viewerPlay('stand'); });
  const glb = await p.evaluate(async () => { const buf = await __sc.game.exportGLB(); let s = ''; const u = new Uint8Array(buf); for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000)); return btoa(s); });
  fs.writeFileSync(path.join(out, 'kai.glb'), Buffer.from(glb, 'base64'));
  const tx = await p.evaluate(() => { const t = __sc.kaiTextures(), f = x => x.image.toDataURL('image/png'); return { jacket_albedo: f(t.map), jacket_bump: f(t.bump), sash_red: f(t.sash) }; });
  for (const k in tx) fs.writeFileSync(path.join(out, 'textures', k + '.png'), Buffer.from(tx[k].split(',')[1], 'base64'));
  await b.close(); console.log('raw renders + kai.glb + textures written to', out);
})();
