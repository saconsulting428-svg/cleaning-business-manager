// Pure board logic (no rendering). Views listen to the events it emits on state.bus:
//   board:spawn {idx,id,source}  board:merge {from,to,id,prevId,combo,bonus}
//   board:move {from,to}  board:swap {a,b}  board:remove {idx,reason}  board:full
import { ITEMS, CHAINS, unlockedChains, tier1Of, itemOf } from '../data/items.js';
import { BOARD } from '../ui/layout.js';

const COMBO_WINDOW = 2600;
const BONUS_CHANCE = 0.22;

export class MergeSystem {
  constructor(state, energy) {
    this.state = state;
    this.energy = energy;
    this.combo = 0;
    this.lastMergeAt = 0;
  }

  get board() { return this.state.data.board; }
  get bus() { return this.state.bus; }

  emptyCells() {
    const out = [];
    this.board.forEach((v, i) => { if (!v) out.push(i); });
    return out;
  }
  isFull() { return this.emptyCells().length === 0; }
  countOf(id) { return this.board.reduce((n, v) => n + (v === id ? 1 : 0), 0); }
  has(id) { return this.board.includes(id); }

  /** Merge is valid when both are the same item and a next tier exists */
  canMerge(a, b) {
    if (a === b) return false;
    const x = this.board[a], y = this.board[b];
    return !!x && x === y && !!ITEMS[x].next;
  }

  /** Random tier-1 ingredient from an unlocked chain (rarely tier 2 at higher levels) */
  rollSpawnId() {
    const chains = unlockedChains(this.state.level);
    const c = chains[Math.floor(Math.random() * chains.length)];
    const lucky = this.state.level >= 5 && Math.random() < 0.1;
    return lucky ? itemOf(c.id, 2) : tier1Of(c.id);
  }

  randomEmpty() {
    const e = this.emptyCells();
    return e.length ? e[Math.floor(Math.random() * e.length)] : -1;
  }

  /** Put an item on the board (random empty cell unless idx is given). Returns idx or -1. */
  place(id, source = 'spawn', idx = -1) {
    if (idx < 0 || this.board[idx]) idx = this.randomEmpty();
    if (idx < 0) return -1;
    this.board[idx] = id;
    this.state.discover(id);
    this.state.save();
    this.bus.emit('board:spawn', { idx, id, source });
    return idx;
  }

  /** Spend 1 energy and spawn an ingredient. Result: {ok, reason?, idx?, id?} */
  trySpawn() {
    this.energy.sync();
    if (this.isFull()) { this.bus.emit('board:full'); return { ok: false, reason: 'full' }; }
    if (this.energy.value < 1) return { ok: false, reason: 'energy' };
    this.energy.consume(1);
    const id = this.rollSpawnId();
    const idx = this.place(id, 'button');
    this.state.data.stats.spawned += 1;
    this.bus.emit('spawned', { id, idx });
    return { ok: true, idx, id };
  }

  /** Try to merge board[from] into board[to]. */
  tryMerge(from, to, now = Date.now()) {
    if (!this.canMerge(from, to)) return null;
    const prevId = this.board[from];
    const def = ITEMS[prevId];
    const id = def.next;
    this.board[to] = id;
    this.board[from] = null;

    this.combo = now - this.lastMergeAt <= COMBO_WINDOW ? this.combo + 1 : 1;
    this.lastMergeAt = now;

    const st = this.state.data.stats;
    st.merged += 1;
    st.highestTier = Math.max(st.highestTier, ITEMS[id].tier);
    const isNew = this.state.discover(id);

    this.state.save();
    const ev = { from, to, id, prevId, combo: this.combo, isNew, tier: ITEMS[id].tier };
    this.bus.emit('board:merge', ev);

    // Lucky bonus: sometimes a merge leaves a free ingredient behind. Placed AFTER the merge
    // event so the view has already released the source cell.
    if (ITEMS[id].tier >= 2 && Math.random() < BONUS_CHANCE && !this.isFull()) {
      const bid = itemOf(ITEMS[id].chain, Math.max(1, ITEMS[id].tier - 1));
      const bidx = this.place(bid, 'bonus');
      if (bidx >= 0) ev.bonus = { idx: bidx, id: bid };
    }
    return ev;
  }

  move(from, to) {
    if (this.board[to] || !this.board[from]) return false;
    this.board[to] = this.board[from];
    this.board[from] = null;
    this.state.save();
    this.bus.emit('board:move', { from, to });
    return true;
  }

  swap(a, b) {
    if (!this.board[a] || !this.board[b]) return false;
    [this.board[a], this.board[b]] = [this.board[b], this.board[a]];
    this.state.save();
    this.bus.emit('board:swap', { a, b });
    return true;
  }

  sellValue(id) { return Math.max(1, Math.round(ITEMS[id].value * 0.4)); }

  sell(idx) {
    const id = this.board[idx];
    if (!id) return 0;
    const coins = this.sellValue(id);
    this.board[idx] = null;
    this.state.addCoins(coins, { source: 'sell', score: false });
    this.bus.emit('board:remove', { idx, reason: 'sell', id, coins });
    return coins;
  }

  /** Remove an item that was consumed (served to a customer) */
  consume(idx, reason = 'serve', to = null) {
    const id = this.board[idx];
    this.board[idx] = null;
    this.state.save();
    this.bus.emit('board:remove', { idx, reason, id, to });
  }

  /** First pair of identical mergeable items, preferring neighbours (used by the tutorial) */
  findPair() {
    const b = this.board;
    let best = null;
    for (let i = 0; i < b.length; i++) {
      if (!b[i] || !ITEMS[b[i]].next) continue;
      for (let j = i + 1; j < b.length; j++) {
        if (b[j] !== b[i]) continue;
        const dist = Math.abs((i % BOARD.cols) - (j % BOARD.cols)) + Math.abs(Math.floor(i / BOARD.cols) - Math.floor(j / BOARD.cols));
        if (!best || dist < best.dist) best = { a: i, b: j, dist };
      }
    }
    return best;
  }

  /** index of the first cell holding `id`, or -1 */
  find(id) { return this.board.indexOf(id); }

  /** Fill up to n empty cells with tier-1 items (rival battle supplies, chain unlock packs) */
  grant(ids, source = 'chest') {
    const placed = [];
    for (const id of ids) {
      const idx = this.place(id, source);
      if (idx >= 0) placed.push(idx);
    }
    return placed;
  }

  /** Bonus pack for a freshly unlocked chain */
  starterPack(chainId, n = 5) {
    const id = tier1Of(chainId);
    return this.grant(new Array(n).fill(id), 'unlock');
  }

  allChainIds() { return CHAINS.map((c) => c.id); }
}
