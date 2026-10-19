// Daily quests: 3 per day, reset at local midnight, progress fed by gameplay events.
import { generateDailyQuests, QUEST_BONUS } from '../data/quests.js';
import { dayKey, msToMidnight } from './time.js';

export class QuestSystem {
  constructor(state, energy) {
    this.state = state;
    this.energy = energy;
    const bus = state.bus;
    bus.on('board:merge', (ev) => { this.add('merge', 1); this.add('make', 1, ev.id); });
    bus.on('customer:served', () => this.add('serve', 1));
    bus.on('coins-earned', (n) => this.add('earn', n));
    bus.on('spawned', () => this.add('spawn', 1));
  }

  get data() { return this.state.data.quests; }
  get list() { this.ensureToday(); return this.data.list; }

  /** Create today's quests if the day changed (midnight reset) */
  ensureToday(now = Date.now()) {
    const key = dayKey(now);
    if (this.data.day === key && this.data.list.length) return false;
    this.state.data.quests = { day: key, list: generateDailyQuests(key, this.state.level), bonusClaimed: false };
    this.state.save();
    this.state.bus.emit('quests');
    return true;
  }

  add(type, n, itemId) {
    this.ensureToday();
    let changed = false;
    for (const q of this.data.list) {
      if (q.type !== type || q.claimed || q.progress >= q.target) continue;
      if (type === 'make' && q.item !== itemId) continue;
      q.progress = Math.min(q.target, q.progress + n);
      changed = true;
    }
    if (changed) { this.state.save(); this.state.bus.emit('quests'); }
  }

  isDone(q) { return q.progress >= q.target; }
  claimableCount() { return this.list.filter((q) => this.isDone(q) && !q.claimed).length + (this.bonusReady() ? 1 : 0); }
  allClaimed() { return this.list.every((q) => q.claimed); }
  bonusReady() { return this.allClaimed() && !this.data.bonusClaimed; }
  msToReset(now = Date.now()) { return msToMidnight(now); }

  grant(r) {
    if (r.coins) this.state.addCoins(r.coins, { source: 'quest', score: false });
    if (r.gems) this.state.addGems(r.gems, { source: 'quest' });
    if (r.energy) this.energy.add(r.energy);
  }

  claim(i) {
    const q = this.list[i];
    if (!q || q.claimed || !this.isDone(q)) return null;
    q.claimed = true;
    this.grant(q.reward);
    this.state.save();
    this.state.bus.emit('quests');
    return q.reward;
  }

  claimBonus() {
    if (!this.bonusReady()) return null;
    this.data.bonusClaimed = true;
    this.grant(QUEST_BONUS);
    this.state.save();
    this.state.bus.emit('quests');
    return QUEST_BONUS;
  }
}
