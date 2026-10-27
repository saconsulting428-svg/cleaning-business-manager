// Level generator + validator for Snake Fruit Rush campaign (20x26 board).
import { createRequire } from 'module';
import fs from 'fs';
const require = createRequire(import.meta.url);
const E = require('./camp-engine.js');
const COLS = 20, ROWS = 26;
const idx = (x, y) => y * COLS + x;
const X = (c) => c % COLS, Y = (c) => (c / COLS) | 0;
const DIRV = [[0, -1], [1, 0], [0, 1], [-1, 0]];       // 0 up 1 right 2 down 3 left
const DNAME = ['up', 'right', 'down', 'left'];

function rngOf(seed) {
  let a = seed >>> 0;
  const f = () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  f.int = (lo, hi) => lo + Math.floor(f() * (hi - lo + 1));
  f.pick = (arr) => arr[Math.floor(f() * arr.length)];
  f.shuffle = (arr) => { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(f() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; };
  return f;
}

// ---------- difficulty schedule ----------
function params(id) {
  const w = Math.floor((id - 1) / 20), k = (id - 1) % 20, t = k / 19;
  const P = { id, world: w, k, delay: Math.round(180 - id * 0.6), minSeg: 3, ice: 0, bombs: 0, bands: [], stop: 0.3, cov: 0.1, gw: [0.2, 0.4, 0.4] };
  if (w === 0) { P.T = Math.round(18 + k * 2.1); P.maxSeg = 8 - Math.round(t * 2); P.fruits = k < 5 ? 2 : k < 11 ? 3 : k < 16 ? 3 : 4; P.cov = 0.05 + 0.13 * t; P.gw = [0.15 + 0.2 * t, 0.4, 0.45 - 0.2 * t]; P.stop = 0.2 + 0.2 * t; }
  else if (w === 1) { P.T = Math.round(46 + k * 2.4); P.maxSeg = 6; P.fruits = 3 + (k > 6) + (k > 13); P.cov = 0.2 + 0.12 * t; P.gw = [0.3 + 0.3 * t, 0.4, 0.3 - 0.3 * t + 0.0]; P.stop = 0.45; }
  else if (w === 2) { P.T = Math.round(52 + k * 2.1); P.maxSeg = 7; P.fruits = 3 + (k > 5) + (k > 12); P.cov = 0.17 + 0.12 * t; P.ice = 0.4 + 0.45 * t; P.gw = [0.3 + 0.2 * t, 0.4, 0.3 - 0.2 * t]; P.stop = 0.4; }
  else if (w === 3) { P.T = Math.round(56 + k * 2); P.maxSeg = 6; P.fruits = 3 + (k > 5) + (k > 12); P.cov = 0.12 + 0.1 * t; P.bombs = Math.round(3 + 17 * t); P.ice = k >= 10 ? 0.2 + 0.3 * ((k - 10) / 9) : 0; P.gw = [0.35 + 0.2 * t, 0.4, 0.25 - 0.2 * t]; P.stop = 0.4; }
  else {
    P.T = Math.round(70 + k * 3); P.maxSeg = 6; P.fruits = 4 + (k > 8) + (k > 15); P.cov = 0.08 + 0.1 * t;
    P.bombs = k < 6 ? 0 : Math.round(4 + 14 * t); P.ice = k >= 9 && k % 2 === 1 ? 0.5 : 0; P.gw = [0.4, 0.4, 0.2]; P.stop = 0.35;
    const kinds = [
      ['door'], ['door'], ['door'], ['gate'], ['gate'], ['gate'], ['portal'], ['portal'], ['portal'],
      ['door', 'portal'], ['gate', 'door'], ['portal', 'gate'],
      ['door', 'gate'], ['portal', 'door'], ['gate', 'portal'],
      ['door', 'gate'], ['gate', 'portal'], ['gate', 'door', 'portal'], ['portal', 'gate'],
      ['gate', 'door', 'portal']];
    P.bands = kinds[k];
    if (id === 100) { P.bands = ['door', 'gate', 'portal']; P.ice = 0.5; P.bombs = 22; P.T = 138; }
  }
  return P;
}

// ---------- route builder ----------
const inRect = (x, y, r) => x >= r.x0 && x <= r.x1 && y >= r.y0 && y <= r.y1;
function okCell(ctx, x, y, rect, excl) {
  if (!inRect(x, y, rect)) return false;
  if (ctx.mark[idx(x, y)] || ctx.block[idx(x, y)]) return false;
  for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) {
    const nx = x + dx, ny = y + dy;
    if (nx < 0 || ny < 0 || nx >= COLS || ny >= ROWS) continue;
    const c = idx(nx, ny);
    if (ctx.mark[c] && excl.indexOf(c) < 0) return false;
  }
  return true;
}
function tryExtend(ctx, path, segs, rect) {
  const added = [];
  let ok = true;
  outer: for (const sg of segs) {
    const dx = sg[0], dy = sg[1], len = sg[2];
    for (let i = 0; i < len; i++) {
      const p = path[path.length - 1];
      const x = X(p) + dx, y = Y(p) + dy;
      const excl = [path[path.length - 1], path[path.length - 2]].concat(path.length < 5 ? ctx.body : []);
      if (!okCell(ctx, x, y, rect, excl)) { ok = false; break outer; }
      const c = idx(x, y);
      path.push(c); ctx.mark[c] = 1; added.push(c);
    }
  }
  if (!ok) { added.forEach((c) => { ctx.mark[c] = 0; }); path.length -= added.length; }
  return ok;
}
const dirOf = (a, b) => DIRV.findIndex((d) => d[0] === X(b) - X(a) && d[1] === Y(b) - Y(a));

// random walk of straight segments; finish(path, dir) returns true when the route is closed off
function walk(ctx, path, dir, rect, P, rng, finish) {
  for (let guard = 0; guard < 300; guard++) {
    if (path.length - 1 >= ctx.want && finish(path, dir)) return true;
    let turns = rng.shuffle([(dir + 1) % 4, (dir + 3) % 4]);
    if (P.upOnly) turns = (dir === 1 || dir === 3) ? [0] : turns;
    let done = false;
    for (const nd of turns) {
      const lens = [];
      const lo = P.upOnly ? (nd === 0 ? 3 : 5) : P.minSeg, hi = P.upOnly ? (nd === 0 ? 4 : 15) : P.maxSeg;
      for (let l = lo; l <= hi; l++) lens.push(l);
      rng.shuffle(lens);
      for (const l of lens) {
        if (tryExtend(ctx, path, [[DIRV[nd][0], DIRV[nd][1], l]], rect)) { dir = nd; done = true; break; }
      }
      if (done) break;
    }
    if (!done) return false;
  }
  return false;
}

function cornersOf(path) {          // indices in path whose incoming and outgoing directions differ
  const out = [];
  for (let i = 1; i < path.length - 1; i++) {
    const a = dirOf(path[i - 1], path[i]), b = dirOf(path[i], path[i + 1]);
    if (a >= 0 && b >= 0 && a !== b) out.push(i);
  }
  return out;
}

// ---------- level construction ----------
const BR = globalThis.BR = {};
function build(id, attempt) {
  const P = params(id);
  const rng = rngOf(id * 7919 + attempt * 104729 + 17);
  const ctx = { mark: new Uint8Array(COLS * ROWS), block: new Uint8Array(COLS * ROWS), body: [], want: 0 };
  const lv = { id, world: P.world, delay: P.delay, walls: new Set(), ice: new Set(), bombs: new Set(), keys: [], doors: [], switches: [], gates: [], portals: [], fruits: [], P };
  const nb = P.bands.length;
  P.upOnly = nb > 0;
  // band rows
  const bandRows = nb === 0 ? [] : nb === 1 ? [12 + rng.int(-1, 1)] : nb === 2 ? [16, 8] : [18, 12, 6];
  const regions = [];
  let bottom = 24;
  bandRows.forEach((by) => { regions.push({ y0: by + 1, y1: bottom }); bottom = by - 1; });
  regions.push({ y0: 1, y1: bottom });
  // start
  const startDir = nb ? 1 + 2 * rng.int(0, 1) : rng.pick([0, 1, 2, 3]);
  let head;
  const R0 = regions[0];
  const lead = nb ? rng.int(5, 8) : 5;
  const sd = DIRV[startDir];
  // choose head so that lead fits and body fits
  for (let t = 0; t < 200; t++) {
    const x = rng.int(3, 16), y = nb ? R0.y1 - rng.int(0, 1) : rng.int(R0.y0 + 2, R0.y1 - 2);
    const ex = x + sd[0] * lead, ey = y + sd[1] * lead, bx = x - sd[0] * 2, by = y - sd[1] * 2;
    if (ex < 1 || ex > 18 || ey < R0.y0 || ey > R0.y1 || bx < 0 || bx > 19 || by < 0 || by > 25) continue;
    if (nb && (startDir === 0 || startDir === 2)) continue;
    head = [x, y]; break;
  }
  if (!head) { BR[1]=(BR[1]||0)+1; return null; }
  lv.head = head; lv.dir = startDir; lv.len = 3;
  const h0 = idx(head[0], head[1]);
  ctx.body = [idx(head[0] - sd[0], head[1] - sd[1]), idx(head[0] - 2 * sd[0], head[1] - 2 * sd[1])];
  ctx.mark[h0] = 1; ctx.body.forEach((c) => { ctx.mark[c] = 1; });
  const path = [h0];
  const specials = [];                 // {kind, pathIndex...}
  const rectOf = (r) => ({ x0: 1, x1: 18, y0: Math.max(1, r.y0), y1: Math.min(24, r.y1) });
  const perRegion = Math.max(14, Math.round(P.T / regions.length));
  let dir = startDir;
  // first lead segment
  if (!tryExtend(ctx, path, [[sd[0], sd[1], lead]], rectOf(R0))) { BR[2]=(BR[2]||0)+1; return null; }
  lv.bandRows = bandRows;
  for (let ri = 0; ri < regions.length; ri++) {
    const rect = rectOf(regions[ri]);
    const last = ri === regions.length - 1;
    const rows = regions[ri].y1 - regions[ri].y0 + 1, cap = nb ? Math.round(rows * 1.7) : 999;
    ctx.want = path.length - 1 + Math.min(cap, (ri === 0 ? perRegion - lead : perRegion));
    if (nb && (rows <= 5 || (ri === 0 && rows <= 6))) ctx.want = path.length - 1;
    const kind = last ? null : P.bands[ri];
    const zb = last ? 0 : regions[ri].y0;        // row adjacent to the band (top row of this region)
    const by = zb - 1;
    let finish;
    const resolved = { cross: null };
    if (last) {
      finish = (pth, d) => pth.length > 8;
    } else if (kind === 'door' || kind === 'gate') {
      finish = (pth, d) => {
        const p = pth[pth.length - 1], x = X(p), y = Y(p);
        const need = y - zb;
        const tryUp = () => need >= 2 && tryExtend(ctx, pth, [[0, -1, need]], rect);
        if (d === 1 || d === 3) {
          if (need >= 3 && x >= 2 && x <= 17) { const bk = pth.length; if (tryUp()) { resolved.cross = X(pth[pth.length - 1]); return true; } void bk; }
        } else if (d === 0) {
          if (need >= 1 && tryUp()) { resolved.cross = x; return true; }
        }
        if (d === 0 || d === 2) {
          for (const hd of rng.shuffle([1, 3])) {
            const tx = rng.int(3, 16);
            const run = Math.abs(tx - x);
            if (run >= 3 && ((hd === 1 && tx > x) || (hd === 3 && tx < x)) && need >= 3) {
              if (tryExtend(ctx, pth, [[DIRV[hd][0], 0, run], [0, -1, need]], rect)) { resolved.cross = tx; return true; }
            }
          }
        }
        return false;
      };
    } else {                                  // portal: finish with a horizontal run along the top row of the region
      finish = (pth, d) => {
        const p = pth[pth.length - 1], x = X(p), y = Y(p);
        for (const hd of rng.shuffle([1, 3])) {
          const L = rng.int(3, 5);
          const bx = hd === 1 ? rng.int(1, 8) : rng.int(11, 18);
          if (d === 1 || d === 3) {
            const need = y - zb;
            if (need >= 3 && tryExtend(ctx, pth, [[0, -1, need], [DIRV[hd][0], 0, L]], rect)) { resolved.cross = { hd, bx }; return true; }
          } else if (y === zb) {
            if (tryExtend(ctx, pth, [[DIRV[hd][0], 0, L]], rect)) { resolved.cross = { hd, bx }; return true; }
          }
        }
        return false;
      };
    }
    if (!walk(ctx, path, dir, rect, P, rng, finish)) { BR["r"+ri]=(BR["r"+ri]||0)+1; return null; }
    if (last) break;
    // ---- cross the band ----
    const a = path[path.length - 1], ax = X(a);
    if (kind === 'door' || kind === 'gate') {
      const dc = idx(ax, by), above = idx(ax, by - 1);
      if (ctx.mark[above]) { BR[4]=(BR[4]||0)+1; return null; }
      path.push(dc); ctx.mark[dc] = 1;
      specials.push({ kind, pi: path.length - 1 });
      path.push(above); ctx.mark[above] = 1;
      const nextRect = rectOf(regions[ri + 1]);
      if (!tryExtend(ctx, path, [[0, -1, 1]], nextRect)) { BR[5]=(BR[5]||0)+1; return null; }
      dir = 0;
    } else {
      const { hd, bx } = resolved.cross;
      const ac = path[path.length - 1];
      const bc = idx(bx, by - 1);
      if (ctx.mark[bc]) { BR[6]=(BR[6]||0)+1; return null; }
      specials.push({ kind: 'portal', pi: path.length - 1 });   // entering A teleports to B
      path.push(bc); ctx.mark[bc] = 1;
      lv.portals.push([ac, bc]);
      const nextRect = rectOf(regions[ri + 1]);
      if (!tryExtend(ctx, path, [[DIRV[hd][0], 0, rng.int(3, 4)]], nextRect)) { BR[7]=(BR[7]||0)+1; return null; }
      dir = hd === 1 ? 1 : 3;
    }
  }
  lv.path = path;
  lv.exit = path[path.length - 1];
  lv.specials = specials;
  lv.rng = rng;
  return lv;
}

// ---------- decorate: fruits, devices, ice, walls, bombs ----------
function decorate(lv) {
  const P = lv.P, rng = lv.rng, path = lv.path;
  const n = path.length;
  const portalA = new Set(lv.portals.map((p) => p[0]));
  const portalB = new Set(lv.portals.map((p) => p[1]));
  // band walls
  lv.bandRows.forEach((by) => { for (let x = 0; x < COLS; x++) lv.walls.add(idx(x, by)); });
  const specialAt = new Map();
  lv.specials.forEach((s) => { specialAt.set(s.pi, s); });
  const cornerSet = new Set(cornersOf(path));
  // doors / gates removed from walls
  const route = new Set(path);
  const protectedC = new Set();
  const isFree = (i) => i >= 6 && i < n - 3 && !cornerSet.has(i) && !specialAt.has(i) && !specialAt.has(i + 1) && !specialAt.has(i - 1) && !specialAt.has(i + 2) && !specialAt.has(i - 2);
  const pool = [];
  for (let i = 0; i < n; i++) if (isFree(i) && !portalA.has(path[i]) && !portalB.has(path[i])) pool.push(i);
  const used = new Set();
  const takeNear = (target, minGap) => {
    const cand = pool.filter((i) => !used.has(i) && [...used].every((u) => Math.abs(u - i) >= minGap)).sort((a, b) => Math.abs(a - target) - Math.abs(b - target));
    if (!cand.length) return -1;
    const c = cand[Math.min(cand.length - 1, rng.int(0, 2))];
    used.add(c); return c;
  };
  // device keys/switches: placed on the route in the region before each band
  const dev = lv.specials.filter((s) => s.kind !== 'portal');
  let prevPi = 0;
  const regionStarts = [0].concat(lv.specials.map((s) => s.pi));
  dev.forEach((s, di) => {
    const lo = regionStarts[lv.specials.indexOf(s)], hi = s.pi;
    const target = Math.round(lo + (hi - lo) * (0.35 + rng() * 0.3));
    const ti = takeNear(target, 4);
    if (ti < 0) { lv.fail = 'device'; return; }
    const c = path[ti];
    if (s.kind === 'door') {
      lv.keys.push(c); lv.doors.push(path[s.pi]);
    } else {
      lv.switches.push({ cell: c, gate: lv.gates.length }); lv.gates.push(path[s.pi]);
    }
    void prevPi; void di;
  });
  if (lv.fail) return;
  // fruits
  const F = Math.min(P.fruits, Math.max(2, Math.floor((pool.length - dev.length * 2) / 5)), lv.bandRows.length ? 5 : 9);
  for (let f = 0; f < F; f++) {
    const target = Math.round(8 + (n - 14) * ((f + 0.5) / F));
    const ti = takeNear(target, 4);
    if (ti < 0) { lv.fail = 'fruit'; return; }
    lv.fruits.push(path[ti]);
  }
  // protected zone: nothing deadly near the first 9 route cells
  for (let i = 0; i < Math.min(n, 10); i++) {
    const x = X(path[i]), y = Y(path[i]);
    for (let dx = -2; dx <= 2; dx++) for (let dy = -2; dy <= 2; dy++) if (x + dx >= 0 && y + dy >= 0 && x + dx < COLS && y + dy < ROWS) protectedC.add(idx(x + dx, y + dy));
  }
  // near-exit and device approaches keep one clear ring
  const keepRing = (c) => { const x = X(c), y = Y(c); for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) if (x + dx >= 0 && y + dy >= 0 && x + dx < COLS && y + dy < ROWS) protectedC.add(idx(x + dx, y + dy)); };
  keepRing(lv.exit);
  // ---- ice ----
  if (P.ice > 0) {
    // straight runs between corners
    const cs = [0].concat(cornersOf(path)).concat([n - 1]);
    for (let s = 0; s + 1 < cs.length; s++) {
      const a = cs[s], b = cs[s + 1];
      if (b - a < 5) continue;
      if (rng() > P.ice) continue;
      let bad = false;
      for (let i = a + 1; i <= b; i++) if (specialAt.has(i) || specialAt.has(i - 1) || portalA.has(path[i]) || portalB.has(path[i]) || specialAt.has(i + 1)) bad = true;
      if (a < 4) bad = true;
      if (bad) continue;
      // stopper at the corner end
      const d = dirOf(path[b - 1], path[b]);
      const sx = X(path[b]) + DIRV[d][0], sy = Y(path[b]) + DIRV[d][1];
      const outside = sx < 0 || sy < 0 || sx >= COLS || sy >= ROWS;
      let endIce = true;
      if (!outside) {
        const sc = idx(sx, sy);
        if (route.has(sc) || protectedC.has(sc)) endIce = false;
        else lv.walls.add(sc);
      }
      if (!endIce && b !== n - 1) { /* no stopper possible: this corner stays non-ice, the run before it is still ice */ }
      const last = b === n - 1 ? true : endIce;
      for (let i = a + 1; i < b; i++) lv.ice.add(path[i]);
      if (last) lv.ice.add(path[b]);
    }
  }
  // ---- corner stoppers ----
  cornersOf(path).forEach((ci) => {
    if (rng() > P.stop) return;
    const d = dirOf(path[ci - 1], path[ci]);
    const sx = X(path[ci]) + DIRV[d][0], sy = Y(path[ci]) + DIRV[d][1];
    if (sx < 0 || sy < 0 || sx >= COLS || sy >= ROWS) return;
    const sc = idx(sx, sy);
    if (route.has(sc) || protectedC.has(sc) || lv.walls.has(sc)) return;
    lv.walls.add(sc);
  });
  // distance from the route
  const dist = new Int8Array(COLS * ROWS).fill(99);
  for (let c = 0; c < COLS * ROWS; c++) {
    if (!route.has(c) && !lv.bodyCells(c)) continue;
    for (let dx = -3; dx <= 3; dx++) for (let dy = -3; dy <= 3; dy++) {
      const x = X(c) + dx, y = Y(c) + dy;
      if (x < 0 || y < 0 || x >= COLS || y >= ROWS) continue;
      const d = Math.max(Math.abs(dx), Math.abs(dy));
      if (d < dist[idx(x, y)]) dist[idx(x, y)] = d;
    }
  }
  const occupied = (c) => route.has(c) || lv.walls.has(c) || lv.bodyCells(c);
  // ---- wall blocks ----
  const target = Math.round(P.cov * COLS * ROWS);
  let count = lv.walls.size;
  for (let tries = 0; tries < 6000 && count < target; tries++) {
    const w = rng.int(1, 5), h = rng.int(1, 4), x0 = rng.int(0, COLS - w), y0 = rng.int(0, ROWS - h);
    const r = rng();
    const g = r < P.gw[0] ? 1 : r < P.gw[0] + P.gw[1] ? 2 : 3;
    let ok = true;
    const cells = [];
    for (let x = x0; x < x0 + w && ok; x++) for (let y = y0; y < y0 + h; y++) {
      const c = idx(x, y);
      if (occupied(c) || dist[c] < g || protectedC.has(c)) { ok = false; break; }
      cells.push(c);
    }
    if (!ok) continue;
    cells.forEach((c) => lv.walls.add(c));
    count += cells.length;
  }
  lv.dbgProt = [...protectedC];
  // ---- bombs ----
  let nbmb = P.bombs;
  const candidates = [];
  for (let c = 0; c < COLS * ROWS; c++) {
    if (occupied(c) || protectedC.has(c) || dist[c] > 3 || dist[c] < 1) continue;
    candidates.push(c);
  }
  rng.shuffle(candidates);
  for (const c of candidates) {
    if (nbmb <= 0) break;
    // keep bombs apart
    let near = false;
    for (const b of lv.bombs) if (Math.max(Math.abs(X(b) - X(c)), Math.abs(Y(b) - Y(c))) <= 1) { near = true; break; }
    if (near) continue;
    // never fully seal a corridor cell next to an ice stopper; keep ice cells free of bombs
    if (lv.ice.has(c)) continue;
    lv.bombs.add(c); nbmb--;
  }
  // corner overshoot bombs (clear warning where the route turns)
  if (P.bombs > 0) {
    cornersOf(path).forEach((ci) => {
      if (ci < 14 || rng() > 0.35) return;
      const d = dirOf(path[ci - 1], path[ci]);
      const sx = X(path[ci]) + DIRV[d][0], sy = Y(path[ci]) + DIRV[d][1];
      if (sx < 0 || sy < 0 || sx >= COLS || sy >= ROWS) return;
      const sc = idx(sx, sy);
      if (occupied(sc) || protectedC.has(sc) || lv.bombs.has(sc) || lv.ice.has(sc)) return;
      lv.bombs.add(sc);
    });
  }
  // doors/gates cells are not walls
  lv.doors.concat(lv.gates).forEach((c) => lv.walls.delete(c));
  lv.portals.forEach((p) => { lv.walls.delete(p[0]); lv.walls.delete(p[1]); });
  lv.par = path.length - 1 - lv.portals.length;
}
function ctxMarkNear() { return false; }

// ---------- engine conversion / validation ----------
function toEngine(lv) {
  const xy = (c) => [X(c), Y(c)];
  const items = [];
  lv.fruits.forEach((c) => items.push({ type: 'fruit', cell: xy(c), species: 'apple', required: true }));
  lv.bombs.forEach((c) => items.push({ type: 'bomb', cell: xy(c) }));
  lv.keys.forEach((c, i) => items.push({ type: 'key', cell: xy(c), id: 'k' + i }));
  const devices = [];
  lv.doors.forEach((c, i) => devices.push({ type: 'door', cell: xy(c), id: 'k' + i }));
  lv.gates.forEach((c, i) => devices.push({ type: 'gate', cell: xy(c), id: 'g' + i, startOpen: false }));
  lv.switches.forEach((s, i) => devices.push({ type: 'switch', cell: xy(s.cell), id: 's' + i, gate: 'g' + s.gate }));
  lv.portals.forEach((p) => devices.push({ type: 'portal', cells: [xy(p[0]), xy(p[1])] }));
  return {
    id: 'L' + lv.id, board: { cols: COLS, rows: ROWS, walls: [...lv.walls].map(xy), ice: [...lv.ice].map(xy) },
    snake: { head: lv.head, direction: DNAME[lv.dir], length: lv.len }, items, devices, exit: { cell: xy(lv.exit) },
    starRules: { two: { type: 'complete' }, three: [] }
  };
}
function replay(lv, extra) {
  const eng = toEngine(lv), rt = E.makeRuntime(eng), st = E.newState(rt);
  const path = lv.path, portalA = new Map(lv.portals.map((p) => [p[0], p[1]]));
  const info = { waits: 0, ticks: 0 };
  let status = 'ok';
  for (let i = 1; i < path.length; i++) {
    const cur = path[i], head = st.body[0];
    const d = dirOf(head, cur);
    if (d < 0) return { ok: false, why: 'route not adjacent at ' + i };
    let res, guard = 0;
    do { res = E.step(rt, st, DIRV[d]); info.ticks++; if (res.status === 'wait') info.waits++; guard++; } while (res.status === 'wait' && guard < 5);
    status = res.status;
    if (status === 'fail') return { ok: false, why: 'fail ' + res.reason + ' at tick ' + i + ' cell ' + X(cur) + ',' + Y(cur) };
    if (portalA.has(cur)) {
      if (st.body[0] !== portalA.get(cur)) return { ok: false, why: 'portal jump mismatch' };
      i++;                                       // skip B in the route
    } else if (st.body[0] !== cur) {
      return { ok: false, why: 'head mismatch at ' + i + ' (' + X(st.body[0]) + ',' + Y(st.body[0]) + ' vs ' + X(cur) + ',' + Y(cur) + ')' };
    }
    if (status === 'win' && i < path.length - 1) return { ok: false, why: 'won early' };
  }
  if (status !== 'win') return { ok: false, why: 'no win (' + status + ')' };
  info.ok = true; info.moves = st.moves; info.len = st.body.length;
  void extra;
  return info;
}

// reachability checks (static flood fill) to prove devices are necessary
function flood(lv, opts) {
  const blocked = new Uint8Array(COLS * ROWS);
  lv.walls.forEach((c) => { blocked[c] = 1; });
  if (!opts.doorsOpen) lv.doors.forEach((c) => { blocked[c] = 1; });
  if (!opts.gatesOpen) lv.gates.forEach((c) => { blocked[c] = 1; });
  lv.bombs.forEach((c) => { blocked[c] = 1; });
  const link = new Map();
  if (opts.portals) lv.portals.forEach((p) => { link.set(p[0], p[1]); link.set(p[1], p[0]); });
  const start = idx(lv.head[0], lv.head[1]);
  const seen = new Uint8Array(COLS * ROWS), q = [start]; seen[start] = 1;
  while (q.length) {
    const c = q.pop();
    const nbs = DIRV.map((d) => [X(c) + d[0], Y(c) + d[1]]).filter((p) => p[0] >= 0 && p[1] >= 0 && p[0] < COLS && p[1] < ROWS).map((p) => idx(p[0], p[1]));
    if (link.has(c)) nbs.push(link.get(c));
    for (const nn of nbs) if (!seen[nn] && !blocked[nn]) { seen[nn] = 1; q.push(nn); }
  }
  return seen;
}

function makeLevel(id) {
  const why = {};
  const bump = (k) => { why[k] = (why[k] || 0) + 1; };
  for (let attempt = 0; attempt < 4000; attempt++) {
    const lv = build(id, attempt);
    if (!lv) { bump('build'); continue; }
    const bodyArr = [idx(lv.head[0], lv.head[1])];
    const d = DIRV[lv.dir];
    bodyArr.push(idx(lv.head[0] - d[0], lv.head[1] - d[1]), idx(lv.head[0] - 2 * d[0], lv.head[1] - 2 * d[1]));
    lv.bodyCells = (c) => bodyArr.indexOf(c) >= 0;
    decorate(lv);
    if (lv.fail) { bump(lv.fail); continue; }
    const r = replay(lv);
    if (!r.ok) { bump('replay:' + r.why.split(' ')[0]); continue; }
    // necessity checks
    const all = flood(lv, { doorsOpen: true, gatesOpen: true, portals: true });
    if (!all[lv.exit]) { bump('unreach'); continue; }
    if (lv.doors.length && flood(lv, { doorsOpen: false, gatesOpen: true, portals: true })[lv.exit]) continue;
    if (lv.gates.length && flood(lv, { doorsOpen: true, gatesOpen: false, portals: true })[lv.exit]) continue;
    if (lv.portals.length && flood(lv, { doorsOpen: true, gatesOpen: true, portals: false })[lv.exit]) continue;
    lv.attempt = attempt; lv.replay = r;
    return lv;
  }
  console.log('why', id, JSON.stringify(why), JSON.stringify(globalThis.BR));
  return null;
}

// ---------- hand made teaching levels ----------
function poly(pts) {            // corner list -> cell path
  const out = [idx(pts[0][0], pts[0][1])];
  for (let i = 1; i < pts.length; i++) {
    let [x, y] = pts[i - 1]; const [tx, ty] = pts[i];
    while (x !== tx || y !== ty) { x += Math.sign(tx - x); y += Math.sign(ty - y); out.push(idx(x, y)); }
  }
  return out;
}
function rect(set, x0, y0, x1, y1) { for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) set.add(idx(x, y)); }
function hand(id, head, dir, pts, fruits, wallRects) {
  const P = params(id);
  const lv = { id, world: 0, delay: P.delay, walls: new Set(), ice: new Set(), bombs: new Set(), keys: [], doors: [], switches: [], gates: [], portals: [], P, specials: [], bandRows: [] };
  lv.head = head; lv.dir = dir; lv.len = 3;
  lv.path = poly(pts); lv.exit = lv.path[lv.path.length - 1];
  lv.fruits = fruits.map((f) => idx(f[0], f[1]));
  wallRects.forEach((r) => rect(lv.walls, r[0], r[1], r[2], r[3]));
  lv.par = lv.path.length - 1;
  lv.attempt = 0;
  lv.replay = replay(lv);
  return lv;
}
const HAND = {
  1: () => hand(1, [3, 13], 1, [[3, 13], [16, 13]], [[9, 13]], []),
  2: () => hand(2, [3, 13], 1, [[3, 13], [11, 13], [11, 6], [15, 6], [15, 13], [18, 13]], [[8, 13]], [[13, 9, 13, 17]]),
  3: () => hand(3, [6, 22], 3, [[6, 22], [3, 22], [3, 12], [16, 12], [16, 5], [8, 5]], [[3, 16], [10, 12]], [[0, 9, 13, 9], [6, 17, 19, 17]]),
  4: () => hand(4, [2, 6], 1, [[2, 6], [11, 6], [11, 21], [17, 21]], [[7, 6], [11, 14]], [[14, 0, 14, 18]]),
  5: () => hand(5, [2, 20], 1, [[2, 20], [7, 20], [7, 11], [16, 11], [16, 19]], [[5, 20], [7, 14], [13, 11]], [[3, 8, 19, 8], [10, 14, 10, 25]])
};
const HINTS = {
  1: 'Swipe to steer. Eat the fruit, then reach the exit.',
  2: 'Walls are deadly. Go around the wall.',
  3: 'Follow the open path. Turn before you hit a wall.',
  4: 'Turn early! The wall is in your way.',
  5: 'Eat all the fruit, then the exit opens.',
  41: 'Ice! You slide and cannot steer until you stop.',
  61: 'Bombs explode! Steer around them.',
  81: 'Grab the key to open the door.',
  84: 'Step on the switch to open the gate.',
  87: 'Enter one portal to come out of the other.'
};

if (process.argv[1] && process.argv[1].endsWith('gen.mjs')) {
  const only = process.argv[2] ? process.argv[2].split(',').map(Number) : null;
  const out = [];
  const t0 = Date.now();
  for (let id = 1; id <= 100; id++) {
    if (only && !only.includes(id)) continue;
    const lv = HAND[id] ? HAND[id]() : makeLevel(id);
    if (!lv) { console.log('FAILED', id); continue; }
    out.push(lv);
  }
  console.log('built', out.length, 'levels in', Date.now() - t0, 'ms');
  fs.writeFileSync('levels.tmp.json', JSON.stringify(out.map((l) => ({ id: l.id, attempt: l.attempt, par: l.par, path: l.path.length, why: l.lastWhy }))));
  globalThis.__levels = out;
}
export { makeLevel, HAND, HINTS, params, replay, flood, toEngine, X, Y, idx, COLS, ROWS, DIRV, dirOf, cornersOf };
