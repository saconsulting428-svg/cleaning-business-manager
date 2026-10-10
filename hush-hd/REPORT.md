# HUSH HD - build report

File: `HUSH-HD.html`, **4.74 MB** (4,742,365 bytes), single self-contained file (fonts, sprites, code inline). No network access needed.

## What is implemented
- New engine, written from scratch: fixed 30 Hz deterministic simulation + interpolated rAF rendering; baked tile/sprite caches; no per-frame resampling.
- All **30 original levels** (data copied verbatim, checked equal to the original) in 3 chapters, same objectives, unlock rule, star rules and save format/key.
- All mechanics: sonar (+hidden vents), noise radii, crouch, glass, doors, locked doors/keycards, powered doors/exits, generator, intercom/speaker, lockers, stairs, vents, walls, chase levels, 3 creature types and the AI states roam/investigate/search/return/hunt/attack.
- UI of the original kept (home, chapters, level select, settings, HUD, tutorials, pause, complete, Game Over, reset), plus Graphics Auto/High/Low and landscape/desktop layout.
- Rendering: baked concrete wall/ceiling/floor tiles and props per chapter theme, live doors/lockers/generator/radio/stairs/vents/exit/keycards with emissive status lights, flashlight cone + lamps through a half-res darkness mask, sonar wave that lights a disc and shows creature silhouettes, noise ripples, fog, dust, vignette, hunted red pulse, adaptive quality (drops DPR/effects when frames are slow).
- Animation: survivor run/crouch-walk/idle/use (Y1-Y4 on interact)/caught (X1-X4)/crawl (W1-W6 in a duct view while using vents)/hide; monster run (U), roar (R1-R3 plays while it "stops and stares" as its suspicion fills), idle/search (R1/R2), attack (A1-A4, never rotated or stretched); crossfades between stand/crouch/move.
- Audio: all synthesised, tanh soft-clip + compressor master chain, voice limit, per-cue rate limits; new creature growl/roar voices (positional), ambience, heartbeat, footsteps.

## Test results (all actually executed)
| Test | Result |
|---|---|
| `diff-sim.js` new simulation vs ORIGINAL simulation, 30 levels x 6 input streams | **112,184 ticks compared, 0 mismatches** |
| `regression-sim.js` rules on purpose-built maps (noise radii, sonar, AI cycle, sight, hide, doors, keys, generator, radio, stairs, vents, chase, stars, determinism, blocked creature) | **62/62 passed** |
| `playthrough.js` solver solutions replayed through the real game in Chromium (real tick/input/win/save) | **29/29 levels completed, 3 stars each, 0 console errors** (L1-23, L25-30) |
| `verify-original.js` same 29 solutions on the ORIGINAL simulation | **29/29 confirmed** |
| `levels-load.js` every level loaded and rendered from 3 camera positions | **30/30 loaded, 0 errors/warnings** |
| `regression-ui.js` real UI: boot, tutorial, keyboard, drag, sonar, crouch, USE, pause/resume/restart, tab-hidden pause, win + save, reload persistence, unlock/lock, death + Game Over + retry + menu, settings, reset, landscape | **34/34 passed** |
| `audio-offline.js` all cues rendered offline through the master chain | **no clipping/NaN**; worst single cue -5.1 dBFS, all cues at once -8.4 dBFS, heavy mix -3.2 dBFS |

**Level 24 (Cell Block) was NOT proven playable**: my automated search found no solution for it (also true on the original code; inconclusive, not proof it is impossible). It loads and renders fine. So 29 of 30 levels have been played to completion by the automated player; level 24 needs a human playtest. The solver plays only the stars-optimal "quiet" line, so difficulty/fairness is not assessed by these tests.

## NOT delivered / differences from the brief
1. **Pngs.zip was never received** (only the HTML was uploaded). The sprites in this build are the ones embedded in the original HTML (already transparent, 500-800 px per frame), cleaned by `tools/clean_sprites.py`: halos removed, transparency holes in eyes/flashlight lenses/chest highlights filled, the extra panel in Y3 removed. They were inspected on magenta/white. I did NOT use the true source frames, so the "highest-resolution source" requirement is **not met yet**. `tools/build_sprites_from_zip.py` is written for the real zip (white-key, de-fringe, W6/outlier scale normalisation, baseline registration, anchor measurement). It was tested only on a synthetic zip made from the current art (registration OK on all 8 sheets, bright fringe pixels reduced ~8x, a 1.38x oversized W6 normalised); it has never run on the real files, so expect a review pass when you send the zip.
2. Not tested on real phones/GPUs. Headless Chromium on software GL drew ~15-18 ms/frame at 390x780@2x; that is not a mobile measurement. Adaptive quality exists but its thresholds are untuned. Audio was measured offline, not listened to.
3. Original behaviours kept as they are (found while testing; changing them would alter gameplay):
   - radio/intercom cannot reach the only guard in L11 and L16 (speaker 28/26 tiles away, radio reaches 12); L3's sentinel stands 0.5 tile outside the floor; both are original data.
   - hunters that see you take stairs do not follow (the sight update overrides the follow order in the same tick); they search at the stairs.
   - sound passes through walls and closed doors; lockers are always safe unless a hunter is watching you enter.
4. Visuals are procedural (no external environment images), designed to be sharp at device resolution; they are good but not photographic.
5. Not reproduced from the original: the original's separately drawn procedural character fallback (a plain silhouette fallback is used if sprites fail); AdService stub; Capacitor haptics hooks are kept but untested.

## Known issues
- Level 24 unverified (above). Hidden-survivor/locker cue is subtle (two faint slit lights).
- Stair transition is a fade/slide, not a full animation; vents use the duct scene.
- Some wall decorations repeat on long levels.
