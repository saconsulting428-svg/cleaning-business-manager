/* HTML HUD / overlay helpers. The game scenes push state in; buttons are wired in game.js. */
PB.UI = (function () {
  const $ = (id) => document.getElementById(id);
  const chips = new Map();
  let el = {};
  let lastLives = -1, lastScore = -1;

  function init() {
    ['hud-score', 'hud-best', 'hud-level', 'hud-lives', 'effects', 'combo', 'menu', 'pause', 'gameover',
      'go-score', 'go-best', 'go-new', 'go-level', 'menu-best', 'btn-pause', 'btn-mute', 'live']
      .forEach((id) => { el[id] = $(id); });
    refreshMute();
  }

  function fmt(n) { return Math.floor(n).toLocaleString('en-US'); }

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

  function showOnly(id) {
    ['menu', 'pause', 'gameover'].forEach((k) => el[k].classList.toggle('hidden', k !== id));
  }
  function hideAll() { showOnly(null); }
  function show(id) { el[id].classList.remove('hidden'); }
  function hide(id) { el[id].classList.add('hidden'); }

  function gameOver(score, best, isNew, level) {
    el['go-score'].textContent = fmt(score);
    el['go-best'].textContent = fmt(best);
    el['go-level'].textContent = level;
    el['go-new'].classList.toggle('hidden', !isNew);
    showOnly('gameover');
    setTimeout(() => { const b = $('btn-replay'); if (b) b.focus(); }, 50);
  }

  function setMenuBest(b) { if (el['menu-best']) el['menu-best'].textContent = fmt(b); }

  function refreshMute() {
    const m = PB.Audio.isMuted();
    el['btn-mute'].classList.toggle('off', m);
    el['btn-mute'].setAttribute('aria-pressed', String(m));
    el['btn-mute'].title = m ? 'Unmute (M)' : 'Mute (M)';
  }
  function setPaused(p) {
    el['btn-pause'].classList.toggle('on', p);
    el['btn-pause'].setAttribute('aria-pressed', String(p));
  }
  function reset() { lastLives = -1; lastScore = -1; effects([]); el.combo.classList.remove('on'); }
  function announce(t) { if (el.live) el.live.textContent = t; }

  return { init, hud, effects, showOnly, hideAll, show, hide, gameOver, refreshMute, setPaused, setMenuBest, reset, announce };
})();
