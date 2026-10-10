// "Human" strategies: simple, closed-loop plans (react to what the monster does, with random reaction delays), the way a player would try the
// obvious idea of each level. Success under reaction jitter shows the level can be beaten by the intended idea, not just by a tick-exact script.
const N = require('./load-new.js'), Sim = N.Sim;
let seed = 99; const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
function bot(level, plan, trials) {
  let ok = 0, why = {};
  for (let t = 0; t < trials; t++) {
    const W = Sim.parse(N.LEVELS[level - 1]), S = Sim.init(W); let ticks = 0, fail = null;
    const step = (inp) => { Sim.step(W, S, Object.assign({ mx: 0, crouch: false, use: false, ping: false }, inp)); S.ev.length = 0; ticks++; };
    const hold = (inp, n) => { for (let i = 0; i < n && !S.dead && !S.won; i++) step(inp); };
    const until = (cond, inp, max) => { let i = 0; while (!cond() && i++ < (max || 900) && !S.dead && !S.won) step(typeof inp === 'function' ? inp() : inp); return cond(); };
    const react = () => hold({}, Math.round(rnd() * 14));                               // a person needs up to ~0.5 s to react
    const tap = (k) => step({ [k]: true });
    const ctl = { S, W, hold, until, react, tap, step, c: () => S.cr[0] };
    try { plan(ctl); } catch (e) { fail = e.message; }
    if (S.won) ok++; else { const k = S.dead ? 'caught' : (fail || 'gave up'); why[k] = (why[k] || 0) + 1; }
  }
  return { ok, trials, why };
}
const R = { mx: 1 }, Lf = { mx: -1 }, cR = { mx: 1, crouch: true };
const plans = {
  /* 8 Bait: ping from the right of the first locker, run to the far locker, let it walk past, leave behind it, creep away, then run */
  8: c => { c.until(() => c.S.x >= 17.1, R); c.react(); c.tap('ping'); c.react(); c.until(() => Math.abs(c.S.x - 22.5) < 0.5, R); c.tap('use'); c.until(() => c.c().x < 19.5 && c.c().st !== 0 || c.S.dead, {}, 900); c.react(); c.tap('use'); c.hold(cR, 30); c.until(() => c.S.won, R, 400); },
  /* 11 Static: press the intercom, step into the locker, let the guard go to the speaker, leave, run for the exit */
  11: c => { c.until(() => c.S.x >= 10.4, R); c.react(); c.tap('use'); c.until(() => Math.abs(c.S.x - 15.5) < 0.5, R); c.tap('use'); c.until(() => c.c().x < 13 || c.S.dead, {}, 900); c.react(); c.tap('use'); c.hold(cR, 24); c.until(() => c.S.won, R, 900); },
  /* 16 Feedback: intercom, locker, guard leaves its post; fetch the card, up the stairs, unlock, out */
  16: c => { c.until(() => c.S.x >= 10.4, R); c.react(); c.tap('use'); c.until(() => Math.abs(c.S.x - 15.5) < 0.5, R); c.tap('use'); c.until(() => c.c().x < 13 || c.S.dead, {}, 900); c.react(); c.tap('use'); c.hold(cR, 24);
    c.until(() => c.S.keys > 0, R, 400); c.until(() => Math.abs(c.S.x - 21.5) < 0.5, Lf, 300); c.tap('use'); c.hold({}, 20); c.until(() => Math.abs(c.S.x - 29.5) < 0.5 || c.S.x > 29, R, 300); c.tap('use'); c.until(() => c.S.won, R, 400); }
};
const T = +process.argv[2] || 100;
for (const L of Object.keys(plans).map(Number)) { const r = bot(L, plans[L], T); console.log(`L${L} ${N.LEVELS[L - 1].name.padEnd(10)} human plan wins ${r.ok}/${r.trials}`, JSON.stringify(r.why)); }
