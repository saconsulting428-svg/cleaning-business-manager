import { CFG } from '../config.js';

/** Laser tripwire. `def`: {x,y,dir:'h'|'v',len,on,off,phase}. Blinks on/off on a fixed cycle. */
export function makeLaser(def, id) {
  const tiles = [];
  for (let i = 0; i < (def.len ?? 1); i++) tiles.push({ x: def.x + (def.dir === 'v' ? 0 : i), y: def.y + (def.dir === 'v' ? i : 0) });
  return { id, tiles, on: def.on ?? CFG.laser.on, off: def.off ?? CFG.laser.off, phase: def.phase ?? 0, dir: def.dir ?? 'h' };
}

export function laserActive(l, time) {
  const cycle = l.on + l.off;
  return (time + l.phase) % cycle < l.on;
}

export function laserHits(l, time, px, py) {
  if (!laserActive(l, time)) return false;
  return l.tiles.some((t) => Math.abs(px - (t.x + 0.5)) < 0.62 && Math.abs(py - (t.y + 0.5)) < 0.62);
}
