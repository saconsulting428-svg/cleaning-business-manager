// Rival battles vs Chef Kaleem: serve N orders in 60 seconds. Customers come fast with
// easy orders (tier 1-3) and the player gets a batch of free ingredients ("kitchen kit").
import { unlockedChains, tier1Of } from '../data/items.js';
import { RIVAL_TIME_MS, rivalTarget, rivalReward } from '../data/levels.js';

export class RivalSystem {
  constructor(state, merge, customers) {
    this.state = state;
    this.merge = merge;
    this.customers = customers;
    this.battle = null; // { endsAt, target, served, level }
    state.bus.on('customer:served', () => this.onServed());
    customers.onResume = (dt) => { if (this.battle) this.battle.endsAt += dt; };
  }

  get bus() { return this.state.bus; }
  get available() { return this.state.data.rival.available; }
  get active() { return !!this.battle; }
  get dialogueIndex() { return this.state.data.rival.wins + (this.state.data.rival.battleLevel / 3 | 0); }

  msLeft(now = Date.now()) { return this.battle ? Math.max(0, this.battle.endsAt - now) : 0; }

  start(now = Date.now()) {
    if (this.battle || !this.available) return false;
    const level = this.state.data.rival.battleLevel || this.state.level;
    this.battle = { level, target: rivalTarget(level), served: 0, endsAt: now + RIVAL_TIME_MS };
    this.customers.setMode('battle', now);
    // free ingredients so the battle is winnable even with 0 energy
    const chains = unlockedChains(this.state.level);
    const kit = [];
    for (let i = 0; i < 9; i++) kit.push(tier1Of(chains[i % chains.length].id));
    this.merge.grant(kit, 'battle');
    this.bus.emit('rival:start', this.battle);
    return true;
  }

  onServed() {
    const b = this.battle;
    if (!b) return;
    b.served += 1;
    this.bus.emit('rival:progress', b);
    if (b.served >= b.target) this.finish(true);
  }

  update(now = Date.now()) {
    const b = this.battle;
    if (!b || this.customers.paused) return;
    if (now >= b.endsAt) this.finish(false, now);
  }

  finish(win, now = Date.now()) {
    const b = this.battle;
    if (!b) return;
    this.battle = null;
    this.customers.setMode('normal', now);
    let reward = null;
    if (win) {
      const d = this.state.data.rival;
      d.wins += 1;
      d.available = false;
      reward = rivalReward(b.level);
      this.state.addCoins(reward.coins, { source: 'rival' });
      this.state.addGems(reward.gems, { source: 'rival' });
    }
    this.state.save();
    this.bus.emit('rival:end', { win, reward, level: b.level, served: b.served, target: b.target });
  }

  /** Quit the Game scene mid-battle counts as a loss only when time runs out; nothing to do here. */
}
