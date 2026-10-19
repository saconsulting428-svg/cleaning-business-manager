# Snake – Fruit Rush

`Fruit_Rush_Snake.html` is the updated single-file game (Phaser is still inlined).
`Fruit_Rush_Snake.original.html` is the untouched original, kept as a backup.

## What was added
- **Daily challenge** – one objective per date (eat fruits, score, survive, big fruits, golden fruit, combo, or dodge bombs in Ultimate mode). Same date = same challenge. Shown on the home screen and in the HUD / game-over screen. The coin reward (plus a small streak bonus) is paid once per date.
- **Coins + 8 snake skins** – coins come from fruits (1), big fruits (5), golden fruit (25) and daily challenges. Skins live in the new *Skins* tab (home screen → Skins). Classic (theme colours) is free; locked skins can only be equipped after being unlocked.
- **Gameplay** – golden fruit, combo milestone banners (NICE / GREAT / AWESOME …) with a ring + sparks, close-call bonus when you turn away from a bomb one tile before it (Ultimate), power-up banners and rings. Effects are capped at 48 small shapes.
- **Game over** – shows coins earned and daily progress. *Revive (watch ad)* is only offered when an ad provider exists.

## Rewarded ads (AdMob)
The game does **not** contain an ad SDK. The Android wrapper must provide:

```js
window.showRewardedAd = () => Promise<boolean>;   // required
window.isRewardedAdReady = () => boolean;         // optional
```
`showRewardedAd` must resolve `true` only from AdMob's *user earned reward* callback, and `false`/reject when the ad fails, is not filled, or is dismissed early. The revive happens only for exactly `true`. Without the hook no revive button is shown. For desktop testing only, open the page with `?testads=1` (5 s countdown, clearly labelled TEST AD).

## Saved data (localStorage `snakeFruitRush.v1`)
Existing keys are unchanged (`highs`, `mode`, `theme`, `bg`, `sound`, `save`, …). New keys: `coins`, `skin`, `skins`, `daily`, `claimedDates`, `streak`, `lastClaim`. All are validated on load; old saves load fine.
