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

## Capacitor later
Point `webDir` at this folder (`npx cap init`, `npx cap add android`, `npx cap build android`). Lock orientation to portrait in the Android manifest.

## AdMob later
Only `ads.js` changes: replace the body of `showRewardedAd(onReward, onFail)` with the Capacitor AdMob rewarded flow (load → show → call `onReward()` on reward, `onFail()` otherwise). `game.js` calls it from `revive()`.

## Power-ups later
`PowerUps` in `game.js` already hooks score multiplier, tick speed and collision absorption; register definitions there.
