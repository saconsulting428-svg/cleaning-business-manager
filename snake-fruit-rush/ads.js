/*
 * Ad service — MOCK ONLY.
 *
 * game.js calls showRewardedAd(onReward, onFail) and knows nothing else about ads.
 * To integrate Google AdMob later (Capacitor), replace the body of showRewardedAd with
 * the plugin's rewarded flow: load -> show -> on reward call onReward(); on
 * dismiss-without-reward / load failure call onFail(). Keep the signature unchanged.
 */
(function () {
  'use strict';
  var AD_SECONDS = 3;
  var busy = false;

  function showRewardedAd(onReward, onFail) {
    if (busy) return;
    busy = true;
    var ov = document.getElementById('adOverlay');
    var bar = document.getElementById('adBar');
    var cnt = document.getElementById('adCount');
    var start = performance.now();
    var raf = 0;
    ov.classList.add('show');

    function finish(ok) {
      cancelAnimationFrame(raf);
      ov.classList.remove('show');
      bar.style.transform = 'scaleX(0)';
      busy = false;
      if (ok) { if (onReward) onReward(); } else if (onFail) { onFail(); }
    }
    function step(now) {
      var p = Math.min(1, (now - start) / (AD_SECONDS * 1000));
      bar.style.transform = 'scaleX(' + p + ')';
      cnt.textContent = Math.max(1, Math.ceil(AD_SECONDS * (1 - p)));
      if (p >= 1) finish(true); else raf = requestAnimationFrame(step);
    }
    bar.style.transform = 'scaleX(0)';
    raf = requestAnimationFrame(step);
  }

  window.showRewardedAd = showRewardedAd;
})();
