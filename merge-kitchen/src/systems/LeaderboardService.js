// Weekly leaderboard. The UI only talks to LeaderboardService; swap the provider for a
// real backend (Play Games Services, Firebase, your own API...) without touching game code.
//
// Provider contract:
//   fetchTop(weekKey, limit)  -> Promise<[{ name, score }]>     (everyone except the local player)
//   submit(weekKey, name, score) -> Promise<void>
import { seeded } from '../data/quests.js';
import { weekKey } from './time.js';

const FAKE_NAMES = ['Chef Kaleem', 'Biryani Queen', 'Naan Ninja', 'Spice Master', 'Mr. Pakora', 'Burger Baba', 'Pizza Pasha', 'Sushi Sultan', 'Karahi King', 'Dhaba Don', 'Tikka Titan', 'Samosa Star', 'Chaat Champ', 'Roti Rani', 'Lassi Lord', 'Halwa Hero', 'Kebab Khan', 'Paratha Pro', 'Mango Maestro', 'Golgappa Guru'];

/** Offline mock: deterministic fake players whose scores grow through the week */
export class LocalMockProvider {
  async fetchTop(key, limit = 20) {
    const rnd = seeded('lb:' + key);
    const dow = (new Date().getDay() + 6) % 7; // Monday = 0
    const progress = 0.25 + (dow / 6) * 0.75;
    return FAKE_NAMES.slice(0, limit).map((name, i) => ({
      name,
      score: Math.floor((38000 - i * 1700 + rnd() * 3000) * progress),
    }));
  }
  async submit() { /* nothing to send in the mock */ }
}

export class LeaderboardService {
  constructor(state, provider = new LocalMockProvider()) {
    this.state = state;
    this.provider = provider;
  }

  setProvider(p) { this.provider = p; }

  /** -> { key, entries: [{rank, name, score, you}], you: {rank, score} } */
  async getWeekly(limit = 20) {
    this.state.rollWeek();
    const key = weekKey();
    const mine = this.state.data.weekly.score;
    const others = await this.provider.fetchTop(key, limit);
    const all = [...others.map((o) => ({ ...o, you: false })), { name: 'You', score: mine, you: true }]
      .sort((a, b) => b.score - a.score)
      .map((e, i) => ({ ...e, rank: i + 1 }));
    const you = all.find((e) => e.you);
    const entries = all.slice(0, 12);
    if (!entries.includes(you)) entries.push(you);
    this.provider.submit(key, 'You', mine).catch(() => {});
    return { key, entries, you: { rank: you.rank, score: mine } };
  }
}
