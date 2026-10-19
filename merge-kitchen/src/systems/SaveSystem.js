// Versioned localStorage persistence with safe defaults and corrupt-save recovery.
import { isValidItem } from '../data/items.js';
import { BOARD } from '../ui/layout.js';
import { ENERGY_CAP } from './EnergySystem.js';
import { GEN_CAP } from './GeneratorSystem.js';

export const SAVE_KEY = 'mergeKitchen.save';
export const SAVE_VERSION = 1;

/** Starter board: 8 potatoes (adjacent pairs => first merge in seconds) + 2 fries (first customer can be served at once). */
const STARTER = { potato: [13, 14, 15, 19, 20, 26, 27, 28], fries: [21, 22] };

export function defaultData(now = Date.now()) {
  const board = new Array(BOARD.size).fill(null);
  Object.entries(STARTER).forEach(([id, cells]) => cells.forEach((i) => { board[i] = id; }));
  return {
    v: SAVE_VERSION,
    createdAt: now,
    lastSeen: now,
    coins: 60,
    gems: 30,
    energy: 10,
    energyAt: now,
    gen: { charges: 8, at: now },
    goal: { i: 0, p: 0, item: '', lv: 0, target: 0 },
    xp: 0,
    level: 1,
    board,
    discovered: ['potato', 'fries'],
    unlockedChains: ['potato'],
    settings: { sound: true, music: true, vibration: true, lang: 'en' },
    tutorial: { done: false },
    daily: { streak: 0, lastClaim: '' },
    quests: { day: '', list: [], bonusClaimed: false },
    chest: { readyAt: now + 2 * 60 * 1000 }, // first free chest after 2 minutes
    album: { claimed: [] },
    rival: { lastTrigger: 0, available: false, wins: 0, battleLevel: 0 },
    skins: { owned: ['classic'], selected: 'classic' },
    weekly: { key: '', score: 0 },
    noAds: false,
    notifAsked: false,
    stats: { merged: 0, served: 0, coinsEarned: 0, spawned: 0, highestTier: 1, sessions: 0 },
  };
}

/** Deep-merge `src` onto `def`, keeping only known keys with matching types. */
function fill(def, src) {
  if (src === null || typeof src !== 'object' || Array.isArray(src)) return def;
  const out = {};
  for (const k of Object.keys(def)) {
    const d = def[k], s = src[k];
    if (Array.isArray(d)) out[k] = Array.isArray(s) ? s : d;
    else if (d !== null && typeof d === 'object') out[k] = fill(d, s);
    else if (typeof d === 'number') out[k] = typeof s === 'number' && Number.isFinite(s) ? s : d;
    else out[k] = typeof s === typeof d ? s : d;
  }
  return out;
}

/** Hook for future schema changes: upgrade `raw` from raw.v up to SAVE_VERSION. */
function migrate(raw) {
  // if (raw.v < 2) { ...transform...; raw.v = 2; }
  raw.v = SAVE_VERSION;
  return raw;
}

function sanitize(data, now) {
  const d = data;
  d.coins = Math.max(0, Math.floor(d.coins));
  d.gems = Math.max(0, Math.floor(d.gems));
  d.energy = Math.min(ENERGY_CAP, Math.max(0, Math.floor(d.energy)));
  d.gen.charges = Math.min(GEN_CAP, Math.max(0, Math.floor(d.gen.charges)));
  if (d.gen.at > now) d.gen.at = now;
  d.level = Math.max(1, Math.floor(d.level));
  d.xp = Math.max(0, Math.floor(d.xp));
  if (d.lastSeen > now) d.lastSeen = now; // clock moved backwards
  if (d.energyAt > now) d.energyAt = now;
  d.goal.i = Math.max(0, Math.floor(d.goal.i));
  const board = new Array(BOARD.size).fill(null);
  for (let i = 0; i < BOARD.size; i++) if (isValidItem(d.board[i])) board[i] = d.board[i];
  d.board = board;
  d.discovered = [...new Set(d.discovered.filter(isValidItem))];
  d.unlockedChains = [...new Set(d.unlockedChains.filter((s) => typeof s === 'string'))];
  if (!d.unlockedChains.length) d.unlockedChains = ['potato'];
  if (!d.skins.owned.includes('classic')) d.skins.owned.push('classic');
  if (!d.skins.owned.includes(d.skins.selected)) d.skins.selected = 'classic';
  if (!['en', 'ur'].includes(d.settings.lang)) d.settings.lang = 'en';
  return d;
}

export class SaveSystem {
  constructor(storage = globalThis.localStorage) {
    this.storage = storage;
    this.timer = null;
    this.data = null;
  }

  /** Never throws. Corrupted/missing data => fresh defaults (corrupt blob is kept under a .corrupt key). */
  load(now = Date.now()) {
    let raw = null;
    try { raw = this.storage?.getItem(SAVE_KEY); } catch { /* storage blocked */ }
    if (!raw) return (this.data = defaultData(now));
    try {
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') throw new Error('bad save');
      const data = sanitize(fill(defaultData(now), migrate(parsed)), now);
      return (this.data = data);
    } catch (err) {
      console.warn('[save] corrupted save, starting fresh', err);
      try { this.storage?.setItem(SAVE_KEY + '.corrupt', raw); } catch { /* ignore */ }
      return (this.data = defaultData(now));
    }
  }

  /** Debounced write (called after every state change) */
  queue(data) {
    this.data = data;
    if (this.timer) return;
    this.timer = setTimeout(() => this.flush(), 400);
  }

  flush(data = this.data) {
    if (this.timer) { clearTimeout(this.timer); this.timer = null; }
    if (!data) return;
    try { this.storage?.setItem(SAVE_KEY, JSON.stringify(data)); } catch (err) { console.warn('[save] write failed', err); }
  }

  wipe() {
    if (this.timer) { clearTimeout(this.timer); this.timer = null; }
    try { this.storage?.removeItem(SAVE_KEY); } catch { /* ignore */ }
  }
}
