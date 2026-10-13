/* Tiny WebAudio synthesiser - no audio files needed. */
PB.Audio = (function () {
  let ctx = null, master = null;
  let muted = false;
  try { muted = localStorage.getItem('pinkBounceMuted') === '1'; } catch (e) { /* ignore */ }
  const last = {};

  function ensure() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      try {
        ctx = new AC();
        master = ctx.createGain();
        master.gain.value = muted ? 0 : 0.45;
        master.connect(ctx.destination);
      } catch (e) { ctx = null; return null; }
    }
    if (ctx.state === 'suspended') { try { ctx.resume(); } catch (e) { /* ignore */ } }
    return ctx;
  }

  function tone(f, f2, dur, type, vol, delay) {
    if (!ctx || muted) return;
    const t0 = ctx.currentTime + (delay || 0);
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(f, t0);
    if (f2) o.frequency.exponentialRampToValueAtTime(Math.max(20, f2), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol || 0.25, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(master);
    o.start(t0); o.stop(t0 + dur + 0.03);
  }

  function noise(dur, vol, freq) {
    if (!ctx || muted) return;
    const n = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, n, ctx.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const s = ctx.createBufferSource(); s.buffer = buf;
    const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq || 1800;
    const g = ctx.createGain(); g.gain.value = vol || 0.3;
    s.connect(f); f.connect(g); g.connect(master); s.start();
  }

  const SOUNDS = {
    paddle:  () => tone(300, 520, 0.09, 'sine', 0.3),
    wall:    () => tone(210, 160, 0.05, 'triangle', 0.14),
    hit:     (n) => tone(440 + (n || 0) * 40, 0, 0.07, 'square', 0.12),
    clank:   () => tone(150, 110, 0.09, 'sawtooth', 0.12),
    break:   (n) => { tone(520 + Math.min(n || 0, 12) * 45, 900, 0.12, 'square', 0.15); noise(0.1, 0.18, 2500); },
    launch:  () => tone(220, 660, 0.15, 'sine', 0.25),
    pickup:  () => { tone(523, 0, 0.09, 'triangle', 0.22); tone(659, 0, 0.09, 'triangle', 0.22, 0.07); tone(784, 0, 0.14, 'triangle', 0.22, 0.14); },
    life:    () => { tone(392, 0, 0.1, 'sine', 0.25); tone(523, 0, 0.1, 'sine', 0.25, 0.09); tone(784, 0, 0.1, 'sine', 0.25, 0.18); tone(1046, 0, 0.2, 'sine', 0.25, 0.27); },
    split:   () => { tone(300, 900, 0.18, 'sawtooth', 0.14); tone(450, 1200, 0.18, 'sawtooth', 0.1, 0.05); },
    shield:  () => { tone(880, 220, 0.3, 'sine', 0.3); noise(0.15, 0.15, 900); },
    lost:    () => { tone(330, 70, 0.6, 'sawtooth', 0.25); noise(0.3, 0.2, 400); },
    over:    () => { tone(260, 60, 1.0, 'sawtooth', 0.28); tone(196, 50, 1.2, 'square', 0.12, 0.12); },
    level:   () => { [523, 659, 784, 1046].forEach((f, i) => tone(f, 0, 0.18, 'triangle', 0.25, i * 0.11)); },
    pause:   () => tone(400, 300, 0.08, 'sine', 0.15),
    expire:  () => tone(500, 250, 0.15, 'triangle', 0.12)
  };

  return {
    unlock: ensure,
    isMuted: () => muted,
    setMuted(m) {
      muted = !!m;
      try { localStorage.setItem('pinkBounceMuted', muted ? '1' : '0'); } catch (e) { /* ignore */ }
      if (master) master.gain.value = muted ? 0 : 0.45;
    },
    play(name, arg, minGap) {
      if (muted || !ctx) return;
      const now = performance.now(), gap = minGap === undefined ? 25 : minGap;
      if (last[name] && now - last[name] < gap) return;
      last[name] = now;
      const fn = SOUNDS[name];
      if (fn) { try { fn(arg); } catch (e) { /* never let audio break the game */ } }
    }
  };
})();
