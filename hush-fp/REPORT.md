# HUSH: Echoes in the Dark - build report

## What was built (all of it runs)
- A first-person 3D game in one offline file (`HUSH-FP.html`, 0.8 MB): Three.js world, flashlight with shadows and a visible beam, first-person hands, procedural textures with normal maps, fog and dust, flickering lamps, water in the flooded chapter, an organic red nest in chapter 3.
- 30 levels in 3 chapters. Layouts are generated per level from a spec (rooms, corridors, locks, creatures); the generator proves each level solvable with a solver and rejects layouts where a lock can be bypassed.
- Mechanics: sonar pulse (limited, loud, reveals walls as a blue grid and creatures as red silhouettes through walls), noise with radius for every action, lockers, vents, radio lure, keycard / key / fuses + generator / code from a note + keypad / valve / hidden door revealed by a pulse, stamina sprint, crouch, flashlight toggle.
- Three creature types with a state-based AI (roam, hear, investigate, search, suspicious, hunt, attack, lose track, check a locker it saw you enter). The creature is a skinned mesh generated from a signed-distance model, with IK legs on a distance-driven gait, hunched spine, jaw, glowing eyes and veins.
- UI like the mock-up: title (live 3D corridor behind it), chapter selection, level selection with generated map thumbnails and stars, HUD (objective, noise meter, pulse count, crouch, use, sprint, hotbar, floating touch stick), pause, settings (graphics, brightness, difficulty, volumes, audio quality, sensitivity), how to play, credits, note/keypad overlays, win and caught screens. Touch and keyboard/mouse. Saves stars, best times and settings in localStorage.
- Audio: the synthesised engine from HUSH HD (footsteps by surface, ping, doors, heartbeat, creature steps with pan and distance, growl/roar, ambience that follows the threat).

## Tests that exist and their results (run in this environment)
| Test | What it proves | Result |
|---|---|---|
| `tests/gen.mjs` | all 30 levels generate and the solver finds a route | 30/30 |
| `tests/play.mjs` | a scripted player completes every level through the REAL world logic (movement, collision, doors, items, generator, valve, notes, vents, exit); god mode only stops the creature from ending the run | 30/30 |
| `tests/ai.mjs` | hearing makes it investigate, then search, then roam; seeing leads to suspicion, hunt and catching; it loses track; crouching shortens its sight; quiet steps are quieter; a locker it saw you enter is checked, an unseen hide is safe; sentinel keeps its post; listener hears farther | 17/17 |
| `tests/ui.cjs` | menus, chapter/level locks, keyboard, touch stick/look/buttons, pause, settings applied and persisted, death and retry, win and next level, note and keypad (wrong and right code) | 36/36 (Chromium, software GL) |
| `tests/page.cjs` | every level started through the real page flow with the 3D scene built, finished by the scripted player, win overlay + stars + saved progress; no console errors | 30/30 (run in four chunks) |
| scene stats (from `page.cjs`) | 30-130 draw calls and 5k-52k triangles per frame, no geometry/texture growth across repeated level loads | measured |

## What is NOT proven (please read)
- **Phones.** Nothing here ran on a real phone or GPU. The renderer was only run on a software GL in Chromium, so frame rate is unmeasured. The scenes are light (above), pixel ratio is capped, there are High/Medium/Low presets (Low drops shadows and uses simple materials) and Auto drops a level after sustained slow frames, but this is untested on devices.
- **Sound** was synthesised and wired up, but I have not heard it.
- **Difficulty balance is unverified.** `tests/stealth.mjs` is a crude "careful player" bot (crouches, switches the torch off, backs away, hides, waits). It clears about **23%** of runs on Normal, with deaths mostly from walking into creatures in corridors and timeouts from hide loops. It is a poor proxy for a human (it cannot read cues the way a person does), but it is a warning that Normal may be hard. Settings has Easy / Normal / Hard (Easy: shorter sight, slower detection, slower hunt). Expect to tune.
- Level variety comes from the generator, not hand-built set pieces: rooms differ in size, props, water, glass, lights and layout, but they share one visual language per chapter.
- The creature and the world are procedural and look like it: darkness hides much of that, they are not photoreal.
- Not done: gamepad, localisation, a store-style launcher or Android wrapper.

## Bugs found and fixed while testing
Wall normals were inverted (black walls); a creature opening a door heard itself and looped forever; creatures spawned behind locked doors could not roam; guards spawned in the exit room or where a vent comes out; the vent exit could land on a prop; the start room had no locker.
