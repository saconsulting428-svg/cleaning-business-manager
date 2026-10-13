  // ------------------------------------------------------------ chapters (materials were replaced by stars + renovation tasks)
  const guaranteedMats = () => ({}), bonusMats = () => ({}), grant = () => { }, merge = (a, b) => ({ ...a, ...(b || {}) }), lootHtml = () => '';
  function startChapter() {
    const ch = curCh(); if (finished() || S.seen['ch' + S.chapter]) return;
    S.seen['ch' + S.chapter] = 1; if (reno.ready) { focusHome(); try { S.chBefore = RENO.shot(ch.room); } catch (e) { S.chBefore = null; } } save();
    story(ch.intro, () => { renderHome(); toast('Tap a bubble to renovate!'); });
  }
  function completeChapter() {
    const ch = curCh(); if (finished() || chDone(ch) < ch.tasks.length) return;
    const coins = ECON.CHAPTER_COINS(S.chapter), bonus = ECON.CHAPTER_STARS, before = S.chBefore; let after = null;
    try { after = RENO.shot(ch.room); } catch (e) { }
    S.coins += coins; S.stars += bonus; S.chapter++; S.stats.chapters = S.chapter; S.chBefore = null; save();
    sfx('win'); confetti(100); vib([40, 60, 40, 60, 80]); renderHome(); focusHome();
    story(ch.outro, () => {
      sheet({ ribbon: [`Chapter ${S.chapter} complete!`, 'green'], close: false,
        html: (before && after ? `<div class="ba"><figure><img src="${before}" alt="Before"><figcaption>Before</figcaption></figure><figure><img src="${after}" alt="After"><figcaption>After</figcaption></figure></div>` : '') +
          `<div class="coinline">${coinI}+${coins}</div><div class="coinline" style="margin-top:0">${starI}+${bonus}</div>` +
          (finished() ? '<p class="body"><b>You renovated the whole family home!</b> Tap any room and any item to restyle it — for free.</p>' : `<p class="sub">Next: <b>${curCh().title}</b></p>`),
        actions: [{ text: finished() ? 'Home sweet home' : 'Next chapter', fn: () => { renderHome(); if (!finished()) startChapter(); else { confetti(150); RENO.overview({ shift: -14 }); renderBubbles(); } } }] });
    });
  }

