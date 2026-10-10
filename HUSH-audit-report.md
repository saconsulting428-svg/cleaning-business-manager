# HUSH — Audit Report (build audited: HUSH-preview-5.html, HUSH_CONFIG.VERSION 3.1.0)

Note: the brief says "preview-4"; the attached file is **preview-5**. This audit is of preview-5.
No game code was modified. Nothing was committed.

## How I audited
- Read all code (everything except the base64 sprite/font payloads).
- Extracted the AI / world / level modules and ran them headless in Node (30 levels parsed, radio/noise tests, automated beam-search solver).
- Loaded the real file in headless Chromium (390x780 @2x): no console errors or warnings on boot, level load, and level switch; screenshots checked.
- NOT verified: audio quality (no listening/measurement), real-phone performance, touch feel, landscape. Headless Chromium ran ~38 fps on software GL, which says nothing about phones.

## 1. How the game works
- Single HTML, 10 scripts, no external assets. Fonts and 8 sprite atlases are embedded as base64 (~4.4 MB total; code itself is ~224 KB).
- Fixed 30 Hz deterministic simulation (`world.js`), shared by game, solver and tests. No randomness in AI. Render interpolates between ticks.
- A level is a list of strings (one per floor, one char per 1 m tile): `.` floor, `~` glass, `P` start, `E/e` exit (e = needs power), `L` locker, `K` keycard, `D/X/W` plain/locked/powered door, `#` wall, `G` generator, `R/S` radio switch/speaker, `1-9` stair pairs, `a-c` vents, `u-w` hidden vents (revealed by sonar).
- Player: walk 2.4 m/s, crouch 1.2 m/s. Sonar: charges per level, 2.5 s cooldown, reveals hidden vents within 9 tiles and makes a noise of radius 14.
- Noise radii (tiles): step 3, crouched step 0, glass 8 (crouched 2.5), door 6, unlock 4, generator 10 (8 pulses, 1/s), radio 12 (5 pulses after 1.5 s), sonar 14. A creature hears a noise if the walking distance (via stairs) is within radius x its hearing multiplier.
- Creature types (all share one state machine):
  - stalker: patrols between two points, sight 4.5 (2.5 if you crouch), hearing x1
  - sentinel: guards a spot (optional look-around timer), sight 5.0 (2.5 crouched), hearing x1
  - listener: nearly blind (sight 1.3), hearing x1.7, slow roam
- AI states: ROAM -> (heard) INVESTIGATE -> SEARCH (4 s, +-2 tiles) -> RETURN -> ROAM; seen for 0.55 s -> HUNT (speed 2.9, faster than your walk) -> lost for 1.5 s -> SEARCH. Hunters see 6.5 tiles in both directions; closed doors block sight; creatures push plain doors open (0.8 s), are blocked by locked/powered doors and walls, and use stairs (they follow you up/down if they saw you). Lockers hide you unless a hunter is watching when you enter. Vents are ignored by creatures. Catch distance 0.6.
- Stars: 1 = finish; 2 = sonar uses <= par; 3 = never detected (chase levels: finish within parTime).
- Progress: `localStorage` key `hush.save.v1` (stars, best time/sonar, tutorials seen, audio/brightness settings). A level unlocks when the previous one has >= 1 star.
- UI: hold-and-drag anywhere to move, SONAR / CROUCH (toggle) / context USE button, keyboard A/D, arrows, Space, E, Shift/C, P. HUD: level, floor, keycards, sonar x/y, objective, 4-stage threat indicator (heard / suspicious / sees you / caught), toasts.
- Rendering: Canvas 2D; cached environment per floor, half-res darkness mask, flashlight cones, sonar ring, fog, grain; adaptive DPR cap when frames run slow. Procedural drawing fallback exists if sprites do not load.
- Audio: 100% synthesised WebAudio (no files); one bus with low-pass + compressor; ambient drone + drips; footstep/creature-step/heartbeat tied to distance; haptics.

## 2. Implemented vs partial (against the brief)
| Area | Status |
|---|---|
| Sonar vs silence (sonar draws creatures to the ping point, never teleports them, hearing by walking distance) | Implemented |
| Crouch / hide / glass / doors / keycards / generator / radio / stairs / vents / chase levels / multiple creature types | Implemented |
| 30 levels in 3 chapters, linear unlock, stars | Implemented |
| Fair warning before being hunted (0.55 s notice + HUD) | Implemented |
| Survivor animations: run, crouch-walk, crawl (vent), use, caught | Implemented (sprite sheets) |
| Monster animations: run, roar, attack | **Partial**: no separate investigate / search / chase sets. Investigate vs hunt differ only by speed and a slight lean. The roar sheet is never played in gameplay when it detects you (only idle frame 0 and menu art). |
| Monster sound (growls, roars) | **Partial**: only footsteps, a "heard" blip, a "hunt" chord, "lost" and "caught". No growls or roar tied to roam/investigate/hunt. |
| Distractions | Partial: radio, generator, sonar, glass, doors. No throwable/placeable items. |
| Ending / completion | Missing: after level 30 there is no ending; "Continue" just reloads level 30. |
| Landscape / tablet | Not handled (layout is a 520 px-wide portrait column). |

## 3. Level / creature map (verified by parsing)
All 30 levels parse with valid stair/vent pairs, start and exit. Format: level — creatures (type floor@tile; p = patrol, g = guard) — sonar / par.
- Ch1 Abandoned Laboratory: 1 First Contact (none) 3/3 · 2 Echo (none, hidden vents) 3/1 · 3 Stay Low (sentinel) 3/1 · 4 Broken Glass (sentinel up) 3/1 · 5 Hold Your Breath (stalker) 3/1 · 6 Keycard (stalker) 3/1 · 7 Long Way Round (sentinel+stalker, stairs) 3/1 · 8 Bait (sentinel) 2/1 · 9 Crawlspace (stalker+sentinel, vents) 3/1 · 10 Run (chase, 16 s) 1/1
- Ch2 Underground Research: 11 Static (radio) · 12 Power Down (generator) · 13 Thin Walls (listener) · 14 Service Tunnels (locked door) · 15 Descent (3 floors, 2 stalkers) · 16 Feedback (radio + key) · 17 Generator Room · 18 Glass Garden (listener) · 19 Blackout (1 sonar, 2 stalkers) · 20 Meltdown (chase, 28 s)
- Ch3 Containment Zone: 21 Two of Them · 22 Blind Spot · 23 Above and Below · 24 Cell Block (2 keys, 3 creatures) · 25 Decoy (radio+gen, 2 sentinels) · 26 Dead Air (0 sonar) · 27 The Shaft (4 floors) · 28 The Hive (2 listeners) · 29 Last Light · 30 Extraction (chase, 29 s)

Solver result (my own beam search over the real simulation, 0.2-0.4 s action steps): **29 of 30 levels were completed with all 3 stars** (L1-L23, L25-L30; times and sonar use were within par; chase times 12.5 / 21.3 / 20.9 s vs 16 / 28 / 29 s limits). **Level 24 (Cell Block) was NOT solved by my search — inconclusive, I am not claiming it is unsolvable.** My search heuristic cannot plan the "hide in locker, slip behind the stalker" timing needed to reach the keycard in the west pocket; it needs a proper solver or a hand playtest.

## 4. Confirmed bugs / data errors
| # | Severity | Finding | Evidence |
|---|---|---|---|
| C1 | **High (design intent broken)** | Radio/intercom cannot lure the creature in **L11 "Static"** (tutorial level for the radio) and **L16 "Feedback"**. Speaker is 28 / 26 tiles from the only sentinel; radio noise reaches only 12. Pressing the radio there changes nothing. In L11 the hint says the speaker is "a long way from here" but it is 4 tiles from the start. Both levels remain completable via sonar bait, so the radio mechanic is never actually taught. | Node sim: radio pressed, 15 s run, no creature enters INVESTIGATE in L11/L16 (does in L25). |
| C2 | Medium | **L3 "Stay Low"**: the sentinel is placed at tile 21 on a floor that is only 21 tiles wide (x = 21.5 > 21.0) — it stands outside the corridor. | Parse check; screenshot shows it behind the exit. |
| C3 | Low | Pressing **Space** (sonar key) while a level is still loading throws `TypeError` (`G.S` is null) on first launch. | Code path: `press('ctl-sonar')` reads `G.S.sl`. |
| C4 | Low | Version labels disagree: Settings shows "v1.2", config says 3.1.0, file is preview-5. | Source. |
| C5 | Low | `?dev=1` in the URL opens the developer panel and "Unlock all" in the release file. | Source (`DEV` check). |
| C6 | Low | No ending: finishing L30 returns to the chapter list; Home "Continue" reloads L30. | Source (`nextLevel`). |

## 5. Suspected issues (not proven — need device/listening tests)
- S1 Audio headroom: SFX bus gain is up to 0.8 x 2.4 = 1.92 into a compressor with no make-up/limiter. Overlapping cues (creature steps + generator pulse + sonar) may clip. Needs offline rendering / listening.
- S2 iOS: `AudioContext` "interrupted" state (phone call, lock screen) is not handled; resume only on a gesture.
- S3 Creature catch visuals: if you are caught while hiding (it saw you enter) or on stairs, the attack pose is not shown (attack requires the creature within 1.6 tiles on the same floor and visible).
- S4 Monster sprite appearance in one gameplay frame looked washed/partly translucent in the lower body (could be fog overlay in front of it). Needs a close visual check.
- S5 Sound passes through walls and closed locked doors (route distance ignores them) while the same walls stop creatures. May be intended; it is a design question.
- S6 Lockers are always perfectly safe unless watched; creatures never inspect lockers when searching. Could reduce tension in later chapters.
- S7 Performance on weak phones: 3-4 radial gradients are created per frame for the flashlight; a few arrays/closures per tick (`S.cr.map`, `objective()`). The adaptive resolution cap mitigates this, but it is untested on real hardware.
- S8 No auto-pause when the window loses focus (only when the tab is hidden) — desktop only.
- S9 Landscape / large screens: the scene scale is `min(W/5.5, H/8.6)`; landscape phones will render very small.

## 6. Technical limitations
- Levels are strictly 1-D per floor (no jumping/vertical movement inside a floor); all AI is tile/x based.
- Single save slot, no cloud backup; save format version 1 silently ignores any other version.
- Entire game is in one script scope with no automated test suite shipped in the file (the code mentions `tools/` and a solver, which were not provided).

## 7. Proposed plan (awaiting approval — nothing below has been started)
Phase 1 (safe fixes, no redesign): C1 (move speakers within radio range of the guarded creature in L11/L16, fix L11 hint), C2, C3, C4, C5 (hide dev tools unless built with DEV), re-run the solver on those levels.
Phase 2 (concept strengthening, small and reversible): play the existing roar animation on first detection plus a creature growl/roar cue (distinct for roam, investigate, hunt, attack); audio limiter + level matching; auto-pause on blur; handle iOS interrupted audio.
Phase 3 (needs your decision): L24 solvability hand-check, ending screen, landscape layout, whether sound should be dampened by walls/doors, whether creatures should check lockers.
