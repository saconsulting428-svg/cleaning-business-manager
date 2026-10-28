  // ------------------------------------------------------------ STORY CHECKLISTS, DEBRIS, ROOMS, DREAM HOME, CHALLENGES, CONTRACTS, PROPERTIES
  const { detectRooms, CHALLENGES: CHALL, CONTRACTS: CONTR, PROPERTIES: PROPS } = GAME_DATA;
  const propDef = (id) => PROPS.find(p => p.id === id);
  const layoutOf = (pid) => pid === S.prop ? S.layout : ((S.props[pid] && S.props[pid].layout) || []);
  const evalQ = (quests, layout) => quests.map(q => ({ q, have: Math.min(q.n, Math.max(0, q.count ? q.count(S, layout) : layout.filter(q.test).length)) }));
  const allDone = (pr) => pr.every(p => p.have >= p.q.n);
  const bar = (v, n) => `<div class="bar"><i style="width:${Math.min(1, v / n) * 100}%"></i></div>`;
  const checklist = (pr) => pr.map(p => `<div class="ql ${p.have >= p.q.n ? 'ok' : ''}" style="margin-top:6px"><span>${p.have >= p.q.n ? '✓ ' : ''}${p.q.text}</span><b>${p.have}/${p.q.n}</b></div>${bar(p.have, p.q.n)}`).join('');
  const grantPart = (id, n) => { S.unlocked[id] = 1; addInv(id, n); };
  const partsHtml = (parts) => Object.keys(parts || {}).length ? `<div class="loot">${Object.entries(parts).map(([id, n]) => `<div class="lt"><span class="th">${thumb(`p:${id}:0`, 56, 44)}</span><b>×${n}</b><small>${partName(id)}</small></div>`).join('')}</div>` : '';

  // ---- debris (chapter 1: clear the damaged property)
  const debrisLeft = () => WORLD.DEBRIS.map((_, i) => i).filter(i => !S.cleared.includes(i));
  function initDebris() { WORLD.setDebris(S.prop === 'home' ? debrisLeft() : []); }
  function bindWorldExt() {
    WORLD.cb.tapDebris = (i) => { if (S.cleared.includes(i)) return; S.cleared.push(i); WORLD.clearDebris(i); S.coins += 15; save(); sfx('hammer'); vib(15); updateHud(); toast('Cleared! +15 coins'); renderQuest(); checkQuestToast(); };
    WORLD.cb.blocked = () => { toast('Clear the debris first — tap it!'); };
  }

  // ---- full chapter checklist (reference screen 4)
  function openChapter() {
    if (finished()) return openProjects();
    const ch = curCh(), pr = questProgress(), all = allDone(pr), nx = CHAPTERS[S.chapter + 1];
    const bundle = ch.bundle.reduce((o, [id, n]) => (o[id] = n, o), {});
    const box = sheet({ ribbon: [`Chapter ${S.chapter + 1}`, 'blue'], title: ch.title,
      html: `<p class="sub">${S.chapter === CHAPTERS.length - 1 ? 'Pass the final inspection to host the housewarming party.' : 'Complete every objective to finish this chapter.'}</p>${checklist(pr)}<p class="label">Rewards</p><div class="coinline" style="font-size:22px">${coinI}+${(ch.reward && ch.reward.coins) || ECON.CHAPTER_COINS(S.chapter)}</div>${lootHtml(bundle)}${nx ? `<p class="sub">Next unlock: <b>${nx.title}</b></p>` : '<p class="sub">Next unlock: <b>Dream Home mode</b></p>'}`,
      actions: [...(all ? [{ text: 'Complete chapter', fn: () => completeChapter() }] : []), { text: `${icon('hammer')} Go to Build`, cls: all ? 'secondary' : 'primary', fn: () => enterBuild() }] });
  }

  // ---- rooms list and room editor (reference screens 5 and 8)
  let roomEdit = null;
  function openRooms() {
    if (roomEdit) return; const rooms = detectRooms(S.layout);
    const html = rooms.length ? rooms.map((r, i) => `<div class="row2" data-i="${i}"><span class="rimg" id="rimg${i}"></span><span class="rt"><b>${r.name}</b><small>${r.lvl ? 'First floor' : 'Ground floor'} • ${r.size} tiles • ${r.items.length} item${r.items.length === 1 ? '' : 's'}${r.enclosed ? '' : ' • not enclosed'}${S.rooms[r.key] ? ' • saved' : ''}</small></span><button class="btn primary sm" data-edit="${i}">Edit</button></div>`).join('') : '<p class="sub">No rooms yet. Lay floor tiles and close them in with walls — every enclosed area becomes a room you can design.</p>';
    const box = sheet({ title: 'Rooms', html: `<p class="sub">Tap Edit to design a room in close-up: furniture, decorations, floor and wall colors.</p>${html}`, actions: [{ text: 'Close', cls: 'secondary' }] });
    rooms.forEach((r, i) => setTimeout(() => { const el = $('#rimg' + i, box); if (!el) return; const u = WORLD.shot(r.cells, r.lvl, 240, 160); if (u) el.innerHTML = `<img alt="" src="${u}">`; }, 40 + i * 60));
    $$('[data-edit]', box).forEach(b => b.onclick = () => { sfx('click'); hideModal(); enterRoomEdit(rooms[+b.dataset.edit]); });
  }
  const inRoom = (o, r) => { const set = new Set(r.cells.map(c => c.join())); return o.lvl === r.lvl && cellsOfLayout(o).some(c => set.has(c.join())); };
  const cellsOfLayout = (o) => WORLD.cellsOf(o);
  const roomWallPieces = (r) => { const set = new Set(r.cells.map(c => c.join())), EDG = [[0, -.5], [.5, 0], [0, .5], [-.5, 0]], D = [[0, -1], [1, 0], [0, 1], [-1, 0]], keys = new Set(); r.cells.forEach(([x, z]) => D.forEach((_, d) => keys.add(((x + .5 + EDG[d][0]) * 2) + ',' + ((z + .5 + EDG[d][1]) * 2)))); return S.layout.filter(o => o.lvl === r.lvl && PART[o.part].kind === 'wall' && PART[o.part].cat !== 'garden' && keys.has(((o.x + .5 + EDG[o.rot][0]) * 2) + ',' + ((o.z + .5 + EDG[o.rot][1]) * 2))); };
  function enterRoomEdit(r) {
    roomEdit = { key: r.key, name: r.name, lvl: r.lvl, cells: r.cells, room: r }; $('#build').classList.add('roomedit'); enterBuild();
    $$('.sg').forEach(b => b.classList.toggle('on', +b.dataset.l === r.lvl)); WORLD.setLevel(r.lvl); WORLD.setInterior(true); WORLD.focusRoom(r.cells, r.lvl);
    curCat = ['furniture', 'decor', 'kitchen', 'bath', 'bedroom'].find(c => unlockedCats().includes(c)) || curCat; renderTabs(); renderItems(); $('#reName').textContent = r.name; hint(`Designing the ${r.name}`);
    WORLD.setRoomLabel(r.cells, r.lvl, r.name); if (typeof guideRefresh === 'function') guideRefresh();
  }
  function exitRoomEdit() { roomEdit = null; if (typeof bhStop === 'function') bhStop(); $('#build').classList.remove('roomedit', 'guided'); $('#guide').classList.add('hidden'); WORLD.setRoomLabel(null); WORLD.setInterior(S.interior); WORLD.resetFocus(); }
  function roomRecolor(kind, col) {
    const r = roomEdit.room, list = kind === 'walls' ? roomWallPieces(r) : S.layout.filter(o => o.lvl === r.lvl && PART[o.part].kind === 'floor' && o.part !== 'path_stone' && r.cells.some(c => c[0] === o.x && c[1] === o.z));
    const ops = list.filter(o => (o.color || PART[o.part].color) !== col).map(o => { const old = o.color; o.color = col; return { t: 'paint', id: o.id, old }; });
    if (!ops.length) return toast('Already that color'); undoStack.push({ t: 'multi', ops }); S.stats.painted += ops.length; save(); WORLD.redraw(); sfx('pop'); renderQuest(); toast(`${kind === 'walls' ? 'Walls' : 'Floor'} painted`);
  }
  function roomPalette(kind) {
    const pal = $('#palette'); if (!pal.classList.contains('hidden') && pal.dataset.kind === kind) { pal.classList.add('hidden'); return; } pal.innerHTML = ''; pal.dataset.kind = kind;
    PAINT.forEach(c => { const b = document.createElement('button'); b.className = 'sw'; b.style.background = c; b.setAttribute('aria-label', 'Paint ' + c); b.onclick = () => roomRecolor(kind, c); pal.appendChild(b); }); pal.classList.remove('hidden'); $('#selBar').classList.add('hidden');
  }
  function saveRoom() { const r = roomEdit.room, items = S.layout.filter(o => PART[o.part].kind === 'item' && inRoom(o, r)).map(clone); S.rooms[roomEdit.key] = { name: roomEdit.name, items, at: Date.now() }; save(); sfx('win'); toast(`${roomEdit.name} saved (${items.length} items)`); }
  function restoreRoom() {
    const sv = S.rooms[roomEdit.key]; if (!sv) return toast('Nothing saved yet'); let moved = 0, placed = 0, missing = 0;
    sv.items.forEach(it => { const cur = S.layout.find(o => o.id === it.id); if (cur) { Object.assign(cur, { x: it.x, z: it.z, rot: it.rot, lvl: it.lvl, color: it.color }); moved++; } else if ((S.inv[it.part] || 0) > 0) { S.inv[it.part]--; if (!S.inv[it.part]) delete S.inv[it.part]; S.layout.push(Object.assign(clone(it), { id: 'o' + (S.nextId++) })); placed++; } else missing++; });
    save(); WORLD.redraw(); renderItems(); sfx('pop'); toast(`Restored ${moved + placed} items${missing ? `, ${missing} missing from inventory` : ''}`);
  }
  $('#reWalls').onclick = () => { sfx('click'); roomPalette('walls'); };
  $('#reFloor').onclick = () => { sfx('click'); roomPalette('floor'); };
  $('#reSave').onclick = () => { sfx('click'); saveRoom(); };
  $('#reRestore').onclick = () => { sfx('click'); restoreRoom(); };

  // ---- story ending
  function showStoryComplete(after, coins) {
    const before = S.firstShot; S.storyDone = true; S.coins += 1500; ['sofa_modern', 'bed_double', 'table_round'].forEach(id => grantPart(id, 1)); save(); updateHud();
    const prevNight = S.night; WORLD.setNight(true); [0, 700, 1400].forEach(t => setTimeout(() => confetti(120), t)); sfx('win'); WORLD.setInterior(false);
    setTimeout(() => { WORLD.setNight(prevNight); }, 6500);
    sheet({ ribbon: ['Story Completed!', 'orange'], close: false,
      html: `<p class="sub">The housewarming party was a hit. Ben, Mom, Alex, Zoe — even Mr. Parker — raised a glass to the new family home.</p>${before && after ? `<div class="ba"><figure><img src="${before}" alt="Before"><figcaption>The empty plot</figcaption></figure><figure><img src="${after}" alt="After"><figcaption>Your dream home</figcaption></figure></div>` : ''}<div class="coinline">${coinI}+${coins + 1500}</div><p class="label">Special completion reward</p>${partsHtml({ sofa_modern: 1, bed_double: 1, table_round: 1 })}<p class="body"><b>Dream Home Mode unlocked!</b> Keep decorating freely, take on homeowner challenges, renovate new properties and sign renovation contracts.</p>`,
      actions: [{ text: 'Enter Dream Home', fn: () => { renderHome(); openProjects(); } }] });
  }

  // ---- properties
  function switchProperty(id) {
    if (id === S.prop) return true; const def = propDef(id); if (!def || !def.unlocked(S)) return false; if (roomEdit) exitRoomEdit();
    S.props[S.prop] = { layout: S.layout, plan: S.plan }; const t = S.props[id]; S.plan = t && t.plan || null;            // park the current property in S.props
    S.layout = t && t.layout ? t.layout : (def.preset ? def.preset() : []); delete S.props[id]; S.prop = id; // the active property always lives in S.layout
    WORLD.setLayout(S.layout); WORLD.setTheme(def.theme); initDebris(); undoStack.length = 0; save(); renderHome(); return true;
  }
  const propDone = (id) => id === 'home' ? S.chapter >= CHAPTERS.length : id === 'cottage' ? (S.chal.parker_house || {}).st === 'done' : (S.contr.c_transform || {}).st === 'done';

  // ---- challenges and contracts share one state machine: new -> active -> done
  function rewardHtml(rw) { return `${rw.coins ? `<div class="coinline" style="font-size:22px;margin:2px 0">${coinI}+${rw.coins}</div>` : ''}${rw.stars ? `<div class="coinline" style="font-size:22px;margin:2px 0">${starI}+${rw.stars}</div>` : ''}${partsHtml(rw.parts)}`; }
  function claim(def, store) {
    const st = store[def.id] || {}, pr = evalQ(def.quests, layoutOf(def.prop)); if (st.st !== 'active' || !allDone(pr)) return;
    store[def.id] = { st: 'done' }; const rw = def.reward || {}; S.coins += rw.coins || 0; S.stars += rw.stars || 0; Object.entries(rw.parts || {}).forEach(([id, n]) => grantPart(id, n)); (def.unlocks || []).forEach(u => { S.unlocked[u] = 1; });
    save(); updateHud(); sfx('win'); confetti(80); renderHome();
    sheet({ ribbon: ['Completed!', 'green'], html: `<p class="sub"><b>${def.title}</b></p>${rewardHtml(rw)}${(def.unlocks || []).some(u => u.startsWith('property:')) ? '<p class="body"><b>New property unlocked!</b> Open the Map tab to visit it.</p>' : ''}${def.next ? `<p class="sub">Next contract: <b>${CONTR.find(c => c.id === def.next).title}</b></p>` : ''}`, actions: [{ text: 'Continue', fn: () => openProjects(CONTR.includes(def) ? 'contracts' : 'challenges') }] });
  }
  function projectCard(def, store, isContract) {
    const st = (store[def.id] || {}).st, lay = layoutOf(def.prop), pr = evalQ(def.quests, lay), ok = allDone(pr), pd = propDef(def.prop), pOk = pd.unlocked(S);
    const idx = CONTR.indexOf(def), prevOk = !isContract || idx === 0 || (S.contr[CONTR[idx - 1].id] || {}).st === 'done'; const avail = pOk && prevOk;
    const done = n => pr.filter(p => p.have >= p.q.n).length;
    let act = '', lock = '';
    if (st === 'done') act = '<span class="chip">✓ Completed</span>';
    else if (!avail) { lock = !pOk ? `Unlocks with ${pd.name}` : `Finish “${CONTR[idx - 1].title}” first`; act = `<span class="chip">🔒 ${lock}</span>`; }
    else if (st !== 'active') act = `<button class="btn primary sm" data-start="${def.id}">Start</button>`;
    else if (ok) act = `<button class="btn primary sm" data-claim="${def.id}">Claim reward</button>`;
    else act = def.prop !== S.prop ? `<button class="btn blue sm" data-go="${def.prop}">Go to ${pd.name}</button>` : `<button class="btn accent sm" data-build="1">Open Build</button>`;
    const body = st === 'active' ? `${checklist(pr)}` : `<small>${def.blurb}</small>`;
    return `<div class="card" style="margin:8px 0;text-align:left"><div style="display:flex;align-items:center;gap:10px"><span class="ri" style="font-size:26px">${def.who ? `<img alt="" src="${SPRITES.portraits[def.who]}" style="width:44px;height:44px;object-fit:cover;object-position:top;border-radius:50%;background:var(--cream2)">` : '🏗️'}</span><span class="rt" style="flex:1"><b style="font-size:14px">${def.title}</b><small style="display:block;color:var(--mute);font-size:12px">${pd.name} • ${st === 'active' ? `${done()}/${pr.length} objectives` : 'Reward: ' + coinI + (def.reward.coins || 0) + (Object.keys(def.reward.parts || {}).length ? ' + new items' : '')}</small></span></div><div style="margin-top:6px">${body}</div><div style="margin-top:8px;text-align:right">${act}</div></div>`;
  }
  function openProjects(tab = 'challenges') {
    if (!finished()) {
      const pr = questProgress(), d = pr.filter(p => p.have >= p.q.n).length;
      return sheet({ ribbon: ['Dream Home', 'purple'], html: `<p class="sub">Finish the story to unlock Dream Home Mode: free decorating, homeowner challenges, renovation contracts and new properties.</p><div class="row2"><span class="ri">📍</span><span class="rt"><b>Chapter ${S.chapter + 1}: ${curCh().title}</b><small>${d} of ${pr.length} objectives done</small></span></div>`, actions: [{ text: 'Open chapter', fn: () => openChapter() }] });
    }
    const T = [['challenges', 'Challenges'], ['contracts', 'Contracts'], ['map', 'Map']];
    const body = tab === 'challenges' ? `<p class="sub">Neighbors ask for specific renovations. Build it your own way — completion is checked against your real house.</p>${CHALL.map(c => projectCard(c, S.chal, false)).join('')}`
      : tab === 'contracts' ? `<p class="sub">Renovation contracts: a project, requirements and a reward. Finishing one opens the next.</p>${CONTR.map(c => projectCard(c, S.contr, true)).join('')}`
      : PROPS.map(p => { const ok = p.unlocked(S), cur = S.prop === p.id; return `<div class="row2"><span class="ri" style="font-size:30px">${p.id === 'beach' ? '🏖️' : p.id === 'cottage' ? '🏚️' : '🏡'}</span><span class="rt"><b>${p.name}</b><small>${p.blurb}${propDone(p.id) ? ' • Completed' : ''}</small></span>${ok ? (cur ? '<span class="chip">You are here</span>' : `<button class="btn primary sm" data-visit="${p.id}">Visit</button>`) : '<span class="chip">🔒 Locked</span>'}</div>`; }).join('') + '<p class="sub">Each property has its own layout. Your first home always stays as you left it.</p>';
    const box = sheet({ ribbon: ['Dream Home', 'purple'], html: `<div class="stabs">${T.map(t => `<button class="stab ${t[0] === tab ? 'on' : ''}" data-tab="${t[0]}">${t[1]}</button>`).join('')}</div>${body}` });
    $$('.stab', box).forEach(b => b.onclick = () => { sfx('click'); openProjects(b.dataset.tab); });
    const find = (id) => CHALL.find(c => c.id === id) || CONTR.find(c => c.id === id), storeOf = (id) => CHALL.some(c => c.id === id) ? S.chal : S.contr;
    $$('[data-start]', box).forEach(b => b.onclick = () => { const d = find(b.dataset.start); storeOf(d.id)[d.id] = { st: 'active' }; save(); sfx('pop'); hideModal(); if (d.who) story([[d.who, d.blurb]], () => openProjects(tab)); else openProjects(tab); });
    $$('[data-claim]', box).forEach(b => b.onclick = () => { const d = find(b.dataset.claim); hideModal(); claim(d, storeOf(d.id)); });
    $$('[data-go]', box).forEach(b => b.onclick = () => { hideModal(); switchProperty(b.dataset.go); toast(`Now at ${propDef(b.dataset.go).name}`); });
    $$('[data-build]', box).forEach(b => b.onclick = () => { hideModal(); enterBuild(); });
    $$('[data-visit]', box).forEach(b => b.onclick = () => { hideModal(); if (switchProperty(b.dataset.visit)) toast(`Welcome to the ${propDef(b.dataset.visit).name}`); });
  }
  $('#navProj').onclick = () => { sfx('click'); openProjects(); };
  $('#bRooms').onclick = () => { sfx('click'); exitBuild(); openRooms(); };
  $('#reBack').onclick = () => { sfx('click'); exitBuild(); openRooms(); };
