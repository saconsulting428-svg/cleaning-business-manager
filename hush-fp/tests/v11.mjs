/* 1.6.0: acceleration, lean, bottle pickup/throw/noise lure, bottles exist in levels */
import { LEVELS } from '../src/logic/levels.js';
import { generate } from '../src/logic/gen.js';
import { World, DT } from '../src/logic/world.js';
let pass = 0, fail = 0; const t = (n, ok, x) => { if (ok) pass++; else { fail++; console.log('FAIL', n, x ?? ''); } };
const withBottle = LEVELS.map((l, i) => generate(l).objs.some(o => o.type === 'pickup' && o.kind === 'bottle')); t('bottles lie around in 40+ levels', withBottle.filter(Boolean).length >= 40, withBottle.filter(Boolean).length); t('the first three levels each hold one bottle (taught in the tutorial)', withBottle[0] && withBottle[1] && withBottle[2]);
{ const w = new World(generate(LEVELS[8]), { god: true }); w.creatures.length = 0; const p = w.player; let v = [];
  for (let i = 0; i < 30; i++) { w.update(DT, { fwd: 1 }); v.push(Math.hypot(p.vx, p.vy)); } t('walking accelerates over several ticks (not instant)', v[0] < v[8] * 0.6 && v[29] > v[0], v.slice(0, 4).map(x => x.toFixed(2)).join(','));
  for (let i = 0; i < 4; i++) w.update(DT, {}); t('stopping decelerates (still moving 4 ticks after release)', Math.hypot(p.vx, p.vy) > 0.05); }
{ const w = new World(generate(LEVELS[8]), { god: true }); w.creatures.length = 0; const p = w.player; for (let i = 0; i < 20; i++) w.update(DT, { lean: 1 }); t('lean builds up smoothly and is bounded', p.leanS > 0.2 && p.leanS <= 1.001, p.leanS); for (let i = 0; i < 30; i++) w.update(DT, {}); t('lean returns to centre', Math.abs(p.leanS) < 0.05); }
{ const w = new World(generate(LEVELS[8]), { god: true }), c = w.creatures[0], p = w.player; const bt = w.objs.find(o => o.type === 'pickup' && o.kind === 'bottle'); p.x = bt.x + 0.5; p.y = bt.y + 0.5; for (let i = 0; i < 5; i++) w.update(DT, {}); t('walking over a bottle picks it up', p.inv.bottle === 1 && bt.taken);
  p.x = w.gen.start.x; p.y = w.gen.start.y; w.over = null;
  /* find an open straight to throw along */
  let ok = false; for (let a = 0; a < 6.28 && !ok; a += 0.4) { p.yaw = a; p.pitch = 0.05; p.inv.bottle = 1; w.projectiles = []; const n0 = w.events.length; w.throwBottle(); let last = null; for (let i = 0; i < 400 && w.projectiles.length; i++) { last = { x: w.projectiles[0].x, y: w.projectiles[0].y }; w.update(DT, {}); } if (last && Math.hypot(last.x - p.x, last.y - p.y) > 3) { ok = true; t('a thrown bottle flies an arc and lands several tiles away', true); t('landing makes a noise event', w.events.some(e => e.type === 'bottle')); } }
  if (!ok) t('thrown bottle lands > 3 tiles away in some direction', false);
  c.state = 'roam'; c.target = null; c.path = null; c.wait = 0; const k = (x, y) => Math.floor(y) * w.W + Math.floor(x);
  const spot = (() => { for (let r = 3; r < 9; r += 0.5) for (let a = 0; a < 6.28; a += 0.3) { const x = p.x + Math.cos(a) * r, y = p.y + Math.sin(a) * r; if (w.cells[k(x, y)] === 1 && !w.solid.has(k(x, y))) return [x, y]; } return null; })();
  c.x = spot[0]; c.y = spot[1]; c.state = 'roam'; const bx = spot[0] + 0.3; w.projectiles = [{ x: bx, y: spot[1], z: 0.1, vx: 0, vy: 0, vz: -1, t: 0 }]; w.update(DT, {}); w.update(DT, {}); t('the creature near the landing spot comes to investigate', c.state !== 'roam', c.state); }
/* ceiling vent drop */
{ let n = 0, only = 0, none = 0; for (let i = 0; i < 50; i++) { const g = generate(LEVELS[i]), w = new World(g, { ventDrop: true }), w0 = new World(g, {}); if (w0.vdrop) none++; if (w.vdrop) { n++; if (i >= 17 && w.creatures.some(c => c.dormant) && w.creatures.filter(c => c.dormant).length === 1) only++; } }
  t('the vent drop exists only on chapter 2 and 3 levels with a stalker/listener', n > 0 && only === n, n + ' ' + only); t('never present unless the page asks for it', none === 0); }
{ const i = LEVELS.findIndex((l, k) => k >= 17 && l.creatures.some(c => c !== 'sentinel')), w = new World(generate(LEVELS[i]), { ventDrop: true, god: true }), v = w.vdrop, c = w.creatures.find(q => q.id === v.id), p = w.player;
  t('creature starts dormant and does not hear noise', c.dormant === true); const ev = []; const op = w.events.push.bind(w.events); w.events.push = (...a) => { ev.push(...a); return op(...a); };
  /* player stands under the vent: it must wait (never drops within 6 tiles) */
  p.x = v.cx; p.y = v.cy; for (let k = 0; k < 40 * 30; k++) w.update(DT, {}); t('it never drops while the player is within 6 tiles', c.dormant === true && w.vdrop.state !== 'fall' && w.vdrop.state !== 'done', w.vdrop.state);
  /* player far away: shake, then fall */
  const sp = (() => { for (let r = 8; r < 20; r += 1) for (let a = 0; a < 6.28; a += 0.3) { const x = v.cx + Math.cos(a) * r, y = v.cy + Math.sin(a) * r, k = Math.floor(y) * w.W + Math.floor(x); if (w.cells[k] === 1 && !w.solid.has(k)) return [x, y]; } return null; })(); p.x = sp[0]; p.y = sp[1]; w.vdrop.t = 20; ev.length = 0; let shakeT = -1, fallT = -1, landT = -1; for (let k = 0; k < 8 * 30; k++) { w.update(DT, {}); for (const e of ev) { if (e.type === 'ventShake' && shakeT < 0) shakeT = k * DT; if (e.type === 'ventFall') fallT = k * DT; if (e.type === 'ventLand') landT = k * DT; } ev.length = 0; }
  t('shake (creak), then fall, then land', shakeT >= 0 && fallT > shakeT + 1.0 && landT > fallT, [shakeT, fallT, landT].map(x => x.toFixed(2)).join(' ')); t('the descent takes 0.8 s', Math.abs(landT - fallT - 0.8) < 0.15, (landT - fallT).toFixed(2)); t('afterwards it is an ordinary awake creature, once only', c.dormant === false && w.vdrop.state === 'done'); }
console.log(pass + ' passed, ' + fail + ' failed'); process.exit(fail ? 1 : 0);
