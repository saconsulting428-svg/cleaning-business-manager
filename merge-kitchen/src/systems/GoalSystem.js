// "Next goal" chain that always gives the player something to aim for:
//   serve N customers -> make a specific dish -> reach the next restaurant level -> (repeat, bigger)
// Completing a goal pays out immediately and the next goal starts at once.
import { ITEMS, unlockedChains, itemOf, chainById } from '../data/items.js';
import { xpForLevel } from '../data/levels.js';

const TYPES = ['serve', 'make', 'level'];

export class GoalSystem {
  constructor(state, gen) {
    this.state = state;
    this.gen = gen;
    const bus = state.bus;
    bus.on('customer:served', () => this.add('serve', 1));
    bus.on('board:merge', (ev) => this.add('make', 1, ev.id));
    bus.on('levelup', () => this.check());
    this.ensure();
  }

  get g() { return this.state.data.goal; }

  ensure() { if (!this.g.target || (this.g.item && !ITEMS[this.g.item])) this.start(this.g.i); }

  /** Create goal number i (deterministic from i + current unlocks; stored in the save) */
  start(i) {
    const d = this.state.data;
    const n = Math.floor(i / 3);
    const type = TYPES[i % 3];
    const g = { i, p: 0, item: '', lv: 0, target: 1 };
    if (type === 'serve') g.target = Math.min(12, 2 + n * 2);
    else if (type === 'make') {
      const chains = unlockedChains(d.level);
      const c = chains[n % chains.length];
      g.item = itemOf(c.id, Math.min(c.tiers.length, 3 + Math.floor(n / chains.length)));
    } else g.lv = d.level + 1;
    d.goal = g;
    this.state.save();
  }

  reward(i = this.g.i) {
    return { coins: 40 + i * 20, gems: i % 3 === 2 ? 3 : 1, charges: i % 3 === 0 ? 4 : 3 };
  }

  /** Describe the current goal for the UI */
  def() {
    const g = this.g, d = this.state.data;
    const type = TYPES[g.i % 3];
    let ratio, label;
    if (type === 'level') { ratio = this.state.xpProgress(); label = `${d.xp}/${xpForLevel(d.level)}`; }
    else { ratio = Math.min(1, g.p / g.target); label = `${g.p}/${g.target}`; }
    return { type, i: g.i, target: g.target, p: g.p, item: g.item, lv: g.lv, ratio, label, reward: this.reward() };
  }

  /** "🥔 ➜ 🍟 ➜ 🍔" path used by the make-goal hint */
  path() {
    const g = this.g;
    if (!g.item) return '';
    const def = ITEMS[g.item];
    const chain = chainById(def.chain);
    return chain.tiers.slice(0, def.tier).map((x) => x.emoji).join(' ➜ ');
  }

  add(type, n = 1, itemId) {
    const g = this.g;
    if (TYPES[g.i % 3] !== type) return;
    if (type === 'make' && g.item !== itemId) return;
    g.p += n;
    this.state.save();
    if (g.p >= g.target) this.complete(); else this.state.bus.emit('goal:progress', this.def());
  }

  check() {
    const g = this.g;
    if (TYPES[g.i % 3] === 'level' && this.state.level >= g.lv) this.complete();
    else this.state.bus.emit('goal:progress', this.def());
  }

  complete() {
    const done = this.def();
    const r = done.reward;
    this.state.addCoins(r.coins, { source: 'goal' });
    this.state.addGems(r.gems, { source: 'goal' });
    this.gen.add(r.charges);
    this.start(done.i + 1);
    this.state.bus.emit('goal:done', { done, reward: r, next: this.def() });
  }
}
