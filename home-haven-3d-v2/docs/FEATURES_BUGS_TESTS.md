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
* The Homescapes-style "pick a style" renovation variant from the previous iteration is kept separately in `../home-haven-3d/` and is not part of this game.
