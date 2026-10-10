// Detects clicks/crackle: renders each continuous layer alone (and the full scene) offline, then measures impulsiveness of the signal.
const { chromium } = require('/opt/node-tools/node_modules/playwright');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
  const p = await (await b.newContext()).newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + process.argv[2] + '?test=1'); await p.waitForTimeout(1500);
  const res = await p.evaluate(async () => {
    const Sound = window.HUSH_TEST.Sound, realScene = Sound.scene; Sound.scene = function () {};   /* the running game must not touch the offline graph */ const scene = o => realScene.call(Sound, o); const SR = 44100, out = {};
    const analyse = d => { // d: Float32Array. Impulsiveness: high-pass by first difference; count outliers vs a local (20 ms) rms
      const n = d.length, diff = new Float32Array(n - 1); for (let i = 1; i < n; i++) diff[i - 1] = d[i] - d[i - 1];
      const w = Math.floor(SR * 0.02), rms = []; for (let i = 0; i + w < diff.length; i += w) { let s = 0; for (let j = 0; j < w; j++) s += diff[i + j] * diff[i + j]; rms.push(Math.sqrt(s / w)); }
      const sorted = rms.slice().sort((a, b) => a - b), med = sorted[Math.floor(sorted.length / 2)] || 1e-9, mx = sorted[sorted.length - 1];
      let spikes = 0; for (const v of rms) if (v > med * 4 && v > 1e-4) spikes++;
      let pk = 0, ss = 0; for (let i = 0; i < n; i++) { const a = Math.abs(d[i]); if (a > pk) pk = a; ss += d[i] * d[i]; }
      // largest single-sample jump relative to rms
      let jump = 0; for (let i = 0; i < diff.length; i++) { const a = Math.abs(diff[i]); if (a > jump) jump = a; }
      return { rmsdB: +(20 * Math.log10(Math.sqrt(ss / n) + 1e-12)).toFixed(1), peakdB: +(20 * Math.log10(pk + 1e-12)).toFixed(1), spikes, windows: rms.length, ratio: +(mx / med).toFixed(1), jumpOverRms: +(jump / (Math.sqrt(ss / n) + 1e-9)).toFixed(1) };
    };
    const render = async (setup, secs, lightMode) => { const off = new OfflineAudioContext(1, SR * secs, SR); Sound.useContext(off, lightMode); Sound.set('sound', true); Sound.set('music', true); Sound.set('vol', 0.8); Sound.set('mvol', 0.6); Sound.unlock(); setup(Sound._loops()); const buf = await off.startRendering(); return analyse(buf.getChannelData(0).slice(SR * 1)); };
    out.silence = await render(() => {}, 4);
    for (const lm of [false, true]) {
      const tag = lm ? 'light' : 'full';
      out[tag + ' calm'] = await render(() => scene({ chapter: 0, threat: 0 }), 10, lm);
      out[tag + ' near'] = await render(() => scene({ chapter: 1, threat: 0.8 }), 10, lm);
      out[tag + ' hunted+gen'] = await render(() => scene({ chapter: 2, threat: 1, hunted: true, gen: 0.8, genPan: 0.3 }), 10, lm);
      out[tag + ' menu'] = await render(() => scene({ menu: true }), 6, lm);
    }
    return out;
  });
  for (const [k, v] of Object.entries(res)) console.log(k.padEnd(14), JSON.stringify(v));
  await b.close();
})();
