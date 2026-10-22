# HUSH 1.2.0 (v8): bigger monster, sharper AI, 2D map

Changes
- Monster: GLB scale raised (stalker 1.2->1.55, sentinel 1.3->1.7, listener 1.15->1.45; about 2.5-2.9 m tall). Blob shadow enlarged to match.
- Hearing: footstep reach is now walk 5.5 / sprint 11 / crouch 2 tiles (was 4.2 / 9 / 1.6), scaled by each creature's hearing (listener best). Anything outside that walkable range is not heard. Footsteps very close to a creature (inside 40% of the reach, not crouched and not hidden) make it turn and charge at once.
- Sight: no more slow "suspicious" ramp. The moment a creature sees you (in its view cone, line of sight, and sight range) it starts the hunt and runs at full speed. Crouching, darkness and hiding still shrink sight range as before.
- Speed: hunt speed stalker 2.3, sentinel 2.2, listener 2.1 (were 2.1/2.0/1.95), still scaled by the per-level factor (0.94 -> 1.02). Sprint is 2.7, so sprinting still outruns it. Catch reach 1.0 tile, attack animation starts at 1.9 tiles so the strike is no longer late.
- Map: blueprint style plan with wall outlines, room tints and room names (once visited), door frames coloured by lock type with a lock dot, a dashed animated ROUTE from you to the next objective with arrows, bigger YOU marker, EXIT and objective markers, and a "NEXT: ... about N steps (direction)" line above the map. Props, creatures and obstacles are still not shown.

Tests (this machine, Chromium with SwiftShader, Node)
- gen 40/40, play 40/40 levels completed, ai 17/17 (the "suspicious then hunt" test was changed to "hunt starts at once"), story 9/9, qa 42/42, patrol 0/47 bad, fuzz no invariant violations (160 runs).
- glb 18/18, monster 23/23, layout 21/21, v7 18/18, ui 41/41 (one earlier run had a flaky door-tap failure while other tests ran in parallel; it passed when re-run alone).

Honest limits
- The crude "hunted player" bot survives only about 7% of hunts now (was 10-40% before this change) and the careful-stealth bot about 14%. These bots are weak (no real hiding judgement), so this does not prove a human cannot win, but it shows the game is clearly harder. If it feels too hard on a phone, lower the hunt speed numbers in `KINDS` (ai.js) or the footstep radii in `updatePlayer` (world.js).
- Audio and phone performance were not measured here.
