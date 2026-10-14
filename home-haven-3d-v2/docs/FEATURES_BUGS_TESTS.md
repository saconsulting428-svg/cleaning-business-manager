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

### Room-based building (story mode) — "tap, don't drag"
* **Rooms tab**: tap a room card (Living Room 4×4, Kitchen 3×3, Bedroom 3×3, Bathroom 2×3, Hall 2×4, Study 3×3). A green ghost room of that predefined size appears at a valid spot automatically (next to existing rooms so they share a wall; above the ground floor on Floor 2; never on debris/other rooms). **Tap ✓ Build** (or tap the ghost) to place it. To move it: tap another empty spot, **Next spot**, or **Turn** (rotates non-square rooms). Dragging only pans/zooms the camera in story mode. A **Stairs** card auto-places a staircase in the biggest ground-floor room.
* Build creates the floor and the connected walls at once (shared walls are not doubled) with a construction animation: floor tiles pop in one by one, walls rise, furniture drops in. A floating name tag marks the room.
* **Guided steps** (card at the top of the room editor): 🚪 Door → 🪟 Windows → 🛋 Furniture → ✔ Done. One big button does each step (door on a sensible wall, ≤2 windows on outside walls, "Furnish for me" places the room's required furniture along the walls facing in, keeping the door free) — or pick furniture yourself from the tray. When all chapter goals are met a **Complete chapter ▶** button appears (also available early if the chapter's goals are already satisfied). "✎ Style" opens wall/floor colour & style tools.
* Pieces you own are used first; missing ones are bought at shop price automatically. One Undo removes a whole room, door/window step or furnishing step (refunds exact).
* Auto roof (Roof tab), tap a built room to reopen its editor, 3-step first-time tutorial (pick a room → ✓ Build → follow the steps; **?** replays it).
* **Advanced Build** (Dream Home Mode only; locked before the story ends): free-size room dragging (Rooms tab), per-piece Floors/Walls tabs, drag-painting, all other tabs.

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
* **Story flow with only taps/buttons (`tests/bot_rooms.js`, 360×800):** ch1 Living Room (ghost → ✓ Build → Door) → Complete chapter; ch2 Kitchen next to it (shares the wall) → Door → Windows → Furnish, then the Living Room via its guide → all five goals met → completed; ch3 Stairs card, Bedroom and Bathroom on Floor 2 through the guide → completed; ch4 auto roof through the sheet (15 roof pieces). The bot adds 400 coins before ch3 to stand in for ~4 puzzle wins (the guide buys missing parts at shop price). No JS errors.
* **Guide / tutorial / ghost (`tests/room_guide_flow.js`, `tests/room_ghost_undo.js`):** tutorial steps; ghost appears at once; tap-to-move and tap-to-build; Door → Windows → Furniture → Complete buttons; undo of door then room restores layout count, coins and inventory exactly.
* **Advanced + landscape (`tests/room_adv_landscape.js`, 800×400):** tutorial, ghost, guide screenshots; Advanced unlocked → free drag preview "Kitchen 5×3" → built. **Presentation (`tests/room_presentation.js`):** furnished living room, kitchen, bedroom views.
* **Post-story** (`g12`, `g18`): challenges Alex/Tommy (claimed, items granted), Zoe/Dinner partial progress verified, Parker cottage fully built and claimed → beach property unlocked → switched; contract progress on the cottage; property parking/restoring; reload at each stage.
* **Migration:** a v3 save (chapter 4, 53 pieces, inventory, boosters, level 17) loads; progress mapped from the layout; coins/stars/level/boosters/inventory preserved; shop purchase persisted.
* **Rooms/editor:** room detection (4 rooms in the finished house), list thumbnails, edit, recolour, save.
* **Orientation:** portrait/landscape screenshots of loading, title, home, build (panel, ghost, selection, palette), rooms, sheets, dialogues, all 7 puzzles.
* **Render cost** (finished house, home view): ~170 draw calls and ~22 k triangles per frame, 452 geometries, 16 textures (renderer.info). Shadows are re-rendered only when something changes or a character walks.

## 4. Not done / not tested / limits
* **No Android build or device test.** Orientation lock, WebView WebGL performance, memory use, touch feel and real FPS on phones are unverified. Software-rendered headless frame rates say nothing about devices.
* The loading/title art is rendered from the 3D scene (`tests/art.js`); it is **not** the painted concept art in your reference image. Characters in 3D are simple low-poly models; the dialogue portraits are still the original images. Overall polish is below the concept image.
* The "neighbourhood map" is a list of property cards, not a painted map; Beach House has only terrain/theme + an empty plot; only one pre-built layout (cottage). Beach/lighthouse/luxury villa/community park from the concept are not built.
* Stairs do not cut a hole in the floor above; roofs have no gable-end fill or hip corners; no multi-select/copy tool in the room editor; "Restore" restores furniture of a saved room, not walls/floors.
* Quest/challenge checks are count-based (plus room detection), not exact layout matches, by design.
* The old Phaser isometric sprite world and its atlases are no longer rendered (the atlases remain because the puzzles use them). Old saves load and render in 3D, but the sprite appearance of parts changed.
* Room tool limits: rooms are rectangles of fixed size in story mode (L-shapes only by combining rooms or in Advanced mode); auto-furnishing is a heuristic (walls-first, facing in) and may need nudging by hand; chapter coin balance after the guided flow is only checked with a bot that adds coins by hand, not with real puzzle play; floor 2 rooms are not required to sit over floor-1 rooms; the room preview was tested with a mouse in headless Chromium, not with real fingers on a phone. The first-time tutorial and landscape room editor layout were reviewed only in screenshots at 420×820 and 800×400.
* The Homescapes-style "pick a style" renovation variant from the previous iteration is kept separately in `../home-haven-3d/` and is not part of this game.
