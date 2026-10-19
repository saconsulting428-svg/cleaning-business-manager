// 7-day login streak. Missing a day resets the streak. Day 7 grants a special chef skin.
import { DAILY_REWARDS, skinById } from '../data/rewards.js';
import { dayKey, msToMidnight } from './time.js';

const yesterdayKey = (now) => { const d = new Date(now); d.setDate(d.getDate() - 1); return dayKey(d.getTime()); };

export class DailyReward {
  constructor(state, energy) {
    this.state = state;
    this.energy = energy;
  }

  /**
   * -> { canClaim, doneCount, todayIndex, streak }
   *   doneCount  = number of calendar tiles already claimed in the current cycle (0..7)
   *   todayIndex = tile that is claimable now (or that was claimed today)
   */
  status(now = Date.now()) {
    const d = this.state.data.daily;
    const today = dayKey(now);
    if (d.lastClaim === today) {
      const done = ((d.streak - 1) % 7) + 1;
      return { canClaim: false, doneCount: done, todayIndex: done - 1, streak: d.streak };
    }
    const alive = d.lastClaim && d.lastClaim === yesterdayKey(now);
    const streak = alive ? d.streak : 0; // missed a day => back to day 1
    const done = streak % 7;
    return { canClaim: true, doneCount: done, todayIndex: done, streak };
  }

  /** Claim today's gift. Returns the reward definition or null. */
  claim(now = Date.now()) {
    const s = this.status(now);
    if (!s.canClaim) return null;
    const r = DAILY_REWARDS[s.todayIndex];
    const d = this.state.data;
    d.daily.streak = s.streak + 1;
    d.daily.lastClaim = dayKey(now);
    if (r.coins) this.state.addCoins(r.coins, { source: 'daily', score: false });
    if (r.gems) this.state.addGems(r.gems, { source: 'daily' });
    if (r.energy) this.energy.add(r.energy);
    if (r.skin && !d.skins.owned.includes(r.skin)) {
      d.skins.owned.push(r.skin);
      this.state.bus.emit('skin:unlocked', skinById(r.skin));
    }
    this.state.save();
    this.state.bus.emit('daily:claimed', r);
    return r;
  }

  msToNext(now = Date.now()) { return msToMidnight(now); }
}
