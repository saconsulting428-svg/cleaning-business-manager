/* Optional rewarded video (used only for the "show the route" hint). The real ad comes from the Android app:
 *   window.showRewardedAd = () => Promise<boolean>   (true ONLY after the user-earned-reward callback)
 *   window.isRewardedAdReady = () => boolean         (optional)
 * Nothing is granted unless the promise resolves with exactly true. ?testads=1 enables a clearly labelled desktop test. */
(function (S) {
  'use strict';
  const TEST = /[?&]testads=1/.test(location.search), TIMEOUT = 90000;
  const ads = {
    token: 0, timer: 0, pending: null, testLeft: 0,
    available() {
      if (typeof window.showRewardedAd === 'function') {
        try { return typeof window.isRewardedAdReady === 'function' ? window.isRewardedAdReady() !== false : true; } catch (e) { return true; }
      }
      return TEST;
    },
    isTest: () => TEST && typeof window.showRewardedAd !== 'function',
    // cb(ok, message)
    request(cb) {
      if (!ads.available()) { cb(false, 'No ad available right now.'); return; }
      const token = ++ads.token;
      ads.pending = { cb: cb, token: token, at: performance.now() };
      const finish = (ok, msg) => {
        if (!ads.pending || ads.pending.token !== token) return;
        ads.token++; clearTimeout(ads.timer);
        const c = ads.pending.cb; ads.pending = null;
        c(ok === true, msg);
      };
      ads.finish = finish;
      if (typeof window.showRewardedAd === 'function') {
        ads.timer = setTimeout(() => finish(false, 'The ad took too long.'), TIMEOUT);
        let p;
        try { p = Promise.resolve(window.showRewardedAd()); } catch (e) { p = Promise.reject(e); }
        p.then((ok) => finish(ok === true, ok === true ? '' : 'Ad not completed.'), () => finish(false, 'Ad not available.'));
      } else { ads.testLeft = 5000; }
    },
    cancel() { if (ads.pending && ads.finish) ads.finish(false, 'Cancelled.'); },
    update(dt) { if (ads.pending && ads.testLeft > 0) { ads.testLeft -= dt; if (ads.testLeft <= 0) ads.finish(true, ''); } }
  };
  S.ads = ads;
})(window.SFR);
