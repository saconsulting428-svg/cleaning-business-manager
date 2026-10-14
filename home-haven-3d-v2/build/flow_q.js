  function questProgress(ch = curCh()) { return evalQ(ch.quests, layoutOf('home')); }
  function renderQuest() {
    const Q = $('#quest'); Q.onclick = (e) => { if (!e.target.closest('button')) openChapter(); };
    if (finished()) {
      const act = [...CHALL.map(c => ({ c, st: S.chal[c.id] })), ...CONTR.map(c => ({ c, st: S.contr[c.id] }))].find(x => x.st && x.st.st === 'active');
      if (act) { const pr = evalQ(act.c.quests, layoutOf(act.c.prop)), d = pr.filter(p => p.have >= p.q.n).length; Q.innerHTML = `<div class="qb"><h3>${act.c.title}</h3><div class="ql"><span>${allDone(pr) ? 'Ready — claim your reward!' : (pr.find(p => p.have < p.q.n) || pr[0]).q.text}</span><b>${d}/${pr.length}</b></div><div class="bar"><i style="width:${d / pr.length * 100}%"></i></div></div><div class="qi">${starI}</div>`; return; }
      Q.innerHTML = `<div class="qb"><h3>Dream Home</h3><div class="ql"><span>Free decorating • pick a challenge, contract or new property</span></div></div><div class="qi">${thumb('p:piano:0', 48, 46)}</div>`; return;
    }
    const ch = curCh(), pr = questProgress(), all = allDone(pr), cur = pr.find(p => p.have < p.q.n) || pr[pr.length - 1], d = pr.filter(p => p.have >= p.q.n).length, nx = CHAPTERS[S.chapter + 1];
    const icon_ = cur.q.give ? thumb(`p:${cur.q.give[0][0]}:0`, 48, 46) : thumb('p:floor_wood:0', 48, 46);
    Q.innerHTML = `<div class="qb"><h3>Chapter ${S.chapter + 1}: ${ch.title}</h3><div class="ql ${all ? 'ok' : ''}"><span>${all ? 'All objectives done!' : cur.q.text}</span><b>${cur.have}/${cur.q.n}</b></div><div class="bar"><i style="width:${cur.have / cur.q.n * 100}%"></i></div><div class="qp"><span>Objectives ${d}/${pr.length}</span><span>Next: <b>${nx ? nx.title : 'Dream Home'}</b></span></div>` + (all ? '<button class="btn primary sm" id="btnClaim">Complete chapter</button>' : '') + `</div><div class="qi">${icon_}</div>`;
    if (all) $('#btnClaim').onclick = (e) => { e.stopPropagation(); sfx('click'); completeChapter(); };
  }
