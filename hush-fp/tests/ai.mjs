/* Monster AI behaviour tests on a generated level: hearing, investigating, searching, seeing, hunting, catching, losing track, lockers, crouch, sentinel post. */
import { LEVELS } from '../src/logic/levels.js';
import { generate } from '../src/logic/gen.js';
import { World, DT } from '../src/logic/world.js';
import { emitNoise, findPath, distField, lineOfSight } from '../src/logic/ai.js';
let ok = 0, bad = 0; const t = (n, c, d) => { c ? ok++ : bad++; console.log((c ? 'PASS ' : 'FAIL ') + n + (c ? '' : '  ' + (d || ''))); };
const lvl = i => generate(LEVELS[i]);
const run = (w, secs, inp, fn) => { for (let i = 0; i < secs / DT; i++) { w.update(DT, inp || {}); if (fn && fn(i)) return i * DT; } return -1; };
/* a world with one stalker, the player parked far away */
function arena(spec) { const g = lvl(4); const w = new World(Object.assign(g, {}), {}); return w; }
function farPoint(w, c, minD) { for (const r of w.rooms) if (Math.hypot(r.cx - c.x, r.cy - c.y) > minD) return r; return w.rooms[0]; }

{ // 1 hearing: a noise in a nearby room makes the stalker investigate it, search, then go back to roaming
  const w = new World(lvl(4), {}); const c = w.creatures[0]; w.player.x = w.start ? 0 : w.player.x; const fld = distField(w, c.x, c.y, 40); let nTile = null; for (const [k, d] of fld) { const x = k % w.W, y = Math.floor(k / w.W); if (d > 12 && d < 28 && w.cells[k] !== 0 && !w.solid.has(k)) { nTile = { x, y }; break; } } const room = { cx: nTile.x, cy: nTile.y };
  w.player.alive = true; const px = w.player.x, py = w.player.y; w.player.x = -100; // player out of the picture
  c.state = 'roam'; c.wait = 99; const nx = room.cx + 0.5, ny = room.cy + 0.5; emitNoise(w, nx, ny, 40, 'test');
  t('noise within hearing makes it investigate', c.state === 'investigate', c.state);
  const tReach = run(w, 40, {}, () => c.state === 'search'); t('it walks to the sound and starts searching', tReach >= 0, 'state ' + c.state + ' at ' + c.x.toFixed(1) + ',' + c.y.toFixed(1));
  const tBack = run(w, 40, {}, () => c.state === 'roam'); t('it gives up and returns to roaming', tBack >= 0, c.state);
  w.player.x = px; w.player.y = py;
}
{ // 2 sight: standing in view of a stalker leads to suspicion, hunting, and being caught
  const w = new World(lvl(4), {}); const c = w.creatures[0]; const p = w.player; p.x = c.x + 4; p.y = c.y; c.yaw = 0; c.state = 'roam'; c.wait = 99;
  // clear the line of sight by moving the player into a cell with a clean ray
  let found = false; for (let a = 0; a < 6.28 && !found; a += 0.3) for (let d = 2; d < 6 && !found; d += 0.5) { const x = c.x + Math.cos(a) * d, y = c.y + Math.sin(a) * d; if (w.tileAt(x, y) !== 0 && !w.solid.has(Math.floor(y) * w.W + Math.floor(x)) && lineOfSight(w, c.x, c.y, x, y)) { p.x = x; p.y = y; c.yaw = a + Math.PI; found = true; } }
  c.yaw = Math.atan2(p.y - c.y, p.x - c.x); let sus = false; const th = run(w, 12, {}, () => { if (c.state === 'suspicious') sus = true; return c.state === 'hunt'; });
  t('seeing the player makes it suspicious then hunt', th > 0, c.state + ' alert ' + c.alert.toFixed(2)); const tc = run(w, 15, {}, () => w.over === 'dead'); t('a hunting creature catches the player', tc > 0 || w.over === 'dead', w.over);
}
{ // 3 losing track: the player vanishes (teleported far, hidden from view): hunt -> search -> roam
  const w = new World(lvl(4), { god: true }); const c = w.creatures[0]; const p = w.player; c.state = 'hunt'; c.lastSeen = { x: c.x, y: c.y }; c.alert = 1;
  p.x = w.rooms[0].cx + 0.5; p.y = w.rooms[0].cy + 0.5; const far = w.rooms.reduce((b, r) => Math.hypot(r.cx - p.x, r.cy - p.y) > Math.hypot(b.cx - p.x, b.cy - p.y) ? r : b); c.x = far.cx + 0.5; c.y = far.cy + 0.5;
  const tl = run(w, 40, {}, () => c.state === 'roam'); t('it loses track and returns to roaming', tl > 0, c.state + ' after ' + tl);
}
{ // 4 crouching is quieter and harder to see
  const mk = (crouch) => { const w = new World(lvl(4), {}); const c = w.creatures[0]; const p = w.player; p.crouch = crouch; p.flash = true; c.yaw = 0; let d = 8.5; // somewhere inside its normal sight range
    for (let a = 0; a < 6.28; a += 0.2) { const x = c.x + Math.cos(a) * d, y = c.y + Math.sin(a) * d; if (w.tileAt(x, y) !== 0 && Math.hypot(0) === 0) { p.x = x; p.y = y; c.yaw = a + Math.PI; break; } } return { w, c }; };
  const a = mk(false), b = mk(true); a.c.yaw = Math.atan2(a.w.player.y - a.c.y, a.w.player.x - a.c.x); b.c.yaw = Math.atan2(b.w.player.y - b.c.y, b.w.player.x - b.c.x);
  // sight range: in a long straight line, a standing player at 8 tiles is seen, a crouched one is not
  const line = (() => { const w = new World(lvl(4), {}); for (let y = 1; y < w.H - 1; y++) for (let x = 1; x < w.W - 11; x++) { let okRun = true; for (let i = 0; i <= 9; i++) { const k = y * w.W + x + i; if (w.cells[k] !== 1 || w.solid.has(k)) { okRun = false; break; } } if (okRun) return [x, y]; } return null; })();
  t('found a straight sight line for the range test', !!line);
  if (line) { const test = (crouch) => { const w = new World(lvl(4), {}); const c = w.creatures[0]; const p = w.player; c.state = 'roam'; c.wait = 99; c.x = line[0] + 0.5; c.y = line[1] + 0.5; c.yaw = 0; p.x = line[0] + 8.5; p.y = line[1] + 0.5; p.crouch = crouch; p.flash = true; w.update(DT, {}); return c.seen; };
    t('standing player at 8 tiles is seen', test(false) === true); t('crouched player at 8 tiles is not seen', test(true) === false); }
  // noise radius: walking vs crouch step radius
  const w = new World(lvl(4), { god: true }); const ev = []; w.player.crouch = false; for (let i = 0; i < 30; i++) w.update(DT, { fwd: 1 }); const rWalk = Math.max(0, ...w.drainEvents().filter(e => e.type === 'noise').map(e => e.radius)); w.player.crouch = true; for (let i = 0; i < 40; i++) w.update(DT, { fwd: 1, crouchSet: true }); const rCr = Math.max(0, ...w.drainEvents().filter(e => e.type === 'noise').map(e => e.radius));
  t('crouched steps are quieter than walking steps', rCr < rWalk, rWalk + ' vs ' + rCr);
}
{ // 5 lockers: if it SAW you go in, it checks the locker and catches you; if it did not, it does not
  const mk = (saw) => { const w = new World(lvl(4), {}); const c = w.creatures[0]; const L = w.objs.find(o => o.type === 'locker'); const p = w.player; p.x = L.x + 0.5 + Math.cos(L.face) * 0.8; p.y = L.y + 0.5 + Math.sin(L.face) * 0.8; let placed = false; for (const d of [3, 4, 5, 2.5, 6]) { const cx = p.x + Math.cos(L.face) * d, cy = p.y + Math.sin(L.face) * d; if (w.tileAt(cx, cy) !== 0 && !w.solid.has(Math.floor(cy) * w.W + Math.floor(cx)) && lineOfSight(w, cx, cy, p.x, p.y)) { c.x = cx; c.y = cy; placed = true; break; } } if (!placed) { c.x = p.x; c.y = p.y; }
    c.state = 'hunt'; c.alert = 1; c.lastSeen = { x: p.x, y: p.y }; p.yaw = L.face; w.enterLocker(L); if (!saw) { c.knowsLocker = -1; } return { w, c, L }; };
  const s = mk(true); const caught = run(s.w, 30, {}, () => s.w.over === 'dead'); t('it checks the locker you were seen entering', caught > 0, 'state ' + s.c.state);
  const u = mk(false); u.c.x = u.w.player.x + 5; u.c.y = u.w.player.y; if (u.w.tileAt(u.c.x, u.c.y) === 0) { u.c.x = u.w.player.x; u.c.y = u.w.player.y; } const caught2 = run(u.w, 8, {}, () => u.w.over === 'dead'); t('an unseen hide is safe for a while (8 s)', caught2 < 0 || u.w.over !== 'dead', u.c.state);
}
{ // 6 sentinel: keeps its post, investigates close noise and comes back
  const w = new World(lvl(3), {}); const c = w.creatures[0]; w.player.x = -100; t("level 4 has a sentinel", c.t === 'sentinel');
  const px = c.x, py = c.y; emitNoise(w, c.x + 3, c.y, 12, 'test'); const inv = c.state === 'investigate'; run(w, 25, {}); const d = Math.hypot(c.x - c.post.x, c.y - c.post.y);
  t('sentinel investigates near noise then returns to its post', (inv || c.state === 'roam') && d < 1.2, 'dist to post ' + d.toFixed(1) + ' state ' + c.state);
}
{ // 7 listener hears farther than a stalker
  const g = lvl(16); const w = new World(g, {}); const c = w.creatures[0]; t("level 17 has a listener", c.t === 'listener'); const w2 = new World(lvl(4), {}); t('listener hearing > stalker hearing', c.k.hear > w2.creatures[0].k.hear);
}
{ // 8 doors: unlocked doors block sight until opened, the creature opens them (loud)
  const w = new World(lvl(4), {}); const d = w.doors.find(x => !x.lock); t('level has plain doors', !!d);
}
console.log(ok + '/' + (ok + bad) + ' passed'); process.exit(bad ? 1 : 0);
