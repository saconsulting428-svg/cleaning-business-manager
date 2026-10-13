  function questProgress(ch = curCh()) { return [{ q: { text: 'Renovation tasks', n: ch.tasks.length }, have: chDone(ch) }]; }
  function renderQuest() {
    const Q = $('#quest');
    if (finished()) { Q.innerHTML = `<div class="qb"><h3>Home sweet home!</h3><div class="ql"><span>Tap a room, then any item, to restyle it for free.</span></div></div><div class="qi">${starI}</div>`; return; }
    const ch = curCh(), n = ch.tasks.length, d = chDone(ch), all = d >= n, aff = affordable();
    Q.innerHTML = `<div class="qb"><h3>Chapter ${S.chapter + 1}: ${ch.title}</h3><div class="ql"><span>${all ? 'Everything is renovated!' : aff ? `${aff} renovation${aff > 1 ? 's' : ''} ready — tap a bubble` : 'Win puzzle levels to earn stars'}</span><b>${d}/${n}</b></div><div class="bar"><i style="width:${d / n * 100}%"></i></div>` + (all ? '<button class="btn primary sm" id="btnClaim">Complete chapter</button>' : '') + `</div><div class="qi">${all ? starI : chapterThumb()}</div>`;
    if (all) $('#btnClaim').onclick = () => { sfx('click'); completeChapter(); };
  }
