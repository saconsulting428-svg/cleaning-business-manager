# Snake Fruit Rush - 100 level campaign (built into the original game)

`../Fruit_Rush_Snake.html` is the original game with a 100 level puzzle campaign added. Board (20x26, 22px cells), snake size, continuous movement,
swipe/tap/keyboard controls, fruit art, skins, themes, sound, haptics, coins and the localStorage save (`snakeFruitRush.v1`) are unchanged.
The original modes still work (home screen > **Endless**).

## What was added
* Level select (home > **Play** continues, **Levels** opens the map): 5 worlds x 20 levels, locked / open / cleared tiles, 1-3 stars per level.
* Worlds: Garden (1-20) walls, Desert (21-40) bigger layouts, Ice (41-60) forced sliding, Volcano (61-80) bombs, Night (81-100) keys + doors, switches + gates, portals, combined with bombs, ice and walls. Level 100 combines everything.
* Obstacles: walls (deadly), ice (cannot steer until you stop; a wall or the border stops you safely), bombs, key -> door, switch -> gate, paired portals, exit (locked until all fruit is eaten).
* Levels 1-5 teach: straight line, a wall, a path around walls, a deliberate turn, fruit + wall + exit. Short contextual hints appear on levels 1-5, 41, 61, 81, 84 and 87.
* Pace: every level has its own speed (179 ms per cell on level 1, 120 ms on level 100; the original endless mode is 150 ms) and a short READY/GO beat.
* Progress (highest unlocked, current level, stars) is stored in the existing save under `camp`; old saves load unchanged.
* Testing aid: open the HTML with `?unlock=1` to open every level (nothing is saved by it).

## How levels are made and checked
`work/gen.mjs` builds each level route-first (a self-avoiding path with straight runs of at least 3 cells, fruit on the path, walls / ice / bombs / devices placed around it
with a safe zone at the start). Every level is replayed in the rules engine (`work/camp-engine.js`, the same file the game contains) and must win.
`work/validate.mjs` then loads the shipped HTML and checks all 100 levels with the game's own decoder + engine:
valid structure, safe start (survives 5 ticks straight), the route wins with every fruit eaten and 3 stars, exit/fruit/keys/switches reachable,
door / gate / portal really necessary (flood fill without them cannot reach the exit), nothing deadly next to the start lane, shortest straight run >= 3 cells
(>= 456 ms between decisions), longest level 18 s.
`work/bot.mjs` plays all 100 levels in the real game in a browser (turns via the game's input function): 100/100 won with 3 stars, unlock chain and save checked.
`work/t_camp.mjs` covers saves (fresh, old, corrupt), locked levels, fail / retry / pause / keyboard / swipe / tap, Endless mode and level 100.
Per level numbers: `LEVELS.md`, `validation.json`.

## Rebuild
Copy `work/` to a folder, `node export.mjs && ./build.sh out.html` (needs Node 22; tests need Playwright).

## Movement and performance (v2.8)
* Renderer: WebGL is tested first on a throw-away canvas (software-only WebGL is rejected because it is slower); devices without a real GPU get Canvas automatically. No URL parameter is needed (`?canvas=1` / `?webgl=1` only force one for testing).
* Movement keeps the original design (one cell per tick, drawn interpolated). A turn made part-way into a step starts from where the snake is drawn right now, so nothing jumps; the head cuts the corner smoothly and eases its look direction. After a wrap-around or a portal the snake slides in from the edge instead of freezing for one step.
* Swipes: 15 px threshold, one turn per swipe, long swipes never repeat, diagonals follow the stronger axis, queue of 2. Frame safety: at most 2 steps per frame and a 50 ms cap per frame, so a freeze never produces a burst of moves.
* The resolution is chosen once at launch (2x by default). If a session of 10 s of play averages slower than ~37 fps the lower value (1.5x, then 1.25x) is saved for the NEXT launch; it never resizes during play. `prefers-reduced-motion` reduces particles and decorations; the snake still glides.
* `work/t_polish.mjs` checks all of this (steady speed, turns, swipes, long snake, bounded effects, no leaks after 80 restarts, 6x slower CPU, freeze).
