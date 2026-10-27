/* Sound effects, background music and vibration. Procedural (Web Audio) - no sound files.
 * Browsers/WebViews only allow audio after a touch, so audio starts on the first tap. */
(function (S) {
  'use strict';
  let actx = null, master = null, unlocked = false;
  const sfxOn = () => !S.save.data || S.save.data.sfx;
  const musicOn = () => !S.save.data || S.save.data.music;

  function audio() {
    if (!unlocked) return null;
    try {
      if (!actx) {
        actx = new (window.AudioContext || window.webkitAudioContext)();
        master = actx.createGain();
        master.gain.value = 0.9;
        master.connect(actx.destination);
      }
      if (actx.state === 'suspended') actx.resume();
      return actx;
    } catch (e) { return null; }
  }
  function unlock() { if (!unlocked) { unlocked = true; audio(); } }
  // One note: frequency (Hz), length (s), wave, volume, delay (s), optional glide target (Hz).
  function tone(freq, dur, type, vol, delay, slide, force) {
    if (!force && !sfxOn()) return;
    const c = audio();
    if (!c) return;
    try {
      const o = c.createOscillator(), gn = c.createGain(), t = c.currentTime + (delay || 0);
      o.type = type || 'sine';
      o.frequency.setValueAtTime(freq, t);
      if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + dur);
      gn.gain.setValueAtTime(0.0001, t);
      gn.gain.exponentialRampToValueAtTime(vol || 0.2, t + 0.01);
      gn.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(gn); gn.connect(master);
      o.start(t); o.stop(t + dur + 0.03);
    } catch (e) { /* no audio */ }
  }
  function noise(dur, vol) {
    if (!sfxOn()) return;
    const c = audio();
    if (!c) return;
    try {
      const n = Math.floor(c.sampleRate * dur), buf = c.createBuffer(1, n, c.sampleRate), d = buf.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
      const src = c.createBufferSource(), gn = c.createGain();
      src.buffer = buf; gn.gain.value = vol;
      src.connect(gn); gn.connect(master);
      src.start();
    } catch (e) { /* no audio */ }
  }
  const seq = (notes, step, wave, vol) => notes.forEach((f, i) => tone(f, 0.16, wave || 'triangle', vol || 0.22, i * step));

  const sfx = {
    click: () => tone(540, 0.05, 'triangle', 0.12),
    back: () => tone(420, 0.06, 'triangle', 0.12),
    eat: (n) => { const f = 470 + Math.min(n | 0, 8) * 38; tone(f, 0.1, 'sine', 0.3, 0, f * 1.7); },          // "pop", rises with every fruit
    grow: () => tone(300, 0.09, 'sine', 0.14, 0.05, 520),
    bonus: () => seq([784, 988, 1175, 1568], 0.07),
    key: () => { tone(988, 0.08, 'square', 0.1); tone(1319, 0.2, 'square', 0.1, 0.07); },
    door: () => { tone(220, 0.18, 'triangle', 0.18, 0, 440); tone(660, 0.14, 'triangle', 0.14, 0.12); },
    toggle: () => { tone(330, 0.07, 'square', 0.1); tone(495, 0.1, 'square', 0.1, 0.06); },
    portal: () => tone(300, 0.28, 'sine', 0.22, 0, 1200),
    exitOpen: () => seq([523, 659, 880], 0.08, 'triangle', 0.2),
    slide: () => tone(900, 0.12, 'sine', 0.06, 0, 500),
    star: (i) => tone(660 + i * 220, 0.22, 'triangle', 0.26),
    win: () => seq([523, 659, 784, 1047], 0.1, 'triangle', 0.25),
    coin: () => { tone(988, 0.08, 'square', 0.12); tone(1319, 0.22, 'square', 0.12, 0.07); },
    unlock: () => seq([523, 784, 1047, 1319], 0.08, 'triangle', 0.22),
    fail: () => tone(440, 0.5, 'triangle', 0.28, 0, 150),
    boom: () => { noise(0.5, 0.4); tone(130, 0.5, 'sawtooth', 0.28, 0, 40); },
    err: () => { tone(230, 0.13, 'square', 0.14); tone(170, 0.2, 'square', 0.14, 0.1); },
    swipe: () => tone(700, 0.03, 'sine', 0.04)
  };

  // Happy pentatonic tune, scheduled a little ahead from the game loop (no timers: nothing keeps playing after pause/exit).
  const TUNE = [
    [0, 4, 7, 9, 7, 4, 7, 4, 2, 5, 9, 12, 9, 5, 9, 5],
    [0, 4, 7, 12, 9, 7, 4, 7, 5, 9, 12, 9, 7, 4, 2, 4],
    [4, 7, 9, 7, 4, 2, 4, 0, 5, 9, 7, 5, 4, 2, 0, 2],
    [0, 7, 4, 7, 9, 7, 12, 9, 7, 4, 7, 2, 4, 0, 4, 7]
  ];
  const BASS = [0, -3, -7, -5];
  const STEP = 0.21;
  let musicNext = 0, musicStep = 0;
  // mode: 'menu' | 'play' | null (silence)
  function musicTick(mode) {
    if (!mode || !musicOn() || !unlocked) { musicNext = 0; return; }
    const c = audio();
    if (!c || c.state !== 'running') return;
    const now = c.currentTime, vol = mode === 'menu' ? 0.06 : 0.045;
    if (musicNext < now) musicNext = now + 0.05;
    while (musicNext < now + 0.3) {
      const i = musicStep & 15, bar = (musicStep >> 4) % TUNE.length, d = musicNext - now;
      tone(261.63 * Math.pow(2, TUNE[bar][i] / 12), 0.24, 'triangle', vol, d, 0, true);
      if (i % 4 === 0) tone(130.81 * Math.pow(2, BASS[i >> 2] / 12), 0.6, 'sine', vol * 1.3, d, 0, true);
      musicStep++; musicNext += STEP;
    }
  }
  function suspend() { try { if (actx && actx.state === 'running') actx.suspend(); } catch (e) { /* ignore */ } }
  function buzz(ms) { try { if (S.save.data.haptics && navigator.vibrate) navigator.vibrate(ms); } catch (e) { /* ignore */ } }

  S.audio = { sfx: sfx, tone: tone, unlock: unlock, musicTick: musicTick, suspend: suspend, buzz: buzz, count: () => 0 };
})(window.SFR);
