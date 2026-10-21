# HUSH-FP v7 (1.1.0): gameplay overhaul round

## Changes (as requested)
- **One difficulty**: the Difficulty setting is gone. Creatures get sharper level by level (`levelDiff`, sight 0.8x -> 1.1x, alert 0.78x -> 1.12x, speed 0.9x -> 1.04x). Adrenaline: while hunted, sprint stamina lasts 2.4x longer. Quiet safety net: each death on a level makes that level's creatures 10% / 12% / 3% duller (max 3 deaths, resets on the next level). Not an option, never shown.
- **Smoother movement**: touch look is low-pass filtered (45 ms), head bob fades in/out (no snapping), a second bob harmonic, lean into sidesteps, +5 degree FOV kick while sprinting.
- **Less lag on High**: pixel-ratio cap 2.5 -> 1.75, flashlight shadow map 1024 -> 768 refreshed every other frame, only the nearest monster casts a shadow, dynamic resolution now works on every graphics setting (tier downgrade still only on Auto).
- **Variety**: every level has its own look (12 palettes: fog / lamp colour / wall tint / flicker; consecutive levels never share one), each level uses its own set of room types (8 / 6 / 6 room kinds per chapter with their own signs, tints, landmark props), new objective **breakers** (flip all switches; 8 levels use it), new obstacle **alarm** (first key/card pickup alerts every creature; 10 levels), gate lists reshuffled so objectives differ level to level.
- **Tutorial**: levels 1-4 run a guided coach (walk, look, flashlight, map, doors / sonar, noise, hidden doors / keys, inventory, locked doors, crouch / guard, hiding, keycard), each step completes when the player really does it (tap the box to skip). 15 one-time "NEW" cards when a mechanic first appears (sprint, glass, water, vents, radio, codes, generators, valves, breakers, alarms, logs, stalker, listener, lights out, being hunted). Hints setting turns them off.
- **Map**: MAP button (or M). Shows floor plan (seen areas brighter), doors (locked ones coloured), you, the exit and the CURRENT objective (key, card, fuses, generator, valve, breakers, note, hidden door ?). Props, lockers, vents and creatures are never drawn.
- **Obstacles to the exit**: more gates per level in later levels, alarms, glass, water, blackouts, hunted starts, breakers; creatures stay beatable (below).

## Honest limits
- "Not unbeatable" is NOT proven for human players. Evidence: all 40 levels solvable and completable; the solver proves routes; sprint (2.7 t/s) outruns every hunt speed; lockers in every room; fuzz of 850 game-minutes found no invariant violation. But my careful-player proxy bot (`stealth.mjs`) wins only ~16% and a "run and hide when hunted" policy (`escape.mjs`) survives a hunt started at 4-6 tiles only ~10-40% of the time. These bots are crude (they walk through guards, stall at doors) and I cannot say how real players fare. The quiet safety net exists because of that uncertainty. Please playtest levels 4-13 first.
- High-graphics smoothness was reasoned and reduced by settings, not measured on a phone.
- New looks are palettes and room types, not new geometry; levels still share the same generator.
- "Rooms clearly visible": ambient light was not raised; the map and landmarks are the aid.
- Audio not listened to; no real-phone test.
