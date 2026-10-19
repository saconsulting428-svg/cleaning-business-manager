// Reward formulas + the Lunch/Dinner rush multiplier, in one place.
import { ITEMS } from '../data/items.js';

export class Economy {
  constructor(state, events) {
    this.state = state;
    this.events = events;
  }

  get mult() { return this.events.mult(); }

  /** Small coin + XP drip for every merge (combos pay extra) */
  mergeReward(ev) {
    const def = ITEMS[ev.id];
    let coins = Math.max(1, Math.round(def.value * 0.12));
    if (ev.combo >= 3) coins += ev.combo * 4;
    return { coins: coins * this.mult, xp: def.tier + (ev.combo >= 3 ? 2 : 0), comboBonus: ev.combo >= 3 };
  }

  applyMerge(ev) {
    const r = this.mergeReward(ev);
    this.state.addCoins(r.coins, { source: 'merge' });
    this.state.addXp(r.xp);
    return r;
  }

  /** Reward for serving an order of `itemId` (gem drop is rolled once, when the customer spawns) */
  orderReward(itemId) {
    const def = ITEMS[itemId];
    const base = Math.round(def.value * 1.5);
    const gems = Math.random() < 0.06 + def.tier * 0.015 ? 1 + (def.tier >= 5 ? 1 : 0) : 0;
    return { coins: base, xp: def.tier * 6 + 4, gems };
  }
}
