# Ascend: Shield & Sky

Mobile-first 2D arcade game (HTML5 canvas). Drag a shield to **repel** obstacles away from your hero, climb an infinite
procedurally changing world, collect coins, unlock characters and buy upgrades.

Run it: open `index.html` in a browser (no build step, no server needed). `legacy.html` is the previous single-file version.

## Structure (classic scripts, load order matters — see `index.html`)
| file | responsibility |
|---|---|
| `js/util.js` | helpers, seeded RNG, shared `G.view` (canvas size / scale) |
| `js/storage.js` | `localStorage` save (coins, best, characters, upgrades, settings, daily) |
| `js/data.js` | characters, upgrades (5 levels each), per-level numbers, daily rewards, milestones |
| `js/audio.js` | Web Audio sound effects + generative music (separate toggles) |
| `js/ads.js` | **`showRewardedAd(onReward, onFail)`** placeholder + AdMob/Capacitor instructions |
| `js/chars.js` | drawing + idle/move animation of the 7 characters |
| `js/world.js` | infinite background: Sky → Upper atmosphere → Space → seeded alien planets forever |
| `js/entities.js` | object pools (obstacles, bullets, coins, pickups, particles), geometry, obstacle waves |
| `js/game.js` | game loop, input, physics, repel, lives, abilities, gun, rendering |
| `js/ui.js` | menu / characters / upgrades / daily / settings screens, HUD, pause / revive / game over |

## Zones (distance in meters)
0–2,000 Sky • 2,000–5,000 Upper atmosphere • 5,000–10,000 Space • 10,000+ alien planets, a new seeded theme every 5,000 m
(ice, lava, ringed gas giant, crystal, neon nebula, black hole, then endless generated variants).
Distance is real: 1 m = 10 px, the world speeds up gradually, the only temporary boost is the Dash ability.

## Play Store (Capacitor)
```bash
npm i @capacitor/core @capacitor/cli @capacitor/android
npx cap init "Ascend: Shield & Sky" com.yourname.ascend --web-dir ascend-shield-sky
npx cap add android && npx cap sync
npm i @capacitor-community/admob && npx cap sync      # then edit js/ads.js (instructions inside)
```
Lock the activity to portrait in `AndroidManifest.xml`. The Google Font is optional (falls back to a system font offline).

## Single-file build
`python3 tools/bundle.py` → `dist/ascend-single.html`
