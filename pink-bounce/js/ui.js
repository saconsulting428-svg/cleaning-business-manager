/* HTML HUD, home screen and overlay helpers. Scenes push state in; buttons are wired in game.js. */
PB.UI = (function () {
  const $ = (id) => document.getElementById(id);
  const chips = new Map();
  const el = {};
  let lastLives = -1, lastScore = -1, toastTimer = 0, sheetName = null, shopTab = 'skins', resetArmed = false;

  function init() {
    ['hud-score', 'hud-best', 'hud-level', 'hud-lives', 'effects', 'combo', 'menu', 'pause', 'gameover', 'sheet', 'sheet-title', 'sheet-body',
      'go-score', 'go-best', 'go-new', 'go-level', 'go-coins', 'go-ach', 'go-mode', 'menu-best', 'home-coins', 'btn-pause', 'btn-mute', 'live', 'toast']
      .forEach((id) => { el[id] = $(id); });
    refreshMute();
    renderHome();
  }

  const fmt = (n) => Math.floor(n).toLocaleString('en-US');
  const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  /* ---------------- in-game HUD ---------------- */
  function hud(s) {
    if (s.score !== lastScore) {
      el['hud-score'].textContent = fmt(s.score);
      el['hud-score'].classList.remove('bump'); void el['hud-score'].offsetWidth; el['hud-score'].classList.add('bump');
      lastScore = s.score;
    }
    el['hud-best'].textContent = fmt(s.best);
    el['hud-level'].textContent = s.level;
    if (s.lives !== lastLives) {
      let h = '';
      for (let i = 0; i < s.lives; i++) h += '<i class="heart"></i>';
      el['hud-lives'].innerHTML = h || '<span class="none">0</span>';
      el['hud-lives'].setAttribute('aria-label', s.lives + ' lives');
      lastLives = s.lives;
    }
    const cb = el.combo;
    if (s.mult > 1) { cb.textContent = 'COMBO x' + s.mult; cb.classList.add('on'); } else { cb.classList.remove('on'); }
  }

  /* list: [{key,label,css,frac,text}] */
  function effects(list) {
    const seen = new Set();
    list.forEach((e) => {
      seen.add(e.key);
      let c = chips.get(e.key);
      if (!c) {
        const div = document.createElement('div');
        div.className = 'chip'; div.style.setProperty('--c', e.css);
        div.innerHTML = '<span class="chip-name"></span><span class="chip-time"></span><i class="chip-bar"><b></b></i>';
        el.effects.appendChild(div);
        c = { div, name: div.children[0], time: div.children[1], bar: div.children[2].firstChild };
        c.name.textContent = e.label;
        chips.set(e.key, c);
      }
      c.time.textContent = e.text;
      c.bar.style.width = Math.max(0, Math.min(1, e.frac)) * 100 + '%';
      c.div.classList.toggle('warn', e.frac < 0.25 && e.frac < 1);
    });
    chips.forEach((c, k) => { if (!seen.has(k)) { c.div.remove(); chips.delete(k); } });
  }

  /* ---------------- overlays ---------------- */
  function showOnly(id) {
    ['menu', 'pause', 'gameover'].forEach((k) => el[k].classList.toggle('hidden', k !== id));
    if (id !== 'menu') closeSheet();
  }
  function hideAll() { showOnly(null); }

  function gameOver(r) {
    el['go-score'].textContent = fmt(r.score);
    el['go-best'].textContent = fmt(r.best);
    el['go-level'].textContent = r.level;
    el['go-coins'].textContent = '+' + fmt(r.coins);
    el['go-mode'].textContent = PB.MODES[r.mode].name;
    el['go-new'].classList.toggle('hidden', !r.isNew);
    el['go-ach'].innerHTML = r.unlocked.map((a) => '<li><b>' + esc(a.name) + '</b> <span>+' + a.reward + ' coins</span></li>').join('');
    el['go-ach'].classList.toggle('hidden', !r.unlocked.length);
    showOnly('gameover');
    setTimeout(() => { const b = $('btn-replay'); if (b) b.focus(); }, 50);
  }

  function refreshMute() {
    const m = PB.Audio.isMuted();
    el['btn-mute'].classList.toggle('off', m);
    el['btn-mute'].setAttribute('aria-pressed', String(m));
    el['btn-mute'].title = m ? 'Unmute (M)' : 'Mute (M)';
    if (sheetName === 'settings') renderSheet();
  }
  function setPaused(p) {
    el['btn-pause'].classList.toggle('on', p);
    el['btn-pause'].setAttribute('aria-pressed', String(p));
  }
  function reset() { lastLives = -1; lastScore = -1; effects([]); el.combo.classList.remove('on'); }
  function announce(t) { if (el.live) el.live.textContent = t; }

  function toast(text) {
    el.toast.textContent = text; el.toast.classList.add('on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.toast.classList.remove('on'), 2600);
  }

  /* ---------------- home screen ---------------- */
  function renderHome() {
    const D = PB.Save.data;
    el['home-coins'].textContent = fmt(D.coins);
    el['menu-best'].textContent = fmt(D.best[D.mode] || 0);
    document.querySelectorAll('.mode-card').forEach((c) => {
      const on = c.dataset.mode === D.mode;
      c.classList.toggle('active', on); c.setAttribute('aria-pressed', String(on));
    });
  }

  /* ---------------- sheets (shop / leaderboard / achievements / settings) ---------------- */
  function openSheet(name) { sheetName = name; resetArmed = false; el.sheet.classList.remove('hidden'); renderSheet(); }
  function closeSheet() { sheetName = null; if (el.sheet) el.sheet.classList.add('hidden'); }
  const sheetOpen = () => sheetName !== null;

  function renderSheet() {
    const D = PB.Save.data;
    const titles = { shop: 'Shop', board: 'Leaderboard', ach: 'Achievements', settings: 'Settings & Help' };
    el['sheet-title'].textContent = titles[sheetName];
    let h = '';
    if (sheetName === 'shop') {
      h += '<div class="wallet"><i class="coin-ico"></i><b>' + fmt(D.coins) + '</b> coins <small>Earn 1 coin per 50 points</small></div>';
      h += '<div class="tabs"><button data-tab="skins" class="' + (shopTab === 'skins' ? 'on' : '') + '">Ball skins</button><button data-tab="themes" class="' + (shopTab === 'themes' ? 'on' : '') + '">Themes</button></div><div class="items">';
      const list = shopTab === 'skins' ? PB.SKINS : PB.THEMES;
      const owned = shopTab === 'skins' ? D.skins : D.themes, cur = shopTab === 'skins' ? D.skin : D.theme;
      list.forEach((it) => {
        const own = owned.indexOf(it.id) >= 0, eq = cur === it.id;
        const prev = shopTab === 'skins'
          ? '<span class="prev ball" style="background:' + it.css + ';box-shadow:0 0 14px ' + it.glow + '"></span>'
          : '<span class="prev theme" style="background:linear-gradient(135deg,' + it.bg[2] + ',' + it.bg[0] + ')"><i style="background:' + it.blocks[0] + '"></i><i style="background:' + it.blocks[1] + '"></i><i style="background:' + it.blocks[2] + '"></i><i style="background:' + it.blocks[3] + '"></i></span>';
        const status = eq ? 'Equipped' : own ? 'Equip' : '<i class="coin-ico sm"></i>' + it.price;
        h += '<button class="item ' + (eq ? 'eq ' : '') + (own ? 'own' : 'lock') + '" data-kind="' + shopTab + '" data-id="' + it.id + '">' + prev + '<b>' + esc(it.name) + '</b><small>' + status + '</small></button>';
      });
      h += '</div>';
    } else if (sheetName === 'board') {
      const rows = D.board;
      h += rows.length ? '<ol class="board">' + rows.map((r, i) => '<li><span class="rk">' + (i + 1) + '</span><b>' + fmt(r.score) + '</b><span class="meta">' + esc(PB.MODES[r.mode] ? PB.MODES[r.mode].name : r.mode) + ' &middot; Lv ' + r.level + '</span></li>').join('') + '</ol>'
        : '<p class="empty">No runs yet. Play a game and your best ten scores appear here.</p>';
    } else if (sheetName === 'ach') {
      const got = PB.ACHIEVEMENTS.filter((a) => D.ach[a.id]).length;
      h += '<p class="wallet"><b>' + got + '</b> / ' + PB.ACHIEVEMENTS.length + ' unlocked</p><ul class="achs">';
      PB.ACHIEVEMENTS.forEach((a) => {
        h += '<li class="' + (D.ach[a.id] ? 'done' : '') + '"><span class="chk">' + (D.ach[a.id] ? '&#10003;' : '') + '</span><div><b>' + esc(a.name) + '</b><small>' + esc(a.desc) + '</small></div><em>+' + a.reward + '</em></li>';
      });
      h += '</ul>';
    } else if (sheetName === 'settings') {
      const m = PB.Audio.isMuted();
      h += '<button class="btn" data-act="mute">Sound: ' + (m ? 'OFF' : 'ON') + '</button>';
      h += '<div class="help"><p><b>Move</b> mouse / touch drag / <kbd>A</kbd><kbd>D</kbd> / <kbd>&larr;</kbd><kbd>&rarr;</kbd><br><b>Launch</b> click / tap / <kbd>Space</kbd><br><b>Pause</b> <kbd>P</kbd> &nbsp; <b>Restart</b> <kbd>R</kbd> &nbsp; <b>Mute</b> <kbd>M</kbd></p>';
      h += '<p>Lose a life only when <b>every</b> ball falls into the red slit. A fresh ball is protected for a few seconds.</p><ul class="legend">';
      PB.POWERUP_KEYS.forEach((k) => { const d = PB.POWERUPS[k]; h += '<li style="--c:' + d.css + '"><i>' + d.label + '</i>' + esc(d.desc) + '</li>'; });
      h += '</ul></div>';
      h += '<button class="btn ghost" data-act="reset">' + (resetArmed ? 'Tap again to erase all progress' : 'Reset progress') + '</button>';
    }
    el['sheet-body'].innerHTML = h;
  }

  /* delegated clicks inside the sheet body */
  function sheetClick(e) {
    const t = e.target.closest('button'); if (!t) return;
    const D = PB.Save.data;
    if (t.dataset.tab) { shopTab = t.dataset.tab; renderSheet(); return; }
    if (t.dataset.act === 'mute') { PB.toggleMute(); return; }
    if (t.dataset.act === 'reset') {
      if (!resetArmed) { resetArmed = true; renderSheet(); return; }
      PB.Save.reset(); PB.applyThemeCss(); PB.setTheme(PB.theme().id, true); renderHome(); renderSheet(); toast('Progress erased'); return;
    }
    if (t.dataset.kind) {
      const kind = t.dataset.kind, id = t.dataset.id;
      const list = kind === 'skins' ? PB.SKINS : PB.THEMES, owned = kind === 'skins' ? D.skins : D.themes;
      const it = list.find((x) => x.id === id);
      if (owned.indexOf(id) < 0) {
        if (D.coins < it.price) { toast('Not enough coins. Play more to earn ' + (it.price - D.coins) + ' more.'); return; }
        D.coins -= it.price; owned.push(id); toast('Unlocked ' + it.name);
      }
      if (kind === 'skins') D.skin = id; else { PB.Save.save(); PB.setTheme(id); }
      PB.Save.save(); renderHome(); renderSheet();
    }
  }

  return { init, hud, effects, showOnly, hideAll, gameOver, refreshMute, setPaused, reset, announce, toast, renderHome, openSheet, closeSheet, sheetOpen, sheetClick };
})();
