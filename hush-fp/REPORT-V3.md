# HUSH-FP v3 — audit round (file: `HUSH-FP-v3.html`)

Built from the existing project (`node tools/build.mjs src/main.js HUSH-FP-v3.html`). `HUSH-FP.html` (round 2) is untouched.

## Changed
**Environment** – every room now has a *kind* (ch1 storage/office/machine/vault, ch2 pump/tanks/control/sluice, ch3 hive/cells/bonepit/nursery) with its own tint, lamp colour, landmark prop at the room centre (shelf, console, generator-machine, column, glass tank with liquid, cage, cocoon, pod, bones), stencil signs per room kind, wall decals (hand prints, scratches, slime, blood, papers), hazard bands, floor stains/papers, blood by lockers, and light streaks on wet floors. All merged into a few meshes. Lamps near an awake creature stutter.
**Monster** – blob shadow, lunge pose (arms/jaw/chest) when hunting within ~2 tiles and on the catch; tall landmark props now block sight.
**Sonar** – 3.5 s cooldown (button shows a sweep + seconds, "SONAR RECHARGING" banner on early press), charges unchanged; during a pulse, diamonds mark items/doors/exit/generator/valve/notes through walls and a red marker shows creatures (setting *Objective markers on pulse*); edge arrows warn of a hunting/investigating creature within 16 tiles that is off-screen.
**UI** – inventory panel (bag button, `I`/Tab): 6 entries with counts + descriptions, switch flashlight / use radio; objectives panel (tap the objective chip, `O`): checklist + hint; both pause the game. Chapter cards with artwork, restyled panels; settings gain the markers toggle. Layout fixes for short screens.
**Tests added** – `tests/monster.cjs` (real page: noise→investigate→search→roam, sight→hunt→catch→death overlay→retry, pulse cooldown/charges, inventory/objective panels, console errors), `tests/layout.cjs` (7 Android viewport sizes), `tests/shots.cjs`/`uishots.cjs` (screenshots). `tests/ai.mjs` scenarios were made robust against props.

## Verified (run on this build)
gen 30/30 solvable · play 30/30 through the game logic · ai 17/17 · ui.cjs 41/41 · monster.cjs 19/19 · layout.cjs 21/21 · page.cjs: all 30 levels completed in the real page (3 chunks), 0 page errors · screenshots reviewed for ch1/2/3 rooms, HUD, inventory, objectives, chapters, levels.

## Not verified / known issues
- Run in software WebGL only: **no real phone performance numbers**; draw calls 37–141 per level, tris up to 64k.
- **Audio never listened to** (no new sounds added; cues are the existing ones plus visual warnings).
- Careful-player stealth proxy bot wins only ~29%: difficulty balance not verified by real players (Easy/Normal/Hard exist).
- Sonar marker drawing was exercised (no errors) but I did not pixel-check the marker shapes in a screenshot with items in range.
- No subtitles/captions option and no music/SFX split beyond existing Master/Ambience/SFX toggles; title screen has no monster silhouette art (3D menu scene is used).
- Fear-flicker only modulates the pooled light, not the lamp mesh colour (lamp materials are shared).
