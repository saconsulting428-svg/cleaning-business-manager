# Level validation and repair report

The design document's 100 levels were written as a *blueprint*. Every level was parsed into data, run through the real engine and a solver, and checked. Findings:

- **22 levels had coordinate mistakes** (devices inside wall lines, an exit inside a wall, a bomb sealing the only gap, a start pointing straight into a wall, ...). They were fixed (list below).
- **Only 25 of 100 levels made their devices matter.** In the rest a key/door, gate, portal, ice strip or bomb could simply be walked around. A search added the fewest wall segments (in a few levels it also moved a key, switch, gate, bomb or portal end) until every device is on the best route or the only way through.
- **Par and star targets were guesses** (often 2-3x the best route). They are now computed from the solver: 3 stars = a comfortable near-perfect route, 2 stars = about 30% slack, hard caps = best route + 50%.
- **Real-time fairness.** Every route starts with two free ticks, the snake always has 3 clear cells ahead at the start (also after a portal landing), and the stored route never needs more than a few 1-cell zig-zag turns in a row. Where it does, the snake ticks slower (180 ms normally; 195 / 210 / 230 ms on the 20 hardest levels).

Re-check everything with `node tools/validate-levels.mjs` (levels), `node tools/engine-tests.mjs` (rules) and `node tools/browser-tests/bot.mjs` (a bot plays all 100 levels in the real game loop).

## Fixes to the design coordinates

- **L2** - start heading changed (right -> down) so the snake has 3 clear cells ahead
- **L4** - start moved ([2,1]right -> [2,2]down) to get a clear runway
- **L5** - start heading changed (down -> right) so the snake has 3 clear cells ahead
- **L6** - start heading changed (right -> down) so the snake has 3 clear cells ahead
- **L10** - start moved ([2,1]right -> [2,0]right) to get a clear runway
- **L11** - start heading changed (right -> down) so the snake has 3 clear cells ahead
- **L17** - start moved ([2,2]right -> [1,2]down) to get a clear runway
- **L28** - start heading changed (right -> down) so the snake has 3 clear cells ahead
- **L33** - start moved ([2,2]right -> [1,2]down) to get a clear runway
- **L37** - Bomb at (4,4) sealed the only gap (5,4) of the right wall, so the cherry was unreachable; bomb moved one tile down.; start heading changed (right -> down) so the snake has 3 clear cells ahead
- **L38** - removed 1 wall cell(s) that sat under a device/ice tile
- **L42** - The ice strip ended in a gap of the wall, so the snake slid out of the board section; the wall is now closed behind the strip so the slide stops on x=5 as described.
- **L43** - start heading changed (down -> right) so the snake has 3 clear cells ahead
- **L46** - start heading changed (right -> down) so the snake has 3 clear cells ahead
- **L49** - start heading changed (down -> up) so the snake has 3 clear cells ahead
- **L58** - The exit (6,1) was inside the wall column x=6; the wall now leaves the exit open.
- **L62** - removed 1 wall cell(s) that sat under a device/ice tile
- **L63** - start heading changed (right -> down) so the snake has 3 clear cells ahead
- **L86** - removed 1 wall cell(s) that sat under a device/ice tile
- **L90** - Switch and apple shared (6,1); switch moved to (7,1).
- **L94** - removed 1 ice cell(s) under a door/gate/bomb
- **L95** - removed 1 wall cell(s) that sat under a device/ice tile
- **L100** - Bomb sat on the ice strip and a portal endpoint shared the switch cell; bomb moved to (4,5), portal endpoint to (7,3).

## Per level

| L | World | best route | par (2 stars) | 3-star limit | move cap | tick ms | walls added | other changes |
|--:|---|--:|--:|--:|--:|--:|--:|---|
| 1 | Garden | 4 | 8 | 5 | - | 180 | 0 |  |
| 2 | Garden | 12 | 16 | 13 | - | 180 | 0 | snake |
| 3 | Garden | 7 | 11 | 8 | - | 180 | 0 |  |
| 4 | Garden | 18 | 24 | 20 | - | 180 | 0 | snake |
| 5 | Garden | 13 | 17 | 14 | - | 180 | 0 | snake |
| 6 | Garden | 14 | 19 | 15 | - | 180 | 0 | snake |
| 7 | Garden | 11 | 15 | 12 | - | 180 | 0 |  |
| 8 | Garden | 22 | 29 | 24 | - | 180 | 0 |  |
| 9 | Garden | 16 | 21 | 17 | - | 180 | 0 |  |
| 10 | Garden | 15 | 20 | 16 | - | 180 | 0 | snake |
| 11 | Garden | 13 | 17 | 14 | - | 180 | 0 | snake |
| 12 | Garden | 12 | 16 | 13 | - | 180 | 0 |  |
| 13 | Garden | 14 | 19 | 15 | - | 180 | 0 |  |
| 14 | Garden | 20 | 26 | 22 | - | 180 | 0 |  |
| 15 | Garden | 19 | 25 | 21 | 32 | 180 | 0 |  |
| 16 | Garden | 24 | 32 | 26 | - | 180 | 0 |  |
| 17 | Garden | 28 | 47 | 44 | - | 180 | 0 | snake |
| 18 | Garden | 20 | 26 | 22 | - | 180 | 0 |  |
| 19 | Garden | 18 | 25 | 22 | - | 180 | 0 |  |
| 20 | Garden | 20 | 26 | 22 | - | 180 | 0 |  |
| 21 | Desert | 20 | 27 | 24 | - | 180 | 5 |  |
| 22 | Desert | 24 | 32 | 26 | - | 180 | 6 |  |
| 23 | Desert | 17 | 23 | 18 | - | 180 | 4 |  |
| 24 | Desert | 23 | 30 | 25 | - | 180 | 6 |  |
| 25 | Desert | 21 | 32 | 29 | - | 180 | 2 |  |
| 26 | Desert | 15 | 20 | 16 | - | 180 | 1 |  |
| 27 | Desert | 16 | 21 | 17 | - | 180 | 2 | bomb@6,3 moved |
| 28 | Desert | 39 | 51 | 47 | - | 180 | 5 | snake; switch s1 moved |
| 29 | Desert | 32 | 42 | 34 | - | 180 | 3 |  |
| 30 | Desert | 37 | 49 | 39 | - | 195 | 3 |  |
| 31 | Desert | 22 | 29 | 24 | - | 180 | 4 |  |
| 32 | Desert | 23 | 30 | 25 | - | 180 | 0 | bomb@4,5 moved |
| 33 | Desert | 13 | 17 | 14 | - | 180 | 0 | snake |
| 34 | Desert | 18 | 24 | 20 | - | 180 | 3 | bomb@6,2 moved |
| 35 | Desert | 16 | 21 | 17 | - | 180 | 0 | bomb@4,4 moved |
| 36 | Desert | 32 | 42 | 34 | - | 180 | 2 |  |
| 37 | Desert | 27 | 36 | 29 | - | 180 | 0 | snake; bomb@4,4 moved |
| 38 | Desert | 24 | 32 | 26 | - | 180 | 3 | 1 wall cell(s) removed |
| 39 | Desert | 28 | 37 | 30 | - | 180 | 2 |  |
| 40 | Desert | 45 | 59 | 47 | - | 210 | 4 |  |
| 41 | Ice | 7 | 11 | 8 | - | 180 | 0 |  |
| 42 | Ice | 12 | 16 | 13 | - | 180 | 1 |  |
| 43 | Ice | 18 | 25 | 22 | - | 180 | 2 | snake |
| 44 | Ice | 7 | 11 | 8 | - | 180 | 0 |  |
| 45 | Ice | 25 | 33 | 27 | - | 180 | 7 |  |
| 46 | Ice | 25 | 33 | 27 | - | 180 | 1 | snake; bomb@6,5 moved |
| 47 | Ice | 13 | 17 | 14 | - | 180 | 0 |  |
| 48 | Ice | 12 | 16 | 13 | - | 180 | 0 |  |
| 49 | Ice | 20 | 26 | 22 | - | 180 | 3 | snake |
| 50 | Ice | 26 | 34 | 28 | - | 180 | 5 |  |
| 51 | Ice | 12 | 19 | 16 | - | 180 | 0 |  |
| 52 | Ice | 14 | 19 | 15 | - | 180 | 1 |  |
| 53 | Ice | 19 | 25 | 21 | - | 180 | 1 | portal p1 moved |
| 54 | Ice | 16 | 23 | 20 | - | 180 | 0 |  |
| 55 | Ice | 27 | 36 | 32 | - | 180 | 5 |  |
| 56 | Ice | 26 | 34 | 30 | - | 195 | 10 |  |
| 57 | Ice | 14 | 19 | 16 | - | 180 | 2 |  |
| 58 | Ice | 18 | 24 | 20 | - | 180 | 7 | 1 wall cell(s) removed |
| 59 | Ice | 28 | 37 | 32 | - | 180 | 6 |  |
| 60 | Ice | 28 | 37 | 30 | - | 180 | 3 | bomb@4,6 moved |
| 61 | Volcano | 20 | 26 | 22 | - | 180 | 6 |  |
| 62 | Volcano | 32 | 42 | 34 | - | 180 | 7 | 1 wall cell(s) removed |
| 63 | Volcano | 25 | 33 | 27 | - | 180 | 4 | snake |
| 64 | Volcano | 27 | 36 | 30 | - | 180 | 5 |  |
| 65 | Volcano | 19 | 25 | 21 | 32 | 180 | 0 | bomb@4,6 moved |
| 66 | Volcano | 27 | 36 | 29 | - | 180 | 2 | bomb@4,6 moved |
| 67 | Volcano | 26 | 35 | 32 | - | 180 | 11 |  |
| 68 | Volcano | 21 | 30 | 27 | - | 195 | 1 | bomb@4,3 moved; portal p1 moved |
| 69 | Volcano | 33 | 43 | 39 | - | 180 | 3 | bomb@4,5 moved |
| 70 | Volcano | 32 | 42 | 34 | - | 195 | 6 |  |
| 71 | Volcano | 28 | 37 | 30 | - | 180 | 4 |  |
| 72 | Volcano | 34 | 45 | 36 | 54 | 195 | 6 |  |
| 73 | Volcano | 25 | 33 | 27 | - | 180 | 6 | portal p1 moved |
| 74 | Volcano | 31 | 41 | 33 | 50 | 230 | 4 | bomb@6,4 moved |
| 75 | Volcano | 25 | 41 | 38 | - | 180 | 12 |  |
| 76 | Volcano | 36 | 47 | 38 | 57 | 180 | 2 |  |
| 77 | Volcano | 39 | 51 | 41 | - | 195 | 2 |  |
| 78 | Volcano | 20 | 26 | 22 | 33 | 195 | 17 | bomb@4,5 moved; switch s1 moved |
| 79 | Volcano | 33 | 43 | 35 | 53 | 195 | 13 |  |
| 80 | Volcano | 37 | 49 | 39 | 59 | 195 | 5 | key@1,1 moved |
| 81 | Night | 23 | 30 | 27 | - | 180 | 1 | bomb@6,5 moved |
| 82 | Night | 20 | 33 | 30 | - | 210 | 8 |  |
| 83 | Night | 37 | 49 | 39 | - | 180 | 2 | bomb@6,4 moved |
| 84 | Night | 31 | 41 | 33 | - | 210 | 10 |  |
| 85 | Night | 26 | 34 | 28 | 42 | 180 | 10 | switch s2 moved |
| 86 | Night | 41 | 54 | 43 | - | 180 | 6 | 1 wall cell(s) removed |
| 87 | Night | 30 | 39 | 36 | - | 210 | 11 |  |
| 88 | Night | 26 | 34 | 28 | 42 | 180 | 5 |  |
| 89 | Night | 36 | 47 | 42 | - | 180 | 4 | portal p1 moved |
| 90 | Night | 36 | 47 | 38 | 57 | 210 | 8 | switch s1 moved |
| 91 | Night | 26 | 34 | 28 | 42 | 180 | 5 |  |
| 92 | Night | 35 | 46 | 43 | - | 180 | 9 |  |
| 93 | Night | 22 | 31 | 28 | 36 | 180 | 4 |  |
| 94 | Night | 29 | 38 | 31 | - | 195 | 5 |  |
| 95 | Night | 41 | 54 | 43 | 65 | 195 | 4 | 1 wall cell(s) removed; bomb@4,5 moved; switch s1 moved |
| 96 | Night | 25 | 33 | 27 | - | 195 | 10 |  |
| 97 | Night | 26 | 37 | 34 | 42 | 180 | 13 | portal p1 moved |
| 98 | Night | 28 | 39 | 36 | 45 | 180 | 9 |  |
| 99 | Night | 44 | 58 | 46 | 69 | 210 | 17 | switch s1 moved |
| 100 | Night | 36 | 47 | 38 | 57 | 230 | 27 | bomb@4,6 moved; gate g1 moved; switch s1 moved; portal p2 moved |
