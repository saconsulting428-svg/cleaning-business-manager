/* Snake Fruit Rush - AdMob bridge.
 * ONE place for every AdMob ID. The game itself only talks to window.SFRAds (below) and to the two existing hooks
 *   window.showRewardedAd() -> Promise<boolean>   (true ONLY after the "user earned the reward" callback)
 *   window.isRewardedAdReady() -> boolean
 * In the Android app (Capacitor + @capacitor-community/admob) the real SDK is used. In a normal browser nothing is shown,
 * unless the page is opened with ?testads=1: then clearly labelled test ads are simulated (no network, no real ads).
 */
(function () {
  'use strict';
  // ----------------------------------------------------------------------------------------------------
  // IDs (exact values from the AdMob console files). Set ADS_USE_TEST_IDS = true on a phone while testing:
  // it switches every request to Google's official test units, so live ads are never clicked by accident.
  // ----------------------------------------------------------------------------------------------------
  const ADS_USE_TEST_IDS = false;
  const LIVE = {
    appId: 'ca-app-pub-4552686824557844~5490413597',          // also goes into AndroidManifest.xml (com.google.android.gms.ads.APPLICATION_ID)
    banner: 'ca-app-pub-4552686824557844/8189814263',
    interstitial: 'ca-app-pub-4552686824557844/4376807748',
    rewarded: 'ca-app-pub-4552686824557844/7573816720'
  };
  const TEST = {                                                // Google's public sample units
    appId: 'ca-app-pub-3940256099942544~3347511713',
    banner: 'ca-app-pub-3940256099942544/6300978111',
    interstitial: 'ca-app-pub-3940256099942544/1033173712',
    rewarded: 'ca-app-pub-3940256099942544/5224354917'
  };
  const SIM_FLAG = /[?&]testads=1/.test(location.search);
  const cap = window.Capacitor;
  const plugin = cap && cap.Plugins && cap.Plugins.AdMob;
  const native = !!(plugin && typeof cap.isNativePlatform === 'function' && cap.isNativePlatform());
  const sim = SIM_FLAG && !native;
  const testing = ADS_USE_TEST_IDS || SIM_FLAG;
  const IDS = testing ? TEST : LIVE;
  const BANNER_SCREENS = { menu: true, levels: true };         // banner only where it can never cover the snake, board, HUD or controls

  const A = { native: native, sim: sim, testing: testing, ids: IDS, listeners: 0, bannerH: 0, state: { banner: false, bannerShown: false, interReady: false, rewardedReady: false } };
  let inited = false, wantBanner = false, bannerTimer = 0, retryT = { rewarded: 0, inter: 0, banner: 0 }, gameBase = null;

  // ---------- keep the banner away from the game ----------
  // The banner is a native view at the bottom of the screen. If the phone is tall the game already has empty space there;
  // otherwise the game area is made a little shorter - once, and it then stays the same on every screen (no resizing between screens).
  function reserve(h) {
    const el = document.getElementById('game');
    if (!el) return;
    if (!gameBase) { const r = el.getBoundingClientRect(); gameBase = { w: r.width, h: r.height, off: 0 }; }
    const s = Math.min(gameBase.w / 480, gameBase.h / 800), spare = Math.max(0, (gameBase.h - 800 * s) / 2);
    const need = Math.max(0, Math.ceil(h - spare + 2));
    if (need === gameBase.off) return;
    gameBase.off = need;
    el.style.bottom = 'calc(env(safe-area-inset-bottom) + ' + need + 'px)';
    try { window.dispatchEvent(new Event('resize')); } catch (e) { /* ignore */ }
  }

  // ---------- simulated banner for ?testads=1 in a desktop browser ----------
  let simBanner = null;
  function simShowBanner(on) {
    if (!simBanner) {
      simBanner = document.createElement('div');
      simBanner.style.cssText = 'position:fixed;left:0;right:0;bottom:0;height:50px;display:none;align-items:center;justify-content:center;background:#e5e7eb;color:#111;font:600 13px sans-serif;z-index:5;border-top:2px dashed #9ca3af;letter-spacing:.5px';
      simBanner.textContent = 'TEST BANNER (320x50) - not a real ad';
      document.body.appendChild(simBanner);
      reserve(50);
    }
    simBanner.style.display = on ? 'flex' : 'none';
  }

  // ---------- native listeners (added exactly once) ----------
  let rewardedEarned = false, rewardedWait = null, interWait = null;
  function addListeners() {
    const on = (name, fn) => { try { plugin.addListener(name, fn); A.listeners++; } catch (e) { /* ignore */ } };
    on('bannerAdSizeChanged', (info) => { if (info && info.height > 0) { A.bannerH = info.height; reserve(info.height); } });
    on('bannerAdLoaded', () => { A.state.banner = true; });
    on('bannerAdFailedToLoad', () => { A.state.banner = false; A.state.bannerShown = false; schedule('banner'); });
    on('interstitialAdLoaded', () => { A.state.interReady = true; });
    on('interstitialAdFailedToLoad', () => { A.state.interReady = false; schedule('inter'); });
    on('interstitialAdDismissed', () => { A.state.interReady = false; if (interWait) { const f = interWait; interWait = null; f(); } setTimeout(prepInter, 1500); });
    on('interstitialAdFailedToShow', () => { A.state.interReady = false; if (interWait) { const f = interWait; interWait = null; f(); } setTimeout(prepInter, 3000); });
    on('onRewardedVideoAdLoaded', () => { A.state.rewardedReady = true; });
    on('onRewardedVideoAdFailedToLoad', () => { A.state.rewardedReady = false; schedule('rewarded'); });
    on('onRewardedVideoAdReward', () => {                         // the ONLY place a reward is recorded
      rewardedEarned = true;
      if (rewardedWait) setTimeout(() => { if (rewardedWait && rewardedEarned) finishRewarded(true); }, 4000);   // safety if "dismissed" never arrives
    });
    on('onRewardedVideoAdDismissed', () => { finishRewarded(rewardedEarned); });
    on('onRewardedVideoAdFailedToShow', () => { finishRewarded(false); });
  }
  function finishRewarded(ok) {
    A.state.rewardedReady = false;
    const f = rewardedWait; rewardedWait = null;
    const earned = ok === true && rewardedEarned;
    rewardedEarned = false;
    if (f) f(earned);
    setTimeout(prepRewarded, 1500);
  }
  function schedule(kind) {                                      // gentle retry (30 s, then 60 s ... never more than every 5 min)
    const r = retryT; r[kind + 'n'] = Math.min(10, (r[kind + 'n'] || 0) + 1);
    clearTimeout(r[kind]);
    r[kind] = setTimeout(() => { if (kind === 'rewarded') prepRewarded(); else if (kind === 'inter') prepInter(); else applyBanner(); }, Math.min(300000, 30000 * r[kind + 'n']));
  }
  async function prepInter() { if (!native || A.state.interReady) return; try { await plugin.prepareInterstitial({ adId: IDS.interstitial, isTesting: testing }); } catch (e) { A.state.interReady = false; schedule('inter'); } }
  async function prepRewarded() { if (!native || A.state.rewardedReady) return; try { await plugin.prepareRewardVideoAd({ adId: IDS.rewarded, isTesting: testing }); } catch (e) { A.state.rewardedReady = false; schedule('rewarded'); } }

  // ---------- banner ----------
  async function applyBanner() {
    if (sim) { simShowBanner(wantBanner); return; }
    if (!native || !inited) return;
    try {
      if (wantBanner) {
        if (!A.state.bannerShown) {
          if (A.state.banner) { await plugin.resumeBanner(); A.state.bannerShown = true; }
          else { await plugin.showBanner({ adId: IDS.banner, adSize: 'ADAPTIVE_BANNER', position: 'BOTTOM_CENTER', margin: 0, isTesting: testing }); A.state.bannerShown = true; }
        }
      } else if (A.state.bannerShown) { await plugin.hideBanner(); A.state.bannerShown = false; }
    } catch (e) { A.state.bannerShown = false; schedule('banner'); }
  }
  // The game tells which screen is showing. Banner only on menu screens; hidden in gameplay, pause, win, fail and during any ad.
  A.screen = function (name) {
    const want = !!BANNER_SCREENS[name];
    if (want === wantBanner) return;
    wantBanner = want;
    clearTimeout(bannerTimer);
    bannerTimer = setTimeout(applyBanner, want ? 250 : 0);     // hide immediately, show after a short settle
  };

  // ---------- rewarded / interstitial ----------
  A.rewardedReady = () => (native ? inited && A.state.rewardedReady : false);
  A.showRewarded = function () {
    return new Promise((resolve) => {
      if (!native || !A.state.rewardedReady || rewardedWait) { resolve(false); return; }
      rewardedEarned = false;
      rewardedWait = resolve;
      plugin.showRewardVideoAd().catch(() => finishRewarded(false));
    });
  };
  A.interReady = () => (sim ? true : native ? inited && A.state.interReady : false);
  A.showInter = function () {
    return new Promise((resolve) => {
      if (sim) { resolve(); return; }
      if (!native || !A.state.interReady || interWait) { resolve(); return; }
      interWait = resolve;
      plugin.showInterstitial().catch(() => { if (interWait) { const f = interWait; interWait = null; f(); } });
    });
  };

  // ---------- start (never blocks the game: runs a moment after the page loaded) ----------
  A.init = async function () {
    if (inited) return;
    if (sim) { inited = true; applyBanner(); return; }
    if (!native) return;
    try {
      try {                                                      // consent form where the law needs it (EEA / UK)
        const info = await plugin.requestConsentInfo();
        if (info && info.isConsentFormAvailable && info.status === 'REQUIRED') await plugin.showConsentForm();
      } catch (e) { /* no consent form available: continue */ }
      await plugin.initialize({ initializeForTesting: testing });
      addListeners();
      inited = true;
      prepRewarded(); prepInter(); applyBanner();
    } catch (e) { inited = false; }
  };
  window.SFRAds = A;
  // hooks the game already knows (only defined when a real rewarded ad can exist)
  if (native) {
    window.showRewardedAd = function () { return A.showRewarded(); };
    window.isRewardedAdReady = function () { return A.rewardedReady(); };
  }
  setTimeout(() => { A.init(); }, 1200);
})();
