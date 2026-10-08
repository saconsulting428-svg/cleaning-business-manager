// Sanity check: a careless player (straight to each item, then exit) should usually get caught/alarmed on guarded levels.
import { LEVELS } from '../src/levels/levels.js';
import { WORLDS } from '../src/levels/worlds.js';
import { commandMove, computeResult, createLevel, createState, stepSim } from '../src/game/sim.js';
for (const def of LEVELS) {
  const ctx = createLevel(def, WORLDS[def.world]); const st = createState(ctx);
  const goals = [...ctx.items.map((i) => [i.x, i.y]), [ctx.exit.x, ctx.exit.y]];
  let gi = 0;
  for (let i = 0; i < 60 * 90 && st.status === 'playing'; i++) {
    if (!st.player.path.length && gi < goals.length) commandMove(ctx, st, ...goals[gi++]);
    stepSim(ctx, st); st.events.length = 0;
  }
  const r = computeResult(ctx, st);
  console.log(`L${def.level} naive: ${st.status} spotted=${st.spotted} alarm=${st.alarmed} stars=${st.status === 'won' ? r.stars : '-'} t=${st.time.toFixed(1)}`);
}
