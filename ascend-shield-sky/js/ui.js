/* ============================================================
   ui.js — landing page, journey map, heroes, shields, upgrades, shop,
   free rewards, leaderboard, profile, settings, HUD and run-end modals.
   ============================================================ */
(function () {
  'use strict';
  const G = window.G, U = G.U, DT = G.Data, D = G.Storage.data, A = G.Audio, V = G.view;
  const $ = id => document.getElementById(id), save = () => G.Storage.save(), fmt = U.fmt;
  const UI = (G.UI = {});
  let sub = null, animRaf = 0, toastT = 0, hintCur = '', lastCoins = D.coins, profFrom = null;
  UI.subOpen = () => !!sub;

  /* ---------------- tiny helpers: toast, banner, hint, tween, fx ---------------- */
  function toast(msg) { const t = $('toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 2400); }
  UI.toast = toast;
  UI.banner = (t, s) => { const b = $('banner'); b.querySelector('b').textContent = t; b.querySelector('span').textContent = s || ''; b.classList.remove('show'); void b.offsetWidth; b.classList.add('show'); };
  UI.hint = h => { if (h === hintCur) return; hintCur = h; const e = $('hint'); if (h) { e.textContent = h; e.classList.add('show'); } else e.classList.remove('show'); };
  function tween(el, to, ms, f) { const t0 = performance.now(); f = f || fmt; (function step(now) { const k = Math.min(1, (now - t0) / ms), e = 1 - Math.pow(1 - k, 3); el.textContent = f(to * e); if (k < 1) requestAnimationFrame(step); })(t0); }
  UI.flash = col => { const f = $('flash'); f.style.background = 'radial-gradient(circle,transparent 40%,' + (col || '#fff') + ' 150%)'; f.animate([{ opacity: .85 }, { opacity: 0 }], { duration: 500, easing: 'ease-out' }); };
  let flying = 0;
  UI.flyCoin = (x, y) => {                                           // coin flies from the world into the coin counter
    if (flying > 10) return; const cv = $('c').getBoundingClientRect(), app = $('app').getBoundingClientRect(), tg = $('coinHud').getBoundingClientRect(); if (!tg.width) return;
    const el = document.createElement('i'); el.className = 'fc'; const sx = cv.left - app.left + x - 9, sy = cv.top - app.top + y - 9, dx = tg.left - app.left + tg.width / 2 - sx - 9, dy = tg.top - app.top + tg.height / 2 - sy - 9;
    el.style.transform = 'translate(' + sx + 'px,' + sy + 'px)'; $('fly').appendChild(el); flying++;
    el.animate([{ transform: 'translate(' + sx + 'px,' + sy + 'px) scale(1)', opacity: 1 }, { transform: 'translate(' + (sx + dx) + 'px,' + (sy + dy) + 'px) scale(.45)', opacity: .3 }], { duration: 650, easing: 'cubic-bezier(.45,0,.85,.4)' }).onfinish = () => { el.remove(); flying--; const c = $('coinHud'); c.classList.remove('bump'); void c.offsetWidth; c.classList.add('bump'); };
  };
  function confetti(n) {
    const cols = ['#fde047', '#67e8f9', '#f472b6', '#a3e635', '#fb923c', '#a78bfa'], W = $('app').clientWidth, H = $('app').clientHeight;
    for (let i = 0; i < n; i++) { const el = document.createElement('i'); el.className = 'conf'; el.style.background = cols[i % cols.length]; el.style.left = Math.random() * W + 'px'; $('fly').appendChild(el);
      el.animate([{ transform: 'translateY(0) rotate(0)', opacity: 1 }, { transform: 'translateY(' + (H + 40) + 'px) translateX(' + (Math.random() * 120 - 60) + 'px) rotate(' + (Math.random() * 900 - 450) + 'deg)', opacity: .8 }], { duration: 1600 + Math.random() * 1400, delay: Math.random() * 500, easing: 'cubic-bezier(.3,.5,.6,1)' }).onfinish = () => el.remove(); }
  }
  document.addEventListener('pointerdown', e => {                    // ripple on every button press
    const t = e.target.closest && e.target.closest('.btn,.nav button,.ibtn,.ccard,.node,.pack,.tab,.coinpill,.prof,.lvlpill'); if (!t) return;
    const r = t.getBoundingClientRect(), s = Math.max(r.width, r.height) * 2.2, sp = document.createElement('span'); sp.className = 'rip'; sp.style.cssText = 'width:' + s + 'px;height:' + s + 'px;left:' + (e.clientX - r.left - s / 2) + 'px;top:' + (e.clientY - r.top - s / 2) + 'px'; t.appendChild(sp); setTimeout(() => sp.remove(), 650);
  }, { passive: true });
  function syncCoins() {
    const txt = '🪙 ' + fmt(D.coins);
    $('mCoins').querySelector('b').textContent = fmt(D.coins); document.querySelectorAll('.coinp').forEach(e => e.textContent = txt); const h = $('coinHud'); if (h) h.textContent = txt;
    if (D.coins > lastCoins) { const c = $('mCoins'); c.classList.remove('bump'); void c.offsetWidth; c.classList.add('bump'); } lastCoins = D.coins;
  }
  const ad = (label, ok) => G.showRewardedAd(() => { D.adsWatched++; save(); ok(); }, () => toast('Ad closed — no reward'), label);
  const modal = (id, on) => $(id).classList.toggle('show', on);

  /* ---------------- navigation ---------------- */
  const renders = { map: renderMap, heroes: renderHeroes, shields: renderShields, ups: renderUps, shop: renderShop, free: renderFree, board: renderBoard, profile: renderProfile, set: renderSet };
  UI.open = id => {
    A.init(); A.click(); if (sub && sub !== id) $('sc-' + sub).classList.remove('active');
    sub = id; $('sc-menu').classList.add('under'); $('sc-' + id).classList.add('active'); renders[id] && renders[id](); syncCoins(); startAnim();
  };
  UI.back = () => { if (!sub) return; A.click(); $('sc-' + sub).classList.remove('active'); $('sc-menu').classList.remove('under'); sub = null; refreshMenu(); };
  function closeSubs() { if (sub) { $('sc-' + sub).classList.remove('active'); sub = null; } $('sc-menu').classList.remove('under'); }

  /* ---------------- landing ---------------- */
  function refreshMenu() {
    syncCoins(); const P = D.profile, nm = P.registered && P.name ? P.name : 'Guest';
    $('profName').textContent = nm; $('profAv').textContent = nm[0].toUpperCase();
    const n = D.journey.unlocked, info = G.Levels.info(n);
    $('lvlIco').textContent = info.planet.icon; $('lvlTxt').textContent = 'Level ' + n + ' · ' + info.planet.name; $('playSub').textContent = 'JOURNEY';
    $('endBest').textContent = D.endless.best > 0 ? 'Best ' + fmt(D.endless.best) + ' m' : 'No limits';
    $('dailyDot').classList.toggle('on', D.daily.last !== U.today());
  }
  function buildTitle() { $('title').innerHTML = 'ASCEND'.split('').map((c, i) => '<span style="animation-delay:' + (i * .08) + 's,' + (i * .25 + 1) + 's">' + c + '</span>').join(''); }

  /* ---------------- journey map (100 levels) ---------------- */
  function renderMap() {
    const list = $('mapList'); list.innerHTML = ''; const J = D.journey; let cur = null;
    $('mapStars').textContent = '⭐ ' + G.Levels.totalStars() + ' / 300';
    for (let c = 0; c < 10; c++) {
      const h = document.createElement('div'); h.className = 'chap'; const a = c * 10 + 1, b = a + 9;
      h.innerHTML = '<span>⚑ Chapter ' + (c + 1) + '</span><small>Levels ' + a + '–' + b + '</small>'; list.appendChild(h);
      const grid = document.createElement('div'); grid.className = 'nodes';
      for (let n = a; n <= b; n++) {
        const info = G.Levels.info(n), st = J.stars[n] || 0, lock = n > J.unlocked, isCur = n === J.unlocked;
        const el = document.createElement('button'); el.className = 'node' + (lock ? ' lock' : '') + (isCur ? ' cur' : '') + (st ? ' done' : ''); el.style.animationDelay = ((n - a) * .03) + 's';
        el.innerHTML = '<i>' + (lock ? '🔒' : info.planet.icon) + '</i><b>' + n + '</b><s>' + (st ? '★'.repeat(st) : '') + '</s>';
        el.onclick = () => lock ? toast('Finish level ' + (n - 1) + ' to unlock') : openLevel(n);
        grid.appendChild(el); if (isCur) cur = el;
      }
      list.appendChild(grid);
    }
    if (cur) setTimeout(() => cur.scrollIntoView({ block: 'center', behavior: 'smooth' }), 350);
  }
  function openLevel(n) {
    const info = G.Levels.info(n), J = D.journey, st = J.stars[n] || 0, cp = J.cp[n] || 0;
    $('lvPlanet').textContent = info.planet.icon; $('lvTitle').textContent = 'Level ' + n; $('lvSub').textContent = 'Launch from ' + info.planet.name + ' · reach ' + fmt(info.goal) + ' m';
    $('lvStars').innerHTML = [1, 2, 3].map(i => '<b class="' + (i <= st ? 'on' : '') + '">★</b>').join('');
    $('lvInfo').textContent = st ? 'Best: ' + st + ' star' + (st > 1 ? 's' : '') + ' • take fewer hits for more stars' : '3 stars = no hits taken • ⚑ checkpoint at the halfway point';
    const cont = $('lvCont'); cont.classList.toggle('hidden', !cp); cont.textContent = '⚑ Continue from ' + fmt(cp) + ' m';
    $('lvPlay').textContent = cp ? '↺ Restart level' : '▶ Start';
    $('lvPlay').onclick = () => { modal('lvl', false); UI.startRun({ mode: 'journey', level: n, startDist: 0 }); };
    cont.onclick = () => { modal('lvl', false); UI.startRun({ mode: 'journey', level: n, startDist: cp }); };
    modal('lvl', true); A.click();
  }
  UI.startRun = opts => { closeSubs(); G.Game.start(opts); };

  /* ---------------- heroes ---------------- */
  let previewHero = null, prevCtx = null, miniCtx = [], shPrev = null, shCtx = null, shMini = [], shCv = null;
  function setupCv(cv, w, h) { const d = Math.min(window.devicePixelRatio || 1, 2); cv.width = w * d; cv.height = h * d; const c = cv.getContext('2d'); c.setTransform(d, 0, 0, d, 0, 0); return c; }
  function renderHeroes() {
    previewHero = previewHero || D.chars.sel; const grid = $('charGrid'); grid.innerHTML = ''; miniCtx = [];
    DT.CHARACTERS.forEach((c, i) => {
      const owned = D.chars.owned.includes(c.id), eq = D.chars.sel === c.id;
      const b = document.createElement('button'); b.className = 'ccard' + (owned ? ' own' : '') + (eq ? ' eq' : '') + (previewHero === c.id ? ' sel' : ''); b.style.animationDelay = i * .04 + 's';
      b.innerHTML = '<canvas></canvas><b>' + c.name + '</b><small>' + (eq ? 'Equipped' : owned ? 'Owned' : '🪙 ' + fmt(c.price)) + '</small>';
      b.onclick = () => { A.click(); previewHero = c.id; renderHeroes(); }; grid.appendChild(b); miniCtx.push([setupCv(b.querySelector('canvas'), 66, 66), c.id]);
    });
    prevCtx = setupCv($('prevCv'), 260, 170);
    const c = DT.char(previewHero), owned = D.chars.owned.includes(c.id), eq = D.chars.sel === c.id;
    $('cName').textContent = c.name; $('cDesc').textContent = c.desc; const pct = v => Math.max(8, Math.min(100, (v - .7) / .7 * 100)) + '%';
    $('stSpeed').style.width = pct(c.speed); $('stSize').style.width = pct(2 - c.size); $('stShield').style.width = pct(c.shield);
    const act = $('charAct'), adb = $('charAd');
    if (owned) { act.textContent = eq ? 'Equipped ✓' : 'Equip'; act.disabled = eq; adb.classList.add('hidden'); } else { act.textContent = 'Buy  🪙 ' + fmt(c.price); act.disabled = false; adb.classList.remove('hidden'); }
    act.onclick = () => {
      if (!D.chars.owned.includes(c.id)) { if (D.coins < c.price) { toast('Need ' + fmt(c.price - D.coins) + ' more 🪙'); return; } D.coins -= c.price; D.chars.owned.push(c.id); A.unlock(); toast('Unlocked ' + c.name + '!'); } else A.click();
      D.chars.sel = c.id; save(); G.applyStats(); renderHeroes(); syncCoins();
    };
    adb.onclick = () => ad('Unlock ' + c.name, () => { if (!D.chars.owned.includes(c.id)) D.chars.owned.push(c.id); D.chars.sel = c.id; save(); G.applyStats(); A.unlock(); toast('🎁 Free unlock: ' + c.name + '!'); renderHeroes(); });
  }

  /* ---------------- shields (skins) ---------------- */
  function renderShields() {
    shPrev = shPrev || D.shields.sel; const grid = $('shGrid'); grid.innerHTML = ''; shMini = [];
    G.Shields.LIST.forEach((s, i) => {
      const owned = D.shields.owned.includes(s.id), eq = D.shields.sel === s.id;
      const b = document.createElement('button'); b.className = 'ccard' + (owned ? ' own' : '') + (eq ? ' eq' : '') + (shPrev === s.id ? ' sel' : ''); b.style.animationDelay = i * .04 + 's';
      b.innerHTML = '<canvas></canvas><b>' + s.name + '</b><small>' + (eq ? 'Equipped' : owned ? 'Owned' : '🪙 ' + fmt(s.price)) + '</small>';
      b.onclick = () => { A.click(); shPrev = s.id; renderShields(); }; grid.appendChild(b); shMini.push([setupCv(b.querySelector('canvas'), 66, 66), s.id]);
    });
    shCv = $('shCv'); shCtx = setupCv(shCv, 260, 170);
    const s = G.Shields.get(shPrev), owned = D.shields.owned.includes(s.id), eq = D.shields.sel === s.id;
    $('shName').textContent = s.name; $('shDesc').textContent = s.desc; $('shGun').textContent = D.up.gun > 0 ? '🔫 Your Shield Gun turret (level ' + D.up.gun + ') is mounted on it.' : 'Buy the 🔫 Shield Gun upgrade to mount a turret on your shield.';
    const act = $('shAct'); act.textContent = owned ? (eq ? 'Equipped ✓' : 'Equip') : 'Buy  🪙 ' + fmt(s.price); act.disabled = eq;
    act.onclick = () => {
      if (!D.shields.owned.includes(s.id)) { if (D.coins < s.price) { toast('Need ' + fmt(s.price - D.coins) + ' more 🪙'); return; } D.coins -= s.price; D.shields.owned.push(s.id); A.unlock(); toast('Unlocked ' + s.name + '!'); } else A.click();
      D.shields.sel = s.id; save(); renderShields(); syncCoins();
    };
  }

  /* ---------------- animated previews on the heroes / shields screens ---------------- */
  function startAnim() { if (animRaf) return; (function loop(ts) { if (!sub) { animRaf = 0; return; } animRaf = requestAnimationFrame(loop); const t = ts / 1000; if (sub === 'heroes' && prevCtx) drawHeroes(t); else if (sub === 'shields' && shCtx) drawShields(t); })(performance.now()); }
  function bgPrev(c, t) { const g = c.createLinearGradient(0, 0, 0, 170); g.addColorStop(0, '#1e3a8a'); g.addColorStop(1, '#7dd3fc'); c.fillStyle = g; c.fillRect(0, 0, 260, 170); c.fillStyle = 'rgba(255,255,255,.35)'; for (let i = 0; i < 3; i++) { const x = ((t * 14 + i * 110) % 330) - 40; c.beginPath(); c.arc(x, 40 + i * 40, 20, 0, 7); c.arc(x + 20, 36 + i * 40, 14, 0, 7); c.fill(); } }
  function drawHeroes(t) {
    const c = prevCtx; bgPrev(c, t); G.Chars.draw(c, previewHero, 130 + Math.sin(t * 1.4) * 60, 81 + Math.sin(t * 3) * 4, 38, t, { lean: Math.cos(t * 1.4) });
    for (const [mc, id] of miniCtx) { mc.clearRect(0, 0, 66, 66); G.Chars.draw(mc, id, 33, 30, 17, t, { lean: Math.cos(t * 1.4 + id.length) * .6 }); }
  }
  function drawShields(t) {
    const c = shCtx; bgPrev(c, t); const gl = D.up.gun, k = Math.sin(t * 3.2);
    G.Chars.draw(c, D.chars.sel, 130, 128, 20, t, {}); G.Shields.draw(c, shPrev, 130, 84, 46, t, { gun: gl, aim: -Math.PI / 2 + Math.sin(t * 1.6) * .9, recoil: k > .85 ? 5 : 0 });
    for (const [mc, id] of shMini) { mc.clearRect(0, 0, 66, 66); G.Shields.draw(mc, id, 33, 33, 25, t, { gun: gl, aim: -Math.PI / 2 }); }
  }

  /* ---------------- upgrades ---------------- */
  function renderUps() {
    const list = $('upList'); list.innerHTML = '';
    DT.UPGRADES.forEach((u, i) => {
      const lv = D.up[u.id], max = lv >= DT.MAXLV, locked = D.best < u.req, cost = max ? 0 : DT.cost(u.id, lv);
      const el = document.createElement('div'); el.className = 'ucard' + (locked ? ' locked' : ''); el.style.animationDelay = i * .05 + 's';
      let pips = ''; for (let k = 0; k < DT.MAXLV; k++) pips += '<i class="' + (k < lv ? 'on' : '') + '"></i>';
      const nextDesc = u.desc(Math.min(DT.MAXLV, lv + 1)), tag = u.kind === 'active' ? ' <small style="display:inline">• button</small>' : '';
      el.innerHTML = '<div class="u-ico">' + u.icon + '</div><div class="u-main"><b>' + u.name + '</b>' + tag + '<div class="pips">' + pips + '</div><small>' + (max ? u.desc(lv) : (lv ? 'Next: ' : '') + nextDesc) + '</small></div><div class="u-btns"></div>';
      const bt = el.querySelector('.u-btns');
      if (max) bt.innerHTML = '<button class="btn sec" disabled>MAX</button>';
      else if (locked) bt.innerHTML = '<button class="btn sec" disabled>🔒 ' + fmt(u.req) + ' m</button>';
      else {
        const b = document.createElement('button'); b.className = 'btn buy'; b.textContent = '🪙 ' + fmt(cost); b.onclick = () => { if (D.coins < cost) { toast('Need ' + fmt(cost - D.coins) + ' more 🪙'); return; } D.coins -= cost; D.up[u.id]++; save(); G.applyStats(); A.unlock(); toast(u.icon + ' ' + u.name + ' → level ' + D.up[u.id]); renderUps(); syncCoins(); };
        const a = document.createElement('button'); a.className = 'btn adb'; a.textContent = '🎬 Free'; a.onclick = () => ad('Free upgrade: ' + u.name, () => { D.up[u.id]++; save(); G.applyStats(); A.unlock(); toast('🎁 Free upgrade: ' + u.name); renderUps(); });
        bt.appendChild(b); bt.appendChild(a);
      }
      list.appendChild(el);
    });
  }

  /* ---------------- coin shop (in-app purchase) ---------------- */
  function renderShop() {
    const P = G.Purchases; $('shopNote').textContent = P.demo() ? 'DEMO mode: no real money is charged. Connect Google Play Billing for the store build.' : P.native() ? 'Purchases are processed by Google Play.' : 'Purchases are unavailable in this build.';
    const list = $('packList'); list.innerHTML = '';
    P.PACKS.forEach((p, i) => {
      const el = document.createElement('button'); el.className = 'pack' + (p.tag === 'Best value' ? ' best' : ''); el.style.animationDelay = i * .06 + 's';
      el.innerHTML = '<i>' + p.icon + '</i><div><b>🪙 ' + fmt(p.coins) + (p.tag ? '<span class="tag">' + p.tag + '</span>' : '') + '</b><small>No ads needed — just coins</small></div><span class="price">' + p.price + '</span>';
      el.onclick = () => confirmBuy(p); list.appendChild(el);
    });
  }
  function confirmBuy(p) {
    $('buyTitle').textContent = '🪙 ' + fmt(p.coins) + ' coins'; $('buyTxt').textContent = G.Purchases.demo() ? 'DEMO purchase — no real payment is made. Price in the store build: ' + p.price : 'You will be charged ' + p.price + ' by Google Play.';
    $('buyOk').textContent = G.Purchases.demo() ? 'Get coins (demo)' : 'Buy ' + p.price; modal('buy', true);
    $('buyOk').onclick = () => { modal('buy', false); G.Purchases.buy(p.id, pk => { A.unlock(); confetti(40); toast('+' + fmt(pk.coins) + ' 🪙 added!'); syncCoins(); }, msg => toast('⚠️ ' + msg)); };
    $('buyNo').onclick = () => modal('buy', false);
  }

  /* ---------------- free rewards: daily + optional ads ---------------- */
  function dailyState() { const today = U.today(), claimed = D.daily.last === today, alive = D.daily.last === U.yesterday() || claimed, base = alive ? D.daily.streak : 0; return { claimed, idx: claimed ? (base - 1 + 7) % 7 : base % 7, nextIdx: claimed ? null : base % 7 }; }
  function renderFree() {
    const st = dailyState(), grid = $('dailyGrid'); grid.innerHTML = '';
    DT.DAILY.forEach((v, i) => { const done = st.claimed ? i <= st.idx : i < (st.nextIdx || 0), next = !st.claimed && i === st.nextIdx; const t = document.createElement('div'); t.className = 'dtile' + (done ? ' done' : '') + (next ? ' next' : ''); t.innerHTML = 'Day ' + (i + 1) + '<b>' + v + '</b>🪙' + (done ? ' ✓' : ''); grid.appendChild(t); });
    $('dailyMsg').textContent = st.claimed ? 'Claimed today! Come back tomorrow to keep your streak.' : "Claim today's reward — Day " + (st.nextIdx + 1) + ' of 7';
    const claim = $('dailyClaim'); claim.disabled = st.claimed; claim.textContent = st.claimed ? 'Come back tomorrow' : 'Claim 🪙 ' + DT.DAILY[st.nextIdx];
    claim.onclick = () => { const s2 = dailyState(); if (s2.claimed) return; const alive = D.daily.last === U.yesterday(); D.daily.streak = (alive ? D.daily.streak : 0) + 1; D.daily.last = U.today(); D.coins += DT.DAILY[s2.nextIdx]; save(); A.unlock(); confetti(30); toast('+' + DT.DAILY[s2.nextIdx] + ' 🪙 daily reward!'); renderFree(); syncCoins(); };
    const x2 = $('dailyX2'); x2.disabled = !(st.claimed && D.daily.x2 !== U.today());
    x2.onclick = () => ad('Double daily reward', () => { const v = DT.DAILY[dailyState().idx]; D.coins += v; D.daily.x2 = U.today(); save(); A.unlock(); toast('×2! +' + v + ' 🪙 extra'); renderFree(); syncCoins(); });
    const as = $('adAssist'); as.disabled = D.assist >= 6; $('adAssistTxt').textContent = D.assist > 0 ? '🎬 Easy Assist active: ' + D.assist + ' run' + (D.assist > 1 ? 's' : '') + ' left (+3)' : '🎬 Easy Assist: calmer game for 3 runs';
    as.onclick = () => ad('Easy Assist', () => { D.assist = Math.min(6, D.assist + 3); save(); A.unlock(); toast('🎓 Easy Assist ×' + D.assist + ' runs'); renderFree(); });
    const bo = $('adBoost'); bo.disabled = !!D.boostNext; bo.onclick = () => ad('Free Shield Boost', () => { D.boostNext = true; save(); A.unlock(); toast('🛡️ Shield Boost armed!'); renderFree(); });
    const today = U.today(); if (D.adCoinDay !== today) { D.adCoinDay = today; D.adCoinN = 0; } const left = 3 - D.adCoinN;
    const co = $('adCoins'); co.disabled = left <= 0; $('adCoinsTxt').textContent = left > 0 ? '🎬 +100 coins (' + left + ' left today)' : '🎬 +100 coins (come back tomorrow)';
    co.onclick = () => ad('+100 coins', () => { D.adCoinN++; D.coins += 100; save(); A.unlock(); toast('+100 🪙'); renderFree(); syncCoins(); });
  }

  /* ---------------- leaderboard + profile ---------------- */
  let boardMode = 'endless';
  async function renderBoard() {
    document.querySelectorAll('#sc-board .tab').forEach(t => { t.classList.toggle('on', t.dataset.mode === boardMode); t.onclick = () => { boardMode = t.dataset.mode; A.click(); renderBoard(); }; });
    const list = $('boardList'), note = $('boardNote'); list.innerHTML = '<p class="mut" style="text-align:center">Loading…</p>';
    const res = await G.Backend.top(boardMode, 50); if (sub !== 'board') return;
    const P = D.profile, on = G.Backend.online();
    note.textContent = res.source === 'online' ? (P.registered ? '' : 'Tap 👤 to join the leaderboard with your name.') : !on ? 'Showing scores from this device. The online board turns on when the developer connects a backend (js/config.js).' : 'Could not reach the server — showing this device.';
    list.innerHTML = ''; if (!res.rows.length) { list.innerHTML = '<p class="mut" style="text-align:center">No scores yet — go set one!</p>'; return; }
    const unit = boardMode === 'endless' ? ' m' : ' ⭐';
    res.rows.forEach((r, i) => { const el = document.createElement('div'); el.className = 'row2' + (P.registered && r.name === P.name ? ' me' : ''); el.style.animationDelay = Math.min(i, 12) * .03 + 's'; el.innerHTML = '<span class="rk">' + (i < 3 ? ['🥇', '🥈', '🥉'][i] : i + 1) + '</span><span class="nm"></span><span class="sc">' + fmt(r.score) + unit + '</span>'; el.querySelector('.nm').textContent = r.name; list.appendChild(el); });
  }
  function renderProfile() {
    const P = D.profile; $('pfName').value = P.name || ''; $('pfEmail').value = P.email || ''; $('pfConsent').checked = !!P.consent; $('pfErr').textContent = '';
    const pv = $('pfPriv'), url = (window.ASCEND_CONFIG || {}).privacyUrl; pv.style.display = url ? '' : 'none'; if (url) pv.href = url;
  }
  $('pfSave').onclick = async () => {
    const name = $('pfName').value.trim(), email = $('pfEmail').value.trim(), consent = $('pfConsent').checked, err = $('pfErr'), B = G.Backend;
    if (!B.validName(name)) { err.textContent = 'Name must be 2–16 letters, numbers, spaces, . _ -'; return; }
    if (email && !B.validEmail(email)) { err.textContent = 'That email address does not look right.'; return; }
    if (email && !consent) { err.textContent = 'Tick the box so we may store your email, or clear the email field.'; return; }
    err.textContent = ''; $('pfSave').disabled = true; const r = await B.register(name, email, consent); $('pfSave').disabled = false;
    A.unlock(); toast(r.offline && B.online() ? '✅ Saved — will sync when you are online' : '✅ Welcome, ' + name + '!'); refreshMenu(); profFrom === 'board' ? UI.open('board') : UI.back();
  };
  $('pfGuest').onclick = () => { G.Backend.guest(); refreshMenu(); A.click(); profFrom === 'board' ? UI.open('board') : UI.back(); };
  $('boardProf').onclick = () => { profFrom = 'board'; UI.open('profile'); };
  $('btnProf').onclick = () => { profFrom = null; UI.open('profile'); };

  /* ---------------- settings ---------------- */
  function renderSet() { $('setSound').checked = D.settings.sound; $('setMusic').checked = D.settings.music; $('setVibe').checked = D.settings.vibe; $('setShake').checked = D.settings.shake; }
  [['setSound', 'sound'], ['setMusic', 'music'], ['setVibe', 'vibe'], ['setShake', 'shake']].forEach(([id, k]) => $(id).addEventListener('change', e => { D.settings[k] = e.target.checked; save(); A.init(); if (k === 'music') A.applyMusic(); A.click(); if (k === 'vibe' && e.target.checked) U.vibrate(40); updatePauseBtns(); }));
  let resetArm = 0;
  $('resetBtn').onclick = () => { const b = $('resetBtn'); if (!resetArm) { resetArm = 1; b.textContent = 'Tap again to erase everything'; setTimeout(() => { resetArm = 0; b.textContent = 'Reset all progress'; }, 3500); } else G.Storage.reset(); };

  /* ---------------- HUD ---------------- */
  let hc = {};
  function setText(id, v) { if (hc[id] !== v) { hc[id] = v; $(id).textContent = v; } }
  const TK = { invis: 'invisT', slow: 'slowT', dash: 'dashT' };
  UI.hud = run => {
    setText('dist', fmt(run.dist)); setText('coinHud', '🪙 ' + fmt(D.coins));
    const hs = $('hearts').children; for (let i = 0; i < hs.length; i++) { const off = i >= run.lives; if (hs[i].classList.contains('off') !== off) { hs[i].classList.toggle('off', off); if (!off) { hs[i].classList.remove('pop'); void hs[i].offsetWidth; hs[i].classList.add('pop'); } } }
    if (run.mode === 'journey') {
      setText('lvlLbl', 'LEVEL ' + run.level + ' · ' + run.info.planet.name); const p = U.clamp(run.dist / run.goal, 0, 1);
      $('progFill').style.width = (p * 100).toFixed(1) + '%'; $('progCp').classList.toggle('done', !run.cpAt);
    } else setText('lvlLbl', '∞ ' + G.World.zoneAt(run.dist).name);
    for (const id in TK) {
      const b = $('ab-' + id), has = D.up[id] > 0; if (b.classList.contains('hidden') === has) b.classList.toggle('hidden', !has); if (!has) continue;
      const cd = run.cd[id], p = cd > 0 ? (cd / run.cdMax[id] * 100).toFixed(0) + '%' : '0%'; if (hc['p' + id] !== p) { hc['p' + id] = p; b.querySelector('.ring').style.setProperty('--p', p); }
      b.classList.toggle('ready', cd <= 0 && run[TK[id]] <= 0); b.classList.toggle('active', run[TK[id]] > 0);
    }
    let fx = ''; if (run.assist) fx += '<span>🎓 Assist</span>'; if (run.boostT > 0) fx += '<span>🛡️ ' + Math.ceil(run.boostT) + '</span>'; if (run.magT > 0) fx += '<span>🧲 ' + Math.ceil(run.magT) + '</span>'; if (D.up.gun > 0) fx += '<span>🔫</span>';
    if (hc.fx !== fx) { hc.fx = fx; $('fxBar').innerHTML = fx; }
  };
  document.querySelectorAll('.ab').forEach(b => b.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); G.Game.ability(b.dataset.id); }));
  function buildHearts(n) { const h = $('hearts'); h.innerHTML = ''; for (let i = 0; i < n; i++) h.appendChild(Object.assign(document.createElement('span'), { textContent: '♥' })); }

  /* ---------------- run flow ---------------- */
  UI.onRunStart = run => {
    hc = {}; hintCur = ''; $('hint').classList.remove('show'); ['over', 'pause', 'revive', 'win', 'lvl', 'epick'].forEach(i => modal(i, false));
    $('sc-menu').classList.add('away'); $('hud').classList.remove('hidden'); buildHearts(run.maxLives);
    const j = run.mode === 'journey'; $('prog').classList.toggle('hidden', !j); if (j) { $('progIco').textContent = run.info.planet.icon; $('progFill').style.width = '0'; }
    UI.banner(j ? 'Level ' + run.level : '∞ Endless', j ? 'Launch from ' + run.info.planet.name : run.startDist ? 'Continuing from ⚑ ' + fmt(run.startDist) + ' m' : 'How high can you go?'); A.whoosh(); UI.hud(run);
  };
  UI.onMenu = () => { ['over', 'pause', 'revive', 'win'].forEach(i => modal(i, false)); $('hud').classList.add('hidden'); $('sc-menu').classList.remove('away'); $('banner').classList.remove('show'); UI.hint(''); refreshMenu(); };
  UI.onPause = on => { modal('pause', on); if (on) updatePauseBtns(); };
  UI.onRevive = () => { modal('revive', false); modal('over', false); $('hud').classList.remove('hidden'); const hs = $('hearts').children; for (let i = 0; i < hs.length; i++) hs[i].classList.toggle('off', i >= G.Game.run.lives); };
  function updatePauseBtns() { $('pSound').textContent = D.settings.sound ? '🔊 Sound' : '🔇 Muted'; $('pMusic').textContent = D.settings.music ? '🎵 Music' : '🎵 Off'; }

  UI.onDeath = run => { $('hud').classList.add('hidden'); UI.hint(''); save(); run.reviveUsed ? showOver(run) : showRevive(run); };
  let rvTimer = 0;
  function showRevive(run) {
    const m = $('revive'); modal('revive', true); let t = 5.0; const ring = $('rvRing'), cnt = $('rvCount'); ring.style.setProperty('--p', '100%'); cnt.textContent = 5; clearInterval(rvTimer);
    rvTimer = setInterval(() => { if (G.paused) return; t -= .05; ring.style.setProperty('--p', Math.max(0, t / 5 * 100) + '%'); const n = Math.ceil(t); if (n !== +cnt.textContent && n > 0) { cnt.textContent = n; A.tick(); } if (t <= 0) { clearInterval(rvTimer); modal('revive', false); showOver(run); } }, 50);
    $('rvSkip').onclick = () => { A.click(); clearInterval(rvTimer); modal('revive', false); showOver(run); };
    $('rvWatch').onclick = () => ad('Revive', () => { clearInterval(rvTimer); modal('revive', false); $('hud').classList.remove('hidden'); G.Game.revive(); });
  }
  function retry(run, fromCp) {
    if (run.mode === 'journey') UI.startRun({ mode: 'journey', level: run.level, startDist: fromCp ? (D.journey.cp[run.level] || 0) : 0 });
    else UI.startRun({ mode: 'endless', startDist: fromCp ? run.cp : 0 });
  }
  function assistBtn(btn) {
    btn.disabled = D.assist >= 6; btn.querySelector('span').textContent = D.assist > 0 ? '🎬 Easy Assist: ' + D.assist + ' run' + (D.assist > 1 ? 's' : '') + ' left (+3)' : '🎬 Easy Assist: calmer game for 3 runs';
    btn.onclick = () => ad('Easy Assist', () => { D.assist = Math.min(6, D.assist + 3); save(); A.unlock(); toast('🎓 Easy Assist ×' + D.assist + ' runs'); assistBtn(btn); });
  }
  function showOver(run) {
    const j = run.mode === 'journey', t = $('ovTitle'), cp = j ? (D.journey.cp[run.level] || 0) : run.cp;
    const nb = !j && run.dist > run.startBest + .5; t.classList.toggle('best', nb);
    $('ovDist').textContent = '0'; $('ovCoins').textContent = '0';
    if (j) {
      const p = Math.round(run.dist / run.goal * 100); t.textContent = p >= 80 ? 'So close!' : 'Level Failed'; $('ovZone').textContent = 'Level ' + run.level + ' · ' + run.info.planet.name + ' · ' + p + '% there';
      $('ovLbl').textContent = 'DISTANCE'; $('ovBestLbl').textContent = 'GOAL'; $('ovBest').textContent = fmt(run.goal); $('ovMap').classList.remove('hidden');
    } else {
      t.textContent = nb ? '🏆 New Best!' : 'Run Over'; $('ovZone').textContent = 'Reached: ' + G.World.zoneAt(run.dist).name; $('ovLbl').textContent = 'ALTITUDE'; $('ovBestLbl').textContent = 'BEST'; $('ovBest').textContent = fmt(D.endless.best); $('ovMap').classList.add('hidden');
    }
    $('ovAgain').textContent = cp > 0 ? '↺ ' + (j ? 'Retry' : 'Continue') + ' from ⚑ ' + fmt(cp) + ' m' : '↺ ' + (j ? 'Retry' : 'Play again');
    const fr = $('ovFresh'); fr.classList.toggle('hidden', !(cp > 0)); fr.textContent = j ? 'Restart level' : 'From 0 m';
    $('ovAgain').onclick = () => { A.click(); retry(run, true); }; fr.onclick = () => { A.click(); retry(run, false); };
    $('ovMap').onclick = () => { A.click(); modal('over', false); G.Game.toMenu(); UI.open('map'); };
    $('ovMenu').onclick = () => { A.click(); G.Game.toMenu(); };
    const dbl = $('ovDouble'); dbl.disabled = run.coins <= 0; dbl.querySelector('span').textContent = '🎬 Double coins (+' + fmt(run.coins) + ')';
    dbl.onclick = () => ad('Double your coins', () => { D.coins += run.coins; save(); dbl.disabled = true; tween($('ovCoins'), run.coins * 2, 700); toast('×2! +' + fmt(run.coins) + ' 🪙'); A.unlock(); syncCoins(); });
    assistBtn($('ovAssist')); modal('over', true);
    setTimeout(() => { tween($('ovDist'), run.dist, 1100); tween($('ovCoins'), run.coins, 1100); if (nb) { A.mile(); confetti(30); } }, 350);
  }
  UI.onWin = run => {                                               // LEVEL COMPLETE: stars pop in one by one
    const w = run.winData, info = run.info; $('hud').classList.add('hidden');
    $('wnPlanet').textContent = info.planet.icon; $('wnSub').textContent = 'Level ' + run.level + ' · ' + info.planet.name + ' conquered'; $('wnCoins').textContent = '0'; $('wnHits').textContent = run.hits;
    const stars = [...$('wnStars').children]; stars.forEach(s => s.classList.remove('on'));
    const nx = $('wnNext'); nx.classList.toggle('hidden', !w.hasNext); nx.textContent = 'Next level ▶ (' + (run.level + 1) + ')';
    nx.onclick = () => { A.click(); UI.startRun({ mode: 'journey', level: run.level + 1, startDist: 0 }); };
    $('wnMap').onclick = () => { A.click(); modal('win', false); G.Game.toMenu(); UI.open('map'); };
    $('wnAgain').onclick = () => { A.click(); UI.startRun({ mode: 'journey', level: run.level, startDist: 0 }); };
    const dbl = $('wnDouble'); dbl.disabled = false; dbl.onclick = () => ad('Double level reward', () => { D.coins += w.reward; save(); dbl.disabled = true; tween($('wnCoins'), w.reward * 2, 600); A.unlock(); syncCoins(); toast('×2 reward!'); });
    modal('win', true); confetti(60); A.mile();
    stars.forEach((s, i) => { if (i < w.stars) setTimeout(() => { s.classList.add('on'); A.starPop(i); UI.flash('#fde047'); }, 500 + i * 450); });
    setTimeout(() => tween($('wnCoins'), w.reward, 900), 400);
  };
  $('pResume').onclick = () => { A.click(); G.Game.resume(); };
  $('pRestart').onclick = () => { A.click(); modal('pause', false); G.Game.start(G.Game.lastOpts); };
  $('pMenu').onclick = () => { A.click(); G.Game.toMenu(); };
  $('pSound').onclick = () => { D.settings.sound = !D.settings.sound; save(); updatePauseBtns(); A.click(); };
  $('pMusic').onclick = () => { D.settings.music = !D.settings.music; save(); A.init(); A.applyMusic(); updatePauseBtns(); };
  $('pauseBtn').onclick = () => { A.click(); G.Game.pause(); };
  $('lvClose').onclick = () => modal('lvl', false);

  /* ---------------- init ---------------- */
  UI.init = () => {
    buildTitle(); document.querySelectorAll('[data-back]').forEach(b => b.addEventListener('click', UI.back));
    document.querySelectorAll('[data-open]').forEach(b => b.onclick = () => UI.open(b.dataset.open));
    $('playBtn').onclick = () => { A.init(); A.click(); UI.startRun({ mode: 'journey', level: D.journey.unlocked, startDist: D.journey.cp[D.journey.unlocked] || 0 }); };
    $('lvlPill').onclick = () => UI.open('map');
    $('endBtn').onclick = () => {
      A.init(); A.click(); if (D.endless.cp <= 0) return UI.startRun({ mode: 'endless', startDist: 0 });
      const list = $('epList'); list.innerHTML = ''; const cps = []; for (let c = G.Game.CP_EVERY; c <= D.endless.cp; c += G.Game.CP_EVERY) cps.push(c);
      cps.slice(-6).reverse().forEach(c => { const b = document.createElement('button'); b.className = 'btn sec'; b.textContent = '⚑ Start from ' + fmt(c) + ' m'; b.onclick = () => { modal('epick', false); UI.startRun({ mode: 'endless', startDist: c }); }; list.appendChild(b); });
      modal('epick', true);
    };
    $('epZero').onclick = () => { modal('epick', false); UI.startRun({ mode: 'endless', startDist: 0 }); }; $('epClose').onclick = () => modal('epick', false);
    $('btnFree').onclick = () => UI.open('free'); $('mCoins').onclick = () => UI.open('shop'); $('btnSet').onclick = () => UI.open('set');
    refreshMenu(); G.Backend.flush();
  };
  UI.refreshMenu = refreshMenu;
})();
