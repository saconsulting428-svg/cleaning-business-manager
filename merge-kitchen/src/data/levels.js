// Restaurant stages + level curve. Stage changes background, unlocks chains (via
// CHAINS[].unlockLevel) and raises the maximum number of waiting customers.

export const STAGES = [
  { id: 'cart', minLevel: 1, maxCustomers: 2, idleBase: 2, emoji: '🛒', name: { en: 'Street Cart', ur: 'Street Cart' } },
  { id: 'dhaba', minLevel: 4, maxCustomers: 2, idleBase: 8, emoji: '🏕️', name: { en: 'Dhaba', ur: 'Dhaba' } },
  { id: 'cafe', minLevel: 7, maxCustomers: 3, idleBase: 16, emoji: '☕', name: { en: 'Cafe', ur: 'Cafe' } },
  { id: 'restaurant', minLevel: 11, maxCustomers: 3, idleBase: 28, emoji: '🍽️', name: { en: 'Restaurant', ur: 'Restaurant' } },
  { id: 'hotel', minLevel: 16, maxCustomers: 3, idleBase: 44, emoji: '🏨', name: { en: 'Hotel', ur: 'Hotel' } },
  { id: 'global', minLevel: 22, maxCustomers: 3, idleBase: 70, emoji: '🌍', name: { en: 'Global Chain', ur: 'Global Chain' } },
];

export const MAX_LEVEL = 60;

export function stageIndexFor(level) {
  let idx = 0;
  STAGES.forEach((s, i) => { if (level >= s.minLevel) idx = i; });
  return idx;
}
export const stageFor = (level) => STAGES[stageIndexFor(level)];

/** XP needed to go from `level` to `level + 1` */
export const xpForLevel = (level) => Math.round(40 + 25 * (level - 1) + 4 * (level - 1) ** 2);

/** Highest order tier customers may ask for at a level (kept reachable with limited energy). */
export const maxOrderTier = (level) => Math.max(2, Math.min(7, 2 + Math.floor(level / 3)));

/** Customer patience (ms) for an order tier */
export const patienceFor = (level, tier) => Math.max(34000, 70000 - level * 1500) + tier * 6000;

/** Coins earned per minute while the app is closed (capped at IDLE_CAP_MS) */
export const IDLE_CAP_MS = 4 * 60 * 60 * 1000;
export const idlePerMinute = (level) => Math.round(stageFor(level).idleBase + level * 2.2);

/** Rival "Chef Kaleem" challenges the player every RIVAL_EVERY levels */
export const RIVAL_EVERY = 3;
export const RIVAL_TIME_MS = 60000;
export const rivalTarget = (level) => Math.min(8, 3 + Math.floor(level / RIVAL_EVERY));
export const rivalReward = (level) => ({ coins: 250 + level * 90, gems: 8 + Math.floor(level / 3) });
