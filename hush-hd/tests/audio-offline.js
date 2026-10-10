// Renders every sound cue offline (OfflineAudioContext) through the real master chain and measures peak level, clipping and DC/NaN issues.
const { chromium } = require('/opt/node-tools/node_modules/playwright'), fs = require('fs'), path = require('path');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
  const p = await (await b.newContext()).newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto('file://' + process.argv[2] + '?test=1'); await p.waitForTimeout(1500);
  const out = await p.evaluate(async () => {
    const Sound = window.HUSH_TEST.Sound, realScene = Sound.scene; Sound.scene = function () {};   /* the running game must not touch the offline graph */ const scene = o => realScene.call(Sound, o); const cues = Sound._cues.filter(c => c !== 'drip' && c !== 'creak'), SR = 44100;
    const stats = d => { let pk = 0, ss = 0, bad = 0, clip = 0, dc = 0; for (let i = 0; i < d.length; i++) { const v = d[i]; if (!isFinite(v)) bad++; const a = Math.abs(v); if (a > pk) pk = a; if (a > 0.985) clip++; ss += v * v; dc += v; } return { peak: pk, rms: Math.sqrt(ss / d.length), nan: bad, clipped: clip, dc: dc / d.length }; };
    const render = async (fn, secs, lightMode) => { const off = new OfflineAudioContext(2, SR * secs, SR); Sound.useContext(off, lightMode); Sound.set('sound', true); Sound.set('music', true); Sound.set('vol', 1); Sound.set('mvol', 1); fn(); const buf = await off.startRendering(); const L = buf.getChannelData(0), R = buf.getChannelData(1); const s1 = stats(L), s2 = stats(R); return { peak: Math.max(s1.peak, s2.peak), rms: Math.max(s1.rms, s2.rms), nan: s1.nan + s2.nan, clipped: s1.clipped + s2.clipped, dc: Math.max(Math.abs(s1.dc), Math.abs(s2.dc)) }; };
    const args = { step: { crouch: false, run: true }, drip: { f: 0.5, pan: 0 }, creak: { f: 0.5, pan: 0 }, groan: { pan: 0 }, knock: { pan: 0 }, thump: { pan: 0 }, breath: { v: 1, pan: 0 }, glass: { crouch: false }, genPulse: { v: 1 }, radioPulse: { v: 1, pan: 0.5 }, cstep: { v: 1, pan: -0.5 }, heart: { v: 1 }, growl: { v: 1, pan: 0.3, kind: 'stalker' }, roar: { v: 1, pan: -0.3, kind: 'sentinel' }, star: { i: 2 } };
    const per = {}; for (const c of cues) per[c] = await render(() => Sound.play(c, args[c]), 4);
    const perLight = {}; for (const c of cues) perLight[c] = await render(() => Sound.play(c, args[c]), 4, true);
    const all = await render(() => { cues.forEach(c => Sound.play(c, args[c])); }, 5);              // worst case: every cue fires at the same instant
    const mix = await render(() => { Sound.unlock(); ['roar', 'cstep', 'genPulse', 'radioPulse', 'ping', 'door', 'heart', 'caught'].forEach(c => Sound.play(c, args[c])); }, 5);
    const sceneR = {};
    for (const [name, sc] of Object.entries({ calm: { chapter: 0, threat: 0 }, near: { chapter: 1, threat: 0.8 }, hunted: { chapter: 2, threat: 1, hunted: true, gen: 1, genPan: 0.4 }, menu: { menu: true } })) {
      sceneR[name] = await render(() => { Sound.unlock(); scene(sc); }, 6);
    }
    sceneR.heavy = await render(() => { Sound.unlock(); scene({ chapter: 2, threat: 1, hunted: true, gen: 1, genPan: 0.4 }); ['roar', 'cstep', 'ping', 'genPulse', 'heart', 'caught', 'door'].forEach(c => Sound.play(c, args[c])); }, 6);
    const allLight = await render(() => { cues.forEach(c => Sound.play(c, args[c])); }, 5, true);
    return { per, perLight, all, allLight, mix, sceneR };
  });
  const db = v => v > 0 ? (20 * Math.log10(v)).toFixed(1) : '-inf';
  let worst = 0, bad = 0; console.log('cue            peak dBFS   rms dBFS  clipped  NaN');
  Object.entries(out.per).forEach(([k, v]) => { worst = Math.max(worst, v.peak); if (v.nan || v.clipped) bad++; console.log(k.padEnd(14), db(v.peak).padStart(8), db(v.rms).padStart(11), String(v.clipped).padStart(8), String(v.nan).padStart(4)); });
  Object.entries(out.sceneR).forEach(([k, v]) => { console.log('scene ' + k.padEnd(8), 'peak', db(v.peak).padStart(7), 'rms', db(v.rms).padStart(7), 'clipped', v.clipped, 'nan', v.nan); if (v.nan || v.clipped) bad++; });
  Object.entries(out.perLight).forEach(([k, v]) => { if (v.nan || v.clipped || v.rms < 1e-4) { console.log('LIGHT-MODE PROBLEM', k, JSON.stringify(v)); bad++; } });
  console.log('LIGHT MODE all cues at once: peak', db(out.allLight.peak), 'dBFS, clipped', out.allLight.clipped);
  console.log('ALL CUES AT ONCE: peak', db(out.all.peak), 'dBFS, clipped samples', out.all.clipped, 'NaN', out.all.nan, 'DC', out.all.dc.toFixed(4));
  console.log('HEAVY MIX (roar+steps+gen+radio+sonar+door+heart+caught): peak', db(out.mix.peak), 'dBFS, clipped samples', out.mix.clipped);
  Object.entries(out.per).forEach(([k, v]) => { if (v.rms < 1e-4) { console.log('SILENT cue', k); bad++; } });
  const pass = out.all.peak < 0.97 && out.all.clipped === 0 && out.all.nan === 0 && out.mix.clipped === 0 && !bad && !errs.length;
  console.log(pass ? 'PASS audio: no clipping, no NaN, worst single cue peak ' + db(worst) + ' dBFS' : 'FAIL audio', errs.length ? errs : '');
  fs.writeFileSync(path.join(__dirname, 'results-audio.json'), JSON.stringify(out, null, 1)); await b.close(); process.exit(pass ? 0 : 1);
})();
