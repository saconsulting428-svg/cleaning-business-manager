// Differential test: the new simulation must match the ORIGINAL game's simulation tick for tick,
// on every level, driven by identical pseudo-random and biased input streams.
const N = require('./load-new.js');
global.window = global;
const ref = require('./reference/load.js');       // original ai.js + world.js + levels.js
const RW = ref.World, RL = ref.LV;
function rng(seed) { let s = seed >>> 0; return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296; }
const strip = S => JSON.stringify(S, (k, v) => (typeof v === 'number' ? Math.round(v * 1e9) / 1e9 : v));
let ticks = 0, runs = 0, fail = 0, wins = 0, deaths = 0, evCount = {};
const SEEDS = +process.env.SEEDS || 6, TICKS = +process.env.TICKS || 2500;
for (let li = 0; li < 30; li++) {
  if (JSON.stringify(RL.LEVELS[li]) !== JSON.stringify(N.LEVELS[li])) { console.log('LEVEL DATA MISMATCH', li + 1); fail++; }
  const Wr = RW.parse(RL.LEVELS[li]), Wn = N.Sim.parse(N.LEVELS[li]);
  for (let seed = 1; seed <= SEEDS; seed++) {
    const r = rng(li * 977 + seed * 131), Sr = RW.init(Wr), Sn = N.Sim.init(Wn);
    let mx = 0, crouch = false, hold = 0, bias = seed % 3;   // bias: 0 random, 1 mostly right, 2 mostly toward exit
    runs++;
    for (let t = 0; t < TICKS && !Sr.won && !Sr.dead; t++) {
      if (hold-- <= 0) { hold = 3 + Math.floor(r() * 25); const q = r(); mx = bias === 1 ? (q < 0.7 ? 1 : q < 0.85 ? -1 : 0) : bias === 2 ? (Sr.x < Wr.exit.x && Sr.f === Wr.exit.f ? (q < 0.75 ? 1 : 0) : (q < 0.4 ? 1 : q < 0.8 ? -1 : 0)) : (q < 0.4 ? 1 : q < 0.8 ? -1 : 0); crouch = r() < 0.3; }
      const inp = { mx, crouch, use: r() < 0.08, ping: r() < 0.02 };
      RW.step(Wr, Sr, inp); N.Sim.step(Wn, Sn, Object.assign({}, inp));
      ticks++;
      Sr.ev.forEach(e => evCount[e.e] = (evCount[e.e] || 0) + 1);
      if (strip(Sr) !== strip(Sn)) { console.log('MISMATCH level', li + 1, 'seed', seed, 'tick', t); console.log(' ref', strip(Sr).slice(0, 400)); console.log(' new', strip(Sn).slice(0, 400)); fail++; break; }
      Sr.ev.length = 0; Sn.ev.length = 0;
    }
    if (Sr.won) wins++; if (Sr.dead) deaths++;
  }
}
console.log(`runs ${runs}, ticks compared ${ticks}, mismatches ${fail}, wins ${wins}, deaths ${deaths}`);
console.log('events exercised:', JSON.stringify(evCount));
process.exit(fail ? 1 : 0);
