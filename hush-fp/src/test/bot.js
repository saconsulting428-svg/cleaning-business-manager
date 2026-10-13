/* A scripted player: follows the solver's path through the REAL world logic (movement, collision, doors, items, generator, valve, notes, vents, exit). */
import { DT } from '../logic/world.js';
export function runBot(world, maxSeconds) {
  const p = world.player, path = world.gen.solution; let idx = 0, stuck = 0, last = [p.x, p.y], t = 0; const usedOnce = new Set(); maxSeconds = maxSeconds || 600;
  const face = (x, y) => { const want = Math.atan2(y - p.y, x - p.x); let d = want - p.yaw; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return d; };
  while (t < maxSeconds && !world.over) {
    const inp = { fwd: 0, sprint: false }; const next = path[Math.min(idx + 1, path.length - 1)], cx = next[0] + 0.5, cy = next[1] + 0.5;
    const dist = Math.hypot(cx - p.x, cy - p.y);
    if (p.vent) { world.update(DT, inp); t += DT; continue; }
    if (idx < path.length - 1 && dist < 0.3) idx++;
    if (idx >= path.length - 1) { const ex = world.gen.exit; const d = Math.hypot(ex.x + 0.5 - p.x, ex.y + 0.5 - p.y); const dy = face(ex.x + 0.5, ex.y + 0.5); p.yaw += dy; if (d < 1.6) { inp.interact = true; } else { inp.fwd = 1; } world.update(DT, inp); t += DT; continue; }
    const cur = path[idx], jump = Math.abs(next[0] - cur[0]) + Math.abs(next[1] - cur[1]) > 1.5;
    if (jump) { /* a vent: face the neighbouring vent tile and crawl */ const v = world.objs.find(o => o.type === 'vent' && Math.abs(o.x - cur[0]) + Math.abs(o.y - cur[1]) === 1); if (v) { p.yaw += face(v.x + 0.5, v.y + 0.5); if (Math.hypot(v.x + 0.5 - p.x, v.y + 0.5 - p.y) < 1.2) inp.interact = true; else inp.fwd = 1; world.update(DT, inp); t += DT; if (inp.interact) idx++; continue; } }
    const dyaw = face(cx, cy); const turn = Math.max(-0.35, Math.min(0.35, dyaw)); inp.dyaw = turn; if (Math.abs(dyaw) < 0.6) inp.fwd = 1;
    /* locks and things that need USE */
    const tgt = world.interactTarget();
    if (tgt && !usedOnce.has(tgt.obj.id + tgt.kind)) {
      const o = tgt.obj;
      if (tgt.kind === 'note' || tgt.kind === 'valve' || (tgt.kind === 'generator' && p.inv.fuse >= o.need) || (tgt.kind === 'door' && o.locked && (o.lock === 'key' || o.lock === 'card' || o.lock === 'code' || o.lock === 'secret' || o.lock === 'power' || o.lock === 'valve') && (o.lock !== 'key' && o.lock !== 'card' || p.inv[o.lock] > 0 || o.unlockedByItem))) {
        if (tgt.kind === 'door' && o.lock === 'secret' && !o.revealed) world.pulse();
        else { inp.interact = true; usedOnce.add(o.id + tgt.kind); if (tgt.kind === 'door' && o.lock === 'code') { world.update(DT, inp); t += DT; world.enterCode(o.id, o.code); continue; } }
      }
    }
    if (tgt && tgt.kind === 'door' && tgt.obj.locked && tgt.obj.lock === 'secret' && !tgt.obj.revealed) { /* hidden doors are not targetable: pulse near them */ }
    const nd = world.objs.find(o => o.type === 'door' && o.hidden && !o.revealed && Math.hypot(o.x + 0.5 - p.x, o.y + 0.5 - p.y) < 5); if (nd && p.pulses > 0) world.pulse();
    const ns = world.objs.find(o => o.type === 'door' && o.hidden && !o.revealed && Math.hypot(o.x + 0.5 - p.x, o.y + 0.5 - p.y) < 5); void ns;
    world.update(DT, inp); t += DT;
    if (Math.hypot(p.x - last[0], p.y - last[1]) < 0.02) stuck += DT; else { stuck = 0; last = [p.x, p.y]; } if (stuck > 12) return { ok: false, why: 'stuck at ' + p.x.toFixed(1) + ',' + p.y.toFixed(1) + ' idx ' + idx + '/' + path.length, t };
  }
  return { ok: world.over === 'win', why: world.over || 'timeout', t };
}
