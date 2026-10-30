/* The in-game map: a tactical facility schematic drawn on one 2D canvas. Presentation only: it reads the world's tiles, rooms, doors, the explored mask (world.seen) and the objective
   list, and never changes any of them. Unexplored space stays dark; explored rooms are drawn with walls, inner shadow and names; the next objective gets a glow, an icon and a flowing route.
   Nothing is allocated per tile (one path per layer), so redrawing it five times a second is cheap. The main creature is only drawn while a sonar pulse is revealing it. */
const LOCKC = { key: '#c9a14a', card: '#3ca0ff', power: '#ffcc22', code: '#66ff88', valve: '#ff5533', secret: '#44aaff', breaker: '#ff9a2a' };
const FONT = '"Barlow Condensed", "Arial Narrow", system-ui, sans-serif';
const TINT = [[44, 64, 86], [66, 56, 84], [82, 68, 48], [42, 80, 70], [86, 52, 56], [56, 76, 50]];

/* shortest way to the nearest objective over walkable tiles (locked doors count as passable: the route shows where, the lock shows what is needed) */
export function mapRoute(w, sx, sy, targets) {
  const W = w.W, H = w.H, start = Math.floor(sy) * W + Math.floor(sx), goal = new Map(); for (const t of targets) goal.set(Math.floor(t.y) * W + Math.floor(t.x), t);
  const prev = new Int32Array(W * H).fill(-2); prev[start] = -1; const q = [start]; let hit = -1;
  const pass = (n) => { if (w.cells[n] === 0) return false; const d = w.doorAt.get(n); if (d) return !(d.hidden && !d.revealed); return !w.solid.has(n); };
  for (let qi = 0; qi < q.length; qi++) {
    const c = q[qi]; if (goal.has(c)) { hit = c; break; } const cx = c % W, cy = (c / W) | 0;
    for (let k = 0; k < 4; k++) { const nx = cx + (k === 0) - (k === 1), ny = cy + (k === 2) - (k === 3); if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue; const n = ny * W + nx; if (prev[n] !== -2 || !(goal.has(n) || pass(n))) continue; prev[n] = c; q.push(n); }
  }
  if (hit < 0) return null; const pts = []; for (let c = hit; c >= 0; c = prev[c]) pts.push([(c % W) + 0.5, ((c / W) | 0) + 0.5]); pts.reverse(); return { pts, t: goal.get(hit) };
}
export function mapDir(p, t) { const a = Math.atan2(t.y - p.y, t.x - p.x); return ['east', 'south-east', 'south', 'south-west', 'west', 'north-west', 'north', 'north-east'][((Math.round(a / (Math.PI / 4)) % 8) + 8) % 8]; }

function cacheFor(w) {
  if (w._mapc) return w._mapc; const W = w.W, H = w.H, roomOf = new Int16Array(W * H).fill(-1); w.rooms.forEach((rm, i) => { for (let yy = rm.y0; yy < rm.y0 + rm.h; yy++) for (let xx = rm.x0; xx < rm.x0 + rm.w; xx++) roomOf[yy * W + xx] = i; });
  let x0 = W, y0 = H, x1 = 0, y1 = 0; for (let ty = 0; ty < H; ty++) for (let tx = 0; tx < W; tx++) if (w.cells[ty * W + tx] !== 0) { if (tx < x0) x0 = tx; if (tx > x1) x1 = tx; if (ty < y0) y0 = ty; if (ty > y1) y1 = ty; }
  return (w._mapc = { roomOf, x0, y0, x1, y1 });
}

/* small vector glyphs, all drawn with the current stroke/fill */
function glyph(x, type, cx, cy, r, col) {
  x.save(); x.translate(cx, cy); x.strokeStyle = col; x.fillStyle = col; x.lineWidth = Math.max(1.4, r * 0.22); x.lineJoin = 'round'; x.lineCap = 'round';
  switch (type) {
    case 'key': x.beginPath(); x.arc(-r * 0.45, 0, r * 0.38, 0, 7); x.stroke(); x.beginPath(); x.moveTo(-r * 0.07, 0); x.lineTo(r * 0.8, 0); x.moveTo(r * 0.5, 0); x.lineTo(r * 0.5, r * 0.3); x.moveTo(r * 0.78, 0); x.lineTo(r * 0.78, r * 0.3); x.stroke(); break;
    case 'card': x.beginPath(); x.rect(-r * 0.75, -r * 0.5, r * 1.5, r); x.stroke(); x.fillRect(-r * 0.75, -r * 0.2, r * 1.5, r * 0.22); break;
    case 'fuse': x.beginPath(); x.rect(-r * 0.25, -r * 0.7, r * 0.5, r * 1.4); x.stroke(); x.beginPath(); x.moveTo(0, -r * 0.5); x.lineTo(0, r * 0.5); x.stroke(); break;
    case 'generator': x.beginPath(); x.rect(-r * 0.8, -r * 0.6, r * 1.6, r * 1.2); x.stroke(); x.beginPath(); x.moveTo(r * 0.1, -r * 0.45); x.lineTo(-r * 0.3, r * 0.08); x.lineTo(r * 0.05, r * 0.08); x.lineTo(-r * 0.12, r * 0.45); x.lineTo(r * 0.35, -r * 0.1); x.lineTo(0, -r * 0.1); x.closePath(); x.fill(); break;
    case 'valve': x.beginPath(); x.arc(0, 0, r * 0.65, 0, 7); x.stroke(); x.beginPath(); x.moveTo(-r * 0.65, 0); x.lineTo(r * 0.65, 0); x.moveTo(0, -r * 0.65); x.lineTo(0, r * 0.65); x.stroke(); break;
    case 'breaker': x.beginPath(); x.rect(-r * 0.55, -r * 0.7, r * 1.1, r * 1.4); x.stroke(); x.beginPath(); x.moveTo(0, r * 0.35); x.lineTo(r * 0.28, -r * 0.35); x.stroke(); break;
    case 'note': x.beginPath(); x.rect(-r * 0.55, -r * 0.7, r * 1.1, r * 1.4); x.stroke(); for (let k = -1; k <= 1; k++) { x.beginPath(); x.moveTo(-r * 0.3, k * r * 0.3); x.lineTo(r * 0.3, k * r * 0.3); x.stroke(); } break;
    case 'exit': x.beginPath(); x.rect(-r * 0.6, -r * 0.8, r * 1.2, r * 1.6); x.stroke(); x.beginPath(); x.moveTo(-r * 0.15, 0); x.lineTo(r * 0.35, 0); x.moveTo(r * 0.12, -r * 0.25); x.lineTo(r * 0.38, 0); x.lineTo(r * 0.12, r * 0.25); x.stroke(); break;
    case 'lock': x.beginPath(); x.arc(0, -r * 0.2, r * 0.42, Math.PI, 0); x.stroke(); x.fillRect(-r * 0.6, -r * 0.2, r * 1.2, r * 0.9); break;
    case 'locker': x.beginPath(); x.rect(-r * 0.42, -r * 0.75, r * 0.84, r * 1.5); x.stroke(); for (let k = 0; k < 3; k++) { x.beginPath(); x.moveTo(-r * 0.22, -r * 0.45 + k * r * 0.22); x.lineTo(r * 0.22, -r * 0.45 + k * r * 0.22); x.stroke(); } break;
    case 'vent': x.beginPath(); x.rect(-r * 0.6, -r * 0.5, r * 1.2, r); x.stroke(); for (let k = -1; k <= 1; k++) { x.beginPath(); x.moveTo(-r * 0.4, k * r * 0.25); x.lineTo(r * 0.4, k * r * 0.25); x.stroke(); } break;
    default: x.beginPath(); x.moveTo(0, -r * 0.8); x.lineTo(r * 0.8, 0); x.lineTo(0, r * 0.8); x.lineTo(-r * 0.8, 0); x.closePath(); x.stroke();
  }
  x.restore();
}
const ICON = { key: 'key', card: 'card', fuse: 'fuse', generator: 'generator', valve: 'valve', breaker: 'breaker', note: 'note' };
const objIcon = (o) => o.type === 'item' ? ICON[o.kind] : ICON[o.type];

export function drawFacilityMap(w, cv, now) {
  const r = cv.getBoundingClientRect(), dpr = Math.min(2, window.devicePixelRatio || 1), cw = Math.max(200, Math.round(r.width * dpr)), ch = Math.max(120, Math.round(r.height * dpr)); if (cv.width !== cw || cv.height !== ch) { cv.width = cw; cv.height = ch; }
  const x = cv.getContext('2d'), W = w.W, H = w.H, seen = w.seen || new Uint8Array(W * H), { roomOf, x0, y0, x1, y1 } = cacheFor(w), u = Math.max(1, dpr), p = w.player;
  const gw = x1 - x0 + 5, gh = y1 - y0 + 6, sc = Math.min(cw / gw, ch / gh), ox = (cw - gw * sc) / 2 - (x0 - 2) * sc, oy = (ch - gh * sc) / 2 - (y0 - 3.5) * sc, X = (tx) => ox + tx * sc, Y = (ty) => oy + ty * sc;
  x.setTransform(1, 0, 0, 1, 0, 0); x.clearRect(0, 0, cw, ch);
  const bg = x.createRadialGradient(cw / 2, ch / 2, ch * 0.1, cw / 2, ch / 2, Math.max(cw, ch) * 0.7); bg.addColorStop(0, '#0a1118'); bg.addColorStop(1, '#03050a'); x.fillStyle = bg; x.fillRect(0, 0, cw, ch);
  /* technical grid */
  x.strokeStyle = 'rgba(90,140,170,.07)'; x.lineWidth = 1; x.beginPath(); for (let tx = x0 - 1; tx <= x1 + 2; tx += 4) { x.moveTo(X(tx), 0); x.lineTo(X(tx), ch); } for (let ty = y0 - 1; ty <= y1 + 2; ty += 4) { x.moveTo(0, Y(ty)); x.lineTo(cw, Y(ty)); } x.stroke();
  /* floors: explored tiles by room tint, unexplored tiles only as a faint ghost so the layout is never given away */
  const seenRoom = new Uint8Array(w.rooms.length);
  for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
    const i = ty * W + tx, t = w.cells[i]; if (t === 0) continue;
    if (!seen[i]) { x.fillStyle = 'rgba(110,150,175,.035)'; x.fillRect(X(tx), Y(ty), Math.ceil(sc), Math.ceil(sc)); continue; }
    const ri = roomOf[i]; if (ri >= 0) seenRoom[ri] = 1;
    let c; if (t === 2) c = [28, 84, 118]; else if (ri >= 0) c = TINT[ri % TINT.length]; else c = [52, 62, 72];
    x.fillStyle = 'rgb(' + c[0] + ',' + c[1] + ',' + c[2] + ')'; x.fillRect(X(tx), Y(ty), Math.ceil(sc), Math.ceil(sc));
    if (t === 3) { x.fillStyle = 'rgba(180,230,255,.22)'; x.fillRect(X(tx) + sc * .25, Y(ty) + sc * .25, sc * .5, sc * .5); }
  }
  /* faint tile lines on explored floor */
  x.strokeStyle = 'rgba(255,255,255,.05)'; x.lineWidth = 1; x.beginPath();
  for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) { const i = ty * W + tx; if (!seen[i] || w.cells[i] === 0) continue; x.moveTo(X(tx), Y(ty)); x.lineTo(X(tx + 1), Y(ty)); x.moveTo(X(tx), Y(ty)); x.lineTo(X(tx), Y(ty + 1)); } x.stroke();
  /* rooms: inner shadow so each one reads as a space */
  w.rooms.forEach((rm, i) => { if (!seenRoom[i]) return; for (let k = 0; k < 3; k++) { x.strokeStyle = 'rgba(0,0,0,' + (0.3 - k * 0.09) + ')'; x.lineWidth = sc * 0.34; const ins = (0.17 + k * 0.3) * sc; x.strokeRect(X(rm.x0) + ins, Y(rm.y0) + ins, rm.w * sc - ins * 2, rm.h * sc - ins * 2); } });
  /* walls: a dark base line and a bright line along every explored floor edge that faces a wall */
  x.lineCap = 'square'; x.beginPath();
  for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
    const i = ty * W + tx; if (w.cells[i] === 0 || !seen[i]) continue;
    if (ty === 0 || w.cells[i - W] === 0) { x.moveTo(X(tx), Y(ty)); x.lineTo(X(tx + 1), Y(ty)); } if (ty === H - 1 || w.cells[i + W] === 0) { x.moveTo(X(tx), Y(ty + 1)); x.lineTo(X(tx + 1), Y(ty + 1)); }
    if (tx === 0 || w.cells[i - 1] === 0) { x.moveTo(X(tx), Y(ty)); x.lineTo(X(tx), Y(ty + 1)); } if (tx === W - 1 || w.cells[i + 1] === 0) { x.moveTo(X(tx + 1), Y(ty)); x.lineTo(X(tx + 1), Y(ty + 1)); }
  }
  x.strokeStyle = 'rgba(0,0,0,.75)'; x.lineWidth = Math.max(3.2 * u, sc * 0.34); x.stroke(); x.strokeStyle = '#bcd6e8'; x.lineWidth = Math.max(1.5 * u, sc * 0.17); x.stroke();
  const lab = (txt, px, py, col, size) => { x.font = '600 ' + Math.max(10 * u, Math.round(size || sc * 1.4)) + 'px ' + FONT; x.textAlign = 'center'; x.textBaseline = 'alphabetic'; x.lineWidth = 3 * u; x.strokeStyle = 'rgba(0,0,0,.88)'; x.lineJoin = 'round'; x.strokeText(txt, px, py); x.fillStyle = col; x.fillText(txt, px, py); };
  /* room names for rooms you have been in */
  w.rooms.forEach((rm, i) => { if (seenRoom[i] && (rm.name || rm.kind)) lab(String(rm.name || rm.kind).toUpperCase(), X(rm.x0 + rm.w / 2), Y(rm.y0 + rm.h / 2) + sc * .45, 'rgba(205,224,238,.7)', Math.max(8 * u, Math.min(sc * 1.2, 15 * u, (rm.w * sc * 1.05) / (String(rm.name || rm.kind).length * 0.5)))); });
  /* what is known: collapsed passages, hiding places, tools (only where the tile has been explored) */
  const rr = Math.max(5 * u, sc * 0.62);
  for (const o of w.objs) {
    const i = o.y * W + o.x; if (!seen[i]) continue; const cx = X(o.x + 0.5), cy = Y(o.y + 0.5);
    if (o.type === 'prop' && o.kind === 'collapse') { x.save(); x.strokeStyle = '#e08a4a'; x.lineWidth = Math.max(1.5 * u, sc * 0.16); x.strokeRect(X(o.x) + sc * .1, Y(o.y) + sc * .1, sc * .8, sc * .8); x.beginPath(); x.moveTo(X(o.x) + sc * .1, Y(o.y) + sc * .1); x.lineTo(X(o.x) + sc * .9, Y(o.y) + sc * .9); x.moveTo(X(o.x) + sc * .9, Y(o.y) + sc * .1); x.lineTo(X(o.x) + sc * .1, Y(o.y) + sc * .9); x.stroke(); x.restore(); }
    else if (o.type === 'locker') glyph(x, 'locker', cx, cy, rr * 0.8, 'rgba(120,205,215,.85)');
    else if (o.type === 'vent' && !(o.hidden)) glyph(x, 'vent', cx, cy, rr * 0.8, 'rgba(120,205,215,.7)');
    else if ((o.type === 'item' && !o.taken && ICON[o.kind]) || ((o.type === 'generator' || o.type === 'valve' || o.type === 'breaker' || (o.type === 'note' && !o.done)))) glyph(x, objIcon(o), cx, cy, rr, '#dfe7ee');
  }
  /* doors */
  for (const o of w.objs) {
    if (o.type !== 'door' || (o.hidden && !o.revealed) || !seen[o.y * W + o.x]) continue; const col = o.locked ? (LOCKC[o.lock] || '#ff5c66') : '#c9d3dc', dw = o.dir === 'x' ? 0.55 : 1.15, dh = o.dir === 'x' ? 1.15 : 0.55, cx = o.x + 0.5, cy = o.y + 0.5;
    x.fillStyle = '#05080c'; x.fillRect(X(cx - dw / 2), Y(cy - dh / 2), dw * sc, dh * sc); x.strokeStyle = col; x.lineWidth = Math.max(2 * u, sc * .2); x.strokeRect(X(cx - dw / 2), Y(cy - dh / 2), dw * sc, dh * sc);
    if (o.locked) glyph(x, 'lock', X(cx), Y(cy), Math.max(4 * u, sc * .5), col);
  }
  /* route: a soft underlay, a thin bright core and chevrons that flow toward the objective */
  const targets = w.objectiveTargets(), route = targets.length ? mapRoute(w, p.x, p.y, targets) : null;
  if (route && route.pts.length > 1) {
    const pts = route.pts, seg = []; let tot = 0; for (let k = 1; k < pts.length; k++) { const l = Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1]); seg.push(l); tot += l; }
    x.save(); x.lineJoin = 'round'; x.lineCap = 'round'; x.beginPath(); pts.forEach((q, k) => k ? x.lineTo(X(q[0]), Y(q[1])) : x.moveTo(X(q[0]), Y(q[1])));
    x.strokeStyle = 'rgba(255,190,70,.16)'; x.lineWidth = Math.max(7 * u, sc * 0.8); x.stroke(); x.strokeStyle = 'rgba(255,205,110,.9)'; x.lineWidth = Math.max(1.6 * u, sc * 0.16); x.stroke();
    const gap = 2.6, off = (now * 2.4) % gap, z = Math.max(4.5 * u, sc * 0.5); x.fillStyle = '#ffd37a';
    for (let s = off; s < tot - 0.8; s += gap) { let a = s, k = 0; while (k < seg.length && a > seg[k]) { a -= seg[k]; k++; } if (k >= seg.length) break; const A = pts[k], B = pts[k + 1], t = a / (seg[k] || 1), px = A[0] + (B[0] - A[0]) * t, py = A[1] + (B[1] - A[1]) * t, ang = Math.atan2(B[1] - A[1], B[0] - A[0]);
      x.save(); x.translate(X(px), Y(py)); x.rotate(ang); x.beginPath(); x.moveTo(z, 0); x.lineTo(-z * 0.6, -z * 0.8); x.lineTo(-z * 0.2, 0); x.lineTo(-z * 0.6, z * 0.8); x.closePath(); x.fill(); x.restore(); }
    x.restore();
  }
  /* exit */
  const ex = w.objs.find(o => o.type === 'exit'); if (ex) { const cx = X(ex.x + 0.5), cy = Y(ex.y + 0.5), g = x.createRadialGradient(cx, cy, 0, cx, cy, sc * 2.4); g.addColorStop(0, 'rgba(61,255,138,.35)'); g.addColorStop(1, 'rgba(61,255,138,0)'); x.fillStyle = g; x.fillRect(cx - sc * 2.4, cy - sc * 2.4, sc * 4.8, sc * 4.8); glyph(x, 'exit', cx, cy, Math.max(7 * u, sc * 0.9), '#3dff8a'); lab('EXIT', cx, cy - sc * 1.3, '#3dff8a', sc * 1.2); }
  /* the next objective: halo, pulse ring, icon, name */
  const pulse = 0.5 + 0.5 * Math.sin(now * 4.5);
  for (const t of targets) {
    if (t.type === 'exit') continue; const cx = X(t.x), cy = Y(t.y), R = sc * (2.2 + pulse * 0.9), g = x.createRadialGradient(cx, cy, 0, cx, cy, R); g.addColorStop(0, 'rgba(255,184,60,' + (0.5 + 0.25 * pulse) + ')'); g.addColorStop(1, 'rgba(255,184,60,0)'); x.fillStyle = g; x.fillRect(cx - R, cy - R, R * 2, R * 2);
    x.strokeStyle = 'rgba(255,200,90,' + (0.9 - 0.6 * pulse) + ')'; x.lineWidth = Math.max(1.5 * u, sc * .14); x.beginPath(); x.arc(cx, cy, sc * (0.9 + pulse * 1.2), 0, 7); x.stroke();
    glyph(x, t.type === 'item' ? ({ KEY: 'key', KEYCARD: 'card', FUSE: 'fuse' }[t.label] || 'default') : (ICON[t.type] || 'default'), cx, cy, Math.max(7 * u, sc * 0.85), '#ffc24a'); lab(t.label, cx, cy - sc * 1.8, '#ffc24a', sc * 1.2);
  }
  /* creatures only while a sonar pulse is revealing them */
  for (const c of w.creatures) if (c.revealT > 0) { const cx = X(c.x), cy = Y(c.y), a = Math.min(1, c.revealT); x.save(); x.globalAlpha = a; x.fillStyle = 'rgba(255,59,71,.35)'; x.beginPath(); x.arc(cx, cy, sc * 1.8, 0, 7); x.fill(); x.fillStyle = '#ff3b47'; x.beginPath(); x.moveTo(cx, cy - sc * 1.1); x.lineTo(cx + sc * .9, cy + sc * .8); x.lineTo(cx - sc * .9, cy + sc * .8); x.closePath(); x.fill(); x.restore(); }
  /* you: a view cone, a halo and an arrow that is readable on a busy map */
  { const cx = X(p.x), cy = Y(p.y), L = sc * 7, g = x.createRadialGradient(cx, cy, 0, cx, cy, L); g.addColorStop(0, 'rgba(255,255,255,.34)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.beginPath(); x.moveTo(cx, cy); x.arc(cx, cy, L, p.yaw - 0.62, p.yaw + 0.62); x.closePath(); x.fill();
    x.fillStyle = 'rgba(255,255,255,' + (0.14 + 0.1 * pulse) + ')'; x.beginPath(); x.arc(cx, cy, sc * 1.7, 0, 7); x.fill();
    x.save(); x.translate(cx, cy); x.rotate(p.yaw + Math.PI / 2); const a = Math.max(7 * u, sc * 1.35); x.fillStyle = '#fff'; x.strokeStyle = '#000'; x.lineWidth = 1.8 * u; x.beginPath(); x.moveTo(0, -a); x.lineTo(a * 0.78, a * 0.9); x.lineTo(0, a * 0.42); x.lineTo(-a * 0.78, a * 0.9); x.closePath(); x.fill(); x.stroke(); x.restore(); lab('YOU', cx, cy + sc * 3.1, '#fff', sc * 1.15); }
  return { route, target: route ? route.t : targets[0] };
}
