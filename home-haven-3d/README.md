# Home Haven 3D — Homescapes-style renovation

`Home_Haven_3D.html` is the complete single-file game (open it in a browser, or wrap it with Capacitor as before).

What changed versus the original sandbox "place tiles/walls" building:

- The old free-build mode is replaced by a **real 3D cutaway house** (Three.js r160, inlined) with 4 rooms + a front garden.
- Every room starts **run-down** (dust sheets, rotten floor, peeling walls, junk). Floating **task bubbles** show what can be renovated and its star cost.
- Tap a bubble -> the camera moves to that spot -> choose between **3 styles**, each previewed **live in the room** -> confirm with stars (earned by winning the puzzle levels).
- Chapter = room (Living Room, Kitchen, Bedroom, Bathroom, Garden). Finishing a room shows a **before/after photo** and rewards.
- After the story ends, any item can be restyled for free.
- Shop: stars can be bought with coins; materials/inventory were removed. Old saves migrate (coins/stars/level kept, chapter progress restarts).

## Layout

- `engine/` — the renovation engine (procedural furniture, textures, scene, thumbnails): `lib.js`, `furn1-4.js`, `data.js` (rooms, tasks, style options), `house.js`, `thumb.js`.
- `build/` — scripts used to patch the original game (`build.py` needs the original `Home_Haven_3D.html` as `orig.html` and `three@0.160.0` `build/three.min.js` as `src/three.min.js`).

Adding a new style = add one entry to a task's `variants` in `engine/data.js`. Adding a new task = one `slot(...)` line plus a builder in `engine/furn*.js`.
