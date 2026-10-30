/* Save migration. Builds up to v3 used a 30-level list; v4 inserted 10 levels (40 total) and every stored per-level array (stars, best times, last level) is indexed by level.
   A save that does not carry lv === LEVELS.length is read as the old 30-level layout and re-indexed by level NAME. Levels that did not exist before are credited with one star
   when the player has already cleared the level after them, so the unlock chain (level n opens when n-1 has a star) never locks old progress. A save that already holds data
   past index 29 can only come from a 40-level build and is left alone. */
export const OLD_NAMES = ['First Contact', 'Echo', 'Stay Low', 'Broken Glass', 'Hold Your Breath', 'Keycard', 'The Long Way Round', 'Bait', 'Crawlspace', 'Run', 'Static', 'Power Down', 'Thin Walls', 'Service Tunnels', 'Descent', 'Feedback', 'Generator Room', 'Glass Garden', 'Blackout', 'Meltdown', 'Two of Them', 'Blind Spot', 'Above and Below', 'Cell Block', 'Decoy', 'Dead Air', 'The Shaft', 'The Hive', 'Last Light', 'Extraction'];
/* v9.x had 40 levels, this build has 50 (chapters 17 / 17 / 16). A save from the 40-level build is mapped level by level onto the new campaign in proportion (new level j takes the result of old
   level round(j * 39 / 49)), so the unlock chain (level n opens when n-1 has a star) never locks progress that was already earned and nothing earned is lost. */
export const OLD40 = ["First Contact", "Echo", "Reception", "Stay Low", "Broken Glass", "Hold Your Breath", "Keycard", "Security Office", "The Long Way Round", "Bait", "Observation Deck", "Crawlspace", "Run", "Static", "Power Down", "Pump Station", "Thin Walls", "Service Tunnels", "Descent", "Short Circuit", "Feedback", "Generator Room", "Glass Garden", "Blackout", "Flood Gate", "Meltdown", "Two of Them", "Blind Spot", "Above and Below", "Cell Block", "Containment", "Decoy", "Dead Air", "Egg Chamber", "The Shaft", "The Hive", "Breach", "Last Light", "The Source", "Extraction"];
const to50 = (arr, n) => Array.from({ length: n }, (_, j) => arr[Math.round(j * (OLD40.length - 1) / (n - 1))] || 0);
export function migrateSave(s, LEVELS) {
  if (!s || typeof s !== 'object') return s; const n = LEVELS.length;
  const arr = (a) => (Array.isArray(a) ? a : []); s.stars = arr(s.stars); s.best = arr(s.best);
  if (s.lv === n) return s;
  /* a save from the 30-level builds: first re-index by name onto the 40-level list (levels that did not exist then are credited when the next one was cleared) */
  const is30 = s.lv !== OLD40.length && s.stars.length <= OLD_NAMES.length && s.best.length <= OLD_NAMES.length && !(typeof s.last === 'number' && s.last >= OLD_NAMES.length);
  if (is30) {
    const idx = (name) => OLD40.indexOf(name), stars = [], best = [], isOld = new Set(OLD_NAMES);
    OLD_NAMES.forEach((name, i) => { const ni = idx(name); if (ni < 0) return; if (s.stars[i]) stars[ni] = s.stars[i]; if (s.best[i]) best[ni] = s.best[i]; });
    for (let i = 0; i < OLD40.length - 1; i++) if (!isOld.has(OLD40[i]) && !stars[i] && stars[i + 1]) stars[i] = 1;
    const li = idx(OLD_NAMES[Math.max(0, Math.min(OLD_NAMES.length - 1, s.last | 0))]); s.stars = Array.from(stars, v => v || 0); s.best = Array.from(best, v => v || 0); s.last = li < 0 ? 0 : li;
  }
  const last = Math.max(0, Math.min(OLD40.length - 1, s.last | 0));
  s.stars = to50(s.stars, n); s.best = to50(s.best, n); s.last = Math.round(last * (n - 1) / (OLD40.length - 1)); s.lv = n;
  /* recovered logs were stored per level index: re-key them the same way */
  if (s.logs && typeof s.logs === 'object') { const nl = {}; for (const k of Object.keys(s.logs)) { const j = Math.round(+k * (n - 1) / (OLD40.length - 1)); if (j >= 0 && j < n) nl[j] = 1; } s.logs = nl; }
  return s;
}
