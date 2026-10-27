import * as G from './gen.mjs';
import fs from 'fs';
const { X, Y, idx, COLS, ROWS } = G;
const enc = (set) => { let s = ''; for (let y = 0; y < ROWS; y++) { let m = 0; for (let x = 0; x < COLS; x++) if (set.has(idx(x, y))) m |= 1 << x; for (let k = 3; k >= 0; k--) s += ((m >> (k * 5)) & 31).toString(32); } return s; };
const xy = (c) => [X(c), Y(c)];
const levels = [], routes = [], report = [];
for (let id = 1; id <= 100; id++) {
  const lv = G.HAND[id] ? G.HAND[id]() : G.makeLevel(id);
  if (!lv) throw new Error('level ' + id + ' failed');
  const par = lv.replay.moves;
  const o = { w: lv.world, d: lv.delay, s: [lv.head[0], lv.head[1], lv.dir], F: lv.fruits.map(xy), E: xy(lv.exit), W: enc(lv.walls), par, s2: Math.ceil(par * 1.45), s3: Math.ceil(par * 1.18) + 2 };
  if (lv.ice.size) o.I = enc(lv.ice);
  if (lv.bombs.size) o.B = enc(lv.bombs);
  if (lv.keys.length) { o.K = lv.keys.map(xy); o.D = lv.doors.map(xy); }
  if (lv.switches.length) { o.S = lv.switches.map((s) => xy(s.cell).concat([s.gate])); o.G = lv.gates.map(xy); }
  if (lv.portals.length) o.P = lv.portals.map((p) => xy(p[0]).concat(xy(p[1])));
  if (G.HINTS[id]) o.h = G.HINTS[id];
  levels.push(o);
  routes.push(lv.path);
  const cor = G.cornersOf(lv.path);
  // fairness metrics
  let minSeg = 99; let prev = 0;
  cor.concat([lv.path.length - 1]).forEach((c) => { minSeg = Math.min(minSeg, c - prev); prev = c; });
  report.push({ id, world: lv.world, par, fruits: lv.fruits.length, corners: cor.length, minSeg, walls: lv.walls.size, ice: lv.ice.size, bombs: lv.bombs.size, keys: lv.keys.length, switches: lv.switches.length, portals: lv.portals.length, delay: lv.delay, secs: Math.round(par * lv.delay / 100) / 10 });
}
fs.writeFileSync('levels.json', JSON.stringify(levels));
fs.writeFileSync('routes.json', JSON.stringify(routes));
fs.writeFileSync('report.json', JSON.stringify(report, null, 1));
const js = 'window.SFR_LEVELS=' + JSON.stringify(levels) + ';';
fs.writeFileSync('levels-data.js', js);
console.log('levels', levels.length, 'bytes', js.length);
console.log('min segment overall', Math.min(...report.map((r) => r.minSeg)), 'max secs', Math.max(...report.map((r) => r.secs)));
