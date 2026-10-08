// Static checks: every level parses, loot/keys/exit are reachable, key count >= door count, guard routes walkable.
import { LEVELS } from '../src/levels/levels.js';
import { WORLDS } from '../src/levels/worlds.js';
import { createLevel, createState } from '../src/game/sim.js';
import { bfs, moveBlocked } from '../src/game/grid.js';

let bad = 0;
for (const def of LEVELS) {
  const ctx = createLevel(def, WORLDS[def.world]);
  const st = createState(ctx);
  const fail = (m) => { bad++; console.log(`  ✗ L${def.level}: ${m}`); };
  const keys = ctx.items.filter((i) => i.type === 'key').length;
  if (keys < ctx.doors.length) fail(`${keys} keys for ${ctx.doors.length} doors`);
  // reachability with every door treated as passable (keys sit before the doors in these maps)
  const res = bfs(ctx, st, ctx.start.x, ctx.start.y, true, true);
  for (const it of ctx.items) if (res.dist[it.y * ctx.w + it.x] < 0) fail(`${it.type} at ${it.x},${it.y} unreachable`);
  if (bfs(ctx, st, ctx.start.x, ctx.start.y, true).dist[ctx.exit.y * ctx.w + ctx.exit.x] < 0) fail('exit unreachable');
  // keys must be reachable without opening any door
  const noDoor = bfs(ctx, st, ctx.start.x, ctx.start.y, false, true);
  if (keys && !ctx.items.some((i) => i.type === 'key' && noDoor.dist[i.y * ctx.w + i.x] >= 0)) fail('no key reachable before the first door');
  for (const g of def.guards || []) for (const [x, y] of g.patrol) if (moveBlocked(ctx, st, x, y, false)) fail(`guard waypoint ${x},${y} is blocked`);
  console.log(`  L${def.level} ${def.name.padEnd(18)} ${ctx.w}x${ctx.h} guards=${(def.guards || []).length} cams=${(def.cameras || []).length} loot=${ctx.lootCount} keys=${keys}`);
}
console.log(bad ? `${bad} problem(s)` : 'all levels valid');
process.exit(bad ? 1 : 0);
