// Hand fixes for coordinate mistakes in the design document. Each entry says what was wrong and what changed.
// (Generic fixes - device cells inside a wall line, start heading into a wall - are applied by structural.mjs.)
const cellEq = (a, b) => a[0] === b[0] && a[1] === b[1];
const rmWall = (lv, c) => { lv.board.walls = lv.board.walls.filter((w) => !cellEq(w, c)); };
const moveBomb = (lv, from, to) => { const b = lv.items.find((i) => i.type === 'bomb' && cellEq(i.cell, from)); b.cell = to; };

export const FIXES = {
  42: { why: 'The ice strip ended in a gap of the wall, so the snake slid out of the board section; the wall is now closed behind the strip so the slide stops on x=5 as described.',
    apply: (lv) => { lv.board.ice = lv.board.ice.filter((c) => c[0] !== 6); for (let y = 0; y < 8; y++) if (!lv.board.walls.some((w) => w[0] === 6 && w[1] === y)) lv.board.walls.push([6, y]); } },
  37: { why: 'Bomb at (4,4) sealed the only gap (5,4) of the right wall, so the cherry was unreachable; bomb moved one tile down.',
    apply: (lv) => moveBomb(lv, [4, 4], [4, 5]) },
  58: { why: 'The exit (6,1) was inside the wall column x=6; the wall now leaves the exit open.',
    apply: (lv) => rmWall(lv, [6, 1]) },
  90: { why: 'Switch and apple shared (6,1); switch moved to (7,1).',
    apply: (lv) => { lv.devices.find((d) => d.type === 'switch').cell = [7, 1]; } },
  100: { why: 'Bomb sat on the ice strip and a portal endpoint shared the switch cell; bomb moved to (4,5), portal endpoint to (7,3).',
    apply: (lv) => { moveBomb(lv, [4, 6], [4, 5]); const p = lv.devices.find((d) => d.type === 'portal' && d.cells.some((c) => cellEq(c, [6, 2]))); p.cells = p.cells.map((c) => (cellEq(c, [6, 2]) ? [7, 3] : c)); } }
};
