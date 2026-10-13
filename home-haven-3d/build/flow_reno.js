  // ------------------------------------------------------------ RENOVATION (Homescapes-style: pick a style, preview it live, confirm with stars)
  const RDAT = RENO.DATA, RBY = RDAT.BY_ID;
  const taskDone = (id) => S.reno[id] !== undefined && S.reno[id] !== null;
  const chapterOfSlot = (id) => CHAPTERS.findIndex(c => c.tasks.includes(id));
  const chDone = (ch = curCh()) => ch.tasks.filter(taskDone).length;
  const chRoomId = () => (finished() ? null : curCh().room);
  const affordable = () => finished() ? 0 : curCh().tasks.filter(id => !taskDone(id) && RBY[id].cost <= S.stars).length;
  const nextTask = () => finished() ? null : (curCh().tasks.find(id => !taskDone(id) && RBY[id].cost <= S.stars) || curCh().tasks.find(id => !taskDone(id)) || null);
  const reno = { ready: false }; let task = null; const bubs = {};

  function initReno() {
    try {
      RENO.init($('#reno3d')); RENO.setChoices(S.reno); RENO.setNightNow(S.night); RENO.cb.tap = onRenoTap; RENO.cb.frame = updateBubbles; reno.ready = true;
    } catch (e) { reno.ready = false; $('#app').classList.add('no3d'); console.error('3D init failed', e); }
  }
  function focusHome(instant) { if (reno.ready) RENO.focus(chRoomId(), null, { shift: -14, instant }); }

  // ---- floating task bubbles (positioned over the 3D scene every frame)
  const bubbleSet = () => {
    if (!reno.ready || !$('#home').classList.contains('on')) return [];
    if (finished()) { const r = RENO.currentRoom(); return r ? RDAT.SLOTS.filter(s => s.room === r).map(s => s.id) : []; }
    return curCh().tasks.filter(id => !taskDone(id));
  };
  function renderBubbles() {
    const box = $('#bubbles'); if (!box) return; const want = bubbleSet();
    Object.keys(bubs).forEach(id => { if (!want.includes(id)) { bubs[id].el.remove(); delete bubs[id]; } });
    want.forEach((id, i) => {
      const s = RBY[id], fin = finished() || taskDone(id); let b = bubs[id];
      if (!b) {
        const el = document.createElement('div'); el.className = 'bub'; el.innerHTML = '<button class="bb"><img alt=""><span class="bc"></span></button>';
        $('button', el).onclick = () => { sfx('click'); openTask(id); }; el.style.display = 'none'; box.appendChild(el); b = bubs[id] = { el };
        setTimeout(() => { if (bubs[id] === b) $('img', el).src = RENO.thumb(id, taskDone(id) ? S.reno[id] : 0); }, 40 + i * 35);
      }
      const bb = $('button', b.el), can = fin || S.stars >= s.cost;
      b.el.classList.toggle('can', can && !fin); b.el.classList.toggle('cant', !can); b.el.classList.toggle('done', fin);
      $('.bc', b.el).innerHTML = fin ? '✎' : `${starI}${s.cost}`; bb.setAttribute('aria-label', `${fin ? 'Restyle' : 'Renovate'} ${s.name}${fin ? '' : ', ' + s.cost + ' stars'}`);
    });
  }
  function updateBubbles() {
    const ids = Object.keys(bubs); if (!ids.length) return;
    ids.forEach(id => { const p = RENO.project(id), el = bubs[id].el; if (!p.vis) { el.style.display = 'none'; return; } el.style.display = ''; el.style.transform = `translate(${Math.round(p.x)}px,${Math.round(p.y)}px)`; });
  }
  function onRenoTap(hit) {
    if (!hit || !$('#home').classList.contains('on') || !$('#modal').classList.contains('hidden') || !$('#dialog').classList.contains('hidden')) return;
    if (hit.slot) {
      const ci = chapterOfSlot(hit.slot);
      if (!finished() && ci > S.chapter) { sfx('bad'); toast(`Unlocks in Chapter ${ci + 1}: ${CHAPTERS[ci].title}`); if (RENO.currentRoom() !== RBY[hit.slot].room) RENO.focus(RBY[hit.slot].room, null, { shift: -14 }); renderBubbles(); return; }
      if (RENO.currentRoom() !== RBY[hit.slot].room) { sfx('tick'); RENO.focus(RBY[hit.slot].room, null, { shift: -14 }); renderBubbles(); return; }
      openTask(hit.slot); return;
    }
    if (hit.room && RENO.currentRoom() !== hit.room) { sfx('tick'); RENO.focus(hit.room, null, { shift: -14 }); renderBubbles(); }
  }

  // ---- style picker
  function openTask(id) {
    if (!reno.ready) { sheet({ title: '3D view not available', html: '<p class="sub">Your device or browser has no WebGL support, which the renovation view needs. Please update your browser or try another device.</p>', actions: [{ text: 'OK' }] }); return; }
    const s = RBY[id], ci = chapterOfSlot(id);
    if (!finished() && ci > S.chapter) { sfx('bad'); toast(`Unlocks in Chapter ${ci + 1}`); return; }
    const cur = taskDone(id) ? S.reno[id] : null; task = { id, cur, sel: cur !== null ? cur : 0 };
    show('reno'); renderTask(); RENO.focus(s.room, id, { shift: Math.max(0, ($('.rpanel').offsetHeight - 56) / 2) }); RENO.preview(id, task.sel); sfx('pop');
  }
  function renderTask() {
    const s = RBY[task.id], first = task.cur === null, P = $('.rpanel');
    $('#rRoom').textContent = RDAT.ROOMS[s.room].name; $('#rName').textContent = s.name; $('#rStars').textContent = S.stars;
    $('#rHint').innerHTML = first ? `Pick a style — then confirm for ${starI}<b>${s.cost}</b>` : 'Pick another style — changing is free';
    const C = $('#rCards'); C.innerHTML = '';
    s.variants.forEach((v, i) => {
      const b = document.createElement('button'); b.className = 'rc' + (i === task.sel ? ' on' : ''); b.setAttribute('aria-label', v.name);
      b.innerHTML = `<span class="ck">✓</span><img alt="" src="${RENO.thumb(task.id, i)}"><span class="nm">${v.name}</span>${task.cur === i ? '<span class="cur">Current</span>' : ''}`;
      b.onclick = () => { if (task.sel === i) return; task.sel = i; sfx('pop'); RENO.preview(task.id, i); $$('.rc', C).forEach((x, k) => x.classList.toggle('on', k === i)); renderTaskBtn(); };
      C.appendChild(b);
    });
    renderTaskBtn();
  }
  function renderTaskBtn() {
    const s = RBY[task.id], first = task.cur === null, ok = $('#rOk'), pl = $('#rPlay'), need = s.cost - S.stars;
    pl.classList.toggle('hidden', !(first && need > 0));
    if (first) { ok.disabled = need > 0; ok.innerHTML = need > 0 ? `Need ${need} more ${starI}` : `${icon('hammer')} Renovate • ${starI}${s.cost}`; }
    else { ok.disabled = false; ok.innerHTML = task.sel === task.cur ? 'Keep this style' : `${icon('check')} Use this style • free`; }
  }
  function closeTask(revert = true) {
    if (!task) return; if (revert) RENO.revert(task.id); const room = RBY[task.id].room; task = null;
    show('home'); RENO.focus(room === chRoomId() || finished() ? room : room, null, { shift: -14 }); if (!finished() && room !== chRoomId()) focusHome(); renderHome();
  }
  function confirmTask() {
    if (!task) return; const id = task.id, s = RBY[id], first = task.cur === null, sel = task.sel;
    if (first && S.stars < s.cost) { sfx('bad'); return; }
    if (!first && sel === task.cur) { closeTask(true); return; }
    if (first) { S.stars -= s.cost; S.stats.placed++; } else S.stats.painted++;
    S.reno[id] = sel; save(); updateHud(); task = null;
    const room = s.room, justDone = first && !finished() && chapterOfSlot(id) === S.chapter && chDone() === curCh().tasks.length;
    show('home'); RENO.commit(id, sel, { pop: true }); RENO.celebrate(id); RENO.focus(room, null, { shift: -14 });
    sfx(first ? 'fix' : 'pop'); vib(30); confetti(first ? 24 : 8); bump($('#hudStars').parentElement);
    renderHome();
    if (justDone) { setTimeout(() => { RENO.roomComplete(room); sfx('win'); }, 600); setTimeout(completeChapter, 1900); }
    else if (first) toast(`${s.name} renovated!`);
    const a = ACH.find(x => x.id === 'place50'); void a;
  }
  $('#rBack').onclick = () => { sfx('click'); closeTask(true); };
  $('#rOk').onclick = () => { sfx('click'); confirmTask(); };
  $('#rPlay').onclick = () => { sfx('click'); closeTask(true); startLevel(); };

  // ---- home helpers
  const chapterThumb = () => { const id = nextTask(); return id && reno.ready ? `<img alt="" src="${RENO.thumb(id, 0)}">` : starI; };
  $('#vZoomIn').onclick = () => reno.ready && RENO.zoom(1.2);
  $('#vZoomOut').onclick = () => reno.ready && RENO.zoom(1 / 1.2);
  $('#vRotate').onclick = () => { sfx('click'); reno.ready && RENO.nudgeYaw(); };
  $('#vInterior').onclick = () => { sfx('click'); if (!reno.ready) return; const home = chRoomId(); if (RENO.currentRoom() !== home || !home) { if (!home && RENO.currentRoom() === null) RENO.focus('living', null, { shift: -14 }); else RENO.focus(home, null, { shift: -14 }); } else RENO.overview({ shift: -14 }); renderBubbles(); };
  $('#navBuild').onclick = () => { sfx('click'); AUDIO.unlock(); const id = nextTask(); if (id && reno.ready) { RENO.focus(RBY[id].room, null, { shift: -14 }); openTask(id); } else if (finished()) { RENO.overview({ shift: -14 }); toast('Tap any room, then an item to restyle it'); } };
