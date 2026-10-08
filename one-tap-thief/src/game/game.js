// Game controller: owns the loop, input, effects and the bridge between simulation, audio, storage and UI.
import { CFG } from '../config.js';
import { WORLDS } from '../levels/worlds.js';
import { getLevel } from '../levels/levels.js';
import { commandMove, computeResult, continueAfterCaught, createLevel, createState, currentCoins, lootStats, stepSim } from './sim.js';
import { moveBlocked } from './grid.js';
import { computeLayout, makeAnim, render, screenToTile, updateAnim } from './renderer.js';
import * as audio from '../audio/audio.js';
import * as save from '../storage/save.js';

const TAP_SLOP = 14; // px: a press that travels further than this is a drag and is ignored

export class Game {
  /** hooks: { onReady(def), onStart(), onHud(hud), onCaught(), onWin(result), onToast(msg) } */
  constructor(canvas, hooks) {
    this.canvas = canvas; this.g = canvas.getContext('2d'); this.hooks = hooks;
    this.insets = { top: 70, bottom: 60 };
    this.fx = { texts: [], rings: [], taps: [] };
    this.level = 0; this.ctx = null; this.state = null; this.view = null;
    this.paused = true; this.waiting = false; this.raf = 0; this.acc = 0; this.last = 0; this.clock = 0;
    this.continueUsed = false; this.finishing = false; this.hudKey = '';
    this.anim = makeAnim(); this.touch = null;
    canvas.addEventListener('pointerdown', (e) => this.onDown(e));
    canvas.addEventListener('pointermove', (e) => this.onMove(e));
    canvas.addEventListener('pointerup', (e) => this.onUp(e));
    canvas.addEventListener('pointercancel', () => { this.touch = null; });
    canvas.addEventListener('lostpointercapture', () => { this.touch = null; });
    window.addEventListener('resize', () => this.resize());
    window.addEventListener('keydown', (e) => this.onKey(e));
    document.addEventListener('visibilitychange', () => { if (document.hidden && this.active()) this.hooks.onAutoPause(); });
  }

  active() { return !!this.raf; }

  load(n) {
    const def = getLevel(n);
    this.level = n;
    this.ctx = createLevel(def, WORLDS[def.world]);
    this.state = createState(this.ctx);
    this.fx.texts.length = 0; this.fx.rings.length = 0; this.fx.taps.length = 0;
    this.hb = 0; this.beat = 0; this.touch = null; this.anim = makeAnim();
    this.continueUsed = false; this.finishing = false; this.paused = false; this.waiting = true; this.hudKey = '';
    this.resize();
    this.pushHud();
    this.hooks.onReady(def);
  }

  restart() { this.load(this.level); }

  resize() {
    const r = this.canvas.getBoundingClientRect();
    if (!r.width) return;
    const dpr = Math.min(2.5, window.devicePixelRatio || 1);
    this.canvas.width = Math.round(r.width * dpr); this.canvas.height = Math.round(r.height * dpr);
    this.dpr = dpr; this.W = r.width; this.H = r.height;
    if (this.ctx) this.view = computeLayout(r.width, r.height, this.ctx, this.insets.top, this.insets.bottom); // new view => static layer re-bakes
  }

  start() {
    if (this.raf) return;
    this.last = performance.now();
    const loop = (now) => {
      this.raf = requestAnimationFrame(loop);
      const dt = Math.min(0.1, (now - this.last) / 1000);
      this.last = now;
      this.frame(dt);
    };
    this.raf = requestAnimationFrame(loop);
  }
  stop() { cancelAnimationFrame(this.raf); this.raf = 0; }
  setPaused(p) { this.paused = p; }

  frame(dt) {
    if (!this.state || !this.view) return;
    this.clock += dt;
    if (!this.paused && !this.waiting) {
      this.acc += dt;
      let n = 0;
      while (this.acc >= CFG.fixedStep && n++ < 6) { stepSim(this.ctx, this.state, CFG.fixedStep); this.acc -= CFG.fixedStep; }
      this.handleEvents();
      this.pushHud();
      this.heartbeat(dt);
      updateAnim(this.anim, this.state, dt);
    }
    this.beat = Math.max(0, this.beat - dt * 3);
    for (const list of [this.fx.texts, this.fx.rings, this.fx.taps]) {
      for (const f of list) f.age += dt;
      for (let i = list.length - 1; i >= 0; i--) if (list[i].age >= list[i].life) list.splice(i, 1);
    }
    const s = save.get();
    this.g.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    render(this.g, this.ctx, this.state, this.view, this.fx, { t: this.clock, character: s.character, variant: s.variant, beat: this.beat, anim: this.anim, dpr: this.dpr });
  }

  /** Heartbeat quickens and grows louder as detection builds (also a low pulse during an alarm). */
  heartbeat(dt) {
    const st = this.state;
    if (st.status !== 'playing') return;
    const d = Math.min(1, Math.max(st.danger, st.tension * 0.55, st.alarm.t > 0 ? 0.45 : 0)); // nervous when close to a guard
    if (d < 0.04) { this.hb = 0; return; }
    this.hb -= dt;
    if (this.hb <= 0) { audio.play('heartbeat', d); this.beat = 1; this.hb = 1.05 - 0.78 * d; }
  }

  handleEvents() {
    const st = this.state;
    for (const e of st.events) {
      switch (e.type) {
        case 'loot': this.pop(e, '+' + CFG.coins.loot, '#ffd24a'); audio.play('coin'); break;
        case 'rare': this.pop(e, '+' + CFG.coins.rare, '#d28cff'); audio.play('rare'); break;
        case 'key': this.pop(e, 'KEY', '#ffd24a'); audio.play('key'); break;
        case 'door': this.fx.rings.push({ x: e.x + 0.5, y: e.y + 0.5, age: 0, life: 0.6, rgb: '255,210,74' }); audio.play('door'); break;
        case 'locked': this.hooks.onToast('Locked — find the key first'); audio.play('locked'); break;
        case 'alarm': audio.play('alarm'); this.hooks.onToast(e.source === 'camera' ? 'Camera spotted you — ALARM!' : 'ALARM!'); break;
        case 'laser': this.hooks.onToast('Laser tripped!'); break;
        case 'beep': audio.play('beep', e.level); break;
        case 'camwarn': audio.play('camwarn'); this.hooks.onToast('CCTV is locking on to you!'); break;
        case 'critical': audio.play('critical'); break;
        case 'chase': this.hooks.onToast('A guard is chasing you!'); break;
        case 'alert': audio.play('alert'); break;
        case 'caught': audio.play('caught'); setTimeout(() => this.hooks.onCaught(), 650); break;
        case 'win': this.finish(); break;
        default:
      }
    }
    st.events.length = 0;
  }

  pop(e, text, color) {
    this.fx.texts.push({ x: e.x + 0.5, y: e.y + 0.3, text, color, age: 0, life: 0.9 });
    this.fx.rings.push({ x: e.x + 0.5, y: e.y + 0.5, age: 0, life: 0.5, rgb: '255,210,74' });
  }

  finish() {
    if (this.finishing) return;
    this.finishing = true;
    const r = computeResult(this.ctx, this.state);
    audio.play(r.perfect ? 'perfect' : 'win');
    this.fx.rings.push({ x: this.state.player.x, y: this.state.player.y, age: 0, life: 0.8, rgb: '61,220,132' });
    setTimeout(() => this.hooks.onWin(r), 700);
  }

  continueRun() { continueAfterCaught(this.ctx, this.state); this.continueUsed = true; this.paused = false; }

  pushHud() {
    const { got, total } = lootStats(this.ctx, this.state);
    const hud = { coins: currentCoins(this.ctx, this.state), got, total, keys: this.state.keys, alarm: this.state.alarm.t > 0, danger: this.state.danger > 0.3 };
    const key = JSON.stringify(hud);
    if (key !== this.hudKey) { this.hudKey = key; this.hooks.onHud(hud); }
  }

  // ---- tap-to-move. A tap moves; anything that travels further than TAP_SLOP px (a drag/swipe) does nothing at all.
  onDown(e) {
    if (this.paused || !this.state || this.state.status !== 'playing') return;
    if (this.touch) { this.touch = null; return; }          // a second finger cancels the gesture
    e.preventDefault();
    audio.init();
    try { this.canvas.setPointerCapture(e.pointerId); } catch (err) { /* not fatal */ }
    this.touch = { id: e.pointerId, x0: e.clientX, y0: e.clientY, moved: 0 };
  }

  onMove(e) {
    const t = this.touch;
    if (t && t.id === e.pointerId) t.moved = Math.max(t.moved, Math.hypot(e.clientX - t.x0, e.clientY - t.y0));
  }

  onUp(e) {
    const tch = this.touch;
    this.touch = null;
    if (!tch || tch.id !== e.pointerId || this.paused || !this.state || this.state.status !== 'playing') return;
    e.preventDefault();
    const moved = Math.max(tch.moved, Math.hypot(e.clientX - tch.x0, e.clientY - tch.y0));
    if (moved > TAP_SLOP) return;                                              // it was a drag: ignore completely
    const r = this.canvas.getBoundingClientRect();
    const px = e.clientX - r.left, py = e.clientY - r.top;
    if (px < 0 || py < 0 || px > r.width || py > r.height) return;
    const t = screenToTile(this.view, px, py);
    this.go(t.x, t.y);
  }

  go(tx, ty) {
    if (this.waiting) { this.waiting = false; this.hooks.onStart(); }
    if (commandMove(this.ctx, this.state, tx, ty)) {
      const t = this.state.player.target;
      if (t) this.fx.taps.push({ x: t.x + 0.5, y: t.y + 0.5, age: 0, life: 0.28 }); // tiny, brief tap ripple — no trail, no path
    }
  }

  onKey(e) {
    if (!this.active() || this.paused || !this.state) return;
    const d = { ArrowUp: [0, -1], w: [0, -1], ArrowDown: [0, 1], s: [0, 1], ArrowLeft: [-1, 0], a: [-1, 0], ArrowRight: [1, 0], d: [1, 0] }[e.key];
    if (!d) return;
    e.preventDefault();
    audio.init();
    const p = this.state.player;
    const nx = Math.round(p.x - 0.5) + d[0];
    const ny = Math.round(p.y - 0.5) + d[1];
    if (!moveBlocked(this.ctx, this.state, nx, ny, this.state.keys > 0)) this.go(nx, ny);
  }
}
