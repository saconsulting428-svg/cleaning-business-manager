// Level-ups: rewards, new food lines, restaurant stage changes and rival triggers.
// Emits 'progress:levelup' {level, reward, chains, stage, rival} for the UI to celebrate.
import { CHAINS } from '../data/items.js';
import { STAGES, RIVAL_EVERY } from '../data/levels.js';

export const levelReward = (level) => ({ coins: 60 + level * 30, gems: level % 3 === 0 ? 5 : 2 });

export class ProgressionSystem {
  constructor(state, merge) {
    this.state = state;
    this.merge = merge;
    state.bus.on('levelup', (level) => this.onLevelUp(level));
  }

  onLevelUp(level) {
    const d = this.state.data;
    const reward = levelReward(level);
    this.state.addCoins(reward.coins, { source: 'level', score: false });
    this.state.addGems(reward.gems, { source: 'level' });

    // newly available food lines get a starter pack of ingredients
    const chains = CHAINS.filter((c) => c.unlockLevel <= level && !d.unlockedChains.includes(c.id));
    chains.forEach((c) => { d.unlockedChains.push(c.id); this.merge.starterPack(c.id, 6); });

    const stage = STAGES.find((s) => s.minLevel === level) ?? null;

    // Chef Kaleem shows up every few levels
    let rival = false;
    if (level >= RIVAL_EVERY && level % RIVAL_EVERY === 0 && level > d.rival.lastTrigger) {
      d.rival.lastTrigger = level;
      d.rival.battleLevel = level;
      d.rival.available = true;
      rival = true;
    }
    this.state.save();
    this.state.bus.emit('progress:levelup', { level, reward, chains, stage, rival });
  }
}
