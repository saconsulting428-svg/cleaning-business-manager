// Daily quest templates + generator. 3 quests per day, deterministic per date so they
// survive reloads. Types are fed by QuestSystem from game events.
import { ITEMS, unlockedChains, itemOf } from './items.js';

/** Small seeded PRNG (mulberry32) so a given date always gives the same quests */
export function seeded(seedStr) {
  let h = 1779033703 ^ seedStr.length;
  for (let i = 0; i < seedStr.length; i++) { h = Math.imul(h ^ seedStr.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); }
  let a = h >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const pick = (rnd, arr) => arr[Math.floor(rnd() * arr.length)];

/** Returns [{ id, type, target, item?, reward: {coins,gems,energy}, progress:0, claimed:false }] */
export function generateDailyQuests(dayKey, level) {
  const rnd = seeded('quests:' + dayKey);
  const scale = 1 + Math.floor(level / 4) * 0.25;
  const reward = (c, g, e = 0) => ({ coins: Math.round(c * scale), gems: g, energy: e });

  const mergeT = pick(rnd, [15, 20, 25, 30]);
  const serveT = pick(rnd, [4, 5, 6, 8]);
  const list = [
    { id: 'merge', type: 'merge', target: mergeT, reward: reward(120, 1, 1) },
    { id: 'serve', type: 'serve', target: serveT, reward: reward(150, 2) },
  ];

  const chains = unlockedChains(level);
  const chain = pick(rnd, chains);
  const maxTier = Math.min(chain.tiers.length, 2 + Math.floor(level / 3));
  const makeTier = Math.max(2, Math.min(maxTier, 2 + Math.floor(rnd() * 2)));
  const makeItem = itemOf(chain.id, makeTier);
  const third = pick(rnd, ['make', 'earn', 'spawn']);
  if (third === 'make') list.push({ id: 'make_' + makeItem, type: 'make', item: makeItem, target: makeTier <= 2 ? 3 : 1, reward: reward(180, 3) });
  else if (third === 'earn') list.push({ id: 'earn', type: 'earn', target: Math.round(300 * scale / 50) * 50, reward: reward(100, 3) });
  else list.push({ id: 'spawn', type: 'spawn', target: 5, reward: reward(100, 2, 1) });

  return list.map((q) => ({ ...q, progress: 0, claimed: false }));
}

/** Bonus for claiming all three */
export const QUEST_BONUS = { coins: 300, gems: 8, energy: 2 };

export const isQuestItemValid = (q) => q.type !== 'make' || !!ITEMS[q.item];
