/* ============================================================
   ads.js — REWARDED ADS (PLACEHOLDER)
   ------------------------------------------------------------
   Every ad in the game goes through ONE function:
       showRewardedAd(onReward, onFail)
   Right now it only simulates a 3 second fake ad overlay.

   >>> WHERE TO PLUG IN ADMOB (Capacitor) <<<
   1. npm i @capacitor-community/admob && npx cap sync
   2. Replace the body of `showRewardedAd` with:

      const { AdMob, RewardAdPluginEvents } = Capacitor.Plugins; // or import from the package
      let rewarded = false;
      await AdMob.initialize();                                  // once, at startup
      await AdMob.prepareRewardVideoAd({ adId: 'ca-app-pub-XXXX/YYYY', isTesting: true });
      const h1 = await AdMob.addListener(RewardAdPluginEvents.Rewarded, () => { rewarded = true; });
      const h2 = await AdMob.addListener(RewardAdPluginEvents.Dismissed, () => {
        h1.remove(); h2.remove(); rewarded ? onReward() : onFail && onFail('closed');
      });
      const h3 = await AdMob.addListener(RewardAdPluginEvents.FailedToLoad, () => { onFail && onFail('load'); });
      await AdMob.showRewardVideoAd();

   The game code never changes: it only calls showRewardedAd(onReward, onFail).
   Rules kept by the game: ads are always opt-in, never forced.
   ============================================================ */
(function () {
  'use strict';
  const G = window.G;
  let busy = false;
  function showRewardedAd(onReward, onFail, label) {
    if (busy) return;
    busy = true;
    const ov = document.getElementById('adov'), cnt = document.getElementById('adCount'), sub = document.getElementById('adSub'),
      bar = document.getElementById('adBar'), close = document.getElementById('adClose');
    sub.textContent = label || 'Reward loading…';
    ov.classList.add('show'); close.style.visibility = 'hidden';
    G.paused = (G.paused || 0) + 1;
    let t = 3, done = false;
    cnt.textContent = t; bar.style.width = '0%';
    const t0 = performance.now();
    const iv = setInterval(() => {
      const el = (performance.now() - t0) / 1000;
      t = Math.max(0, Math.ceil(3 - el)); cnt.textContent = t;
      bar.style.width = Math.min(100, el / 3 * 100) + '%';
      if (el > 1) close.style.visibility = 'visible';
      if (el >= 3) finish(true);
    }, 80);
    function finish(ok) {
      if (done) return; done = true; clearInterval(iv);
      ov.classList.remove('show'); busy = false; G.paused = Math.max(0, G.paused - 1);
      try { ok ? onReward && onReward() : onFail && onFail('closed'); } catch (e) { console.error(e); }
    }
    close.onclick = () => finish(false);
  }
  G.showRewardedAd = showRewardedAd;
  window.showRewardedAd = showRewardedAd;
})();
