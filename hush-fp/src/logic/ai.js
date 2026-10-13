/* Creature AI: roam -> hear -> investigate -> search -> see -> hunt -> attack -> lose track -> search -> roam. Everything is deterministic given the world's random stream. */
import { clamp, angDiff, TAU } from './rng.js';
import { T } from './gen.js';

export const KINDS = {
  stalker: { roam: 1.1, invest: 1.5, hunt: 2.1, hear: 1.0, sight: 8.5, fov: 1.75, turn: 3.5, cycle: 1.15, label: 'stalker' },
  sentinel: { roam: 0, invest: 1.3, hunt: 2.0, hear: 0.85, sight: 11, fov: 0.95, turn: 2.2, cycle: 1.3, label: 'sentinel', leash: 7 },
  listener: { roam: 0.95, invest: 1.6, hunt: 1.95, hear: 1.7, sight: 3.2, fov: 2.4, turn: 3.2, cycle: 1.0, label: 'listener' }
};
const DIRS8 = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
const BLOCK_SIGHT = { crate: 1, shelf: 1, pod: 1, barrel: 1 };

export function makeCreature(world, spec, i) {
  const k = KINDS[spec.t];
  return { id: i, t: spec.t, k, x: spec.x, y: spec.y, yaw: spec.yaw, post: { x: spec.x, y: spec.y, yaw: spec.yaw }, state: 'roam', alert: 0, path: null, pi: 0, timer: 1 + world.rnd() * 2, wait: 0,
    target: null, lastSeen: null, searchT: 0, repath: 0, moving: false, phase: 0, speed: 0, revealT: 0, sweep: world.rnd() * 6, knowsLocker: -1, checking: 0, hunts: 0, seen: false, dead: false, jaw: 0, roar: 0, spawnHunt: !!spec.hunted };
}

/* ---- grid helpers ---- */
export function solidForAI(world, x, y) {
  if (x < 0 || y < 0 || x >= world.W || y >= world.H) return true;
  const i = y * world.W + x; if (world.cells[i] === T.WALL || world.solid.has(i)) return true;
  const d = world.doorAt.get(i); if (d && d.locked) return true;
  return false;
}
export function findPath(world, sx, sy, tx, ty, limit) {
  sx = Math.floor(sx); sy = Math.floor(sy); tx = Math.floor(tx); ty = Math.floor(ty); const W = world.W;
  if (sx === tx && sy === ty) return [[tx + 0.5, ty + 0.5]];
  if (solidForAI(world, tx, ty)) { let best = null; for (const [dx, dy] of DIRS8) if (!solidForAI(world, tx + dx, ty + dy)) { best = [tx + dx, ty + dy]; break; } if (!best) return null; tx = best[0]; ty = best[1]; }
  const open = [[sx, sy]], g = new Map([[sy * W + sx, 0]]), came = new Map(), f = new Map([[sy * W + sx, Math.abs(tx - sx) + Math.abs(ty - sy)]]), closed = new Set(); let n = 0; limit = limit || 3500;
  while (open.length && n++ < limit) {
    let bi = 0; for (let i = 1; i < open.length; i++) if (f.get(open[i][1] * W + open[i][0]) < f.get(open[bi][1] * W + open[bi][0])) bi = i;
    const [x, y] = open.splice(bi, 1)[0], ci = y * W + x; if (x === tx && y === ty) { const p = [[x + 0.5, y + 0.5]]; let c = ci; while (came.has(c)) { c = came.get(c); p.push([(c % W) + 0.5, Math.floor(c / W) + 0.5]); } p.reverse(); p.shift(); return p.length ? p : [[tx + 0.5, ty + 0.5]]; }
    closed.add(ci);
    for (const [dx, dy] of DIRS8) {
      const nx = x + dx, ny = y + dy, ni = ny * W + nx; if (closed.has(ni) || solidForAI(world, nx, ny)) continue;
      if (dx && dy && (solidForAI(world, x + dx, y) || solidForAI(world, x, y + dy))) continue;
      const ng = g.get(ci) + (dx && dy ? 1.41 : 1) + (world.cells[ni] === T.WATER ? 0.3 : 0); if (g.has(ni) && ng >= g.get(ni)) continue;
      came.set(ni, ci); g.set(ni, ng); f.set(ni, ng + Math.abs(tx - nx) + Math.abs(ty - ny)); if (!open.some(o => o[0] === nx && o[1] === ny)) open.push([nx, ny]);
    }
  }
  return null;
}
/* every tile a creature standing at (x,y) can walk to right now (locked doors are walls) */
export function reachFrom(world, x, y) {
  const W = world.W, seen = new Set(), q = [[Math.floor(x), Math.floor(y)]]; seen.add(q[0][1] * W + q[0][0]); let qi = 0;
  while (qi < q.length) { const [cx, cy] = q[qi++]; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = cx + dx, ny = cy + dy, i = ny * W + nx; if (seen.has(i) || solidForAI(world, nx, ny)) continue; seen.add(i); q.push([nx, ny]); } }
  return seen;
}
/* walk-distance field from a point, closed doors cost extra (they muffle sound) */
export function distField(world, x, y, maxR) {
  const W = world.W, out = new Map(), start = Math.floor(y) * W + Math.floor(x); out.set(start, 0); const q = [[Math.floor(x), Math.floor(y)]]; let qi = 0;
  const tmp = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  while (qi < q.length) { const [cx, cy] = q[qi++], cd = out.get(cy * W + cx); for (const [dx, dy] of tmp) { const nx = cx + dx, ny = cy + dy, ni = ny * W + nx; if (nx < 0 || ny < 0 || nx >= W || ny >= world.H || out.has(ni)) continue; if (world.cells[ni] === T.WALL) continue; const solid = world.solid.has(ni) && !world.doorAt.has(ni); if (solid) continue;
    const d = world.doorAt.get(ni); const cost = 1 + (d && d.open < 0.5 ? 4 : 0); const nd = cd + cost; if (nd > maxR) continue; out.set(ni, nd); q.push([nx, ny]); } }
  return out;
}
/* line of sight on the grid: walls, closed doors and tall props block it */
export function lineOfSight(world, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay, d = Math.hypot(dx, dy), steps = Math.ceil(d / 0.2), W = world.W;
  for (let i = 1; i < steps; i++) { const x = Math.floor(ax + dx * i / steps), y = Math.floor(ay + dy * i / steps), idx = y * W + x; if (world.cells[idx] === T.WALL) return false; const dr = world.doorAt.get(idx); if (dr && dr.open < 0.6) return false; if (world.tall.has(idx)) return false; }
  return true;
}

/* ---- perception ---- */
function sightRange(world, c) {
  const p = world.player; if (p.hidden >= 0 || !p.alive) return 0; const hunting = c.state === 'hunt';
  let r = c.k.sight * world.diff.sight * (p.crouch ? 0.45 : 1) * (p.flash ? 1.15 : 0.65) * (p.moving && p.sprint ? 1.2 : 1) * (hunting ? 1.25 : 1);
  if (world.spec.lightsOut) r *= p.flash ? 0.9 : 0.6; return r;
}
export function canSee(world, c) {
  const p = world.player, dx = p.x - c.x, dy = p.y - c.y, d = Math.hypot(dx, dy), r = sightRange(world, c); if (d > r || d < 1e-4) return d < 0.9 && r > 0;
  const fov = c.state === 'hunt' ? 6.28 : c.k.fov; if (Math.abs(angDiff(c.yaw, Math.atan2(dy, dx))) > fov / 2) return false;
  return lineOfSight(world, c.x, c.y, p.x, p.y);
}
/* a sound at (x,y) with a reach in tiles: every creature compares it with its own hearing along the walkable distance */
export function emitNoise(world, x, y, radius, kind, except) {
  world.noiseLevel = Math.max(world.noiseLevel, clamp(radius / 14, 0, 1)); world.events.push({ type: 'noise', x, y, radius, kind });
  if (!world.creatures.length) return;
  const field = distField(world, x, y, radius * 1.8);
  for (const c of world.creatures) { if (c.dead || c === except) continue; const d = field.get(Math.floor(c.y) * world.W + Math.floor(c.x)); if (d === undefined) continue; if (d <= radius * c.k.hear) hear(world, c, x, y, d, radius, kind); }
}
function hear(world, c, x, y, d, radius, kind) {
  if (c.state === 'hunt') { c.lastSeen = { x, y }; return; }
  const loud = clamp(1 - d / (radius * c.k.hear), 0, 1);
  if (c.k.leash && Math.hypot(x - c.post.x, y - c.post.y) > c.k.leash && kind !== 'pulse') return;
  if (c.state === 'investigate' && c.target && Math.hypot(c.target.x - c.x, c.target.y - c.y) < Math.hypot(x - c.x, y - c.y) && loud < 0.5) return;
  c.state = 'investigate'; c.target = { x, y }; c.path = null; c.alert = Math.max(c.alert, 0.3 + 0.2 * loud); c.wait = 0;
  world.events.push({ type: 'heard', id: c.id, x: c.x, y: c.y });
}

/* ---- movement along a path ---- */
function follow(world, c, dt, speed) {
  if (!c.path || c.pi >= c.path.length) { c.moving = false; return true; }
  let move = speed * dt;
  while (move > 1e-6 && c.pi < c.path.length) {
    const [px, py] = c.path[c.pi], dx = px - c.x, dy = py - c.y, d = Math.hypot(dx, dy);
    /* closed door ahead: open it (loud) */
    const ahead = world.doorAt.get(Math.floor(py) * world.W + Math.floor(px)); if (ahead && ahead.open < 0.5 && !ahead.locked && d < 1.4) { world.openDoor(ahead, true, c); }
    if (ahead && ahead.open < 0.6 && d < 0.9) { c.moving = false; return false; }
    const want = Math.atan2(dy, dx); c.yaw += clamp(angDiff(c.yaw, want), -c.k.turn * (c.state === 'hunt' ? 2 : 1) * dt, c.k.turn * (c.state === 'hunt' ? 2 : 1) * dt);
    if (Math.abs(angDiff(c.yaw, want)) > 1.6) { c.moving = false; return false; }              // turn first, then walk
    if (d <= move) { c.x = px; c.y = py; c.pi++; move -= d; } else { c.x += dx / d * move; c.y += dy / d * move; move = 0; }
  }
  c.moving = true; return c.pi >= c.path.length;
}
function goTo(world, c, tx, ty, dt, speed, repathEvery) {
  c.repath -= dt; if (!c.path || c.repath <= 0 || !c.pathGoal || Math.abs(c.pathGoal[0] - tx) > 0.6 || Math.abs(c.pathGoal[1] - ty) > 0.6) {
    c.path = findPath(world, c.x, c.y, tx, ty); c.pi = 0; c.pathGoal = [tx, ty]; c.repath = repathEvery || 0.6; if (c.path && c.path.length > 1) { const [fx, fy] = c.path[0]; if (Math.hypot(fx - c.x, fy - c.y) < 0.2) c.pi = 1; }
  }
  if (!c.path) { c.moving = false; return true; }
  return follow(world, c, dt, speed);
}

export function updateCreature(world, c, dt) {
  if (c.dead) return; const p = world.player, k = c.k, rnd = world.rnd;
  const seen = canSee(world, c), dxp = p.x - c.x, dyp = p.y - c.y, dist = Math.hypot(dxp, dyp);
  c.seen = seen; c.revealT = Math.max(0, c.revealT - dt); c.roar = Math.max(0, c.roar - dt);
  const prevX = c.x, prevY = c.y;
  /* awareness */
  if (seen && c.state !== 'attack') {
    const r = sightRange(world, c); c.alert += dt * (0.4 + 1.05 * clamp(1 - dist / r, 0, 1)) * (world.diff.alert) * (c.state === 'hunt' ? 3 : 1);
    c.lastSeen = { x: p.x, y: p.y };
    if (c.alert >= 1 && c.state !== 'hunt') { startHunt(world, c); }
    else if (c.alert > 0.35 && c.state !== 'hunt' && c.state !== 'suspicious') { if (c.state !== 'investigate') { c.state = 'suspicious'; c.wait = 0; world.events.push({ type: 'suspicious', id: c.id }); } }
  } else c.alert = Math.max(0, c.alert - dt * (c.state === 'hunt' ? 0.15 : 0.35));
  if (c.spawnHunt && !c.huntStarted) { c.huntStarted = true; c.alert = 1; startHunt(world, c); c.lastSeen = { x: p.x, y: p.y }; }

  switch (c.state) {
    case 'roam': {
      if (k.roam === 0) { // sentinel: hold the post, sweep the gaze
        const d = Math.hypot(c.post.x - c.x, c.post.y - c.y);
        if (d > 0.3) goTo(world, c, c.post.x, c.post.y, dt, k.invest, 1); else { c.moving = false; c.sweep += dt * 0.5; const target = c.post.yaw + Math.sin(c.sweep) * 1.1; c.yaw += clamp(angDiff(c.yaw, target), -k.turn * dt, k.turn * dt); }
        break;
      }
      if (c.wait > 0) { c.wait -= dt; c.moving = false; c.yaw += Math.sin(world.time * 0.9 + c.id * 3) * dt * 0.8; break; }
      if (!c.target) { const r = world.pickRoamRoom(c); c.target = { x: r.cx + 0.5 + (rnd() - 0.5) * (r.w - 2), y: r.cy + 0.5 + (rnd() - 0.5) * (r.h - 2) }; }
      const arrived = goTo(world, c, c.target.x, c.target.y, dt, k.roam, 0.9); if (arrived || (!c.path && c.timer-- < 0)) { c.target = null; c.wait = 1.5 + rnd() * 2.5; c.path = null; }
      break;
    }
    case 'suspicious': { // it has noticed something: it stops, turns toward it, and creeps closer
      c.moving = false; if (c.lastSeen) { const want = Math.atan2(c.lastSeen.y - c.y, c.lastSeen.x - c.x); c.yaw += clamp(angDiff(c.yaw, want), -k.turn * dt, k.turn * dt); }
      c.wait += dt; if (c.alert < 0.2 || c.wait > 3.5) { if (c.lastSeen && c.alert >= 0.2) { c.state = 'investigate'; c.target = { x: c.lastSeen.x, y: c.lastSeen.y }; c.path = null; } else { c.state = 'roam'; c.target = null; c.wait = 0.5; } }
      break;
    }
    case 'investigate': {
      if (!c.target) { c.state = 'roam'; break; }
      const arrived = goTo(world, c, c.target.x, c.target.y, dt, k.invest, 0.7);
      if (arrived || (!c.path)) { c.state = 'search'; c.searchT = 6 + rnd() * 3; c.path = null; c.wait = 0; c.searchOrigin = { x: c.target.x, y: c.target.y }; c.target = null; }
      break;
    }
    case 'search': {
      c.searchT -= dt;
      if (c.wait > 0) { c.wait -= dt; c.moving = false; c.yaw += Math.sin(world.time * 2.1 + c.id) * dt * 1.4; }
      else { if (!c.target) { const o = c.searchOrigin || c, a = rnd() * TAU, r = 2 + rnd() * 3; c.target = { x: o.x + Math.cos(a) * r, y: o.y + Math.sin(a) * r }; c.path = null; if (c.knowsLocker >= 0 && !c.lockerDone) { const L = world.objById.get(c.knowsLocker); if (L) { c.target = { x: L.x + 0.5 + Math.cos(L.face) * 0.9, y: L.y + 0.5 + Math.sin(L.face) * 0.9 }; c.checkLocker = L; } } }
        const arrived = goTo(world, c, c.target.x, c.target.y, dt, k.invest * 0.85, 0.8); if (arrived || !c.path) { if (c.checkLocker) { c.checking = 1.6; c.state = 'check'; } else { c.target = null; c.wait = 0.8 + rnd(); } } }
      if (c.searchT <= 0 && c.state === 'search') {
        /* before giving up, one look into a close locker when it was hunting a moment ago */
        if (c.hunts && c.hunted !== 'checked') { const L = world.nearestLocker(c.x, c.y, 4.5); c.hunted = 'checked'; if (L && rnd() < 0.5) { c.checkLocker = L; c.target = { x: L.x + 0.5 + Math.cos(L.face) * 0.9, y: L.y + 0.5 + Math.sin(L.face) * 0.9 }; c.searchT = 4; break; } }
        c.state = 'roam'; c.target = null; c.wait = 1; c.hunted = null; c.knowsLocker = -1; c.lockerDone = false; c.checkLocker = null; world.events.push({ type: 'lost', id: c.id });
      }
      break;
    }
    case 'check': { // it opens the locker it has been staring at
      c.moving = false; const L = c.checkLocker; if (L) { const want = Math.atan2(L.y + 0.5 - c.y, L.x + 0.5 - c.x); c.yaw += clamp(angDiff(c.yaw, want), -6 * dt, 6 * dt); }
      c.checking -= dt; if (c.checking <= 0) { if (L && p.hidden === L.id) { world.catchPlayer(c); } else { c.state = 'search'; c.searchT = 3; c.checkLocker = null; c.lockerDone = true; c.knowsLocker = -1; c.target = null; } }
      break;
    }
    case 'hunt': {
      c.hunts += 0; const gx = seen ? p.x : c.lastSeen ? c.lastSeen.x : c.x, gy = seen ? p.y : c.lastSeen ? c.lastSeen.y : c.y;
      if (seen) c.lostT = 0; else c.lostT = (c.lostT || 0) + dt;
      if (p.hidden >= 0 && !seen && c.knowsLocker >= 0) { c.lastSeen = null; }
      const near = Math.hypot(gx - c.x, gy - c.y);
      if (seen && dist < 0.85 && p.alive) { world.catchPlayer(c); break; }
      if (near > 0.5) goTo(world, c, gx, gy, dt, k.hunt * world.diff.speed, 0.25); else { c.moving = false; if (!seen) { c.state = c.knowsLocker >= 0 ? 'search' : 'search'; c.searchT = 7; c.searchOrigin = { x: c.x, y: c.y }; c.target = null; c.path = null; if (c.knowsLocker >= 0) { const L = world.objById.get(c.knowsLocker); if (L) { c.checkLocker = L; c.target = { x: L.x + 0.5 + Math.cos(L.face) * 0.9, y: L.y + 0.5 + Math.sin(L.face) * 0.9 }; } } } }
      if (c.lostT > 4.2) { c.state = 'search'; c.searchT = 7; c.searchOrigin = c.lastSeen ? { x: c.lastSeen.x, y: c.lastSeen.y } : { x: c.x, y: c.y }; c.target = null; c.path = null; }
      break;
    }
  }
  /* gait: phase advances with the distance walked, so feet and footstep sounds stay in step */
  const dm = Math.hypot(c.x - prevX, c.y - prevY); const before = c.phase; c.phase += dm / k.cycle; c.speed = dm / Math.max(dt, 1e-4);
  if (Math.floor(c.phase * 2) !== Math.floor(before * 2) && dm > 0) world.events.push({ type: 'cstep', id: c.id, x: c.x, y: c.y, hunt: c.state === 'hunt' });
  if (c.state === 'hunt' && c.hunts) c.jaw = 1; else c.jaw = Math.max(0, c.jaw - dt * 2);
  /* creatures grow louder when moving fast: its footsteps are noise too, but only for other creatures and the HUD, not an infinite loop */
}
export function startHunt(world, c) {
  c.state = 'hunt'; c.hunts++; c.alert = 1; c.path = null; c.roar = 1.6; c.lostT = 0; c.lastSeen = { x: world.player.x, y: world.player.y }; c.target = null; c.checkLocker = null;
  world.huntCount++; world.events.push({ type: 'hunt', id: c.id, x: c.x, y: c.y });
  /* anyone near joins the chase: the roar carries */
  for (const o of world.creatures) if (o !== c && !o.dead && o.state !== 'hunt' && Math.hypot(o.x - c.x, o.y - c.y) < 8 && o.k.sight > 5) { o.state = 'investigate'; o.target = { x: c.x, y: c.y }; o.path = null; o.alert = 0.4; }
}
