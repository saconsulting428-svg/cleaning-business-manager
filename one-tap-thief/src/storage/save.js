// Local persistence (localStorage). Survives app restarts; no backend.
const KEY = 'onetapthief.save.v1';

const defaults = () => ({
  v: 1, coins: 0, unlocked: 1, best: {}, // best[level] = { stars, loot, perfect }
  character: 'classic', variant: 'black', ownedChars: ['classic'], ownedVariants: ['black'],
  sound: true, music: true, hints: true, showPath: true, completed: 0,
});

let data = defaults();
const listeners = new Set();

export function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) data = { ...defaults(), ...JSON.parse(raw) };
  } catch (e) { data = defaults(); }
  return data;
}
function persist() {
  try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) { /* storage unavailable: play on in memory */ }
  listeners.forEach((fn) => fn(data));
}
export const get = () => data;
export const onChange = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };
export function set(patch) { Object.assign(data, patch); persist(); }
export const addCoins = (n) => set({ coins: Math.max(0, data.coins + n) });

export function recordResult(level, result, maxLevel) {
  const prev = data.best[level] || { stars: 0, loot: 0, perfect: false };
  data.best[level] = {
    stars: Math.max(prev.stars, result.stars), loot: Math.max(prev.loot, result.loot),
    perfect: prev.perfect || result.perfect,
  };
  data.unlocked = Math.min(maxLevel, Math.max(data.unlocked, level + 1));
  data.completed++;
  persist();
}
export const starsFor = (level) => data.best[level]?.stars || 0;
export const totalStars = () => Object.values(data.best).reduce((a, b) => a + b.stars, 0);

/** Wipes progress, coins and purchases; keeps audio/settings. */
export function resetProgress() {
  const keep = { sound: data.sound, music: data.music, hints: data.hints, showPath: data.showPath };
  data = { ...defaults(), ...keep };
  persist();
}
