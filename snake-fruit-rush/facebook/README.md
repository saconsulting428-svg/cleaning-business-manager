# Snake Fruit Rush - Facebook Instant Games build

Plain HTML5 build (Phaser 3, no Capacitor/AdMob). Gameplay, levels, UI, sound and swipe controls are the same as the Android game.

## Files
- `index.html` - entry point (must stay at the root of the zip)
- `fbapp-config.json` - Instant Games config (PORTRAIT, RICH_GAMEPLAY)
- `css/style.css` - styles + embedded Fredoka font
- `js/phaser.min.js, engine.js, levels.js, assets*.js, game.js` - game (all images/sounds are embedded in the JS)
- `js/fb-config.js` - **your placement IDs go here**
- `js/fb-bridge.js` - Facebook SDK glue (init, rewarded ads, interstitials, share)

## Test locally (plain browser)
```
cd SnakeFruitRush_FB
python3 -m http.server 8080      # then open http://localhost:8080
```
Outside Facebook the SDK call fails quietly: the game runs normally, without ads.

## Upload and test on Facebook
1. developers.facebook.com -> My Apps -> create an app (type: Instant Games / Gaming) -> add the **Instant Games** product.
2. Instant Games -> Web Hosting -> **Upload Version** -> upload `SnakeFruitRush_Facebook_HTML5.zip`.
3. Wait until the status is *Standby*, then press **Push to Staging** (or "Play" next to the build). Open the staging link on a phone and desktop; the link works for app admins/testers.
4. Check the Instant Games -> Details page: icon (512x512), cover (1200x628), category, description, Privacy Policy URL.
5. When tested: **Push to Production**, then submit the app for review.

## Still required (not possible without your Facebook app)
- Create **Rewarded Video** and **Interstitial** placements (Monetization -> Audience Network). Paste the IDs in `js/fb-config.js`. While they are empty the game hides every "Watch ad" button and shows no ads.
- The Android game's "free coins / hint / revive / x2 coins" ads use the same rewarded placement here.
- Check the SDK version in `index.html` (`fbinstant.7.1.js`) against the current one in the Facebook docs.
- Save data is still stored in `localStorage` (as in the Android game). For progress that follows the player across devices, add `FBInstant.player.setDataAsync/getDataAsync`; this was left out on purpose so nothing in the game changes.
- Optional: leaderboards, player name/photo, `FBInstant.onPause`, in-app purchases (the game's "Coin packs" are still "Coming soon", as before).
- Sharing: "Share score" opens the Facebook share dialog with a generated score card.
- Facebook may ask for a privacy policy URL and content rating, and does not allow external links.
- Not tested inside real Facebook (needs your app): only a mocked SDK was used here.
