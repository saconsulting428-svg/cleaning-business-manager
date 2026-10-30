# HUSH 1.3.0 (v9): hazards, health, small creatures, set-pieces, chapter looks, tactical map

Nothing was rebuilt: the same generator, AI, monster, UI style, saves and 40 levels. New content is additive and checked by the generator's own solver.

## 1. What was added
- **Obstacles and hazards** (levels 4+, never on the 3 tutorial levels): live sparking cables, steam vents, leaking pipes with a puddle, loud debris, fallen shelves (solid), collapsed passages in optional loop corridors (solid), damaged doors (louder), small flooded patches.
- **Hiding**: not every room has a locker any more (start room + about 55% of the rooms on levels with creatures). Variants: metal locker, wide storage cabinet, dark alcove behind a shelf frame.
- **Health**: 100 HP, bandage +15, medkit +30, small HUD bar (top left, only when hurt), red hit flash, camera kick away from the source, 0.6 s stagger (half speed) and a stuttering torch on every hit, heartbeat under 35 HP.
- **Small creatures**: crawler (floor) and dropper (ceiling ambush), your Meshy "Bloodfang Stalker" GLB reduced to 4k triangles / 512 px / 217 KB, 0.36 scale.
- **Set-pieces** (8 of 40 levels), **map redesign**, **chapter looks**, 12 new procedural sounds, 6 new one-time tip cards.

## 2. Set-pieces (level number, 1-based)
L8 Security Office power failure + distant impact; L12 Crawlspace the main creature's eyes far down the corridor with flickering lights; L17 Thin Walls machinery suddenly starts somewhere; L22 Generator Room starting the generator blacks out the lights and is heard everywhere; L27 Two of Them a loud distant metal impact; L31 Containment entering the cell room: lights die, door-slam thud, the small creature wakes; L35 The Shaft lights stutter when a creature is close (not hunting); L39 The Source after you take your first item, the first creature starts a short hunt.

## 3. How obstacles work
- Timed (never solid): sparks fire for about 1 s every 3.6-5.2 s with a flashing warning first (12 damage, noise 7, wait or cross in the quiet window); steam (3.6 s on, about 8 s off; while you stand in it creatures see half as far, the fog thickens); leaks drip (sound only); debris makes a step louder (radius 8, 3 when crouching).
- Solid (fallen shelf, collapse): placed only where all walkable floor stays one connected piece, collapses only on optional loop corridors. The generator then re-runs its solver and the lock-bypass check.
- Damaged doors: open noise x1.7.

## 4. Health
Hazards and small creatures only. The main creature is untouched: one catch still ends the run at full HP. Healing items are walked over and only used when hurt (otherwise "health is full", they stay). 0 HP from a hazard = game over. HP resets each level; saves are unchanged.

## 5. Small creatures
16 levels have one or two (never more than 2). They wake by walking range (sprint 8, walk 4.8, crouch 2.2 tiles; droppers 1.5 under them), chase at 3.0 tiles/s (faster than a sprint), bite for 8 (dropper's first bite 10) with 1.1 s between bites, flee after 2 bites or 8 s and lurk again. They cannot open doors (close one behind you) and do nothing to you in a locker or vent. Every bite is noise 9, so the main creature comes to investigate. They cannot be killed: no weapons.

## 6. Chapter looks
Chapter 1: reception/office/security/storage rooms, dusty beige tint, failing fluorescent tubes. Chapter 2: lab/observation/specimen/medical/control rooms, cold teal tint, glass specimen tanks and jars, red emergency lamps, more clutter. Chapter 3: tunnel/generator/pump/maintenance/machine/cells rooms, rust tint, ceiling pipe runs, more clutter; the walls keep the existing red "nest" texture, so it reads as infested industrial rather than plain industrial. Checked on screenshots of levels 6, 9, 18, 21, 30, 34: the three chapters now look clearly different; levels inside a chapter differ in palette (existing 'look'), room mix, clutter, hazards and hiding spots.

## 7. Map
Blueprint schematic: explored rooms with wall lines and inner shadow, tint per room and names; unexplored space only a ghost (the layout is not given away); locked doors with colour-coded lock icons; icons for exit, key/card/fuse, generator, valve, breaker, note; hiding places and collapsed passages once seen; a glowing pulsing next objective; flowing amber route chevrons; view cone and halo for YOU; compact legend; "NEXT: ... about N steps (direction)". The main creature appears only while a sonar pulse reveals it. Map data and route use the same tiles and doors as the game (the route avoids solid obstacles and unrevealed hidden doors). No allocation per tile; redrawn 5x per second only while open.

## 8. Performance (software WebGL here, relative only)
Extra draw calls from the new content: about +16 to +36 per frame (levels 17/28/32/40: 178->198, 158->194, 142->158, 260->284), triangles +6% to +14% (about +12k to +21k). Hazard effects are hidden while idle, static pieces are merged, there are no new real-time lights and no new post-processing. Small creature: one 4k-triangle shared mesh and two eye sprites each. Not measured on a phone.

## 9. Tests
tests/v9.mjs (689 checks): all 40 levels solvable and connected with the new content; objectives reachable; hazards/pickups/small creatures on reachable floor; no hazards near the start; tutorial levels clean; health, healing, death; hazards; debris noise; small creature wake/bite/flee, closed door stops it, locker safe; all 8 set-pieces fire. Existing suites: gen, ai (17/17), story, qa, play (40/40), patrol (0/47 bad), fuzz (no invariant violations); browser: glb, monster, ui, layout, v7, qa, 40 levels in the real page (page errors 0).
A bug found by the real-page run and fixed: the Containment set-piece read a room kind while the player was between rooms.

## 10. Remaining issues
- No phone measurement of performance or audio.
- The small creature model has no skeleton (procedural scuttle only), so its legs do not animate.
- The sighting set-piece is a pair of red eyes plus flicker, not a full model behind glass.
- Chapter 3 keeps the red nest walls.
- Balance against a human player is unproven (bots only).

---
# 1.3.2 follow-up: one graphics tier, stuck hints, strike, light

- **Graphics**: the Graphics setting (Auto/High/Medium/Low) is gone. Every device now uses one tier tuned for phones: cheap lit materials with normal maps, no shadow pass, two pooled lamps, 1.5x pixel-ratio cap, and the dynamic resolution scaler (down to 0.6x, back up with headroom) stays on as the safety net. Old saves are accepted (the old value is ignored). In an emulated phone page (915x412, DPR 2.75, touch) on software WebGL the median frame time went from about 246/255 ms to 232/216 ms on levels 17/32 (p90 on level 32: 512 -> 282 ms). Software WebGL is not a phone GPU: this only shows the direction, not the real frame rate. No real phone was available here.
- **Stuck hints** (new, `src/ui/stuck.js`): if there is no progress for 50 s (no new area explored, no objective step, no item, no door opened, no switch), a HINT appears in the hint bar and gets plainer: 50 s what to do, 105 s plus distance and direction, 165 s plus the objective markers lit in the world for 5 s; then again every 70 s. Time spent hiding or hunted does not count. The text comes from the real state (current objective step, a locked door next to you and what it needs, a collapsed passage, a live cable, low health with a bandage around, a creature on the hunt). The Objectives panel has a "Stuck? Give me a hint" button. Controlled by the existing Hints setting; the tutorial coach is not interrupted.
- **Bug found while testing the hints**: the map route could not reach goals that sit on a solid tile (exit, valve, breaker, generator) since the 1.3.0 solid-aware route; fixed.
- Earlier in 1.3.1: lunge strike (2.4 tiles, 0.55 s burst, catch only if still inside 1.7), brighter exposure/ambient, soft wide torch beam with a new torch model, level look colours restored (chapter tint reduced to 25%).

---
# 1.3.3: fairness pass (level 9 "monster eats you the moment you step in front")

**Cause on level 9 (and many others)**: the generator put a creature wherever it liked. An audit of the 1.3.2 layouts with the new rules found: **25 of 40 levels** had a creature starting within 1 to 3.2 tiles of something you must reach (level 9: the keycard was 1.0 tile from the sentinel); **33 levels** had no hiding place in the room of a creature or of a required object (my 1.3.0 change that thinned the lockers made this worse); **all 10 sentinel levels** had no route to the objectives that stays out of the sentinel's reach. On top of that, since 1.2.0 a creature that saw you charged at once from any distance, and an alarm told every creature the second you took an item.

**Fixes (nothing removed, no creature made weaker):**
1. Generator rules, enforced at generation time (the generator retries the layout until they hold): a creature never starts within 3.6 tiles of a required object (sentinels 5.0, or 7.5 on alarm levels without a radio; 3.4 on radio levels where luring it is the plan); never within 7 tiles of the start nor in view of it within 14; every sentinel leaves a route to every objective and the exit that keeps 3.6 tiles from it (crouched with the torch off a sentinel sees about 2.7 tiles and hears 1.7); every room that holds a creature's post or a required object has a hiding place; a locker or vent is within 7.5 tiles of every generator, valve, breaker and, on alarm levels, every item.
2. Graded detection: right in its face (under 3.4 tiles) or while you sprint, a creature still charges at once. Seen from farther away it first NOTICES you (it stops, turns, the SUSPICIOUS warning shows): 0.7 s at 3.4 tiles up to 2.4 s at 8+ tiles. Break the line of sight, crouch or hide and it forgets you; when the warning fills it charges at full speed, as before. New one-time tip "IT NOTICED YOU".
3. Alarm: the siren starts when you take the item, the creatures are told 2.5 s later (time to get out of sight).
4. Presence warning: when an unaware creature is within 8.5 tiles (even behind a wall) and you are walking, the banner says SOMETHING IS CLOSE: CROUCH TO STAY QUIET, and a faint arrow points toward it.
5. A creature that has come to look at a running generator is no longer re-called by its hum every 4 s (it used to camp the generator, and you, forever).

**Tests**: `tests/fair.mjs` (438 checks over all 40 levels: distances, start safety, hiding places, quiet route, notice timing at 3/6/7.5 tiles, hunt speed below sprint speed on every level); `tests/sneak.mjs`: a bot that crouches near sentinels, keeps out of their reach and hides when a guard is stirred finishes **all 12 sentinel levels, 36/36 runs**, and was never even noticed in 27 of them.
**Honest limits**: levels with roaming creatures (stalkers, listeners) are still deadly once a creature has noticed you and sees you enter a locker: there is no guaranteed escape from that, by design. My careful-player bot for those levels still wins only about 16% (it is a crude bot), so how hard the roaming levels feel to a human is not proven by anything here.

---
# 1.4.0 (v10): 50-level campaign, new 3D objects, torch selection, campaign map

**Levels**: exactly 50 (Ch1 Abandoned Facility 1-17, Ch2 Flooded Section 18-34, Ch3 The Nest 35-50), generated from the design document: names, hints, room routes, gates, creatures, one fear beat per level (see `src/logic/levels.js`, `beats.js`). The generator builds rooms in route order, so every level has its own named rooms and sizes (`rooms.js`); level 46 has a decoy exit. Saves from 30/40-level versions are migrated proportionally (nothing re-locks).
**Campaign map**: a scrolling winding route with chapter bands, node shapes by level type, stars/done/open/locked connectors, chapter tabs, a level panel (route, objective, best, Play) and a non-playable COMING SOON node after level 50 ("More of Halden Station is coming. Your progress is saved."); it is not a level and not counted. The in-game tactical map shows the route's room names.
**3D objects**: new vertex-coloured asset library (`objects3d.js`, `dynamic3d.js`, `extras3d.js`): furniture, electrical, industrial, doors, vents, lockers, keypads, breakers, valves, generators, with animated interaction (door swing, locker door, breaker flip, valve wheel, keypad display, generator fan). **Torches**: 5 distinct models with beam/range/spread/stealth differences, unlocked by progress, selectable in the Bag, saved.
**Tests**: gen 50/50; fair 505 pass; ai 17/17; story 9/9; qa 42/42; v9 839/839; v10 11/11; play: all 50 completed via real logic; page.cjs: all 50 levels in the real page, 0 page errors, 60-100 draw calls; ui 41/41; glb 18/18; monster 23/23; layout 21/21; v7 18/18; fuzz no invariant violations; patrol 0/62 bad.
**Not good / not verified**: sneak bot (crude) fails levels 7, 11, 35 (dies to guards) and times out on 42; I did not dig into whether a human can pass them. Per-level ceiling height and corridor width are not varied. There is no battery system (torch stats only). The small creature has no skeleton. Several beats share mechanisms. No phone measurement of performance or audio; software-GL screenshots show relative looks only.
