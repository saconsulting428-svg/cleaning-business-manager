# Home Haven 3D v2 — features, bugs fixed, tests, limitations

Everything below was done in a headless Chromium (software GL / SwiftShader) via Playwright. **Nothing was run on an Android device or emulator**, and no APK was built (the Android SDK could not be downloaded in the build environment).

## 1. What is implemented

### Real 3D construction (Build mode)
* Three.js world: 12×12 plot, ground + first floor, orbit camera (90° view steps), pinch/wheel zoom, drag-pan, day/night with lamp/window glow, soft shadows.
* All **63 original parts** (+8 reward-only parts) have procedural 3D models: floors (concrete, wood, tile, marble, carpet, parquet, slate, cobble path), walls (plaster, brick, stone, wood, low wall, glass), doors/windows/arch (real openings with frames, glass, door leaves), pitched/flat roofs, rails, stairs, 40+ furniture, kitchen, bath, bedroom, decor and garden items.
* Real interactions: grid snapping, ghost preview (green = valid, red = blocked), quick-place for floors/walls/roofs, rotate, move, paint (per-piece colour tint), store to inventory, undo, level switch (Ground / Floor 2), interior cut-away (front walls fade, roofs hidden), zoom, rotate view. Placement rules are ported 1:1 from the original engine.
* Roofs: slope pieces that continue the same slope **stack into one continuous roof**; deep gable roofs work (see `tests/art.js` for the showcase house).
* Characters Ben and Tommy are 3D models that walk the plot, path-find through doorways and around furniture/walls, and react to taps (Tommy still gives +10 coins).
* Part thumbnails everywhere (shop, inventory, rewards, quest card) are rendered from the same 3D models.

### Build Home (story mode) — construction you actually do
* **Pick a room → ghost → ✓ Build** starts a *construction plan* (saved in `S.plan`). The room is then built **piece by piece**: EMPTY PLOT → **Base** (foundation, 2–4 floor sections) → **Walls** (one section per side, shared walls skipped) → **Doors** (door + up to 2 windows) → **Roof** (only when the roof is unlocked and nothing is above; skippable) → **Design** → **Furnish** → ROOM COMPLETE.
* Each structural step is a **glowing site** in the 3D scene with a hammer marker. Tap it: a 3D hammer swings (3 hits), dust puffs, the pieces pop in with a bounce, "+2 🪙" floats up (first time per section), the objective updates (`BUILD WALLS 1/4`, progress bar). Finishing a stage shows e.g. **WALLS DONE!**. A **🔨 Build it all** button builds the remaining sites of the stage for players who do not want to tap.
* **Build combo:** taps within ~4 s chain ×2 … ×5 (banner `BUILD COMBO ×3`); a small coin bonus is paid when the chain ends or a stage completes.
* **Design stage:** Floor (Wood / Tile / Marble), Wall (Cream / Modern / Brick), Furniture (Basic / Modern / Luxury) — each tap changes the real 3D room immediately (free; uses existing parts, wall tints and furniture colour palettes — no new assets).
* **Furnish stage:** glowing slots (found by the wall-hugging placement search, doors kept free); tap each slot to drop the piece, or *Furnish for me*.
* **Room complete:** compact result with Design / Comfort / Function stars (derived from the choices and what was built), coin reward (15 + 8 per star + combo), and the next task (**＋ Next task: Kitchen** or **Complete chapter ▶**). Scores are stored in `S.rscore`.
* **Build Home v2 (feel + landscape-first):** in landscape the Build Home screen is a construction column on the left (stage list ✓ ● ○, `n/N` + bar, a small secondary *Build it all*) and the 3D room fills the rest, framed automatically (`WORLD.frameRoom`); portrait keeps a compact top card. Targets are glowing 3D sites with a pulsing ring, rising particles, a hammer marker and a bouncing arrow; only the current stage's targets exist, the first one is emphasised and shows *TAP TO BUILD* for the first 3 taps. Each tap: camera focus → 3D hammer (3 hits) → build with a **typed animation** (floor tiles drop and spin into place, walls rise, door frame then leaf swings in, window frame then glass slides, roof slopes slide in, furniture drops, turns and settles) → dust + sparks + impact shake → *✓ BUILT* tag → coin flies to the counter → camera drifts back. Combo banners scale with ×1…×5. Stage complete = short banner + camera pull-back + sparks (+4 coins), no modal. Design options re-drop the floor / re-raise the walls with sparkle and a ✓ on the selected option. **Room complete** = UI fades, camera pulls back to the whole house, lights turn on, confetti and Ben walks in through the door, then the result sheet. Rotating the phone mid-construction keeps the plan and re-frames the camera.
* Parts that are not unlocked yet in the chapter (doors/windows/furniture in chapter 1) are simply not asked for. Progress is derived from the real layout, so closing the game mid-construction resumes the same plan; Undo works step by step; coin shortage shows the "coins needed → Play a puzzle" sheet and keeps the plan.
* Any older/finished room opens in the same panel (tap it): stages already done are ticked, Design/Furnish stay editable.
* **Advanced Build** (Dream Home): unchanged — free-size drag rooms, per-piece placement.

### Design Studio (after Build Home) — explore, drag, style, briefs
* **Landscape-first + orientation:** entering Build locks landscape (Capacitor ScreenOrientation in the APK; in a browser: fullscreen + `screen.orientation.lock`, which needs the tap on Build as the user gesture), leaving unlocks/returns to portrait. `autoRot` now defaults to **on** (one-time migration `rotV:2`); a "Rotate your phone" pill shows in portrait Build.
* **Explore:** a finished room opens in the studio with a large overview; **👁 Walk in** drops the camera to eye level inside the room; one-finger drag on empty space orbits (yaw + pitch), pinch zooms, two fingers pan.
* **Drag-and-drop furniture:** tap a card → a ghost appears in the room → drag it (touch offset keeps it above the finger) → release to place (a missing piece is bought on the spot). Drag any placed piece to move it directly; invalid drops snap back. Rotate/delete/paint via the selection bar (moved to the top so it never covers the room).
* **Combine:** vases and plants can be stacked on tables/counters (`elev`, saved; stacked pieces travel with their table); the checklist recognises furniture sets (Conversation, Dining, Reading nook, Cooking line, Bath suite, Sleep zone).
* **Style packs** (Cozy, Modern free; Scandi, Boho, Industrial, Luxury unlock after 1–4 finished briefs): one tap re-dresses floor, walls and furniture with a transformation; every piece can still be re-coloured.
* **Design briefs** (6 clients, checked against the real layout — no fake buttons): requested items, door not blocked, everything reachable from the door (BFS), big pieces against walls, balance, lighting, style harmony, decoration count, a set, stacking. 1–3 stars, coins, **new furniture unlocked** (Double Bed, Modern Sofa, Round Table, Tall Plant, Arc Lamp, Chesterfield, Parquet) and a draggable **before/after** reveal from real 3D snapshots. Compact HUD: unmet requests as chips, tap the card to expand the full checklist.
* Room-complete sheet now offers **🎨 Design brief** first. Advanced Build / Dream Home are unchanged.

### Layout / orientation
* Portrait for loading, title, home, puzzles, shop, rewards, dialogues; **landscape build workspace** with the item panel on the left (viewport ≈ 66 % of the width), scrolling single-row category tabs, action bar centred in the viewport, puzzles in landscape get a right-hand booster column.
* Both orientations work by rotating the device (responsive CSS, nothing is lost: state is not tied to layout). Optional automatic landscape for Build is implemented through the Capacitor ScreenOrientation plugin / Screen Orientation API but is **off by default** (Settings) because it could not be tested on Android.

### Story — 7 chapters with checklists
1 Clean & Foundation (clear 8 debris piles — tap them, lay 16 floor tiles, 8 walls) → 2 Ground Floor → 3 First Floor (stairs, floor 2, bedroom, bathroom) → 4 Roof & Exterior (roof, paint walls, path, fence, gate) → 5 Interior Design (lamps, rugs, plants, decor, recolour floors) → 6 Garden & Outdoor → 7 Dream Home (final inspection: 3 enclosed rooms, roof, every room furnished, water tank, mailbox).
Every objective is evaluated from the **real layout** (floors/walls/openings/items, room detection, painted colours). The quest card shows the current objective, progress, objective count and the next unlock; tapping it opens the full checklist with rewards and "Go to Build".
Each chapter: intro dialogue, guaranteed starter materials, guaranteed per-level material rewards for missing parts, a before/after photo and a coin + bundle reward.

### Ending and Dream Home
* After chapter 7: housewarming dialogue, night-time celebration, **Story Completed** screen with "empty plot vs your dream home" photos, +1500 coins and three reward furniture sets. The story ends, the game does not.
* **Dream Home Mode** (Projects button): free decorating everywhere, rooms list + room editor, homeowner challenges, renovation contracts, property map. Continued puzzle play keeps giving coins and rotating materials.

### Rooms (reference screens 5 and 8)
Rooms are detected from floors enclosed by walls and named by their furniture (Kitchen, Bedroom, …). The Rooms list shows a live 3D thumbnail, size and item count. **Room editor**: close-up camera, only that floor shown, interior categories, Wall colour / Floor colour (whole room, undoable), Save room (checkpoint of its furniture) and Restore.

### Homeowner challenges (5, validated against the real layout)
Zoe's Dream Bedroom (bed + wardrobe + 2 decorations in one room + 3 painted pieces of one colour family), Alex's Garden (flowers, fence + gate, path, bench), Family Dinner Kitchen (fridge + stove + table + 3 chairs in one room), Tommy's Cat Corner, Mr. Parker's Old Cottage (a whole separate property). Each has a checklist, progress, a claim button that only works when the state really satisfies it, coins and new unlockable items (Modern/Chesterfield sofa, double bed, round table, arc lamp, tall plant, parquet and slate floors).

### Renovation contracts (5 implemented — not infinite)
Budget-Friendly Renovation (cottage) → Luxury Living Room → Modern Kitchen → Small Garden Makeover → Complete House Transformation (beach house). Each has requirements, reward and a route to the next. New contracts/challenges are one object in `build/data_ext.js` (`quests`, `reward`, `next`); no other code changes. Auto-generated content is **not** offered; only the five above exist.

### Properties
* Family House (always), Mr. Parker's Cottage (pre-built run-down layout, unlocked by the story), Beach House (empty plot, sand/sea/palm theme, unlocked by finishing the cottage challenge).
* Every property keeps its own layout; switching parks the current one in `S.props`; completing another property never touches the first home. Inventory and coins are shared. Verified: 161-piece home ↔ 39-piece cottage, persisted across reload.

### Economy / shop
Per-level coins 100/125/150, daily quest 150, chapter rewards 500–1000, plus guaranteed materials: each win now awards up to **two** missing parts of the current chapter (it was one), then rotating materials; after the story the free rotation continues. Shop: Materials / Furniture / Decor / Boosters / Coins tabs with name, price, owned count and a working Buy (balance check, deduction, inventory, save, toast). Reward-only parts appear in the shop/build lists after they are unlocked.

## 2. Bugs fixed and root causes
| Bug | Root cause | Fix |
|---|---|---|
| Nuts & Bolts goal showed `0/0.4318…` | `Bolts` constructor overwrote the generator's bolt count `this.k` with the sprite scale, then `info()` used `k` as the goal | goal count kept in `goalN` |
| Nuts & Bolts Undo made the move counter go **up** | `undo()` did `this.moves++` although moves count upwards | refunds a move |
| Puzzles unusable in landscape (tiny board, boosters on top of Paint/Bolts) | layout assumed a portrait column | boosters become a right-hand column, board gets the full height |
| Walls replaced by windows lowered the "walls" objective | opening pieces replace wall pieces | objectives count wall-kind pieces incl. doors/windows |
| Taps/drags landed offset from the finger whenever the build screen shifted the camera (panels, room editor, landscape drawer) | `setRay` subtracted the camera screen-shift **in addition to** the projection view-offset, so picking was double-shifted | removed the extra shift; picking and drawing now agree (verified `toScreen` ↔ `cellAt` round-trip) |
| Room-size dragging was confusing on a phone (second recording): players dragged over built rooms and got stuck previews | story mode no longer uses dragging: ghost room of a fixed size + tap to place/move; free dragging is Advanced-only |
| Phone recording: tutorial bubbles covered the screen, build header's Done button was cut off, guide chips/buttons clipped, six home buttons wrapped | compact tutorial + ring that does not hide the target; header/guide/home-nav CSS for 320–420 px and short landscape; modal scrolls (`tests/responsive_audit.js` flags off-screen / clipped elements) |
| Title logo looked doubled on desktop | stacked 9 px solid text-shadow + blur on both logo lines | single thin shadow, line-height 1 |
| Chapter-4 Roof/Garden tabs stayed locked after completing a chapter without leaving Build | tab list was not re-rendered on chapter change | `refreshBuildUI()` after the chapter counter advances |
| Auto doors/windows and style swaps could not be undone and corrupted refunds when the room was undone | swaps pushed no undo step | swap undo records (restore parts, refund coins/materials) |
| On a real phone (screen recording) a second room could not be started: the drag began on the existing room, the tap selected a single floor tile and the toolbar covered the tray | room drag was allowed to start on occupied cells; taps in room mode selected pieces | a drag that starts on a built room now pans the camera; tapping a built room opens its room editor; hint says to drag on an empty spot (`tests/room_existing_drag.js`) |
| Walking character turns into a tree | **Not isolated.** The sprite-frame data (`c:ben:*:*`) is complete in the original atlases and I could not reproduce it in the old engine. The sprite engine was replaced by 3D mesh characters, so that failure class (texture/frame swap on a pooled sprite) no longer exists. |
| "Hint does nothing" | **Could not reproduce.** All 7 puzzle types solved to completion using only Hint (levels 1/5/12/25/40), the UI Hint button works and a failed hint does not consume the booster. Hints are intentionally not undoable (Undo says "Nothing to undo"). |
| Materials stop after several levels | **Not reproducible in the supplied version** (it already contains a fix): a 60-win simulation per chapter never produced an empty reward and always completed the chapter's material needs, before and after the rewrite. Added: up to 2 parts per win. |

## 3. Tests actually performed
(all in headless Chromium, 420×820, 800×400, 375×667)
* **Puzzles (hint):** 7 types × levels {1,5,12,25,40} = 35 runs, repeated Hint until done → all 35 won (stars 2–3). 
* **Puzzles (UI):** real clicks on Hint and Undo for all 7 types (booster decrement, counters, toasts). Found the two Bolts bugs above; re-tested after the fix.
* **Generators:** pipe/wire/tile/brick/bolt generators for levels 1–150 → no null results, none slower than 400 ms.
* **Economy:** reward simulation for all 7 chapters + 60 post-story wins (0 empty rewards; 1–7 wins to supply a chapter's mandatory parts). The original game was simulated too.
* **Full story by a bot using real taps** (`tests/bot.js`, `plan.json`): ~160 parts placed through the real placement code (startPlace → ghost → confirm, debris blocking, inventory use, roofs, openings replacing walls, painting), all 7 chapters completed → Story Completed screen → Dream Home. The bot's two failures are deliberate collisions in its plan.
* **Build Home flow (`tests/build_home_flow.js`, real mouse taps on the glowing sites, 360×740 and 740×360):** Base → Walls → Doors → Design (floor/wall/furniture looks) → Furnish → ROOM COMPLETE with stars and reward; combos ×4 observed. **Extra (`tests/build_home_extra.js`):** Undo mid-stage, reload and resume the same plan, coin shortage sheet, Roof stage appears in chapter 4. **Advanced mode (`tests/adv_check.js`):** free drag still builds instantly.
* **Build Home v2 tests (real mouse taps):** `tests/build_home_flow.js` at 800×400, 915×412, 740×360, 360×740 (whole room Base→Complete via the 3D sites); `tests/build_home_cinematic.js` (mid-animation screenshots of a wall build and the completion cinematic); `tests/build_home_orientation_roof.js` (landscape→portrait→landscape while building, roof assembly); `tests/build_home_extra.js` (undo, reload/resume, coin shortage, roof stage); `tests/bot_rooms.js` (chapters 1–3 through the panel).
* **Design Studio (`tests/design_studio.js`, real mouse, 740×360 and 360×740):** build a room → start the brief → open the shelf → drag TV / rug / plant (stacked on the table, `elev` 0.45) → drag the sofa to move it → walk in + orbit → apply a style pack → submit → before/after + rewards + unlock.
* **Story (`tests/bot_rooms.js`):** chapters 1–3 completed through the Build Home panel (rooms, stairs card, Floor 2 rooms, chapter quests satisfied, no JS errors).
* **Post-story** (`g12`, `g18`): challenges Alex/Tommy (claimed, items granted), Zoe/Dinner partial progress verified, Parker cottage fully built and claimed → beach property unlocked → switched; contract progress on the cottage; property parking/restoring; reload at each stage.
* **Migration:** a v3 save (chapter 4, 53 pieces, inventory, boosters, level 17) loads; progress mapped from the layout; coins/stars/level/boosters/inventory preserved; shop purchase persisted.
* **Rooms/editor:** room detection (4 rooms in the finished house), list thumbnails, edit, recolour, save.
* **Orientation:** portrait/landscape screenshots of loading, title, home, build (panel, ghost, selection, palette), rooms, sheets, dialogues, all 7 puzzles.
* **Render cost** (finished house, home view): ~170 draw calls and ~22 k triangles per frame, 452 geometries, 16 textures (renderer.info). Shadows are re-rendered only when something changes or a character walks.

* **Characters:** Ben was redrawn (round friendly face with swept hair, blue work shirt with rolled sleeves, tool belt) in the 3D world and the dialogue portrait is rendered from that model at start-up (`RENO.benPortrait`); the other portraits are the original art, so Ben's style differs slightly from theirs.
* **Responsive audit** (`tests/responsive_audit.js`) at 320×568, 360×640, 740×360: menu, home, shop, story, projects, rewards, build tutorial/ghost/guide/style panel, puzzle modal — remaining flags are only decorative clouds and the horizontally scrolling shop tabs.


## 4. Not done / not tested / limits
* **No Android build or device test.** Orientation lock, WebView WebGL performance, memory use, touch feel and real FPS on phones are unverified. Software-rendered headless frame rates say nothing about devices.
* The loading/title art is rendered from the 3D scene (`tests/art.js`); it is **not** the painted concept art in your reference image. Characters in 3D are simple low-poly models; the dialogue portraits are still the original images. Overall polish is below the concept image.
* The "neighbourhood map" is a list of property cards, not a painted map; Beach House has only terrain/theme + an empty plot; only one pre-built layout (cottage). Beach/lighthouse/luxury villa/community park from the concept are not built.
* Stairs do not cut a hole in the floor above; roofs have no gable-end fill or hip corners; no multi-select/copy tool in the room editor; "Restore" restores furniture of a saved room, not walls/floors.
* Quest/challenge checks are count-based (plus room detection), not exact layout matches, by design.
* The old Phaser isometric sprite world and its atlases are no longer rendered (the atlases remain because the puzzles use them). Old saves load and render in 3D, but the sprite appearance of parts changed.
* Room tool limits: rooms are rectangles of fixed size in story mode (L-shapes only by combining rooms or in Advanced mode); auto-furnishing is a heuristic (walls-first, facing in) and may need nudging by hand; chapter coin balance after the guided flow is only checked with a bot that adds coins by hand, not with real puzzle play; floor 2 rooms are not required to sit over floor-1 rooms; the room preview was tested with a mouse in headless Chromium, not with real fingers on a phone. The first-time tutorial and landscape room editor layout were reviewed only in screenshots at 420×820 and 800×400.
* The Homescapes-style "pick a style" renovation variant from the previous iteration is kept separately in `../home-haven-3d/` and is not part of this game.

## New-player tutorial (build/flow_tut.js)
State-driven, touch-safe: the overlay ignores all touches except its Skip button; the ring only outlines the target and the text bubble is placed in the emptiest spot (scored against the target, other debris, controls, HUD, modal and the puzzle drawing area), with a pointer line. Covers: debris → Build → room pick → ✓ Build → glowing sites → design → room complete → chapter → design-brief furniture shelf/drag → PLAY → how-to → puzzle tips (levels 1–6) → level complete. Progress in `S.tut`; existing saves start with it off; Skip any time; `?` in Build replays it.
Fixes found while testing: debris piles got an invisible tap proxy (tire hole was untappable); landscape sheets keep their buttons in view; "+" HUD buttons got a larger tap area; booster column fits 740×360; junk hidden behind panels is panned into view.
Tests: `tests/tutorial_journey.cjs <WxH>` (real mouse clicks along the tutorial; puzzle wins use `levelWin`), `tutorial_puzzle_tips.cjs`, `smoke_all.cjs` (all screens + 7 puzzles, errors/clipping/obstruction audit). Headless Chromium only; no real device.
