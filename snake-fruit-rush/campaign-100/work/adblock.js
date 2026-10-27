  // ---------- Ads (the SDK is in the bridge script; everything here is only about WHEN to offer or show an ad) ----------
  const INTER_EVERY_LEVELS = 3;      // interstitial after about every 3 completed levels (campaign)
  const INTER_EVERY_ENDLESS = 2;     // ... and after every 2nd Endless game over, when the player chooses Play again
  const INTER_COOLDOWN_MS = 90000;   // never two ads (of any kind) closer than this
  const AD_COIN_REWARD = 50, AD_COIN_DAILY = 3;
  const INTER_FAILSAFE_MS = 30000;
  const adsMeta = { last: Date.now(), levels: 0, endless: 0 };      // session counters only; the first ad can come after a cooldown, never at launch
  let adJob = null, adKind = 'revive';
  let toast = null;                  // {s, ok, until}: short message above the settings sheet
  const SFRAds = () => window.SFRAds;
  const rewardedAvailable = () => adAvailable();
  const interAvailable = () => !!(SFRAds() && SFRAds().interReady());
  const adDay = () => dateKey(new Date());
  const adCoinsToday = () => (DATA.adCoins && DATA.adCoins.d === adDay() ? DATA.adCoins.n : 0);
  const adCoinsLeft = () => Math.max(0, AD_COIN_DAILY - adCoinsToday());
  function sheetToast(s, ok) { toast = { s: s, ok: ok, until: anim + 2600 }; }
  function adStart(kind, job) {      // common start: the game shows its own waiting screen; the real ad covers it
    const token = ++adToken;
    adJob = job; adKind = kind;
    state = 'ad';
    if (SFRAds()) SFRAds().screen('ad');
    return token;
  }
  function endAd(token, ok, msg) {
    if (token !== adToken || state !== 'ad') return;     // cancelled, restarted or answered twice
    adToken++;
    clearTimeout(adTimer);
    const job = adJob; adJob = null;
    adsMeta.last = Date.now();                           // every ad restarts the cooldown
    if (job && job.inter) { setState(job.back); if (job.done) job.done(); return; }
    if (ok === true) {                                   // the reward is granted here and nowhere else
      if (job && job.ok) { setState(job.back); job.ok(); } else { G.adMsg = ''; revive(); }
      return;
    }
    const m = msg || 'Ad not available. Try again later.';
    if (job && job.fail) { setState(job.back); job.fail(m); return; }
    G.adMsg = m;
    setState('over');                                    // normal game-over / restart flow still works
  }
  function cancelAd() { endAd(adToken, false, 'Ad cancelled.'); }
  function requestRewarded(kind, job) {                  // job = {back, ok(), fail(msg)} - null job = Endless revive
    if (state === 'ad' || !adAvailable()) return false;
    const token = adStart(kind, job);
    G && (G.adMsg = G.adMsg || '');
    if (typeof window.showRewardedAd === 'function') {
      adLeft = -1;
      adTimer = setTimeout(() => endAd(token, false, 'Ad took too long.'), AD_TIMEOUT_MS);
      let p;
      try { p = Promise.resolve(window.showRewardedAd()); } catch (e) { p = Promise.reject(e); }
      p.then((ok) => endAd(token, ok === true), () => endAd(token, false));
    } else {
      adLeft = TEST_AD_MS;
    }
    return true;
  }
  function watchAd() {                                   // Endless revive (existing button)
    if (state !== 'over' || (G.revives || 0) >= REVIVES_PER_GAME || !adAvailable()) return;
    G.adMsg = '';
    requestRewarded('revive', null);
  }
  function runInter(done, back) {
    if (state === 'ad') { done(); return; }
    const token = adStart('inter', { inter: true, back: back || state, done: done });
    if (SFRAds() && SFRAds().native) {
      adLeft = -1;
      adTimer = setTimeout(() => endAd(token, true), INTER_FAILSAFE_MS);
      SFRAds().showInter().then(() => endAd(token, true), () => endAd(token, true));
    } else adLeft = 3000;                                // ?testads=1 desktop simulation
  }
  // kind: 'level' | 'endless'. Calls done() right away when no ad is due - the game never waits for an ad that is not there.
  function maybeInter(kind, done) {
    const due = kind === 'level' ? adsMeta.levels >= INTER_EVERY_LEVELS : adsMeta.endless >= INTER_EVERY_ENDLESS;
    if (state !== 'ad' && due && Date.now() - adsMeta.last >= INTER_COOLDOWN_MS && interAvailable()) {
      if (kind === 'level') adsMeta.levels = 0; else adsMeta.endless = 0;
      runInter(done);
      return;
    }
    done();
  }
  function playAgain() { maybeInter('endless', newGame); }
  function claimAdCoins() {
    if (!adCoinsLeft()) { sheetToast('Daily limit reached. Come back tomorrow!', false); return; }
    requestRewarded('coins', { back: 'menu', ok: () => {
      DATA.adCoins = { d: adDay(), n: adCoinsToday() + 1 };
      DATA.coins = Math.min(MAX_COINS, DATA.coins + AD_COIN_REWARD);
      writeData(); sfx.coin();
      sheetToast('+' + AD_COIN_REWARD + ' coins!', true);               // nothing is opened or bought automatically
    }, fail: (m) => sheetToast(m, false) });
  }
  function adBtn(cx, cy, w, h, label, fn, size) {                        // optional-ad button: a lighter pill so it stands out from the panel
    const t = th();
    rrect(cx - w / 2, cy - h / 2 + 3, w, h, h / 2, shade(t.panel, -0.3));
    rrect(cx - w / 2, cy - h / 2, w, h, h / 2, shade(t.panel, 0.2));
    txt(cx, cy, label, size || 15, t.btnText);
    buttons.push({ x: cx - w / 2, y: cy - h / 2, w: w, h: h + 3, fn: fn });
  }
  let sheetAdBtn = false;
  function adCoinsButton(cy, w) {                                       // optional button, only when ads can really be shown
    if (!adCoinsLeft() || !adAvailable()) return false;
    sheetAdBtn = true;
    adBtn(W / 2, cy, w || 320, 38, 'Watch ad   +' + AD_COIN_REWARD + ' coins   (' + adCoinsLeft() + ' left today)', claimAdCoins, 14);
    return true;
  }
  function adHint() {                                                   // optional, from the level-failed screen
    if (!G || !G.camp) return;
    requestRewarded('hint', { back: 'over', ok: () => startLevel(G.camp.id, true), fail: (m) => { G.adMsg = m; } });
  }
