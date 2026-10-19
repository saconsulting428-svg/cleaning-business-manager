// Offline earnings: the restaurant keeps cooking while the app is closed (capped at 4 hours).
import { idlePerMinute, IDLE_CAP_MS } from '../data/levels.js';

const MIN_AWAY_MS = 60 * 1000;

export class IdleEarnings {
  constructor(state) { this.state = state; }

  perMinute() { return idlePerMinute(this.state.level); }

  /** -> { coins, ms, capped } | null when the player was away less than a minute */
  pending(now = Date.now()) {
    const d = this.state.data;
    if (!d.tutorial.done) return null;
    const away = now - d.lastSeen;
    if (away < MIN_AWAY_MS) return null;
    const counted = Math.min(away, IDLE_CAP_MS);
    const coins = Math.floor((counted / 60000) * this.perMinute());
    if (coins <= 0) return null;
    return { coins, ms: away, capped: away > IDLE_CAP_MS };
  }

  /** Remember "last seen" (called regularly + when going to background) */
  touch(now = Date.now()) {
    this.state.data.lastSeen = now;
    this.state.save();
  }

  collect(coins, double = false) {
    const total = coins * (double ? 2 : 1);
    this.state.addCoins(total, { source: 'idle', score: false });
    return total;
  }
}
