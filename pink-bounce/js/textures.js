/* All art is generated at boot with canvas - no image assets to load. */
PB.NORMAL_COLORS = ['#ff3d9a', '#a64bff', '#3b82ff', '#22d3ee'];
PB.NORMAL_TINTS = [0xff3d9a, 0xa64bff, 0x3b82ff, 0x22d3ee];

PB.makeTextures = function (scene) {
  const T = scene.textures, C = PB.CFG, TAU = Math.PI * 2;

  function make(key, w, h, draw) {
    if (T.exists(key)) return;
    const t = T.createCanvas(key, w, h);
    draw(t.getContext('2d'), w, h);
    t.refresh();
  }
  function rr(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath();
  }

  /* ---- balls: 64px frame (r=9) and 96px frame (r=16) ---- */
  function ball(key, size, r, glow, core, mid) {
    make(key, size, size, (ctx) => {
      const c = size / 2;
      ctx.shadowColor = glow; ctx.shadowBlur = r * 1.7;
      const g = ctx.createRadialGradient(c - r * 0.3, c - r * 0.3, 1, c, c, r);
      g.addColorStop(0, core); g.addColorStop(1, mid);
      ctx.fillStyle = g;
      for (let i = 0; i < 2; i++) { ctx.beginPath(); ctx.arc(c, c, r, 0, TAU); ctx.fill(); }
    });
  }
  ball('ball', 64, C.BALL_R, '#ff3df2', '#ffffff', '#ff5fd8');
  ball('ball_fire', 64, C.BALL_R, '#ff8a1f', '#fff7c2', '#ff7a18');
  ball('ball_big', 96, C.BIG_R, '#ff3df2', '#ffffff', '#ff5fd8');
  ball('ball_big_fire', 96, C.BIG_R, '#ff8a1f', '#fff7c2', '#ff7a18');

  /* ---- blocks: 62x36 frame, 46x20 block centred (8px glow margin) ---- */
  function block(key, fillTop, fillBot, border, glow, decorate) {
    make(key, 62, 36, (ctx) => {
      ctx.shadowColor = glow; ctx.shadowBlur = 9;
      const g = ctx.createLinearGradient(0, 8, 0, 28);
      g.addColorStop(0, fillTop); g.addColorStop(1, fillBot);
      ctx.fillStyle = g; rr(ctx, 8, 8, 46, 20, 4); ctx.fill();
      ctx.shadowBlur = 0; ctx.lineWidth = 1.5; ctx.strokeStyle = border; ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.22)'; rr(ctx, 11, 10, 40, 5, 2); ctx.fill();
      if (decorate) decorate(ctx);
    });
  }
  PB.NORMAL_COLORS.forEach((col, i) => block('blk_n' + i, col, shade(col, -0.35), '#ffffff99', col));

  const RHP = { 3: ['#7c3aed', '#3b1a78', '#e9d5ff'], 2: ['#a855f7', '#5b2a9e', '#f0abfc'], 1: ['#e879f9', '#a21caf', '#ffffff'] };
  [3, 2, 1].forEach((hp) => {
    const c = RHP[hp];
    block('blk_r' + hp, c[0], c[1], c[2], '#c084fc', (ctx) => {
      ctx.fillStyle = '#ffffffcc';
      for (let i = 0; i < hp; i++) { ctx.beginPath(); ctx.arc(31 + (i - (hp - 1) / 2) * 9, 20, 2.4, 0, TAU); ctx.fill(); }
      if (hp < 3) { ctx.strokeStyle = 'rgba(0,0,0,0.55)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(16, 8); ctx.lineTo(21, 17); ctx.lineTo(18, 28); ctx.stroke(); }
      if (hp < 2) { ctx.beginPath(); ctx.moveTo(44, 8); ctx.lineTo(40, 18); ctx.lineTo(46, 28); ctx.stroke(); }
    });
  });
  block('blk_b', '#fff3a3', '#f59e0b', '#ffffff', '#fde047', (ctx) => {
    ctx.fillStyle = '#7a3e00'; ctx.font = 'bold 15px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('★', 31, 19);
  });
  block('blk_u', '#64748b', '#334155', '#cbd5e1', '#60a5fa', (ctx) => {
    ctx.save(); rr(ctx, 8, 8, 46, 20, 4); ctx.clip();
    ctx.strokeStyle = 'rgba(15,23,42,0.55)'; ctx.lineWidth = 3;
    for (let x = -20; x < 70; x += 9) { ctx.beginPath(); ctx.moveTo(x, 30); ctx.lineTo(x + 22, 6); ctx.stroke(); }
    ctx.restore();
  });

  /* ---- moving obstacle: 110x30 frame, 96x16 bar centred ---- */
  make('obs', 110, 30, (ctx) => {
    ctx.shadowColor = '#ff2d55'; ctx.shadowBlur = 10;
    const g = ctx.createLinearGradient(0, 7, 0, 23);
    g.addColorStop(0, '#ff5470'); g.addColorStop(1, '#8f1030');
    ctx.fillStyle = g; rr(ctx, 7, 7, 96, 16, 7); ctx.fill();
    ctx.shadowBlur = 0; ctx.strokeStyle = '#ffd0d8'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.save(); rr(ctx, 7, 7, 96, 16, 7); ctx.clip();
    ctx.strokeStyle = 'rgba(40,0,10,0.5)'; ctx.lineWidth = 4;
    for (let x = -10; x < 120; x += 14) { ctx.beginPath(); ctx.moveTo(x, 24); ctx.lineTo(x + 12, 6); ctx.stroke(); }
    ctx.restore();
  });

  /* ---- falling power-up capsules: 60x34 frame, 48x24 pill ---- */
  PB.POWERUP_KEYS.forEach((k) => {
    const d = PB.POWERUPS[k], col = d.css;
    make('pu_' + k, 60, 34, (ctx) => {
      ctx.shadowColor = col; ctx.shadowBlur = 10;
      ctx.fillStyle = '#12081f'; rr(ctx, 6, 5, 48, 24, 12); ctx.fill();
      ctx.lineWidth = 2.2; ctx.strokeStyle = col; ctx.stroke();
      ctx.shadowBlur = 0; ctx.fillStyle = col;
      ctx.font = 'bold 13px "Trebuchet MS", Arial, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(d.label, 30, 18);
    });
  });

  /* ---- backgrounds ---- */
  make('bgfill', C.W, C.H, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#0b0422'); g.addColorStop(0.6, '#0d0526'); g.addColorStop(1, '#16062f');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    let r = ctx.createRadialGradient(w * 0.2, h * 0.15, 10, w * 0.2, h * 0.15, 330);
    r.addColorStop(0, 'rgba(120,60,255,0.22)'); r.addColorStop(1, 'rgba(120,60,255,0)');
    ctx.fillStyle = r; ctx.fillRect(0, 0, w, h);
    r = ctx.createRadialGradient(w * 0.85, h * 0.7, 10, w * 0.85, h * 0.7, 360);
    r.addColorStop(0, 'rgba(255,61,154,0.16)'); r.addColorStop(1, 'rgba(255,61,154,0)');
    ctx.fillStyle = r; ctx.fillRect(0, 0, w, h);
  });
  make('grid', 60, 60, (ctx) => {
    ctx.strokeStyle = 'rgba(90,120,255,0.16)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0.5, 0); ctx.lineTo(0.5, 60); ctx.moveTo(0, 0.5); ctx.lineTo(60, 0.5); ctx.stroke();
  });

  function shade(hex, amt) {
    const n = parseInt(hex.slice(1), 16);
    const f = (v) => Math.max(0, Math.min(255, Math.round(v + 255 * amt)));
    return 'rgb(' + f(n >> 16) + ',' + f((n >> 8) & 255) + ',' + f(n & 255) + ')';
  }
};

/* Shared animated background used by every scene. */
PB.addBackground = function (scene) {
  scene.add.image(0, 0, 'bgfill').setOrigin(0).setDepth(-10);
  scene.gridSprite = scene.add.tileSprite(0, 0, PB.CFG.W, PB.CFG.H, 'grid').setOrigin(0).setDepth(-9);
};
