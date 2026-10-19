// The FREE generator ("Potato Basket"): works without energy, so the player can never get stuck.
// Max 8 charges, +1 charge every 6 s (Date.now based => keeps charging while the app is closed).
export const GEN_MAX = 8;
export const GEN_CAP = 16; // bonus charges (goal / customer rewards, ads) may overflow up to this
export const GEN_INTERVAL = 6000;

export class GeneratorSystem {
  constructor(state) { this.state = state; }

  get d() { return this.state.data.gen; }
  get charges() { return this.d.charges; }

  /** Apply regeneration for the time elapsed (also offline) */
  sync(now = Date.now()) {
    const d = this.d;
    if (d.charges >= GEN_MAX) { d.at = now; return; }
    const n = Math.floor((now - d.at) / GEN_INTERVAL);
    if (n <= 0) return;
    d.charges = Math.min(GEN_MAX, d.charges + n);
    d.at = d.charges >= GEN_MAX ? now : d.at + n * GEN_INTERVAL;
    this.state.save();
    this.state.bus.emit('gen', d.charges);
  }

  /** ms until the next charge (0 when full) */
  msToNext(now = Date.now()) {
    const d = this.d;
    if (d.charges >= GEN_MAX) return 0;
    return Math.max(0, GEN_INTERVAL - (now - d.at));
  }

  consume(now = Date.now()) {
    this.sync(now);
    const d = this.d;
    if (d.charges < 1) return false;
    if (d.charges >= GEN_MAX && d.charges - 1 < GEN_MAX) d.at = now; // the recharge timer starts now
    d.charges -= 1;
    this.state.save();
    this.state.bus.emit('gen', d.charges);
    return true;
  }

  add(n) {
    const d = this.d;
    d.charges = Math.min(GEN_CAP, d.charges + n);
    if (d.charges >= GEN_MAX) d.at = Date.now();
    this.state.save();
    this.state.bus.emit('gen', d.charges);
  }
}
