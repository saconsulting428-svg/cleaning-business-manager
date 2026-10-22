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
