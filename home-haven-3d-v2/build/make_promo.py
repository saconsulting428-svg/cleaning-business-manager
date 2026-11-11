"""Builds Home_Haven_3D_Promo.html from the finished game: everything unlocked, separate save slot, ads stubbed,
and a small recording panel (level jump / puzzle picker / chapter jump). The normal game file is NOT changed."""
import re
src = open('../Home_Haven_3D.html', encoding='utf-8').read()
s = src


def rep(old, new, count=1):
    global s
    n = s.count(old)
    assert n == count, f'count {n}!={count}: {old[:80]!r}'
    s = s.replace(old, new)


rep("const KEY = 'homehaven3d_save'", "const KEY = 'homehaven3d_promo_save'")                      # own save slot: normal progress is untouched
rep("const unlockedCats = () => { if (finished()) return CATS.map(c => c[0]);", "const unlockedCats = () => { return CATS.map(c => c[0]);")  # every build category open
rep("const loseHeart = () => {", "const loseHeart = () => { return;")                              # never run out of hearts
rep("<title>", "<title>PROMO - ", 1) if "<title>" in s else None

PANEL = r'''
<style>
#pm-b{position:fixed;left:8px;bottom:calc(8px + env(safe-area-inset-bottom,0px));z-index:9999;width:38px;height:38px;border-radius:50%;border:0;background:rgba(30,30,30,.55);color:#fff;font-size:18px;opacity:.55}
#pm-p{position:fixed;left:8px;bottom:56px;z-index:9999;width:min(300px,92vw);max-height:78vh;overflow:auto;background:#fff8ea;color:#3a2e25;border:3px solid #f2a529;border-radius:16px;padding:10px;font:600 13px Poppins,system-ui,sans-serif;display:none;box-shadow:0 10px 30px rgba(0,0,0,.4)}
#pm-p h4{margin:8px 0 4px;font-size:12px;color:#9a5b0c;letter-spacing:.5px}#pm-p .r{display:flex;flex-wrap:wrap;gap:5px}
#pm-p button,#pm-p input{font:700 12px Poppins,system-ui,sans-serif;border-radius:10px;border:2px solid #e3d5bb;background:#fff;padding:6px 9px;color:#3a2e25;min-height:34px}
#pm-p button.go{background:#4caf50;color:#fff;border-color:#388e3c}#pm-p input{width:78px}
</style>
<button id="pm-b" aria-label="Recording tools">🎬</button>
<div id="pm-p"><b>Recording tools</b> <small>(hide: double-tap 🎬)</small>
<h4>JUMP TO LEVEL</h4><div class="r"><input id="pm-lv" type="number" min="1" max="500" value="1"><button class="go" id="pm-go">Play level</button><button id="pm-m">−</button><button id="pm-pl">+</button></div>
<h4>PUZZLE TYPE (random level)</h4><div class="r" id="pm-types"></div>
<h4>STORY CHAPTER</h4><div class="r" id="pm-ch"></div>
<h4>EXTRAS</h4><div class="r"><button id="pm-coins">+ Coins</button><button id="pm-heal">Refill all</button><button id="pm-home">Home</button><button id="pm-adv">Advanced build</button></div></div>
<script>
(function () {
  const $ = (i) => document.getElementById(i), G = () => window.__game;
  function ready() { return G() && G().S && window.ADS; }
  const t0 = setInterval(() => { if (!ready()) return; clearInterval(t0); boot(); }, 300);
  function boot() {
    const S = G().S;
    window.ADS.rewarded = async () => true; window.ADS.interstitial = async () => { }; window.ADS.sync = () => { };   // no ads, instant rewards
    S.tut = { off: true, done: {}, rooms: 99 }; S.seen = Object.assign(S.seen || {}, { intro: 1 });
    if (!S.promoInit) { S.promoInit = 1; S.coins = Math.max(S.coins, 99999); S.hearts = 5; S.boosters = { hint: 99, undo: 99 }; }
    try { Object.keys(G().PART).forEach(id => { S.unlocked[id] = true; }); } catch (e) { }
    S.howto = { pipe: 1, bolt: 1, tile: 1, wire: 1, brick: 1, fuse: 1, paint: 1 };
    G().save();
    const keep = () => { const S2 = G().S; S2.hearts = 5; if (S2.coins < 5000) S2.coins = 99999; if ((S2.boosters.hint || 0) < 5) S2.boosters.hint = 99; if ((S2.boosters.undo || 0) < 5) S2.boosters.undo = 99; };
    setInterval(keep, 2000);
    const types = [['pipe', 'Pipe'], ['bolt', 'Bolts'], ['tile', 'Tile'], ['wire', 'Wire'], ['brick', 'Brick'], ['fuse', 'Fuse'], ['paint', 'Paint']];
    const order = ['pipe', 'bolt', 'tile', 'wire', 'brick', 'fuse', 'paint'];
    $('pm-types').innerHTML = types.map(t => `<button data-t="${t[0]}">${t[1]}</button>`).join('');
    $('pm-ch').innerHTML = [1, 2, 3, 4, 5, 6, 7].map(n => `<button data-c="${n - 1}">${n}</button>`).join('') + '<button data-c="7">End</button>';
    const closeAll = () => { $('pm-p').style.display = 'none'; ['modal'].forEach(i => { const m = $(i); m && m.classList.add('hidden'); }); };
    const home = () => { try { window.PUZ && PUZ.end(); GAME.scene.stop('Puzzle'); } catch (e) { } try { G().exitBuild(); } catch (e) { } $('app').classList.remove('puzzle'); G().enterHome(); };
    const play = (lv) => { closeAll(); home(); const S2 = G().S; S2.level = Math.max(1, lv | 0); S2.hearts = 5; S2.howto = { pipe: 1, bolt: 1, tile: 1, wire: 1, brick: 1, fuse: 1, paint: 1 }; G().save(); setTimeout(() => { G().renderHome(); G().startLevel(); }, 500); };
    $('pm-b').onclick = () => { const p = $('pm-p'); p.style.display = p.style.display === 'block' ? 'none' : 'block'; };
    $('pm-b').ondblclick = () => { $('pm-b').style.display = 'none'; $('pm-p').style.display = 'none'; };
    document.addEventListener('keydown', (e) => { if (e.key === 'h' && e.ctrlKey) { $('pm-b').style.display = $('pm-b').style.display === 'none' ? '' : 'none'; } });
    $('pm-go').onclick = () => play(+$('pm-lv').value);
    $('pm-m').onclick = () => { $('pm-lv').value = Math.max(1, +$('pm-lv').value - 1); }; $('pm-pl').onclick = () => { $('pm-lv').value = +$('pm-lv').value + 1; };
    $('pm-types').onclick = (e) => { const t = e.target.dataset.t; if (!t) return; const base = order.indexOf(t); const lv = base + 1 + 7 * Math.floor(Math.random() * 4); play(lv); };
    $('pm-ch').onclick = (e) => { const c = e.target.dataset.c; if (c === undefined) return; closeAll(); const S2 = G().S; S2.chapter = +c; S2.cleared = [0, 1, 2, 3, 4, 5, 6, 7]; G().save(); try { WORLD.setDebris([]); } catch (err) { } home(); setTimeout(() => location.reload(), 150); };
    $('pm-coins').onclick = () => { G().S.coins += 50000; G().save(); try { G().renderHome(); } catch (e) { } };
    $('pm-heal').onclick = () => { keep(); G().save(); };
    $('pm-home').onclick = () => { closeAll(); home(); };
    $('pm-adv').onclick = () => { const S2 = G().S; S2.adv = true; G().save(); closeAll(); try { G().enterBuild(); } catch (e) { } };
  }
})();
</script>
'''
i = s.rindex("</body>")
s = s[:i] + PANEL + s[i:]
open('../Home_Haven_3D_Promo.html', 'w', encoding='utf-8').write(s)
print('promo built', len(s) // 1024, 'KB')
