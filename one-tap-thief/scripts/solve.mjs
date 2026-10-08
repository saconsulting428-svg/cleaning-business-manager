// Beam-search bot: proves each level is beatable (ideally as a 3-star Perfect Heist) with the real simulation.
// usage: node scripts/solve.mjs [levelNumber ...]
import { LEVELS } from '../src/levels/levels.js';
import { WORLDS } from '../src/levels/worlds.js';
import { CFG } from '../src/config.js';
import { bfs, K } from '../src/game/grid.js';
import { cloneState, commandMove, computeResult, createLevel, createState, stepSim } from '../src/game/sim.js';

const DECISION = 0.4; // seconds between decisions
const STEPS = Math.round(DECISION / CFG.fixedStep);
const only = process.argv.slice(2).map(Number);

function heuristic(ctx, st) {
  const p = st.player;
  const res = bfs(ctx, st, Math.floor(p.x), Math.floor(p.y), true);
  let remaining = 0, best = 1e9;
  ctx.items.forEach((it, i) => {
    if (st.taken[i]) return;
    if (it.type !== 'key' || true) { remaining++; best = Math.min(best, res.dist[it.y * ctx.w + it.x]); }
  });
  const ex = res.dist[ctx.exit.y * ctx.w + ctx.exit.x];
  if (!remaining) best = ex;
  return remaining * 1000 + best * 10 - (st.keys ? 5 : 0);
}

function commands(ctx, st) {
  const p = st.player;
  const tx = Math.floor(p.x), ty = Math.floor(p.y);
  const cmds = [null, 'stop'];
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) cmds.push([tx + dx, ty + dy]);
  ctx.items.forEach((it, i) => { if (!st.taken[i]) cmds.push([it.x, it.y]); });
  cmds.push([ctx.exit.x, ctx.exit.y]);
  for (let y = 0; y < ctx.h; y++) for (let x = 0; x < ctx.w; x++) if (ctx.kind[y * ctx.w + x] === K.HIDE) cmds.push([x, y]);
  return cmds;
}

function solve(def, strict, beamWidth = 160, maxTime = 90) {
  const ctx = createLevel(def, WORLDS[def.world]);
  let beam = [{ st: createState(ctx), plan: [] }];
  const layers = Math.round(maxTime / DECISION);
  for (let layer = 0; layer < layers && beam.length; layer++) {
    const next = new Map();
    for (const node of beam) {
      for (const cmd of commands(ctx, node.st)) {
        const st = cloneState(node.st);
        if (cmd === 'stop') { st.player.path = []; st.player.target = null; }
        else if (cmd) commandMove(ctx, st, cmd[0], cmd[1]);
        for (let i = 0; i < STEPS && st.status === 'playing'; i++) stepSim(ctx, st);
        st.events.length = 0;
        if (st.status === 'caught') continue;
        if (st.status === 'won') {
          const r = computeResult(ctx, st);
          if (!strict || r.perfect) return { ok: true, time: st.time, stars: r.stars, plan: node.plan.length + 1 };
          continue;
        }
        if (strict && (st.spotted || st.alarmed)) continue;
        const key = [Math.floor(st.player.x), Math.floor(st.player.y), st.taken.join(''), st.doorOpen.join(''), st.player.path.length ? 1 : 0].join('|');
        const h = heuristic(ctx, st);
        const old = next.get(key);
        if (!old || h < old.h) next.set(key, { st, h, plan: node.plan.concat([cmd]) });
      }
    }
    beam = [...next.values()].sort((a, b) => a.h - b.h).slice(0, beamWidth);
  }
  return { ok: false };
}

let fails = 0;
for (const def of LEVELS) {
  if (only.length && !only.includes(def.level)) continue;
  const t0 = Date.now();
  let r = solve(def, true);
  let kind = '3★ perfect';
  if (!r.ok) { r = solve(def, false); kind = r.ok ? 'only non-perfect' : 'UNSOLVED'; }
  if (!r.ok || kind !== '3★ perfect') fails++;
  console.log(`L${def.level} ${def.name.padEnd(18)} ${kind.padEnd(16)} ${r.ok ? `t=${r.time.toFixed(1)}s stars=${r.stars}` : ''} (${((Date.now() - t0) / 1000).toFixed(1)}s search)`);
}
process.exit(fails ? 1 : 0);
