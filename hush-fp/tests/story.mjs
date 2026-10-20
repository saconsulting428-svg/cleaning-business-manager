/* story + hiding: every level has a recovered log and a story entry; a hidden player is sniffed at but not caught when unseen. */
import { LEVELS, CH_START } from '../src/logic/levels.js';
import { STORY } from '../src/logic/story.js';
import { generate } from '../src/logic/gen.js';
import { World, DT } from '../src/logic/world.js';
let ok = 0, bad = 0; const t = (n, c, d) => { c ? ok++ : bad++; console.log((c ? 'PASS ' : 'FAIL ') + n + (c ? '' : '  ' + (d || ''))); };
t('40 levels in 3 chapters (13/13/14)', LEVELS.length === 40 && CH_START.join() === '0,13,26,40', CH_START.join());
t('40 story documents', STORY.length === 40 && STORY.every(s => s[0] && s[1].length > 40));
let missing = []; for (let i = 0; i < 40; i++) { const g = generate(LEVELS[i]); if (!g.objs.some(o => o.type === 'log')) missing.push(i + 1); } t('every level has a recovered log to find', missing.length === 0, missing.join());
{ const w = new World(generate(LEVELS[0]), {}); const lg = w.objs.find(o => o.type === 'log'); const p = w.player; p.x = lg.x + 0.5; p.y = lg.y + 1.2; p.yaw = -Math.PI / 2; w.update(DT, {}); const tg = w.interactTarget(); t('the log can be targeted and read', tg && tg.kind === 'log', JSON.stringify(tg)); w.interact(); t('reading emits a log event for the right level', w.drainEvents().some(e => e.type === 'log' && e.level === 0) && lg.done); }
{ // hiding: creature walks up, sniffs, does not catch an unseen player
  const w = new World(generate(LEVELS[5]), {}); const L = w.objs.find(o => o.type === 'locker'); const c = w.creatures[0], p = w.player;
  p.x = L.x + 0.5 + Math.cos(L.face) * 0.8; p.y = L.y + 0.5 + Math.sin(L.face) * 0.8; w.enterLocker(L); t('player is hidden', p.hidden === L.id);
  let spot = null; for (const d of [2.2, 2.0, 1.8, 1.5]) { const x = L.x + 0.5 + Math.cos(L.face) * d, y = L.y + 0.5 + Math.sin(L.face) * d, k = Math.floor(y) * w.W + Math.floor(x); if (w.cells[k] !== 0 && !w.solid.has(k)) { spot = [x, y]; break; } }
  c.x = spot[0]; c.y = spot[1]; c.state = 'roam'; c.wait = 0; c.yaw = Math.atan2(L.y + 0.5 - c.y, L.x + 0.5 - c.x) + 3.14; c.alert = 0; let sniffed = false, still = true, x0 = c.x, y0 = c.y;
  for (let i = 0; i < 30 * 2; i++) { w.update(DT, {}); if (w.drainEvents().some(e => e.type === 'sniff')) sniffed = true; if (Math.hypot(c.x - x0, c.y - y0) > 0.3 && sniffed && i < 60) still = false; }
  t('it stops next to the locker and sniffs (event)', sniffed); t('while sniffing it stands still', still); for (let i = 0; i < 30 * 30; i++) w.update(DT, {}); t('unseen: it eventually leaves and the player is not caught', w.over !== 'dead' && p.alive);
}
console.log(ok + ' passed, ' + bad + ' failed'); process.exit(bad ? 1 : 0);
