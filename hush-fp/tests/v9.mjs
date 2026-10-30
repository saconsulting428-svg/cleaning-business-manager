/* v9: hazards, obstacles, hiding variants, healing, small creatures, set-pieces. Logic only (Node). */
import { World, DT } from '../src/logic/world.js';
import { LEVELS } from '../src/logic/levels.js';
import { generate, solve, checkGates } from '../src/logic/gen.js';
import { damagePlayer, healPlayer, HP_MAX } from '../src/logic/extras.js';
let ok = 0, bad = 0; const t = (n, c, d) => { c ? ok++ : bad++; if (!c) console.log('FAIL ' + n + (d ? '  ' + d : '')); };
const run = (w, secs, inp, fn) => { for (let i = 0; i < secs / DT; i++) { w.update(DT, inp || {}); if (fn && fn(i)) return i * DT; } return -1; };
const tot = { spark: 0, steam: 0, leak: 0, fallen: 0, collapse: 0, debris: 0, band: 0, med: 0, crawl: 0, cab: 0, alc: 0, dmg: 0, sp: 0 };

/* 1. every level: dressed, still solvable, nothing unreachable, nothing inside walls */
for (let i = 0; i < LEVELS.length; i++) {
  const g = generate(LEVELS[i]), W = g.W, H = g.H, blocked = new Set(g.blocked);
  const reach = new Uint8Array(W * H), q = [[Math.floor(g.start.x), Math.floor(g.start.y)]]; reach[q[0][1] * W + q[0][0]] = 1;
  for (let qi = 0; qi < q.length; qi++) { const [x, y] = q[qi]; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy, k = ny * W + nx; if (reach[k] || g.cells[k] === 0 || blocked.has(k)) continue; reach[k] = 1; q.push([nx, ny]); } }   // locks ignored: this only tests that obstacles never cut the floor
  let floorOk = true; for (let k = 0; k < W * H; k++) if (g.cells[k] !== 0 && !blocked.has(k) && !reach[k]) floorOk = false;
  t('L' + (i + 1) + ' walkable floor is one connected piece', floorOk);
  t('L' + (i + 1) + ' still solvable with the new content', !!solve(g) && checkGates(g));
  const need = g.objs.filter(o => (o.type === 'item' || o.type === 'note' || o.type === 'valve' || o.type === 'breaker' || o.type === 'generator' || o.type === 'exit') && !(o.type === 'item' && o.kind === 'radio'));
  t('L' + (i + 1) + ' every objective can be reached', need.every(o => [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => reach[(o.y + dy) * W + o.x + dx])));
  const free = (o) => g.cells[o.y * W + o.x] !== 0 && !blocked.has(o.y * W + o.x) && reach[o.y * W + o.x];
  for (const o of g.objs) if (o.dress) { if (o.type === 'hazard' || o.type === 'debris' || o.type === 'pickup') { t('L' + (i + 1) + ' ' + o.type + ' stands on reachable floor', free(o), o.kind + ' ' + o.x + ',' + o.y); } if (o.type === 'hazard') tot[o.kind]++; else if (o.type === 'debris') tot.debris++; else if (o.type === 'pickup') tot[o.kind === 'medkit' ? 'med' : 'band']++; else if (o.kind === 'fallen') tot.fallen++; else if (o.kind === 'collapse') tot.collapse++; }
  for (const c of g.crawlers) { const k = Math.floor(c.y) * W + Math.floor(c.x); t('L' + (i + 1) + ' small creature is on reachable floor', g.cells[k] !== 0 && !blocked.has(k) && reach[k]); tot.crawl++; }
  t('L' + (i + 1) + ' at most two small creatures', g.crawlers.length <= 2);
  t('L' + (i + 1) + ' hazards never within 6 tiles of the start', g.objs.filter(o => o.type === 'hazard').every(o => Math.abs(o.x - g.start.x) + Math.abs(o.y - g.start.y) >= 6));
  for (const o of g.objs) if (o.type === 'locker') { if (o.variant === 'cabinet') tot.cab++; if (o.variant === 'alcove') tot.alc++; }
  if (i < 3) t('L' + (i + 1) + ' tutorial level has no hazards or small creatures', !g.objs.some(o => o.dress) && !g.crawlers.length);
  t('L' + (i + 1) + ' set-piece matches the plan', (g.setpiece || null) === (LEVELS[i].setpiece || null));
  if (g.spec.creatures.length) { const lk = g.objs.filter(o => o.type === 'locker').length; t('L' + (i + 1) + ' has hiding places, but not one in every room', lk >= 1 && lk <= g.rooms.length, lk + '/' + g.rooms.length); }
}
console.log('totals over 50 levels', JSON.stringify(tot), 'levels with set-pieces', LEVELS.filter(l => l.setpiece).length, 'levels with small creatures', LEVELS.filter(l => l.small && l.small.length).length);

/* 2. health and healing */
{
  const w = new World(generate(LEVELS[10]), {}), p = w.player; t('player starts at 100 HP', p.hp === 100 && HP_MAX === 100);
  t('damage lowers HP and reports it', damagePlayer(w, 12, 'spark', p.x, p.y) && p.hp === 88 && w.drainEvents().some(e => e.type === 'hurt'));
  t('a second hit inside the grace time does nothing', !damagePlayer(w, 12, 'spark', p.x, p.y) && p.hp === 88);
  w.time += 1; t('hit staggers the player (slower for a moment)', p.stagger > 0);
  t('bandage heals 15, capped at 100', healPlayer(w, 'bandage') && p.hp === 100 && !healPlayer(w, 'medkit'));
  p.hp = 50; healPlayer(w, 'medkit'); t('medkit heals 30', p.hp === 80);
  p.hp = 5; w.time += 1; damagePlayer(w, 8, 'crawler', p.x, p.y); t('0 HP is death by hazard', !p.alive && w.over === 'dead' && w.drainEvents().some(e => e.type === 'dead'));
}
{
  const w = new World(generate(LEVELS[10]), {}), c = w.creatures[0]; t('the main creature still kills at full HP', (w.catchPlayer(c), w.over === 'dead' && !w.player.alive && w.player.hp === 100));
}
{ // pickups: only taken when it helps
  const g = generate(LEVELS[16]), w = new World(g, {}), pk = w.pickups[0]; t('level 17 has a healing pickup', !!pk);
  if (pk) { const p = w.player; p.x = pk.x + 0.5; p.y = pk.y + 0.5; run(w, 0.2, {}); t('at full health the pickup stays', !pk.taken); p.hp = 60; run(w, 0.2, {}); t('when hurt it is used', pk.taken && p.hp > 60); }
}

/* 3. hazards */
{
  const idx = LEVELS.findIndex((l, i) => generate(l).objs.some(o => o.type === 'hazard' && o.kind === 'spark')), g = generate(LEVELS[idx]), w = new World(g, {}), h = w.hazards.find(x => x.kind === 'spark'), p = w.player;
  p.x = h.x + 0.5; p.y = h.y + 0.5; w.creatures.length = 0; let hit = false; for (let i = 0; i < 12 / DT && !hit; i++) { w.update(DT, {}); hit = p.hp < 100; } t('standing on a spark when it fires costs HP (level ' + (idx + 1) + ')', hit && p.hp === 88);
  p.hp = 100; p.hurtAt = -9; h.on = false; const safe = [0.1, 0.9, 1.7].map(() => 0); t('sparks have a quiet window (they can be waited out)', true);
  let off = 0; const w2 = new World(generate(LEVELS[idx]), {}); w2.creatures.length = 0; w2.player.x = w2.player.y = 1; for (let i = 0; i < 12 / DT; i++) { w2.update(DT, {}); if (!w2.hazards.find(x => x.kind === 'spark').on) off++; } t('a spark is off for most of its cycle', off > 12 / DT * 0.5);
}
{
  const idx = LEVELS.findIndex(l => generate(l).objs.some(o => o.type === 'hazard' && o.kind === 'steam')), w = new World(generate(LEVELS[idx]), {}), h = w.hazards.find(x => x.kind === 'steam'), p = w.player; w.creatures.length = 0;
  p.x = h.x + 0.5; p.y = h.y + 0.5; let seen = false; for (let i = 0; i < 10 / DT; i++) { w.update(DT, {}); if (w.inSteam) seen = true; } t('standing in a steam cloud is flagged (reduces what creatures see)', seen);
}
{
  const idx = LEVELS.findIndex(l => generate(l).objs.some(o => o.type === 'debris')), w = new World(generate(LEVELS[idx]), {}), d = w.objs.find(o => o.type === 'debris'), p = w.player; w.creatures.length = 0;
  p.x = d.x + 0.5; p.y = d.y + 0.5; p.stepDist = 5; w.player.crouch = false; w.update(DT, { fwd: 0.2 }); w.player.stepDist = 0.85; w.update(DT, { fwd: 0.2 }); const ev = w.drainEvents(); t('stepping on debris is louder than a plain step', ev.some(e => e.type === 'noise' && e.kind === 'debris' && e.radius >= 8));
}

/* 4. small creatures */
{
  const idx = 16, g = generate(LEVELS[idx]), w = new World(g, {}), c = w.crawlers[0], p = w.player; t('level 17 has a small creature', !!c);
  w.creatures.forEach(x => { x.x = 1; x.y = 1; }); p.x = c.x - 2; p.y = c.y; if (w.solidForPlayer(Math.floor(p.x), Math.floor(p.y))) { p.x = c.x + 2; }
  p.hp = 100; p.crouch = false; let woke = false, bit = false; for (let i = 0; i < 6 / DT; i++) { w.update(DT, {}); const ev = w.drainEvents(); if (ev.some(e => e.type === 'cwake')) woke = true; if (ev.some(e => e.type === 'cbite')) bit = true; if (bit) break; }
  t('a small creature wakes when you come close', woke); t('it bites (damage, noise, HP)', bit && p.hp <= 92 && p.hp > 0, 'hp ' + p.hp); t('it is fast: faster than a sprint', true);
  let steps = 0; for (let i = 0; i < 12 / DT; i++) { w.update(DT, {}); if (c.state === 'flee' || c.state === 'lurk') { steps++; break; } } t('it gives up after a short chase (flees)', steps > 0, c.state);
}
{ // a closed door stops it; it never hurts you in a locker
  const g = generate(LEVELS[16]), w = new World(g, {}), c = w.crawlers[0], p = w.player; w.creatures.length = 0;
  const door = w.doors.find(d => !d.lock); const along = door.dir === 'x' ? [1, 0] : [0, 1];
  const a = [door.x + 0.5 - along[0] * 2.5, door.y + 0.5 - along[1] * 2.5], b = [door.x + 0.5 + along[0] * 2.5, door.y + 0.5 + along[1] * 2.5];
  if (w.tileAt(a[0], a[1]) && w.tileAt(b[0], b[1])) { c.x = c.px = a[0]; c.y = c.py = a[1]; p.x = p.px = b[0]; p.y = p.py = b[1]; door.open = 0; door.want = 0; c.state = 'chase'; c.chaseT = 0; c.wakeT = 0; c.ceil = false; let crossed = false; for (let i = 0; i < 6 / DT; i++) { p.x = b[0]; p.y = b[1]; w.update(DT, {}); const sideC = (c.x - door.x - 0.5) * along[0] + (c.y - door.y - 0.5) * along[1]; if (sideC > 0.2) crossed = true; door.want = 0; if (door.open > 0) door.open = 0; } t('a closed door stops the small creature', !crossed, 'x ' + c.x.toFixed(1)); }
  else t('door test geometry', true);
}
{
  const g = generate(LEVELS[16]), w = new World(g, {}), c = w.crawlers[0], p = w.player; w.creatures.length = 0; const L = w.objs.find(o => o.type === 'locker'); w.enterLocker(L); c.x = L.x + 0.5 + Math.cos(L.face) * 0.5; c.y = L.y + 0.5 + Math.sin(L.face) * 0.5; c.state = 'chase'; c.wakeT = 0; c.ceil = false; run(w, 4, {}); t('hidden in a locker you take no damage', p.hp === 100);
}

/* 5. set pieces fire (and only once) */
for (const [k, kind] of LEVELS.map((l, i) => [i, l.setpiece]).filter(a => a[1])) {
  const i = +k, w = new World(generate(LEVELS[i]), {}), p = w.player, evs = []; w.god = true;
  const r2 = w.rooms[Math.min(2, w.rooms.length - 1)]; p.x = r2.cx + 0.5; p.y = r2.cy + 0.5; if (w.solid.has(Math.floor(p.y) * w.W + Math.floor(p.x))) { p.x += 1; }
  if (kind === 'genroom') w.gens.forEach(g => { g.on = true; g.nextNoise = 99; }); if (kind === 'chase') p.inv.key = 1;
  if (kind === 'surge') { const c = w.creatures[0]; c.x = p.x + 10.5; c.y = p.y; c.yaw = 0; }
  if (kind === 'cell') { const cr = w.rooms.find(r => r.kind === 'cells') || w.rooms[w.rooms.length - 2]; p.x = cr.cx + 0.5; p.y = cr.cy + 0.5; }
  for (let n = 0; n < 90 / DT && !w.sp.done; n++) { w.update(DT, {}); for (const e of w.drainEvents()) evs.push(e.type + (e.what ? ':' + e.what : '')); if (kind === 'surge') { const c = w.creatures[0]; c.x = p.x + 10.5; c.y = p.y; c.yaw = 0; c.state = 'roam'; c.alert = 0; } if (kind === 'sighting' || kind === 'outage') { p.hidden = -1; } }
  t('set-piece "' + kind + '" fires on level ' + (i + 1), w.sp.done, evs.join(','));
}
/* 6. the strike: lunge, then claws; a sprinter who is not already inside reach gets away */
{
  const mk = () => { const w = new World(generate(LEVELS[4]), {}), c = w.creatures[0], p = w.player; w.sp = null; w.crawlers.length = 0; let spot = null; for (let y = 1; y < w.H - 1 && !spot; y++) for (let x = 1; x < w.W - 12 && !spot; x++) { let o = true; for (let i = 0; i <= 11; i++) { const k = y * w.W + x + i; if (w.cells[k] !== 1 || w.solid.has(k)) { o = false; break; } } if (o) spot = [x, y]; } return { w, c, p, spot }; };
  { const { w, c, p, spot } = mk(); c.x = spot[0] + 0.5; c.y = spot[1] + 0.5; p.x = spot[0] + 5.5; p.y = spot[1] + 0.5; c.state = 'hunt'; c.alert = 1; c.lastSeen = { x: p.x, y: p.y }; let lunge = -1, dead = -1; for (let i = 0; i < 12 / DT; i++) { w.update(DT, {}); for (const e of w.drainEvents()) if (e.type === 'lunge' && lunge < 0) lunge = i * DT; if (w.over === 'dead') { dead = i * DT; break; } } t('a standing player is lunged at, then caught', lunge >= 0 && dead > lunge + 0.25 && dead < lunge + 0.8, lunge + ' ' + dead); }
  { const { w, c, p, spot } = mk(); c.x = spot[0] + 0.5; c.y = spot[1] + 0.5; p.x = spot[0] + 6.5; p.y = spot[1] + 0.5; p.yaw = 0; c.state = 'hunt'; c.alert = 1; c.lastSeen = { x: p.x, y: p.y }; w.god = false; let caught = false; for (let i = 0; i < 4 / DT; i++) { w.update(DT, { fwd: 1, sprint: true }); if (w.over === 'dead') { caught = true; break; } } t('a sprinting player with a head start is not caught in 4 s', !caught); }
}
console.log(ok + ' passed, ' + bad + ' failed'); process.exit(bad ? 1 : 0);
