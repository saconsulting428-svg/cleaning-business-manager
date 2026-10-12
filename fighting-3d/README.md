# Street Clash 3D — Phase 2 playable prototype

Real-time 3D fighting game (Three.js / WebGL2). Runs in any modern browser, Android Chrome, and can be wrapped for Play Store (Capacitor/TWA).

**Play:** open `street-clash-3d.html` (single self-contained file, works offline) in Chrome/Edge.
**Dev:** `npm i && npm run build` (esbuild bundles `src/` into the single HTML).

## What is in this milestone
- 2 fully 3D, IK-rigged original fighters (KAI – mixed martial artist, DRAVEN – kickboxer w/ long coat), data-driven so more can be added (`src/moves.js` ROSTER).
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


---
# KAI — hero fighter (production pipeline notes)

**What KAI is:** a fully playable, procedurally-built 3D character (`src/kai.js`), original design inspired by the supplied concept sheet:
messy black hair, open black leather combat jacket with gold dragon embroidery (generated PBR leather + bump map), black tank, belt with ornate buckle,
torn red sash strips (cloth simulation), armoured fingerless gloves + bracers, knee guards, thigh straps, laced combat boots, chain necklace.

**What it is NOT:** it is not a sculpted/scanned photoreal model and it does not match the concept art pixel-for-pixel. A concept image cannot be turned into a
production mesh automatically; for that fidelity use a sculpt/retopo/bake pipeline (see below).

## Assets (`assets/kai/`)
- `kai.glb` — KAI exported from the engine (glTF 2.0, PBR materials, node hierarchy in a standing pose). Rigid-part hierarchy, **not skinned**.
- `textures/` — `jacket_albedo.png`, `jacket_bump.png`, `sash_red.png` (the embroidery/leather/cloth maps).
- `kai_turnaround.png`, `kai_expressions.png`, `kai_animation_sheet.png`, `kai_portrait.png` — renders from the in-game Character Viewer.
- Two LODs from one definition: **game** (low-poly, used in fights) and **hero** (high-poly, used for select/viewer/cinematics) — `Rig(spec, {lod})`.

## Rig & animation
- Humanoid rig: pelvis/spine/chest/neck/head + 2-bone IK arms & legs (hand/foot targets). Poses are keyframed targets, blended by the engine (`src/moves.js`, `src/fight.js`).
- Implemented: fighting stance, walk forward/back (speed-driven foot phase → no foot sliding), sidestep/dodge, light/heavy punch, front kick, roundhouse,
  uppercut, sweep, 2 specials, jump kick (rise/fall/land), block + crouch block, 3 hit reactions, knockdown + get-up, victory (3 variants), defeat/KO.
- Facial animation: eyes (lids), brows, jaw/mouth, smirk — presets Neutral / Angry / Shouting / Focused / Smirk / Serious / Pain / KO, driven by combat state.
- Combat: real hitboxes (limb tips) vs hurtboxes (head/torso/legs), damage, blocking, recovery, chain timing, knockback, launch/knockdown.

## Character Viewer
Main menu → **CHARACTER VIEWER**: front/left/back/right/3-4/face/close-up/turntable, expression buttons, all animations, drag to orbit, wheel to zoom, **EXPORT GLB**.

## Recommended route to true AAA fidelity (legit tools)
1. Sculpt/model KAI in Blender/ZBrush (or commission it) → retopo → bake normal/AO → texture in Substance Painter (leather + gold embroidery).
2. Rig in Blender (Rigify) or auto-rig with Mixamo / AccuRig; add facial blendshapes (ARKit 52).
3. Animate with mocap (Rokoko/Move.ai/Mixamo) + hand polish; export glTF/GLB.
4. Load with `GLTFLoader` and map bones to `Rig` joints (the combat code only needs head/hip/neck/hand/foot/knee positions).

## Measured (headless software-GL, not a real GPU)
- KAI hero LOD ≈ 80k triangles (GLB, 47 materials, 10 textures); in-game LOD ≈ 33k triangles. The game LOD is **not** yet aggressively optimised.
- Integration test: KAI vs DRAVEN (AI vs AI, Hard) ran full 3-round matches with hits, blocks, specials, KO, round end and match end; no runtime errors.
- Known weak spots: face/hair are stylised (cartoon-ish), skin is flat, GLB is rigid parts (not skinned), real-GPU FPS not measured.
