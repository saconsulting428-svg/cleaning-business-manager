// Free chest that unlocks every 4 hours (real time).
import { CHEST_COOLDOWN_MS } from '../data/rewards.js';
import { unlockedChains, itemOf } from '../data/items.js';

export class ChestSystem {
  constructor(state, energy, merge) {
    this.state = state;
    this.energy = energy;
    this.merge = merge;
  }

  msLeft(now = Date.now()) { return Math.max(0, this.state.data.chest.readyAt - now); }
  ready(now = Date.now()) { return this.msLeft(now) === 0; }

  /** Open the chest -> { coins, gems, energy, items: [ids] } (items that fit are put on the board) */
  open(now = Date.now()) {
    if (!this.ready(now)) return null;
    const level = this.state.level;
    const chains = unlockedChains(level);
    const reward = {
      coins: 80 + level * 25 + Math.floor(Math.random() * 60),
      gems: 2 + Math.floor(Math.random() * 4),
      energy: Math.random() < 0.7 ? 1 : 2,
      items: [],
    };
    const tier = Math.min(3, 2 + Math.floor(level / 8));
    for (let i = 0; i < 3; i++) {
      const c = chains[Math.floor(Math.random() * chains.length)];
      reward.items.push(itemOf(c.id, i === 0 ? tier : Math.max(1, tier - 1)));
    }
    this.state.data.chest.readyAt = now + CHEST_COOLDOWN_MS;
    this.state.addCoins(reward.coins, { source: 'chest', score: false });
    this.state.addGems(reward.gems, { source: 'chest' });
    this.energy.add(reward.energy);
    reward.items = reward.items.filter((id) => this.merge.place(id, 'chest') >= 0);
    this.state.save();
    this.state.bus.emit('chest:opened', reward);
    return reward;
  }
}
