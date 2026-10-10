# HUSH HD - build report

File: `HUSH-HD.html`, **5.16 MB**, single self-contained file (fonts, sprites, code inline). No network access needed.

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
1. **Pngs.zip itself was not received; the 45 frames were sent as images in chat instead** (all 45: Run, S1-S9, C1-C6, W1-W6, Y1-Y4, X1-X4, U1-U8, A1-A4, R1-R3). They arrived unnamed, 1024x1536 (W frames 1536x1024 / 1672x941) JPEG-like RGB with a white background, so `tools/identify_frames.py` named them by silhouette matching against the previous art (45/45 matched, every score >= 0.94, none ambiguous) and `tools/build_sprites_from_zip.py` rebuilt all 8 atlases from them. The game now uses these frames. Pipeline: white keyed out from the border (+ big enclosed gaps), edge matted against white to remove halos, Y3 side panel removed, W6 length normalised (x0.919), stray fragments dropped, feet registered on one baseline, lens/eye anchors re-measured (checked visually).
   - **Running-size bug fixed**: the first atlas normalised every frame to the same silhouette area, so wide poses (running, crawling) shrank. Each animation now uses one uniform scale; the run loop is gently balanced (a runner is shorter than an idle man) so height stays within about +-3%.
   - Caveat: the frames are 1024 px tall JPEG-like images with some compression noise; the pipeline cannot add detail that is not there. A true PNG zip would be cleaner (alpha, no JPEG noise).
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
