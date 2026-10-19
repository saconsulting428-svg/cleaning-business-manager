// All audio is synthesised with WebAudio - zero asset downloads, works offline.
const NOTE = (n) => 440 * 2 ** ((n - 69) / 12);

export class AudioSystem {
  constructor(state) {
    this.state = state;
    this.ctx = null;
    this.master = null;
    this.musicGain = null;
    this.musicTimer = null;
    this.step = 0;
    state.bus.on('settings', () => this.refresh());
    // Browsers only allow audio after a gesture: unlock on the first touch/click.
    const unlock = () => this.unlock();
    window.addEventListener('pointerdown', unlock, { passive: true });
    window.addEventListener('keydown', unlock);
    document.addEventListener('visibilitychange', () => this.onVisibility());
  }

  get soundOn() { return this.state.data.settings.sound; }
  get musicOn() { return this.state.data.settings.music; }

  unlock() {
    try {
      if (!this.ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        this.ctx = new AC();
        this.master = this.ctx.createGain();
        this.master.gain.value = 0.8;
        this.master.connect(this.ctx.destination);
        this.musicGain = this.ctx.createGain();
        this.musicGain.gain.value = 0.5;
        this.musicGain.connect(this.master);
      }
      if (this.ctx.state === 'suspended') this.ctx.resume();
      this.refresh();
    } catch { /* audio unavailable */ }
  }

  onVisibility() {
    if (!this.ctx) return;
    if (document.hidden) { this.stopMusic(); this.ctx.suspend?.(); }
    else { this.ctx.resume?.(); this.refresh(); }
  }

  refresh() {
    if (!this.ctx) return;
    if (this.musicOn) this.startMusic(); else this.stopMusic();
  }

  // ---- sound effects ---------------------------------------------------
  tone({ freq = 440, to = null, dur = 0.12, type = 'sine', vol = 0.3, delay = 0 }) {
    if (!this.ctx || !this.soundOn) return;
    const t0 = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (to) osc.frequency.exponentialRampToValueAtTime(to, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g).connect(this.master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  /** name: pop | coin | success | error | click | levelup | spawn | whoosh | combo */
  play(name, pitch = 1) {
    if (!this.soundOn) return;
    this.unlock();
    switch (name) {
      case 'pop': this.tone({ freq: 320 * pitch, to: 760 * pitch, dur: 0.13, vol: 0.38 }); this.tone({ freq: 900 * pitch, to: 1400 * pitch, dur: 0.07, vol: 0.12, type: 'triangle', delay: 0.02 }); break;
      case 'spawn': this.tone({ freq: 500, to: 950, dur: 0.1, vol: 0.28, type: 'triangle' }); break;
      case 'coin': this.tone({ freq: 988, dur: 0.07, type: 'square', vol: 0.12 }); this.tone({ freq: 1319, dur: 0.2, type: 'square', vol: 0.12, delay: 0.07 }); break;
      case 'success': [72, 76, 79, 84].forEach((n, i) => this.tone({ freq: NOTE(n), dur: 0.16, type: 'triangle', vol: 0.28, delay: i * 0.07 })); break;
      case 'error': this.tone({ freq: 180, to: 90, dur: 0.28, type: 'sawtooth', vol: 0.2 }); break;
      case 'click': this.tone({ freq: 760, to: 520, dur: 0.045, type: 'triangle', vol: 0.22 }); break;
      case 'whoosh': this.tone({ freq: 200, to: 900, dur: 0.18, type: 'sine', vol: 0.12 }); break;
      case 'combo': [76, 79, 83, 88].forEach((n, i) => this.tone({ freq: NOTE(n), dur: 0.1, type: 'square', vol: 0.12, delay: i * 0.05 })); break;
      case 'levelup': [67, 72, 76, 79, 84, 88].forEach((n, i) => this.tone({ freq: NOTE(n), dur: 0.22, type: 'triangle', vol: 0.3, delay: i * 0.09 })); break;
      default: break;
    }
  }

  // ---- music: a cheerful pentatonic loop ----------------------------------
  startMusic() {
    if (!this.ctx || this.musicTimer || !this.musicOn) return;
    const melody = [0, 4, 7, 9, 7, 4, 2, 4, 0, 4, 7, 12, 9, 7, 4, 2];
    const bass = [0, 0, 7, 7, 9, 9, 5, 5];
    this.musicTimer = setInterval(() => {
      if (!this.ctx || this.ctx.state !== 'running' || !this.musicOn) return;
      const i = this.step++;
      const t0 = this.ctx.currentTime + 0.02;
      this.musicNote(NOTE(72 + melody[i % melody.length]), t0, 0.22, 'triangle', 0.07);
      if (i % 2 === 0) this.musicNote(NOTE(48 + bass[(i / 2) % bass.length]), t0, 0.4, 'sine', 0.09);
    }, 260);
  }

  musicNote(freq, t0, dur, type, vol) {
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g).connect(this.musicGain);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  stopMusic() {
    if (this.musicTimer) { clearInterval(this.musicTimer); this.musicTimer = null; }
  }
}
