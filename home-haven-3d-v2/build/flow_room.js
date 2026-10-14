  // ------------------------------------------------------------ ROOM-BASED BUILDING (default) + Advanced Build (Dream Home) + tutorial
  const ROOM_TYPES = [
    { id: 'living', name: 'Living Room', part: 'sofa', floor: 'floor_wood' }, { id: 'kitchen', name: 'Kitchen', part: 'stove', floor: 'floor_tile' },
    { id: 'bedroom', name: 'Bedroom', part: 'bed', floor: 'floor_carpet' }, { id: 'bath', name: 'Bathroom', part: 'bathtub', floor: 'floor_marble' },
    { id: 'hall', name: 'Hall', part: 'stairs', floor: 'floor_concrete' }, { id: 'study', name: 'Study', part: 'bookshelf', floor: 'floor_wood' },
  ];
  const ROOM_TABS = ['rooms', 'roof', 'openings', 'build', 'furniture', 'decor', 'kitchen', 'bath', 'bedroom', 'garden'];
  const buildMode = () => (S.adv && finished() ? 'adv' : 'room');
  const roomTool = { type: 'living', rect: null, plan: null };
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
    if (w < 2 || d < 2) { res.reason = 'Drag at least 2 × 2'; return res; }
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
    const bar = $('#roomBar'); if (!roomTool.rect || curCat !== 'rooms' || roomEdit) { bar.classList.add('hidden'); WORLD.setRoomPreview(null); roomTool.plan = null; return; }
    const t = ROOM_TYPES.find(x => x.id === roomTool.type), p = roomTool.plan = planRoom(roomTool.rect, t), w = p.r.x1 - p.r.x0, d = p.r.z1 - p.r.z0;
    WORLD.setRoomPreview(roomTool.rect, p.ok, `${w} × ${d}`); bar.classList.remove('hidden');
    $('#rInfo').innerHTML = p.ok ? `<b>${t.name} ${w}×${d}</b><br>${p.floors.length} floor tiles • ${p.walls.length} walls<br>${costText(p.cost)}` : `<b>${p.reason}</b>`; $('#rbOk').disabled = !p.ok;
    hint(p.ok ? 'Looks good — tap ✓ Build, or drag again to resize' : p.reason);
  }
  WORLD.cb.roomRect = null; // bound in bindWorldExt
  function buildRoomNow() {
    const p = roomTool.plan; if (!p || !p.ok) return; const t = p.t; pay(p.cost);
    const objs = [...p.floors.map(([x, z]) => mkObj(p.floorPart, x, z, 0, p.lvl, { rt: t.id })), ...p.walls.map(w => mkObj('wall_plaster', w.x, w.z, w.rot, p.lvl))];
    objs.forEach(o => S.layout.push(o)); S.stats.placed += objs.length; undoStack.push({ t: 'bulk', ids: objs.map(o => o.id), inv: p.cost.inv, coins: p.cost.coins });
    const r0 = p.r; roomTool.rect = null; roomTool.plan = null; $('#roomBar').classList.add('hidden'); WORLD.setRoomPreview(null);
    WORLD.redraw(); save(); sfx('hammer'); vib(25); confetti(20); updateHud(); renderItems(); renderQuest(); checkQuestToast(); tutEvent('built');
    const room = detectRooms(S.layout).find(r => r.lvl === p.lvl && r.cells.some(c => c[0] === r0.x0 && c[1] === r0.z0));
    toast(`${t.name} built! Now add doors, windows and furniture`); if (room) setTimeout(() => enterRoomEdit(room), 350);
  }
  // ---- customizing a room
  const boundaryInfo = (r) => { const set = new Set(r.cells.map(c => c.join())), fl = new Set(S.layout.filter(o => o.lvl === r.lvl && PART[o.part].kind === 'floor' && o.part !== 'path_stone').map(o => o.x + ',' + o.z)); return roomWallPieces(r).map(o => { const a = [o.x, o.z], b = [o.x + DIRS4[o.rot][0], o.z + DIRS4[o.rot][1]], out = set.has(a.join()) ? b : a; return { o, outside: out, exterior: !fl.has(out.join()) }; }); };
  function swapPieces(list, part) {
    const n = list.length; if (!n) return toast('Nothing to change'); const c = costOf({ [part]: n }); if (S.coins < c.coins) { sfx('bad'); return toast(`Need ${c.coins - S.coins} more coins`); }
    pay(c); const rec = list.map(o => ({ id: o.id, part: o.part, color: o.color })); list.forEach(o => { addInv(o.part, 1); o.part = part; o.color = PART[part].color; }); S.stats.placed += n; undoStack.push({ t: 'bulk', ids: [], swap: rec, inv: c.inv, coins: c.coins }); save(); WORLD.redraw(); renderItems(); updateHud(); renderQuest(); sfx('pop'); return true;
  }
  function autoOpenings() {
    if (!roomEdit) return toast('Open a room first'); const info = boundaryInfo(roomEdit.room), plain = info.filter(x => PART[x.o.part].cat === 'walls' && x.o.part !== 'wall_half'), has = (re) => info.filter(x => re.test(x.o.part)).length;
    const doors = has(/^door_|^arch$/), wins = has(/^window_|wall_glass/); let nd = 0, nw = 0; const pick = [];
    if (!doors && plain.length) { const sorted = plain.slice().sort((a, b) => (a.exterior - b.exterior) || (Math.abs(a.o.x - roomEdit.cells[0][0]) - Math.abs(b.o.x - roomEdit.cells[0][0]))); const inner = sorted.find(x => !x.exterior), front = plain.filter(x => x.exterior && x.o.rot === 2)[0], d = inner || front || plain[Math.floor(plain.length / 2)]; pick.push([d, 'door_wood']); nd = 1; }
    if (!wins) { const ext = plain.filter(x => x.exterior && !pick.some(p => p[0] === x)); const bySide = {}; ext.forEach(x => (bySide[x.o.rot] = bySide[x.o.rot] || []).push(x)); Object.values(bySide).forEach(arr => { arr.sort((a, b) => (a.o.x + a.o.z) - (b.o.x + b.o.z)); if (arr.length >= 3) { pick.push([arr[Math.floor(arr.length / 2)], 'window_small']); nw++; } else if (arr.length === 2) { pick.push([arr[0], 'window_small']); nw++; } }); }
    if (!pick.length) return toast(doors || wins ? 'This room already has doors and windows' : 'No free wall to use');
    const counts = {}; pick.forEach(([, part]) => counts[part] = (counts[part] || 0) + 1); const c = costOf(counts); if (S.coins < c.coins) { sfx('bad'); return toast(`Need ${c.coins - S.coins} more coins`); }
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
  function initCat() { const list = buildMode() === 'room' ? ROOM_TABS : CATS.map(c => c[0]); if (!curCat || !list.includes(curCat)) curCat = list[0]; }
  function syncTool() { const on = $('#build').classList.contains('on') && buildMode() === 'room' && curCat === 'rooms' && !roomEdit; WORLD.setRoomMode(on); if (!on) { roomTool.rect = null; $('#roomBar').classList.add('hidden'); } }
  function renderTabs() {
    initCat(); const T_ = $('#tabs'), un = unlockedCats(); T_.innerHTML = '';
    (buildMode() === 'room' ? ROOM_TABS : CATS.map(c => c[0])).forEach(id => {
      const name = TABN[id] || (CATS.find(c => c[0] === id) || [0, id])[1], lock = id !== 'rooms' && !un.includes(id), b = document.createElement('button'); b.className = 'tab' + (id === curCat ? ' on' : '') + (lock ? ' lock' : ''); b.setAttribute('role', 'tab');
      b.innerHTML = `<span class="ti">${lock ? icon('lock') : tabIcon(id)}</span>${name}`;
      b.onclick = () => { sfx('click'); if (lock) { toast(`Unlocks in Chapter ${catUnlockCh(id) + 1}`); return; } curCat = id; selPart = null; WORLD.cancelPlace(); $('#ghostBar').classList.add('hidden'); renderTabs(); renderItems(); if (id === 'rooms') hint(); }; T_.appendChild(b);
    });
    const m = $('#modeSeg'); if (m) { $$('.mg', m).forEach(x => x.classList.toggle('on', x.dataset.m === buildMode())); $('.mg[data-m="adv"]', m).classList.toggle('lockd', !finished()); }
  }
  const mkCard = (html, on, fn, label) => { const d = document.createElement('button'); d.className = 'it' + (on ? ' on' : ''); d.innerHTML = html; if (label) d.setAttribute('aria-label', label); d.onclick = fn; return d; };
  function renderItems() {
    const I = $('#items'); I.innerHTML = ''; syncTool(); const room = buildMode() === 'room';
    if (room && curCat === 'rooms') {
      ROOM_TYPES.forEach(t => { const fp = PART[t.floor]; I.appendChild(mkCard(`<span class="th">${thumb(`p:${t.part}:0`, 72, 62)}</span><span class="nm">${t.name}</span><span class="pr" style="color:var(--mute)">${fp.name.replace(' Floor', '')} floor</span>`, roomTool.type === t.id, () => { sfx('click'); roomTool.type = t.id; renderItems(); refreshRoomPlan(); hint(`Drag on the grid to size your ${t.name}`); tutEvent('type'); }, t.name)); });
      return;
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
  $$('.mg').forEach(b => b.onclick = () => { sfx('click'); if (b.dataset.m === 'adv') { if (!finished()) { toast('Advanced Build unlocks in Dream Home Mode'); return; } S.adv = true; } else S.adv = false; save(); selPart = null; WORLD.cancelPlace(); curCat = null; renderTabs(); renderItems(); hint(S.adv ? 'Advanced: place single floors and walls (drag to paint)' : undefined); });
  $('#rbNo').onclick = () => { sfx('click'); roomTool.rect = null; refreshRoomPlan(); };
  $('#rbOk').onclick = () => { sfx('click'); buildRoomNow(); };
  $('#sRoom').onclick = () => { const o = WORLD.selected; if (!o) return; const rs = detectRooms(S.layout).filter(r => r.lvl === o.lvl); const r = rs.find(r => r.cells.some(c => c[0] === o.x && c[1] === o.z)) || rs.find(r => roomWallPieces(r).includes(o)); if (!r) return toast('This piece is not part of a room yet'); WORLD.deselect(); sfx('click'); enterRoomEdit(r); };
  $$('.sg').forEach(b => b.addEventListener('click', () => setTimeout(() => { roomTool.rect = null; refreshRoomPlan(); }, 0)));
  function bindRoomWorld() {
    WORLD.cb.roomRect = (r, fin) => { roomTool.rect = r; refreshRoomPlan(); if (fin) tutEvent('rect'); };
    const prev = WORLD.cb.selected; WORLD.cb.selected = (o) => { prev(o); $('#sRoom').classList.toggle('hidden', !(o && buildMode() === 'room' && ['floor', 'wall'].includes(PART[o.part].kind) && o.part !== 'path_stone' && PART[o.part].cat !== 'garden')); };
  }

  // ---- first-time tutorial (where to tap and drag)
  let tut = null;
  const rel = (el) => { const a = $('#app').getBoundingClientRect(), r = el.getBoundingClientRect(); return [r.left - a.left + r.width / 2, r.top - a.top + r.height / 2]; };
  function tutStop(done) { if (tut && tut.anim) tut.anim.cancel(); tut = null; $('#tut').classList.add('hidden'); if (done) { S.seen.buildTut = 1; save(); } }
  function tutStep(n) {
    if (!$('#build').classList.contains('on')) return tutStop(false); tut = tut || {}; tut.step = n; if (tut.anim) tut.anim.cancel(); const T_ = $('#tut'), hand = $('#tutHand'); T_.classList.remove('hidden');
    const set = (t, p, pos) => { $('#tutT').textContent = t; $('#tutP').textContent = p; $('#tutNext').textContent = n === 4 ? 'Got it' : 'Next'; $('#tutDots').textContent = '●'.repeat(n) + '○'.repeat(4 - n); $('.tbub', T_).style.cssText = pos || ''; };
    if (n === 1) { curCat = 'rooms'; renderTabs(); renderItems(); const card = $('#items .it'); const [x, y] = card ? rel(card) : [100, 600]; set('1. Pick a room type', 'Tap a room card — Living Room, Kitchen, Bedroom…', 'top:96px'); tut.anim = hand.animate([{ transform: `translate(${x}px,${y}px) scale(1)` }, { transform: `translate(${x}px,${y}px) scale(.7)` }, { transform: `translate(${x}px,${y}px) scale(1)` }], { duration: 1100, iterations: Infinity }); }
    else if (n === 2) { const l = WORLD.level, a = WORLD.toScreen(1.5, 8.5, l * WORLD.H), b = WORLD.toScreen(5.5, 11.5, l * WORLD.H); set('2. Drag on the grid', 'Press and drag from one corner to the other to choose the room size. Two fingers move and zoom the view.', 'top:96px'); const ap = $('#app').getBoundingClientRect(); const cv = $('#reno3d canvas').getBoundingClientRect(); const ox = cv.left - ap.left, oy = cv.top - ap.top;
      tut.anim = hand.animate([{ transform: `translate(${a[0] + ox}px,${a[1] + oy}px) scale(1)`, offset: 0 }, { transform: `translate(${a[0] + ox}px,${a[1] + oy}px) scale(.75)`, offset: .15 }, { transform: `translate(${b[0] + ox}px,${b[1] + oy}px) scale(.75)`, offset: .8 }, { transform: `translate(${b[0] + ox}px,${b[1] + oy}px) scale(1)`, offset: 1 }], { duration: 2200, iterations: Infinity, easing: 'ease-in-out' }); }
    else if (n === 3) { const b = $('#rbOk'); if ($('#roomBar').classList.contains('hidden')) return tutStep(2); const [x, y] = rel(b); set('3. Tap ✓ Build', 'Floor and walls appear automatically. Not happy? Drag again to resize.', 'top:96px'); tut.anim = hand.animate([{ transform: `translate(${x}px,${y}px) scale(1)` }, { transform: `translate(${x}px,${y}px) scale(.7)` }, { transform: `translate(${x}px,${y}px) scale(1)` }], { duration: 1100, iterations: Infinity }); }
    else { hand.style.opacity = 0; set('4. Make it yours', 'Use Floor / Wall style, Auto doors & windows and the furniture tabs. Tap the ? button any time to see this again.', 'top:150px'); }
    if (n < 4) hand.style.opacity = 1;
  }
  function tutEvent(ev) { if (!tut || !$('#build').classList.contains('on')) return; if (ev === 'type' && tut.step === 1) setTimeout(() => tutStep(2), 250); else if (ev === 'rect' && tut.step === 2) setTimeout(() => tutStep(3), 250); else if (ev === 'built' && tut.step === 3) setTimeout(() => tutStep(4), 900); }
  function tutMaybe(force) { if ((!force && S.seen.buildTut) || buildMode() !== 'room' || roomEdit) return; if (roomEdit) return; setTimeout(() => { if ($('#build').classList.contains('on') && !roomEdit) { tut = {}; tutStep(1); } }, 700); }
  $('#tutSkip').onclick = () => { sfx('click'); tutStop(true); };
  $('#tutNext').onclick = () => { sfx('click'); if (!tut) return; if (tut.step >= 4) tutStop(true); else tutStep(tut.step + 1); };
  $('#bHelp').onclick = () => { sfx('click'); if (buildMode() !== 'room') { toast('The tutorial covers Rooms build mode'); return; } if (roomEdit) exitRoomEdit(); curCat = 'rooms'; renderTabs(); renderItems(); tutMaybe(true); };
