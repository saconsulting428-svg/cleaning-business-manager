/* Save migration. Builds up to v3 used a 30-level list; v4 inserted 10 levels (40 total) and every stored per-level array (stars, best times, last level) is indexed by level.
   A save that does not carry lv === LEVELS.length is read as the old 30-level layout and re-indexed by level NAME. Levels that did not exist before are credited with one star
   when the player has already cleared the level after them, so the unlock chain (level n opens when n-1 has a star) never locks old progress. A save that already holds data
   past index 29 can only come from a 40-level build and is left alone. */
export const OLD_NAMES = ['First Contact', 'Echo', 'Stay Low', 'Broken Glass', 'Hold Your Breath', 'Keycard', 'The Long Way Round', 'Bait', 'Crawlspace', 'Run', 'Static', 'Power Down', 'Thin Walls', 'Service Tunnels', 'Descent', 'Feedback', 'Generator Room', 'Glass Garden', 'Blackout', 'Meltdown', 'Two of Them', 'Blind Spot', 'Above and Below', 'Cell Block', 'Decoy', 'Dead Air', 'The Shaft', 'The Hive', 'Last Light', 'Extraction'];
export function migrateSave(s, LEVELS) {
  if (!s || typeof s !== 'object') return s; const n = LEVELS.length;
  const arr = (a) => (Array.isArray(a) ? a : []); s.stars = arr(s.stars); s.best = arr(s.best);
  const hasNew = s.lv === n || s.stars.length > OLD_NAMES.length || s.best.length > OLD_NAMES.length || s.stars.some((v, i) => i >= OLD_NAMES.length && v) || (typeof s.last === 'number' && s.last >= OLD_NAMES.length);
  if (hasNew) { s.lv = n; return s; }
  const idx = (name) => LEVELS.findIndex(l => l.name === name), stars = [], best = [], isOld = new Set(OLD_NAMES);
  OLD_NAMES.forEach((name, i) => { const ni = idx(name); if (ni < 0) return; if (s.stars[i]) stars[ni] = s.stars[i]; if (s.best[i]) best[ni] = s.best[i]; });
  for (let i = 0; i < n - 1; i++) if (!isOld.has(LEVELS[i].name) && !stars[i] && stars[i + 1]) stars[i] = 1;
  const lastName = OLD_NAMES[Math.max(0, Math.min(OLD_NAMES.length - 1, s.last | 0))], li = idx(lastName);
  s.stars = Array.from(stars, v => v || 0); s.best = Array.from(best, v => v || 0); s.last = li < 0 ? 0 : li; s.lv = n; return s;
}
