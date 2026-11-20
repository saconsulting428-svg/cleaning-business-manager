/* ============================================================
   levels.js — the 100-level JOURNEY. Every level launches from a
   different planet: Earth, Moon, Mars, Venus, then the ice / lava /
   gas giant / crystal / neon / black-hole worlds, then seeded alien
   planets (same generator as Endless). Reach the goal distance to finish.
   ============================================================ */
(function () {
  'use strict';
  const G = window.G, U = G.U, rgbs = c => 'rgb(' + (c[0] | 0) + ',' + (c[1] | 0) + ',' + (c[2] | 0) + ')';
  const EXTRA = [
    { type: 'earth', name: 'Earth', icon: '🌍', zone: 'sky' },
    { type: 'moon',  name: 'Moon',  icon: '🌙', airless: true, top: [3, 4, 12], bot: [26, 28, 48], ground: ['rgb(120,124,134)', 'rgb(88,92,102)'], gk: 'moon', zone: 'moon' },
    { type: 'mars',  name: 'Mars',  icon: '🔴', top: [70, 32, 44], bot: [230, 142, 98], ground: ['rgb(178,82,42)', 'rgb(130,54,26)'], gk: 'mars', cloudy: true, cloud: '236,170,130', zone: 'mars' },
    { type: 'venus', name: 'Venus', icon: '🟠', top: [96, 52, 22], bot: [240, 192, 94], ground: ['rgb(156,104,52)', 'rgb(106,66,30)'], gk: 'venus', cloudy: true, cloud: '250,214,130', zone: 'venus' }
  ];
  const ICON = { ice: '🧊', lava: '🌋', gas: '🪐', crystal: '💎', neon: '🌆', hole: '🕳️' };
  function themePlanet(idx) {
    const th = G.World.themeFor(idx), k = th.kind, h = th.hue, hs = (s, l) => rgbs(U.hsl(h, s, l));
    const gr = { ice: [hs(.35, .78), hs(.45, .9)], lava: [hs(.35, .13), hs(.5, .07)], gas: ['rgb(255,244,214)', 'rgb(255,226,170)'], crystal: [hs(.45, .2), hs(.5, .11)], neon: ['#0b0420', '#12082e'], hole: ['#1f2937', '#111827'] }[k];
    return { type: 'theme', name: th.name, icon: ICON[k], th, top: th.top, bot: th.bot, ground: gr, gk: k, hue: h, zone: k, cloudy: k === 'ice', cloud: '230,244,255' };
  }
  const cache = {};
  const L = (G.Levels = {
    COUNT: 100,
    goal: n => Math.round((420 + n * 55) / 10) * 10,                        // meters to climb (L1 = 470 m ... L100 = 5,920 m)
    base: n => 50 * Math.pow(Math.max(0, n - 1), 1.25),                     // difficulty offset so later levels start harder
    info(n) {
      n = U.clamp(n | 0, 1, L.COUNT); if (cache[n]) return cache[n];
      return (cache[n] = { level: n, planet: n <= 4 ? EXTRA[n - 1] : themePlanet(n - 5), goal: L.goal(n), base: L.base(n) });
    },
    stars: hits => hits <= 0 ? 3 : hits <= 1 ? 2 : 1,
    reward: (n, stars) => 25 + n * 3 + stars * 10,
    // which obstacle skin set to use at this moment of a level
    skinZone(info, dist) { const p = info.planet; if (p.type === 'earth') { const A = dist / info.goal * 6400; return A < 2000 ? 'sky' : A < 5000 ? 'upper' : 'space'; } return p.zone; },
    totalStars() { let s = 0; const st = G.Storage.data.journey.stars; for (const k in st) s += st[k]; return s; }
  });
})();
