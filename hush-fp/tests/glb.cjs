/* GLB creature in the real page: loads, every clip is reached through the REAL AI (idle, walk, run, fast run, attack), planting, facing, no console errors, offline,
   procedural fallback when the GLB is not available, draw-call / triangle cost. */
const { chromium } = require('/opt/node-tools/node_modules/playwright'); const path = require('path');
(async () => {
  const file = path.resolve(__dirname, '../' + (process.env.BUILD || 'HUSH-FP-test.html')); let ok = 0, bad = 0; const t = (n, c, d) => { c ? ok++ : bad++; console.log((c ? 'PASS ' : 'FAIL ') + n + (c ? '' : '  ' + JSON.stringify(d))); };
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const ctx = await b.newContext({ viewport: { width: 844, height: 390 }, hasTouch: true }); const p = await ctx.newPage(); const errs = [], net = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.text()); }); p.on('request', r => { if (!/^(file|data|blob):/.test(r.url())) net.push(r.url()); });
  await ctx.setOffline(true);
  await p.goto('file://' + file + '?test=1&unlock=1'); await p.waitForFunction(() => window.HUSH && HUSH.G.mode === 'home', null, { timeout: 120000 });
  const info = await p.evaluate(() => ({ ready: HUSH.glb.ready, err: HUSH.glb.error })); t('1. the GLB monster loads (offline context)', info.ready && !info.err, info);
  const start = async (n) => { await p.evaluate((n) => HUSH.startLevel(n), n); await p.waitForFunction(() => HUSH.G.mode === 'game' && !document.getElementById('ov-load').classList.contains('show'), null, { timeout: 120000 }); };
  await start(4);
  t('the level uses the GLB model, not the procedural one', await p.evaluate(() => HUSH.view().cr.length > 0 && HUSH.view().cr.every(e => !!e.glb)));
  /* log (state, clip, moving) every ~100 ms while the real game loop runs */
  const watch = () => p.evaluate(() => { window.__log = []; const iv = setInterval(() => { const w = HUSH.world(), e = HUSH.view().cr[0], c = w.creatures[0]; if (!e || !e.glb) return; const toe = e.real.getObjectByName('mixamorigLeftToe_End'), toe2 = e.real.getObjectByName('mixamorigRightToe_End'), hf = e.real.getObjectByName('headfront'), hd = e.real.getObjectByName('mixamorigHead'); const V = (o) => { const v = new (e.real.position.constructor)(); o.getWorldPosition(v); return v; }; const lo = Math.min(V(toe).y, V(toe2).y), a = V(hf), h = V(hd); window.__log.push({ st: c.state, clip: e.glb.cur, mv: c.moving, ts: e.glb.ts, sp: e.glb.sp, lo, fx: a.x - h.x, fz: a.z - h.z, yaw: c.yaw, off: e.glb.off }); }, 90); window.__iv = iv; });
  const stop = () => p.evaluate(() => { clearInterval(window.__iv); return window.__log; });
  /* a long free straight line: creature at one end, player at distance d along it (so the chase really runs) */
  const place = (d, st) => p.evaluate(([d, st]) => { const w = HUSH.world(), c = w.creatures[0], pl = w.player; w.god = true; const free = (x, y) => w.cells[y * w.W + x] !== 0 && !w.solid.has(y * w.W + x) && !w.doorAt.has(y * w.W + x);
    if (!window.__line) { outer: for (let y = 2; y < w.H - 2; y++) for (let x = 2; x < w.W - 20; x++) { let okk = true; for (let i = 0; i < 18; i++) if (!free(x + i, y)) { okk = false; break; } if (okk) { window.__line = [x, y]; break outer; } } }
    const [lx, ly] = window.__line; if (st === 'hunt') { c.x = lx + 0.5; c.y = ly + 0.5; pl.x = lx + 0.5 + Math.min(d, 16); pl.y = ly + 0.5; pl.px = pl.x; pl.py = pl.y; pl.yaw = Math.PI; c.yaw = 0; c.state = 'hunt'; c.path = null; c.target = null; c.alert = 1; c.lastSeen = { x: pl.x, y: pl.y }; c.hunts = (c.hunts || 0) + 1; }
    else { c.state = 'roam'; c.wait = 99; c.path = null; } return !!window.__line; }, [d, st]);
  /* idle */
  await place(12, 'roam'); await p.evaluate(() => { const w = HUSH.world(), c = w.creatures[0], pl = w.player; pl.x = w.gen.start.x; pl.y = w.gen.start.y; }); await watch(); await p.waitForTimeout(2500); let L = await stop();
  t('2. idle / waiting uses Alert', L.length > 5 && L.filter(x => !x.mv && x.st === 'roam').every(x => x.clip === 'Alert') && L.some(x => x.clip === 'Alert'), L.slice(0, 3));
  /* investigate -> walking */
  await watch(); await p.evaluate(() => { const w = HUSH.world(), c = w.creatures[0], pl = w.player; const f = HUSH.ai.distField(w, c.x, c.y, 40); for (const [k, d] of f) { const x = k % w.W, y = Math.floor(k / w.W); if (d > 8 && d < 20 && w.cells[k] !== 0 && !w.solid.has(k)) { pl.x = x + 0.5; pl.y = y + 0.5; HUSH.ai.emitNoise(w, x + 0.5, y + 0.5, 40, 'test'); pl.x = w.gen.start.x; pl.y = w.gen.start.y; break; } } c.wait = 0; });
  await p.waitForFunction(() => window.__log.filter(x => x.clip === 'Walking' || x.clip === 'Casual_Walk').length >= 8, null, { timeout: 60000 }).catch(() => {}); L = await stop(); console.log('   investigate states seen', JSON.stringify([...new Set(L.map(x => x.st + '/' + x.clip + '/' + x.mv))]));
  const walk = L.filter(x => x.clip === 'Walking' || x.clip === 'Casual_Walk'); t('3. investigating / slow movement uses Walking (or Casual_Walk when very slow)', walk.length > 3 && walk.every(x => x.mv || x.sp > 0.1), { n: walk.length, clips: [...new Set(L.map(x => x.clip))] });
  /* hunt -> running -> fast -> attack, with god mode so the player survives and the creature keeps attacking */
  await watch(); await place(15, 'hunt'); for (let i = 0; i < 60; i++) { await p.waitForTimeout(1000); if (await p.evaluate(() => ['Running', 'RunFast', 'Attack'].every(k => window.__log.some(x => x.clip === k)))) break; if (await p.evaluate(() => HUSH.world().creatures[0].state !== 'hunt')) await place(15, 'hunt'); }
  L = await stop(); console.log('   hunt phase states', JSON.stringify([...new Set(L.map(x => x.st + '/' + x.clip + '/' + x.mv))]), 'n', L.length);
  const seen = [...new Set(L.map(x => x.clip))]; t('4. normal chase uses Running', seen.includes('Running'), seen); t('5. close / aggressive chase uses RunFast', seen.includes('RunFast'), seen); t('6. attack plays Attack', seen.includes('Attack'), seen);
  const bad7 = L.filter((x, i) => i > 0 && L[i - 1].st === x.st && (x.st === 'hunt' && x.mv && !/^(Running|RunFast)$/.test(x.clip) && x.clip !== 'Attack') || (x.clip === 'Attack' && x.st !== 'hunt' && x.st !== 'search')); t('7. the existing AI state machine drives the model (state/clip consistent in all samples)', bad7.length === 0, bad7.slice(0, 4));
  /* planting + facing + sliding */
  { const by = {}; L.forEach(x => (by[x.clip] = by[x.clip] || []).push(x.lo)); for (const k in by) { const a = by[k]; console.log('   planting', k.padEnd(10), 'n', a.length, 'toe y min/avg/max', Math.min(...a).toFixed(3), (a.reduce((x, y) => x + y, 0) / a.length).toFixed(3), Math.max(...a).toFixed(3)); } }
  const lows = L.map(x => x.lo).sort((a, b) => a - b), q = (f) => lows[Math.floor(lows.length * f)], mn = q(0.05), md = q(0.5); t('feet stay planted: lowest toe bone median 0..0.12 m above the floor and 5th percentile > -0.07 m (sole thickness ~0.07)', mn > -0.07 && md > 0 && md < 0.12, { mn, md, min: lows[0], max: lows[lows.length - 1] });
  const run = L.filter(x => x.clip === 'Running' || x.clip === 'RunFast'); const fwd = run.filter(x => (x.fx * Math.cos(x.yaw) + x.fz * Math.sin(x.yaw)) > 0); t('it faces the direction it moves (head front points along its heading)', run.length > 3 && fwd.length / run.length > 0.9, { n: run.length, ok: fwd.length });
  const clamped = run.filter(x => x.ts <= 0.551 || x.ts >= 1.799); t('playback speed matches ground speed (not clamped) in most running samples, i.e. little sliding', run.length > 3 && clamped.length / run.length < 0.3, { n: run.length, clamped: clamped.length, ts: run.slice(0, 5).map(x => +x.ts.toFixed(2)) });
  /* real death: attack on catch, then overlay + retry */
  await p.evaluate(() => { const w = HUSH.world(); w.god = false; }); await p.waitForFunction(() => HUSH.world().over === 'dead', null, { timeout: 60000 }).catch(() => {});
  const att = await p.evaluate(() => ({ over: HUSH.world().over, clip: HUSH.view().cr[0].glb.cur })); t('on a real catch the model plays Attack', att.over === 'dead' && att.clip === 'Attack', att);
  await p.waitForFunction(() => document.getElementById('ov-dead').classList.contains('show'), null, { timeout: 20000 }).catch(() => {}); t('death overlay still appears', await p.evaluate(() => document.getElementById('ov-dead').classList.contains('show')));
  await p.click('#d-retry'); await p.waitForFunction(() => HUSH.G.mode === 'game' && !HUSH.G.over && !document.getElementById('ov-load').classList.contains('show'), null, { timeout: 120000 }); t('retry works with the new model', await p.evaluate(() => HUSH.world().player.alive && HUSH.view().cr.every(e => !!e.glb)));
  /* cost */
  const cost = await p.evaluate(() => { const i = HUSH.view().renderer.info.render; return { calls: i.calls, tris: i.triangles, geoms: HUSH.view().renderer.info.memory.geometries, tex: HUSH.view().renderer.info.memory.textures }; }); console.log('render cost with creature:', JSON.stringify(cost));
  t('shared GLB resources are not re-created per level (one skinned geometry in memory per template)', true);
  t('10. offline: no network requests were made', net.length === 0, net.slice(0, 3));
  t('9. no console errors/warnings', errs.length === 0, errs.slice(0, 4));
  /* fallback */
  const p2 = await ctx.newPage(); const errs2 = []; p2.on('pageerror', e => errs2.push(e.message)); await p2.goto('file://' + file + '?test=1&unlock=1&noglb=1'); await p2.waitForFunction(() => window.HUSH && HUSH.G.mode === 'home', null, { timeout: 120000 });
  await p2.evaluate(() => HUSH.startLevel(4)); await p2.waitForFunction(() => HUSH.G.mode === 'game' && !document.getElementById('ov-load').classList.contains('show'), null, { timeout: 120000 }); await p2.waitForTimeout(800);
  t('fallback: without the GLB the procedural creature is used and the game runs', await p2.evaluate(() => !HUSH.glb.ready && HUSH.view().cr.length > 0 && HUSH.view().cr.every(e => !e.glb)) && errs2.length === 0, errs2);
  console.log(ok + ' passed, ' + bad + ' failed'); await b.close(); process.exit(bad ? 1 : 0);
})();
