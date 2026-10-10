// Robustness of every level's solution to human timing: each action is held for 8..16 ticks instead of exactly 12 (a person is never that exact).
// A level whose solution survives only when executed to the tick is "knife-edge" and effectively unplayable for people.
const N = require('./load-new.js'), Sim = N.Sim, fs = require('fs'), path = require('path');
const ACTS = [{ mx: 1 }, { mx: -1 }, { mx: 1, crouch: true }, { mx: -1, crouch: true }, {}, { crouch: true }, { use: true }, { ping: true }];
const sols = {}; fs.readdirSync(path.join(__dirname, 'solutions')).filter(f => !f.startsWith('fix')).forEach(f => Object.assign(sols, JSON.parse(fs.readFileSync(path.join(__dirname, 'solutions', f)))));
let seed = 12345; const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
const T = +process.argv[2] || 150, J = +process.argv[3] || 4, LV = process.argv[4] ? JSON.parse(fs.readFileSync(process.argv[4])) : N.LEVELS;
const rows = [];
for (const L of Object.keys(sols).map(Number).sort((a, b) => a - b)) {
  const s = sols[L]; if (!s) continue; const W = Sim.parse(LV[L - 1]); let ok = 0, ok3 = 0;
  for (let t = 0; t < T; t++) {
    const S = Sim.init(W);
    for (const a of s.path) { const act = ACTS[a], n = 12 + Math.round((rnd() * 2 - 1) * J); for (let k = 0; k < n && !S.won && !S.dead; k++) { Sim.step(W, S, { mx: act.mx || 0, crouch: !!act.crouch, use: k === 0 && !!act.use, ping: k === 0 && !!act.ping }); S.ev.length = 0; } if (S.dead || S.won) break; }
    if (S.won) { ok++; if (Sim.stars(W, S) === 3) ok3++; }
  }
  rows.push({ L, name: LV[L - 1].name, ok, ok3, T }); console.log(`L${String(L).padStart(2)} ${LV[L - 1].name.padEnd(20)} finishes ${String(Math.round(100 * ok / T)).padStart(3)}%   3-star ${String(Math.round(100 * ok3 / T)).padStart(3)}%` + (ok / T < 0.25 ? '   <-- knife-edge' : ''));
}
