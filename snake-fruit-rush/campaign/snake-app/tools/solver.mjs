import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const E = require('../www/js/engine.js');

// Breadth-first search over (body, direction, fruit/keys/gates, switch log). Because the snake moves
// every tick, a "move" is one of: go straight, turn left or turn right (reverse is not allowed).
// pred(rt, state) is checked on a win. Returns { moves, path } or null.
export function solve(level, opts = {}) {
  const rt = E.makeRuntime(level);
  const maxMoves = opts.maxMoves || level.hardMoveLimit || 60;
  const maxStates = opts.maxStates || 6e6;
  const pred = opts.pred || (() => true);
  const start = E.newState(rt);
  let frontier = [{ st: start, path: '' }];
  const seen = new Set([E.stateKey(start)]);
  let visited = 0;
  const letter = (d) => (d[0] === 0 ? (d[1] < 0 ? 'U' : 'D') : (d[0] < 0 ? 'L' : 'R'));
  for (let depth = 0; depth < maxMoves && frontier.length; depth++) {
    const nextF = [];
    for (const node of frontier) {
      const st = node.st;
      const r0 = E.resolveDir(rt, st, null);
      let options = r0.forced ? [null] : E.DIR_LIST.filter((d) => !E.opposite(d, st.dir));
      if (depth < (opts.straight || 0)) options = [null];                 // fair opening: no turn in the first ticks
      // when the snake waits on ice, only turns are meaningful
      for (const d of options) {
        const c = E.cloneState(st);
        const res = E.step(rt, c, d);
        if (res.status === 'fail') continue;
        if (res.status === 'wait') {
          if (!d) continue;
          // the same direction would stay blocked; a different one is handled by its own option
          continue;
        }
        const path = node.path + (d ? letter(d) : '.');
        if (res.status === 'win') { if (pred(rt, c)) return { moves: c.moves, path: path, rt: rt, state: c, visited: visited }; continue; }
        const key = E.stateKey(c);
        if (seen.has(key)) continue;
        seen.add(key); visited++;
        if (visited > maxStates) return { aborted: true, visited: visited };
        nextF.push({ st: c, path: path });
      }
    }
    frontier = nextF;
  }
  return null;
}
export { E };
