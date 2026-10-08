// Pure game simulation (no DOM): deterministic, cloneable state, driven by a fixed time step.
import { CFG } from '../config.js';
import { K, bfs, buildContext, doorOpen, pathTo, tileKind } from './grid.js';
import { makeGuard, resetGuardNear, updateGuard } from '../ai/guard.js';
import { makeCamera, updateCamera } from '../entities/camera.js';
import { laserHits, makeLaser } from '../entities/laser.js';

export function createLevel(def, world) {
  const ctx = buildContext(def, world);
  ctx.lasers = (def.lasers || []).map(makeLaser);
  return ctx;
}

export function createState(ctx) {
  const d = ctx.def.difficulty || 1;
  return {
    time: 0, status: 'playing', events: [],
    player: { x: ctx.start.x + 0.5, y: ctx.start.y + 0.5, path: [], face: Math.PI / 2, hidden: false, moving: false, target: null },
    keys: 0, taken: ctx.items.map(() => false), doorOpen: ctx.doors.map(() => false),
    guards: (ctx.def.guards || []).map((g, i) => makeGuard(g, i, d)),
    cameras: (ctx.def.cameras || []).map((c, i) => makeCamera(c, i)),
    alarm: { t: 0, x: 0, y: 0, id: 0 }, laserCool: 0,
    spotted: false, alarmed: false, invuln: 0, danger: 0, tension: 0, caughtBy: -1,
  };
}

export const cloneState = (s) => structuredClone(s);

function emit(state, type, data = {}) { state.events.push({ type, ...data }); }

function triggerAlarm(state, x, y, source) {
  state.alarm.t = CFG.alarm.duration;
  state.alarm.x = x; state.alarm.y = y; state.alarm.id++;
  state.alarmed = true; state.spotted = true;
  emit(state, 'alarm', { source });
}

function makeHooks(state) {
  return {
    emit: (type, data) => emit(state, type, data),
    alarm: (x, y, source) => triggerAlarm(state, x, y, source),
    caught: (g) => {
      if (state.status !== 'playing') return;
      state.status = 'caught'; state.caughtBy = g.id;
      emit(state, 'caught', { id: g.id });
    },
  };
}

/** Tap-to-move: route the thief to (tx,ty), snapping blocked taps to the nearest reachable tile. */
export function commandMove(ctx, state, tx, ty) {
  if (state.status !== 'playing') return false;
  const p = state.player;
  const sx = Math.min(ctx.w - 1, Math.max(0, Math.round(p.x - 0.5)));
  const sy = Math.min(ctx.h - 1, Math.max(0, Math.round(p.y - 0.5)));
  const toExit = tx === ctx.exit.x && ty === ctx.exit.y;
  const res = bfs(ctx, state, sx, sy, state.keys > 0, !toExit); // never cross the exit by accident
  let gx = tx, gy = ty;
  if (tx < 0 || ty < 0 || tx >= ctx.w || ty >= ctx.h || res.dist[ty * ctx.w + tx] < 0) {
    let best = null, bd = 99;
    for (let y = ty - 2; y <= ty + 2; y++) for (let x = tx - 2; x <= tx + 2; x++) {
      if (x < 0 || y < 0 || x >= ctx.w || y >= ctx.h || res.dist[y * ctx.w + x] < 0) continue;
      const d = Math.hypot(x - tx, y - ty);
      if (d < bd) { bd = d; best = { x, y }; }
    }
    if (!best) return false;
    gx = best.x; gy = best.y;
  }
  const path = pathTo(ctx, res, gx, gy) || [];
  // if mid-tile, finish centring on the nearest tile first (never a long backwards slide)
  if (Math.hypot(p.x - (sx + 0.5), p.y - (sy + 0.5)) > 0.05) path.unshift({ x: sx, y: sy });
  p.path = path;
  p.target = { x: gx, y: gy };
  return true;
}

function updatePlayer(ctx, state, dt, hooks) {
  const p = state.player;
  let budget = CFG.playerSpeed * dt;
  p.moving = false;
  while (budget > 1e-6 && p.path.length) {
    const n = p.path[0];
    if (tileKind(ctx, n.x, n.y) === K.DOOR && !doorOpen(ctx, state, n.x, n.y)) {
      if (state.keys > 0) {
        state.keys--; state.doorOpen[ctx.doorAt.get(n.y * ctx.w + n.x)] = true;
        emit(state, 'door', { x: n.x, y: n.y });
      } else { p.path = []; p.target = null; emit(state, 'locked'); break; }
    }
    const dx = n.x + 0.5 - p.x;
    const dy = n.y + 0.5 - p.y;
    const d = Math.hypot(dx, dy);
    if (d > 1e-6) p.face = Math.atan2(dy, dx);
    p.moving = true;
    if (d <= budget) {
      p.x = n.x + 0.5; p.y = n.y + 0.5; budget -= d; p.path.shift();
      if (tileKind(ctx, n.x, n.y) === K.ALARM) hooks.alarm(p.x, p.y, 'zone');
    } else { p.x += (dx / d) * budget; p.y += (dy / d) * budget; budget = 0; }
    pickup(ctx, state);
  }
  if (!p.path.length) p.target = null;
  pickup(ctx, state);
  p.hidden = tileKind(ctx, Math.floor(p.x), Math.floor(p.y)) === K.HIDE;
  if (tileKind(ctx, Math.floor(p.x), Math.floor(p.y)) === K.EXIT && Math.hypot(p.x - ctx.exit.x - 0.5, p.y - ctx.exit.y - 0.5) < 0.35) {
    state.status = 'won';
    emit(state, 'win');
  }
}

function pickup(ctx, state) {
  const p = state.player;
  ctx.items.forEach((it, i) => {
    if (state.taken[i] || Math.hypot(p.x - it.x - 0.5, p.y - it.y - 0.5) > CFG.pickupRadius) return;
    state.taken[i] = true;
    if (it.type === 'key') state.keys++;
    emit(state, it.type, { x: it.x, y: it.y });
  });
}

export function stepSim(ctx, state, dt = CFG.fixedStep) {
  if (state.status !== 'playing') return;
  const hooks = makeHooks(state);
  state.time += dt;
  state.invuln = Math.max(0, state.invuln - dt);
  state.alarm.t = Math.max(0, state.alarm.t - dt);
  state.laserCool = Math.max(0, state.laserCool - dt);
  updatePlayer(ctx, state, dt, hooks);
  if (state.status !== 'playing') return;
  if (state.laserCool <= 0 && ctx.lasers.some((l) => laserHits(l, state.time, state.player.x, state.player.y))) {
    state.laserCool = CFG.alarm.laserCooldown;
    emit(state, 'laser');
    triggerAlarm(state, state.player.x, state.player.y, 'laser');
  }
  for (const g of state.guards) { updateGuard(ctx, state, g, dt, hooks); if (state.status !== 'playing') return; }
  for (const c of state.cameras) updateCamera(ctx, state, c, dt, hooks);
  state.danger = Math.max(0, ...state.guards.map((g) => g.meter), ...state.cameras.map((c) => c.meter));
  state.tension = Math.max(0, ...state.guards.map((g) => g.near));
}

export function lootStats(ctx, state) {
  let total = 0, got = 0;
  ctx.items.forEach((it, i) => { if (it.type !== 'key') { total++; if (state.taken[i]) got++; } });
  return { total, got };
}

/** Stars + coins for a finished run. */
export function computeResult(ctx, state) {
  let normal = 0, rare = 0;
  ctx.items.forEach((it, i) => { if (state.taken[i]) { if (it.type === 'loot') normal++; else if (it.type === 'rare') rare++; } });
  const { total, got } = lootStats(ctx, state);
  const minLoot = ctx.def.minLoot ?? Math.ceil(total * CFG.minLootFraction);
  const perfect = got === total && !state.spotted && !state.alarmed;
  const stars = perfect ? 3 : got >= minLoot && total > 0 ? 2 : 1;
  const lootCoins = normal * CFG.coins.loot + rare * CFG.coins.rare;
  const bonus = perfect ? CFG.coins.perfect : 0;
  return { stars, perfect, loot: got, totalLoot: total, minLoot, lootCoins, bonus, coins: lootCoins + bonus, time: state.time };
}

export function currentCoins(ctx, state) {
  let c = 0;
  ctx.items.forEach((it, i) => { if (state.taken[i]) c += it.type === 'loot' ? CFG.coins.loot : it.type === 'rare' ? CFG.coins.rare : 0; });
  return c;
}

/** Rewarded "continue" after being caught. */
export function continueAfterCaught(ctx, state) {
  state.status = 'playing';
  state.invuln = CFG.continueInvuln;
  state.alarm.t = 0;
  state.caughtBy = -1;
  state.danger = 0; state.tension = 0;
  state.cameras.forEach((c) => { c.meter = 0; });
  state.guards.forEach((g) => resetGuardNear(g, state.player.x, state.player.y, 3.5));
}
