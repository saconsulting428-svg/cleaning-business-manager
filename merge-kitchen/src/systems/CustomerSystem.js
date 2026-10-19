// Customer queue logic (no rendering). Emits on state.bus:
//   customer:spawn {slot,c}  customer:served {slot,c,coins,xp,gems,mult}
//   customer:wrong {slot,c}  customer:left {slot,c}  customer:clear
import { ITEMS, unlockedChains, itemOf } from '../data/items.js';
import { maxOrderTier, patienceFor, stageFor } from '../data/levels.js';

const rand = (a, b) => a + Math.random() * (b - a);
const WRONG_PENALTY = 0.25; // a wrong dish costs 25% of the customer's patience

export class CustomerSystem {
  constructor(state, merge, economy) {
    this.state = state;
    this.merge = merge;
    this.economy = economy;
    this.slots = [null, null, null];
    this.nextAt = [0, 0, 0];
    this.uid = 1;
    this.holds = new Set(['scene']); // paused until the Game scene opens
    this.pausedAt = Date.now();
    this.mode = 'normal'; // 'normal' | 'battle'
    this.started = false;
  }

  get bus() { return this.state.bus; }
  get paused() { return this.holds.size > 0; }
  maxSlots() { return this.mode === 'battle' ? 3 : stageFor(this.state.level).maxCustomers; }

  // ---- pausing: popups and the Menu freeze patience timers (all Date.now based) -------
  pause(reason = 'popup', now = Date.now()) {
    if (!this.holds.size) this.pausedAt = now;
    this.holds.add(reason);
  }

  resume(reason = 'popup', now = Date.now()) {
    if (!this.holds.has(reason)) return;
    this.holds.delete(reason);
    if (this.holds.size) return;
    const dt = Math.max(0, now - this.pausedAt);
    this.slots.forEach((c) => { if (c) { c.expiresAt += dt; c.bornAt += dt; } });
    this.nextAt = this.nextAt.map((n) => n + dt);
    this.onResume?.(dt);
  }

  /** Called when the Game scene opens */
  enter(now = Date.now()) {
    if (!this.started) {
      this.started = true;
      this.nextAt = [now + 900, now + 2600, now + 4300];
    }
    this.resume('scene', now);
  }

  leave() { this.pause('scene'); }

  // ---- ticking -----------------------------------------------------------------
  update(now = Date.now()) {
    if (this.paused) return;
    const max = this.maxSlots();
    for (let i = 0; i < this.slots.length; i++) {
      const c = this.slots[i];
      if (c) {
        if (now >= c.expiresAt) this.expire(i, now);
      } else if (i < max && now >= this.nextAt[i]) {
        this.spawn(i, now);
      }
    }
  }

  /** Pick what a new customer orders */
  pickOrder() {
    const level = this.state.level;
    const d = this.state.data;
    // very first customer ever: Fries - two starter potatoes away, doable in seconds
    if (!d.tutorial.done && d.stats.served === 0) return 'fries';

    const chains = unlockedChains(level);
    const lo = this.mode === 'battle' ? 1 : 2;
    const hiCap = this.mode === 'battle' ? 3 : maxOrderTier(level);

    // Bias: 40% of the time ask for something the board can (nearly) produce, keeps pacing fluid.
    if (Math.random() < 0.4) {
      const onBoard = [...new Set(this.merge.board.filter(Boolean))]
        .filter((id) => ITEMS[id].tier >= lo && ITEMS[id].tier <= hiCap && !this.slots.some((c) => c?.order === id));
      if (onBoard.length) return onBoard[Math.floor(Math.random() * onBoard.length)];
    }
    const chain = chains[Math.floor(Math.random() * chains.length)];
    const hi = Math.min(hiCap, chain.tiers.length);
    const tier = lo + Math.floor(Math.pow(Math.random(), 1.5) * (hi - lo + 1));
    return itemOf(chain.id, tier);
  }

  spawn(i, now = Date.now()) {
    const order = this.pickOrder();
    const def = ITEMS[order];
    const patienceMs = this.mode === 'battle' ? 45000 : patienceFor(this.state.level, def.tier);
    const c = {
      uid: this.uid++,
      slot: i,
      order,
      bornAt: now,
      patienceMs,
      expiresAt: now + patienceMs,
      state: 'waiting',
      look: { face: Math.floor(Math.random() * 6), hat: Math.floor(Math.random() * 7), shirt: Math.floor(Math.random() * 8) },
      reward: this.economy.orderReward(order),
    };
    this.slots[i] = c;
    this.bus.emit('customer:spawn', { slot: i, c });
    return c;
  }

  scheduleNext(i, now) {
    const [a, b] = this.mode === 'battle' ? [250, 600] : [1800, 4200];
    this.nextAt[i] = now + rand(a, b);
  }

  /** Does any waiting customer want this item? */
  wants(id) { return this.slots.some((c) => c && c.order === id); }
  patienceLeft(i, now = Date.now()) {
    const c = this.slots[i];
    return c ? Math.max(0, (c.expiresAt - now) / c.patienceMs) : 0;
  }

  /** Try to serve the dish at board[boardIdx] to customer in `slot`. */
  serve(slot, boardIdx, now = Date.now()) {
    const c = this.slots[slot];
    if (!c || c.state !== 'waiting') return { ok: false, reason: 'none' };
    const id = this.merge.board[boardIdx];
    if (id !== c.order) {
      c.expiresAt -= c.patienceMs * WRONG_PENALTY;
      this.bus.emit('customer:wrong', { slot, c });
      return { ok: false, reason: 'wrong' };
    }
    const mult = this.economy.mult;
    const coins = c.reward.coins * mult;
    const { xp, gems } = c.reward;
    c.state = 'served';
    this.slots[slot] = null;
    this.scheduleNext(slot, now);
    this.state.data.stats.served += 1;
    this.state.addCoins(coins, { source: 'serve' });
    if (gems) this.state.addGems(gems, { source: 'serve' });
    this.state.addXp(xp);
    this.bus.emit('customer:served', { slot, c, coins, xp, gems, mult });
    return { ok: true, coins, xp, gems };
  }

  expire(i, now) {
    const c = this.slots[i];
    if (!c) return;
    c.state = 'left';
    this.slots[i] = null;
    this.scheduleNext(i, now);
    this.bus.emit('customer:left', { slot: i, c });
  }

  /** Remove everyone (battle start/end) */
  clear(now = Date.now()) {
    this.slots.forEach((c, i) => { if (c) { c.state = 'cleared'; this.slots[i] = null; } });
    this.nextAt = this.nextAt.map((_, i) => now + 300 + i * 250);
    this.bus.emit('customer:clear');
  }

  setMode(mode, now = Date.now()) {
    this.mode = mode;
    this.clear(now);
  }
}
