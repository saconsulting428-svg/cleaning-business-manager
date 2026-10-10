/* HUSH HD - synthesised audio (no sound files).
   Signal path: every voice -> effects or ambience bus -> low-pass -> compressor -> soft clipper -> master. The soft clipper is a tanh
   curve, so the output can never exceed the master gain: overlapping cues get denser, never harsher, and cannot crackle.
   The context is injectable (init(ctx)) so tests can render cues offline and measure the peak. */
const Sound = (function () {
  'use strict';
  let ac = null, sfx = null, mus = null, nbuf = null, drone = null, voices = 0, dripT = 0, creakT = 6;
  const st = { sound: true, music: true, vibe: true, vol: 0.8, mvol: 0.6 };
  const MAX_VOICES = 28;
  let real = true;                                           // false when an offline context is injected

  function build(a) {
    ac = a; sfx = ac.createGain(); mus = ac.createGain();
    const lp = ac.createBiquadFilter(), cmp = ac.createDynamicsCompressor(), clip = ac.createWaveShaper(), out = ac.createGain();
    lp.type = 'lowpass'; lp.frequency.value = 8000; lp.Q.value = 0.5;
    cmp.threshold.value = -18; cmp.knee.value = 20; cmp.ratio.value = 6; cmp.attack.value = 0.003; cmp.release.value = 0.2;
    const N = 2048, curve = new Float32Array(N); for (let i = 0; i < N; i++) { const x = i / (N - 1) * 2 - 1; curve[i] = Math.tanh(x * 1.6) / Math.tanh(1.6); }
    clip.curve = curve; clip.oversample = '2x'; out.gain.value = 0.86;
    sfx.connect(lp); mus.connect(lp); lp.connect(cmp); cmp.connect(clip); clip.connect(out); out.connect(ac.destination);
    nbuf = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate); const d = nbuf.getChannelData(0); let seed = 12345; for (let i = 0; i < d.length; i++) { seed = (seed * 1664525 + 1013904223) >>> 0; d[i] = seed / 2147483648 - 1; }
    apply();
  }
  function ctx() {
    if (!ac) { const C = window.AudioContext || window.webkitAudioContext; if (!C) return null; try { build(new C()); } catch (e) { return null; } }
    if (real && (ac.state === 'suspended' || ac.state === 'interrupted')) { try { ac.resume(); } catch (e) { /* needs a gesture */ } }
    return ac;
  }
  function apply() { if (!ac) return; sfx.gain.value = st.sound ? st.vol * 1.35 : 0; mus.gain.value = st.music ? st.mvol * 0.5 : 0; }
  function end(src, t) { voices++; src.onended = function () { voices--; }; src.start(t[0]); src.stop(t[1]); }

  function tone(f, dur, o) {
    const a = ctx(); if (!a || !st.sound || voices > MAX_VOICES) return; o = o || {};
    const t = a.currentTime + (o.delay || 0), osc = a.createOscillator(), g = a.createGain(); let out = g;
    osc.type = o.type || 'sine'; osc.frequency.setValueAtTime(f, t); if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, t + dur);
    const soft = osc.type === 'square' || osc.type === 'sawtooth', vol = (o.vol || 0.15) * (soft ? 0.7 : 1);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + Math.max(0.012, o.att || 0.012)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    if (soft) { const tf = a.createBiquadFilter(); tf.type = 'lowpass'; tf.frequency.value = o.lp || Math.min(2400, Math.max(400, f * 5)); osc.connect(tf); tf.connect(g); } else osc.connect(g);
    if (o.vib) { const l = a.createOscillator(), lg = a.createGain(); l.frequency.value = o.vib[0]; lg.gain.value = o.vib[1]; l.connect(lg); lg.connect(osc.frequency); l.start(t); l.stop(t + dur + 0.05); }
    if (o.pan !== undefined && a.createStereoPanner) { const p = a.createStereoPanner(); p.pan.value = Math.max(-1, Math.min(1, o.pan)); g.connect(p); out = p; }
    out.connect(o.dest || sfx); end(osc, [t, t + dur + 0.05]);
  }
  function noise(dur, o) {
    const a = ctx(); if (!a || !st.sound || voices > MAX_VOICES) return; o = o || {};
    const t = a.currentTime + (o.delay || 0), src = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain(); let out = g;
    src.buffer = nbuf; src.loop = true; f.type = o.ft || 'lowpass'; f.frequency.setValueAtTime(o.freq || 800, t); if (o.fto) f.frequency.exponentialRampToValueAtTime(o.fto, t + dur); f.Q.value = o.q || 0.7;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(o.vol || 0.15, t + Math.max(0.012, o.att || 0.012)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(g);
    if (o.pan !== undefined && a.createStereoPanner) { const p = a.createStereoPanner(); p.pan.value = Math.max(-1, Math.min(1, o.pan)); g.connect(p); out = p; }
    out.connect(o.dest || sfx); voices++; src.onended = function () { voices--; }; src.start(t, (o.delay || 0) % 1); src.stop(t + dur + 0.05);
  }
  function buzz(p) { if (!st.vibe || !real) return; try { const H = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Haptics; if (H && typeof p === 'number') { H.vibrate({ duration: p }); return; } if (navigator.vibrate) navigator.vibrate(p); } catch (e) { /* no haptics */ } }

  /* a cue fired again within a few hundredths of a second only adds loudness, so it is dropped */
  const lastAt = {}, GAP = { cstep: 0.12, step: 0.09, glass: 0.09, heart: 0.25, ui: 0.05, genPulse: 0.2, radioPulse: 0.2, growl: 0.8, roar: 1.0, drip: 0.5 };
  function fresh(n) { if (!ac) return true; const t = ac.currentTime, g = GAP[n] === undefined ? 0.06 : GAP[n]; if (lastAt[n] !== undefined && t - lastAt[n] < g) return false; lastAt[n] = t; return true; }

  /* creature voices: a low saw with a throat tremolo, breath noise and a formant sweep */
  function growl(v, pan, kind) {
    const f0 = kind === 'listener' ? 78 : kind === 'sentinel' ? 52 : 62, d = 1.4;
    tone(f0, d, { type: 'sawtooth', vol: 0.15 * v, to: f0 * 0.78, att: 0.12, pan, lp: 380, vib: [kind === 'listener' ? 31 : 23, f0 * 0.14] });
    noise(d, { ft: 'bandpass', freq: 260, fto: 520, q: 1.6, vol: 0.1 * v, att: 0.18, pan });
    tone(f0 * 2.02, d * 0.8, { type: 'triangle', vol: 0.05 * v, att: 0.2, pan, to: f0 * 1.6 });
  }
  function roar(v, pan, kind) {
    const f0 = kind === 'listener' ? 105 : kind === 'sentinel' ? 70 : 88;
    tone(f0, 1.5, { type: 'sawtooth', vol: 0.22 * v, to: f0 * 0.5, att: 0.08, pan, lp: 900, vib: [34, f0 * 0.2] });
    tone(f0 * 1.51, 1.3, { type: 'sawtooth', vol: 0.1 * v, to: f0 * 0.8, att: 0.1, pan, lp: 1400, vib: [29, f0 * 0.3] });
    noise(1.4, { ft: 'bandpass', freq: 1400, fto: 500, q: 1.1, vol: 0.14 * v, att: 0.05, pan });
    noise(0.5, { ft: 'highpass', freq: 3000, vol: 0.05 * v, att: 0.02, pan });
  }
  const S = {
    ui: function () { tone(520, 0.06, { type: 'triangle', vol: 0.07, to: 700 }); },
    step: function (o) { const c = o && o.crouch, v = c ? 0.35 : 1, r = 0.9 + Math.random() * 0.2;
      tone(105 * r, 0.09, { vol: 0.07 * v, to: 62 }); noise(0.09, { ft: 'bandpass', freq: (c ? 420 : 620) * r, q: 0.9, vol: 0.07 * v, att: 0.015 }); noise(0.06, { ft: 'bandpass', freq: 1500 * r, q: 0.8, vol: 0.02 * v, delay: 0.03 }); },
    glass: function (o) { const c = o && o.crouch; noise(0.12, { ft: 'bandpass', freq: 3000, q: 1.2, vol: c ? 0.05 : 0.14 }); tone(3200 + Math.random() * 900, 0.06, { vol: c ? 0.015 : 0.04 }); if (!c) noise(0.08, { ft: 'highpass', freq: 5200, vol: 0.04, delay: 0.04 }); },
    ping: function () { [0, 0.28, 0.56, 0.84].forEach(function (d, i) { tone(1320, 0.5, { vol: 0.2 / (i * 1.6 + 1), to: 880, delay: d }); }); noise(0.2, { ft: 'bandpass', freq: 2400, q: 3, vol: 0.03 }); buzz(25); },
    door: function () { noise(0.4, { freq: 300, fto: 1400, vol: 0.2 }); tone(70, 0.25, { type: 'square', vol: 0.12, delay: 0.33 }); buzz(15); },
    unlock: function () { tone(880, 0.08, { type: 'square', vol: 0.07 }); tone(1320, 0.14, { type: 'square', vol: 0.07, delay: 0.1 }); noise(0.3, { freq: 300, fto: 1200, vol: 0.14, delay: 0.2 }); },
    denied: function () { tone(140, 0.22, { type: 'square', vol: 0.1 }); buzz(30); },
    key: function () { tone(1568, 0.12, { vol: 0.12 }); tone(2093, 0.3, { vol: 0.1, delay: 0.09 }); buzz(12); },
    hide: function () { noise(0.16, { freq: 240, vol: 0.14 }); tone(90, 0.15, { vol: 0.1 }); },
    stairs: function () { [0, 0.12, 0.24].forEach(function (d) { noise(0.07, { freq: 380, vol: 0.09, delay: d }); }); },
    vent: function () { noise(0.9, { ft: 'bandpass', freq: 500, fto: 900, q: 3, vol: 0.09 }); [0.15, 0.5, 0.85].forEach(function (d) { tone(180, 0.08, { vol: 0.05, delay: d, to: 120 }); }); },
    gen: function () { tone(40, 1.2, { type: 'sawtooth', vol: 0.2, to: 95 }); noise(1.1, { freq: 200, fto: 900, vol: 0.14 }); buzz([40, 30, 40]); },
    genPulse: function (o) { const v = o ? o.v : 1; tone(92, 0.5, { type: 'sawtooth', vol: 0.11 * v }); noise(0.4, { freq: 500, vol: 0.06 * v }); },
    radio: function () { tone(660, 0.08, { type: 'square', vol: 0.06 }); },
    radioPulse: function (o) { const v = o ? o.v : 1, p = o ? o.pan : 0; noise(0.5, { ft: 'bandpass', freq: 1800, q: 2, vol: 0.15 * v, pan: p }); tone(700, 0.35, { type: 'square', vol: 0.04 * v, to: 520, pan: p }); },
    cstep: function (o) { tone(86, 0.22, { vol: 0.3 * o.v, to: 55, pan: o.pan }); noise(0.08, { freq: 180, vol: 0.16 * o.v, pan: o.pan }); noise(0.05, { ft: 'bandpass', freq: 2800, q: 2, vol: 0.03 * o.v, pan: o.pan, delay: 0.02 }); },
    heart: function (o) { tone(82, 0.15, { vol: 0.2 * o.v, to: 58 }); tone(74, 0.17, { vol: 0.14 * o.v, to: 52, delay: 0.16 }); },
    heard: function () { tone(220, 0.5, { type: 'triangle', vol: 0.07, to: 330 }); },
    notice: function () { tone(440, 0.25, { type: 'sawtooth', vol: 0.05, to: 620 }); },
    growl: function (o) { growl(o ? o.v : 1, o ? o.pan : 0, o && o.kind); },
    roar: function (o) { roar(o ? o.v : 1, o ? o.pan : 0, o && o.kind); },
    hunt: function () { tone(110, 1.1, { type: 'sawtooth', vol: 0.12, to: 104, lp: 600 }); tone(155.5, 1.1, { type: 'sawtooth', vol: 0.09, lp: 700 }); tone(233, 0.9, { type: 'triangle', vol: 0.05 }); noise(0.5, { ft: 'bandpass', freq: 2200, q: 1, vol: 0.05 }); buzz([60, 40, 120]); },
    lost: function () { tone(330, 0.6, { type: 'triangle', vol: 0.06, to: 196 }); },
    caught: function () { roar(1, 0, 'stalker'); tone(180, 1.2, { type: 'sawtooth', vol: 0.18, to: 60, lp: 700 }); noise(1.1, { freq: 1400, fto: 150, vol: 0.18 }); tone(55, 0.5, { vol: 0.22, to: 38, delay: 0.25 }); buzz([120, 60, 250]); },
    win: function () { [392, 523, 659, 784].forEach(function (f, i) { tone(f, 0.5, { type: 'triangle', vol: 0.11, delay: i * 0.12 }); }); buzz([20, 40, 60]); },
    star: function (o) { tone(880 + (o ? o.i : 0) * 220, 0.22, { vol: 0.1 }); },
    drip: function (o) { tone(1500 + (o ? o.f : 0) * 900, 0.16, { vol: 0.07, to: 700, dest: mus, pan: o ? o.pan : 0 }); },
    creak: function (o) { noise(0.9, { ft: 'bandpass', freq: 220 + (o ? o.f : 0) * 200, q: 6, vol: 0.12, dest: mus, pan: o ? o.pan : 0 }); }
  };
  /* ambient bed: two detuned low oscillators through a slow filter, plus occasional distant drips and creaks */
  function startDrone() {
    const a = ctx(); if (!a || drone) return; const f = a.createBiquadFilter(), g = a.createGain(), lfo = a.createOscillator(), lg = a.createGain(), o1 = a.createOscillator(), o2 = a.createOscillator();
    f.type = 'lowpass'; f.frequency.value = 260; g.gain.value = 0.14; o1.type = 'triangle'; o2.type = 'triangle'; o1.frequency.value = 82.4; o2.frequency.value = 83.3;
    lfo.frequency.value = 0.07; lg.gain.value = 60; lfo.connect(lg); lg.connect(f.frequency); o1.connect(f); o2.connect(f); f.connect(g); g.connect(mus); o1.start(); o2.start(); lfo.start(); drone = { g };
  }
  function ambientTick(dt) {
    if (!ac || !st.music) return; dripT -= dt; creakT -= dt;
    if (dripT <= 0) { dripT = 3 + Math.random() * 6; S.drip({ f: Math.random(), pan: Math.random() * 2 - 1 }); }
    if (creakT <= 0) { creakT = 12 + Math.random() * 18; S.creak({ f: Math.random(), pan: Math.random() * 2 - 1 }); }
  }
  return {
    play: function (n, o) { if (S[n] && fresh(n)) S[n](o); },
    set: function (k, v) { st[k] = v; apply(); }, get: function () { return st; },
    unlock: function () { if (ctx()) startDrone(); },
    tick: ambientTick, buzz,
    suspend: function () { if (ac && real && ac.state === 'running') ac.suspend(); }, resume: function () { if (ac && real && ac.state !== 'running') { try { ac.resume(); } catch (e) { /* ok */ } } },
    /* tests: inject an OfflineAudioContext */
    useContext: function (a) { real = false; ac = null; voices = 0; for (const k in lastAt) delete lastAt[k]; build(a); },
    _cues: Object.keys(S)
  };
})();
