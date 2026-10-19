// Central game state: the persisted `data` object + an event bus every system/scene uses.
import Phaser from 'phaser';
import { xpForLevel, MAX_LEVEL } from '../data/levels.js';
import { weekKey } from './time.js';

export class GameState {
  constructor(saves) {
    this.saves = saves;
    this.data = saves.load();
    this.bus = new Phaser.Events.EventEmitter();
    this.uiBlocks = 0; // >0 while a popup/celebration is open (gameplay input + timers pause)
    this.mode = 'menu'; // 'menu' | 'game'
    this.rollWeek();
  }

  get level() { return this.data.level; }
  save() { this.saves.queue(this.data); }
  flush() { this.saves.flush(this.data); }

  rollWeek() {
    const k = weekKey();
    if (this.data.weekly.key !== k) this.data.weekly = { key: k, score: 0 };
  }

  // ---- currencies ------------------------------------------------------
  addCoins(n, meta = {}) {
    n = Math.floor(n);
    if (n <= 0) return 0;
    this.rollWeek();
    this.data.coins += n;
    this.data.stats.coinsEarned += n;
    this.data.weekly.score += n;
    this.save();
    this.bus.emit('coins', this.data.coins, n, meta);
    this.bus.emit('coins-earned', n);
    return n;
  }

  spendCoins(n) {
    if (this.data.coins < n) return false;
    this.data.coins -= n;
    this.save();
    this.bus.emit('coins', this.data.coins, -n, {});
    return true;
  }

  addGems(n, meta = {}) {
    n = Math.floor(n);
    if (n <= 0) return 0;
    this.data.gems += n;
    this.save();
    this.bus.emit('gems', this.data.gems, n, meta);
    return n;
  }

  spendGems(n) {
    if (this.data.gems < n) return false;
    this.data.gems -= n;
    this.save();
    this.bus.emit('gems', this.data.gems, -n, {});
    return true;
  }

  // ---- XP / levels ------------------------------------------------------
  addXp(n) {
    const d = this.data;
    if (d.level >= MAX_LEVEL) return;
    d.xp += Math.floor(n);
    const gained = [];
    while (d.level < MAX_LEVEL && d.xp >= xpForLevel(d.level)) {
      d.xp -= xpForLevel(d.level);
      d.level += 1;
      gained.push(d.level);
    }
    this.save();
    this.bus.emit('xp', d.xp, d.level);
    for (const level of gained) this.bus.emit('levelup', level);
  }

  xpProgress() { return Math.min(1, this.data.xp / xpForLevel(this.data.level)); }

  // ---- discoveries --------------------------------------------------------
  /** Marks an item as discovered; returns true the first time. */
  discover(id) {
    if (this.data.discovered.includes(id)) return false;
    this.data.discovered.push(id);
    this.save();
    this.bus.emit('discover', id);
    return true;
  }

  setSetting(key, value) {
    this.data.settings[key] = value;
    this.save();
    this.bus.emit('settings', key, value);
  }
}
