// Replays every solver solution on the ORIGINAL game's simulation code: proves the new engine and the original agree on each level.
global.window = global; const ref = require('./reference/load.js'), RW = ref.World, RL = ref.LV, fs = require('fs'), path = require('path');
const ACTS = [{ mx: 1 }, { mx: -1 }, { mx: 1, crouch: true }, { mx: -1, crouch: true }, {}, { crouch: true }, { use: true }, { ping: true }];
const sols = {}; fs.readdirSync(path.join(__dirname, 'solutions')).forEach(f => Object.assign(sols, JSON.parse(fs.readFileSync(path.join(__dirname, 'solutions', f)))));
let bad = 0, n = 0;
for (const L of Object.keys(sols).map(Number).sort((a, b) => a - b)) {
  const s = sols[L]; if (!s) continue; const W = RW.parse(RL.LEVELS[L - 1]), S = RW.init(W);
  for (const a of s.path) { const A = ACTS[a]; for (let t = 0; t < 12 && !S.won && !S.dead; t++) { RW.step(W, S, { mx: A.mx || 0, crouch: !!A.crouch, use: t === 0 && !!A.use, ping: t === 0 && !!A.ping }); S.ev.length = 0; } }
  const st = S.won ? RW.stars(W, S) : 0; n++; if (!S.won || st !== s.stars) bad++;
  console.log((S.won ? 'PASS' : 'FAIL') + ` L${L} ${RL.LEVELS[L - 1].name}: original sim -> won=${S.won} stars=${st} t=${S.t.toFixed(1)}s sonar=${S.su} detected=${S.det}`);
}
console.log(`${n - bad}/${n} solutions confirmed on the original simulation`); process.exit(bad ? 1 : 0);
