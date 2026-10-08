// Procedural top-down thief drawing (shared by gameplay, shop and character selection).
import { getVariant } from './cosmetics.js';

function ellipse(g, x, y, rx, ry, fill, stroke) {
  g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  if (fill) { g.fillStyle = fill; g.fill(); }
  if (stroke) { g.strokeStyle = stroke; g.lineWidth = Math.max(1, rx * 0.12); g.stroke(); }
}

/** Draw a thief centred at (x,y) with body radius r. `face` is radians (0 = facing east). */
export function drawThief(g, x, y, r, charId, variantId, face = Math.PI / 2, opts = {}) {
  const v = getVariant(variantId);
  const bob = opts.moving ? Math.sin((opts.t || 0) * 16) * r * 0.06 : 0;
  g.save();
  g.globalAlpha = opts.alpha ?? 1;
  g.translate(x, y + bob);
  // shadow + glow
  ellipse(g, 0, r * 0.18, r * 1.0, r * 0.82, 'rgba(0,0,0,.35)');
  if (v.glow) { g.shadowColor = v.glow; g.shadowBlur = r * 1.1; }
  g.rotate(face);
  // body
  ellipse(g, -r * 0.05, 0, r * 0.82, r * 0.95, v.suit, 'rgba(255,255,255,.25)');
  g.shadowBlur = 0;
  // loot sack / hands
  ellipse(g, -r * 0.1, -r * 0.82, r * 0.22, r * 0.22, v.accent);
  ellipse(g, -r * 0.1, r * 0.82, r * 0.22, r * 0.22, v.accent);
  // head
  ellipse(g, r * 0.22, 0, r * 0.62, r * 0.62, '#f0c9a4');
  const hx = r * 0.22;
  switch (charId) {
    case 'ninja':
      ellipse(g, hx, 0, r * 0.66, r * 0.66, '#12141f');
      g.fillStyle = '#f0c9a4'; g.fillRect(hx + r * 0.18, -r * 0.2, r * 0.38, r * 0.4);
      g.fillStyle = '#e63946'; g.fillRect(hx - r * 0.1, -r * 0.68, r * 0.22, r * 1.36);
      g.fillRect(hx - r * 0.7, -r * 0.5, r * 0.6, r * 0.14);
      break;
    case 'hacker':
      ellipse(g, hx - r * 0.05, 0, r * 0.72, r * 0.7, v.suit, v.accent);
      g.fillStyle = '#3ee8ff'; g.shadowColor = '#3ee8ff'; g.shadowBlur = r * 0.5;
      g.fillRect(hx + r * 0.3, -r * 0.36, r * 0.22, r * 0.72); g.shadowBlur = 0;
      break;
    case 'spy':
      ellipse(g, hx - r * 0.05, 0, r * 0.62, r * 0.62, '#2b2b35');
      ellipse(g, hx - r * 0.05, 0, r * 0.98, r * 0.62, '#1d1d26'); // fedora brim
      ellipse(g, hx - r * 0.05, 0, r * 0.5, r * 0.5, '#33333f');
      g.fillStyle = '#c92e40'; g.fillRect(hx - r * 0.34, -r * 0.5, r * 0.14, r);
      break;
    case 'gentleman':
      ellipse(g, hx - r * 0.1, 0, r * 0.82, r * 0.82, '#0f1018');
      ellipse(g, hx - r * 0.1, 0, r * 0.55, r * 0.55, '#1c1d2a');
      g.fillStyle = '#d1a02c'; g.fillRect(hx - r * 0.32, -r * 0.56, r * 0.12, r * 1.12);
      ellipse(g, hx + r * 0.42, r * 0.22, r * 0.14, r * 0.14, null, '#ffd86b'); // monocle
      break;
    case 'masked':
      ellipse(g, hx, 0, r * 0.64, r * 0.64, '#f0c9a4');
      g.fillStyle = '#10121c'; g.fillRect(hx + r * 0.05, -r * 0.62, r * 0.5, r * 1.24);
      g.fillStyle = '#fff'; g.fillRect(hx + r * 0.3, -r * 0.34, r * 0.1, r * 0.18); g.fillRect(hx + r * 0.3, r * 0.16, r * 0.1, r * 0.18);
      break;
    default: // classic: striped beanie + eye mask
      ellipse(g, hx - r * 0.1, 0, r * 0.62, r * 0.64, '#1a1d2e');
      g.fillStyle = '#e8ecff'; g.fillRect(hx - r * 0.34, -r * 0.62, r * 0.12, r * 1.24); g.fillRect(hx - r * 0.02, -r * 0.6, r * 0.12, r * 1.2);
      g.fillStyle = '#10121c'; g.fillRect(hx + r * 0.3, -r * 0.4, r * 0.28, r * 0.8);
      g.fillStyle = '#fff'; g.fillRect(hx + r * 0.44, -r * 0.3, r * 0.08, r * 0.18); g.fillRect(hx + r * 0.44, r * 0.12, r * 0.08, r * 0.18);
  }
  g.restore();
}
