  // ------------------------------------------------------------ ROOM-BASED BUILDING (default) + Advanced Build (Dream Home) + tutorial
  const ROOM_TYPES = [
    { id: 'living', name: 'Living Room', part: 'sofa', floor: 'floor_wood' }, { id: 'kitchen', name: 'Kitchen', part: 'stove', floor: 'floor_tile' },
    { id: 'bedroom', name: 'Bedroom', part: 'bed', floor: 'floor_carpet' }, { id: 'bath', name: 'Bathroom', part: 'bathtub', floor: 'floor_marble' },
    { id: 'hall', name: 'Hall', part: 'stairs', floor: 'floor_concrete' }, { id: 'study', name: 'Study', part: 'bookshelf', floor: 'floor_wood' },
  ];
  // predefined room sizes (story mode) and the furniture each room type needs
  const ROOM_SIZE = { living: [4, 4], kitchen: [3, 3], bedroom: [3, 3], bath: [2, 3], hall: [2, 4], study: [3, 3] };
  const ROOM_FURN = { living: ['sofa', 'coffee_table'], kitchen: ['counter', 'stove', 'fridge', 'sink'], bedroom: ['bed', 'wardrobe'], bath: ['bathtub', 'toilet', 'basin'], hall: [], study: ['bookshelf'] };
  const FURN_TAB = { living: 'furniture', kitchen: 'kitchen', bedroom: 'bedroom', bath: 'bath', hall: 'furniture', study: 'furniture' }, GRID = 12;
  const ROOM_TABS = ['rooms', 'roof', 'openings', 'build', 'furniture', 'decor', 'kitchen', 'bath', 'bedroom', 'garden'];
  const buildMode = () => (S.adv && finished() ? 'adv' : 'room');
  let bh = null; // Build Home panel state (flow_bh.js)
  const roomTool = { type: 'living', rect: null, plan: null, flip: false, cands: [], ci: 0 };
  const EDG = [[0, -.5], [.5, 0], [0, .5], [-.5, 0]], DIRS4 = [[0, -1], [1, 0], [0, 1], [-1, 0]];
  const edgeKey = (x, z, rot) => ((x + .5 + EDG[rot][0]) * 2) + ',' + ((z + .5 + EDG[rot][1]) * 2);
  const mkObj = (part, x, z, rot, lvl, extra) => Object.assign({ id: 'o' + (S.nextId++), part, x, z, lvl, rot, color: PART[part].color }, extra || {});
  // ---- paying: owned materials first, missing parts are bought with coins at shop price
  function costOf(counts) { const inv = {}; let coins = 0; Object.entries(counts).forEach(([p, n]) => { const use = Math.min(S.inv[p] || 0, n); inv[p] = use; coins += (n - use) * PART[p].price; }); return { inv, coins, counts }; }
  function pay(c) { Object.entries(c.inv).forEach(([p, n]) => { if (!n) return; S.inv[p] -= n; if (!S.inv[p]) delete S.inv[p]; }); S.coins -= c.coins; }
  const costText = (c) => { const own = Object.values(c.inv).reduce((a, b) => a + b, 0), tot = Object.values(c.counts).reduce((a, b) => a + b, 0); return c.coins ? `${own ? own + ' owned + ' : ''}${c.coins} coins` : `free (${tot} from your materials)`; };
  function bulkUndo(op) { const L = S.layout; (op.swap || []).forEach(r => { const o = L.find(x => x.id === r.id); if (!o) return; S.inv[r.part] = Math.max(0, (S.inv[r.part] || 0) - 1); if (!S.inv[r.part]) delete S.inv[r.part]; o.part = r.part; o.color = r.color; }); if (op.swap) S.stats.placed = Math.max(0, S.stats.placed - op.swap.length); WORLD.redraw(); op.ids.forEach(id => { const i = L.findIndex(o => o.id === id); if (i >= 0) L.splice(i, 1); }); S.coins += op.coins; Object.entries(op.inv).forEach(([p, n]) => n && addInv(p, n)); S.stats.placed = Math.max(0, S.stats.placed - op.ids.length); if (op.ids.length && roomEdit && !S.layout.some(o => o.lvl === roomEdit.lvl && PART[o.part].kind === 'floor' && roomEdit.cells.some(c => c[0] === o.x && c[1] === o.z))) { exitRoomEdit(); refreshBuildUI(); } }

  // ---- plan a room from a dragged rectangle
  function planRoom(r, t) {
    const lvl = WORLD.level, w = r.x1 - r.x0, d = r.z1 - r.z0, res = { ok: false, reason: '', floors: [], walls: [], r, lvl, t, cost: null };
    if (w < 2 || d < 2) { res.reason = 'Make it at least 2 × 2'; return res; }
    const have = new Set(S.layout.filter(o => o.lvl === lvl && PART[o.part].kind === 'floor' && o.part !== 'path_stone').map(o => o.x + ',' + o.z));
    const blocked = new Set(); S.layout.filter(o => o.lvl === lvl && PART[o.part].kind === 'item' && PART[o.part].layer !== 'rug').forEach(o => WORLD.cellsOf(o).forEach(c => blocked.add(c.join())));
    for (let x = r.x0; x < r.x1; x++) for (let z = r.z0; z < r.z1; z++) {
      const k = x + ',' + z; if (have.has(k)) { res.reason = 'Overlaps another room'; return res; }
      if (lvl === 0 && WORLD.debris.some(i => WORLD.DEBRIS[i][0] === x && WORLD.DEBRIS[i][1] === z)) { res.reason = 'Clear the debris first — tap it'; return res; }
      if (blocked.has(k)) { res.reason = 'Furniture is in the way'; return res; }
      res.floors.push([x, z]);
    }
    const ex = new Set(S.layout.filter(o => o.lvl === lvl && PART[o.part].kind === 'wall').map(o => edgeKey(o.x, o.z, o.rot))), add = (x, z, rot) => { if (!ex.has(edgeKey(x, z, rot))) res.walls.push({ x, z, rot }); };
    for (let x = r.x0; x < r.x1; x++) { add(x, r.z0, 0); add(x, r.z1 - 1, 2); } for (let z = r.z0; z < r.z1; z++) { add(r.x0, z, 3); add(r.x1 - 1, z, 1); }
    res.floorPart = roomTool.floorPart && roomTool.floorFor === t.id ? roomTool.floorPart : t.floor; res.cost = costOf({ [res.floorPart]: res.floors.length, wall_plaster: res.walls.length });
    res.ok = S.coins >= res.cost.coins; if (!res.ok) res.reason = `Need ${res.cost.coins - S.coins} more coins`; return res;
  }
  function refreshBuildUI() { try { if ($('#build').classList.contains('on')) { renderTabs(); renderItems(); refreshRoomPlan(); } } catch (e) { } }
  function refreshRoomPlan() {
    const bar = $('#roomBar'); if (!roomTool.rect || curCat !== 'rooms' || roomEdit || bh || S.plan) { bar.classList.add('hidden'); WORLD.setRoomPreview(null); roomTool.plan = null; return; }
    const t = ROOM_TYPES.find(x => x.id === roomTool.type), p = roomTool.plan = planRoom(roomTool.rect, t), w = p.r.x1 - p.r.x0, d = p.r.z1 - p.r.z0;
    const free = buildMode() === 'adv'; WORLD.setRoomPreview(roomTool.rect, p.ok, free ? `${w} × ${d}` : t.name); bar.classList.remove('hidden'); bar.classList.toggle('story', !free); $('#rbRot').style.display = !free && w !== d ? '' : 'none';
    $('#rInfo').innerHTML = p.ok ? `<b>${t.name}${free ? ` ${w}×${d}` : ''}</b><br>${costText(p.cost)}` : `<b>${p.reason}</b>`; $('#rbOk').disabled = !p.ok && !/^Need/.test(p.reason);
    hint(p.ok ? (free ? 'Looks good — tap ✓ Build, or drag again to resize' : 'Tap ✓ Build — or tap another spot to move the room') : p.reason);
  }
  WORLD.cb.roomRect = null; // bound in bindWorldExt
  // ---- story mode: a ghost room of a predefined size is placed automatically at a sensible, valid spot
  function spotsFor(t) {
    const [bw, bd] = ROOM_SIZE[t.id], w = roomTool.flip ? bd : bw, d = roomTool.flip ? bw : bd, lvl = WORLD.level, out = [];
    const flo = (l) => S.layout.filter(o => o.lvl === l && PART[o.part].kind === 'floor' && o.part !== 'path_stone'), fl = flo(lvl), fs = new Set(fl.map(o => o.x + ',' + o.z)), gs = lvl > 0 ? new Set(flo(lvl - 1).map(o => o.x + ',' + o.z)) : null;
    const tx = fl.length ? fl.reduce((a, o) => a + o.x + .5, 0) / fl.length : GRID / 2, tz = fl.length ? fl.reduce((a, o) => a + o.z + .5, 0) / fl.length : GRID / 2 + 1;
    for (let x0 = 0; x0 + w <= GRID; x0++) for (let z0 = 0; z0 + d <= GRID; z0++) {
      const r = { x0, z0, x1: x0 + w, z1: z0 + d }, p = planRoom(r, t); if (!p.floors.length || (!p.ok && !/^Need/.test(p.reason))) continue;
      let adj = 0, below = 0; for (let x = x0; x < x0 + w; x++) for (let z = z0; z < z0 + d; z++) { if (gs && gs.has(x + ',' + z)) below++; }
      for (let x = x0 - 1; x <= x0 + w; x++) for (let z = z0 - 1; z <= z0 + d; z++) { const inside = x >= x0 && x < x0 + w && z >= z0 && z < z0 + d; if (!inside && (x === x0 - 1 || x === x0 + w) !== (z === z0 - 1 || z === z0 + d) && fs.has(x + ',' + z)) adj++; }
      const score = Math.hypot(x0 + w / 2 - tx, z0 + d / 2 - tz) * (fl.length ? .6 : 1) - (gs ? below * 1.5 : 0) - Math.min(adj, 4) * 1.2 - (adj && !gs ? 3 : 0);
      out.push({ r, score });
    }
    out.sort((a, b) => a.score - b.score); const pick = []; out.forEach(c => { if (pick.length < 10 && !pick.some(q => Math.abs(q.r.x0 - c.r.x0) + Math.abs(q.r.z0 - c.r.z0) < 3)) pick.push(c); }); return pick.map(c => c.r);
  }
  function autoSpot(near) {
    const t = ROOM_TYPES.find(x => x.id === roomTool.type); roomTool.cands = spotsFor(t); roomTool.ci = 0;
    if (near && roomTool.cands.length) { let best = 1e9; roomTool.cands.forEach((c, i) => { const dd = Math.hypot(c.x0 - near.x0, c.z0 - near.z0); if (dd < best) { best = dd; roomTool.ci = i; } }); }
    roomTool.rect = roomTool.cands[roomTool.ci] || null; refreshRoomPlan();
    if (!roomTool.rect) { $('#roomBar').classList.add('hidden'); hint(`No free space for a ${t.name} on this floor — try the other floor or clear debris`); }
  }
  const storyRooms = () => $('#build').classList.contains('on') && buildMode() === 'room' && curCat === 'rooms' && !roomEdit && !bh && !S.plan;
  function ensureGhost() { if (storyRooms() && !roomTool.rect) autoSpot(); }
  function buildRoomNow() {
    const p = roomTool.plan; if (!p) return; if (buildMode() === 'room') return bhStartPlan(p); if (!p.ok) { if (/^Need/.test(p.reason)) needCoins(p.cost.coins - S.coins); return; } const t = p.t; pay(p.cost);
    const objs = [...p.floors.map(([x, z]) => mkObj(p.floorPart, x, z, 0, p.lvl, { rt: t.id })), ...p.walls.map(w => mkObj('wall_plaster', w.x, w.z, w.rot, p.lvl))];
    objs.forEach(o => S.layout.push(o)); S.stats.placed += objs.length; undoStack.push({ t: 'bulk', ids: objs.map(o => o.id), inv: p.cost.inv, coins: p.cost.coins });
    const r0 = p.r; roomTool.rect = null; roomTool.plan = null; $('#roomBar').classList.add('hidden'); WORLD.setRoomPreview(null);
    WORLD.redraw(); WORLD.buildIn(objs.map(o => o.id)); save(); sfx('hammer'); vib(25); confetti(20); updateHud(); renderItems(); renderQuest(); checkQuestToast(); tutEvent('built');
    const room = detectRooms(S.layout).find(r => r.lvl === p.lvl && r.cells.some(c => c[0] === r0.x0 && c[1] === r0.z0));
    toast(`${t.name} built! Follow the steps: Door → Windows → Furniture`); if (room) setTimeout(() => enterRoomEdit(room), 450);
  }
  // ---- customizing a room
  const boundaryInfo = (r) => { const set = new Set(r.cells.map(c => c.join())), fl = new Set(S.layout.filter(o => o.lvl === r.lvl && PART[o.part].kind === 'floor' && o.part !== 'path_stone').map(o => o.x + ',' + o.z)); return roomWallPieces(r).map(o => { const a = [o.x, o.z], b = [o.x + DIRS4[o.rot][0], o.z + DIRS4[o.rot][1]], out = set.has(a.join()) ? b : a; return { o, outside: out, exterior: !fl.has(out.join()) }; }); };
  function swapPieces(list, part) {
    const n = list.length; if (!n) return toast('Nothing to change'); const c = costOf({ [part]: n }); if (S.coins < c.coins) return needCoins(c.coins - S.coins);
    pay(c); const rec = list.map(o => ({ id: o.id, part: o.part, color: o.color })); list.forEach(o => { addInv(o.part, 1); o.part = part; o.color = PART[part].color; }); S.stats.placed += n; undoStack.push({ t: 'bulk', ids: [], swap: rec, inv: c.inv, coins: c.coins }); save(); WORLD.redraw(); renderItems(); updateHud(); renderQuest(); sfx('pop'); return true;
  }
  function autoOpenings(which) {
    if (!roomEdit) return toast('Open a room first'); const info = boundaryInfo(roomEdit.room), plain = info.filter(x => PART[x.o.part].cat === 'walls' && x.o.part !== 'wall_half'), has = (re) => info.filter(x => re.test(x.o.part)).length;
    const doors = has(/^door_|^arch$/), wins = has(/^window_|wall_glass/); let nd = 0, nw = 0; const pick = [];
    if (!doors && plain.length && which !== 'windows') { const sorted = plain.slice().sort((a, b) => (a.exterior - b.exterior) || (Math.abs(a.o.x - roomEdit.cells[0][0]) - Math.abs(b.o.x - roomEdit.cells[0][0]))); const inner = sorted.find(x => !x.exterior), front = plain.filter(x => x.exterior && x.o.rot === 2)[0], d = inner || front || plain[Math.floor(plain.length / 2)]; pick.push([d, 'door_wood']); nd = 1; }
    if (!wins && which !== 'door') { const ext = plain.filter(x => x.exterior && !pick.some(p => p[0] === x)); const bySide = {}; ext.forEach(x => (bySide[x.o.rot] = bySide[x.o.rot] || []).push(x)); Object.values(bySide).sort((a, b) => b.length - a.length).slice(0, 2).forEach(arr => { arr.sort((a, b) => (a.o.x + a.o.z) - (b.o.x + b.o.z)); if (arr.length >= 3) { pick.push([arr[Math.floor(arr.length / 2)], 'window_small']); nw++; } else if (arr.length === 2) { pick.push([arr[0], 'window_small']); nw++; } }); }
    if (!pick.length) return toast(which === 'door' ? (doors ? 'This room already has a door' : 'No free wall for a door') : which === 'windows' ? (wins ? 'This room already has windows' : 'No free outside wall for windows') : (doors || wins ? 'This room already has doors and windows' : 'No free wall to use'));
    const counts = {}; pick.forEach(([, part]) => counts[part] = (counts[part] || 0) + 1); const c = costOf(counts); if (S.coins < c.coins) return needCoins(c.coins - S.coins);
    pay(c); const rec = pick.map(([x]) => ({ id: x.o.id, part: x.o.part, color: x.o.color })); pick.forEach(([x, part]) => { addInv(x.o.part, 1); x.o.part = part; }); S.stats.placed += pick.length; undoStack.push({ t: 'bulk', ids: [], swap: rec, inv: c.inv, coins: c.coins }); save(); WORLD.redraw(); renderQuest(); renderItems(); updateHud(); checkQuestToast(); sfx('fix'); toast(`Added ${nd ? '1 door' : ''}${nd && nw ? ' and ' : ''}${nw ? nw + ' window' + (nw > 1 ? 's' : '') : ''}`);
  }
  function stylePopup(kind) {
    const pal = $('#palette'); if (!pal.classList.contains('hidden') && pal.dataset.kind === 'style' + kind) { pal.classList.add('hidden'); return; }
    pal.innerHTML = ''; pal.dataset.kind = 'style' + kind; pal.classList.add('stylepop');
    const parts = kind === 'floor' ? ['floor_wood', 'floor_tile', 'floor_marble', 'floor_carpet', 'floor_concrete', 'floor_parquet', 'floor_slate'] : ['wall_plaster', 'wall_brick', 'wall_stone', 'wall_wood'];
    parts.filter(id => PART[id] && (!PART[id].reward || S.unlocked[id])).forEach(id => { const b = document.createElement('button'); b.className = 'stl'; b.innerHTML = `${thumb(`p:${id}:0`, 46, 40)}<span>${PART[id].name.replace(' Floor', '').replace(' Wall', '')}</span><small>${S.inv[id] ? '×' + S.inv[id] : PART[id].price + '¢'}</small>`;
      b.onclick = () => { const r = roomEdit.room, list = kind === 'floor' ? S.layout.filter(o => o.lvl === r.lvl && PART[o.part].kind === 'floor' && o.part !== 'path_stone' && o.part !== id && r.cells.some(c => c[0] === o.x && c[1] === o.z)) : roomWallPieces(r).filter(o => PART[o.part].cat === 'walls' && o.part !== 'wall_half' && o.part !== id); swapPieces(list, id); }; pal.appendChild(b); });
    pal.classList.remove('hidden'); $('#selBar').classList.add('hidden');
  }
  $('#reNew').onclick = () => { sfx('click'); exitRoomEdit(); curCat = 'rooms'; renderTabs(); renderItems(); buildInsets(); WORLD.resetFocus(); hint('Drag on the grid to place your next room'); };
  $('#reAuto').onclick = () => { sfx('click'); autoOpenings(); };
  $('#reFloorS').onclick = () => { sfx('click'); stylePopup('floor'); };
  $('#reWallS').onclick = () => { sfx('click'); stylePopup('wall'); };

  // ---- automatic roof
  function roofPlan(part) {
    const floors = S.layout.filter(o => PART[o.part].kind === 'floor' && o.part !== 'path_stone'); if (!floors.length) return { err: 'Build a room first' };
    const top = Math.max(...floors.map(o => o.lvl)), cells = new Set(floors.filter(o => o.lvl === top).map(o => o.x + ',' + o.z)), seen = new Set(), items = [];
    cells.forEach(k => { if (seen.has(k)) return; const [sx, sz] = k.split(',').map(Number), q = [[sx, sz]], comp = []; seen.add(k); while (q.length) { const [x, z] = q.pop(); comp.push([x, z]); DIRS4.forEach(([dx, dz]) => { const nk = (x + dx) + ',' + (z + dz); if (cells.has(nk) && !seen.has(nk)) { seen.add(nk); q.push([x + dx, z + dz]); } }); }
      const xs = comp.map(c => c[0]), zs = comp.map(c => c[1]), x0 = Math.min(...xs), x1 = Math.max(...xs), z0 = Math.min(...zs), z1 = Math.max(...zs), alongX = (x1 - x0) >= (z1 - z0);
      comp.forEach(([x, z]) => { if (part === 'roof_flat') return items.push([x, z, 'roof_flat', 0]); const lo = alongX ? z0 : x0, hi = alongX ? z1 : x1, v = alongX ? z : x, mid = (lo + hi) / 2;
        if (v === mid) return items.push([x, z, 'roof_flat', 0]); const first = v < mid; items.push([x, z, part, alongX ? (first ? 2 : 0) : (first ? 1 : 3)]); }); });
    const old = S.layout.filter(o => o.lvl === top && PART[o.part].kind === 'roof' && o.part !== 'roof_rail'); const counts = {}; items.forEach(i => counts[i[2]] = (counts[i[2]] || 0) + 1);
    return { top, items, old, cost: costOf(counts) };
  }
  function openAutoRoof(part) {
    const p = roofPlan(part); if (p.err) return toast(p.err); const ok = S.coins >= p.cost.coins;
    sheet({ ribbon: ['Auto roof', 'orange'], html: `<p class="sub">A ${part === 'roof_flat' ? 'flat' : 'gabled'} roof over your ${p.top ? 'upper floor' : 'house'}: <b>${p.items.length}</b> pieces.${p.old.length ? ` Your ${p.old.length} existing roof pieces are replaced.` : ''}</p><div class="coinline" style="font-size:22px">${costText(p.cost)}</div>`, actions: [{ text: `${icon('hammer')} Build roof`, disabled: !ok, fn: () => buildRoof(part) }, { text: 'Cancel', cls: 'secondary' }] });
  }
  function buildRoof(part) {
    const p = roofPlan(part); if (p.err || S.coins < p.cost.coins) return; const L = S.layout;
    p.old.forEach(o => { const i = L.indexOf(o); if (i >= 0) { L.splice(i, 1); addInv(o.part, 1); } });
    const counts = {}; p.items.forEach(i => counts[i[2]] = (counts[i[2]] || 0) + 1); const c = costOf(counts); pay(c);
    const objs = p.items.map(([x, z, part_, rot]) => mkObj(part_, x, z, rot, p.top)); objs.forEach(o => L.push(o)); S.stats.placed += objs.length;
    undoStack.push({ t: 'bulk', ids: objs.map(o => o.id), inv: c.inv, coins: c.coins });
    save(); WORLD.redraw(); sfx('fix'); confetti(30); updateHud(); renderItems(); renderQuest(); checkQuestToast(); toast('Roof built! Tap Interior to look inside');
  }
  function removeRoof() { const L = S.layout, rm = L.filter(o => PART[o.part].kind === 'roof'); if (!rm.length) return toast('No roof to remove'); rm.forEach(o => { L.splice(L.indexOf(o), 1); addInv(o.part, 1); }); save(); WORLD.redraw(); renderItems(); renderQuest(); sfx('pop'); toast('Roof removed — pieces back in your materials'); }

  // ---- tabs and cards (replace the original category / item lists)
  const TABN = { rooms: 'Rooms', roof: 'Roof' };
  const tabIcon = (id) => id === 'rooms' ? thumb('p:sofa:0', 30, 26) : thumb(`p:${CAT_ICON[id]}:0`, 30, 26);
  const tabList = () => buildMode() === 'room' ? ROOM_TABS : ['rooms'].concat(CATS.map(c => c[0]));
  function initCat() { const list = tabList(); if (!curCat || !list.includes(curCat)) curCat = list[0]; }
  function syncTool() { const on = $('#build').classList.contains('on') && curCat === 'rooms' && !roomEdit && !bh && !S.plan; WORLD.roomDrag = buildMode() === 'adv'; WORLD.setRoomMode(on); if (!on) { roomTool.rect = null; $('#roomBar').classList.add('hidden'); } }
  function renderTabs() {
    initCat(); const T_ = $('#tabs'), un = unlockedCats(); T_.innerHTML = '';
    tabList().forEach(id => {
      const name = TABN[id] || (CATS.find(c => c[0] === id) || [0, id])[1], lock = id !== 'rooms' && !un.includes(id), b = document.createElement('button'); b.className = 'tab' + (id === curCat ? ' on' : '') + (lock ? ' lock' : ''); b.setAttribute('role', 'tab');
      b.innerHTML = `<span class="ti">${lock ? icon('lock') : tabIcon(id)}</span>${name}`;
      b.onclick = () => { sfx('click'); if (lock) { toast(`Unlocks in Chapter ${catUnlockCh(id) + 1}`); return; } curCat = id; selPart = null; WORLD.cancelPlace(); $('#ghostBar').classList.add('hidden'); renderTabs(); renderItems(); if (id === 'rooms') hint(); }; T_.appendChild(b);
    });
    const m = $('#modeSeg'); if (m) { $$('.mg', m).forEach(x => x.classList.toggle('on', x.dataset.m === buildMode())); $('.mg[data-m="adv"]', m).classList.toggle('lockd', !finished()); }
  }
  const mkCard = (html, on, fn, label) => { const d = document.createElement('button'); d.className = 'it' + (on ? ' on' : ''); d.innerHTML = html; if (label) d.setAttribute('aria-label', label); d.onclick = fn; return d; };
  function renderItems() { renderItems0(); guideRefresh(); }
  function renderItems0() {
    const I = $('#items'); I.innerHTML = ''; syncTool(); const room = buildMode() === 'room';
    if (curCat === 'rooms') {
      ROOM_TYPES.forEach(t => { const fp = PART[t.floor]; I.appendChild(mkCard(`<span class="th">${thumb(`p:${t.part}:0`, 72, 62)}</span><span class="nm">${t.name}</span><span class="pr" style="color:var(--mute)">${fp.name.replace(' Floor', '')} floor</span>${roomTool.suggest === t.id && buildMode() === 'room' ? '<span class="sugg">Next</span>' : ''}`, roomTool.type === t.id, () => { sfx('click'); roomTool.type = t.id; roomTool.flip = false; roomTool.rect = null; if (buildMode() === 'room') autoSpot(); else hint(`Drag on the grid to size your ${t.name}`); renderItems(); tutEvent('type'); }, t.name)); });
      if (room) { const sc = mkCard(`<span class="th">${thumb('p:stairs:0', 72, 62)}</span><span class="nm">Stairs</span><span class="pr" style="color:var(--mute)">to Floor 2</span>`, false, () => { sfx('click'); autoStairs(); }, 'Add stairs'); I.appendChild(sc); }
      if (room) ensureGhost(); guideRefresh(); return;
    }
    if (room && curCat === 'roof') {
      const have = (id) => S.inv[id] || 0;
      [['roof_slope', 'Red tiles'], ['roof_slope_slate', 'Slate'], ['roof_flat', 'Flat roof']].forEach(([id, nm]) => I.appendChild(mkCard(`<span class="th">${thumb(`p:${id}:0`, 72, 62)}</span><span class="nm">Auto ${nm}</span><span class="pr">tap to preview</span>`, false, () => { sfx('click'); openAutoRoof(id); }, 'Auto roof ' + nm)));
      I.appendChild(mkCard(`<span class="th" style="font-size:30px">🗑️</span><span class="nm">Remove roof</span><span class="pr">&nbsp;</span>`, false, () => { sfx('click'); removeRoof(); }, 'Remove roof')); return;
    }
    if (room && curCat === 'openings') I.appendChild(mkCard(`<span class="th" style="font-size:30px">✨</span><span class="nm">Auto doors & windows</span><span class="pr">${roomEdit ? 'this room' : 'open a room'}</span>`, false, () => { sfx('click'); if (roomEdit) autoOpenings(); else { toast('Tap a room in Rooms to edit it first'); openRooms(); } }, 'Auto doors and windows'));
    Object.values(PART).filter(p => p.cat === curCat && (!p.reward || S.unlocked[p.id])).sort((a, b) => ((S.inv[b.id] || 0) > 0) - ((S.inv[a.id] || 0) > 0) || a.price - b.price).forEach(p => {
      const own = S.inv[p.id] || 0, d = mkCard(`<span class="th">${thumb(`p:${p.id}:0`, 72, 62)}</span><span class="nm">${p.name}</span><span class="pr">${coinI}${p.price}</span><span class="badge ${own ? '' : 'zero'}">${own}</span>`, selPart === p.id, () => pickPart(p.id), `${p.name}, owned ${own}, price ${p.price}`); I.appendChild(d);
    });
  }
  $$('.mg').forEach(b => b.onclick = () => { sfx('click'); if (b.dataset.m === 'adv') { if (!finished()) { toast('Advanced Build unlocks in Dream Home Mode'); return; } S.adv = true; } else S.adv = false; save(); selPart = null; WORLD.cancelPlace(); curCat = null; roomTool.rect = null; renderTabs(); renderItems(); hint(S.adv ? 'Advanced: place single floors and walls (drag to paint)' : undefined); });
  $('#rbNo').onclick = () => { sfx('click'); roomTool.rect = null; refreshRoomPlan(); };
  $('#rbOk').onclick = () => { sfx('click'); buildRoomNow(); };
  $('#sRoom').onclick = () => { const o = WORLD.selected; if (!o) return; const rs = detectRooms(S.layout).filter(r => r.lvl === o.lvl); const r = rs.find(r => r.cells.some(c => c[0] === o.x && c[1] === o.z)) || rs.find(r => roomWallPieces(r).includes(o)); if (!r) return toast('This piece is not part of a room yet'); WORLD.deselect(); sfx('click'); enterRoomEdit(r); };
  $$('.sg').forEach(b => b.addEventListener('click', () => setTimeout(() => { roomTool.rect = null; if (storyRooms()) autoSpot(); else refreshRoomPlan(); }, 0)));
  $('#rbRot').onclick = () => { sfx('click'); const near = roomTool.rect; roomTool.flip = !roomTool.flip; autoSpot(near); };
  $('#rbNext').onclick = () => { sfx('click'); if (roomTool.cands.length < 2) return toast('This is the only free spot'); roomTool.ci = (roomTool.ci + 1) % roomTool.cands.length; roomTool.rect = roomTool.cands[roomTool.ci]; refreshRoomPlan(); };
  function bindRoomWorld() {
    WORLD.cb.roomRect = (r, fin) => { roomTool.rect = r; refreshRoomPlan(); if (fin) tutEvent('rect'); };
    WORLD.cb.roomTap = (cx, cz) => {
      if (!storyRooms() || cx < 0 || cz < 0 || cx >= GRID || cz >= GRID) return false; const r = roomTool.rect;
      if (r && cx >= r.x0 && cx < r.x1 && cz >= r.z0 && cz < r.z1) { if (roomTool.plan && (roomTool.plan.ok || /^Need/.test(roomTool.plan.reason))) buildRoomNow(); else toast(roomTool.plan ? roomTool.plan.reason : 'Pick a spot'); return true; }
      if (WORLD.hasFloor(cx, cz, WORLD.level)) return false; // a built room: tap opens its editor
      const t = ROOM_TYPES.find(x => x.id === roomTool.type), [bw, bd] = ROOM_SIZE[t.id], w = roomTool.flip ? bd : bw, d = roomTool.flip ? bw : bd;
      const x0 = Math.max(0, Math.min(GRID - w, cx - Math.floor(w / 2))), z0 = Math.max(0, Math.min(GRID - d, cz - Math.floor(d / 2))); roomTool.rect = { x0, z0, x1: x0 + w, z1: z0 + d }; sfx('tick'); refreshRoomPlan(); return true;
    };
    WORLD.cb.cellFree = (cx, cz) => buildMode() !== 'room' || roomEdit || curCat !== 'rooms' || !WORLD.hasFloor(cx, cz, WORLD.level);
    const prev = WORLD.cb.selected; WORLD.cb.selected = (o) => {
      if (o && S.plan && bh) { setTimeout(() => WORLD.deselect(), 0); return; }
      if (o && buildMode() === 'room' && !roomEdit && !WORLD.place) { // tapping a built room opens the room editor instead of selecting a single tile
        const rm = GAME_DATA.detectRooms(S.layout).find(r => r.lvl === o.lvl && (r.floors.includes(o) || r.walls.includes(o) || r.items.includes(o) || r.cells.some(c => c[0] === o.x && c[1] === o.z)));
        if (rm) { setTimeout(() => { WORLD.deselect(); enterRoomEdit(rm); }, 0); return; }
      }
      prev(o); $('#sRoom').classList.toggle('hidden', !(o && buildMode() === 'room' && ['floor', 'wall'].includes(PART[o.part].kind) && o.part !== 'path_stone' && PART[o.part].cat !== 'garden')); };
  }

  // ---- guided steps after building: Door -> Windows -> Furniture -> Complete
  const curRoom = () => roomEdit ? (detectRooms(S.layout).find(r => r.key === roomEdit.key) || null) : null;
  const rtOf = (r) => { const f = r.floors.find(o => o.rt); if (f) return f.rt; const n = r.name; return /Kitchen/.test(n) ? 'kitchen' : /Bed/.test(n) ? 'bedroom' : /Bath/.test(n) ? 'bath' : /Living/.test(n) ? 'living' : /Hall/.test(n) ? 'hall' : 'study'; };
  function roomState(r) {
    const info = boundaryInfo(r), has = (re) => info.some(x => re.test(x.o.part)), t = rtOf(r), need = ROOM_FURN[t] || [], parts = r.items.map(o => o.part), missing = need.filter(id => !parts.includes(id));
    const un = unlockedCats(), openLock = !un.includes('openings'), furnLock = !un.includes(FURN_TAB[t] || 'furniture'); // parts that are not unlocked yet in this chapter are not asked for
    return { t, door: has(/^door_|^arch$/) || openLock, win: has(/^window_|wall_glass/) || openLock, furn: !missing.length || furnLock, missing, openLock, furnLock };
  }
  function needCoins(n) {
    sfx('bad'); sheet({ ribbon: [`${n} more coins needed`], html: '<p class="body">Win a puzzle to earn coins (about 100–150 each), then come back and keep building. Your room is saved just as it is.</p>', actions: [{ text: '▶ Play a puzzle', fn: () => { exitBuild(); setTimeout(startLevel, 350); } }, { text: 'Not now', cls: 'secondary' }] });
  }
  // the room the current chapter asks for next (kitchen, bedroom…), so the ghost is already on the right card
  function suggestNext() {
    const have = detectRooms(S.layout).map(rtOf), rules = [[/kitchen/i, 'kitchen'], [/bedroom/i, 'bedroom'], [/bathroom|bath\b/i, 'bath'], [/living/i, 'living'], [/study/i, 'study']];
    for (const p of questProgress()) { if (p.have >= p.q.n) continue; for (const [re, id] of rules) if (re.test(p.q.text) && !have.includes(id)) return id; }
    return null;
  }
  function nextRoom() {
    const nxt = questProgress().find(p => p.have < p.q.n), sg = suggestNext(); exitRoomEdit(); curCat = 'rooms'; roomTool.rect = null; roomTool.flip = false; if (sg) { roomTool.type = sg; roomTool.suggest = sg; }
    if (sg && (sg === 'bedroom' || sg === 'bath') && S.chapter >= 2 && S.layout.some(o => o.part === 'stairs')) { const b = $$('.sg')[1]; b && b.click(); }
    renderTabs(); renderItems(); buildInsets(); WORLD.resetFocus(); hint(nxt ? 'Next goal: ' + nxt.q.text : 'Pick your next room');
  }
  const completeNow = () => { exitBuild(); setTimeout(() => completeChapter(), 500); };
  // furniture is placed along walls, facing into the room (rot 0 faces +z, 1 faces -x, 2 faces -z, 3 faces +x), never in front of a door
  const FACE = [[0, 1], [-1, 0], [0, -1], [1, 0]];
  const autoFurnish = () => { const r = curRoom(); if (!r) return; const st = roomState(r); if (!st.missing.length) return toast('Already furnished'); autoPlaceIn(r, st.missing); };
  function autoPlaceIn(r, missing) {
    const cellSet = new Set(r.cells.map(c => c.join())), blocked = new Set();
    S.layout.filter(o => o.lvl === r.lvl && PART[o.part].kind === 'item' && PART[o.part].layer !== 'rug').forEach(o => WORLD.cellsOf(o).forEach(c => blocked.add(c.join())));
    boundaryInfo(r).filter(x => /^door_|^arch$/.test(x.o.part)).forEach(x => { const a = [x.o.x, x.o.z], b = [x.o.x + DIRS4[x.o.rot][0], x.o.z + DIRS4[x.o.rot][1]], ins = cellSet.has(a.join()) ? a : b; blocked.add(ins.join()); const dx = ins[0] - (cellSet.has(a.join()) ? b[0] : a[0]), dz = ins[1] - (cellSet.has(a.join()) ? b[1] : a[1]); blocked.add([ins[0] + dx, ins[1] + dz].join()); });
    const counts = {}; missing.forEach(p => counts[p] = (counts[p] || 0) + 1); const c = costOf(counts); if (S.coins < c.coins) return needCoins(c.coins - S.coins);
    const objs = []; let prev = null;
    for (const part of missing) {
      let best = null;
      for (let rot = 0; rot < 4; rot++) {
        const [fw, fd] = WORLD.footprint(part, rot), fc = FACE[rot];
        r.cells.forEach(([cx, cz]) => { const o = { part, x: cx, z: cz, lvl: r.lvl, rot }, cells = WORLD.cellsOf(o); if (cells.some(q => !cellSet.has(q.join()) || blocked.has(q.join()))) return;
          const back = cells.filter(q => !cellSet.has([q[0] - fc[0], q[1] - fc[1]].join())).length; if (!back) return;
          const score = back * 10 - (prev ? Math.hypot(cx - prev[0], cz - prev[1]) * 1.5 : 0) - (rot % 2 ? .1 : 0); if (!best || score > best.score) best = { o, score, cells }; });
      }
      if (!best) { // no wall spot: any free cell, facing south
        r.cells.some(([cx, cz]) => { const o = { part, x: cx, z: cz, lvl: r.lvl, rot: 0 }, cells = WORLD.cellsOf(o); if (cells.every(q => cellSet.has(q.join()) && !blocked.has(q.join()))) { best = { o, cells }; return true; } return false; });
      }
      if (!best) { toast(`No room left for the ${PART[part].name} — use a bigger room`); break; }
      best.cells.forEach(q => blocked.add(q.join())); prev = [best.o.x, best.o.z]; objs.push(mkObj(part, best.o.x, best.o.z, best.o.rot, r.lvl));
    }
    if (!objs.length) return; const cost = costOf(objs.reduce((a, o) => (a[o.part] = (a[o.part] || 0) + 1, a), {})); pay(cost);
    objs.forEach(o => S.layout.push(o)); S.stats.placed += objs.length; undoStack.push({ t: 'bulk', ids: objs.map(o => o.id), inv: cost.inv, coins: cost.coins });
    WORLD.redraw(); WORLD.buildIn(objs.map(o => o.id)); save(); sfx('fix'); updateHud(); renderItems(); renderQuest(); checkQuestToast(); return objs.length;
  }

  function autoStairs() {
    if (S.layout.some(o => o.part === 'stairs')) return toast('You already have stairs');
    const rs = detectRooms(S.layout).filter(r => r.lvl === 0 && r.enclosed).sort((a, b) => b.size - a.size); if (!rs.length) return toast('Build a ground-floor room first');
    for (const r of rs) { const prevEdit = roomEdit; roomEdit = { key: r.key, name: r.name, lvl: r.lvl, cells: r.cells, room: r }; const n = autoPlaceIn(r, ['stairs']); roomEdit = prevEdit; if (n) { toast('Stairs added in the ' + r.name); return; } }
  }
  // ---- first-time tutorial (where to tap)
  let tut = null; const TUT_N = 3;
  const rel = (el) => { const a = $('#app').getBoundingClientRect(), r = el.getBoundingClientRect(); return [r.left - a.left + r.width / 2, r.top - a.top + r.height / 2]; };
  function tutStop(done) { if (tut && tut.anim) tut.anim.cancel(); tut = null; $('#tut').classList.add('hidden'); if (done) { S.seen.buildTut = 1; save(); } }
  function tutStep(n) {
    if (!$('#build').classList.contains('on')) return tutStop(false); tut = tut || {}; tut.step = n; if (tut.anim) tut.anim.cancel(); const T_ = $('#tut'), hand = $('#tutHand'); T_.classList.remove('hidden'); hand.style.opacity = 1;
    const set = (t, p, pos) => { $('#tutT').textContent = t; $('#tutP').textContent = p; $('#tutNext').textContent = n === TUT_N ? 'Got it' : 'Next'; $('#tutDots').textContent = '●'.repeat(n) + '○'.repeat(TUT_N - n); $('.tbub', T_).style.cssText = pos || ''; };
    const tapAt = (el) => { const [x, y] = el ? rel(el) : [100, 600]; tut.anim = hand.animate([{ transform: `translate(${x}px,${y}px) scale(1)` }, { transform: `translate(${x}px,${y}px) scale(.7)` }, { transform: `translate(${x}px,${y}px) scale(1)` }], { duration: 1100, iterations: Infinity }); };
    if (n === 1) { curCat = 'rooms'; renderTabs(); renderItems(); set('1. Pick a room', 'Tap a room card. A green ghost room shows where it will go.', 'top:96px'); tapAt($('#items .it:nth-child(2)') || $('#items .it')); }
    else if (n === 2) { if ($('#roomBar').classList.contains('hidden')) return tutStep(1); set('2. Tap ✓ Build', 'This starts construction. To move the room first, tap another spot on the grid.', 'top:96px'); tapAt($('#rbOk')); }
    else { const sid = bh && bh.sites && bh.sites[0], sp = sid && WORLD.siteScreen(sid.id), cv = $('#reno3d canvas').getBoundingClientRect(), ap = $('#app').getBoundingClientRect(); set('3. Tap the glowing spots', 'Tap each glowing spot to build it piece by piece. Quick taps in a row make a BUILD COMBO!', 'top:' + Math.round($('#guide').getBoundingClientRect().bottom - ap.top + 8) + 'px');
      if (sp) { const x = sp[0] + cv.left - ap.left, y = sp[1] + cv.top - ap.top; tut.anim = hand.animate([{ transform: `translate(${x}px,${y}px) scale(1)` }, { transform: `translate(${x}px,${y}px) scale(.7)` }, { transform: `translate(${x}px,${y}px) scale(1)` }], { duration: 1100, iterations: Infinity }); } else hand.style.opacity = 0; }
  }
  function tutEvent(ev) { if (!tut || !$('#build').classList.contains('on')) return; if (ev === 'type' && tut.step === 1) setTimeout(() => tutStep(2), 300); else if (ev === 'built' && tut.step <= 2) setTimeout(() => tutStep(3), 1200); }
  function tutMaybe(force) { if ((!force && S.seen.buildTut) || buildMode() !== 'room' || roomEdit) return; setTimeout(() => { if ($('#build').classList.contains('on') && !roomEdit) { tut = {}; tutStep(1); } }, 700); }
  $('#tutSkip').onclick = () => { sfx('click'); tutStop(true); };
  $('#tutNext').onclick = () => { sfx('click'); if (!tut) return; if (tut.step >= TUT_N) tutStop(true); else tutStep(tut.step + 1); };
  $('#bHelp').onclick = () => { sfx('click'); if (buildMode() !== 'room') { toast('The tutorial covers the story building mode'); return; } if (roomEdit) exitRoomEdit(); curCat = 'rooms'; renderTabs(); renderItems(); tutMaybe(true); };

