/* 1.6.0: acceleration, lean, bottle pickup/throw/noise lure, bottles exist in levels */
import { LEVELS } from '../src/logic/levels.js';
import { generate } from '../src/logic/gen.js';
import { World, DT } from '../src/logic/world.js';
let pass = 0, fail = 0; const t = (n, ok, x) => { if (ok) pass++; else { fail++; console.log('FAIL', n, x ?? ''); } };
const withBottle = LEVELS.map((l, i) => generate(l).objs.some(o => o.type === 'pickup' && o.kind === 'bottle')); t('bottles lie around in 40+ levels', withBottle.filter(Boolean).length >= 40, withBottle.filter(Boolean).length); t('tutorial levels have none', !withBottle[0] && !withBottle[1] && !withBottle[2]);
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
console.log(pass + ' passed, ' + fail + ' failed'); process.exit(fail ? 1 : 0);
