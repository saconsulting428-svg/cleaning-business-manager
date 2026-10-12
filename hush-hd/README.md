# HUSH HD

A from-scratch rebuild of the 2D side-scrolling survival horror game **HUSH**: same 30 levels, same sonar-versus-silence rules, same creature AI, new renderer.

## Launch
Open **`HUSH-HD.html`** in any modern browser (Chrome/Android WebView/Safari/Firefox). One file, ~4.5 MB, works offline, no install.
On Android: copy the file to the phone and open it in Chrome (or wrap it with Capacitor, the same hooks as the original are kept).

## Play
- **Move:** touch and hold anywhere on the scene, drag left/right (release to stop). Keyboard: `A/D` or arrows.
- **SONAR** (`Space`): reveals the surroundings and hidden vents, but the pulse is a loud noise the creature will walk to investigate.
- **CROUCH** (`C`/`Shift`/`S`): silent and hard to see, but slow.
- **USE** (`E`/`Enter`/`W`): doors, lockers (hide), stairs, vents, generator, intercom. The button names the action.
- **Pause** `P`/`Esc`. The game also pauses when the tab is hidden or loses focus.
- Goal per level: reach the exit (find keycards, start generators, use stairs/vents, distract with intercom/generator noise).
  Stars: finish, stay within the sonar target, never be detected (chase levels: escape within the time).
- Progress is stored in `localStorage` under the same key and format as the original (`hush.save.v1`).
- Settings: sound/ambience volume, vibration, **Graphics Auto/High/Low**, brightness.

## Rebuilding from source
```
python3 tools/clean_sprites.py assets assets/clean        # or: tools/build_sprites_from_zip.py Pngs.zip  (see below)
python3 tools/build.py                                    # -> HUSH-HD.html
```
Source: `src/levels.js` (original data, verbatim), `sim.js` (rules/AI), `gfx.js` (textures, tile bake, sprite cache), `render.js`, `audio.js`, `game.js`, `ui.css/html`.

## Using the artist PNGs (Pngs.zip)
`tools/build_sprites_from_zip.py Pngs.zip` converts the individual frames (Run,S1-S9,C1-C6,W1-W6,Y1-Y4,X1-X4,U1-U8,A1-A4,R1-R3) into the atlases the game reads
(white background removal, de-fringe, fragment/panel removal, scale normalisation, foot-baseline registration), then run `tools/build.py`.
This build uses the 45 frames sent in chat (named by `tools/identify_frames.py`). See REPORT.md.

## Tests (`tests/`)
`diff-sim.js`, `regression-sim.js`, `verify-original.js` (Node); `regression-ui.js`, `playthrough.js`, `levels-load.js`, `audio-offline.js` (Chromium via Playwright). Results are in REPORT.md.
