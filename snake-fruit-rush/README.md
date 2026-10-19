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

## Update 2
- **Sound**: sound effects (pop, yum, golden, combo, power-up, boom, game over, button click) plus a happy background tune. Audio starts after the first tap (browser rule). In an Android WebView set `setMediaPlaybackRequiresUserGesture(false)`. The Sound button turns everything off. Music stops on pause, game over and Home.
- **Locked skin fix**: pressing *Done* while a locked skin is picked now shows an error and goes back to the skin in use. Tapping an unaffordable skin's button also shows an error.
- **Cute look**: bigger shiny eyes and cheeks; new Panda, Dragon and Unicorn skins; rainbow/fire/sparkle trails; confetti on big moments.
- **Gifts tab** (home screen): free Daily Spin (once per date) and Mystery Egg (100 coins: coins or a new skin).
- **Share score** on the game-over screen. The app can provide `window.shareText(text)`; otherwise the browser share sheet, clipboard or WhatsApp link is used. Optional `window.SHARE_URL` is added to the text.
