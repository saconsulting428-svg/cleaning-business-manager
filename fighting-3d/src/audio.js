/* Synthesised sound effects + adaptive music (no external assets). */
let AC = null, master, musicG, noiseBuf, vol = { sfx: .8, music: .5 }, mStep = 0, mNext = 0, mOn = true, intensity = 0;
export function setVolume(s, m) { vol.sfx = s; vol.music = m; if (master) { master.gain.value = s; musicG.gain.value = m * .3; } }
export function initAudio() {
  if (AC) { if (AC.state === 'suspended') AC.resume(); return; }
  try {
    AC = new (window.AudioContext || window.webkitAudioContext)();
    const comp = AC.createDynamicsCompressor(); comp.connect(AC.destination);
    master = AC.createGain(); master.gain.value = vol.sfx; master.connect(comp);
    musicG = AC.createGain(); musicG.gain.value = vol.music * .3; musicG.connect(comp);
    noiseBuf = AC.createBuffer(1, AC.sampleRate, AC.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    setInterval(sched, 30);
  } catch (e) { AC = null; }
}
function tone(f, dur, type = 'sine', v = .3, slide = 0, dest, when = 0) {
  if (!AC) return; const t = AC.currentTime + when, o = AC.createOscillator(), g = AC.createGain(); o.type = type; o.frequency.setValueAtTime(f, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, f + slide), t + dur); g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(.001, t + dur);
  o.connect(g); g.connect(dest || master); o.start(t); o.stop(t + dur + .03);
}
function noise(dur, v = .3, fq = 1000, q = 1, type = 'lowpass', dest, when = 0) {
  if (!AC) return; const t = AC.currentTime + when, s = AC.createBufferSource(), fl = AC.createBiquadFilter(), g = AC.createGain();
  s.buffer = noiseBuf; fl.type = type; fl.frequency.value = fq; fl.Q.value = q; g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(.001, t + dur);
  s.connect(fl); fl.connect(g); g.connect(dest || master); s.start(t, Math.random() * .5); s.stop(t + dur + .03);
}
const S = {
  punch() { noise(.1, .6, 2400, 1, 'bandpass'); tone(160, .12, 'sine', .7, -100); },
  punch2() { noise(.12, .7, 2000, 1, 'bandpass'); tone(130, .16, 'sine', .9, -80); },
  punchH() { noise(.16, .8, 1500, 1, 'bandpass'); tone(90, .24, 'sine', 1, -50); },
  kick() { noise(.14, .7, 1700, 1, 'bandpass'); tone(100, .2, 'sine', .9, -60); },
  kickH() { noise(.2, .85, 1200, 1, 'bandpass'); tone(80, .28, 'sine', 1.1, -50); noise(.08, .5, 4000, 1, 'highpass'); },
  heavy() { noise(.3, 1, 800, 1, 'bandpass'); tone(60, .4, 'sine', 1.2, -35); tone(300, .12, 'square', .15, -200); },
  block() { noise(.06, .5, 4500, 2, 'highpass'); tone(540, .06, 'square', .16); tone(180, .1, 'sine', .4, -80); },
  whoosh() { noise(.16, .16, 900, .8, 'bandpass'); },
  whooshH() { noise(.3, .3, 600, .8, 'bandpass'); tone(200, .3, 'sawtooth', .06, 300); },
  jump() { tone(240, .12, 'sine', .15, 200); noise(.06, .1, 600); },
  land() { noise(.08, .3, 300); }, thud() { tone(60, .25, 'sine', 1, -30); noise(.2, .5, 200); },
  ko() { tone(220, 1.1, 'sawtooth', .4, -170); noise(.8, .6, 300); tone(55, 1.2, 'sine', 1, -20); },
  ui() { tone(720, .06, 'square', .1); }, ok() { tone(520, .08, 'square', .12); tone(780, .12, 'square', .12, 0, null, .07); },
  round() { tone(330, .25, 'square', .16); tone(440, .35, 'square', .16, 0, null, .15); },
  fight() { tone(220, .5, 'sawtooth', .3, 300); noise(.3, .4, 1500); },
  win() { [523, 659, 784, 1047].forEach((f, i) => tone(f, .35, 'triangle', .25, 0, null, i * .12)); }
};
export const sfx = n => { try { S[n] && S[n](); } catch (e) {} };
export const setMusic = on => { mOn = on; }; export const setIntensity = v => { intensity = v; };
const BASS = [55, 0, 55, 55, 0, 55, 0, 65.4, 49, 0, 49, 49, 0, 49, 0, 58.3, 43.65, 0, 43.65, 43.65, 0, 43.65, 0, 55, 49, 0, 49, 49, 0, 49, 65.4, 73.4], ARP = [220, 262, 330, 262, 294, 349, 440, 349];
function sched() {
  if (!AC || !mOn) return; if (mNext < AC.currentTime) mNext = AC.currentTime + .05;
  while (mNext < AC.currentTime + .2) {
    const s = mStep, w = mNext - AC.currentTime;
    if (BASS[s]) tone(BASS[s] * 2, .16, 'sawtooth', .5, 0, musicG, w);
    if (s % 4 === 0) tone(130, .14, 'sine', 1, -90, musicG, w);
    if (s % 8 === 4) noise(.12, .5, 1800, 1, 'bandpass', musicG, w);
    if (s % 2 === 1) noise(.04, .2 + intensity * .1, 7000, 1, 'highpass', musicG, w);
    if (s % 2 === 0 && intensity > .3) tone(ARP[(s >> 1) % 8] * (s >= 16 ? 1.5 : 1), .1, 'square', .1, 0, musicG, w);
    mNext += 60 / 140 / 4; mStep = (mStep + 1) % 32;
  }
}
