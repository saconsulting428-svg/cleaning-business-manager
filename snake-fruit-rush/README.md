# Snake Fruit Rush

Offline, mobile-first Snake game (HTML5 Canvas + CSS + vanilla JS). No dependencies, backend or network.

## Structure
```
snake-fruit-rush/
  index.html   screens + markup
  style.css    themes (CSS vars), layout, animations
  game.js      game logic, rendering, input, sound (WebAudio), themes, storage
  ads.js       MOCK rewarded ad -> showRewardedAd(onReward, onFail)
  assets/      icon.svg
```

## Run
`cd snake-fruit-rush && python3 -m http.server 8000` then open http://localhost:8000 (use phone emulation in devtools).
Controls: swipe, on-screen arrows, Arrow keys / WASD, Space = pause.
Adding `?test=1` exposes `window.__sfr` (debug hook used by automated tests).

## Android app (Capacitor)
App name **Snake Fruit Rush**, application ID **`com.saconsulting.snakefruitrush`** (change it in `capacitor.config.json`, `android/app/build.gradle` and the Java package folder *before* your first Play upload — it can never change afterwards).

Layout: the web game files stay in this folder; `npm run prepare:web` copies them into `www/` (Capacitor `webDir`); `npx cap sync android` copies `www/` into `android/app/src/main/assets/public`. The app is portrait-only, immersive (bars hidden, swipe from the edge to reveal), keeps the screen on, and requests **no permissions** (fully offline). Icons/splash are generated from `resources/` with `@capacitor/assets` (`node scripts/make-icons.js` re-renders the PNGs).

**Prerequisites:** Node 20+, JDK 17 or 21, Android Studio (installs the Android SDK, API 35).

```
npm install
npm run sync            # copy web game -> Android project
npm run open            # opens android/ in Android Studio
```
**Run on a phone/emulator:** in Android Studio pick a device (USB-debugging phone or an AVD) and press Run; or `npm run build:apk` and install `android/app/build/outputs/apk/debug/app-debug.apk` with `adb install -r`.

**Signed AAB for Google Play**
1. Create an upload key once (keep it and its passwords safe and backed up):
   `keytool -genkeypair -v -keystore snakefruitrush-release.jks -alias snakefruitrush -keyalg RSA -keysize 2048 -validity 10000`
2. Copy `android/keystore.properties.example` to `android/keystore.properties` and fill in the real values (`storeFile` is relative to `android/`; the key and properties files are git-ignored).
3. Build: `npm run build:aab` (same as `npm run sync && cd android && ./gradlew bundleRelease`).
4. Output: `android/app/build/outputs/bundle/release/app-release.aab`

Increase `versionCode` in `android/app/build.gradle` for every new upload. Without `keystore.properties` the AAB is built unsigned.

## AdMob later
Only `ads.js` changes (plus the AdMob Capacitor plugin and the `INTERNET` permission): replace the body of `showRewardedAd(onReward, onFail)` with the Capacitor AdMob rewarded flow (load → show → call `onReward()` on reward, `onFail()` otherwise). `game.js` calls it from `revive()`.

## Power-ups later
`PowerUps` in `game.js` already hooks score multiplier, tick speed and collision absorption; register definitions there.
