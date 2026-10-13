import { Gfx } from './gfx.js';
import { Game, initTouch, initViewerControls } from './game.js';
import { Controller } from './input.js';
import { AI } from './fight.js';
import { kaiTextures } from './kai.js';

const settings = JSON.parse(localStorage.getItem('sc3d_settings') || '{}');
const q = new URLSearchParams(location.search).get('q') || settings.quality || 'medium';
const canvas = document.getElementById('c');
const ldr = (p, t) => { const b = document.getElementById('lbar'), x = document.getElementById('ltxt'); if (b) b.style.width = p * 100 + '%'; if (x && t) x.textContent = t; };
const tick = () => new Promise(r => requestAnimationFrame(() => setTimeout(r, 0)));
(async () => {
  ldr(.1, 'Initialising renderer…'); await tick();
  const gfx = new Gfx(canvas, q);
  ldr(.5, 'Building arena…'); await tick();
  const game = new Game(gfx);
  ldr(.8, 'Preparing fighters…'); await tick();
  game.getFighter(0, 'kai'); game.getFighter(1, 'draven'); game.getFighter(1, 'kai'); game.getFighter(0, 'draven');
  await tick(); ldr(1, 'Ready');
  document.getElementById('loading').classList.add('hide');
  { let fsDone = false; const goFs = () => { if (fsDone) return; fsDone = true; try { const el = document.documentElement; const p = el.requestFullscreen ? el.requestFullscreen() : (el.webkitRequestFullscreen && el.webkitRequestFullscreen()); const lock = () => { try { screen.orientation && screen.orientation.lock && screen.orientation.lock('landscape').catch(() => {}); } catch (e) {} }; if (p && p.then) p.then(lock).catch(() => {}); else lock(); } catch (e) {} }; if (matchMedia('(pointer:coarse)').matches) addEventListener('pointerdown', goFs, { once: true }); }
  initTouch(game); initViewerControls(game, canvas); game.toMenu();
  window.__sc = { gfx, game, AI, kaiTextures };
  let last = performance.now();
  function loop(now) {
    const dt = Math.min(.1, (now - last) / 1000); last = now;
    game.update(dt); gfx.render(dt); requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
})();
