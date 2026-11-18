/* ============================================================
   ui.js — screens (menu, characters, upgrades, daily, settings),
   HUD, pause / revive / game-over modals, rewarded-ad hooks.
   ============================================================ */
(function () {
  'use strict';
  const G = window.G, U = G.U, DT = G.Data, D = G.Storage.data, A = G.Audio;
  const $ = id => document.getElementById(id), save = () => G.Storage.save();
  const UI = (G.UI = {});
  let sub = null, animRaf = 0, previewId = null, toastT = 0, hintCur = '';
  UI.subOpen = () => !!sub;

  /* ---------- toast / banner / hint ---------- */
  function toast(msg) { const t = $('toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 2200); }
  UI.toast = toast;
  UI.banner = (t, s) => { const b = $('banner'); b.querySelector('b').textContent = t; b.querySelector('span').textContent = s || ''; b.classList.remove('show'); void b.offsetWidth; b.classList.add('show'); };
  UI.hint = h => { if (h === hintCur) return; hintCur = h; const e = $('hint'); if (h) { e.textContent = h; e.classList.add('show'); } else e.classList.remove('show'); };
  function tween(el, to, ms, fmt) {          // number count-up animation
    const t0 = performance.now(); fmt = fmt || U.fmt;
    (function step(now) { const k = Math.min(1, (now - t0) / ms), e = 1 - Math.pow(1 - k, 3); el.textContent = fmt(to * e); if (k < 1) requestAnimationFrame(step); })(t0);
  }
  const money = () => '🪙 ' + U.fmt(D.coins);
  function syncCoins() { ['mCoins', 'cCoins', 'upCoins', 'dCoins', 'coinHud'].forEach(id => { const e = $(id); if (e) e.textContent = money(); }); }

  /* ---------- sub-screens with slide transitions ---------- */
  const renders = { chars: renderChars, ups: renderUps, daily: renderDaily, set: renderSet };
  UI.open = id => {
    A.init(); A.click(); sub = id; $('sc-menu').classList.add('under'); $('sc-' + id).classList.add('active');
    if (renders[id]) renders[id](); syncCoins(); startAnim();
  };
  UI.back = () => { if (!sub) return; A.click(); $('sc-' + sub).classList.remove('active'); $('sc-menu').classList.remove('under'); sub = null; refreshMenu(); };
  function refreshMenu() {
    syncCoins(); $('mBest').textContent = '🏆 ' + U.fmt(D.best) + ' m';
    $('dailyDot').classList.toggle('on', D.daily.last !== U.today());
    const b = $('btnBoost'); b.disabled = !!D.boostNext; b.querySelector('span').textContent = D.boostNext ? '✅ Shield Boost armed for next run' : '🎬 Free Shield Boost for next run';
  }
  document.querySelectorAll('[data-back]').forEach(b => b.addEventListener('click', UI.back));

  /* ---------- character select (preview animation) ---------- */
  function setupCv(cv, w, h) { const d = Math.min(window.devicePixelRatio || 1, 2); cv.width = w * d; cv.height = h * d; const c = cv.getContext('2d'); c.setTransform(d, 0, 0, d, 0, 0); return c; }
  let miniCtx = [], prevCtx = null;
  function renderChars() {
    previewId = previewId || D.chars.sel;
    const grid = $('charGrid'); grid.innerHTML = ''; miniCtx = [];
    DT.CHARACTERS.forEach(c => {
      const owned = D.chars.owned.includes(c.id), eq = D.chars.sel === c.id;
      const b = document.createElement('button'); b.className = 'ccard' + (owned ? ' own' : '') + (eq ? ' eq' : '') + (previewId === c.id ? ' sel' : '');
      b.innerHTML = '<canvas></canvas><b>' + c.name + '</b><small>' + (eq ? 'Equipped' : owned ? 'Owned' : '🪙 ' + U.fmt(c.price)) + '</small>';
      b.onclick = () => { A.click(); previewId = c.id; renderChars(); };
      grid.appendChild(b); miniCtx.push([setupCv(b.querySelector('canvas'), 66, 66), c.id]);
    });
    prevCtx = setupCv($('prevCv'), 260, 170);
    const c = DT.char(previewId), owned = D.chars.owned.includes(c.id), eq = D.chars.sel === c.id;
    $('cName').textContent = c.name; $('cDesc').textContent = c.desc;
    const pct = v => Math.max(8, Math.min(100, (v - .7) / .7 * 100)) + '%';
    $('stSpeed').style.width = pct(c.speed); $('stSize').style.width = pct(2 - c.size + .0); $('stShield').style.width = pct(c.shield);
    const act = $('charAct'), ad = $('charAd');
    if (owned) { act.textContent = eq ? 'Equipped ✓' : 'Equip'; act.disabled = eq; ad.classList.add('hidden'); }
    else { act.textContent = 'Buy  🪙 ' + U.fmt(c.price); act.disabled = false; ad.classList.remove('hidden'); }
    act.onclick = () => {
      if (!D.chars.owned.includes(c.id)) {
        if (D.coins < c.price) { toast('Need ' + U.fmt(c.price - D.coins) + ' more 🪙 — keep climbing!'); return; }
        D.coins -= c.price; D.chars.owned.push(c.id); A.unlock(); toast('Unlocked ' + c.name + '!');
      } else A.click();
      D.chars.sel = c.id; save(); G.applyStats(); renderChars(); syncCoins();
    };
    ad.onclick = () => G.showRewardedAd(() => { if (!D.chars.owned.includes(c.id)) D.chars.owned.push(c.id); D.chars.sel = c.id; save(); G.applyStats(); A.unlock(); toast('🎁 Free unlock: ' + c.name + '!'); renderChars(); }, () => toast('Ad closed — no reward'), 'Unlock ' + c.name);
  }
  function startAnim() { if (animRaf) return; (function loop(ts) { if (!sub) { animRaf = 0; return; } animRaf = requestAnimationFrame(loop); if (sub === 'chars' && prevCtx) drawChars(ts / 1000); })(performance.now()); }
  function drawChars(t) {
    const c = prevCtx, w = 260, h = 170, g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#1e3a8a'); g.addColorStop(1, '#7dd3fc'); c.fillStyle = g; c.fillRect(0, 0, w, h);
    c.fillStyle = 'rgba(255,255,255,.35)'; for (let i = 0; i < 3; i++) { const x = ((t * 14 + i * 110) % 330) - 40; c.beginPath(); c.arc(x, 40 + i * 40, 20, 0, 7); c.arc(x + 20, 36 + i * 40, 14, 0, 7); c.fill(); }
    const mv = Math.sin(t * 1.4); G.Chars.draw(c, previewId, w / 2 + mv * 60, h / 2 - 4 + Math.sin(t * 3) * 4, 38, t, { lean: Math.cos(t * 1.4) });
    for (const [mc, id] of miniCtx) { mc.clearRect(0, 0, 66, 66); G.Chars.draw(mc, id, 33, 30, 17, t, { lean: Math.cos(t * 1.4 + id.length) * .6 }); }
  }

  /* ---------- upgrades ---------- */
  function renderUps() {
    const list = $('upList'); list.innerHTML = '';
    DT.UPGRADES.forEach(u => {
      const lv = D.up[u.id], max = lv >= DT.MAXLV, locked = D.best < u.req, cost = max ? 0 : DT.cost(u.id, lv);
      const el = document.createElement('div'); el.className = 'ucard' + (locked ? ' locked' : '');
      let pips = ''; for (let i = 0; i < DT.MAXLV; i++) pips += '<i class="' + (i < lv ? 'on' : '') + '"></i>';
      const nextDesc = u.desc(Math.min(DT.MAXLV, lv + 1)), tag = u.kind === 'active' ? ' <small style="display:inline">• button</small>' : '';
      el.innerHTML = '<div class="u-ico">' + u.icon + '</div><div class="u-main"><b>' + u.name + '</b>' + tag + '<div class="pips">' + pips + '</div><small>' + (max ? u.desc(lv) : (lv ? 'Next: ' : '') + nextDesc) + '</small></div><div class="u-btns"></div>';
      const bt = el.querySelector('.u-btns');
      if (max) bt.innerHTML = '<button class="btn sec" disabled>MAX</button>';
      else if (locked) bt.innerHTML = '<button class="btn sec" disabled>🔒 ' + U.fmt(u.req) + ' m</button>';
      else {
        const b = document.createElement('button'); b.className = 'btn buy'; b.textContent = '🪙 ' + U.fmt(cost); b.onclick = () => buyUp(u, cost);
        const a = document.createElement('button'); a.className = 'btn adb'; a.textContent = '🎬 Free'; a.onclick = () => G.showRewardedAd(() => { D.up[u.id]++; save(); G.applyStats(); A.unlock(); toast('🎁 Free upgrade: ' + u.name); renderUps(); }, () => toast('Ad closed — no reward'), 'Free upgrade: ' + u.name);
        bt.appendChild(b); bt.appendChild(a);
      }
      list.appendChild(el);
    });
  }
  function buyUp(u, cost) {
    if (D.coins < cost) { toast('Need ' + U.fmt(cost - D.coins) + ' more 🪙'); return; }
    D.coins -= cost; D.up[u.id]++; save(); G.applyStats(); A.unlock(); toast(u.icon + ' ' + u.name + ' → level ' + D.up[u.id]); renderUps(); syncCoins();
  }

  /* ---------- daily reward (7-day streak) ---------- */
  function dailyState() {
    const today = U.today(), claimed = D.daily.last === today, alive = D.daily.last === U.yesterday() || claimed;
    const base = alive ? D.daily.streak : 0, idx = claimed ? (base - 1 + 7) % 7 : base % 7;
    return { claimed, idx, nextIdx: claimed ? null : base % 7 };
  }
  function renderDaily() {
    const st = dailyState(), grid = $('dailyGrid'); grid.innerHTML = '';
    DT.DAILY.forEach((v, i) => {
      const done = st.claimed ? i <= st.idx : i < (st.nextIdx || 0), next = !st.claimed && i === st.nextIdx;
      const t = document.createElement('div'); t.className = 'dtile' + (done ? ' done' : '') + (next ? ' next' : ''); t.innerHTML = 'Day ' + (i + 1) + '<b>' + v + '</b>🪙' + (done ? ' ✓' : ''); grid.appendChild(t);
    });
    $('dailyMsg').textContent = st.claimed ? 'Claimed today! Come back tomorrow to keep your streak.' : 'Claim today\'s reward — Day ' + (st.nextIdx + 1) + ' of 7';
    const claim = $('dailyClaim'); claim.disabled = st.claimed; claim.textContent = st.claimed ? 'Come back tomorrow' : 'Claim 🪙 ' + DT.DAILY[st.nextIdx];
    claim.onclick = () => {
      const s2 = dailyState(); if (s2.claimed) return;
      const alive = D.daily.last === U.yesterday(); D.daily.streak = (alive ? D.daily.streak : 0) + 1; D.daily.last = U.today();
      D.coins += DT.DAILY[s2.nextIdx]; save(); A.unlock(); toast('+' + DT.DAILY[s2.nextIdx] + ' 🪙 daily reward!'); renderDaily(); syncCoins();
    };
    const x2 = $('dailyX2'); const can = st.claimed && D.daily.x2 !== U.today(); x2.disabled = !can;
    x2.onclick = () => G.showRewardedAd(() => { const v = DT.DAILY[dailyState().idx]; D.coins += v; D.daily.x2 = U.today(); save(); A.unlock(); toast('×2! +' + v + ' 🪙 extra'); renderDaily(); syncCoins(); }, () => toast('Ad closed — no reward'), 'Double daily reward');
  }

  /* ---------- settings ---------- */
  function renderSet() { $('setSound').checked = D.settings.sound; $('setMusic').checked = D.settings.music; $('setVibe').checked = D.settings.vibe; $('setShake').checked = D.settings.shake; }
  [['setSound', 'sound'], ['setMusic', 'music'], ['setVibe', 'vibe'], ['setShake', 'shake']].forEach(([id, k]) => $(id).addEventListener('change', e => { D.settings[k] = e.target.checked; save(); A.init(); if (k === 'music') A.applyMusic(); A.click(); if (k === 'vibe' && e.target.checked) U.vibrate(40); updatePauseBtns(); }));
  let resetArm = 0;
  $('resetBtn').onclick = () => { const b = $('resetBtn'); if (!resetArm) { resetArm = 1; b.textContent = 'Tap again to erase everything'; setTimeout(() => { resetArm = 0; b.textContent = 'Reset all progress'; }, 3500); } else G.Storage.reset(); };

  /* ---------- HUD ---------- */
  let hc = {}, heartN = 0;
  function setText(id, v) { if (hc[id] !== v) { hc[id] = v; $(id).textContent = v; } }
  const TK = { invis: 'invisT', slow: 'slowT', dash: 'dashT' };
  UI.hud = run => {
    setText('dist', U.fmt(run.dist)); setText('coinHud', money());
    const hs = $('hearts').children;
    for (let i = 0; i < hs.length; i++) { const off = i >= run.lives; if (hs[i].classList.contains('off') !== off) { hs[i].classList.toggle('off', off); if (!off) { hs[i].classList.remove('pop'); void hs[i].offsetWidth; hs[i].classList.add('pop'); } } }
    const z = G.World.zoneAt(run.dist); setText('zoneTxt', z.name);
    for (const id in TK) {
      const b = $('ab-' + id), has = D.up[id] > 0; if (b.classList.contains('hidden') === has) b.classList.toggle('hidden', !has); if (!has) continue;
      const cd = run.cd[id], p = cd > 0 ? (cd / run.cdMax[id] * 100).toFixed(0) + '%' : '0%';
      if (hc['p' + id] !== p) { hc['p' + id] = p; b.querySelector('.ring').style.setProperty('--p', p); }
      b.classList.toggle('ready', cd <= 0 && run[TK[id]] <= 0); b.classList.toggle('active', run[TK[id]] > 0);
    }
    let fx = ''; if (run.boostT > 0) fx += '<span>🛡️ ' + Math.ceil(run.boostT) + '</span>'; if (run.magT > 0) fx += '<span>🧲 ' + Math.ceil(run.magT) + '</span>'; if (D.up.gun > 0) fx += '<span>🔫</span>';
    if (hc.fx !== fx) { hc.fx = fx; $('fxBar').innerHTML = fx; }
  };
  document.querySelectorAll('.ab').forEach(b => b.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); G.Game.ability(b.dataset.id); }));
  function buildHearts(n) { const h = $('hearts'); h.innerHTML = ''; for (let i = 0; i < n; i++) h.appendChild(Object.assign(document.createElement('span'), { textContent: '♥' })); }

  /* ---------- run flow ---------- */
  UI.onRunStart = run => {
    hc = {}; hintCur = ''; $('hint').classList.remove('show');
    ['over', 'pause', 'revive'].forEach(i => $(i).classList.remove('show'));
    $('sc-menu').classList.add('away'); $('hud').classList.remove('hidden'); buildHearts(run.maxLives);
    UI.banner('Entering: Sky', 'Clouds, birds and open air'); UI.hud(run);
  };
  UI.onMenu = () => {
    ['over', 'pause', 'revive'].forEach(i => $(i).classList.remove('show')); $('hud').classList.add('hidden'); $('sc-menu').classList.remove('away'); $('banner').classList.remove('show'); UI.hint(''); refreshMenu();
  };
  UI.onPause = on => { $('pause').classList.toggle('show', on); if (on) updatePauseBtns(); };
  UI.onRevive = () => { $('revive').classList.remove('show'); $('over').classList.remove('show'); const hs = $('hearts').children; for (let i = 0; i < hs.length; i++) hs[i].classList.toggle('off', i >= G.Game.run.lives); };
  function updatePauseBtns() { $('pSound').textContent = D.settings.sound ? '🔊 Sound' : '🔇 Muted'; $('pMusic').textContent = D.settings.music ? '🎵 Music' : '🎵 Off'; }

  UI.onDeath = run => { $('hud').classList.add('hidden'); UI.hint(''); G.Storage.save(); run.reviveUsed ? showOver(run) : showRevive(run); };

  /* revive offer: 5 s countdown, watch ad or skip. Only once per run. */
  let rvTimer = 0;
  function showRevive(run) {
    const m = $('revive'); m.classList.add('show'); let t = 5.0; const ring = $('rvRing'), cnt = $('rvCount');
    ring.style.setProperty('--p', '100%'); cnt.textContent = 5;
    clearInterval(rvTimer);
    rvTimer = setInterval(() => {
      if (G.paused) return;                                   // countdown waits while the ad plays
      t -= .05; ring.style.setProperty('--p', Math.max(0, t / 5 * 100) + '%'); const n = Math.ceil(t); if (n !== +cnt.textContent && n > 0) { cnt.textContent = n; A.tick(); }
      if (t <= 0) { clearInterval(rvTimer); m.classList.remove('show'); showOver(run); }
    }, 50);
    $('rvSkip').onclick = () => { A.click(); clearInterval(rvTimer); m.classList.remove('show'); showOver(run); };
    $('rvWatch').onclick = () => { G.showRewardedAd(() => { clearInterval(rvTimer); m.classList.remove('show'); $('hud').classList.remove('hidden'); G.Game.revive(); }, () => toast('Ad closed — no reward'), 'Revive'); };
  }

  /* game over card with count-up */
  function showOver(run) {
    const z = G.World.zoneAt(run.dist), nb = run.dist > run.startBest + .5, t = $('ovTitle');
    t.textContent = nb ? '🏆 New Best!' : 'Run Over'; t.classList.toggle('best', nb);
    $('ovZone').textContent = 'Reached: ' + z.name;
    const dbl = $('ovDouble'); dbl.disabled = run.coins <= 0; dbl.querySelector('span').textContent = '🎬 Double coins (+' + U.fmt(run.coins) + ')';
    $('ovDist').textContent = '0'; $('ovCoins').textContent = '0'; $('ovBest').textContent = U.fmt(D.best);
    $('over').classList.add('show');
    setTimeout(() => { tween($('ovDist'), run.dist, 1100); tween($('ovCoins'), run.coins, 1100); if (nb) A.mile(); }, 350);
    dbl.onclick = () => G.showRewardedAd(() => { D.coins += run.coins; save(); dbl.disabled = true; tween($('ovCoins'), run.coins * 2, 700); toast('×2! +' + U.fmt(run.coins) + ' 🪙'); A.unlock(); }, () => toast('Ad closed — no reward'), 'Double your coins');
    save();
  }
  $('ovAgain').onclick = () => { A.click(); G.Game.start(); };
  $('ovMenu').onclick = () => { A.click(); G.Game.toMenu(); };
  $('pResume').onclick = () => { A.click(); G.Game.resume(); };
  $('pRestart').onclick = () => { A.click(); G.Game.start(); };
  $('pMenu').onclick = () => { A.click(); G.Game.toMenu(); };
  $('pSound').onclick = () => { D.settings.sound = !D.settings.sound; save(); updatePauseBtns(); A.click(); };
  $('pMusic').onclick = () => { D.settings.music = !D.settings.music; save(); A.init(); A.applyMusic(); updatePauseBtns(); };
  $('pauseBtn').onclick = () => { A.click(); G.Game.pause(); };

  /* ---------- menu buttons ---------- */
  UI.init = () => {
    $('playBtn').onclick = () => { A.init(); A.click(); G.Game.start(); };
    $('btnChars').onclick = () => { previewId = D.chars.sel; UI.open('chars'); };
    $('btnUps').onclick = () => UI.open('ups');
    $('btnDaily').onclick = () => UI.open('daily');
    $('btnSet').onclick = () => UI.open('set');
    $('btnBoost').onclick = () => G.showRewardedAd(() => { D.boostNext = true; save(); refreshMenu(); A.unlock(); toast('🛡️ Shield Boost armed for your next run!'); }, () => toast('Ad closed — no reward'), 'Free Shield Boost');
    refreshMenu();
  };
  UI.refreshMenu = refreshMenu;
})();
