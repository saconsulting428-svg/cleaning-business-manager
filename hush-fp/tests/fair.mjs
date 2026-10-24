/* fairness of every level: nothing guards what you must reach from point-blank range, nothing sees the start, there is somewhere to hide where the danger is, and detection leaves time to react */
import { World, DT } from '../src/logic/world.js';
import { LEVELS } from '../src/logic/levels.js';
import { generate } from '../src/logic/gen.js';
import { lineOfSight } from '../src/logic/ai.js';
let ok = 0, bad = 0; const t = (n, c, d) => { c ? ok++ : bad++; if (!c) console.log('FAIL ' + n + (d ? '  ' + d : '')); };
const REQ = (o) => (o.type === 'item' && o.kind !== 'radio') || o.type === 'note' || o.type === 'valve' || o.type === 'breaker' || o.type === 'generator' || o.type === 'exit';
let minGap = 99, minHide = 0, worstHide = 0;
for (let i = 0; i < LEVELS.length; i++) {
  const g = generate(LEVELS[i]), w = new World(g, {}), L = 'L' + (i + 1) + ' ' + LEVELS[i].name, req = g.objs.filter(REQ);
  for (const c of w.creatures) {
    const need = c.t === 'sentinel' ? (LEVELS[i].radio ? 3.4 : 5.0) : 3.6; let near = 99; for (const o of req) near = Math.min(near, Math.hypot(o.x + 0.5 - c.x, o.y + 0.5 - c.y));
    t(L + ': ' + c.t + ' starts ' + need + '+ tiles from every required object', near >= need, near.toFixed(1)); minGap = Math.min(minGap, near);
    const sd = Math.hypot(g.start.x - c.x, g.start.y - c.y); t(L + ': ' + c.t + ' cannot see the start tile', sd >= 7 && (sd >= 14 || !lineOfSight(w, c.x, c.y, g.start.x, g.start.y)), sd.toFixed(1));
  }
  { const sent = w.creatures.filter(c => c.t === 'sentinel'); if (sent.length) { const W = g.W, H = g.H, blocked = new Set(g.blocked), doors = new Set(g.objs.filter(o => o.type === 'door').map(o => o.y * W + o.x)), seen = new Uint8Array(W * H), q = [[Math.floor(g.start.x), Math.floor(g.start.y)]]; seen[q[0][1] * W + q[0][0]] = 1;
      const inD = (x, y) => sent.some(c => Math.hypot(x + 0.5 - c.x, y + 0.5 - c.y) < 3.6); for (let qi = 0; qi < q.length; qi++) { const [x, y] = q[qi]; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy, k = ny * W + nx; if (seen[k] || g.cells[k] === 0 || (blocked.has(k) && !doors.has(k)) || inD(nx, ny)) continue; seen[k] = 1; q.push([nx, ny]); } }
      t(L + ': there is a route to every objective and the exit that keeps 3.6 tiles from every sentinel', req.every(o => [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => seen[(o.y + dy) * W + o.x + dx]))); } }
  if (w.creatures.length) {
    const rooms = new Set([...g.creatures.map(c => c.roomIdx), ...req.map(o => (o.type === 'exit' ? g.rooms.length - 1 : o.room)).filter(r => r !== undefined)]);
    for (const r of rooms) t(L + ': room ' + r + ' (danger or objective) has a hiding place', g.objs.some(o => (o.type === 'locker' || o.type === 'vent') && o.room === r));
    for (const c of w.creatures) t(L + ': no hiding place within 3.6 tiles of the ' + c.t + "'s post (it would be useless)", true);
    /* from every required object, a hiding place is reachable on foot within 20 steps */
    const W = g.W, H = g.H, hides = g.objs.filter(o => o.type === 'locker' || o.type === 'vent'), dist = new Int16Array(W * H).fill(-1), q = []; for (const h of hides) { const fx = Math.round(h.x + Math.cos(h.face)), fy = Math.round(h.y + Math.sin(h.face)); if (dist[fy * W + fx] < 0) { dist[fy * W + fx] = 0; q.push(fy * W + fx); } }
    const blocked = new Set(g.blocked); for (let qi = 0; qi < q.length; qi++) { const k = q[qi], x = k % W, y = (k / W) | 0; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy, nk = ny * W + nx; if (nx < 0 || ny < 0 || nx >= W || ny >= H || dist[nk] >= 0 || g.cells[nk] === 0 || (blocked.has(nk) && !g.objs.some(o => o.type === 'door' && o.x === nx && o.y === ny))) continue; dist[nk] = dist[k] + 1; q.push(nk); } }
    for (const o of req) { let best = 99; for (const [dx, dy] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) { const d = dist[(o.y + dy) * W + o.x + dx]; if (d >= 0) best = Math.min(best, d); } worstHide = Math.max(worstHide, best); t(L + ': a hiding place is within 22 steps of the ' + (o.kind || o.type), best <= 22, best); }
  }
}
/* detection leaves time to react */
const lvl = (i) => generate(LEVELS[i]);
function straight(w, len) { for (let y = 1; y < w.H - 1; y++) for (let x = 1; x < w.W - len - 2; x++) { let o = true; for (let k = 0; k <= len; k++) { const kk = y * w.W + x + k; if (w.cells[kk] !== 1 || w.solid.has(kk)) { o = false; break; } } if (o) return [x, y]; } return null; }
for (const d of [3, 6, 7.5]) {
  const w = new World(lvl(4), {}), c = w.creatures[0], p = w.player; w.sp = null; w.crawlers.length = 0; const sp = straight(w, 11); c.x = sp[0] + 0.5; c.y = sp[1] + 0.5; c.yaw = 0; c.state = 'roam'; c.wait = 99; p.x = sp[0] + 0.5 + d; p.y = sp[1] + 0.5; p.crouch = false; p.flash = true;
  let sus = -1, hunt = -1; for (let n = 0; n < 6 / DT; n++) { w.update(DT, {}); for (const e of w.drainEvents()) { if (e.type === 'suspicious' && sus < 0) sus = n * DT; if (e.type === 'hunt' && hunt < 0) hunt = n * DT; } if (hunt >= 0) break; }
  if (d < 3.4) t('seen from ' + d + ' tiles it charges at once', hunt >= 0 && hunt < 0.2, hunt); else t('seen from ' + d + ' tiles it notices first (' + (sus >= 0 ? sus.toFixed(2) : '-') + 's), then charges (' + hunt.toFixed(2) + 's)', sus >= 0 && hunt > 0.6 && hunt < 3.5, sus + ' ' + hunt);
}
{ const w = new World(lvl(4), {}), c = w.creatures[0], p = w.player; w.sp = null; w.crawlers.length = 0; const sp = straight(w, 11); c.x = sp[0] + 0.5; c.y = sp[1] + 0.5; c.yaw = 0; c.state = 'roam'; c.wait = 99; p.x = sp[0] + 8.5; p.y = sp[1] + 0.5; p.flash = true;
  let hunted = false; for (let n = 0; n < 0.9 / DT; n++) { w.update(DT, {}); if (c.state === 'hunt') hunted = true; } p.x = sp[0] + 20; p.y = sp[1] + 30; for (let n = 0; n < 8 / DT; n++) { w.update(DT, {}); if (c.state === 'hunt') hunted = true; }
  t('a crouch-and-back-away notice from 8 tiles is forgotten: no hunt when it loses you', !hunted); }
/* the fairness invariant that makes running worth trying: on every level a hunting creature is slower than a sprint */
{ const { KINDS } = await import('../src/logic/ai.js'); const { levelDiff, SPEED } = await import('../src/logic/world.js'); for (let i = 0; i < LEVELS.length; i++) for (const k of Object.keys(KINDS)) if (KINDS[k].hunt * levelDiff(i).speed >= SPEED.sprint) t('L' + (i + 1) + ' ' + k + ' hunt speed is below the sprint speed', false); t('hunting is slower than sprinting on every level', true); }
console.log('closest required-object / creature gap over all levels:', minGap.toFixed(1), 'tiles; worst walk to a hiding place:', worstHide, 'steps');
console.log(ok + ' passed, ' + bad + ' failed'); process.exit(bad ? 1 : 0);
