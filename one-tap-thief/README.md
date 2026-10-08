# One Tap Thief

*Steal. Escape. Don't Get Caught.* — a portrait, one-finger stealth game. HTML5 + CSS3 + vanilla JS (ES modules),
packaged for Android with Capacitor. Offline-first, no backend, no login.

**Status: first milestone (MVP)** — full UI/navigation framework, all game systems, and 10 playable levels
(World 1). The same data-driven architecture scales to the 50-level plan; worlds 2–5 are listed in the level
screen as "coming soon".

## Play it (desktop browser)

```bash
cd one-tap-thief
npm run dev          # → http://localhost:8080   (zero-dependency static server)
```

Press, drag and release where the thief should go (mouse or touch). Keyboard (optional): arrow keys / WASD. Use Chrome devtools device mode for portrait.

## How it plays

- **Drag to move** – press, drag and **release where the thief should go**; he finds his own way around walls and
  furniture. No path, dots or markers are ever drawn — you just watch him go. Releasing on a wall snaps to the nearest
  reachable tile, a second finger or releasing off-screen cancels the gesture, and routes never cross the exit by accident.
  The level starts on your first release.
- **Guards** patrol configurable routes with a vision cone (range + FOV, blocked by walls/furniture). Being seen
  fills a warning meter (`?` → `!`); it drains if you break line of sight; full = **Caught**. Touching a guard = caught.
- **Detection feedback** (every guard and camera): the cone and meter ring go **yellow** (suspicious, `?`) →
  **orange** (actively detecting, `!`) → **red** (critical, `!!`, shock rings, body shake, screen shake). A heartbeat
  speeds up and gets louder as the meter fills, the screen edge glows red in time with it, and a stinger plays when you
  hit critical. Cameras show a `REC` lock-on ring and beep faster (higher pitch) as they close in.
- **CCTV cameras** sweep a cone; if one fills its meter it sounds the **alarm**. **Alarm zones** (red tiles) and
  **blinking lasers** trigger it too. During an alarm guards run to the spot, move faster and see further.
- **Proximity awareness** – guards also sense you at short range (1.4 tiles) from any direction, even behind their
  back: the closer you are, the faster their meter fills; they stop, slowly turn toward you and the screen/heartbeat
  tense up. Walls block it and hiding defeats it. Passing right behind a guard is a gamble, not a free pass.
- **Hiding spots** (wardrobes) make the thief invisible to cones. **Keys** open **locked doors** (one key per door).
- **Stars**: 1★ reach the exit · 2★ exit + at least half the loot (`minLoot` configurable per level) ·
  3★ **Perfect Heist** = all loot, never detected (meter never passed 35 %), no alarm.
- **Coins** (cosmetic currency only): loot +10, rare gem +50, Perfect Heist +100. Coins are paid on completion.
- **Caught** → Retry, or **Continue** (rewarded-ad placeholder; 3 s grace, nearby guards sent back to spawn).
- **Level complete** → stars animation, coins, Perfect badge, Next, Retry, **2× Coins** (rewarded-ad placeholder).
- **Shop / Characters**: 6 characters + 5 colour variants, bought with coins; purely cosmetic.
- **Settings**: sound, music, hints, tap-path, confirmed *Reset progress*. Everything persists in `localStorage`.

## Project layout

```
index.html                 entry (portrait, safe-area aware)
src/main.js                bootstrap
src/config.js              ALL gameplay tuning values (speeds, ranges, coin values, ad frequency…)
src/game/                  grid.js (map/pathfinding/LOS) · sim.js (pure simulation) · game.js (loop + drag input)
                           renderer.js (frame composer) · staticLayer.js (baked floors/walls/furniture/lighting)
                           sprites.js (humanoid thief + police, walk cycles) · props.js (doors, loot, CCTV, lasers…)
src/ai/                    guard.js (patrol/suspicion/alarm AI) · vision.js (cones)
src/entities/              camera.js · laser.js · thief.js (drawing) · cosmetics.js (catalogue)
src/levels/                levels.js (DATA) · worlds.js (themes, 5 worlds × 10 levels)
src/ui/                    ui.js (screens, HUD, modals, shop) · styles.css
src/audio/audio.js         WebAudio synthesised SFX + music (placeholders, no asset files)
src/services/ads.js        AdService abstraction + mock provider + AdMob skeleton
src/storage/save.js        local save data
scripts/                   serve · build · validate-levels · solve · naive · patch-android
android/                   Capacitor Android project
```

The simulation (`src/game/sim.js`) has no DOM access and uses a fixed time step, so it is deterministic and unit-
testable in Node — see *Testing* below.

## Adding / editing levels (no engine changes)

Append an object to `src/levels/levels.js`:

```js
{ level: 11, world: 'apartment', name: 'Penthouse', difficulty: 3,
  hint: 'optional tutorial text',
  map: [ '#########',
         '#S..L..E#',
         '#########' ],                       // # wall . floor F furniture H hide S start E exit
                                             // L loot  R rare  K key  D locked door  A alarm zone
  guards:  [{ patrol: [[2,1,0.8],[6,1,0.8]], mode: 'pingpong', speed: 1.5, range: 4.5, fov: 70 }],
  cameras: [{ x: 4, y: 0, angle: 90, arc: 45, speed: 26, range: 6, fov: 44 }],   // angle: 0=east, 90=south
  lasers:  [{ x: 1, y: 3, dir: 'h', len: 7, on: 1.2, off: 1.8 }],
  minLoot: 2 }                               // optional: loot needed for 2★
```

`summarize(def)` (in `levels.js`) derives the compact `{level, world, guards, cameras, loot, keys, difficulty}`
form. Then run `npm test` — it checks the level is well-formed and **lets a search bot play it**.

## Difficulty progression (Levels 1–10)

Difficulty comes from level design — patrol placement, overlapping cones, risky loot, timing, limited safe routes —
**not** from faster enemies (guard speed stays 1.0–1.5 tiles/s; the thief runs at 4.4).

| Lvl | Name | What it introduces | Signature tension |
|---|---|---|---|
| 1 | First Night | Tutorial, **no guard** | Learn tap-to-move, loot, exit |
| 2 | Night Watch | One **slow** guard (1.0 t/s), visible cone | Loot sits in notches beside his lane — dip in only when he is far; cross his lane on a gap |
| 3 | Long Way Round | **Faster** guard on a long loop that even enters the middle room; one wardrobe | Corner loot where he lingers (1.6 s); gem in the room he patrols; hide to let him pass |
| 4 | Crossfire | **Two guards**, crossing lanes | Band between lanes is covered by both cones; the middle wardrobe is the only refuge |
| 5 | Vault Room | Two patrols + a **sweeping** guard | Rare gem (+50) inside a vault the sweeper watches; hide, learn the rhythm, strike |
| 6 | Eyes on the Wall | **CCTV** + guard | Every route crosses a doorway the camera pans over; beep + REC ring build up before the alarm |
| 7 | Locked In | **Key + locked door** + two guards | Key in the corner a guard lingers at (2 s); door opens onto a second guard's sweep |
| 8 | Tripwire | **Alarm tiles** + two guards | Alarm bands force a zig-zag between lanes — the safe route has to be planned |
| 9 | Inside Job | CCTV + guards + locked door | Camera over the key room, sweeper by the door, patrol looping past both |
| 10 | The Big Score | Everything: 3 guards, CCTV, alarm tiles, **laser**, gems | Perfect Heist needs timing on all of them; gems (+50 ×2) sit behind the laser and a vault sweeper |

How each level was checked (all automated, `npm test`):

| Lvl | Perfect-route extra time vs. no security | Tiles watched >30 % of the time | Careless player (straight to loot) |
|---|---|---|---|
| 1 | +0.0 s | 0 % | wins |
| 2 | +1.7 s | 18 % | spotted |
| 3 | +3.4 s | 3 % | caught after 1.9 s |
| 4 | +7.2 s | 46 % | caught after 2.4 s |
| 5 | +6.6 s | 35 % | caught after 1.3 s |
| 6 | +2.5 s | 56 % | spotted |
| 7 | +5.6 s | 33 % | caught after 2.6 s |
| 8 | +6.3 s | 38 % | alarm + caught |
| 9 | +11.0 s | 32 % | caught after 1.0 s |
| 10 | +16.0 s | 50 % | caught after 1.5 s |

*Perfect-route extra time* = how much longer a perfect-information bot needs for a 3★ Perfect Heist than with all
security removed (waiting for gaps, detours, hiding). A person will take longer. Level 6 is deliberately gentle on this
measure — cameras only raise the alarm, they never end the run.

**Fairness rules enforced by the tests:** a Perfect Heist (3★) route exists on every level; it *still* exists when
every guard/camera is made harsher (detects 20 % faster, +0.4 tiles range, +8° cone); standing still at the start
for 3 s never gets you caught or spotted; no guard waypoint is blocked; no guard lane crosses a hiding spot.

## Testing

```bash
npm test             # = validate-levels + solve
npm run validate     # map parses; loot/keys/exit reachable; keys ≥ doors; guard waypoints walkable
npm run bundle       # dist/OneTapThief.html — the whole game as one standalone file
node scripts/proximity-test.mjs   # guard proximity-awareness scenarios
node scripts/drag-test.mjs        # browser E2E: drag-to-move, no path dots, win/caught, hiding, CCTV, alarm (needs `npm run dev`)
npm run solve        # beam-search bot plays every level in the real simulation; reports whether a 3★ Perfect Heist exists,
                     # whether it survives harsher guards, and how much waiting/detouring the security forces
node scripts/heatmap.mjs 7   # design aid: % of time each tile is watched (ASCII heatmap)
node scripts/tune.mjs 7 '{"range":5.4,"fov":74}'   # design aid: try parameter overrides on a level
node scripts/naive.mjs   # sanity: a careless straight-line player should get caught on guarded levels
```

Current result: all 10 levels are solvable as a 3★ Perfect Heist, including under the harsher-guards probe.

## Android (Capacitor)

Requirements: Node 18+, JDK 17, Android SDK (Android Studio installs it).

```bash
cd one-tap-thief
npm install
npm run android:sync      # copies the web app to www/ and syncs it into android/
npm run android:open      # open in Android Studio → Run on a device/emulator
npm run android:apk       # debug APK  → android/app/build/outputs/apk/debug/app-debug.apk
```

The `android/` project is already generated and locked to portrait (`npm run android:add` recreates it from scratch).

### Signed release AAB (Play Store)

1. Create a keystore once (keep it safe, never commit it):
   `keytool -genkeypair -v -keystore release.keystore -alias onetapthief -keyalg RSA -keysize 2048 -validity 10000`
2. Create `android/keystore.properties` (git-ignored):
   ```
   storeFile=../release.keystore
   storePassword=…
   keyAlias=onetapthief
   keyPassword=…
   ```
3. `npm run android:aab` → `android/app/build/outputs/bundle/release/app-release.aab`

Without `keystore.properties` the release AAB is built **unsigned**. Bump `versionCode`/`versionName` in
`android/app/build.gradle` for each upload.

### CI

`.github/workflows/one-tap-thief-android.yml` runs the level tests, builds a debug APK and a release AAB, and uploads
them as an artifact. Add repo secrets `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`,
`ANDROID_KEY_PASSWORD` to get a signed AAB.

## Monetisation (AdMob-ready, placeholders only)

All ad calls go through `AdService` (`src/services/ads.js`): `showRewarded('continue' | 'double_coins')` and
`maybeShowInterstitial(level)` (every 3rd completed level from level 3 — see `CFG.interstitial`; never every level,
never banners during play). In development a clearly-labelled placeholder overlay stands in for the ad and **no ad IDs
exist anywhere in the repo**. To go live:

1. `npm i @capacitor-community/admob` and add your AdMob *App ID* to `AndroidManifest.xml` (use Google's test IDs first).
2. Implement `AdMobProvider.init/show` (skeleton included) with your rewarded/interstitial unit IDs.
3. `AdService.setProvider(new AdMobProvider({ rewardedId, interstitialId }))` in `src/main.js`.

## Notes / deviations from the spec

- **Mechanics are introduced across World 1.** The spec lists basic guards for levels 1–10 and CCTV/keys/alarms/lasers
  for later worlds; to make the 10-level milestone exercise *every* required system (acceptance criteria), levels 6–10
  introduce cameras, keys/doors, alarm zones and a laser. Re-theme/redistribute when expanding to 50 levels.
- **Audio is synthesised** (WebAudio) so there are no licensing issues; they are marked placeholders — real files can
  replace them in `src/audio/audio.js`.
- **Haptics** are not used (the Android vibrate permission isn't requested).
- The Android APK/AAB could **not** be built in the authoring sandbox (no Android SDK / Gradle download access); the
  project and CI workflow are set up for it, but run the build on your machine or in CI to confirm.
