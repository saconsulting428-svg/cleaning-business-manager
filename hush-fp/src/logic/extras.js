/* Runtime for the v9 additions: player health and healing, timed environmental hazards, the small secondary creatures and the set-pieces.
   The main creatures (ai.js) are not touched. Everything here talks to the rest of the game through the same event list and noise system:
   a bite is noise, so the main creature comes to investigate; a hazard that hurts you is also a sound. The main creature still kills in one catch (World.catchPlayer),
   health only covers the small stuff. */
import { emitNoise, findPath, lineOfSight, startHunt } from './ai.js';
import { initBeat, updateBeat } from './beats.js';

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const HP_MAX = 100;
export const HEAL = { medkit: 30, bandage: 15 };

/* ---------- health ---------- */
export function damagePlayer(w, amt, src, x, y) {
  const p = w.player; if (!p.alive || w.over || w.god || p.hidden >= 0 || p.vent) return false;
  if (w.time - p.hurtAt < 0.6) return false;                                  // a short grace so two hits never land in the same blink
  p.hp = Math.max(0, p.hp - amt); p.hurtAt = w.time; p.stagger = 0.6; p.vx *= 0.25; p.vy *= 0.25;
  w.events.push({ type: 'hurt', amt, src, hp: p.hp, x, y });
  if (p.hp <= 0) { p.alive = false; w.over = 'dead'; w.events.push({ type: 'dead', cause: src }); }
  return true;
}
export function healPlayer(w, kind) { const p = w.player, a = HEAL[kind] || 0; if (p.hp >= HP_MAX) return false; p.hp = Math.min(HP_MAX, p.hp + a); w.events.push({ type: 'heal', kind, hp: p.hp }); return true; }

/* ---------- setup ---------- */
export function initExtras(w) {
  const g = w.gen, p = w.player; p.hp = HP_MAX; p.hurtAt = -9; p.stagger = 0;
  w.hazards = w.objs.filter(o => o.type === 'hazard'); w.debrisAt = new Set(w.objs.filter(o => o.type === 'debris').map(o => o.y * w.W + o.x));
  w.inSteam = false; w.pickups = w.objs.filter(o => o.type === 'pickup'); for (const o of w.pickups) { o.taken = false; o.warnT = 0; }
  w.crawlers = (g.crawlers || []).map((c, i) => ({ id: i, kind: c.kind, x: c.x, y: c.y, px: c.x, py: c.y, yaw: w.rnd() * 6.28, state: 'lurk', t: 0.3, bites: 0, cd: 0, path: null, pi: 0, repath: 0, home: { x: c.x, y: c.y }, ceil: c.kind === 'dropper', moving: false, speed: 0, chaseT: 0, fleeT: 0, skitT: 0, drop: 0, wakeT: 0 }));
  initBeat(w); w.sp = g.setpiece ? { kind: g.setpiece, done: false, t: 0, tries: 0 } : null;
}

/* ---------- per tick ---------- */
export function updateExtras(w, dt) {
  const p = w.player;
  p.stagger = Math.max(0, p.stagger - dt);
  hazards(w, dt); pickups(w, dt); for (const c of w.crawlers) crawler(w, c, dt); setpiece(w, dt); updateBeat(w, dt);
}

function hazards(w, dt) {
  const p = w.player, live = p.alive && p.hidden < 0 && !p.vent; let steam = false;
  for (const h of w.hazards) {
    const ph = (w.time + h.ph) % h.period, d = Math.hypot(h.x + 0.5 - p.x, h.y + 0.5 - p.y);
    if (h.kind === 'spark') {
      h.warn = ph > h.period - 2.0 && ph <= h.period - 1.1; const on = ph > h.period - 1.1;
      if (on && !h.on) w.events.push({ type: 'spark', x: h.x + 0.5, y: h.y + 0.5 }); h.on = on;
      if (on && live && d < 0.8 && damagePlayer(w, 12, 'spark', h.x + 0.5, h.y + 0.5)) emitNoise(w, p.x, p.y, 7, 'zap');
    } else if (h.kind === 'steam') {
      const on = ph < 3.6; if (on && !h.on) w.events.push({ type: 'steam', x: h.x + 0.5, y: h.y + 0.5 }); h.on = on; if (on && live && d < 2.0) steam = true;
    } else if (h.kind === 'leak') {
      h.t = (h.t === undefined ? ph : h.t) - dt; if (h.t <= 0) { h.t = h.period; w.events.push({ type: 'drip', x: h.x + 0.5, y: h.y + 0.5 }); }
    }
  }
  w.inSteam = steam;
}

function pickups(w, dt) {
  const p = w.player; if (!p.alive || p.hidden >= 0 || p.vent) return;
  for (const o of w.pickups) {
    if (o.taken) continue; o.warnT = Math.max(0, o.warnT - dt); if (Math.hypot(o.x + 0.5 - p.x, o.y + 0.5 - p.y) > 0.9) continue;
    if (healPlayer(w, o.kind)) { o.taken = true; w.events.push({ type: 'pickup', kind: o.kind, x: o.x + 0.5, y: o.y + 0.5 }); }
    else if (o.warnT <= 0) { o.warnT = 6; w.events.push({ type: 'hpfull', kind: o.kind }); }     // full health: it stays here for later
  }
}

/* ---------- small creatures: ambush crawlers and ceiling droppers ----------
   They are fast but small: they cannot open doors (close one behind you and they stop), they give up after a short chase or two bites, and they never hurt you in a locker or a vent.
   Their bites are noise: the main creature hears them. */
function crawlTo(w, c, tx, ty, speed, dt) {
  c.repath -= dt; if (!c.path || c.repath <= 0) { c.path = findPath(w, c.x, c.y, tx, ty, 1800); c.pi = 0; c.repath = 0.35; }
  if (!c.path) { c.moving = false; return false; }
  let move = speed * dt;
  while (move > 0 && c.pi < c.path.length) {
    const [px, py] = c.path[c.pi], dx = px - c.x, dy = py - c.y, d = Math.hypot(dx, dy), door = w.doorAt.get(Math.floor(py) * w.W + Math.floor(px));
    if (door && door.open < 0.6) { c.moving = false; c.blockedT = (c.blockedT || 0) + dt; return false; }
    c.blockedT = 0; if (d > 1e-4) c.yaw = Math.atan2(dy, dx);
    if (d <= move) { c.x = px; c.y = py; c.pi++; move -= d; } else { c.x += dx / d * move; c.y += dy / d * move; move = 0; }
  }
  c.moving = true; return c.pi >= c.path.length;
}
function farRoomPoint(w, from) {
  const cand = w.rooms.filter(r => Math.hypot(r.cx - from.x, r.cy - from.y) > 12 && Math.hypot(r.cx - w.player.x, r.cy - w.player.y) > 10);
  const r = (cand.length ? cand : w.rooms)[Math.floor(w.rnd() * (cand.length || w.rooms.length))]; return { x: r.x0 + 1 + Math.floor(w.rnd() * Math.max(1, r.w - 2)) + 0.5, y: r.y0 + 1 + Math.floor(w.rnd() * Math.max(1, r.h - 2)) + 0.5 };
}
function crawler(w, c, dt) {
  const p = w.player; c.px = c.x; c.py = c.y; c.cd -= dt; c.drop = Math.max(0, c.drop - dt); c.wakeT = Math.max(0, c.wakeT - dt);
  const dx = p.x - c.x, dy = p.y - c.y, d = Math.hypot(dx, dy), vis = p.alive && p.hidden < 0 && !p.vent;
  const bite = () => { if (c.cd <= 0 && damagePlayer(w, c.kind === 'dropper' && c.bites === 0 ? 10 : 8, 'crawler', c.x, c.y)) { c.bites++; c.cd = 1.1; emitNoise(w, p.x, p.y, 9, 'crawl'); w.events.push({ type: 'cbite', x: c.x, y: c.y }); } };
  const wake = () => { c.state = 'chase'; c.chaseT = 0; c.bites = 0; c.wakeT = 0.5; w.events.push({ type: 'cwake', x: c.x, y: c.y, ceil: c.ceil }); if (c.ceil) { c.ceil = false; c.drop = 0.5; } c.path = null; };
  switch (c.state) {
    case 'lurk': {
      c.moving = false; c.t -= dt; if (c.t > 0 || !vis) break; c.t = 0.3;
      const r = c.ceil ? 1.5 : p.sprint ? 8 : p.crouch ? 2.2 : p.moving ? 4.8 : 2.6;
      if (d < r && (c.ceil || lineOfSight(w, c.x, c.y, p.x, p.y) || (() => { const pa = findPath(w, c.x, c.y, p.x, p.y, 900); return !!pa && pa.length < r * 1.7; })())) wake();
      break;
    }
    case 'chase': {
      c.chaseT += dt; if (!vis) { c.state = 'wait'; c.t = 3; c.moving = false; break; }
      if (c.wakeT > 0) { c.moving = false; if (d < 1.6 && c.drop > 0) bite(); break; }       // a beat to rear up (or to drop from the ceiling)
      if (d < 0.8) { c.moving = false; c.yaw = Math.atan2(dy, dx); bite(); } else crawlTo(w, c, p.x, p.y, 3.0, dt);
      if (c.blockedT > 1.2) { c.state = 'wait'; c.t = 2.5; }                                // stuck behind a closed door
      if (c.bites >= 2 || c.chaseT > 8) { c.state = 'flee'; c.fleeT = 0; c.target = farRoomPoint(w, c); c.path = null; }
      break;
    }
    case 'wait': {
      c.moving = false; c.t -= dt; if (vis && d < 3.2 && c.blockedT < 1) { c.state = 'chase'; c.chaseT = 0; break; }
      if (c.t <= 0) { c.state = 'flee'; c.fleeT = 0; c.target = farRoomPoint(w, c); c.path = null; }
      break;
    }
    case 'flee': {
      c.fleeT += dt; const arrived = c.target ? crawlTo(w, c, c.target.x, c.target.y, 2.6, dt) : true;
      if (arrived || c.fleeT > 9) { c.state = 'lurk'; c.t = 6; c.moving = false; c.bites = 0; c.home = { x: c.x, y: c.y }; }
      break;
    }
  }
  c.speed = c.moving ? (c.state === 'flee' ? 2.6 : 3.0) : 0;
  if (c.moving) { c.skitT -= dt; if (c.skitT <= 0) { c.skitT = 0.24; if (d < 18) w.events.push({ type: 'cskit', x: c.x, y: c.y }); } }
}

/* ---------- set-pieces ---------- */
const roomIdxAt = (w, x, y) => { x = Math.floor(x); y = Math.floor(y); const r = w.rooms.find(q => x >= q.x0 && x < q.x0 + q.w && y >= q.y0 && y < q.y0 + q.h); return r ? r.idx : -1; };
function farRoom(w, kinds) {
  const p = w.player, c = w.rooms.filter(r => r.idx >= 1 && Math.hypot(r.cx - p.x, r.cy - p.y) > 12), pref = c.filter(r => kinds && kinds.includes(r.kind)), l = pref.length ? pref : c.length ? c : w.rooms;
  const r = l[Math.floor(w.rnd() * l.length)]; return { x: r.cx + 0.5, y: r.cy + 0.5, kind: r.kind };
}
function setpiece(w, dt) {
  const s = w.sp; if (!s || s.done) return; const p = w.player; if (!p.alive || w.over) return; s.t += dt;
  const calm = !w.creatures.some(c => c.state === 'hunt') && p.hidden < 0 && !p.vent, room = roomIdxAt(w, p.x, p.y), done = () => { s.done = true; };
  switch (s.kind) {
    case 'outage': if (s.t > 28 && room >= 2 && calm) { const f = farRoom(w); w.events.push({ type: 'sp', what: 'outage', dur: 9 }); emitNoise(w, f.x, f.y, 18, 'impact'); w.events.push({ type: 'impact', x: f.x, y: f.y }); done(); } break;
    case 'impact': if (s.t > 26 && room >= 1 && calm) { const f = farRoom(w); emitNoise(w, f.x, f.y, 22, 'impact'); w.events.push({ type: 'impact', x: f.x, y: f.y }); done(); } break;
    case 'machine': if (s.t > 25 && room >= 2 && calm) { const f = farRoom(w, ['machine', 'pump', 'generator', 'maintenance']); emitNoise(w, f.x, f.y, 18, 'machine'); w.events.push({ type: 'machine', x: f.x, y: f.y }); w.events.push({ type: 'sp', what: 'flicker', dur: 3.5 }); done(); } break;
    case 'surge': { const near = w.creatures.some(c => c.state !== 'hunt' && Math.hypot(c.x - p.x, c.y - p.y) < 12); if (s.t > 22 && room >= 1 && near && calm) { w.events.push({ type: 'sp', what: 'flicker', dur: 6 }); w.events.push({ type: 'sp', what: 'surge' }); done(); } break; }
    case 'sighting': if (s.t > 20 && room >= 2 && calm) {
      s.tries++; const yaw = p.yaw; let spot = null;
      for (let d = 15; d >= 8 && !spot; d -= 1) for (const da of [0, 0.12, -0.12, 0.25, -0.25]) { const x = p.x + Math.cos(yaw + da) * d, y = p.y + Math.sin(yaw + da) * d, k = Math.floor(y) * w.W + Math.floor(x); if (w.cells[k] !== 0 && !w.solid.has(k) && lineOfSight(w, p.x, p.y, x, y)) { spot = { x, y }; break; } }
      if (spot) { w.events.push({ type: 'sighting', x: spot.x, y: spot.y }); w.events.push({ type: 'sp', what: 'flicker', dur: 1.4 }); done(); } else if (s.tries > 400) done();
    } break;
    case 'cell': { const kind = room >= 0 ? w.rooms[room].kind : null; if (room >= 1 && (kind === 'cells' || kind === 'hive' || room === w.rooms.length - 2) && calm) { w.events.push({ type: 'sp', what: 'outage', dur: 3.2 }); w.events.push({ type: 'impact', x: p.x, y: p.y }); for (const c of w.crawlers) if (c.state === 'lurk') { c.t = 0; c.ceil = false; c.state = 'chase'; c.chaseT = 0; c.wakeT = 0.5; w.events.push({ type: 'cwake', x: c.x, y: c.y, ceil: false }); } done(); } break; }
    case 'genroom': if (w.gens.some(g => g.on)) { const g = w.gens.find(q => q.on); w.events.push({ type: 'sp', what: 'outage', dur: 4.5 }); w.events.push({ type: 'sp', what: 'surge' }); emitNoise(w, g.x + 0.5, g.y + 0.5, 24, 'generator'); done(); } break;
    case 'chase': if (s.t > 30 && room >= 2 && w.player.inv.card + w.player.inv.key + w.player.inv.fuse > 0 && calm) { const c = w.creatures[0]; if (c && c.state !== 'hunt') { c.state = 'roam'; startHunt(w, c); c.lostT = 2.6; w.events.push({ type: 'sp', what: 'chase' }); } done(); } break;
  }
}
