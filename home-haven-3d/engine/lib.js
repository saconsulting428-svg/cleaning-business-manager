// Home Haven 3D — renovation engine, part 1: helpers (materials, procedural textures, shapes)
(function () {
  const T = THREE, RENO = window.RENO = window.RENO || {};
  RENO.PPU = 170; // texture pixels per world unit

  // ---------------------------------------------------------------- utils
  RENO.rng = (seed) => { let s = (seed >>> 0) || 1; return () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296; };
  const hex2rgb = (h) => { h = h.replace('#', ''); if (h.length === 3) h = h.split('').map(c => c + c).join(''); const n = parseInt(h, 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
  const rgb2hex = (r, g, b) => '#' + [r, g, b].map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
  const shade = (h, f) => { const [r, g, b] = hex2rgb(h); return f >= 0 ? rgb2hex(r + (255 - r) * f, g + (255 - g) * f, b + (255 - b) * f) : rgb2hex(r * (1 + f), g * (1 + f), b * (1 + f)); };
  RENO.shade = shade; RENO.hex2rgb = hex2rgb;
  const mix = (a, b, t) => { const A = hex2rgb(a), B = hex2rgb(b); return rgb2hex(A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t); };
  RENO.mix = mix;

  // ---------------------------------------------------------------- materials
  const mc = {};
  RENO.mat = (c, o = {}) => {
    const k = [c, o.r ?? .72, o.m ?? 0, o.e || '', o.ei || 0, o.t ?? 1, o.ds ? 1 : 0].join('|');
    if (mc[k]) return mc[k];
    const m = new T.MeshStandardMaterial({ color: c, roughness: o.r ?? .72, metalness: o.m ?? 0, side: o.ds ? T.DoubleSide : T.FrontSide });
    if (o.e) { m.emissive = new T.Color(o.e); m.emissiveIntensity = o.ei ?? 1; }
    if (o.t != null && o.t < 1) { m.transparent = true; m.opacity = o.t; m.depthWrite = false; }
    return mc[k] = m;
  };
  RENO.texMat = (tex, o = {}) => new T.MeshStandardMaterial({ map: tex, roughness: o.r ?? .82, metalness: o.m ?? 0, side: o.ds ? T.DoubleSide : T.FrontSide });

  // ---------------------------------------------------------------- shapes
  // RoundedBoxGeometry (condensed from three/examples/jsm/geometries/RoundedBoxGeometry.js, MIT)
  function RoundedBox(width, height, depth, segments, radius) {
    const segs = segments * 2 + 1; radius = Math.min(width / 2, height / 2, depth / 2, radius);
    const g = new T.BoxGeometry(1, 1, 1, segs, segs, segs);
    const g2 = g.toNonIndexed(); g.dispose();
    const pos = g2.attributes.position.array, nor = g2.attributes.normal.array;
    const box = new T.Vector3(width, height, depth).divideScalar(2).subScalar(radius), half = .5 / segs, n = new T.Vector3(), p = new T.Vector3();
    for (let i = 0; i < pos.length; i += 3) {
      p.fromArray(pos, i); n.copy(p);
      n.x -= Math.sign(n.x) * half; n.y -= Math.sign(n.y) * half; n.z -= Math.sign(n.z) * half; n.normalize();
      pos[i] = box.x * Math.sign(p.x) + n.x * radius; pos[i + 1] = box.y * Math.sign(p.y) + n.y * radius; pos[i + 2] = box.z * Math.sign(p.z) + n.z * radius;
      nor[i] = n.x; nor[i + 1] = n.y; nor[i + 2] = n.z;
    }
    return g2;
  }
  const gc = {};
  const G = (k, f) => gc[k] || (gc[k] = f());
  const q = (v) => Math.round(v * 1000) / 1000;
  const sh = (m, c = true, r = true) => { m.castShadow = c; m.receiveShadow = r; return m; };
  RENO.sh = sh;
  // rounded box; position: x/z centre, y = bottom
  RENO.box = (g, w, h, d, m, x = 0, y = 0, z = 0, r) => {
    r = r ?? Math.min(.035, w / 3, h / 3, d / 3);
    const geo = r < .004 ? G(`b${q(w)},${q(h)},${q(d)}`, () => new T.BoxGeometry(w, h, d)) : G(`rb${q(w)},${q(h)},${q(d)},${q(r)}`, () => RoundedBox(w, h, d, 2, r));
    const mesh = sh(new T.Mesh(geo, m)); mesh.position.set(x, y + h / 2, z); g && g.add(mesh); return mesh;
  };
  RENO.cyl = (g, rt, rb, h, m, x = 0, y = 0, z = 0, seg = 28) => {
    const mesh = sh(new T.Mesh(G(`c${q(rt)},${q(rb)},${q(h)},${seg}`, () => new T.CylinderGeometry(rt, rb, h, seg)), m)); mesh.position.set(x, y + h / 2, z); g && g.add(mesh); return mesh;
  };
  RENO.sph = (g, r, m, x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1, seg = 20) => {
    const mesh = sh(new T.Mesh(G(`s${q(r)},${seg}`, () => new T.SphereGeometry(r, seg, Math.max(8, seg * .7 | 0))), m)); mesh.position.set(x, y, z); mesh.scale.set(sx, sy, sz); g && g.add(mesh); return mesh;
  };
  RENO.plane = (g, w, h, m, x, y, z, rx = 0, ry = 0) => {
    const mesh = new T.Mesh(G(`p${q(w)},${q(h)}`, () => new T.PlaneGeometry(w, h)), m); mesh.position.set(x, y, z); mesh.rotation.set(rx, ry, 0); mesh.receiveShadow = true; g && g.add(mesh); return mesh;
  };
  RENO.grp = (parent, x = 0, y = 0, z = 0, ry = 0) => { const g = new T.Group(); g.position.set(x, y, z); g.rotation.y = ry; parent && parent.add(g); return g; };
  // soft contact shadow under an object
  let blobTex;
  RENO.blob = (g, w, d, a = .45, x = 0, z = 0) => {
    if (!blobTex) { const c = document.createElement('canvas'); c.width = c.height = 128; const x2 = c.getContext('2d'), gr = x2.createRadialGradient(64, 64, 6, 64, 64, 64); gr.addColorStop(0, 'rgba(0,0,0,.9)'); gr.addColorStop(.55, 'rgba(0,0,0,.45)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); x2.fillStyle = gr; x2.fillRect(0, 0, 128, 128); blobTex = new T.CanvasTexture(c); }
    const m = new T.Mesh(G('blob', () => new T.PlaneGeometry(1, 1)), new T.MeshBasicMaterial({ map: blobTex, transparent: true, opacity: a, depthWrite: false }));
    m.rotation.x = -Math.PI / 2; m.position.set(x, .006, z); m.scale.set(w * 1.25, d * 1.25, 1); m.renderOrder = 1; g.add(m); return m;
  };

  // ---------------------------------------------------------------- canvas textures
  const cvs = (w, h, fn) => { const c = document.createElement('canvas'); c.width = Math.max(8, Math.round(w)); c.height = Math.max(8, Math.round(h)); const x = c.getContext('2d'); fn(x, c.width, c.height); return c; };
  RENO.cvs = cvs;
  const toTex = (c, rep) => { const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; t.anisotropy = 4; if (rep) { t.wrapS = t.wrapT = T.RepeatWrapping; } return t; };
  RENO.toTex = toTex;
  const speckle = (x, w, h, n, R, a = .06, size = 2) => { for (let i = 0; i < n; i++) { x.fillStyle = R() > .5 ? `rgba(255,255,255,${a})` : `rgba(0,0,0,${a})`; x.fillRect(R() * w, R() * h, size, size); } };
  const jitter = (c, R, f) => shade(c, (R() - .5) * f);

  // ---- floors (canvas covers w×d world units; u axis = x, v axis = z)
  const FLOOR = {
    planks(x, W, H, s, R) { // horizontal boards
      const P = RENO.PPU, bw = (s.pw || .26) * P, rows = Math.ceil(H / bw);
      x.fillStyle = s.c; x.fillRect(0, 0, W, H);
      for (let r = 0; r < rows; r++) {
        let cx = -R() * 1.4 * P; const y = r * bw;
        while (cx < W) {
          const len = (s.len || 1.5) * P * (.7 + R() * .6), col = jitter(s.c, R, s.v ?? .16);
          x.fillStyle = col; x.fillRect(cx, y, len, bw);
          for (let k = 0; k < 7; k++) { x.strokeStyle = `rgba(${R() > .5 ? '0,0,0' : '255,255,255'},${.04 + R() * .05})`; x.lineWidth = 1 + R(); x.beginPath(); const yy = y + R() * bw; x.moveTo(cx, yy); x.bezierCurveTo(cx + len * .3, yy + (R() - .5) * 5, cx + len * .6, yy + (R() - .5) * 5, cx + len, yy + (R() - .5) * 3); x.stroke(); }
          x.fillStyle = s.gap || 'rgba(30,15,5,.45)'; x.fillRect(cx, y, 2, bw); x.fillRect(cx, y + bw - 1.5, len, 1.5);
          cx += len;
        }
      }
    },
    herring(x, W, H, s, R) { // chevron / herringbone parquet
      const P = RENO.PPU, sw = .42 * P, ph = .15 * P;
      x.fillStyle = '#20120a'; x.fillRect(0, 0, W, H);
      for (let i = -1; i * sw < W + sw; i++) {
        const x0 = i * sw, x1 = x0 + sw, dir = i % 2 === 0 ? 1 : -1, base = i % 2 === 0 ? 0 : sw;
        for (let y = -sw - ph; y < H + sw; y += ph) {
          const y0 = y + base; x.fillStyle = jitter(s.c, R, s.v ?? .13);
          x.beginPath(); x.moveTo(x0, y0); x.lineTo(x1, y0 + dir * sw); x.lineTo(x1, y0 + dir * sw + ph - 1.4); x.lineTo(x0, y0 + ph - 1.4); x.closePath(); x.fill();
          x.strokeStyle = 'rgba(255,255,255,.05)'; x.lineWidth = 1; x.beginPath(); x.moveTo(x0, y0 + 1); x.lineTo(x1, y0 + dir * sw + 1); x.stroke();
        }
      }
      speckle(x, W, H, 900, R, .05);
    },
    tiles(x, W, H, s, R) {
      const P = RENO.PPU, ts = (s.size || .5) * P; x.fillStyle = s.grout || '#cfc8ba'; x.fillRect(0, 0, W, H);
      for (let i = 0; i * ts < W + ts; i++) for (let j = 0; j * ts < H + ts; j++) {
        const c = s.c2 && (i + j) % 2 ? s.c2 : s.c; x.fillStyle = jitter(c, R, s.v ?? .05); x.fillRect(i * ts + 1.5, j * ts + 1.5, ts - 3, ts - 3);
        if (s.vein) { x.strokeStyle = 'rgba(120,125,135,.28)'; x.lineWidth = 1; x.beginPath(); let vx = i * ts + R() * ts, vy = j * ts; x.moveTo(vx, vy); for (let k = 0; k < 4; k++) { vx += (R() - .5) * ts * .5; vy += ts / 4; x.lineTo(vx, vy); } x.stroke(); }
        const g = x.createLinearGradient(i * ts, j * ts, i * ts + ts, j * ts + ts); g.addColorStop(0, 'rgba(255,255,255,.14)'); g.addColorStop(1, 'rgba(0,0,0,.08)'); x.fillStyle = g; x.fillRect(i * ts + 1.5, j * ts + 1.5, ts - 3, ts - 3);
      }
    },
    carpet(x, W, H, s, R) { x.fillStyle = s.c; x.fillRect(0, 0, W, H); speckle(x, W, H, Math.round(W * H / 14), R, .09, 2); speckle(x, W, H, Math.round(W * H / 30), R, .05, 3); },
    grass(x, W, H, s, R) {
      x.fillStyle = s.c; x.fillRect(0, 0, W, H);
      for (let i = 0; i < 4200; i++) { const col = jitter(s.c, R, .3); x.strokeStyle = col; x.lineWidth = 1.2; const px = R() * W, py = R() * H; x.beginPath(); x.moveTo(px, py); x.lineTo(px + (R() - .5) * 6, py - 4 - R() * 6); x.stroke(); }
      for (let i = 0; i < (s.flowers || 0); i++) { x.fillStyle = s.fl[(R() * s.fl.length) | 0]; const px = R() * W, py = R() * H; x.beginPath(); x.arc(px, py, 2 + R() * 2, 0, 7); x.fill(); x.fillStyle = '#ffe58a'; x.fillRect(px - .5, py - .5, 1.5, 1.5); }
    },
    pebble(x, W, H, s, R) {
      x.fillStyle = s.c; x.fillRect(0, 0, W, H);
      for (let i = 0; i < 2600; i++) { x.fillStyle = jitter(s.c, R, .35); x.beginPath(); x.ellipse(R() * W, R() * H, 3 + R() * 5, 2 + R() * 3, R() * 3, 0, 7); x.fill(); }
    },
    old(x, W, H, s, R) {
      FLOOR.planks(x, W, H, { c: '#6d5a48', v: .22, pw: .3, len: 1.1, gap: 'rgba(10,5,0,.7)' }, R);
      for (let i = 0; i < 26; i++) { const px = R() * W, py = R() * H, rr = 12 + R() * 46; const g = x.createRadialGradient(px, py, 2, px, py, rr); g.addColorStop(0, 'rgba(25,18,10,.55)'); g.addColorStop(1, 'rgba(25,18,10,0)'); x.fillStyle = g; x.fillRect(px - rr, py - rr, rr * 2, rr * 2); }
      for (let i = 0; i < 90; i++) { x.strokeStyle = 'rgba(0,0,0,.35)'; x.lineWidth = 1; x.beginPath(); const px = R() * W, py = R() * H; x.moveTo(px, py); x.lineTo(px + (R() - .5) * 60, py + (R() - .5) * 14); x.stroke(); }
      speckle(x, W, H, 1500, R, .1, 2);
      // light dust on top
      x.fillStyle = 'rgba(190,180,160,.18)'; x.fillRect(0, 0, W, H);
    },
  };
  // ---- walls (canvas covers w×h world units; v axis up)
  const WALL = {
    paint(x, W, H, s, R) {
      const g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, shade(s.c, .06)); g.addColorStop(1, shade(s.c, -.06)); x.fillStyle = g; x.fillRect(0, 0, W, H);
      speckle(x, W, H, Math.round(W * H / 40), R, .04, 3);
    },
    stripe(x, W, H, s, R) {
      const P = RENO.PPU, sw = (s.sw || .2) * P; x.fillStyle = s.c; x.fillRect(0, 0, W, H);
      for (let i = 0; i * sw < W; i += 2) { x.fillStyle = s.c2; x.fillRect(i * sw, 0, sw, H); }
      for (let i = 0; i * sw < W; i++) { x.fillStyle = 'rgba(0,0,0,.05)'; x.fillRect(i * sw, 0, 1.5, H); }
      speckle(x, W, H, Math.round(W * H / 60), R, .035, 2);
    },
    lattice(x, W, H, s, R) { // damask-like diamond lattice with dots
      const P = RENO.PPU, cs = (s.cs || .42) * P; x.fillStyle = s.c; x.fillRect(0, 0, W, H);
      x.strokeStyle = s.c2; x.lineWidth = 2;
      for (let i = -H / cs; i < W / cs + 2; i++) { x.beginPath(); x.moveTo(i * cs, 0); x.lineTo(i * cs + H, H); x.stroke(); x.beginPath(); x.moveTo(i * cs, H); x.lineTo(i * cs + H, 0); x.stroke(); }
      x.fillStyle = s.c2;
      for (let i = 0; i * cs < W + cs; i++) for (let j = 0; j * cs < H + cs; j++) { x.beginPath(); x.arc(i * cs + cs / 2, j * cs, 3.6, 0, 7); x.fill(); x.beginPath(); x.arc(i * cs, j * cs + cs / 2, 3.6, 0, 7); x.fill(); }
      speckle(x, W, H, Math.round(W * H / 60), R, .035, 2);
    },
    subway(x, W, H, s, R) {
      const P = RENO.PPU, tw = (s.tw || .38) * P, th = tw / 2; x.fillStyle = s.grout || '#d6d2c8'; x.fillRect(0, 0, W, H);
      for (let j = 0; j * th < H + th; j++) for (let i = -1; i * tw < W + tw; i++) {
        const ox = j % 2 ? tw / 2 : 0; x.fillStyle = jitter(s.c, R, s.v ?? .04); x.fillRect(i * tw + ox + 1.2, j * th + 1.2, tw - 2.4, th - 2.4);
        const g = x.createLinearGradient(0, j * th, 0, j * th + th); g.addColorStop(0, 'rgba(255,255,255,.28)'); g.addColorStop(.5, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(0,0,0,.12)'); x.fillStyle = g; x.fillRect(i * tw + ox + 1.2, j * th + 1.2, tw - 2.4, th - 2.4);
      }
    },
    brick(x, W, H, s, R) {
      const P = RENO.PPU, bw = .36 * P, bh = .13 * P; x.fillStyle = s.grout || '#cfc3b0'; x.fillRect(0, 0, W, H);
      for (let j = 0; j * bh < H + bh; j++) for (let i = -1; i * bw < W + bw; i++) { const ox = j % 2 ? bw / 2 : 0; x.fillStyle = jitter(s.c, R, .26); x.fillRect(i * bw + ox + 1.5, j * bh + 1.5, bw - 3, bh - 3); }
      speckle(x, W, H, 1500, R, .08, 2);
    },
    old(x, W, H, s, R) {
      x.fillStyle = '#b9ad98'; x.fillRect(0, 0, W, H);
      for (let i = 0; i < 40; i++) { const px = R() * W, py = R() * H, rr = 20 + R() * 80; const g = x.createRadialGradient(px, py, 3, px, py, rr); g.addColorStop(0, `rgba(${R() > .5 ? '95,80,55' : '70,70,60'},.4)`); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(px - rr, py - rr, rr * 2, rr * 2); }
      for (let i = 0; i < 14; i++) { x.fillStyle = R() > .5 ? '#d8cdb8' : '#8f8571'; x.beginPath(); const px = R() * W, py = R() * H; x.moveTo(px, py); for (let k = 0; k < 6; k++) x.lineTo(px + (R() - .5) * 70, py + (R() - .5) * 60); x.fill(); } // peeling patches
      x.strokeStyle = 'rgba(30,25,20,.55)'; x.lineWidth = 1.5; for (let i = 0; i < 4; i++) { x.beginPath(); let px = R() * W, py = R() * H * .5; x.moveTo(px, py); for (let k = 0; k < 8; k++) { px += (R() - .5) * 26; py += 14 + R() * 18; x.lineTo(px, py); } x.stroke(); }
      for (let i = 0; i < 12; i++) { x.strokeStyle = 'rgba(30,22,10,.18)'; x.lineWidth = 6 + R() * 8; x.beginPath(); const px = R() * W; x.moveTo(px, 0); x.lineTo(px + (R() - .5) * 20, H * (.3 + R() * .5)); x.stroke(); } // water streaks
      speckle(x, W, H, 1400, R, .1, 2);
    },
  };
  RENO.makeSurface = (kind, spec, w, h, seed = 1) => {
    const R = RENO.rng(seed * 977 + 13), P = RENO.PPU, set = FLOOR[kind] || WALL[kind];
    const src = FLOOR[kind] ? FLOOR : WALL;
    const c = cvs(w * P, h * P, (x, W, H) => src[kind](x, W, H, spec, R));
    return toTex(c);
  };
  RENO.hasFloorKind = (k) => !!FLOOR[k];

  // painting canvases
  RENO.paintArt = (kind, w, h, pal) => cvs(w * 130, h * 130, (x, W, H) => {
    const R = RENO.rng(kind.length * 31 + 7);
    if (kind === 'landscape') {
      const g = x.createLinearGradient(0, 0, 0, H * .6); g.addColorStop(0, pal[0]); g.addColorStop(1, pal[1]); x.fillStyle = g; x.fillRect(0, 0, W, H);
      x.fillStyle = pal[2]; x.beginPath(); x.moveTo(0, H * .6); for (let i = 0; i <= 8; i++) x.lineTo(W * i / 8, H * (.42 + R() * .16)); x.lineTo(W, H); x.lineTo(0, H); x.fill();
      x.fillStyle = pal[3]; x.beginPath(); x.moveTo(0, H * .75); for (let i = 0; i <= 8; i++) x.lineTo(W * i / 8, H * (.66 + R() * .12)); x.lineTo(W, H); x.lineTo(0, H); x.fill();
      x.fillStyle = 'rgba(255,255,255,.85)'; x.beginPath(); x.arc(W * .72, H * .24, H * .09, 0, 7); x.fill();
    } else if (kind === 'abstract') {
      x.fillStyle = pal[0]; x.fillRect(0, 0, W, H);
      for (let i = 0; i < 6; i++) { x.fillStyle = pal[1 + i % (pal.length - 1)]; x.beginPath(); x.arc(R() * W, R() * H, H * (.12 + R() * .25), 0, 7); x.globalAlpha = .85; x.fill(); }
      x.globalAlpha = 1; x.strokeStyle = pal[pal.length - 1]; x.lineWidth = 5; x.beginPath(); x.moveTo(0, H * .8); x.bezierCurveTo(W * .3, H * .2, W * .6, H * 1.1, W, H * .3); x.stroke();
    } else if (kind === 'botanic') {
      x.fillStyle = pal[0]; x.fillRect(0, 0, W, H); x.strokeStyle = pal[1]; x.lineWidth = 4; x.beginPath(); x.moveTo(W / 2, H); x.quadraticCurveTo(W * .4, H * .5, W * .5, H * .1); x.stroke();
      for (let i = 0; i < 9; i++) { const yy = H * (.2 + i * .08), sd = i % 2 ? 1 : -1; x.fillStyle = pal[2]; x.beginPath(); x.ellipse(W / 2 + sd * W * .12, yy, W * .12, H * .035, sd * .5, 0, 7); x.fill(); }
      x.fillStyle = pal[3]; x.beginPath(); x.arc(W / 2, H * .12, H * .05, 0, 7); x.fill();
    } else { // sunrise geometric
      x.fillStyle = pal[0]; x.fillRect(0, 0, W, H); for (let i = 5; i >= 1; i--) { x.fillStyle = pal[i % (pal.length - 1) + 1]; x.beginPath(); x.arc(W / 2, H * .75, W * i * .1, Math.PI, 0); x.fill(); }
    }
  });

  RENO.makeCurtainTex = (c, c2, pat) => cvs(256, 256, (x, W, H) => {
    x.fillStyle = c; x.fillRect(0, 0, W, H);
    for (let i = 0; i < 16; i++) { const g = x.createLinearGradient(i * 16, 0, i * 16 + 16, 0); g.addColorStop(0, 'rgba(0,0,0,.22)'); g.addColorStop(.5, 'rgba(255,255,255,.12)'); g.addColorStop(1, 'rgba(0,0,0,.2)'); x.fillStyle = g; x.fillRect(i * 16, 0, 16, H); }
    if (pat === 'dots') { x.fillStyle = c2; for (let i = 0; i < 40; i++) { x.beginPath(); x.arc((i * 83) % W, (i * 47) % H, 4, 0, 7); x.fill(); } }
    if (pat === 'stripe') { x.fillStyle = c2; for (let i = 0; i < 8; i++) x.fillRect(i * 32 + 10, 0, 6, H); }
  });
})();
