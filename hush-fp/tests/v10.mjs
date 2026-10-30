/* 50-level campaign structure, torches, beats, migration */
import { LEVELS, CHAPTERS, CH_START } from '../src/logic/levels.js';
import { generate } from '../src/logic/gen.js';
import { TORCHES, torchUnlocked } from '../src/render/torches.js';
import { migrateSave } from '../src/logic/migrate.js';
import { World, DT } from '../src/logic/world.js';
let pass = 0, fail = 0; const t = (n, ok, x) => { if (ok) pass++; else { fail++; console.log('FAIL', n, x ?? ''); } };
t('exactly 50 levels', LEVELS.length === 50); t('3 chapters 17/17/16', CHAPTERS.length === 3 && CH_START.join() === '0,17,34,50');
t('level names unique', new Set(LEVELS.map(l => l.name)).size === 50); t('every level has a named route of at least 3 rooms', LEVELS.every(l => l.route.length >= 3 && l.route.every(r => r && r.length > 2)));
t('chapter of every level matches its range', LEVELS.every((l, i) => l.ch === (i < 17 ? 0 : i < 34 ? 1 : 2)));
const sig = new Set(); for (const l of LEVELS) { const g = generate(l); sig.add(JSON.stringify([g.rooms.map(r => r.kind + r.w + 'x' + r.h), l.gates, l.creatures])); } t('level layouts all distinct', sig.size === 50, sig.size);
t('5 torches, one unlocked at start, all unlockable', TORCHES.length === 5 && TORCHES.filter(x => torchUnlocked(x, [])).length === 1 && TORCHES.every(x => torchUnlocked(x, Array(50).fill(3))));
t('no level 51: nothing at index 50', LEVELS[50] === undefined);
const m = migrateSave({ v: 1, stars: Array(40).fill(1), best: [], last: 39 }, LEVELS); t('a finished 40-level save maps into 50 levels', m.stars.length >= 49 && m.last < 50);
const beats = LEVELS.filter(l => l.beat).length; t('beats assigned to most levels', beats >= 30, beats);
let bad = 0; for (let i = 0; i < 50; i++) { const w = new World(generate(LEVELS[i]), { god: true }); for (let k = 0; k < 600; k++) w.update(DT, {}); if (!isFinite(w.player.x)) bad++; } t('every level simulates 20 s without NaN', bad === 0);
console.log(pass + ' passed, ' + fail + ' failed'); process.exit(fail ? 1 : 0);
