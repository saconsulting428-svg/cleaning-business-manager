# Snake Fruit Rush 2.0 - Snake + Puzzle + Escape (Capacitor / Android)

One mode: the **100-level puzzle campaign** (5 worlds x 20 levels). The snake moves by itself, continuously, like the original game; **only the player turns it** (swipe, tap-to-turn, optional D-pad, keyboard for testing). Nothing in the game ever steers the snake.

This is an **update of the app already on Google Play**:

| | |
|---|---|
| Package / applicationId | `com.snakefruitrush.game` (read from your `app-release.aab`; unchanged) |
| versionCode / versionName | `2` / `2.0` (the uploaded .aab was `1` / `1.0`) |
| Engine | Phaser 3 (canvas), same Capacitor 8 Android project |
| minSdk / targetSdk | 24 / 36 (unchanged) |

> The earlier project zip used `com.oconsulting.snakefruitrush`, but the `.aab` you uploaded as the release is `com.snakefruitrush.game`, so that is the id used here. If your Play Console app really uses the other id, change it in `capacitor.config.json`, `android/app/build.gradle`, `strings.xml` and the folder/package of `MainActivity.java`.

## Build the .aab (on your computer)
1. Install Node 22+ and Android Studio (JDK 21 is bundled).
2. `npm install` then `npx cap sync android`
3. `npx cap open android`, wait for Gradle sync.
4. Test on a phone (Run), then **Build > Generate Signed App Bundle > Android App Bundle > release**.
5. Sign with **the same upload keystore as your first release** (the one that signed `app-release.aab`, certificate CN=Danish Shafiq). A different key will be rejected by Google Play.
6. Upload `android/app/release/app-release.aab` as a new release. For every later update raise `versionCode` in `android/app/build.gradle`.

## What is in the game
- Main menu, level map (5 worlds, stars, unlock animation), level intro, gameplay HUD, pause, level complete (1/2/3 star reveal, coin count-up), failed screen, mechanic tutorials, settings, skin shop (11 skins, coins), sound + music + vibration.
- Mechanics, introduced step by step: walls, optional bonus fruit, move cap, key + door, switch + gate, bombs, ice, portals. Every fruit adds one segment, so the snake's length is part of the puzzle.
- Save data (`localStorage`, key `snakeFruitRush.v2`): unlocked level, completed levels, best stars, coins, skins, settings, tutorial flags and an unfinished attempt. Coins, skins and the sound setting of the old survival game are migrated from `snakeFruitRush.v1`.
- Rewards are paid once: first clear 5 + fruit coins, first 3-star +5, replay +1.

## Rewarded ads (optional hint)
The game has no ad SDK. After 2 failed attempts at a level it offers "Show route (watch ad)", **only if** the app provides
`window.showRewardedAd = () => Promise<boolean>` (resolve `true` only from AdMob's earned-reward callback; optional `window.isRewardedAdReady()`). Nothing is granted without `true`. Open the game with `?testads=1` on a desktop to try the flow with a clearly labelled test countdown. AdMob itself is **not** integrated yet.

## Project layout
```
www/                 the game (plain scripts, no bundler)
  js/engine.js       pure puzzle rules (also used by the validators)
  js/levels/world1..5.js   the 100 authored levels (data only)
  js/levels.js play.js board.js screens*.js ui.js gfx.js art*.js skins.js audio.js save.js ads.js main.js
android/             Capacitor Android project
store-assets/        icon, feature graphic, 6 phone screenshots
tools/               validators, solver, tests, level pipeline (see docs/LEVELS.md)
docs/LEVELS.md       what was wrong in the design levels and how it was fixed
```
Adding or changing a level = edit its object in `www/js/levels/worldN.js`, then run `node tools/validate-levels.mjs`.

## Tests (no Android needed)
```
node tools/engine-tests.mjs          36 rule tests (walls, body, tail, doors, switches, ice, portals, caps, stars)
node tools/validate-levels.mjs       all 100 levels: structure, start runway, solution replay, 3 stars, devices matter, fairness
node tools/browser-tests/bot.mjs     a bot plays all 100 levels in the real game loop (needs Playwright + Chromium)
node tools/browser-tests/touch.mjs   real swipes/taps, pause, retry, no auto-steering
node tools/browser-tests/save.mjs    save, migration, reload, resume, skins
```
(set `CHROME_PATH` and `PLAYWRIGHT_DIR` for the browser tests)
