/* Rig checks (no browser): feet planted while the body moves at the game's stride, no joint jumps between 60 Hz frames, finite output in every state. */
const vm = require('vm'), fs = require('fs'); const ctx = {}; vm.createContext(ctx); vm.runInContext(fs.readFileSync(__dirname + '/../src/puppet.js', 'utf8') + ';this.Rig=Puppet;', ctx); const Rig = ctx.Rig;
let ok = 0, bad = 0; const t = (n, c, d) => { if (c) ok++; else bad++; console.log((c ? 'PASS ' : 'FAIL ') + n + (c ? '' : '  ' + (d || ''))); };
function surv(crouch, cyc, speedMul) {
  const S = Rig.newState(); let ph = 0, x = 0, prev = null, maxSlide = 0, maxJump = 0; const v = crouch ? 1.2 : 3.1, dt = 1 / 60;
  for (let i = 0; i < 600; i++) {
    const d = v * dt * speedMul; x += d; ph += d / cyc; const J = Rig.pose(S, { ph, w: 1, c: crouch, t: i * dt, acc: 0, dt });
    const feet = J.feet.map(f => [x + f.ank[0], f.ank[1]]);
    if (prev) { J.feet.forEach((f, k) => { const stance = f.ank[1] < 0.2301 && prev.J.feet[k].ank[1] < 0.2301; if (stance && i > 30) maxSlide = Math.max(maxSlide, Math.abs(feet[k][0] - prev.feet[k][0])); });
      maxJump = Math.max(maxJump, Math.hypot(J.hip[0] + x - prev.J.hip[0] - prev.x, J.hip[1] - prev.J.hip[1]), ...J.feet.map((f, k) => Math.hypot(f.ank[0] + x - prev.J.feet[k].ank[0] - prev.x, f.ank[1] - prev.J.feet[k].ank[1]))); }
    prev = { J, feet, x };
  }
  return { maxSlide, maxJump };
}
const R = surv(0, 1.9, 1), C = surv(1, 1.0, 1);
t('run: stance foot does not slide (max ' + R.maxSlide.toFixed(4) + ' m/frame)', R.maxSlide < 0.004);
t('crouch: stance foot does not slide (max ' + C.maxSlide.toFixed(4) + ')', C.maxSlide < 0.004);
t('run: no joint teleport between frames (swing foot is legitimately fast) (max ' + R.maxJump.toFixed(3) + ' m)', R.maxJump < 0.2);
t('crouch: no joint jump (max ' + C.maxJump.toFixed(3) + ')', C.maxJump < 0.1);
let finite = true; const chk = o => JSON.stringify(o, (k, v) => { if (typeof v === 'number' && !isFinite(v)) finite = false; return v; });
const S = Rig.newState(), M = Rig.newState();
for (const w of [0, 1]) for (const c of [0, 1]) for (let ph = 0; ph < 1; ph += 0.1) chk(Rig.pose(S, { ph, w, c, t: ph, acc: 0.5, dt: 1 / 60 }));
for (let p = 0; p <= 1; p += 0.05) { /* caught handled in drawSurvivor */ }
for (const mode of ['idle', 'inv', 'search', 'stare', 'roar', 'attack']) for (const w of [0, 1]) for (const run of [0, 1]) for (let k = 0; k <= 1; k += 0.25) chk(Rig.cpose(M, { ph: k, w, run, t: k, mode, k, dt: 1 / 60 }));
t('all poses finite', finite);
console.log(ok + '/' + (ok + bad) + ' passed'); process.exit(bad ? 1 : 0);
