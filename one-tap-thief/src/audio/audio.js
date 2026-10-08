// All audio is synthesised with WebAudio, so the game ships with zero third-party audio files
// (these are placeholder sounds — drop real files in src/assets/ and extend `play()` if desired).
let ac = null;
let sfxGain = null;
let musicGain = null;
const state = { sound: true, music: true, musicOn: false };
let timer = null;
let nextTime = 0;
let step = 0;

export function init() {
  if (ac) { if (ac.state === 'suspended') ac.resume(); return; }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  ac = new AC();
  sfxGain = ac.createGain(); sfxGain.gain.value = 0.5; sfxGain.connect(ac.destination);
  musicGain = ac.createGain(); musicGain.gain.value = 0.16; musicGain.connect(ac.destination);
  if (state.music && state.musicOn) startLoop();
}

export function configure({ sound, music }) {
  state.sound = sound; state.music = music;
  if (!music) stopLoop(); else if (state.musicOn) startLoop();
}

function tone(freq, start, dur, type = 'sine', vol = 0.3, dest = sfxGain, slideTo = null) {
  if (!ac) return;
  const o = ac.createOscillator();
  const g = ac.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, start);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, start + dur);
  g.gain.setValueAtTime(0.0001, start);
  g.gain.exponentialRampToValueAtTime(vol, start + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  o.connect(g); g.connect(dest);
  o.start(start); o.stop(start + dur + 0.02);
}

const SFX = {
  coin: (t) => { tone(988, t, 0.09, 'square', 0.16); tone(1319, t + 0.07, 0.16, 'square', 0.16); },
  rare: (t) => [784, 988, 1175, 1568].forEach((f, i) => tone(f, t + i * 0.06, 0.18, 'triangle', 0.25)),
  key: (t) => { tone(660, t, 0.1, 'triangle', 0.25); tone(880, t + 0.08, 0.2, 'triangle', 0.25); },
  door: (t) => tone(220, t, 0.25, 'sawtooth', 0.18, sfxGain, 90),
  locked: (t) => { tone(140, t, 0.12, 'square', 0.2); tone(120, t + 0.12, 0.14, 'square', 0.2); },
  beep: (t) => tone(1500, t, 0.07, 'square', 0.12),
  alert: (t) => tone(500, t, 0.18, 'sawtooth', 0.2, sfxGain, 900),
  alarm: (t) => { for (let i = 0; i < 4; i++) tone(i % 2 ? 640 : 960, t + i * 0.22, 0.2, 'square', 0.2); },
  caught: (t) => { tone(440, t, 0.5, 'sawtooth', 0.28, sfxGain, 90); tone(330, t + 0.1, 0.5, 'square', 0.15, sfxGain, 60); },
  win: (t) => [523, 659, 784, 1047].forEach((f, i) => tone(f, t + i * 0.1, 0.25, 'triangle', 0.28)),
  perfect: (t) => [523, 659, 784, 1047, 1319, 1568].forEach((f, i) => tone(f, t + i * 0.09, 0.3, 'triangle', 0.28)),
  click: (t) => tone(700, t, 0.05, 'triangle', 0.15),
  buy: (t) => { tone(784, t, 0.08, 'square', 0.15); tone(1175, t + 0.08, 0.2, 'square', 0.15); },
  tap: (t) => tone(420, t, 0.06, 'sine', 0.12, sfxGain, 600),
};

export function play(name) {
  if (!ac || !state.sound || !SFX[name]) return;
  if (ac.state === 'suspended') ac.resume();
  SFX[name](ac.currentTime + 0.005);
}

// --- background music: a quiet looping stealth groove ---
const BPM = 100;
const BASS = [110, 110, 130.8, 110, 98, 98, 123.5, 98];
const LEAD = [440, 0, 523.3, 0, 493.9, 0, 392, 0, 440, 0, 523.3, 587.3, 493.9, 0, 392, 0];

function schedule() {
  if (!ac) return;
  const beat = 60 / BPM / 2;
  while (nextTime < ac.currentTime + 0.3) {
    const b = BASS[Math.floor(step / 2) % BASS.length];
    if (step % 2 === 0) tone(b, nextTime, beat * 1.7, 'triangle', 0.5, musicGain);
    const l = LEAD[step % LEAD.length];
    if (l) tone(l, nextTime, beat * 0.9, 'square', 0.06, musicGain);
    if (step % 4 === 2) tone(8000, nextTime, 0.03, 'square', 0.03, musicGain);
    nextTime += beat; step++;
  }
}
function startLoop() {
  if (!ac || timer) return;
  nextTime = ac.currentTime + 0.05; step = 0;
  timer = setInterval(schedule, 80);
}
function stopLoop() { if (timer) { clearInterval(timer); timer = null; } }
export function startMusic() { state.musicOn = true; if (state.music) startLoop(); }
export function stopMusic() { state.musicOn = false; stopLoop(); }
document.addEventListener('visibilitychange', () => {
  if (!ac) return;
  if (document.hidden) { ac.suspend(); } else if (state.sound || state.music) ac.resume();
});
