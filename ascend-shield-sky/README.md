# Ascend: Shield & Sky

Mobile-first 2D arcade game (HTML5 canvas, no build step). Drag a shield to **repel** obstacles away from your hero,
launch from 100 different planets or climb the endless sky, collect coins, unlock heroes + shield skins, buy upgrades.

Open `index.html` in a browser. `legacy.html` is the very first single-file version.

## Modes
* **Journey** — 100 levels. Each level launches from a different planet (Earth, Moon, Mars, Venus, ice, lava, gas giant,
  crystal, neon, black hole, then seeded alien planets). Reach the goal distance. 1–3 stars (fewer hits = more stars),
  **⚑ checkpoint at the halfway point** (retry from it), next level unlocks.
* **Endless** — climb forever; Sky → Upper atmosphere → Space → a new seeded alien planet every 5,000 m.
  **⚑ Checkpoint every 2,500 m**, start later runs from any checkpoint you reached.

## Gameplay systems
* Shield **repels** (bounce + spin + sparks + bonk). Hero has 3 lives (up to 5), knockback + 1.5 s i-frames.
* Obstacles from **above, the sides and from below** (comets, jets, missiles with warning markers), saws, mines, orbiting rings,
  homing drones, splitting rocks, wall gaps, meteor showers. Obstacle *art* changes with the zone/planet (`js/obsart.js`).
* **Shield Gun** upgrade mounts a turret on the shield that aims at threats. 9 shield skins (`js/shields.js`), 7 heroes.
* **Adaptive difficulty** (`js/difficulty.js`): a "flow" score follows how well you play; the first 30 s are always gentle.
  Opt-in **Easy Assist** (rewarded ad) lowers difficulty for 3 runs. The game never gets harder because you skipped ads.
* Near-miss bonus, combos, power-ups, abilities (Ghost, Slow-Mo, Dash), world-anchored flags (finish, checkpoint, your best).

## Files (classic scripts — load order is in `index.html`)
| file | what |
|---|---|
| `js/util.js` `storage.js` `config.js` `data.js` | helpers, localStorage save, **backend/store config**, characters + upgrades |
| `js/audio.js` | Web Audio sfx + generative music |
| `js/ads.js` | **`showRewardedAd(onReward,onFail)`** placeholder + AdMob/Capacitor instructions |
| `js/iap.js` | **coin shop** (demo purchases on web; Google Play Billing hook for the store build) |
| `js/backend.js` | player profile (name + optional email with consent) + online leaderboard (Supabase REST) |
| `js/chars.js` `shields.js` `obsart.js` | art: heroes, shield skins + gun turret, obstacle skins |
| `js/world.js` `levels.js` | infinite world + 100 planet levels |
| `js/difficulty.js` `entities.js` `game.js` | adaptive difficulty, object pools + wave patterns, loop/physics/rendering |
| `js/ui.js` | landing, map, shop, leaderboard, profile, HUD, modals |

## Before you publish (important)
1. **Leaderboard + emails:** create a free Supabase project, run `supabase/schema.sql`, put the URL + anon key in `js/config.js`.
   Emails are stored only when the player ticks the consent box, and are unreadable with the public key.
   You need a **privacy policy** URL (`privacyUrl`) — Google Play and GDPR require it when you collect emails.
   To e-mail/push players use the service-role key from *your own server* (never in the app). Scores are client-sent, so validate them
   in an Edge Function if cheating matters. Push notifications (FCM) usually work better than email for re-engagement.
2. **In-app purchases:** the web build uses *demo purchases* (no money). For the Play Store set `demoPurchases:false`, connect Google Play
   Billing in `js/iap.js` (`nativeBuy`, example inside) and **verify receipts on your server** before granting coins.
3. **Ads:** replace the body of `showRewardedAd` in `js/ads.js` with AdMob rewarded ads (steps inside).

## Play Store (Capacitor)
```bash
npm i @capacitor/core @capacitor/cli @capacitor/android
npx cap init "Ascend: Shield & Sky" com.yourname.ascend --web-dir ascend-shield-sky
npx cap add android && npx cap sync
```
Lock the activity to portrait. The Google Font is optional (system font fallback offline).

## Single-file build
`python3 tools/bundle.py` → `dist/ascend-single.html`
