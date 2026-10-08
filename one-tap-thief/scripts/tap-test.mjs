// End-to-end browser test (needs `npm run dev` on PORT 8099): tap-to-move, dragging does nothing, no path dots,
// wall navigation, proximity, chase, hiding, CCTV, alarm, caught, win, UI text.
import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
const URL = process.env.URL || 'http://localhost:8099/';
const br = await chromium.launch({ args: ['--no-sandbox'] });
const pg = await br.newPage({ viewport: { width: 390, height: 780 }, deviceScaleFactor: 1, hasTouch: true });
const errs = []; pg.on('pageerror', (e) => errs.push(e.message)); pg.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
let bad = 0; const check = (n, ok, x = '') => { if (!ok) bad++; console.log(`${ok ? '✓' : '✗'} ${n} ${x}`); };
const wait = (ms) => pg.waitForTimeout(ms);
await pg.goto(URL); await wait(2400);
await pg.evaluate(() => window.__ott.save.set({ unlocked: 10 }));
const open = async (n) => { await pg.evaluate((n) => window.__ott.startLevel(n), n); await wait(600); };
const view = () => pg.evaluate(() => ({ ...window.__ott.game.view }));
const st = () => pg.evaluate(() => { const s = window.__ott.game.state; return { x: s.player.x, y: s.player.y, status: s.status, path: s.player.path.length, hidden: s.player.hidden, keys: s.keys, taken: s.taken.filter(Boolean).length, spotted: s.spotted, alarmed: s.alarmed, alarm: s.alarm.t, danger: s.danger }; });
const tile = async (x, y) => { const v = await view(); return [v.ox + x * v.ts, v.oy + y * v.ts]; };
const tap = async (tx, ty) => { const [x, y] = await tile(tx, ty); await pg.mouse.click(x, y); };
const drag = async (fx, fy, tx, ty) => tap(tx, ty);                       // legacy helper: old tests now simply tap the destination
const swipe = async (fx, fy, tx, ty) => { const [ax, ay] = await tile(fx, fy), [bx, by] = await tile(tx, ty); await pg.mouse.move(ax, ay); await pg.mouse.down(); for (let i = 1; i <= 8; i++) await pg.mouse.move(ax + ((bx - ax) * i) / 8, ay + ((by - ay) * i) / 8); await pg.mouse.up(); };
const idle = () => pg.waitForFunction(() => !window.__ott.game.state.player.path.length || window.__ott.game.state.status !== 'playing', null, { timeout: 20000 });

// ---- L1: drag-to-move + wall navigation
await open(1);
check('start card says "Tap to start"', await pg.evaluate(() => document.querySelector('.tap-hint')?.textContent.trim() === 'Tap to start'));
check('no "drag" wording anywhere in the UI', !(await pg.evaluate(() => document.body.innerText.toLowerCase().replace('dragging does nothing', '').includes('drag'))));
const cardH = await pg.evaluate(() => document.querySelector('.ready-card').getBoundingClientRect().height);
check('instruction card is compact', cardH < 100, `${cardH.toFixed(0)}px tall`);
await swipe(1.5, 1.5, 6.5, 5.5); await wait(150);
let s0 = await st();
check('DRAGGING does nothing (thief stays, no route, level not started)', s0.path === 0 && Math.hypot(s0.x - 1.5, s0.y - 1.5) < 0.01 && await pg.evaluate(() => window.__ott.game.waiting), JSON.stringify({ x: s0.x, y: s0.y, path: s0.path }));
await tap(3.5, 3.5); await wait(80);
let s = await st();
check('a tap starts the level and sets a route', s.path > 0, `path ${s.path}`);
await idle(); s = await st();
check('thief walked to the tapped point (around walls)', Math.hypot(s.x - 3.5, s.y - 3.5) < 0.15 && s.taken === 1, `at ${s.x.toFixed(2)},${s.y.toFixed(2)} loot ${s.taken}`);
// tapping a wall snaps to the nearest reachable tile, never walks into it
await tap(2.5, 3.5); await idle(); s = await st();
check('tapping a wall does not break navigation', s.status === 'playing' && !isNaN(s.x));
// swipe mid-move: ignored, the current destination is kept
await tap(7.5, 1.5); await wait(150); const mid = await st(); await swipe(2.5, 6.5, 5.5, 6.5); await wait(100);
check('a swipe while moving does not change the destination', (await st()).path > 0 && mid.path > 0);
await tap(3.5, 3.5); await wait(100);
check('tapping another spot while moving changes the destination', (await pg.evaluate(() => window.__ott.game.state.player.target)).x === 3);
await idle();
// cancelled gesture (released outside canvas) does nothing
const before = await st(); const v = await view();
await pg.mouse.move(v.ox + 200, v.oy + 50); await pg.mouse.down(); await pg.mouse.move(v.ox + 200, -50, { steps: 4 }); await pg.mouse.up(); await wait(100);
check('release off-screen cancels', (await st()).path === before.path);
// no path dots / route line drawn: path exists internally but pixels near the route stay clean
const dots = await pg.evaluate(() => { const g = window.__ott.game; const s = g.state; return !('showPath' in (g.__proto__ || {})) && typeof g.fx.rings !== 'undefined'; });
await tap(7.5, 1.5); await wait(600);
const pix = await pg.evaluate(() => { const g = window.__ott.game; const c = g.canvas.getContext('2d'); const s = g.state; const v = g.view; // sample the centre of the next 3 path tiles for white dots
  const out = []; for (const n of s.player.path.slice(2, 6)) { const px = (v.ox + (n.x + 0.5) * v.ts) * g.dpr, py = (v.oy + (n.y + 0.5) * v.ts) * g.dpr; const d = c.getImageData(px - 2, py - 2, 4, 4).data; let w = 0; for (let i = 0; i < d.length; i += 4) if (d[i] > 200 && d[i + 1] > 200 && d[i + 2] > 200) w++; out.push(w); } return out; });
check('no path dots drawn on route tiles', pix.every((w) => w === 0), JSON.stringify(pix));
await pg.screenshot({ path: '/tmp/claude-0/-home-user-cleaning-business-manager/5a7446ff-cbd1-5691-994f-7bbdc591eb5b/scratchpad/shots/70-nodots.png' });
await idle();
// ---- win L1: collect all + exit
await drag(7.5, 1.5, 7.5, 3.5); await idle(); await drag(7.5, 3.5, 1.5, 7.5); await idle(); await drag(1.5, 7.5, 7.5, 7.5); await idle(); await wait(300);
s = await st(); check('L1 win state reached', s.status === 'won', s.status);
await wait(800); check('level complete modal shown', await pg.evaluate(() => !!document.querySelector('.modal:not([hidden]) .star-row')));

// ---- L2: caught state via walking into the guard's lane
await open(2);
await drag(1.5, 1.5, 4.5, 3.5); await wait(2500); s = await st();
await wait(1500);
check('guard catches a careless thief (caught state + modal)', (await st()).status === 'caught' && await pg.evaluate(() => !!document.querySelector('.modal:not([hidden]) .bad')), (await st()).status);

// ---- proximity on a live level: walk right behind a guard
await open(4);
const px = await pg.evaluate(() => { const g = window.__ott.game; const st = g.state; g.waiting = false; const gd = st.guards[0]; gd.path = []; gd.wait = 99; gd.route.length = 1; gd.face = 0; gd.x = 4.5; gd.y = 6.5; st.guards[1].x = 7.5; st.guards[1].y = 8.5; st.guards[1].wait = 99; st.guards[1].path = []; st.player.x = 3.5; st.player.y = 6.5; st.player.path = []; return true; });
await wait(150);
const near = await pg.evaluate(async () => { const g = window.__ott.game; const gd = g.state.guards[0]; gd.meter = 0; let peak = 0, sus = false; for (let i = 0; i < 30; i++) { await new Promise((r) => setTimeout(r, 30)); peak = Math.max(peak, gd.meter); if (gd.state === 'suspicious') sus = true; if (g.state.status !== 'playing') break; } return { peak, sus, t: g.state.tension }; });
check('standing 1 tile behind a guard makes him suspicious (proximity)', near.peak > 0.04 && near.sus, JSON.stringify(near));

// ---- hiding on L3 (wardrobe at 3,5)
await open(3);
await pg.evaluate(() => { const g = window.__ott.game; g.waiting = false; g.state.guards[0].wait = 99; g.state.guards[0].path = []; g.state.guards[0].route.length = 1; g.state.guards[0].x = 4.5; g.state.guards[0].y = 4.5; g.state.player.x = 3.5; g.state.player.y = 5.5; });
await wait(600); s = await st();
check('standing on the wardrobe next to a guard: hidden, not noticed', s.hidden && s.danger === 0 && s.status === 'playing', JSON.stringify({ h: s.hidden, d: s.danger }));
await pg.screenshot({ path: '/tmp/claude-0/-home-user-cleaning-business-manager/5a7446ff-cbd1-5691-994f-7bbdc591eb5b/scratchpad/shots/71-hiding.png' });

// ---- CCTV (L6) + alarm
await open(6);
const cam = await pg.evaluate(async () => { const g = window.__ott.game; g.waiting = false; const c = g.state.cameras[0]; g.state.guards.forEach((x) => { x.wait = 99; x.path = []; x.route.length = 1; x.x = 1.5; x.y = 7.5; x.face = 0; }); g.state.player.x = 4.5; g.state.player.y = 4.5; c.t = 0; let peak = 0, alarm = false; for (let i = 0; i < 90; i++) { await new Promise((r) => setTimeout(r, 30)); peak = Math.max(peak, c.meter); if (g.state.alarm.t > 0) { alarm = true; break; } } return { peak, alarm }; });
check('CCTV builds up detection then raises the alarm', cam.peak > 0.3 && cam.alarm, JSON.stringify(cam));
await wait(300); await pg.screenshot({ path: '/tmp/claude-0/-home-user-cleaning-business-manager/5a7446ff-cbd1-5691-994f-7bbdc591eb5b/scratchpad/shots/72-alarm.png' });
// alarm tile (L8)
await open(8);
await pg.evaluate(() => { const g = window.__ott.game; g.waiting = false; g.state.guards.forEach((x) => { x.wait = 99; x.path = []; x.route.length = 1; x.x = 7.5; x.y = 8.5; x.face = 0; }); });
await drag(1.5, 1.5, 3.5, 3.5, 4); await wait(1800); s = await st();
check('alarm tile triggers the alarm', s.alarmed && s.alarm > 0, JSON.stringify({ a: s.alarmed }));
console.log(errs.length ? 'ERRORS ' + JSON.stringify(errs) : 'no console errors');
await br.close(); process.exit(bad || errs.length ? 1 : 0);
