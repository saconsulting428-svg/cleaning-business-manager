// Facebook Instant Games bridge. Replaces the Android/AdMob bridge. The game only talks to window.SFRAds,
// window.showRewardedAd / isRewardedAdReady and window.shareText - the gameplay code is unchanged.
(function () {
  'use strict';
  var CFG = window.FB_CONFIG || {};
  var FB = window.FBInstant;
  var inited = false, rewarded = null, inter = null, retry = { rewarded: 0, interstitial: 0 };
  var A = { native: !!FB, sim: false, testing: false, ids: {}, listeners: 0, bannerH: 0, state: { banner: false, bannerShown: false, interReady: false, rewardedReady: false } };

  function load(kind) {                                  // preload one ad; retry gently (30 s, 60 s ... max 5 min)
    var id = CFG[kind + 'PlacementId'];
    if (!FB || !inited || !id) return;
    var get = kind === 'rewarded' ? FB.getRewardedVideoAsync : FB.getInterstitialAdAsync;
    get.call(FB, id).then(function (ad) { return ad.loadAsync().then(function () { return ad; }); }).then(function (ad) {
      retry[kind] = 0;
      if (kind === 'rewarded') { rewarded = ad; A.state.rewardedReady = true; } else { inter = ad; A.state.interReady = true; }
    }).catch(function () { retry[kind]++; setTimeout(function () { load(kind); }, Math.min(300000, 30000 * retry[kind])); });
  }
  A.screen = function () {};                              // Instant Games has no banner: nothing to show or hide
  A.rewardedReady = function () { return inited && A.state.rewardedReady; };
  A.showRewarded = function () {
    return new Promise(function (resolve) {
      if (!A.state.rewardedReady || !rewarded) { resolve(false); return; }
      var ad = rewarded; rewarded = null; A.state.rewardedReady = false;
      ad.showAsync().then(function () { resolve(true); load('rewarded'); }, function () { resolve(false); load('rewarded'); });   // showAsync only resolves after the video was watched
    });
  };
  A.interReady = function () { return inited && A.state.interReady; };
  A.showInter = function () {
    return new Promise(function (resolve) {
      if (!A.state.interReady || !inter) { resolve(); return; }
      var ad = inter; inter = null; A.state.interReady = false;
      ad.showAsync().then(function () { resolve(); load('interstitial'); }, function () { resolve(); load('interstitial'); });
    });
  };
  A.init = function () {
    if (!FB || inited) return Promise.resolve();
    return FB.initializeAsync().then(function () {
      inited = true;
      if (CFG.rewardedPlacementId) {                      // only now does the game know that a rewarded ad can exist
        window.showRewardedAd = function () { return A.showRewarded(); };
        window.isRewardedAdReady = function () { return A.rewardedReady(); };
        load('rewarded');
      }
      if (CFG.interstitialPlacementId) setTimeout(function () { load('interstitial'); }, 4000);
      try { FB.setLoadingProgress(100); } catch (e) {}
      return FB.startGameAsync();
    }).catch(function () { /* not inside Facebook (plain browser): the game just runs without ads */ });
  };
  window.SFRAds = A;

  // share score: the game calls window.shareText(text); Instant Games needs a picture, so a small score card is drawn here
  window.shareText = function (text) {
    if (!FB) return;
    try {
      var c = document.createElement('canvas'); c.width = 600; c.height = 314; var x = c.getContext('2d');
      var g = x.createLinearGradient(0, 0, 0, 314); g.addColorStop(0, '#173622'); g.addColorStop(1, '#0f1220'); x.fillStyle = g; x.fillRect(0, 0, 600, 314);
      x.textAlign = 'center'; x.fillStyle = '#fde047'; x.font = '700 54px Fredoka, Verdana, sans-serif'; x.fillText('Snake Fruit Rush', 300, 120);
      x.fillStyle = '#ffffff'; x.font = '500 30px Fredoka, Verdana, sans-serif'; x.fillText(String(text).replace(/ Can you beat me\?.*/, ''), 300, 190);
      x.fillStyle = '#86efac'; x.font = '500 26px Fredoka, Verdana, sans-serif'; x.fillText('Can you beat me?', 300, 240);
      FB.shareAsync({ intent: 'REQUEST', image: c.toDataURL('image/jpeg', 0.8), text: String(text), data: { from: 'score' } }).catch(function () {});
    } catch (e) {}
  };
  A.init();
})();
