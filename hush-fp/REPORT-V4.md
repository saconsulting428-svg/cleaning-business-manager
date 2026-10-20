# HUSH-FP v4 (file: `HUSH-FP-v4.html`)

Technology decision: stayed on Three.js/WebGL in one offline HTML file. It already runs the full game (30 Hz fixed-step logic, noise/AI, sonar shader, touch controls) on Android browsers, and nothing in this environment (no asset downloads, no DCC tools, no device) would let me ship a heavier engine with better results. **All visuals are still procedural** (generated textures, SDF-meshed creature, merged primitive props). It is not photoreal and not equal to a studio-modelled asset pipeline.

## What changed in v4
- **40 levels in 3 chapters (13 / 13 / 14):** 10 new levels placed by difficulty (Reception, Security Office, Observation Deck, Pump Station, Short Circuit, Flood Gate, Containment, Egg Chamber, Breach, The Source). Level 40 is Extraction. Saves from the old 30-level numbering will not line up (stars are per level index).
- **Story:** one recovered terminal/log per level (40 documents, `src/logic/story.js`), a glowing terminal model in the level, readable overlay, saved per level, "logs n / total" on chapter cards, optional line in the objectives panel, and an epilogue on the level-40 win screen. Arc: Halden Station, creatures that hatch to and hunt by sound, the sonar probe is the call that wakes them, the Nest, Halden's real plan, leave the probe behind.
- **Creature:** darker charcoal skin (no more pink sheen), thinner red veins, longer claws (hands 0.46 m, feet 0.24 m), bigger spine spikes plus a neck mane, calmer lunge pose, lower self-lighting so it stays partly hidden. Variants still stalker / sentinel (blue-white eyes) / listener (eyeless, big ears).
- **Hiding:** a creature that reaches your locker now stops, turns to it, breathes and growls for ~3-4 s and moves on if it did not see you enter (it still opens the locker if it did).
- **Scare director (visual + audio only):** every ~30-60 s while not hunted: lights-out flicker, distant metal thump / creak, or a pair of red eyes far down a corridor that blinks out.
- v3 features kept: room kinds/landmarks, sonar cooldown + markers, inventory/objective panels, UI art.

## Verified on this build
`tests/gen.mjs` 40/40 solvable · `play.mjs` 40/40 through game logic · `ai.mjs` 17/17 · `story.mjs` 9/9 (40 levels/logs/story, log reading, locker sniff) · `ui.cjs` 41/41 · `monster.cjs` 23/23 (real page: lifecycle, sonar, panels, log overlay, director beats, level-40 epilogue) · `layout.cjs` 21/21 · `page.cjs`: all 40 levels completed in the real page, 0 page errors. Screenshots of the creature variants and level select reviewed.

## Not done / not verified (be aware)
- No real phone run: **performance on Android is unmeasured** (software GL only; 37-141 draw calls, up to 64k tris per level).
- **Audio never heard by me.** No new sound assets; the procedural set (footsteps, breath, growls, claws, drips, heartbeat, radio static, generator) from earlier rounds is unchanged.
- Not photoreal: no high-resolution authored textures, no reflections/probes, no volumetric fog beyond exp-fog + the flashlight cone, no real glass/water refraction.
- Creature is a procedural model, improved but not a hand-sculpted asset. Eyes do not react to the flashlight; no flashlight shake; battery never drains (by design).
- Chapter environments are differentiated by room kinds, tints, props and decals, not by unique hand-built set pieces; reception/lab/security rooms are named kinds (storage, office, machine, vault...) rather than bespoke layouts.
- Stealth balance unverified with real players (a careful-player proxy bot wins ~29%).
- Level pacing suggestion (1-10 learning, 11-20 flooded, 21-30 blackouts, 31-39 nest) is only loosely followed: chapters are 13/13/14 and blackout levels are spread through chapter 2 and 3.
