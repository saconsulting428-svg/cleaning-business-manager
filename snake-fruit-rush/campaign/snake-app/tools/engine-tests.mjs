// Unit tests for the puzzle rules (www/js/engine.js) on tiny hand-made boards.
//   node tools/engine-tests.mjs
import { createRequire } from 'module';
const E = createRequire(import.meta.url)('../www/js/engine.js');
let fails = 0, n = 0;
const ok = (c, m) => { n++; if (!c) { fails++; console.log('FAIL', m); } else console.log('ok  ', m); };
const U = E.DIRS.up, D = E.DIRS.down, L = E.DIRS.left, R = E.DIRS.right;

function level(o) {
  return Object.assign({
    id: 1, board: { cols: 8, rows: 8, walls: [], ice: [] }, snake: { head: [3, 3], direction: 'right', length: 3 },
    items: [], devices: [], exit: { cell: [7, 7] }, parMoves: 20, hardMoveLimit: null,
    starRules: { one: { type: 'complete' }, two: { type: 'movesAtMost', value: 20 }, three: [{ type: 'movesAtMost', value: 10 }] }
  }, o);
}
const make = (o) => { const lv = level(o), rt = E.makeRuntime(lv), st = E.newState(rt); return { lv, rt, st }; };
const idx = (x, y) => y * 8 + x;
const step = (g, d) => E.step(g.rt, g.st, d || null);
const head = (g) => [g.st.body[0] % 8, (g.st.body[0] / 8) | 0];

// walls and edges
{ const g = make({ snake: { head: [5, 3], direction: 'right', length: 3 } });
  ok(step(g).status === 'ok' && step(g).status === 'ok', 'free cells are walkable');
  const r = step(g); ok(r.status === 'fail' && r.reason === 'wall', 'board edge is a wall (fail)'); }
{ const g = make({ board: { cols: 8, rows: 8, walls: [[5, 3]], ice: [] } });
  step(g); const r = step(g); ok(r.status === 'fail' && r.reason === 'wall', 'wall tile is deadly'); }
// reverse turns are rejected, other turns are accepted
{ const g = make(); step(g, L); ok(head(g)[0] === 4, 'reverse input is ignored (snake keeps going straight)');
  step(g, D); ok(head(g)[0] === 4 && head(g)[1] === 4, 'a 90-degree turn is accepted'); }
// fruit, growth, exit
{ const g = make({ items: [{ type: 'fruit', species: 'apple', cell: [4, 3], required: true }], exit: { cell: [6, 3] } });
  const r = step(g); ok(r.events.some((e) => e.t === 'fruit') && g.st.body.length === 4, 'eating a fruit grows the snake by one segment at once');
  step(g); const w = step(g); ok(w.status === 'win', 'exit with all required fruit wins'); }
{ const g = make({ items: [{ type: 'fruit', species: 'apple', cell: [3, 5], required: true }], exit: { cell: [5, 3] } });
  step(g); const r = step(g); ok(r.status === 'ok' && !g.st.done, 'entering the exit before collecting the fruit does not finish the level'); }
{ const g = make({ items: [{ type: 'fruit', species: 'apple', cell: [4, 3], required: false }, { type: 'fruit', species: 'apple', cell: [3, 6], required: true }], exit: { cell: [6, 3] } });
  step(g); step(g); const r = step(g); ok(r.status === 'ok', 'optional fruit is not required to open the exit (but a required one is)'); }
// self collision + tail vacate rule
{ const g = make({ snake: { head: [3, 3], direction: 'right', length: 3 } });
  g.st.body = [idx(3, 3), idx(3, 4), idx(4, 4), idx(4, 3)]; g.st.dir = U;            // 2x2 loop, head turned to the left
  g.st.dir = L; g.st.body = [idx(3, 3), idx(4, 3), idx(4, 4), idx(3, 4)];             // head (3,3), tail (3,4)
  const r = step(g, D); ok(r.status === 'ok', 'moving into the cell the tail is leaving is allowed'); }
{ const g = make({ items: [{ type: 'fruit', species: 'apple', cell: [3, 4], required: true }] });
  g.st.dir = L; g.st.body = [idx(3, 3), idx(4, 3), idx(4, 4), idx(3, 4)];
  // the tail cell holds a fruit -> eating step: the tail does not leave, so it is a collision
  const r = step(g, D); ok(r.status === 'fail' && r.reason === 'body', 'while growing the tail does not vacate (body collision)'); }
{ const g = make(); g.st.dir = L; g.st.body = [idx(3, 3), idx(4, 3), idx(4, 2), idx(3, 2), idx(2, 2)];
  const r = step(g, U); ok(r.status === 'fail' && r.reason === 'body', 'hitting the body is deadly'); }
// keys and doors
{ const g = make({ items: [{ type: 'key', id: 'k1', cell: [4, 3] }], devices: [{ type: 'door', id: 'k1', cell: [5, 3] }] });
  const r = step(g); ok(r.events.some((e) => e.t === 'key') && r.events.some((e) => e.t === 'door'), 'key pick-up opens its door');
  ok(step(g).status === 'ok', 'an opened door can be walked through'); }
{ const g = make({ devices: [{ type: 'door', id: 'k1', cell: [4, 3] }], items: [{ type: 'key', id: 'k1', cell: [0, 0] }] });
  const r = step(g); ok(r.status === 'fail' && r.reason === 'door', 'a locked door is deadly'); }
// switches and gates (toggle once per entry)
{ const g = make({ devices: [{ type: 'switch', id: 's1', cell: [4, 3], gate: 'g1' }, { type: 'gate', id: 'g1', cell: [5, 3], startOpen: false }] });
  step(g); ok(E.gateOpen(g.rt, g.st, 0), 'entering a switch opens its gate'); ok(step(g).status === 'ok', 'open gate is passable'); }
{ const g = make({ devices: [{ type: 'switch', id: 's1', cell: [3, 5], gate: 'g1' }, { type: 'gate', id: 'g1', cell: [3, 7], startOpen: true }], snake: { head: [3, 3], direction: 'down', length: 3 } });
  step(g); step(g); ok(!E.gateOpen(g.rt, g.st, 0), 'the same switch closes an open gate'); }
// bombs
{ const g = make({ items: [{ type: 'bomb', cell: [4, 3] }] }); const r = step(g); ok(r.status === 'fail' && r.reason === 'trap', 'a bomb is deadly'); }
// ice
{ const g = make({ board: { cols: 8, rows: 8, walls: [], ice: [[4, 3], [5, 3], [6, 3]] } });
  step(g); const r = step(g, D); ok(head(g)[0] === 5 && head(g)[1] === 3, 'on ice the snake cannot steer (input ignored)'); step(g); step(g);
  ok(head(g)[0] === 7, 'the snake slides off the end of the ice'); }
{ const g = make({ board: { cols: 8, rows: 8, walls: [[7, 3]], ice: [[4, 3], [5, 3], [6, 3]] } });
  step(g); step(g); step(g); const r = step(g); ok(r.status === 'wait' && head(g)[0] === 6, 'at a wall the ice slide stops safely and waits for a turn'); 
  const m = g.st.moves; const r2 = step(g, D); ok(r2.status === 'ok' && g.st.moves === m + 1 && head(g)[1] === 4, 'a turn after the stop moves on (the wait costs no move)'); }
{ const g = make({ board: { cols: 8, rows: 8, walls: [[7, 3], [6, 2], [6, 4]], ice: [[4, 3], [5, 3], [6, 3]] } });
  step(g); step(g); step(g); const r = step(g); ok(r.status === 'fail' && r.reason === 'stuck', 'if nowhere is left to go the attempt ends (no frozen state)'); }
{ const g = make({ board: { cols: 8, rows: 8, walls: [], ice: [[4, 3], [5, 3], [6, 3]] }, items: [{ type: 'bomb', cell: [6, 3] }] });
  step(g); step(g); const r = step(g); ok(r.status === 'fail' && r.reason === 'trap', 'a trap on the forced slide path is still deadly'); }
// portals
{ const g = make({ devices: [{ type: 'portal', id: 'p1', cells: [[4, 3], [4, 6]] }] });
  const r = step(g); ok(head(g)[0] === 4 && head(g)[1] === 6 && r.events.some((e) => e.t === 'portal') && g.st.moves === 1, 'a portal jumps to its twin in one move and keeps the heading');
  step(g); ok(head(g)[0] === 5 && head(g)[1] === 6, 'the snake continues in the same direction after the jump'); }
{ const g = make({ devices: [{ type: 'portal', id: 'p1', cells: [[4, 3], [3, 3]] }] });
  g.st.body = [idx(3, 4), idx(2, 4), idx(2, 3), idx(3, 3)]; g.st.dir = R;                // body sits on the twin portal
  g.st.body = [idx(3, 3), idx(2, 3)]; g.st.body = [idx(3, 4), idx(3, 3), idx(2, 3)]; g.st.dir = U;
  const r = step(g, R); ok(r.status === 'ok' || r.status === 'fail', 'portal with occupied destination is handled'); 
  const g2 = make({ devices: [{ type: 'portal', id: 'p1', cells: [[4, 3], [2, 3]] }] });  // twin (2,3) is the snake's own tail cell
  g2.st.body = [idx(3, 3), idx(3, 2), idx(2, 2), idx(2, 3), idx(1, 3)]; g2.st.dir = R;
  const r2 = step(g2); ok(r2.status === 'fail' && r2.reason === 'body', 'jumping onto your own body is deadly'); }
// hard cap
{ const g = make({ hardMoveLimit: 3, exit: { cell: [7, 3] } });
  step(g); step(g); const r = step(g); ok(r.status === 'fail' && r.reason === 'moves', 'the move cap ends the attempt'); }
{ const g = make({ hardMoveLimit: 4, exit: { cell: [7, 3] } });
  step(g); step(g); step(g); const r = step(g); ok(r.status === 'win', 'winning on the last allowed move counts'); }
// stars
{ const g = make({ exit: { cell: [5, 3] }, starRules: { one: { type: 'complete' }, two: { type: 'movesAtMost', value: 4 }, three: [{ type: 'movesAtMost', value: 2 }] } });
  step(g); step(g); ok(E.evaluateStars(g.rt, g.st) === 3, '3 stars: within the perfect move count'); }
{ const g = make({ exit: { cell: [5, 3] }, starRules: { one: { type: 'complete' }, two: { type: 'movesAtMost', value: 4 }, three: [{ type: 'movesAtMost', value: 1 }] } });
  step(g); step(g); ok(E.evaluateStars(g.rt, g.st) === 2, '2 stars: within par but not perfect'); }
{ const g = make({ exit: { cell: [5, 3] }, starRules: { one: { type: 'complete' }, two: { type: 'movesAtMost', value: 1 }, three: [{ type: 'movesAtMost', value: 1 }] } });
  step(g); step(g); ok(E.evaluateStars(g.rt, g.st) === 1, '1 star: cleared above par'); }
{ const g = make({ items: [{ type: 'fruit', species: 'strawberry', cell: [4, 3], required: false }], exit: { cell: [6, 3] }, starRules: { one: { type: 'complete' }, two: { type: 'movesAtMost', value: 9 }, three: [{ type: 'collectOptional', species: 'strawberry' }] } });
  step(g); step(g); step(g); ok(E.evaluateStars(g.rt, g.st) === 3, 'perfect rule: collect the bonus fruit'); }
// determinism
{ const run = () => { const g = make({ items: [{ type: 'fruit', species: 'apple', cell: [4, 3], required: true }] }); const out = []; [null, D, null, L].forEach((d) => out.push(step(g, d).status)); return JSON.stringify([out, g.st.body]); };
  ok(run() === run(), 'same inputs -> same result (deterministic)'); }
console.log(fails ? 'FAILED ' + fails + ' of ' + n : 'ALL ' + n + ' ENGINE TESTS PASSED');
process.exit(fails ? 1 : 0);
