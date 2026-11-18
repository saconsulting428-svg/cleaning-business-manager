/* ============================================================
   audio.js — Web Audio synth: sound effects + generative music.
   No audio files needed. Sound and music have separate toggles.
   ============================================================ */
(function () {
  'use strict';
  const G = window.G;
  let ac = null, master, sfxG, musG, timer = null, step = 0, nextT = 0, shift = 1;
  const last = {};
  const st = () => G.Storage.data.settings;
  const A = (G.Audio = {
    init() {
      if (!ac) {
        const C = window.AudioContext || window.webkitAudioContext; if (!C) return;
        ac = new C(); master = ac.createGain(); master.gain.value = 0.9; master.connect(ac.destination);
        sfxG = ac.createGain(); sfxG.connect(master);
        musG = ac.createGain(); musG.gain.value = 0.45; musG.connect(master);
      }
      if (ac.state === 'suspended') ac.resume();
      this.applyMusic();
    },
    ok(k, ms) { const n = performance.now(); if (n - (last[k] || 0) < ms) return false; last[k] = n; return true; },
    tone(f1, f2, dur, type, vol, delay, dest) {
      if (!st().sound || !ac) return;
      const t = ac.currentTime + (delay || 0), o = ac.createOscillator(), g = ac.createGain();
      o.type = type || 'sine'; o.frequency.setValueAtTime(f1, t);
      if (f2 !== f1) o.frequency.exponentialRampToValueAtTime(Math.max(20, f2), t + dur);
      g.gain.setValueAtTime(vol || 0.12, t); g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
      o.connect(g); g.connect(dest || sfxG); o.start(t); o.stop(t + dur + 0.03);
    },
    noise(dur, vol, freq) {
      if (!st().sound || !ac) return;
      const n = Math.floor(ac.sampleRate * dur), b = ac.createBuffer(1, n, ac.sampleRate), d = b.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
      const s = ac.createBufferSource(); s.buffer = b;
      const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = freq;
      const g = ac.createGain(); g.gain.value = vol; s.connect(f); f.connect(g); g.connect(sfxG); s.start();
    },
    // ---- sound effects ----
    bonk(mass) { if (!this.ok('bonk', 55)) return; const m = Math.min(mass || 1, 3); this.tone(240 - m * 30, 90, 0.11, 'sine', 0.2); this.tone(520, 200, 0.05, 'triangle', 0.07); },
    coin(c) { if (!this.ok('coin', 30)) return; const f = 880 * Math.pow(2, Math.min(c, 9) / 12); this.tone(f, f * 1.5, 0.1, 'square', 0.05); this.tone(f * 2, f * 2, 0.08, 'sine', 0.06, 0.04); },
    hurt() { this.tone(260, 55, 0.4, 'sawtooth', 0.2); this.noise(0.28, 0.2, 900); },
    boom() { if (!this.ok('boom', 40)) return; this.noise(0.22, 0.17, 2200); this.tone(200, 50, 0.16, 'square', 0.06); },
    gun() { if (!this.ok('gun', 70)) return; this.tone(900, 420, 0.06, 'square', 0.035); },
    power() { [520, 660, 880].forEach((f, i) => this.tone(f, f * 1.2, 0.14, 'triangle', 0.1, i * 0.06)); },
    dash() { this.noise(0.45, 0.14, 3000); this.tone(200, 900, 0.4, 'sawtooth', 0.07); },
    ability() { this.tone(400, 800, 0.2, 'sine', 0.12); this.tone(600, 1200, 0.2, 'triangle', 0.06, 0.05); },
    zone() { [392, 523, 659, 784].forEach((f, i) => this.tone(f, f, 0.5, 'sine', 0.09, i * 0.1)); },
    mile() { [659, 784, 988, 1319].forEach((f, i) => this.tone(f, f, 0.22, 'triangle', 0.09, i * 0.07)); },
    revive() { this.tone(200, 900, 0.5, 'sine', 0.14); this.tone(400, 1800, 0.5, 'triangle', 0.07, 0.1); },
    unlock() { [523, 659, 784, 1046, 1318].forEach((f, i) => this.tone(f, f, 0.25, 'triangle', 0.1, i * 0.08)); },
    click() { this.tone(520, 780, 0.07, 'sine', 0.08); },
    over() { this.tone(330, 110, 0.7, 'sawtooth', 0.12); this.noise(0.5, 0.1, 800); },
    tick() { this.tone(900, 900, 0.04, 'square', 0.04); },

    // ---- generative ambient music (pad + arpeggio), key changes with the zone ----
    applyMusic() {
      if (!ac) return;
      if (st().music && !timer) { nextT = ac.currentTime + 0.15; step = 0; timer = setInterval(() => this.sched(), 120); }
      else if (!st().music && timer) { clearInterval(timer); timer = null; }
    },
    setZone(n) { shift = Math.pow(2, (n % 6 - 2) / 12); },
    sched() {
      if (!ac) return;
      while (nextT < ac.currentTime + 0.45) { this.mstep(step, nextT); step++; nextT += 0.29; }
    },
    mstep(s, t) {
      if (G.paused) return;
      const roots = [220, 174.61, 261.63, 196], root = roots[(s >> 4) & 3] * shift, k = s & 15;
      if (k === 0) [1, 1.189, 1.498].forEach(m => this.mnote(root * m * 0.5, t, 4.4, 'sine', 0.05, 1.2));
      const pat = [0, 2, 1, 3, 2, 1, 3, 2, 0, 2, 1, 3, 2, 3, 1, 2], tones = [2, 2.378, 3, 4];
      if (k % 2 === 0 || k > 11) this.mnote(root * tones[pat[k] % 4], t, 0.38, 'triangle', 0.028, 0.005);
    },
    mnote(f, t, dur, type, vol, atk) {
      const o = ac.createOscillator(), g = ac.createGain();
      o.type = type; o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + atk); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(musG); o.start(t); o.stop(t + dur + 0.05);
    },
    suspend() { if (ac && ac.state === 'running') ac.suspend(); },
    resume() { if (ac && ac.state === 'suspended') ac.resume(); }
  });
  document.addEventListener('visibilitychange', () => { document.hidden ? A.suspend() : A.resume(); });
})();
