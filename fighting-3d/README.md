# Street Clash 3D — Phase 2 playable prototype

Real-time 3D fighting game (Three.js / WebGL2). Runs in any modern browser, Android Chrome, and can be wrapped for Play Store (Capacitor/TWA).

**Play:** open `street-clash-3d.html` (single self-contained file, works offline) in Chrome/Edge.
**Dev:** `npm i && npm run build` (esbuild bundles `src/` into the single HTML).

## What is in this milestone
- 2 fully 3D, IK-rigged original fighters (KAIRO – martial artist, DRAVEN – kickboxer w/ long coat), data-driven so more can be added (`src/moves.js` ROSTER).
- Neon rooftop arena: wet reflective floor (planar reflections), skyline, rain, steam, flickering fire barrels, PBR + shadows + bloom + grading.
- Real combat: light/heavy punches & kicks, strings (F,G / V,B), launcher, low sweep, 2 specials per fighter, jump kick, blocking (high/mid/low rules), dash, sidestep (dodge), knockdown/get-up, combo scaling.
- Hit detection uses the **actual limb tip** touching rig-based hurt capsules (head/torso/legs) — attacks whiff if the animation does not reach.
- AI with Easy/Normal/Hard/Expert (reaction delay, block, punish, dodge, combos), per-fighter profiles.
- Round system (best of 3), timer, KO slow-mo, victory poses, result screens.
- Tournament (Arcade): auto next opponent (no repeats), rising AI difficulty, VS screen, save/continue, champion screen.
- 2-player local versus (keyboard x2, 2 gamepads), Training mode, Settings (quality, audio, rounds, timer, key remap), pause + move list, touch controls.

## Controls (default, remappable in Settings)
| | P1 | P2 |
|---|---|---|
| Move / crouch | A D / S | ← → / ↓ |
| Sidestep | W (away), E (near) | ↑, Num 6 |
| Jump | Space | Num 0 |
| Block | Left Shift (+S for low) | Num 3 |
| Light/Heavy punch | F / G | Num 1 / Num 2 |
| Light/Heavy kick | V / B | Num 4 / Num 5 |
| Specials | ↓→ + G, ↓→ + B | same |
Gamepad: stick/D-pad, X/Y punches, A/B kicks, LB block, RB jump.

## Honest status / limits
- Characters are procedural 3D (tube/lathe meshes + IK), not sculpted scans: readable, stylised-realistic, **not AAA photoreal**. For true AAA fidelity you need artist-made rigged models + mocap animation (Blender/Mixamo-style pipeline, glTF) — the rig/combat code is built so imported skinned models can replace `Rig`.
- Only 2 of 30 fighters and 1 of 3 arenas are done (by design: combat first). Roadmap: Phase 5 roster, Phase 6 arenas/audio/polish.
- Tested headless (software GL) for logic, flow, input independence and visuals; real-GPU frame rate was **not** measured.
