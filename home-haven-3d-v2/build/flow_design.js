  // ============================================================ DESIGN STUDIO (story rooms)
  // Walk into a finished room, drag furniture around, stack decor on tables, restyle with unlockable style packs and
  // finish Design Briefs (client requests that are checked against the real layout) with a before/after reveal.
  const STYLE_ORDER = ['cozy', 'modern', 'scandi', 'boho', 'industrial', 'luxury'];
  const STYLES = {
    cozy: { name: 'Cozy', ico: '🕯️', pal: ['#C98F5B', '#E8C9A0', '#8B5E3C', '#D9A066'], fam: ['warm'], floor: 'floor_wood', wall: ['wall_plaster', '#F6E3C2'], need: 0, desc: 'Warm woods, soft creams' },
    modern: { name: 'Modern', ico: '◻️', pal: ['#5E7388', '#E9EEF2', '#2A9D8F', '#B8C4CF'], fam: ['cool', 'neutral'], floor: 'floor_tile', wall: ['wall_plaster', '#B3BDC9'], need: 0, desc: 'Clean lines, cool tones' },
    scandi: { name: 'Scandi', ico: '🌿', pal: ['#F2F2F2', '#D9CBB5', '#9DB7A5', '#CDD8DF'], fam: ['neutral', 'green'], floor: 'floor_wood', wall: ['wall_plaster', '#F4F1EA'], need: 1, desc: 'Light, airy, natural' },
    boho: { name: 'Boho', ico: '🌵', pal: ['#C0622E', '#D9A441', '#6B8E5A', '#8A4B6D'], fam: ['warm', 'green', 'rose'], floor: 'floor_carpet', wall: ['wall_plaster', '#EBD3A8'], need: 2, desc: 'Earthy, layered, colourful' },
    industrial: { name: 'Industrial', ico: '⚙️', pal: ['#5B646D', '#2B2B2B', '#8A5A3C', '#9AA3AB'], fam: ['neutral', 'cool'], floor: 'floor_concrete', wall: ['wall_brick', null], need: 3, desc: 'Brick, steel and concrete' },
    luxury: { name: 'Luxury', ico: '👑', pal: ['#8A2F3A', '#C9A24A', '#2D3F6B', '#5B2A4A'], fam: ['rose', 'warm', 'cool'], floor: 'floor_marble', wall: ['wall_plaster', '#E8DCC8'], need: 4, desc: 'Deep jewel tones, marble' },
  };
  const R_ = (id, label, parts, n) => ({ id, label, parts, n });
  const BRIEFS = [
    { id: 'zoe_bed', client: 'Zoe', title: "Zoe's Dream Bedroom", types: ['bedroom'], style: 'cozy', quote: 'Warm and cozy — a place to read!', wants: [R_('bed', 'Bed', ['bed', 'bed_double', 'charpai']), R_('ward', 'Wardrobe', ['wardrobe']), R_('lamp', 'Reading lamp', ['lamp', 'lamp_arc']), R_('rug', 'Soft rug', ['rug'])], decor: 2, reward: { coins: 90, parts: ['bed_double'] } },
    { id: 'ben_movie', client: 'Ben', title: 'Movie-Night Living Room', types: ['living'], style: 'modern', quote: 'Big sofa, big screen, nothing in the way.', wants: [R_('sofa', 'Sofa', ['sofa', 'sofa_modern', 'sofa_chester']), R_('tv', 'TV unit', ['tv']), R_('table', 'Coffee table', ['coffee_table']), R_('rug', 'Rug', ['rug'])], decor: 2, reward: { coins: 100, parts: ['sofa_modern'] } },
    { id: 'alex_kitchen', client: 'Alex', title: "Alex's Sunday Kitchen", types: ['kitchen'], style: 'scandi', quote: 'I cook for everybody — and we eat right here.', wants: [R_('counter', 'Counter', ['counter']), R_('stove', 'Stove', ['stove']), R_('fridge', 'Fridge', ['fridge']), R_('sink', 'Sink', ['sink']), R_('table', 'Dining table', ['dining_table', 'table_round']), R_('chair', 'Two chairs', ['chair'], 2)], decor: 1, stack: true, reward: { coins: 110, parts: ['table_round'] } },
    { id: 'mom_spa', client: 'Mom', title: 'A Calm Bathroom', types: ['bath'], style: 'scandi', quote: 'Somewhere quiet to unwind.', wants: [R_('tub', 'Bathtub', ['bathtub']), R_('wc', 'Toilet', ['toilet']), R_('basin', 'Wash basin', ['basin']), R_('plant', 'A plant', ['plant', 'plant_tall']), R_('rug', 'Rug', ['rug'])], decor: 2, reward: { coins: 100, parts: ['plant_tall'] } },
    { id: 'study_nook', client: 'Ben', title: 'Quiet Study Nook', types: ['study', 'living'], style: 'industrial', quote: 'Books, a desk and good light.', wants: [R_('shelf', 'Bookshelf', ['bookshelf']), R_('chair', 'Chair', ['chair', 'armchair']), R_('table', 'Desk (table)', ['dining_table', 'table_round', 'coffee_table']), R_('lamp', 'Lamp', ['lamp', 'lamp_arc'])], decor: 2, reward: { coins: 120, parts: ['lamp_arc'] } },
    { id: 'parker_lounge', client: 'Mr. Parker', title: "Mr. Parker's Lounge", types: ['living'], style: 'luxury', quote: 'Make me feel like a king.', wants: [R_('sofa', 'Sofa', ['sofa', 'sofa_modern', 'sofa_chester']), R_('arm', 'Armchair', ['armchair']), R_('table', 'Coffee table', ['coffee_table']), R_('shelf', 'Bookshelf', ['bookshelf'])], decor: 3, stack: true, reward: { coins: 160, parts: ['sofa_chester', 'floor_parquet'] } },
  ];
  const SETS = [['Conversation set', ['sofa', 'coffee_table', 'rug']], ['Dining set', ['dining_table', 'chair', 'chair']], ['Reading nook', ['armchair', 'lamp', 'bookshelf']], ['Cooking line', ['counter', 'stove', 'fridge', 'sink']], ['Bath suite', ['bathtub', 'toilet', 'basin']], ['Sleep zone', ['bed', 'bedside', 'wardrobe']]];
  const BIG = new Set(['sofa', 'sofa_modern', 'sofa_chester', 'bed', 'bed_double', 'wardrobe', 'bookshelf', 'fridge', 'counter', 'stove', 'tv', 'bathtub', 'dining_table', 'piano']);
  const hueFamD = (hex) => { const n = parseInt((hex || '#888888').slice(1), 16), r = n >> 16 & 255, g = n >> 8 & 255, b = n & 255, mx = Math.max(r, g, b), mn = Math.min(r, g, b); if (mx - mn < 28) return 'neutral'; let h; if (mx === r) h = ((g - b) / (mx - mn) + 6) % 6; else if (mx === g) h = (b - r) / (mx - mn) + 2; else h = (r - g) / (mx - mn) + 4; h *= 60; return h < 70 || h >= 330 ? 'warm' : h < 170 ? 'green' : h < 270 ? 'cool' : 'rose'; };
  const dzS = () => (S.dz = Object.assign({ done: {}, active: null }, S.dz || {}));
  const briefsDone = () => Object.keys(dzS().done).length;
  const styleOpen = (id) => briefsDone() >= STYLES[id].need;
  let dz = null; // { p, key, inside, collapsed }

  // ---- what is in the room right now
  const dzItems = (p) => { const cells = new Set(rcells(p).map(c => c.join())); return S.layout.filter(o => o.lvl === p.lvl && PART[o.part].kind === 'item' && WORLD.cellsOf(o).some(c => cells.has(c.join()))); };
  function doorInside(p) { const d = boundaryInfo(roomLike(p)).find(x => /^door_|^arch$/.test(x.o.part)); if (!d) return null; const cs = new Set(rcells(p).map(c => c.join())), a = [d.o.x, d.o.z], b = [d.o.x + DIRS4[d.o.rot][0], d.o.z + DIRS4[d.o.rot][1]], inA = cs.has(a.join()); return { ins: inA ? a : b, out: inA ? b : a }; }
  function dzEval(brief) {
    const p = dz.p, items = dzItems(p), parts = items.map(o => o.part), cells = rcells(p), cs = new Set(cells.map(c => c.join())), st = STYLES[(brief && brief.style) || S.dz.style || 'cozy'], out = { needs: [], opt: [] };
    if (brief) brief.wants.forEach(w => out.needs.push({ id: w.id, label: w.label, ok: parts.filter(q => w.parts.includes(q)).length >= (w.n || 1) }));
    const blockedC = new Set(); items.filter(o => PART[o.part].layer !== 'rug' && !o.elev).forEach(o => WORLD.cellsOf(o).forEach(c => blockedC.add(c.join())));
    const door = doorInside(p), free = (c) => cs.has(c.join()) && !blockedC.has(c.join());
    // walkable: every piece can be reached from the door
    let pathOk = true, doorOk = true; if (door) { doorOk = free(door.ins) && !blockedC.has([door.ins[0] + door.ins[0] - door.out[0], door.ins[1] + door.ins[1] - door.out[1]].join()); const seen = new Set([door.ins.join()]), q = door.ins ? [door.ins] : []; while (free(door.ins) && q.length) { const [x, z] = q.shift(); DIRS4.forEach(([dx, dz]) => { const n = [x + dx, z + dz], k = n.join(); if (!seen.has(k) && free(n)) { seen.add(k); q.push(n); } }); } const solid = items.filter(o => PART[o.part].layer !== 'rug' && !o.elev); pathOk = !!solid.length ? solid.every(o => WORLD.cellsOf(o).some(c => DIRS4.some(([dx, dz]) => seen.has([c[0] + dx, c[1] + dz].join())))) && free(door.ins) : true; }
    out.opt.push({ id: 'door', label: 'Door is not blocked', ok: doorOk }); out.opt.push({ id: 'path', label: 'You can walk to everything', ok: pathOk });
    const big = items.filter(o => BIG.has(o.part)); const wallOk = !big.length || big.filter(o => WORLD.cellsOf(o).some(c => DIRS4.some(([dx, dz]) => !cs.has([c[0] + dx, c[1] + dz].join())))).length / big.length >= .7; out.opt.push({ id: 'wall', label: 'Big pieces sit against walls', ok: wallOk });
    const quad = new Set(big.map(o => { const c = WORLD.cellsOf(o)[0]; return (c[0] < (p.x0 + p.x1) / 2 ? 0 : 1) + (c[1] < (p.z0 + p.z1) / 2 ? 0 : 2); })); out.opt.push({ id: 'bal', label: 'Furniture is spread out', ok: big.length < 3 || quad.size >= 2 });
    const wins = boundaryInfo(roomLike(p)).filter(x => /^window_|wall_glass/.test(x.o.part)).length; out.opt.push({ id: 'light', label: 'Good lighting (lamp or window)', ok: parts.some(q => q === 'lamp' || q === 'lamp_arc') || wins > 0 });
    const paint = items.filter(o => PART[o.part].paintable && PART[o.part].cat !== 'decor'); const match = paint.filter(o => st.pal.map(c => c.toLowerCase()).includes((o.color || '').toLowerCase()) || st.fam.includes(hueFamD(o.color || PART[o.part].color))).length; out.opt.push({ id: 'style', label: `${st.name} style harmony`, ok: paint.length < 2 || match / paint.length >= .7 });
    const wantIds = new Set(brief ? brief.wants.flatMap(w => w.parts) : []), decor = items.filter(o => PART[o.part].cat === 'decor' && !wantIds.has(o.part)).length; out.opt.push({ id: 'decor', label: `Decorate (${Math.min(decor, brief ? brief.decor : 2)}/${brief ? brief.decor : 2})`, ok: decor >= (brief ? brief.decor : 2) });
    const sets = SETS.filter(([, need]) => { const have = parts.slice(); return need.every(n => { const i = have.indexOf(n); if (i < 0) return false; have.splice(i, 1); return true; }); }).map(s => s[0]); out.sets = sets;
    out.opt.push({ id: 'set', label: sets.length ? `Furniture set: ${sets[0]}` : 'Complete a furniture set', ok: sets.length > 0 });
    if (brief && brief.stack) out.opt.push({ id: 'stack', label: 'Put a plant/vase on a table', ok: items.some(o => o.elev > 0) });
    const needOk = out.needs.every(n => n.ok), optOk = out.opt.filter(o => o.ok).length; out.stars = !needOk ? 0 : optOk === out.opt.length ? 3 : optOk >= Math.ceil(out.opt.length * .6) ? 2 : 1; out.needOk = needOk; out.score = Math.round(((out.needs.filter(n => n.ok).length + optOk) / (out.needs.length + out.opt.length)) * 100);
    return out;
  }

  // ---- open / close
  const dzBrief = () => { const a = dzS().active; return a && dz && a.key === dz.key ? BRIEFS.find(b => b.id === a.id) : null; };
  function dzOpen(p, key) {
    const first = !dz; dz = Object.assign(dz || { inside: false, collapsed: true }, { p, key }); $('#build').classList.add('dzmode'); $('#guide').classList.add('hidden'); WORLD.dropMode = true; WORLD.orbit = true; WORLD.setSites(null);
    if (first) { WORLD.setInterior(true); WORLD.roomView(rcells(p), p.lvl, false, 0); if (innerHeight > innerWidth) WORLD.focus(-20, 0); else WORLD.focus(14, 0); WORLD.camBase(); const r = detectRooms(S.layout).find(x => x.key === key); curCat = ['furniture', 'decor', 'kitchen', 'bath', 'bedroom'].find(c => unlockedCats().includes(c)) || curCat; renderTabs(); renderItems0(); }
    dzRefresh();
  }
  function dzReframe() { if (!dz) return; WORLD.setInterior(true); WORLD.roomView(rcells(dz.p), dz.p.lvl, dz.inside, 0); WORLD.focus(dz.inside ? 0 : (innerHeight > innerWidth ? -20 : 14), 0); WORLD.camBase(); }
  function dzClose() { if (!dz) return; dz = null; WORLD.dropMode = false; WORLD.orbit = false; $('#build').classList.remove('dzmode', 'shelfopen'); $('#dz').classList.add('hidden'); $('#dzbar').classList.add('hidden'); }
  window.dzAuto = (id) => { if (!dz) return false; const P = PART[id]; return S.coins >= P.price; }; // design mode buys a piece on demand when you drop it

  // ---- HUD
  function dzRefresh() {
    if (!dz) return; const br = dzBrief(), ev = dzEval(br), card = $('#dz'); card.classList.remove('hidden'); $('#dzbar').classList.remove('hidden');
    $('#dzTitle').textContent = br ? br.title : 'Free design'; $('#dzQuote').textContent = br ? `${br.client}: “${br.quote}”` : 'Pick a Design Brief for goals, rewards and a before/after reveal.';
    const stl = STYLES[(br && br.style) || (S.dz.style || 'cozy')]; $('#dzStyle').textContent = `${stl.ico} ${stl.name}`;
    $('#dzStars').textContent = br ? starsTxt(ev.stars) : '';
    $('#dzList').innerHTML = br ? ev.needs.map(n => `<li class="${n.ok ? 'ok' : ''}">${n.label}</li>`).join('') + ev.opt.map(o => `<li class="opt ${o.ok ? 'ok' : ''}">${o.label}</li>`).join('') : '';
    $('#dzSubmit').classList.toggle('hidden', !br); $('#dzSubmit').disabled = false; $('#dzSubmit').textContent = ev.needOk ? '✔ Show the client' : `${ev.needs.filter(n => n.ok).length}/${ev.needs.length} requested items`;
    $('#dzSubmit').classList.toggle('ready', ev.needOk); $('#dzPick').classList.toggle('hidden', !!br); card.classList.toggle('min', dz.collapsed); $('#dzView').classList.toggle('on', dz.inside);
    $('#dzMini').innerHTML = br ? (ev.needs.filter(n => !n.ok).slice(0, 3).map(n => `<span>${n.label}</span>`).join('') + (ev.needs.filter(n => !n.ok).length > 3 ? `<span>+${ev.needs.filter(n => !n.ok).length - 3}</span>` : '') || '<span class="okc">All requested items placed</span>') : '<span>Tap Briefs for a client request</span>';
    $('#dzSets').textContent = ev.sets.length ? '✨ ' + ev.sets.join(' • ') : '';
  }
  $('#dzHead').onclick = () => { sfx('click'); dz.collapsed = !dz.collapsed; dzRefresh(); };
  $('#dzAdd').onclick = () => { sfx('click'); $('#build').classList.toggle('shelfopen'); };
  $('#dzView').onclick = () => { sfx('click'); if (!dz) return; dz.inside = !dz.inside; WORLD.setInterior(true); WORLD.roomView(rcells(dz.p), dz.p.lvl, dz.inside, 0); WORLD.focus(dz.inside ? 0 : 14, 0); WORLD.camBase(); WORLD.camRate = 3.5; setTimeout(() => { WORLD.camRate = 7; }, 1400); toast(dz.inside ? 'Inside the room — drag to look around' : 'Overview'); dzRefresh(); };
  $('#dzStyleBtn').onclick = () => { sfx('click'); dzStyles(); };
  $('#dzPick').onclick = () => { sfx('click'); dzBriefs(); };
  $('#dzSubmit').onclick = () => { sfx('click'); dzSubmit(); };

  // ---- style packs (unlockable): re-dresses the whole room with a transformation
  function dzStyles() {
    const cur = (dzBrief() || {}).style || S.dz.style || 'cozy', html = `<div class="stgrid">${STYLE_ORDER.map(id => { const s = STYLES[id], open = styleOpen(id); return `<button class="stcard${open ? '' : ' lock'}${id === cur ? ' on' : ''}" data-s="${id}"><b>${open ? s.ico : '🔒'} ${s.name}</b><span class="sw">${s.pal.map(c => `<i style="background:${c}"></i>`).join('')}</span><small>${open ? s.desc : `Finish ${s.need} brief${s.need > 1 ? 's' : ''} (${briefsDone()}/${s.need})`}</small></button>`; }).join('')}</div>`;
    const box = sheet({ title: 'Style packs', html: html + '<p class="sub">Applying a style re-colours the floor, walls and furniture of this room. You can still tweak every piece.</p>', actions: [{ text: 'Close', cls: 'secondary' }] });
    $$('.stcard', box).forEach(b => b.onclick = () => { const id = b.dataset.s; if (!styleOpen(id)) { sfx('bad'); toast(`Locked — finish ${STYLES[id].need} design briefs`); return; } hideModal(); dzApplyStyle(id); });
  }
  function dzApplyStyle(id) {
    const s = STYLES[id], p = dz.p, cs = new Set(rcells(p).map(c => c.join())); let ids = [], i = 0;
    S.layout.filter(o => o.lvl === p.lvl && PART[o.part].kind === 'floor' && o.part !== 'path_stone' && cs.has(o.x + ',' + o.z)).forEach(o => { const part = S.unlocked[s.floor] || !PART[s.floor].reward ? s.floor : 'floor_wood'; o.part = part; o.color = PART[part].color; ids.push(o.id); });
    roomWallPieces(roomLike(p)).filter(o => PART[o.part].cat === 'walls' && o.part !== 'wall_half').forEach(o => { o.part = s.wall[0]; o.color = s.wall[1] || PART[s.wall[0]].color; ids.push(o.id); });
    dzItems(p).filter(o => PART[o.part].paintable && PART[o.part].cat !== 'decor' && PART[o.part].layer !== 'rug').forEach(o => { o.color = s.pal[i++ % s.pal.length]; ids.push(o.id); });
    S.dz.style = id; WORLD.redraw(); WORLD.buildIn(ids); roomSparks(p, 40, 0xffffff); WORLD.camPull(1.1, 1200); save(); sfx('win'); vib([20, 30, 20]); toast(`${s.name} style applied`); banner(`${s.name.toUpperCase()} STYLE`, 'done'); renderQuest(); dzRefresh();
  }

  // ---- design briefs
  function dzBriefs() {
    const t = dz.p.t, list = BRIEFS.filter(b => b.types.includes(t)), d = dzS().done;
    const html = list.length ? list.map(b => { const done = d[b.id]; return `<button class="brow" data-b="${b.id}"><span class="bw">${b.client[0]}</span><span class="bt"><b>${b.title}</b><small>“${b.quote}”</small><small>${STYLES[b.style].ico} ${STYLES[b.style].name} • reward ${b.reward.coins}🪙${b.reward.parts.length ? ' + new furniture' : ''}</small></span><em>${done ? starsTxt(done.stars) : 'NEW'}</em></button>`; }).join('') : '<p class="sub">No briefs for this room type yet — design freely!</p>';
    const box = sheet({ title: 'Design briefs', html, actions: [{ text: 'Close', cls: 'secondary' }] });
    $$('.brow', box).forEach(b => b.onclick = () => { hideModal(); dzStartBrief(b.dataset.b); });
  }
  function dzStartBrief(id) {
    const br = BRIEFS.find(b => b.id === id); if (!br || !dz) return; const before = WORLD.shot(rcells(dz.p), dz.p.lvl, 360, 220); dzS().active = { id, key: dz.key, before: before || null }; S.dz.style = br.style; save(); sfx('win'); banner('NEW BRIEF', 'done'); toast(`${br.client}: ${br.title}`); dzRefresh();
  }
  function dzSubmit() {
    const br = dzBrief(); if (!br) return; const ev = dzEval(br);
    if (!ev.needOk) { sfx('bad'); const m = ev.needs.filter(n => !n.ok).map(n => n.label).join(', '); sheet({ ribbon: [`${br.client} says: not yet…`], html: `<p class="body">Still missing: <b>${m}</b>.</p>`, actions: [{ text: 'Keep designing' }] }); return; }
    const after = WORLD.shot(rcells(dz.p), dz.p.lvl, 360, 220), before = dzS().active.before, d = dzS().done, old = d[br.id], gained = old ? Math.max(0, ev.stars - old.stars) * 20 : br.reward.coins + ev.stars * 10;
    d[br.id] = { stars: Math.max(ev.stars, old ? old.stars : 0), at: Date.now() }; S.coins += gained; const newParts = (!old ? br.reward.parts : []).filter(x => !S.unlocked[x]); newParts.forEach(x => { S.unlocked[x] = true; }); const newStyle = STYLE_ORDER.find(id => STYLES[id].need > 0 && STYLES[id].need === briefsDone());
    dzS().active = null; save(); updateHud(); renderQuest(); sfx('win'); confetti(70); vib([40, 60, 80]); roomSparks(dz.p, 40, 0xffd166);
    const slider = before && after ? `<div class="ba2"><img src="${after}" alt="After"><div class="ba2b" id="ba2b" style="width:50%"><img src="${before}" alt="Before"></div><input type="range" min="0" max="100" value="50" id="ba2r" aria-label="Before / after"><span class="tg l">BEFORE</span><span class="tg r">AFTER</span></div>` : '';
    const box = sheet({ ribbon: [`${br.client} loves it!`, 'green'], close: false, html: `${slider}<div class="score"><div><span>Rating</span><b>${starsTxt(ev.stars)}</b></div><div><span>Quality</span><b>${ev.score}%</b></div></div><ul class="dzl res">${ev.opt.map(o => `<li class="opt ${o.ok ? 'ok' : ''}">${o.label}</li>`).join('')}</ul><div class="coinline">+${gained} ${coinI}</div>${newParts.length ? `<p class="sub">New furniture unlocked: <b>${newParts.map(x => PART[x].name).join(', ')}</b></p>` : ''}${newStyle ? `<p class="sub">Style unlocked: <b>${STYLES[newStyle].ico} ${STYLES[newStyle].name}</b></p>` : ''}`, actions: [{ text: 'Next brief ▶', fn: () => dzBriefs() }, { text: 'Keep decorating', cls: 'secondary' }] });
    const r = $('#ba2r', box); if (r) r.oninput = () => { $('#ba2b', box).style.width = r.value + '%'; };
  }
  $('#dzBrief').onclick = () => { sfx('click'); dzBriefs(); };
  // world callbacks are (re)bound at start-up, so the Design Studio hooks in from bindDesignWorld()
  function bindDesignWorld() {
    const prevMoved = WORLD.cb.moved; WORLD.cb.moved = (o) => { prevMoved && prevMoved(o); renderItems(); };
    WORLD.cb.dropped = () => { sfx('hammer'); vib(15); selPart = null; WORLD.cancelPlace(); $('#ghostBar').classList.add('hidden'); renderItems(); };
    const prevPlace = WORLD.cb.place; WORLD.cb.place = (c, rep) => { if (dz && !(S.inv[c.part] > 0) && S.coins >= PART[c.part].price) { S.coins -= PART[c.part].price; addInv(c.part, 1); toast(`Bought ${PART[c.part].name} −${PART[c.part].price}`); updateHud(); } return prevPlace(c, rep); };
    window.addEventListener('resize', () => { if (dz) setTimeout(() => { if (dz) { WORLD.roomView(rcells(dz.p), dz.p.lvl, dz.inside, 0); WORLD.focus(dz.inside ? 0 : 14, 0); WORLD.camBase(); } }, 450); });
  }
