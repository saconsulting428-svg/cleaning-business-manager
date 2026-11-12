// Button/clipping audit with the banner space reserved (mock AdMob): content cut by its own button border, controls under the banner, off-screen controls.
const { chromium } = require('/opt/node-tools/node_modules/playwright');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] });
  const sizes = (process.argv[2] || '360x740,320x640,411x891').split(','); let total = 0;
  for (const sz of sizes) {
    const [W, H] = sz.split('x').map(Number); const p = await b.newPage({ viewport: { width: W, height: H } }); p.setDefaultTimeout(60000); const errs = []; p.on('pageerror', e => { errs.push(e.message); console.log('PAGEERR', e.message); });
    await p.addInitScript(() => { const L = () => () => Promise.resolve({}); window.Capacitor = { Plugins: { AdMob: { initialize: L(), showBanner: L(), resumeBanner: L(), hideBanner: L(), addListener: L() } } }; });
    await p.goto('file:///home/user/cleaning-business-manager/home-haven-3d-v2/Home_Haven_3D.html'); await p.waitForSelector('#menu.on', { timeout: 90000 }); await p.waitForTimeout(800);
    const audit = (n) => p.evaluate((n) => {
      const out = []; const vw = innerWidth, vh = innerHeight, adb = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--adb')) || 0;
      const vis = (e) => { const r = e.getBoundingClientRect(); if (r.width < 4 || r.height < 4) return null; const cs = getComputedStyle(e); if (cs.visibility === 'hidden' || cs.display === 'none' || +cs.opacity < .05) return null; if (e.closest('.hidden,[hidden],#tg')) return null; return r; };
      document.querySelectorAll('button, .btn, .nb, .it, .tab, .boost, .pbox, .res, .bhopt').forEach(e => {
        const r = vis(e); if (!r) return; const nm = (e.id || (e.className + '')).slice(0, 22) + '[' + (e.textContent || '').trim().slice(0, 16) + ']';
        if (e.scrollWidth > e.clientWidth + 2 || e.scrollHeight > e.clientHeight + 3) if (!/^(res|plus|nav(Spin|Rewards))/.test(nm)) out.push('CUT-INSIDE ' + nm + ` sw${e.scrollWidth}/${e.clientWidth} sh${e.scrollHeight}/${e.clientHeight}`);
        [...e.children].forEach(c => { const cr = c.getBoundingClientRect(); if (cr.width > 1 && cr.height > 1 && (cr.left < r.left - 2 || cr.right > r.right + 2 || cr.top < r.top - 3 || cr.bottom > r.bottom + 3) && getComputedStyle(c).position !== 'absolute') out.push('CHILD-OUT ' + nm + ' <' + (c.className + '').slice(0, 12)); });
        const inSheet = e.closest('#mbox,.sheet,#items,#tabs,.drawer'); if (!inSheet) { if (r.right > vw + 1 || r.left < -1 || r.bottom > vh + 1 || r.top < -1) out.push('OFFSCREEN ' + nm); else if (adb && r.bottom > vh - adb + 2) out.push('UNDER-BANNER ' + nm); }
      });
      return [...new Set(out)].slice(0, 16);
    }, n);
    const shot = async (n) => { const c = await audit(n); total += c.length; console.log(`${sz} ${n.padEnd(10)}`, c.length ? JSON.stringify(c) : 'ok'); };
    await p.click('#btnContinue'); await p.waitForTimeout(2000);
    await p.evaluate(() => { __game.S.tut = { off: true, done: {}, rooms: 9 }; __game.S.chapter = 2; __game.S.coins = 900; for (let i = 0; i < 8; i++) { if (!__game.S.cleared.includes(i)) { __game.S.cleared.push(i); WORLD.clearDebris(i); } } __game.save(); for (const i of ['modal', 'dialog']) document.getElementById(i).classList.add('hidden'); try { __game.enterHome(); } catch (e) { } }); await p.waitForTimeout(1500);
    await shot('home');
    for (const id of ['navShop', 'navSpin', 'navStory', 'navProj', 'navRewards']) { await p.evaluate(i => document.getElementById(i).click(), id); await p.waitForTimeout(1100); await shot(id); await p.evaluate(() => document.getElementById('modal').classList.add('hidden')); await p.waitForTimeout(300); }
    await p.evaluate(() => document.getElementById('navBuild').click()); await p.waitForTimeout(2500); await p.evaluate(() => document.getElementById('modal').classList.add('hidden')); await shot('build');
    await p.evaluate(() => { try { __game.exitBuild(); } catch (e) { } }); await p.waitForTimeout(800);
    for (const t of ['pipe', 'tile', 'fuse']) { await p.evaluate((t) => { __game.S.hearts = 5; __game.S.howto = { pipe: 1, bolt: 1, tile: 1, wire: 1, brick: 1, fuse: 1, paint: 1 }; __game.playType(t, 3); }, t); await p.waitForTimeout(2800); await shot('pz_' + t); }
    await p.evaluate(() => __game.levelWin(2)); await p.waitForTimeout(1500); await shot('win_sheet');
    console.log(sz, 'ERRORS', JSON.stringify(errs)); await p.close();
  }
  console.log('TOTAL', total); await b.close();
})();
