/* sentinel-only probe: on every level that has a sentinel, a player who crouches, switches the torch off near it and keeps 3.6 tiles away from its post (the quiet route the generator guarantees)
   must be able to finish the level without ever being noticed. Other creatures are removed so that only the guard design is tested. */
import { LEVELS } from '../src/logic/levels.js';
import { generate } from '../src/logic/gen.js';
import { World, DT } from '../src/logic/world.js';
const ang = (a, b) => { let d = b - a; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return d; };
function bfsAvoid(w, from, goal, discs) {
  const W = w.W, H = w.H, sx = Math.floor(from[0]), sy = Math.floor(from[1]), gk = goal[1] * W + goal[0], prev = new Int32Array(W * H).fill(-2), q = [sy * W + sx]; prev[q[0]] = -1;
  const bad = (x, y) => discs.some(d => Math.hypot(x + 0.5 - d.x, y + 0.5 - d.y) < 3.6);
  for (let qi = 0; qi < q.length; qi++) { const k = q[qi]; if (k === gk) break; const x = k % W, y = (k / W) | 0; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy, nk = ny * W + nx; if (nx < 0 || ny < 0 || nx >= W || ny >= H || prev[nk] !== -2 || w.cells[nk] === 0) continue; const d = w.doorAt.get(nk); if (w.solid.has(nk) && !d) continue; if (d && d.locked) continue; if (bad(nx, ny) && nk !== gk) continue; prev[nk] = k; q.push(nk); } }
  if (prev[gk] === -2) return null; const out = []; for (let k = gk; k >= 0 && k !== sy * W + sx; k = prev[k]) out.push([k % W + 0.5, ((k / W) | 0) + 0.5]); return out.reverse();
}
export function sneakRun(gen, delay, maxT) {
  const w = new World(gen, {}), p = w.player, path = gen.solution; w.creatures = w.creatures.filter(c => c.t === 'sentinel'); w.crawlers.length = 0; w.sp = null; const discs = w.creatures; let idx = 0, t = 0, route = null, rt = 0, hideT = 0, hideAge = 0, hideCool = 0; const used = new Set(); let noticed = 0;
  while (t < maxT && !w.over) {
    const inp = { fwd: 0, sprint: false }; t += DT; if (t < delay) { w.update(DT, inp); continue; }
    if (w.creatures.some(c => c.state === 'suspicious' || c.state === 'hunt' || c.state === 'investigate')) noticed++;
    if (p.vent) { w.update(DT, inp); continue; }
    /* a guard has been drawn by a noise (a generator, an alarm, a door): get into the nearest locker and wait until it is quiet again */
    const stirred = w.creatures.some(c => c.state === 'investigate' || c.state === 'suspicious' || c.state === 'hunt' || c.state === 'search');
    if (p.hidden >= 0) { hideAge += DT; hideT = stirred ? 0 : hideT + DT; if (hideT > 4 || hideAge > 14) { inp.interact = true; hideT = 0; hideCool = 25; } w.update(DT, inp); continue; }
    hideCool -= DT; hideAge = 0;
    if (stirred && hideCool <= 0 && !w.creatures.some(c => c.state === 'hunt' && Math.hypot(c.x - p.x, c.y - p.y) < 2)) {
      let best = null, bd = 14; for (const o of w.objs) if (o.type === 'locker') { const d = Math.hypot(o.x + 0.5 - p.x, o.y + 0.5 - p.y); if (d < bd) { bd = d; best = o; } }
      if (best) { const fx = best.x + 0.5 + Math.cos(best.face) * 0.8, fy = best.y + 0.5 + Math.sin(best.face) * 0.8; if (Math.hypot(fx - p.x, fy - p.y) < 0.6) { p.yaw = best.face + Math.PI; const L = w.interactTarget(); if (L && L.kind === 'locker') inp.interact = true; w.update(DT, inp); continue; }
        const rt2 = bfsAvoid(w, [p.x, p.y], [Math.floor(fx), Math.floor(fy)], []); if (rt2 && rt2.length) { const tg = rt2[Math.min(1, rt2.length - 1)], d = ang(p.yaw, Math.atan2(tg[1] - p.y, tg[0] - p.x)); inp.dyaw = Math.max(-0.5, Math.min(0.5, d)); if (Math.abs(d) < 0.8) inp.fwd = 1; p.crouch = false; inp.sprint = bd > 5; w.update(DT, inp); continue; } }
    }
    const nearG = w.creatures.some(c => Math.hypot(c.x - p.x, c.y - p.y) < 13); p.crouch = nearG; if (p.flash === nearG) inp.flash = true;
    const critical = (k) => w.objs.some(o => ((o.type === 'item' && !o.taken && o.kind !== 'radio') || (o.type === 'note' && !o.done) || ((o.type === 'valve' || o.type === 'breaker' || o.type === 'generator') && !o.done && !o.on)) && Math.abs(o.x - path[k][0]) <= 1 && Math.abs(o.y - path[k][1]) <= 1);
    for (let k = idx + 1; k < Math.min(path.length - 1, idx + 14); k++) { if (Math.hypot(path[k][0] + 0.5 - p.x, path[k][1] + 0.5 - p.y) < 0.6) { let skip = false; for (let j = idx + 1; j < k; j++) if (critical(j)) skip = true; if (!skip) idx = Math.max(idx, k); } }
    if (idx >= path.length - 1) { const ex = gen.exit; p.yaw += ang(p.yaw, Math.atan2(ex.y + 0.5 - p.y, ex.x + 0.5 - p.x)); if (Math.hypot(ex.x + 0.5 - p.x, ex.y + 0.5 - p.y) < 1.6) inp.interact = true; else inp.fwd = 1; w.update(DT, inp); continue; }
    const cur = path[idx], nxt = path[idx + 1], jump = Math.abs(nxt[0] - cur[0]) + Math.abs(nxt[1] - cur[1]) > 1.5;
    if (jump) { const v = w.objs.find(o => o.type === 'vent' && Math.abs(o.x - cur[0]) + Math.abs(o.y - cur[1]) === 1); if (v) { const d = ang(p.yaw, Math.atan2(v.y + 0.5 - p.y, v.x + 0.5 - p.x)); inp.dyaw = Math.max(-0.4, Math.min(0.4, d)); if (Math.abs(d) < 0.7) inp.fwd = 1; if (Math.hypot(v.x + 0.5 - p.x, v.y + 0.5 - p.y) < 1.2) { inp.interact = true; idx++; } w.update(DT, inp); continue; } }
    /* follow the solution tile by tile; where the next tile is inside a guard's reach, detour (staying out of it) to the first later tile that is outside */
    const inD = (x, y) => discs.some(c => Math.hypot(x + 0.5 - c.x, y + 0.5 - c.y) < 3.6);
    let tgt;
    if (!inD(nxt[0], nxt[1])) { route = null; tgt = [nxt[0] + 0.5, nxt[1] + 0.5]; }
    else { rt -= DT; if (!route || rt <= 0 || !route.length) { let goal = null; for (let k = idx + 1; k < path.length; k++) { if (!inD(path[k][0], path[k][1]) && !(Math.abs(path[k][0] - path[k - 1][0]) + Math.abs(path[k][1] - path[k - 1][1]) > 1.5)) { goal = [path[k][0], path[k][1]]; break; } } route = goal ? bfsAvoid(w, [p.x, p.y], goal, discs) : null; rt = 1.5; }
      if (route && route.length > 1 && Math.hypot(route[0][0] - p.x, route[0][1] - p.y) < 0.45) route.shift(); tgt = route && route.length ? route[0] : [nxt[0] + 0.5, nxt[1] + 0.5]; }
    const d = ang(p.yaw, Math.atan2(tgt[1] - p.y, tgt[0] - p.x)); inp.dyaw = Math.max(-0.4, Math.min(0.4, d)); if (Math.abs(d) < 0.7) inp.fwd = 1;
    const it = w.interactTarget(); if (it && !used.has(it.obj.id + it.kind)) { const o = it.obj; if (it.kind === 'note' || it.kind === 'valve' || it.kind === 'breaker' || (it.kind === 'generator' && p.inv.fuse >= o.need) || (it.kind === 'door' && o.locked && (o.lock === 'key' || o.lock === 'card' || o.lock === 'code' || o.lock === 'power' || o.lock === 'valve' || o.lock === 'breaker'))) { inp.interact = true; used.add(o.id + it.kind); if (it.kind === 'door' && o.lock === 'code') { w.update(DT, inp); w.enterCode(o.id, o.code); continue; } } }
    if (w.objs.some(o => o.type === 'door' && o.hidden && !o.revealed && Math.hypot(o.x + 0.5 - p.x, o.y + 0.5 - p.y) < 5) && p.pulses > 0) w.pulse();
    w.update(DT, inp);
  }
  return { ok: w.over === 'win', t, noticed, why: w.over || 'timeout', pos: [p.x.toFixed(1), p.y.toFixed(1)], idx, n: path.length, cur: path[idx], hp: p.hp, w };
}
if (process.argv[1] && process.argv[1].endsWith('sneak.mjs')) {
  let n = 0, wins = 0, quiet = 0; LEVELS.forEach((spec, i) => { if (!spec.creatures.includes('sentinel')) return; const gen = generate(spec); let w = 0, nq = 0, why = []; for (const d of [0, 5, 11]) { const r = sneakRun(gen, d, 300); n++; if (r.ok) { w++; wins++; } if (r.noticed === 0) { nq++; quiet++; } else why.push(r.why); } console.log(String(i + 1).padStart(2), spec.name.padEnd(20), w + '/3 won', nq + '/3 never noticed', why.join(',')); });
  console.log('sentinel levels: ' + wins + '/' + n + ' won, ' + quiet + '/' + n + ' never noticed'); process.exit(wins === n ? 0 : 1);
}
