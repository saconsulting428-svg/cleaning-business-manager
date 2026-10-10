const N = require('./load-new.js'), Sim = N.Sim, fs = require('fs'), path = require('path');
const L = +process.argv[2]; const sols = {}; fs.readdirSync(path.join(__dirname, 'solutions')).forEach(f => Object.assign(sols, JSON.parse(fs.readFileSync(path.join(__dirname, 'solutions', f)))));
const ACTS = ['R', 'L', 'cR', 'cL', 'wait', 'crouch', 'USE', 'PING']; const A = [{ mx: 1 }, { mx: -1 }, { mx: 1, crouch: true }, { mx: -1, crouch: true }, {}, { crouch: true }, { use: true }, { ping: true }];
const W = Sim.parse(N.LEVELS[L - 1]), S = Sim.init(W); let m = 0;
for (const a of sols[L].path) { const act = A[a]; for (let t = 0; t < 12; t++) { Sim.step(W, S, { mx: act.mx || 0, crouch: !!act.crouch, use: t === 0 && !!act.use, ping: t === 0 && !!act.ping }); S.ev.length = 0; }
  m++; console.log(`${(S.t).toFixed(1).padStart(5)}s ${ACTS[a].padEnd(6)} p=${S.x.toFixed(1).padStart(5)} hid=${S.hid} ` + S.cr.map(c => `${Sim.STATE_NAMES[c.st]}@${c.x.toFixed(1)}/dir${c.dir}`).join(' ')); }
