  // ============================================================ BUILD HOME (story mode)
  // EMPTY PLOT -> FOUNDATION -> WALLS -> DOOR & WINDOWS -> (ROOF) -> DESIGN -> FURNISH -> ROOM COMPLETE.
  // Every structural step is a glowing "site" in the 3D scene: tap it, a hammer swings, dust flies and that piece grows.
  // Progress is derived from the real layout, so it survives closing the game; only the room plan (S.plan) is stored.
  const H_ = WORLD.H;
  const BH_COL = { foundation: 0xFFC93C, walls: 0xFF9F43, open: 0x4FC3F7, roof: 0xE5533D, furn: 0x66D9A0 };
  const BH_NAME = { foundation: 'BUILD FOUNDATION', walls: 'BUILD WALLS', open: 'ADD DOOR & WINDOWS', roof: 'BUILD ROOF', design: 'DESIGN YOUR ROOM', furn: 'FURNISH' };
  const BH_CHIP = { foundation: 'Base', walls: 'Walls', open: 'Doors', roof: 'Roof', design: 'Design', furn: 'Furnish' };
  const BH_HELP = { foundation: 'Tap a glowing tile to lay the foundation.', walls: 'Tap a glowing wall to raise it.', open: 'Tap the glowing spots for the door and windows.', roof: 'Tap a glowing roof section — or skip the roof for now.', design: 'Pick a look. The room changes instantly!', furn: 'Tap the glowing spots to place your furniture.' };
  const FLOOR_STY = { wood: 'floor_wood', tile: 'floor_tile', marble: 'floor_marble' };
  const WALL_STY = { cream: ['wall_plaster', '#F6E3C2'], modern: ['wall_plaster', '#B3BDC9'], brick: ['wall_brick', null] };
  const FURN_PAL = { modern: ['#5E7388', '#E9EEF2', '#2A9D8F', '#B8C4CF'], luxury: ['#8A2F3A', '#C9A24A', '#2D3F6B', '#5B2A4A'] };
  let bhBusy = false; const combo = { n: 0, timer: 0 };
  const starsTxt = (n) => '⭐'.repeat(n) + '☆'.repeat(3 - n);
  const rcells = (p) => { const c = []; for (let x = p.x0; x < p.x1; x++) for (let z = p.z0; z < p.z1; z++) c.push([x, z]); return c; };
  const rkey = (p) => p.lvl + ':' + p.x0 + ',' + p.z0;
  const roomLike = (p) => ({ cells: rcells(p), lvl: p.lvl });
  const floorSet = (l) => new Set(S.layout.filter(o => o.lvl === l && PART[o.part].kind === 'floor' && o.part !== 'path_stone').map(o => o.x + ',' + o.z));
  const wallSet = (l) => new Set(S.layout.filter(o => o.lvl === l && PART[o.part].kind === 'wall' && PART[o.part].cat !== 'garden').map(o => edgeKey(o.x, o.z, o.rot)));
  const typeOf = (p) => ROOM_TYPES.find(t => t.id === p.t) || ROOM_TYPES[0];
  function sideEdges(p, s) { const e = []; if (s === 'N') for (let x = p.x0; x < p.x1; x++) e.push([x, p.z0, 0]); if (s === 'S') for (let x = p.x0; x < p.x1; x++) e.push([x, p.z1 - 1, 2]); if (s === 'W') for (let z = p.z0; z < p.z1; z++) e.push([p.x0, z, 3]); if (s === 'E') for (let z = p.z0; z < p.z1; z++) e.push([p.x1 - 1, z, 1]); return e; }
  const sideBox = (p, s) => { const y0 = p.lvl * H_, y1 = y0 + H_ * .85, t = .26; return s === 'N' ? { x0: p.x0, x1: p.x1, z0: p.z0 - t, z1: p.z0 + t, y0, y1 } : s === 'S' ? { x0: p.x0, x1: p.x1, z0: p.z1 - t, z1: p.z1 + t, y0, y1 } : s === 'W' ? { x0: p.x0 - t, x1: p.x0 + t, z0: p.z0, z1: p.z1, y0, y1 } : { x0: p.x1 - t, x1: p.x1 + t, z0: p.z0, z1: p.z1, y0, y1 }; };
  const missingSide = (p, s, ws) => sideEdges(p, s).filter(([x, z, r]) => !ws.has(edgeKey(x, z, r)));
  function chunksOf(p) { const w = p.x1 - p.x0, d = p.z1 - p.z0, alongX = w >= d, len = alongX ? w : d, n = Math.min(4, len), out = []; for (let k = 0; k < n; k++) { const a = Math.floor(k * len / n), b = Math.floor((k + 1) * len / n); out.push(alongX ? { x0: p.x0 + a, x1: p.x0 + b, z0: p.z0, z1: p.z1 } : { x0: p.x0, x1: p.x1, z0: p.z0 + a, z1: p.z0 + b }); } return out; }
  const roofable = (p) => unlockedCats().includes('roof') && !S.layout.some(o => o.lvl > p.lvl && PART[o.part].kind === 'floor' && o.x >= p.x0 && o.x < p.x1 && o.z >= p.z0 && o.z < p.z1);
  function roofItems(p) { const alongX = (p.x1 - p.x0) >= (p.z1 - p.z0), lo = alongX ? p.z0 : p.x0, hi = (alongX ? p.z1 : p.x1) - 1, mid = (lo + hi) / 2, items = []; rcells(p).forEach(([x, z]) => { const v = alongX ? z : x; if (v === mid) return items.push({ x, z, part: 'roof_flat', rot: 0, half: 0 }); const first = v < mid; items.push({ x, z, part: 'roof_slope', rot: alongX ? (first ? 2 : 0) : (first ? 1 : 3), half: first ? 0 : 1 }); }); return items; }
  const hasRoofAt = (p, x, z) => S.layout.some(o => o.lvl === p.lvl && PART[o.part].kind === 'roof' && o.part !== 'roof_rail' && o.x === x && o.z === z);
  function bhStages(p) { const un = unlockedCats(), st = ['foundation', 'walls']; if (un.includes('openings')) st.push('open'); if (roofable(p)) st.push('roof'); st.push('design'); if ((ROOM_FURN[p.t] || []).length && un.includes(FURN_TAB[p.t] || 'furniture')) st.push('furn'); return st; }

  // ---- opening picks (same rules as Auto doors & windows, but one piece per site)
  function openPicks(p) {
    const info = boundaryInfo(roomLike(p)), plain = info.filter(x => PART[x.o.part].cat === 'walls' && x.o.part !== 'wall_half'), has = (re) => info.filter(x => re.test(x.o.part)).length, doors = has(/^door_|^arch$/), wins = has(/^window_|wall_glass/), pick = [];
    if (!doors && plain.length) { const sorted = plain.slice().sort((a, b) => (a.exterior - b.exterior) || (Math.abs(a.o.x - p.x0) - Math.abs(b.o.x - p.x0))), inner = sorted.find(x => !x.exterior), front = plain.filter(x => x.exterior && x.o.rot === 2)[0]; pick.push([inner || front || plain[Math.floor(plain.length / 2)], 'door_wood']); }
    const wantW = Math.max(0, 2 - wins);
    if (wantW) { const ext = plain.filter(x => x.exterior && !pick.some(q => q[0] === x)), bySide = {}; ext.forEach(x => (bySide[x.o.rot] = bySide[x.o.rot] || []).push(x)); Object.values(bySide).sort((a, b) => b.length - a.length).slice(0, wantW).forEach(arr => { arr.sort((a, b) => (a.o.x + a.o.z) - (b.o.x + b.o.z)); if (arr.length >= 3) pick.push([arr[Math.floor(arr.length / 2)], 'window_small']); else if (arr.length === 2) pick.push([arr[0], 'window_small']); }); }
    return { picks: pick, existing: (doors ? 1 : 0) + Math.min(2, wins) };
  }
  // ---- furniture placement search (walls first, facing in, doors kept free)
  function furnPlan(p, missing) {
    const cellSet = new Set(rcells(p).map(c => c.join())), blocked = new Set(), out = [];
    S.layout.filter(o => o.lvl === p.lvl && PART[o.part].kind === 'item' && PART[o.part].layer !== 'rug').forEach(o => WORLD.cellsOf(o).forEach(c => blocked.add(c.join())));
    boundaryInfo(roomLike(p)).filter(x => /^door_|^arch$/.test(x.o.part)).forEach(x => { const a = [x.o.x, x.o.z], b = [x.o.x + DIRS4[x.o.rot][0], x.o.z + DIRS4[x.o.rot][1]], inA = cellSet.has(a.join()), ins = inA ? a : b, oth = inA ? b : a; blocked.add(ins.join()); blocked.add([ins[0] + ins[0] - oth[0], ins[1] + ins[1] - oth[1]].join()); });
    let prev = null;
    missing.forEach(part => {
      let best = null;
      for (let rot = 0; rot < 4; rot++) { const fc = FACE[rot]; rcells(p).forEach(([cx, cz]) => { const o = { part, x: cx, z: cz, lvl: p.lvl, rot }, cells = WORLD.cellsOf(o); if (cells.some(q => !cellSet.has(q.join()) || blocked.has(q.join()))) return; const back = cells.filter(q => !cellSet.has([q[0] - fc[0], q[1] - fc[1]].join())).length; if (!back) return; const sc = back * 10 - (prev ? Math.hypot(cx - prev[0], cz - prev[1]) * 1.5 : 0) - (rot % 2 ? .1 : 0); if (!best || sc > best.sc) best = { o, sc, cells }; }); }
      if (!best) rcells(p).some(([cx, cz]) => { const o = { part, x: cx, z: cz, lvl: p.lvl, rot: 0 }, cells = WORLD.cellsOf(o); if (cells.every(q => cellSet.has(q.join()) && !blocked.has(q.join()))) { best = { o, cells }; return true; } return false; });
      if (!best) return; best.cells.forEach(q => blocked.add(q.join())); prev = [best.o.x, best.o.z]; out.push({ part, x: best.o.x, z: best.o.z, rot: best.o.rot, cells: best.cells });
    });
    return out;
  }
  const furnColor = (p, part, i) => { const pal = FURN_PAL[(p.style || {}).furn]; return pal && PART[part].paintable ? pal[i % pal.length] : PART[part].color; };

  // ---- one build action: pay, add pieces, swap pieces, remember for Undo
  function commit(cost, objs, swaps) {
    pay(cost); objs.forEach(o => S.layout.push(o)); const rec = (swaps || []).map(s => ({ id: s.o.id, part: s.o.part, color: s.o.color }));
    (swaps || []).forEach(s => { addInv(s.o.part, 1); s.o.part = s.part; s.o.color = PART[s.part].color; }); S.stats.placed += objs.length + rec.length;
    undoStack.push({ t: 'bulk', ids: objs.map(o => o.id), swap: rec, inv: cost.inv, coins: cost.coins }); return objs.map(o => o.id).concat(rec.map(r => r.id));
  }
  const countParts = (list) => list.reduce((a, p) => (a[p] = (a[p] || 0) + 1, a), {});

  // ---- compute the state of every stage and the glowing sites of the current one
  function bhCompute() {
    const p = bh.p, stages = bhStages(p), by = {}, lvl = p.lvl, y0 = lvl * H_, fs = floorSet(lvl), ws = wallSet(lvl); let cur = null;
    stages.forEach(st => {
      const o = { stage: st, total: 0, done: 0, sites: [] };
      if (st === 'foundation') { const fp = p.floorPart || typeOf(p).floor; chunksOf(p).forEach((c, i) => { o.total++; const cells = []; for (let x = c.x0; x < c.x1; x++) for (let z = c.z0; z < c.z1; z++) cells.push([x, z]); const miss = cells.filter(([x, z]) => !fs.has(x + ',' + z)); if (!miss.length) return o.done++; const cost = costOf({ [fp]: miss.length }); o.sites.push({ id: 'f' + i, key: 'f' + i, stage: st, box: { x0: c.x0, x1: c.x1, z0: c.z0, z1: c.z1, y0, y1: y0 + .35 }, cost, apply: () => commit(cost, miss.map(([x, z]) => mkObj(fp, x, z, 0, lvl, { rt: p.t })), null) }); }); }
      else if (st === 'walls') { (p.sides || []).forEach(s => { o.total++; const miss = missingSide(p, s, ws); if (!miss.length) return o.done++; const cost = costOf({ wall_plaster: miss.length }); o.sites.push({ id: 'w' + s, key: 'w' + s, stage: st, box: sideBox(p, s), cost, apply: () => commit(cost, miss.map(([x, z, r]) => mkObj('wall_plaster', x, z, r, lvl)), null) }); }); }
      else if (st === 'open') { const wallsOk = by.walls ? by.walls.done >= by.walls.total : true; if (wallsOk) { const op = openPicks(p); o.total = op.existing + op.picks.length; o.done = op.existing; op.picks.forEach(([x, part], i) => { const cost = costOf({ [part]: 1 }), c = WORLD.centerOf(x.o); o.sites.push({ id: 'o' + i, key: 'o' + x.o.id, stage: st, box: { x0: c[0] - .55, x1: c[0] + .55, z0: c[1] - .55, z1: c[1] + .55, y0, y1: y0 + H_ * .8 }, cost, apply: () => commit(cost, [], [{ o: x.o, part }]) }); }); } else o.total = 1; }
      else if (st === 'roof') { if (p.roofSkip) { o.total = 1; o.done = 1; } else { const items = roofItems(p); [0, 1].forEach(h => { const part = items.filter(i => i.half === h), miss = part.filter(i => !hasRoofAt(p, i.x, i.z)); o.total++; if (!miss.length) return o.done++; const cost = costOf(countParts(miss.map(i => i.part))), xs = part.map(i => i.x), zs = part.map(i => i.z); o.sites.push({ id: 'r' + h, key: 'r' + h, stage: st, box: { x0: Math.min(...xs), x1: Math.max(...xs) + 1, z0: Math.min(...zs), z1: Math.max(...zs) + 1, y0: y0 + H_, y1: y0 + H_ + .9 }, cost, apply: () => commit(cost, miss.map(i => mkObj(i.part, i.x, i.z, i.rot, lvl)), null) }); }); } }
      else if (st === 'design') { o.total = 1; o.done = p.designed ? 1 : 0; }
      else if (st === 'furn') { const need = ROOM_FURN[p.t] || [], have = S.layout.filter(q => q.lvl === lvl && PART[q.part].kind === 'item' && rcells(p).some(c => c[0] === q.x && c[1] === q.z)).map(q => q.part), missing = need.filter(id => !have.includes(id)); o.total = need.length; o.done = need.length - missing.length; if (missing.length) furnPlan(p, missing).forEach((f, i) => { const cost = costOf({ [f.part]: 1 }), xs = f.cells.map(c => c[0]), zs = f.cells.map(c => c[1]); o.sites.push({ id: 'i' + i, key: 'i' + f.part, stage: st, box: { x0: Math.min(...xs), x1: Math.max(...xs) + 1, z0: Math.min(...zs), z1: Math.max(...zs) + 1, y0, y1: y0 + .9 }, cost, apply: () => commit(cost, [mkObj(f.part, f.x, f.z, f.rot, lvl, { color: furnColor(p, f.part, i) })], null) }); }); }
      o.complete = st === 'design' ? !!p.designed : o.done >= o.total; by[st] = o; if (!cur && !o.complete) cur = o;
    });
    return { stages, by, cur };
  }

  // ---- open / close the panel
  function bhOpenPlan() { bh = { p: S.plan, key: rkey(S.plan), plan: true }; bhEnter(); }
  function bhOpenRoom(r) {
    const xs = r.cells.map(c => c[0]), zs = r.cells.map(c => c[1]), x0 = Math.min(...xs), x1 = Math.max(...xs) + 1, z0 = Math.min(...zs), z1 = Math.max(...zs) + 1; if ((x1 - x0) * (z1 - z0) !== r.cells.length) { bh = null; return; }
    const f = r.floors.find(o => o.rt), tid = f ? f.rt : rtOf(r), key = r.lvl + ':' + x0 + ',' + z0, fl = r.floors[0] ? r.floors[0].part : null, p = { t: tid, x0, z0, x1, z1, lvl: r.lvl, floorPart: fl, sides: ['N', 'E', 'S', 'W'].filter(s => missingSide({ x0, z0, x1, z1 }, s, wallSet(r.lvl)).length), style: {}, chosen: {}, designed: !!S.rscore[key], best: 0, rw: {}, local: true };
    bh = { p, key, plan: false }; bhEnter();
  }
  function bhEnter() {
    const p = bh.p, B = $('#build'); B.classList.add('roomedit', 'guided'); B.classList.toggle('bhplan', bh.plan); $('#reName').textContent = typeOf(p).name; $$('.sg').forEach(b => b.classList.toggle('on', +b.dataset.l === p.lvl)); WORLD.setLevel(p.lvl); WORLD.setInterior(true); WORLD.focusRoom(rcells(p), p.lvl); { const g = WORLD._goal, land = innerWidth > innerHeight, dr = $('#build .drawer'); g.dist = Math.min(g.dist * (land ? 1.05 : 1.3), (WORLD._fit || 24) * 1.5); if (land) { WORLD.setInset(dr ? dr.offsetWidth : 0); WORLD.focus(-50, (dr ? dr.offsetWidth : 0) / 2); } else WORLD.focus(-60); }
    WORLD.setRoomLabel(rcells(p), p.lvl, typeOf(p).name); WORLD.setRoomMode(false); $('#roomBar').classList.add('hidden'); WORLD.setRoomPreview(null); bhRefresh();
  }
  function bhStop() { comboPay(); bh = null; WORLD.setSites(null); $('#guide').classList.add('hidden'); $('#build').classList.remove('guided', 'bhplan'); if (!roomEdit) $('#build').classList.remove('roomedit'); }
  function guideRefresh() {
    const on = $('#build').classList.contains('on') && buildMode() === 'room';
    if (!on) { if (bh) bhStop(); return; }
    if (S.plan && !roomEdit) { if (!bh || bh.p !== S.plan) bhOpenPlan(); else bhRefresh(); }
    else if (roomEdit) { if (!bh || bh.key !== roomEdit.key || bh.plan) bhOpenRoom(roomEdit.room); else bhRefresh(); }
    else if (bh) bhStop();
  }
  function bhStartPlan(p) {
    if (S.plan) { toast('Finish your current room first'); return bhOpenPlan(); }
    if (!p.ok && !/^Need/.test(p.reason)) return; const r = p.r, t = p.t, ws = wallSet(p.lvl), box = { x0: r.x0, z0: r.z0, x1: r.x1, z1: r.z1 };
    S.plan = { t: t.id, x0: r.x0, z0: r.z0, x1: r.x1, z1: r.z1, lvl: p.lvl, floorPart: p.floorPart, sides: ['N', 'E', 'S', 'W'].filter(s => missingSide(box, s, ws).length), style: {}, chosen: {}, designed: false, best: 0, rw: {} };
    roomTool.rect = null; roomTool.plan = null; $('#roomBar').classList.add('hidden'); WORLD.setRoomPreview(null); save(); sfx('hammer'); vib(25); tutEvent('built'); bhOpenPlan(); toast(`${t.name}: tap the glowing spots to build`);
  }

  // ---- panel
  function bhRefresh() {
    if (!bh) return; const p = bh.p, st = bhCompute(); bh.sites = st.cur ? st.cur.sites : []; bh.st = st; const g = $('#guide'), cur = st.cur;
    $('.gsteps', g).innerHTML = st.stages.map(s => `<span class="gs${st.by[s].complete ? ' done' : ''}${cur && cur.stage === s ? ' cur' : ''}">${BH_CHIP[s]}</span>`).join('') + `<span class="gs${!cur ? ' done cur' : ''}">Done</span>`;
    const stage = cur ? cur.stage : null, goals = questProgress(), allDone = goals.every(q => q.have >= q.q.n), go = $('#gdGo'), un = unlockedCats(), locked = !un.includes('openings') || !(ROOM_FURN[p.t] || []).length || !un.includes(FURN_TAB[p.t] || 'furniture');
    $('#bhTitle').textContent = stage ? BH_NAME[stage] : 'ROOM COMPLETE'; const tot = cur ? (stage === 'design' ? 1 : cur.total) : 1, dn = cur ? cur.done : 1;
    $('#bhCount').textContent = stage === 'design' || !stage ? '' : `${dn}/${tot}`; $('#bhFill').style.width = (stage === 'design' ? 100 : Math.round(dn / Math.max(1, tot) * 100)) + '%';
    $('#gdTxt').textContent = stage ? BH_HELP[stage] + (locked && stage === 'design' ? ' Doors, windows and furniture unlock in later chapters.' : '') : (allDone ? 'All chapter goals are done!' : 'Your room is ready.');
    const design = $('#bhDesign'); design.classList.toggle('hidden', !(stage === 'design' || !stage)); if (stage === 'design' || !stage) bhRenderDesign();
    $('#gdSkip').classList.toggle('hidden', stage !== 'roof'); $('#gdDone').classList.toggle('hidden', !allDone || !stage && !bh.plan);
    go.disabled = false; go.textContent = stage === 'design' ? 'Continue ▶' : stage === 'furn' ? '🛋 Furnish for me' : stage ? '🔨 Build it all' : (allDone ? 'Complete chapter ▶' : '＋ Next task');
    g.classList.remove('hidden'); WORLD.setSites(bh.sites.map(s => ({ id: s.id, x0: s.box.x0, x1: s.box.x1, y0: s.box.y0, y1: s.box.y1, z0: s.box.z0, z1: s.box.z1, color: BH_COL[s.stage] })));
    if (!cur && S.plan === p) bhComplete(); else if (!cur && !bh.plan && !bh.shown) bh.shown = 1;
  }
  const curFloorSty = (p) => { const f = S.layout.find(o => o.lvl === p.lvl && PART[o.part].kind === 'floor' && o.x >= p.x0 && o.x < p.x1 && o.z >= p.z0 && o.z < p.z1); return f ? Object.keys(FLOOR_STY).find(k => FLOOR_STY[k] === f.part) || null : null; };
  const curWallSty = (p) => { const w = roomWallPieces(roomLike(p)).find(o => PART[o.part].cat === 'walls' && o.part !== 'wall_half'); if (!w) return null; if (w.part === 'wall_brick') return 'brick'; return Object.keys(WALL_STY).find(k => WALL_STY[k][0] === w.part && WALL_STY[k][1] === (w.color || '').toUpperCase()) || null; };
  function bhRenderDesign() {
    const p = bh.p, rows = [['floor', 'Floor', ['wood', 'tile', 'marble'], curFloorSty(p)], ['wall', 'Wall', ['cream', 'modern', 'brick'], curWallSty(p)]], un = unlockedCats();
    if ((ROOM_FURN[p.t] || []).length && un.includes(FURN_TAB[p.t] || 'furniture')) rows.push(['furn', 'Furniture', ['basic', 'modern', 'luxury'], (p.style || {}).furn || 'basic']);
    const D = $('#bhDesign'); D.innerHTML = rows.map(([k, lab, opts, sel]) => `<div class="bhrow"><label>${lab}</label>${opts.map(v => `<button class="bhopt${sel === v ? ' on' : ''}" data-k="${k}" data-v="${v}">${v[0].toUpperCase() + v.slice(1)}</button>`).join('')}</div>`).join('');
    $$('.bhopt', D).forEach(b => b.onclick = () => bhStyle(b.dataset.k, b.dataset.v));
  }
  function bhStyle(kind, v) {
    const p = bh.p, cells = new Set(rcells(p).map(c => c.join())); let ids = [];
    if (kind === 'floor') { const part = FLOOR_STY[v]; S.layout.filter(o => o.lvl === p.lvl && PART[o.part].kind === 'floor' && o.part !== 'path_stone' && cells.has(o.x + ',' + o.z)).forEach(o => { o.part = part; o.color = PART[part].color; ids.push(o.id); }); p.floorPart = part; }
    else if (kind === 'wall') { const [part, col] = WALL_STY[v]; roomWallPieces(roomLike(p)).filter(o => PART[o.part].cat === 'walls' && o.part !== 'wall_half').forEach(o => { o.part = part; o.color = col || PART[part].color; ids.push(o.id); }); }
    else { let i = 0; S.layout.filter(o => o.lvl === p.lvl && PART[o.part].kind === 'item' && PART[o.part].layer !== 'rug' && WORLD.cellsOf(o).some(c => cells.has(c.join()))).forEach(o => { o.color = v === 'basic' ? PART[o.part].color : furnColor({ style: { furn: v } }, o.part, i++); ids.push(o.id); }); }
    p.style = p.style || {}; p.style[kind] = v; p.chosen = p.chosen || {}; p.chosen[kind] = 1; WORLD.redraw(); WORLD.buildIn(ids); save(); sfx('pop'); renderQuest(); bhRefresh();
  }

  // ---- effects: floating coins, combo banner
  function floatCoins(n, sx, sy, txt) {
    const el = document.createElement('div'), cv = $('#reno3d canvas').getBoundingClientRect(), ap = $('#app').getBoundingClientRect(); el.className = 'fcoin'; el.innerHTML = txt || `+${n} ${coinI}`; el.style.left = (sx + cv.left - ap.left) + 'px'; el.style.top = (sy + cv.top - ap.top) + 'px'; $('#app').appendChild(el); setTimeout(() => el.remove(), 1100);
  }
  function banner(txt, cls) { const b = $('#bhCombo'); b.textContent = txt; b.className = 'bhcombo ' + (cls || ''); void b.offsetWidth; b.classList.add('pop'); clearTimeout(b._t); b._t = setTimeout(() => b.classList.add('hidden'), 1300); }
  function comboTick() { const n = combo.n; combo.n = n + 1; clearTimeout(combo.timer); combo.timer = setTimeout(comboPay, 4300); if (combo.n >= 2) { banner(`BUILD COMBO ×${Math.min(combo.n, 5)}`, 'combo'); sfx('tick'); } if (bh && bh.p) bh.p.best = Math.max(bh.p.best || 0, combo.n); }
  function comboPay() {
    clearTimeout(combo.timer); const n = combo.n; combo.n = 0; if (n < 2) return; const bonus = (Math.min(n, 5) - 1) * 3 + Math.max(0, n - 5) * 2; S.coins += bonus; updateHud(); save();
    const cv = $('#reno3d canvas').getBoundingClientRect(); floatCoins(bonus, cv.width / 2, cv.height * .62, `COMBO BONUS +${bonus} ${coinI}`); sfx('win');
  }

  // ---- tapping a glowing site
  function bhTap(id, quick) {
    if (!bh || bhBusy) return false; const fresh = bhCompute(), s = fresh.cur && fresh.cur.sites.find(x => x.id === id); if (!s) return false; bh.st = fresh; bh.sites = fresh.cur.sites;
    if (S.coins < s.cost.coins) { needCoins(s.cost.coins - S.coins); return false; }
    bhBusy = true; const cx = (s.box.x0 + s.box.x1) / 2, cz = (s.box.z0 + s.box.z1) / 2, top = s.box.y1; WORLD.hammer(cx, top - .2, cz); sfx('hammer'); vib(12);
    setTimeout(() => {
      if (!bh) { bhBusy = false; return; } const p = bh.p, stage = s.stage, ids = s.apply(); WORLD.redraw(); WORLD.buildIn(ids); WORLD.dustAt(cx, s.box.y0 + .2, cz, 10); sfx('pop');
      const sp = WORLD.toScreen(cx, cz, (s.box.y0 + s.box.y1) / 2); let reward = 0; p.rw = p.rw || {}; if (!p.rw[s.key]) { p.rw[s.key] = 1; reward = 2; S.coins += reward; } if (sp) { floatCoins(reward, sp[0], sp[1] - 20, reward ? `+${reward} ${coinI}` : '✓'); }
      comboTick(); save(); updateHud(); renderQuest(); checkQuestToast(); bhBusy = false; const before = bh.st && bh.st.by[stage]; bhRefresh();
      const after = bh && bh.st && bh.st.by[stage]; if (after && after.complete && before && !before.complete) { comboPay(); banner(BH_NAME[stage].replace(/^(BUILD|ADD) /, '') + ' DONE!', 'done'); sfx('fix'); confetti(18); }
    }, quick ? 330 : 430);
    return true;
  }
  function bhAuto() {
    if (!bh || !bh.st || !bh.st.cur) return; const stage = bh.st.cur.stage; if (stage === 'design') { bh.p.designed = true; save(); sfx('click'); return bhRefresh(); }
    const step = () => { if (!bh || !bh.st || !bh.st.cur || bh.st.cur.stage !== stage || !bh.sites.length) return; if (bhTap(bh.sites[0].id, true)) setTimeout(step, 620); }; step();
  }
  WORLD.cb.siteTap = (id) => bhTap(id);

  // ---- room complete: score, reward, next task
  function bhScore() {
    const p = bh.p, by = bh.st.by, chosenN = ['floor', 'wall', 'furn'].filter(k => (p.chosen || {})[k]).length, need = by.furn ? 3 : 2, design = 1 + (chosenN >= Math.ceil(need / 2) ? 1 : 0) + (chosenN >= need ? 1 : 0);
    const openOK = by.open ? by.open.complete : true, furnOK = by.furn ? by.furn.complete : true, fun = 1 + (openOK ? 1 : 0) + (furnOK ? 1 : 0), nice = ((p.style || {}).furn && p.style.furn !== 'basic') || (p.style || {}).floor === 'marble' || (p.style || {}).wall === 'brick';
    return { d: design, c: 1 + (furnOK ? 1 : 0) + (nice ? 1 : 0), f: fun };
  }
  function bhComplete() {
    const p = bh.p; if (p.fin) return; p.fin = true; const sc = bhScore(), key = rkey(p), nm = typeOf(p).name; comboPay();
    const reward = 15 + 8 * (sc.d + sc.c + sc.f) + Math.max(0, (p.best || 0) - 1) * 2; S.coins += reward; S.rscore[key] = { d: sc.d, c: sc.c, f: sc.f, at: Date.now() }; S.plan = null; save(); updateHud(); renderQuest(); checkQuestToast();
    const room = detectRooms(S.layout).find(r => r.key === key), goals = questProgress(), allDone = goals.every(q => q.have >= q.q.n), sg = suggestNext(), sgn = sg && (ROOM_TYPES.find(t => t.id === sg) || {}).name; bhStop();
    sfx('win'); confetti(80); vib([40, 60, 80]);
    sheet({ ribbon: ['ROOM COMPLETE!', 'green'], close: false, html: `<p class="sub"><b>${nm}</b> is finished.</p><div class="score"><div><span>Design</span><b>${starsTxt(sc.d)}</b></div><div><span>Comfort</span><b>${starsTxt(sc.c)}</b></div><div><span>Function</span><b>${starsTxt(sc.f)}</b></div></div><div class="coinline">+${reward} ${coinI}</div>`,
      actions: [allDone ? { text: 'Complete chapter ▶', fn: () => completeNow() } : { text: `＋ Next task${sgn ? ': ' + sgn : ''}`, fn: () => nextRoom() }, { text: 'Admire & decorate', cls: 'secondary', fn: () => { if (room) enterRoomEdit(room); } }] });
  }
  $('#gdGo').onclick = () => { sfx('click'); if (!bh) return; const st = bh.st; if (!st) return; if (!st.cur) { const allDone = questProgress().every(q => q.have >= q.q.n); if (allDone) completeNow(); else nextRoom(); } else bhAuto(); };
  $('#gdDone').onclick = () => { sfx('click'); completeNow(); };
  $('#gdSkip').onclick = () => { sfx('click'); if (bh) { bh.p.roofSkip = true; save(); bhRefresh(); } };
  $('#reMore').onclick = () => { sfx('click'); $('.retools').classList.toggle('open'); };
  // leaving mid-construction: progress is saved, ask first
  $('#btnBuildDone').addEventListener('click', (e) => {
    if (!bh || !S.plan || buildMode() !== 'room') return; e.stopImmediatePropagation(); e.preventDefault(); sfx('click');
    sheet({ ribbon: ['Leave building?'], html: `<p class="body">Your ${typeOf(S.plan).name} is still under construction. Everything is saved — you can continue any time from Build.</p>`, actions: [{ text: 'Keep building', cls: 'primary' }, { text: 'Back to home', cls: 'secondary', fn: () => exitBuild() }] });
  }, true);
