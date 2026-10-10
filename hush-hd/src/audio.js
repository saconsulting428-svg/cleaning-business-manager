/* HUSH HD - synthesised audio (no sound files).
   Signal path: voices -> effects / ambience buses -> low-pass -> compressor -> tanh soft clipper -> master, plus a shared concrete-hall reverb
   (procedural impulse response) that every voice can send to. The soft clipper bounds the output, so dense moments get denser, never harsher.
   World sounds carry distance (v), pan and wetness; continuous layers (ventilation, electrical hum, tension, generator) follow scene().
   The context is injectable (useContext) so tests can render offline and measure. */
const Sound = (function () {
  'use strict';
  let ac = null, sfx = null, mus = null, revIn = null, nbuf = null, voices = 0, loops = null, started = false, real = true;
  const st = { sound: true, music: true, vibe: true, vol: 0.8, mvol: 0.6 };
  const MAX_VOICES = 34;
  const amb = { drip: 2, creak: 7, knock: 14, thump: 20, groan: 11, breath: 6 };

  /* ---------- graph ---------- */
  function build(a) {
    ac = a; sfx = ac.createGain(); mus = ac.createGain(); revIn = ac.createGain(); revIn.gain.value = 1;
    const lp = ac.createBiquadFilter(), cmp = ac.createDynamicsCompressor(), clip = ac.createWaveShaper(), out = ac.createGain(), rev = ac.createConvolver(), revOut = ac.createGain();
    lp.type = 'lowpass'; lp.frequency.value = 9000; lp.Q.value = 0.5;
    cmp.threshold.value = -18; cmp.knee.value = 20; cmp.ratio.value = 6; cmp.attack.value = 0.003; cmp.release.value = 0.2;
    const N = 2048, curve = new Float32Array(N); for (let i = 0; i < N; i++) { const x = i / (N - 1) * 2 - 1; curve[i] = Math.tanh(x * 1.6) / Math.tanh(1.6); }
    clip.curve = curve; clip.oversample = '2x'; out.gain.value = 0.86;
    let seed = 777; const rnd = function () { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
    const len = Math.floor(ac.sampleRate * 2.6), ir = ac.createBuffer(2, len, ac.sampleRate);               // concrete hall: dense decaying noise, darker as it fades
    for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); let y = 0; for (let i = 0; i < len; i++) { const t = i / len, k = 0.55 - 0.42 * t; y += ((rnd() * 2 - 1) - y) * k; d[i] = y * Math.pow(1 - t, 2.4) * (i < 400 ? i / 400 : 1); } }
    rev.buffer = ir; revOut.gain.value = 0.55;
    sfx.connect(lp); mus.connect(lp); revIn.connect(rev); rev.connect(revOut); revOut.connect(lp); lp.connect(cmp); cmp.connect(clip); clip.connect(out); out.connect(ac.destination);
    nbuf = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate); const d = nbuf.getChannelData(0); let s2 = 12345; for (let i = 0; i < d.length; i++) { s2 = (s2 * 1664525 + 1013904223) >>> 0; d[i] = s2 / 2147483648 - 1; }
    apply();
  }
  function ctx() {
    if (!ac) { const C = window.AudioContext || window.webkitAudioContext; if (!C) return null; try { build(new C()); } catch (e) { return null; } }
    if (real && (ac.state === 'suspended' || ac.state === 'interrupted')) { try { ac.resume(); } catch (e) { /* needs a gesture */ } }
    return ac;
  }
  function apply() { if (!ac) return; sfx.gain.value = st.sound ? st.vol * 1.35 : 0; mus.gain.value = st.music ? st.mvol * 0.55 : 0; }
  const end = function (src) { voices++; src.onended = function () { voices--; }; };
  function route(g, o) {                                                   // pan, dry destination, reverb send
    let out = g;
    if (o.pan !== undefined && ac.createStereoPanner) { const p = ac.createStereoPanner(); p.pan.value = Math.max(-1, Math.min(1, o.pan)); g.connect(p); out = p; }
    out.connect(o.dest || sfx);
    if (o.wet) { const s = ac.createGain(); s.gain.value = o.wet; out.connect(s); s.connect(revIn); }
  }

  /* ---------- voices ---------- */
  function tone(f, dur, o) {
    const a = ctx(); if (!a || !st.sound || voices > MAX_VOICES) return; o = o || {};
    const t = a.currentTime + (o.delay || 0), osc = a.createOscillator(), g = a.createGain();
    osc.type = o.type || 'sine'; osc.frequency.setValueAtTime(f, t); if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, t + dur);
    const soft = osc.type === 'square' || osc.type === 'sawtooth', vol = (o.vol || 0.15) * (soft ? 0.7 : 1), att = Math.max(0.004, o.att || 0.012);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + att); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    if (soft) { const tf = a.createBiquadFilter(); tf.type = 'lowpass'; tf.frequency.value = o.lp || Math.min(2400, Math.max(400, f * 5)); osc.connect(tf); tf.connect(g); } else osc.connect(g);
    if (o.vib) { const l = a.createOscillator(), lg = a.createGain(); l.frequency.value = o.vib[0]; lg.gain.value = o.vib[1]; l.connect(lg); lg.connect(osc.frequency); l.start(t); l.stop(t + dur + 0.05); }
    route(g, o); end(osc); osc.start(t); osc.stop(t + dur + 0.05);
  }
  function noise(dur, o) {
    const a = ctx(); if (!a || !st.sound || voices > MAX_VOICES) return; o = o || {};
    const t = a.currentTime + (o.delay || 0), src = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain();
    src.buffer = nbuf; src.loop = true; f.type = o.ft || 'lowpass'; f.frequency.setValueAtTime(o.freq || 800, t); if (o.fto) f.frequency.exponentialRampToValueAtTime(o.fto, t + dur); f.Q.value = o.q || 0.7;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(o.vol || 0.15, t + Math.max(0.004, o.att || 0.012)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(g); route(g, o); end(src); src.start(t, ((o.delay || 0) * 7.13 + (o.off || 0)) % 1.5); src.stop(t + dur + 0.05);
  }
  function buzz(p) { if (!st.vibe || !real) return; try { const H = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Haptics; if (H && typeof p === 'number') { H.vibrate({ duration: p }); return; } if (navigator.vibrate) navigator.vibrate(p); } catch (e) { /* no haptics */ } }

  /* a cue fired again within a few hundredths of a second only adds loudness, so it is dropped */
  const lastAt = {}, GAP = { cstep: 0.1, step: 0.09, glass: 0.09, heart: 0.25, ui: 0.05, genPulse: 0.2, radioPulse: 0.2, growl: 0.8, roar: 1.0, drip: 0.4, breath: 1.5, creak: 1, groan: 2, knock: 1, thump: 1 };
  function fresh(n) { if (!ac) return true; const t = ac.currentTime, g = GAP[n] === undefined ? 0.06 : GAP[n]; if (lastAt[n] !== undefined && t - lastAt[n] < g) return false; lastAt[n] = t; return true; }
  const rr = function (k) { return 1 + (Math.random() - 0.5) * 2 * k; };

  /* ---------- creature voices ---------- */
  function growl(v, pan, kind) {
    const f0 = kind === 'listener' ? 78 : kind === 'sentinel' ? 52 : 62, d = 1.5, o = { pan, wet: 0.35 };
    tone(f0, d, Object.assign({ type: 'sawtooth', vol: 0.14 * v, to: f0 * 0.76, att: 0.18, lp: 360, vib: [kind === 'listener' ? 31 : 23, f0 * 0.14] }, o));
    tone(f0 * 2.01, d * 0.8, Object.assign({ type: 'sawtooth', vol: 0.05 * v, to: f0 * 1.5, att: 0.25, lp: 700, vib: [17, f0 * 0.3] }, o));
    noise(d, Object.assign({ ft: 'bandpass', freq: 260, fto: 520, q: 1.8, vol: 0.1 * v, att: 0.22 }, o)); noise(d * 0.9, Object.assign({ ft: 'bandpass', freq: 900, fto: 650, q: 2.2, vol: 0.05 * v, att: 0.3 }, o));
  }
  function roar(v, pan, kind) {
    const f0 = kind === 'listener' ? 105 : kind === 'sentinel' ? 70 : 88, o = { pan, wet: 0.5 };
    tone(f0, 1.6, Object.assign({ type: 'sawtooth', vol: 0.2 * v, to: f0 * 0.5, att: 0.06, lp: 900, vib: [34, f0 * 0.2] }, o));
    tone(f0 * 1.51, 1.4, Object.assign({ type: 'sawtooth', vol: 0.09 * v, to: f0 * 0.8, att: 0.08, lp: 1500, vib: [29, f0 * 0.3] }, o));
    tone(f0 * 0.5, 1.4, Object.assign({ vol: 0.16 * v, to: f0 * 0.32, att: 0.05 }, o));
    noise(1.5, Object.assign({ ft: 'bandpass', freq: 1500, fto: 500, q: 1.1, vol: 0.13 * v, att: 0.05 }, o)); noise(0.5, Object.assign({ ft: 'highpass', freq: 3200, vol: 0.05 * v, att: 0.02 }, o));
  }
  function breath(v, pan) { const o = { pan, wet: 0.3 }; noise(0.9, Object.assign({ ft: 'bandpass', freq: 420, fto: 700, q: 1.3, vol: 0.06 * v, att: 0.35 }, o)); noise(1.0, Object.assign({ ft: 'bandpass', freq: 650, fto: 380, q: 1.3, vol: 0.05 * v, att: 0.15, delay: 1.0 }, o)); tone(58, 1.4, Object.assign({ type: 'sawtooth', vol: 0.035 * v, att: 0.4, lp: 220 }, o)); }

  const S = {
    ui: function () { noise(0.03, { ft: 'bandpass', freq: 2600, q: 2, vol: 0.05 }); tone(430, 0.07, { type: 'triangle', vol: 0.05, to: 520 }); },
    /* boots on concrete: heel thud, sole scuff, a tick of grit */
    step: function (o) { o = o || {}; const c = o.crouch, v = (c ? 0.42 : o.run ? 1.7 : 1.35) * (o.v || 1), r = rr(0.1), w = { wet: c ? 0.12 : 0.22 };
      tone(96 * r, 0.1, Object.assign({ vol: 0.09 * v, to: 52 }, w)); noise(0.07, Object.assign({ ft: 'bandpass', freq: (c ? 520 : 780) * r, q: 0.9, vol: 0.085 * v, att: 0.006 }, w));
      noise(0.05, Object.assign({ ft: 'highpass', freq: 2400 * r, vol: 0.018 * v, att: 0.004, delay: 0.012 }, w)); noise(0.09, Object.assign({ ft: 'lowpass', freq: 240, vol: 0.05 * v, att: 0.01, delay: 0.035 }, w)); },
    glass: function (o) { const c = o && o.crouch, v = c ? 0.3 : 1, w = { wet: 0.25 }; for (let i = 0; i < (c ? 3 : 6); i++) noise(0.05 + Math.random() * 0.05, Object.assign({ ft: 'highpass', freq: 2800 + Math.random() * 3200, vol: 0.07 * v, att: 0.002, delay: i * 0.018 + Math.random() * 0.01 }, w)); noise(0.1, Object.assign({ ft: 'bandpass', freq: 3400, q: 1.2, vol: 0.09 * v }, w)); tone(3300 + Math.random() * 900, 0.08, Object.assign({ vol: 0.025 * v }, w)); },
    /* sonar: a hard high ping with a long ringing tail, a pressure thump beneath it and two filtered echoes */
    ping: function () { const w = { wet: 0.9 };
      tone(1640, 1.6, Object.assign({ vol: 0.2, att: 0.003 }, w)); tone(2460, 0.9, Object.assign({ vol: 0.06, att: 0.003 }, w)); tone(820, 1.2, Object.assign({ vol: 0.05, att: 0.003 }, w));
      tone(72, 0.7, { vol: 0.28, to: 36, att: 0.004, wet: 0.5 }); noise(0.25, Object.assign({ ft: 'bandpass', freq: 3000, q: 4, vol: 0.05, att: 0.002 }, w));
      tone(1640, 1.0, Object.assign({ vol: 0.07, att: 0.004, delay: 0.42 }, w)); tone(1640, 0.9, Object.assign({ vol: 0.035, att: 0.004, delay: 0.88 }, w)); buzz(25); },
    /* sliding steel door: servo whine, rail rumble, a clunk when it stops */
    door: function () { const w = { wet: 0.3 }; tone(120, 0.45, Object.assign({ type: 'sawtooth', vol: 0.05, to: 230, lp: 600, att: 0.08 }, w)); noise(0.5, Object.assign({ ft: 'bandpass', freq: 380, fto: 900, q: 1.2, vol: 0.12, att: 0.06 }, w)); tone(64, 0.3, Object.assign({ vol: 0.2, to: 40, delay: 0.46 }, w)); noise(0.12, Object.assign({ ft: 'bandpass', freq: 1500, q: 1.5, vol: 0.1, delay: 0.46 }, w)); buzz(15); },
    unlock: function () { const w = { wet: 0.25 }; noise(0.02, Object.assign({ ft: 'highpass', freq: 3000, vol: 0.1 }, w)); tone(1900, 0.06, Object.assign({ type: 'square', vol: 0.05, delay: 0.03 }, w)); tone(2500, 0.1, Object.assign({ type: 'square', vol: 0.05, delay: 0.12 }, w)); tone(90, 0.12, Object.assign({ vol: 0.15, to: 55, delay: 0.24 }, w)); noise(0.1, Object.assign({ ft: 'bandpass', freq: 1200, q: 2, vol: 0.09, delay: 0.24 }, w)); },
    denied: function () { tone(150, 0.2, { type: 'square', vol: 0.07, lp: 500 }); tone(140, 0.2, { type: 'square', vol: 0.07, lp: 500, delay: 0.26 }); buzz(30); },
    key: function () { noise(0.05, { ft: 'highpass', freq: 3500, vol: 0.07 }); tone(1480, 0.12, { vol: 0.07, wet: 0.5, delay: 0.03 }); tone(1976, 0.3, { vol: 0.06, wet: 0.6, delay: 0.1 }); buzz(12); },
    /* metal locker: door clang with a body resonance, then a muffled thud */
    hide: function () { const w = { wet: 0.35 }; noise(0.14, Object.assign({ ft: 'bandpass', freq: 700, q: 1.5, vol: 0.14 }, w)); tone(210, 0.35, Object.assign({ vol: 0.09, to: 190 }, w)); tone(560, 0.25, Object.assign({ vol: 0.04, to: 520 }, w)); tone(75, 0.15, { vol: 0.12, to: 45, delay: 0.02 }); },
    stairs: function () { const w = { wet: 0.4 }; [0, 0.13, 0.26, 0.4].forEach(function (d, i) { noise(0.12, Object.assign({ ft: 'bandpass', freq: 1100 + i * 90, q: 3, vol: 0.09, delay: d }, w)); tone(160 + i * 12, 0.1, Object.assign({ vol: 0.06, to: 120, delay: d }, w)); }); },
    vent: function () { const w = { wet: 0.5 }; noise(1.1, Object.assign({ ft: 'bandpass', freq: 500, fto: 900, q: 3, vol: 0.08, att: 0.1 }, w)); [0.15, 0.55, 0.95].forEach(function (d) { noise(0.07, Object.assign({ ft: 'bandpass', freq: 800, q: 4, vol: 0.06, delay: d }, w)); tone(190, 0.1, Object.assign({ vol: 0.06, to: 130, delay: d }, w)); }); noise(0.5, Object.assign({ ft: 'highpass', freq: 2500, vol: 0.03, delay: 0.3 }, w)); },
    /* generator start: starter whine, three sputters, then it catches */
    gen: function () { const w = { wet: 0.35 }; tone(90, 0.7, Object.assign({ type: 'sawtooth', vol: 0.06, to: 260, lp: 700, att: 0.1 }, w)); [0.55, 0.78, 0.95].forEach(function (d) { tone(70, 0.12, Object.assign({ type: 'sawtooth', vol: 0.12, to: 50, lp: 300, delay: d }, w)); noise(0.1, Object.assign({ ft: 'lowpass', freq: 400, vol: 0.12, delay: d }, w)); }); tone(38, 1.4, Object.assign({ type: 'sawtooth', vol: 0.17, to: 52, lp: 260, att: 0.2, delay: 1.0 }, w)); noise(1.2, Object.assign({ freq: 220, fto: 700, vol: 0.1, att: 0.3, delay: 1.0 }, w)); buzz([40, 30, 40]); },
    genPulse: function (o) { const v = o ? o.v : 1, w = { wet: 0.3, pan: o && o.pan }; tone(46, 0.55, Object.assign({ type: 'sawtooth', vol: 0.13 * v, lp: 240 }, w)); noise(0.45, Object.assign({ freq: 420, vol: 0.06 * v }, w)); },
    radio: function () { noise(0.03, { ft: 'highpass', freq: 2800, vol: 0.07 }); tone(660, 0.07, { type: 'square', vol: 0.04, lp: 1500, delay: 0.02 }); },
    /* intercom call: two-tone chime through static */
    radioPulse: function (o) { const v = o ? o.v : 1, w = { pan: o ? o.pan : 0, wet: 0.45 }; noise(0.55, Object.assign({ ft: 'bandpass', freq: 1900, q: 1.6, vol: 0.12 * v, att: 0.02 }, w)); tone(784, 0.28, Object.assign({ type: 'triangle', vol: 0.09 * v, lp: 2500 }, w)); tone(587, 0.34, Object.assign({ type: 'triangle', vol: 0.09 * v, lp: 2500, delay: 0.3 }, w)); noise(0.2, Object.assign({ ft: 'bandpass', freq: 3200, q: 3, vol: 0.05 * v, delay: 0.6 }, w)); },
    /* creature footfall: weight first, claws after; farther away it loses its top end */
    cstep: function (o) { const v = o.v, far = 1 - Math.min(1, v), w = { pan: o.pan, wet: 0.3 + 0.3 * far }, lpf = 1500 - 1000 * far;
      tone(80 * rr(0.06), 0.28, Object.assign({ vol: 0.34 * v, to: 42 }, w)); noise(0.1, Object.assign({ freq: 200, vol: 0.2 * v }, w)); noise(0.06, Object.assign({ ft: 'bandpass', freq: Math.max(900, lpf), q: 2.5, vol: 0.06 * v, delay: 0.025 }, w)); },
    heart: function (o) { tone(66, 0.16, { vol: 0.24 * o.v, to: 44, att: 0.01 }); tone(60, 0.18, { vol: 0.17 * o.v, to: 40, delay: 0.17, att: 0.01 }); },
    heard: function () { noise(0.7, { ft: 'bandpass', freq: 260, fto: 140, q: 1.2, vol: 0.12, att: 0.3, wet: 0.5 }); tone(52, 0.7, { vol: 0.1, att: 0.25, to: 44, wet: 0.4 }); },
    notice: function () { tone(110, 0.35, { type: 'sawtooth', vol: 0.05, to: 150, lp: 400, att: 0.12, wet: 0.4 }); },
    growl: function (o) { growl(o ? o.v : 1, o ? o.pan : 0, o && o.kind); },
    roar: function (o) { roar(o ? o.v : 1, o ? o.pan : 0, o && o.kind); },
    breath: function (o) { breath(o ? o.v : 1, o ? o.pan : 0); },
    /* detection: roar and a short low stinger */
    hunt: function () { tone(55, 1.2, { type: 'sawtooth', vol: 0.12, to: 48, lp: 240, att: 0.04, wet: 0.5 }); tone(82, 1.0, { type: 'sawtooth', vol: 0.05, to: 74, lp: 330, att: 0.1, wet: 0.5 }); noise(0.5, { ft: 'bandpass', freq: 1800, q: 1, vol: 0.05, wet: 0.5 }); buzz([60, 40, 120]); },
    lost: function () { noise(1.0, { ft: 'bandpass', freq: 220, fto: 120, q: 1, vol: 0.08, att: 0.4, wet: 0.6 }); tone(70, 0.9, { vol: 0.06, to: 50, att: 0.3, wet: 0.5 }); },
    /* caught: the survivor's gasp, the creature's roar, a heavy impact, then a low ring */
    caught: function () { const w = { wet: 0.5 }; noise(0.35, Object.assign({ ft: 'bandpass', freq: 900, fto: 1500, q: 2, vol: 0.14, att: 0.02 }, w)); tone(330, 0.5, Object.assign({ type: 'sawtooth', vol: 0.06, to: 520, lp: 1400, att: 0.04 }, w)); roar(1, 0, 'stalker');
      tone(48, 0.7, { vol: 0.34, to: 28, att: 0.005, delay: 0.3, wet: 0.4 }); noise(0.3, { freq: 700, fto: 90, vol: 0.2, delay: 0.3, wet: 0.5 }); tone(95, 1.6, { vol: 0.05, att: 0.4, delay: 0.5, wet: 0.8 }); buzz([120, 60, 250]); },
    win: function () { const w = { wet: 0.7 }; noise(0.7, Object.assign({ freq: 300, fto: 80, vol: 0.12, att: 0.1 }, w)); [196, 247, 294].forEach(function (f, i) { tone(f, 1.8, Object.assign({ type: 'triangle', vol: 0.08, att: 0.25, lp: 1200, delay: 0.25 + i * 0.12 }, w)); }); buzz([20, 40, 60]); },
    star: function (o) { tone(784 + (o ? o.i : 0) * 196, 0.7, { vol: 0.07, att: 0.006, wet: 0.7 }); },
    drip: function (o) { tone(1400 + (o ? o.f : 0) * 800, 0.12, { vol: 0.06, to: 620, dest: mus, pan: o ? o.pan : 0, wet: 0.85, att: 0.003 }); },
    creak: function (o) { noise(1.1, { ft: 'bandpass', freq: 200 + (o ? o.f : 0) * 220, fto: 160, q: 7, vol: 0.1, att: 0.3, dest: mus, pan: o ? o.pan : 0, wet: 0.6 }); },
    groan: function (o) { tone(78, 2.2, { vol: 0.07, to: 58, att: 0.8, dest: mus, pan: o ? o.pan : 0, wet: 0.8, vib: [0.4, 2] }); noise(2.2, { ft: 'bandpass', freq: 150, q: 3, vol: 0.05, att: 0.8, dest: mus, wet: 0.6 }); },
    knock: function (o) { const p = o ? o.pan : 0; tone(150, 0.2, { vol: 0.1, to: 90, dest: mus, pan: p, wet: 0.9 }); noise(0.06, { ft: 'bandpass', freq: 600, q: 3, vol: 0.08, dest: mus, pan: p, wet: 0.9 }); tone(150, 0.2, { vol: 0.07, to: 90, dest: mus, pan: p, wet: 0.9, delay: 0.5 }); },
    thump: function (o) { tone(50, 0.9, { vol: 0.14, to: 32, att: 0.02, dest: mus, pan: o ? o.pan : 0, wet: 0.9 }); noise(0.6, { freq: 160, fto: 70, vol: 0.06, dest: mus, wet: 0.8 }); }
  };

  /* ---------- continuous layers ---------- */
  function startLoops() {
    const a = ctx(); if (!a || started) return; started = true;
    const L = loops = {}, src = function () { const s = a.createBufferSource(); s.buffer = nbuf; s.loop = true; return s; };
    const bus = function (dest, v) { const g = a.createGain(); g.gain.value = v; g.connect(dest); return g; };
    /* ventilation bed: broad low noise with a slow breathing swell */
    const n1 = src(), f1 = a.createBiquadFilter(), f2 = a.createBiquadFilter(); f1.type = 'bandpass'; f1.frequency.value = 170; f1.Q.value = 0.5; f2.type = 'lowpass'; f2.frequency.value = 420;
    L.vent = bus(mus, 0.0); n1.connect(f1); f1.connect(f2); f2.connect(L.vent); n1.start(0, 0.3);
    const sw = a.createOscillator(), sg = a.createGain(); sw.frequency.value = 0.045; sg.gain.value = 0.35; sw.connect(sg); sg.connect(L.vent.gain); sw.start();
    /* electrical mains hum: 50 Hz and its harmonics, a touch of beating */
    L.hum = bus(mus, 0.0); [[50, 'sine', 0.55], [100.4, 'triangle', 0.25], [150.2, 'sine', 0.12], [250, 'sine', 0.04]].forEach(function (h) { const o = a.createOscillator(), g = a.createGain(); o.type = h[1]; o.frequency.value = h[0]; g.gain.value = h[2]; o.connect(g); g.connect(L.hum); o.start(); });
    /* deep room tone */
    L.drone = bus(mus, 0.0); const lf = a.createBiquadFilter(); lf.type = 'lowpass'; lf.frequency.value = 150; lf.connect(L.drone); [55, 55.8, 82.6].forEach(function (f, i) { const o = a.createOscillator(), g = a.createGain(); o.type = 'triangle'; o.frequency.value = f; g.gain.value = i < 2 ? 0.5 : 0.18; o.connect(g); g.connect(lf); o.start(); });
    /* tension: two low saws a tritone apart, brightening and speeding up with danger */
    L.tens = bus(mus, 0.0); const tf = a.createBiquadFilter(); tf.type = 'lowpass'; tf.frequency.value = 180; tf.Q.value = 3; tf.connect(L.tens); L.tensF = tf;
    [[46.2, 0], [65.4, 0.6], [92.4, 0.1]].forEach(function (h) { const o = a.createOscillator(), g = a.createGain(); o.type = 'sawtooth'; o.frequency.value = h[0]; g.gain.value = h[1] || 0.5; o.connect(g); g.connect(tf); o.start(); });
    const tl = a.createOscillator(), tg = a.createGain(); tl.frequency.value = 0.3; tg.gain.value = 60; tl.connect(tg); tg.connect(tf.frequency); tl.start(); L.tensLfo = tl;
    /* generator running (spatial) */
    L.gen = bus(sfx, 0.0); L.genPan = a.createStereoPanner ? a.createStereoPanner() : null; const gl = a.createBiquadFilter(); gl.type = 'lowpass'; gl.frequency.value = 220;
    const go = a.createOscillator(), gg = a.createGain(); go.type = 'sawtooth'; go.frequency.value = 48; gg.gain.value = 0.5; go.connect(gg); gg.connect(gl);
    const go2 = a.createOscillator(), gg2 = a.createGain(); go2.type = 'square'; go2.frequency.value = 96.5; gg2.gain.value = 0.12; go2.connect(gg2); gg2.connect(gl); go.start(); go2.start();
    const gn = src(), gnf = a.createBiquadFilter(), gng = a.createGain(); gnf.type = 'lowpass'; gnf.frequency.value = 300; gng.gain.value = 0.35; gn.connect(gnf); gnf.connect(gng); gng.connect(gl); gn.start(0, 0.7);
    const gt = a.createOscillator(), gtg = a.createGain(); gt.frequency.value = 11; gtg.gain.value = 0.3; gt.connect(gtg); gtg.connect(gg.gain); gt.start();
    if (L.genPan) { gl.connect(L.genPan); L.genPan.connect(L.gen); } else gl.connect(L.gen);
  }
  const target = function (p, v, tc) { if (p && ac) p.setTargetAtTime(v, ac.currentTime, tc || 0.25); };
  /* scene: what the world sounds like right now. Called every tick; everything moves smoothly toward it. */
  function scene(o) {
    if (!ac || !loops) return; const L = loops, chap = o.chapter || 0, inGame = !o.menu, k = o.paused ? 0.35 : 1;
    target(L.vent.gain, (inGame ? 0.05 + 0.01 * chap : 0.025) * k); target(L.hum.gain, (inGame ? 0.032 + 0.008 * chap : 0.02) * k); target(L.drone.gain, (inGame ? 0.07 + 0.015 * chap : 0.05) * k);
    const th = Math.max(0, Math.min(1, o.threat || 0)), tg = (o.hunted ? 0.11 : 0.1 * th * th) * k;
    target(L.tens.gain, inGame ? tg : 0, 0.4); target(L.tensF.frequency, 160 + 420 * (o.hunted ? 1 : th), 0.5); if (L.tensLfo) target(L.tensLfo.frequency, o.hunted ? 2.4 : 0.3 + th * 1.2, 0.5);
    target(L.gen.gain, inGame ? (o.gen || 0) * 0.34 * k : 0, 0.3); if (L.genPan) target(L.genPan.pan, o.genPan || 0, 0.2);
  }
  /* distant sounds of the facility that make the dark feel inhabited; chapter 3 is the worst */
  const ambT = {};
  function ambientTick(dt, chapter, quiet) {
    if (!ac || !st.music || quiet) return; chapter = chapter || 0;
    for (const k in amb) { if (ambT[k] === undefined) ambT[k] = amb[k] * (0.4 + Math.random()); ambT[k] -= dt; if (ambT[k] > 0) continue;
      const mean = amb[k] * (k === 'drip' ? 1 : k === 'knock' ? 1.6 - 0.3 * chapter : k === 'thump' ? 1.4 - 0.25 * chapter : 1 - 0.1 * chapter); ambT[k] = mean * (0.6 + Math.random() * 0.8);
      if (k === 'knock' && chapter < 1) continue; if (k === 'thump' && chapter < 2) continue; if (k === 'groan' && chapter < 1) continue;
      S[k]({ f: Math.random(), pan: Math.random() * 2 - 1 }); }
  }
  return {
    play: function (n, o) { if (S[n] && fresh(n)) S[n](o); },
    set: function (k, v) { st[k] = v; apply(); }, get: function () { return st; },
    unlock: function () { if (ctx()) startLoops(); },
    scene, tick: ambientTick, buzz,
    /* the ping briefly pulls the ambience down so the information it carries is heard */
    duck: function () { if (!ac) return; const g = mus.gain, t = ac.currentTime, v = st.music ? st.mvol * 0.55 : 0; g.cancelScheduledValues(t); g.setValueAtTime(g.value, t); g.linearRampToValueAtTime(v * 0.45, t + 0.04); g.linearRampToValueAtTime(v, t + 1.1); },
    suspend: function () { if (ac && real && ac.state === 'running') ac.suspend(); }, resume: function () { if (ac && real && ac.state !== 'running') { try { ac.resume(); } catch (e) { /* ok */ } } },
    useContext: function (a) { real = false; ac = null; voices = 0; started = false; loops = null; for (const k in lastAt) delete lastAt[k]; for (const k in ambT) delete ambT[k]; build(a); },
    _cues: Object.keys(S)
  };
})();
