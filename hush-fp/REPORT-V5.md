# HUSH-FP v5 (file: `HUSH-FP-v5.html`): GLB creature

Only the creature's **visual implementation** changed. AI, levels, story, UI, audio, saves, controls are untouched (the only edits outside the render layer: `main.js` loads the model at boot and exposes test hooks; `gen`/`world`/`ai` were not touched in this round).

## What was done
- Supplied `Meshy_AI_Ashen_Spinefiend_All_Animations.glb` (205k triangles, 3 x 2048 px JPEG, 20 MB) was optimised once with `tools/optimize-monster.mjs` (gltf-transform + meshoptimizer simplify + 1024 px textures) to `src/assets/monster.glb`: **28.7k triangles, 22.6k vertices, 66-bone skeleton, 7 clips, 2.4 MB**. Rig, weights and animation data are the original ones; only the mesh was decimated and the textures downscaled. (The original file is not stored in the repo.)
- `src/render/monster_glb.js`: GLTFLoader.parse of the embedded binary (no network), one shared template; per creature only a SkeletonUtils clone + AnimationMixer. Geometry, material and textures are shared and flagged so the per-level dispose does not free them. The sonar ghost is a second SkinnedMesh on the *same* skeleton (no extra bones or mixer). Fallback: if the GLB fails to parse, the old procedural creature is used.
- Clip mapping (visual only, driven by the unchanged AI state): stationary (waiting, searching, sniffing) -> **Alert**; moving at roam/investigate speed -> **Walking** (**Casual_Walk** if very slow); hunting -> **Running**, **RunFast** when within 5.5 tiles (hysteresis to 8); catching the player -> **Attack** (once); hunt roar while standing -> **Skill_03** (once).
- Planting / sliding: the clips are in place (no root motion). At load every clip is sampled: the 15th-percentile lowest foot-bone height gives a per-clip height offset (feet on the floor at contact), and the stance-foot speed gives the clip's natural ground speed; playback speed = real creature speed / natural speed (clamped 0.55-1.8), 0.25 s cross-fades, stride phase kept between locomotion clips. Scale per variant: stalker 1.2, sentinel 1.3, listener 1.15 (model is 1.7 m).
- Look: the supplied textures are bone-pale and the flashlight blew them out to white, so the material is a low-specular physical material with a darkened tint (still the model's own textures and normal map). Two additive red glow sprites mark the eyes (sentinel blue-white, listener none).
- Mobile: `medium`/`low` quality use a Lambert material (no PBR), shadows only on `high`; render resolution / adaptive quality are the existing ones.

## Tests on this build
`glb.cjs` 18/18 (real page, browser context set offline: loads; idle=Alert; walking; Running; RunFast; Attack; state/clip consistency under the real AI; feet planted; faces its heading; playback speed not clamped; catch -> Attack -> death overlay -> retry; no console errors/warnings; no network requests; procedural fallback with `?noglb=1`). Also `ui.cjs` 41/41, `monster.cjs` 23/23, `layout.cjs` 21/21, `gen/play/ai/story` all pass, and **all 40 levels were completed in the real page, 0 page errors**.

## Honest limits
- Software GL only: **no real phone frame-rate measured**. Cost: each creature is ~29k triangles (was a few thousand); levels with 3 creatures report up to ~113k triangles per frame in the test counter (which includes the high-quality shadow pass).
- The model is much better than the procedural one, but its textures were downscaled to 1024 px and the mesh decimated to ~14% of the triangles; close-ups show some softening.
- Animation clips are the supplied ones; foot sliding is minimised, not eliminated (clips have no root motion, speed matching is an estimate). Head look-at was not added.
- Skill_03 is used for the hunt roar (my choice; you did not map it). Casual_Walk is used for very slow movement.
- Audio was not changed and not heard by me.
