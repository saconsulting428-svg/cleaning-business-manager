/* "I am stuck" hints. When the player makes no progress for a while (no new area explored, no objective step, no item, no door) the game says what to do next, a little more
   plainly each time. The text comes from the real state of the level (current objective step, nearest locked door, a collapsed passage, a live cable, low health, a creature on
   the hunt), never from a fixed script. Level 3 also lights the objective markers for a few seconds (the same markers a sonar pulse shows). */
import { mapRoute, mapDir } from './mapview.js';

const BASE = {
  k: 'Find the brass key. It is in a room you can already reach.',
  c: 'Find the keycard. It is in a room you can already reach.',
  n: 'Find the NOTE: it holds the 4-digit code for the keypad door. Search the other rooms.',
  v: 'Turn the bulkhead valve (a big wheel on a wall): it opens the sealed door.',
  b: 'Flip every breaker switch in the facility. The ones left are marked on the map.',
  f: 'Find the fuse. Walk over it to pick it up.',
  g: 'Walk up to the generator and tap it: the fuses go in and the power comes back. It is loud.',
  s: 'Dead end? Stand close to the walls and use a sonar PULSE: a hidden door shows up. Then walk through it.',
  exit: 'Go to the green EXIT.'
};
const NEED = { key: 'the brass key', card: 'the keycard', power: 'power (generator)', code: 'the 4-digit code', valve: 'the bulkhead valve', breaker: 'all the breakers', secret: 'a hidden door' };

/* what is going on right next to the player, if anything is worth a sentence */
function nearby(w) {
  const p = w.player, d2 = (o) => Math.hypot(o.x + 0.5 - p.x, o.y + 0.5 - p.y);
  if (w.creatures.some(c => c.state === 'hunt')) return 'It is hunting you. Break its line of sight, then hide in a locker (tap it) or crawl through a vent.';
  const door = w.doors.find(d => d.locked && !(d.hidden && !d.revealed) && d2(d) < 3.4);
  if (door) return door.lock === 'code' ? 'This door has a keypad: tap it and type the code from a NOTE.' : 'This door is locked: it needs ' + (NEED[door.lock] || 'something') + '.';
  const col = w.objs.find(o => o.type === 'prop' && o.kind === 'collapse' && d2(o) < 4.5);
  if (col) return 'This passage is collapsed for good. Take another way: the MAP shows the route.';
  const fall = w.objs.find(o => o.type === 'prop' && o.kind === 'fallen' && d2(o) < 3);
  if (fall) return 'A fallen shelf blocks this spot. Walk around it.';
  const spark = w.objs.find(o => o.type === 'hazard' && o.kind === 'spark' && d2(o) < 4.5);
  if (spark) return 'A live cable sparks on a timer. Wait until the flashing stops, then cross quickly.';
  if (p.hp < 45 && w.pickups && w.pickups.some(o => !o.taken)) return 'You are hurt. A bandage or a medkit is lying in one of the rooms: walk over it to heal.';
  return null;
}

/* level 1: what to do; level 2: and where; level 3: and the markers light up */
export function stuckHint(w, level) {
  const p = w.player, cur = w.steps.find(s => !s.test()), id = cur ? cur.id : 'exit', c = id[0] === 'e' ? 'exit' : id[0], targets = w.objectiveTargets();
  let text = nearby(w) || BASE[c] || BASE.exit, ping = false;
  if (level >= 1) text += ' Tap MAP (top right) to see the next goal.';
  if (level >= 2 && targets.length) { const r = mapRoute(w, p.x, p.y, targets); if (r) text += ' It is about ' + r.pts.length + ' steps away, ' + mapDir(p, r.t) + ' of you; the route is drawn on the map.'; }
  if (level >= 3 && targets.length) { ping = true; text += ' The goal is marked in the world for a few seconds.'; }
  if (c === 's' && p.pulses <= 0) text += ' (A sonar charge comes back by itself after a while.)';
  return { text, ping, targets };
}
