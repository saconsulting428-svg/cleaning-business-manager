/* ============================================================
   storage.js — everything is saved in localStorage
   ============================================================ */
(function () {
  'use strict';
  const G = window.G, KEY = 'ascend-sky-v2', OLD = 'ascend-shield-sky-v1';
  const defaults = () => ({
    v: 2, coins: 0, best: 0, runs: 0, tut: false, boostNext: false,
    chars: { owned: ['balloon'], sel: 'balloon' },
    up: { shield: 0, gun: 0, invis: 0, magnet: 0, slow: 0, life: 0, dash: 0 },
    settings: { sound: true, music: true, vibe: true, shake: true },
    daily: { streak: 0, last: '', x2: '' }
  });
  function merge(base, over) {
    if (!over || typeof over !== 'object') return base;
    for (const k in base) {
      if (!(k in over)) continue;
      if (base[k] && typeof base[k] === 'object' && !Array.isArray(base[k])) base[k] = merge(base[k], over[k]);
      else base[k] = over[k];
    }
    return base;
  }
  const S = (G.Storage = {
    data: defaults(),
    load() {
      try {
        const raw = localStorage.getItem(KEY);
        if (raw) { this.data = merge(defaults(), JSON.parse(raw)); return; }
        const old = localStorage.getItem(OLD);               // carry over stars from the first version
        if (old) { const o = JSON.parse(old); this.data.coins = Math.min(5000, o.coins | 0); this.save(); }
      } catch (e) {}
    },
    save() { try { localStorage.setItem(KEY, JSON.stringify(this.data)); } catch (e) {} },
    reset() { try { localStorage.removeItem(KEY); } catch (e) {} location.reload(); }
  });
  S.load();
})();
