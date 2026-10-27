/* Persistent data (localStorage). One versioned object; old survival-game saves are migrated (coins, skins, sound). */
(function (S) {
  'use strict';
  const KEY = 'snakeFruitRush.v2', OLD_KEY = 'snakeFruitRush.v1';
  const LEVELS = 100;
  const MAX_COINS = 999999;

  function blank() {
    return {
      version: 2, coins: 0, skin: 'default', skins: ['default'],
      sfx: true, music: true, haptics: true, dpad: false, pattern: true, reduced: false,
      unlocked: 1,                                   // highest unlocked level (1..100)
      current: 1,                                    // level to continue with
      completed: new Array(LEVELS).fill(0),          // 1 = cleared
      stars: new Array(LEVELS).fill(0),              // best stars 0..3
      starPaid: new Array(LEVELS).fill(0),           // first 3-star reward already paid
      world: 0,                                      // map page last viewed
      seen: {},                                      // mechanic tutorials already shown
      attempt: null                                  // resumable attempt snapshot
    };
  }
  const arr100 = (a, max) => {
    const out = new Array(LEVELS).fill(0);
    if (Array.isArray(a)) for (let i = 0; i < LEVELS; i++) out[i] = S.num(a[i], 0, max, 0);
    return out;
  };
  function sanitize(d) {
    const b = blank();
    if (!d || typeof d !== 'object') return b;
    b.coins = S.num(d.coins, 0, MAX_COINS, 0);
    const owned = Array.isArray(d.skins) ? d.skins.filter((id, i, a) => typeof id === 'string' && S.SKIN_BY_ID[id] && a.indexOf(id) === i) : [];
    if (owned.indexOf('default') < 0) owned.unshift('default');
    b.skins = owned;
    b.skin = typeof d.skin === 'string' && owned.indexOf(d.skin) >= 0 ? d.skin : 'default';   // a locked skin can never be selected
    ['sfx', 'music', 'haptics', 'dpad', 'pattern', 'reduced'].forEach((k) => { if (typeof d[k] === 'boolean') b[k] = d[k]; });
    b.completed = arr100(d.completed, 1);
    b.stars = arr100(d.stars, 3);
    b.starPaid = arr100(d.starPaid, 1);
    for (let i = 0; i < LEVELS; i++) { if (b.stars[i] > 0) b.completed[i] = 1; if (b.stars[i] === 3) b.starPaid[i] = b.starPaid[i] || 0; }
    // unlock rule: level 1 is open, finishing level N opens N+1 - rebuilt from the completed levels so it can never be inconsistent
    let u = 1;
    for (let i = 0; i < LEVELS; i++) { if (b.completed[i]) u = Math.max(u, Math.min(LEVELS, i + 2)); }
    b.unlocked = u;
    b.current = S.clamp(S.num(d.current, 1, LEVELS, b.unlocked), 1, b.unlocked);
    b.world = S.clamp(S.num(d.world, 0, 4, 0), 0, 4);
    b.seen = {};
    if (d.seen && typeof d.seen === 'object') Object.keys(d.seen).forEach((k) => { if (d.seen[k] === 1 && /^[a-z]{2,12}$/.test(k)) b.seen[k] = 1; });
    b.attempt = validAttempt(d.attempt);
    return b;
  }
  function validAttempt(a) {
    if (!a || typeof a !== 'object') return null;
    const id = S.num(a.level, 0, LEVELS, 0);
    if (!id || !Array.isArray(a.body) || a.body.length < 3 || a.body.length > 64) return null;
    if (!a.body.every((c) => Number.isInteger(c) && c >= 0 && c < 64)) return null;
    if (!Array.isArray(a.dir) || a.dir.length !== 2 || Math.abs(a.dir[0]) + Math.abs(a.dir[1]) !== 1) return null;
    return { level: id, body: a.body.slice(), dir: [a.dir[0] | 0, a.dir[1] | 0], fruitMask: S.num(a.fruitMask, 0, 1 << 20, 0), keyMask: S.num(a.keyMask, 0, 1 << 20, 0),
      gateMask: S.num(a.gateMask, 0, 1 << 20, 0), moves: S.num(a.moves, 0, 500, 0), swLog: String(a.swLog || '').replace(/[^0-9]/g, '').slice(0, 64),
      fruitLog: String(a.fruitLog || '').replace(/[^0-9,]/g, '').slice(0, 128) };
  }
  function migrate() {                       // carry coins, skins and sound over from the survival game
    const b = blank();
    try {
      const o = JSON.parse(localStorage.getItem(OLD_KEY) || 'null');
      if (o && typeof o === 'object') {
        b.coins = S.num(o.coins, 0, MAX_COINS, 0);
        if (Array.isArray(o.skins)) b.skins = o.skins;
        if (typeof o.skin === 'string') b.skin = o.skin;
        if (typeof o.sound === 'boolean') { b.sfx = o.sound; b.music = o.sound; }
        return sanitize(b);
      }
    } catch (e) { /* no storage / broken data */ }
    return b;
  }
  function load() {
    let raw = null;
    try { raw = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { raw = null; }
    return raw ? sanitize(raw) : migrate();
  }

  const save = {
    data: null,
    init() {
      let first = false;
      try { first = !localStorage.getItem(KEY); } catch (e) { first = true; }
      save.data = load();
      if (first && S.reducedMotion()) save.data.reduced = true;
      return save.data;
    },
    write() { try { localStorage.setItem(KEY, JSON.stringify(save.data)); } catch (e) { /* no storage */ } },
    addCoins(n) { save.data.coins = S.clamp(save.data.coins + (n | 0), 0, MAX_COINS); },
    isOwned: (id) => save.data.skins.indexOf(id) >= 0,
    totalStars: () => save.data.stars.reduce((a, b) => a + b, 0),
    completedCount: () => save.data.completed.reduce((a, b) => a + b, 0),
    worldStars: (w) => save.data.stars.slice(w * 20, w * 20 + 20).reduce((a, b) => a + b, 0),
    worldDone: (w) => save.data.completed.slice(w * 20, w * 20 + 20).reduce((a, b) => a + b, 0),
    // Records a finished level. Returns what was paid so the UI can show it. Rewards are paid once per level.
    complete(id, stars, reward) {
      const d = save.data, i = id - 1, first = !d.completed[i];
      const prevStars = d.stars[i];
      let coins = 0;
      if (first) coins += reward.first;
      else coins += reward.replay;
      if (stars === 3 && !d.starPaid[i]) { coins += reward.perfect; d.starPaid[i] = 1; }
      d.completed[i] = 1;
      d.stars[i] = Math.max(prevStars, stars);
      const unlockedNew = id < LEVELS && d.unlocked < id + 1;
      if (unlockedNew) d.unlocked = id + 1;
      d.current = Math.min(LEVELS, id + 1);
      save.addCoins(coins);
      d.attempt = null;
      save.write();
      return { coins: coins, first: first, newBest: stars > prevStars, unlockedNew: unlockedNew };
    },
    resetCampaign() {
      const d = save.data;
      d.unlocked = 1; d.current = 1; d.completed = new Array(LEVELS).fill(0); d.stars = new Array(LEVELS).fill(0);
      d.starPaid = new Array(LEVELS).fill(0); d.world = 0; d.seen = {}; d.attempt = null;
      save.write();
    },
    sanitize: sanitize
  };
  S.save = save;
})(window.SFR);
