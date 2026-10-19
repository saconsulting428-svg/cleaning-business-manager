import Phaser from 'phaser';
import { COLORS, DEPTH } from './theme.js';
import { roundedBox, boxImage } from './draw.js';
import { T } from './text.js';
import { Button } from './Button.js';
import { W, H } from './layout.js';

/**
 * Modal popup: dim overlay, cream panel with chunky outline, ribbon title, close X.
 * Scale-in with overshoot. Builders put their widgets into `popup.content`
 * (origin = panel centre, so y = -h/2 is the top edge).
 */
export class Popup extends Phaser.GameObjects.Container {
  constructor(scene, manager, o = {}) {
    super(scene, 0, 0);
    this.manager = manager;
    this.w = o.w ?? 620;
    this.h = o.h ?? 700;
    this.closable = o.closable !== false;
    this.bare = !!o.bare;
    this.closing = false;
    this.opened = false;
    this.openCbs = [];
    this.setDepth(DEPTH.popup);

    this.dim = scene.add.rectangle(W / 2, H / 2, W, H, COLORS.ink, o.bare ? 0.82 : 0.66).setInteractive();
    this.dim.on('pointerup', () => { if (this.closable && o.dimClose !== false && !this.bare) this.close(); });
    this.add(this.dim);

    this.panel = scene.add.container(W / 2, o.y ?? H / 2);
    this.add(this.panel);
    if (!this.bare) {
      const g = scene.add.graphics();
      roundedBox(g, 0, 0, this.w, this.h, 48, COLORS.bgCream, { ow: 8, lip: 10, shine: false });
      g.fillStyle(COLORS.cream2, 1).fillRoundedRect(-this.w / 2 + 26, -this.h / 2 + 62, this.w - 52, this.h - 98, 30);
      this.panel.add(g);
      if (o.title) {
        this.panel.add(boxImage(scene, Math.min(this.w - 120, 460), 88, 30, o.ribbon ?? COLORS.secondary, { lip: 8 }).setPosition(0, -this.h / 2 + 4));
        this.panel.add(T(scene, 0, -this.h / 2 + 0, o.title, 46, COLORS.white, { wrap: Math.min(this.w - 160, 420) }));
      }
    }
    this.content = scene.add.container(0, 0);
    this.panel.add(this.content);

    if (this.closable && !this.bare) {
      this.closeBtn = new Button(scene, this.w / 2 - 20, -this.h / 2 + 20, { shape: 'circle', w: 74, h: 74, color: COLORS.secondary, icon: '✖️', iconSize: 34, hitPad: 14 });
      this.panel.add(this.closeBtn);
      this.closeBtn.onClick = () => this.close();
    }
    scene.add.existing(this);

    // open animation: overshoot scale-in
    this.dim.setAlpha(0);
    this.panel.setScale(this.bare ? 1 : 0.55).setAlpha(0);
    scene.tweens.add({ targets: this.dim, alpha: 1, duration: 200 });
    scene.tweens.add({
      targets: this.panel, scale: 1, alpha: 1, duration: this.bare ? 260 : 340, ease: 'Back.easeOut',
      onComplete: () => { this.opened = true; this.openCbs.splice(0).forEach((fn) => fn()); },
    });
  }

  /** run `fn` once the scale-in animation finished (masks need the final transform) */
  whenOpen(fn) { if (this.opened) fn(); else this.openCbs.push(fn); }

  close() {
    if (this.closing) return;
    this.closing = true;
    this.scene.tweens.add({ targets: this.panel, scale: 0.8, alpha: 0, duration: 140, ease: 'Quad.easeIn' });
    this.scene.tweens.add({
      targets: this.dim, alpha: 0, duration: 160,
      onComplete: () => { this.destroy(); this.manager.closed(this); },
    });
  }
}

/**
 * Opens popups by name. Normal popups queue up (Welcome back -> Daily gift -> ...); `urgent`
 * popups (ad, confirm dialogs) stack on top of whatever is open. Every open popup pauses
 * gameplay input and customer timers.
 * Screen definition: { size: (data, app) => ({ title, w, h, closable?, bare?, ribbon? }), build(popup, scene, app, data) }
 */
export class PopupManager {
  constructor(scene, app) {
    this.scene = scene;
    this.app = app;
    this.registry = {};
    this.queue = [];
    this.stack = [];
    this.waiting = false;
  }

  register(name, def) { this.registry[name] = def; }
  get current() { return this.stack[this.stack.length - 1] ?? null; }
  get isOpen() { return this.stack.length > 0; }
  get name() { return this.current?.screenName ?? null; }

  /** Returns a promise resolved when this popup closes. */
  open(name, data = {}, urgent = false) {
    return new Promise((resolve) => {
      const job = { name, data, resolve };
      if (urgent || (!this.stack.length && !this.waiting)) { this.show(job); return; }
      // ignore exact duplicates already waiting
      if (this.queue.some((j) => j.name === name && JSON.stringify(j.data) === JSON.stringify(data))) { resolve(); return; }
      this.queue.push(job);
    });
  }

  show(job) {
    const def = this.registry[job.name];
    if (!def) { console.warn('[popup] unknown screen', job.name); job.resolve(); return; }
    const cfg = def.size(job.data, this.app);
    const p = new Popup(this.scene, this, cfg);
    p.screenName = job.name;
    p.job = job;
    this.stack.push(p);
    this.block(+1);
    def.build(p, this.scene, this.app, job.data);
    this.app.state.bus.emit('popup:open', job.name);
  }

  block(delta) {
    const st = this.app.state;
    const before = st.uiBlocks;
    st.uiBlocks = Math.max(0, st.uiBlocks + delta);
    if (before === 0 && st.uiBlocks > 0) this.app.customers?.pause('popup');
    if (before > 0 && st.uiBlocks === 0) this.app.customers?.resume('popup');
  }

  closed(popup) {
    const i = this.stack.indexOf(popup);
    if (i < 0) return;
    this.stack.splice(i, 1);
    this.block(-1);
    popup.job.resolve();
    this.app.state.bus.emit('popup:close', popup.screenName);
    if (!this.stack.length) this.next();
  }

  next() {
    if (!this.queue.length || this.waiting) return;
    this.waiting = true;
    this.scene.time.delayedCall(140, () => {
      this.waiting = false;
      const job = this.queue.shift();
      if (job) this.show(job);
    });
  }

  closeCurrent() { this.current?.close(); }
}
