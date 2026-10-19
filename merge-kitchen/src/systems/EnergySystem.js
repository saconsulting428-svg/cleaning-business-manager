// Energy: max 5, +1 every 30 minutes (real time, including offline). Rewards may overflow up to CAP.
export const ENERGY_MAX = 5;
export const ENERGY_CAP = 10;
export const ENERGY_INTERVAL = 30 * 60 * 1000;

export class EnergySystem {
  constructor(state) { this.state = state; }

  get value() { return this.state.data.energy; }

  /** Applies regeneration for the time elapsed (also offline). Call often; it is cheap. */
  sync(now = Date.now()) {
    const d = this.state.data;
    if (d.energy >= ENERGY_MAX) { d.energyAt = now; return; }
    const n = Math.floor((now - d.energyAt) / ENERGY_INTERVAL);
    if (n <= 0) return;
    d.energy = Math.min(ENERGY_MAX, d.energy + n);
    d.energyAt = d.energy >= ENERGY_MAX ? now : d.energyAt + n * ENERGY_INTERVAL;
    this.state.save();
    this.state.bus.emit('energy', d.energy);
  }

  /** ms until the next +1 (0 when full) */
  msToNext(now = Date.now()) {
    const d = this.state.data;
    if (d.energy >= ENERGY_MAX) return 0;
    return Math.max(0, ENERGY_INTERVAL - (now - d.energyAt));
  }

  /** ms until completely full */
  msToFull(now = Date.now()) {
    const d = this.state.data;
    if (d.energy >= ENERGY_MAX) return 0;
    return this.msToNext(now) + (ENERGY_MAX - d.energy - 1) * ENERGY_INTERVAL;
  }

  consume(n = 1, now = Date.now()) {
    const d = this.state.data;
    this.sync(now);
    if (d.energy < n) return false;
    if (d.energy >= ENERGY_MAX && d.energy - n < ENERGY_MAX) d.energyAt = now; // timer starts now
    d.energy -= n;
    this.state.save();
    this.state.bus.emit('energy', d.energy);
    return true;
  }

  add(n) {
    const d = this.state.data;
    d.energy = Math.min(ENERGY_CAP, d.energy + n);
    if (d.energy >= ENERGY_MAX) d.energyAt = Date.now();
    this.state.save();
    this.state.bus.emit('energy', d.energy);
  }

  refill() {
    const d = this.state.data;
    d.energy = Math.max(d.energy, ENERGY_MAX);
    d.energyAt = Date.now();
    this.state.save();
    this.state.bus.emit('energy', d.energy);
  }
}
