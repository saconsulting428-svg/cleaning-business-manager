# HUSH: Echoes in the Dark (first-person build)

A first-person survival-horror game in one offline HTML file. Dark facilities, a flashlight, a limited **sonar pulse** that lights up walls, doors and creatures but makes noise, and a creature that comes to where the noise was.
30 levels in 3 chapters, procedural 3D world (Three.js), procedural creature, procedural sound. No image or audio files.

**Play:** open `HUSH-FP.html` in a browser (Chrome/Edge/Firefox/Safari; Android Chrome for phones). Landscape works best; portrait is supported.

| | Touch | Keyboard / mouse |
|---|---|---|
| Move | floating stick (left half of the screen) | W A S D |
| Look | drag (right half) | mouse (click the game to capture it) |
| Sonar pulse | Pulse button | Space or Q |
| Use / open / hide / take | Use button (lights up when something is in reach) | E |
| Crouch (silent) | Crouch button | C or Ctrl |
| Sprint (loud, limited stamina) | sprint toggle | Shift |
| Flashlight / radio | tap the slot in the hotbar | F / R |
| Pause | pause button | Esc |

## What the player does
Explore with the flashlight. Find what the exit needs (keycard, brass key, fuses for the generator, an access code from a note, a bulkhead valve, or a hidden door that only a pulse reveals). Every sound is noise with a radius: steps (crouch 1.6, walk 4, sprint 9 tiles), glass and water (louder), doors, the generator (very loud), the pulse (14). Creatures react to noise and to sight; hide in lockers, use the radio to make noise elsewhere, crawl through vents (creatures cannot).

Creature AI (`src/logic/ai.js`): roam -> hear -> investigate -> search -> see (suspicious, then hunt) -> attack -> lose track -> search -> roam. Three kinds: the **stalker** roams, the **sentinel** guards a post and sweeps its gaze, the **listener** is nearly blind and hears twice as far. Warnings: heartbeat and tension track the threat, the HUD says IT HEARD THAT / SUSPICIOUS / IT SEES YOU, the creature's eyes and veins glow, its footsteps are positional.

## Architecture
```
src/logic/   pure game rules (no DOM, no WebGL; runs in Node for tests)
  levels.js    the 30 level specs: rooms, locks, creatures, tools
  gen.js       facility generator + solver: rooms in a jittered grid, corridors in a chain from start to exit, locks on chain edges, every key/fuse/note placed
               before the lock that needs it, lockers and vents, props that never cut a room apart; a BFS solver proves each level solvable and that no lock can be bypassed
  world.js     player movement/collision, interaction, inventory, doors/locks/generator/valve/vents/lockers, pulse, radio lure, noise, objectives
  ai.js        creature perception, pathfinding, the state machine
src/render/  Three.js
  textures.js  procedural albedo + normal maps (concrete, tiled flood, flesh nest, metal, crate, water)
  scene3d.js   merged wall/floor/ceiling geometry, props, animated doors/items/generator/valve/exit, lamps, the sonar-pulse shader patch
  creature3d.js + sdf.js   the creature: one smooth skin generated from a signed-distance model (surface nets), skinned to a bone tree, IK legs on a distance-driven gait
  view.js      renderer, first-person camera (bob, crouch, vent crawl, death), flashlight + volumetric beam, hands, dust, light pool, quality levels
src/ui/      HTML/CSS (title, chapters, levels, HUD, pause, settings, overlays)
src/main.js  controller: screens, input, fixed 30 Hz loop, HUD, audio hooks, saving
src/audio.js synthesised audio (shared with the earlier HUSH HD build)
tools/build.mjs   esbuild -> one HTML file with fonts embedded      tests/   see REPORT.md
```
Build: `npm install && node tools/build.mjs src/main.js HUSH-FP.html`.
