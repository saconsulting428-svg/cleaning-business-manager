// Design aid: % of time (over one minute) each tile is inside a guard/camera cone. '.'=never  0-9 = 10-100%  #=wall  letters = objects
// usage: node scripts/heatmap.mjs 7
import { LEVELS } from '../src/levels/levels.js';
import { WORLDS } from '../src/levels/worlds.js';
import { K, tileKind } from '../src/game/grid.js';
import { createLevel, createState, stepSim } from '../src/game/sim.js';
import { seesPlayer } from '../src/ai/vision.js';
import { effectiveRange } from '../src/ai/guard.js';
for (const n of process.argv.slice(2).map(Number)) {
  const def = LEVELS.find((l) => l.level === n);
  const ctx = createLevel(def, WORLDS[def.world]);
  const st = createState(ctx);
  const seen = new Float32Array(ctx.w * ctx.h);
  const N = 60 * 60;
  for (let i = 0; i < N; i++) {
    st.invuln = 1e9; st.player.x = -9; st.player.y = -9; st.status = 'playing';
    stepSim(ctx, st);
    if (i % 6) continue;
    for (let y = 0; y < ctx.h; y++) for (let x = 0; x < ctx.w; x++) {
      if (tileKind(ctx, x, y) === K.WALL || tileKind(ctx, x, y) === K.FURN) continue;
      st.player.x = x + 0.5; st.player.y = y + 0.5; st.player.hidden = false; st.invuln = 0;
      const hit = st.guards.some((g) => seesPlayer(ctx, st, g.x, g.y, g.face, effectiveRange(g, st), g.fov) >= 0)
        || st.cameras.some((c) => seesPlayer(ctx, st, c.x, c.y, c.angle, c.range, c.fov, 0.6) >= 0);
      if (hit) seen[y * ctx.w + x] += 1;
    }
    st.invuln = 1e9;
  }
  let tot = 0, cnt = 0, hot = 0;
  for (let y = 0; y < ctx.h; y++) for (let x = 0; x < ctx.w; x++) {
    const k = tileKind(ctx, x, y); if (k === K.WALL || k === K.FURN) continue;
    const f = seen[y * ctx.w + x] / (N / 6); tot += f; cnt++; if (f > 0.3) hot++;
  }
  console.log(`L${n} ${def.name}  mean exposure ${(100 * tot / cnt).toFixed(0)}%, tiles watched >30% of the time: ${(100 * hot / cnt).toFixed(0)}%  (cells: exposure 0-9 per 10%; S start, E exit, $ loot, R rare, K key, D door, A alarm, H hide)`);
  for (let y = 0; y < ctx.h; y++) {
    let row = '';
    for (let x = 0; x < ctx.w; x++) {
      const c = def.map[y][x];
      if ('#F'.includes(c)) row += c === '#' ? '█' : '▒';
      else if ('SEKDAH'.includes(c)) row += c;
      else if (c === 'L') row += '$';
      else if (c === 'R') row += 'R';
      else { const f = seen[y * ctx.w + x] / (N / 6); row += f < 0.005 ? '.' : String(Math.min(9, Math.floor(f * 10))); }
    }
    console.log('  ' + row);
  }
}
