// Home Haven 3D — renovation engine, part 2a: living-room furniture builders
// Convention: every builder fills group g; origin = floor centre of the item, front faces +z.
(function () {
  const T = THREE, RENO = window.RENO, B = RENO.BUILD = RENO.BUILD || {};
  const { box, cyl, sph, plane, grp, mat: M, blob, shade, mix, cvs, toTex } = RENO;
  const fabric = (c) => M(c, { r: .96 });
  const hrz = (m, len) => { m.rotation.z = Math.PI / 2; return m; }; // cylinder along x
  const alongZ = (m) => { m.rotation.x = Math.PI / 2; return m; };
  RENO.glow = (g, x, y, z, s, c = '#ffd98a') => { // night glow sprite
    const sp = new T.Sprite(new T.SpriteMaterial({ map: RENO.glowTex(), color: c, blending: T.AdditiveBlending, transparent: true, depthWrite: false, opacity: 0 }));
    sp.scale.set(s, s, 1); sp.position.set(x, y, z); sp.userData.glow = 1; g.add(sp); return sp;
  };
  let gt; RENO.glowTex = () => gt || (gt = (() => { const c = cvs(128, 128, (x) => { const gr = x.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.3, 'rgba(255,255,255,.45)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = gr; x.fillRect(0, 0, 128, 128); }); return toTex(c); })());

  // ------------------------------------------------------------------ SOFA
  B.sofa = (g, p) => {
    const w = p.w || 2.3, d = 1.0, st = p.style, fab = fabric(p.c), fab2 = fabric(shade(p.c, -.1)), legC = M(p.leg, { r: st === 'modern' ? .3 : .5, m: st === 'modern' ? .7 : 0 });
    const legH = st === 'modern' ? .24 : .13, yb = legH, baseH = st === 'modern' ? .2 : .26, lx = w / 2 - .13, lz = d / 2 - .13;
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => st === 'modern' ? cyl(g, .028, .02, legH, legC, a * lx, 0, b * lz, 10) : box(g, .1, legH, .1, legC, a * lx, 0, b * lz, .03));
    box(g, w, baseH, d, fab2, 0, yb, 0, .07);
    const armW = st === 'modern' ? .2 : .27, armH = st === 'chester' ? .62 : st === 'modern' ? .46 : .52, iw = w - 2 * armW, n = 3, cw = iw / n;
    [-1, 1].forEach(s => {
      box(g, armW, armH, d, fab, s * (w / 2 - armW / 2), yb, 0, .09);
      if (st !== 'modern') { const r = cyl(g, .15, .15, d - .02, fab, 0, 0, 0, 20); alongZ(r); r.position.set(s * (w / 2 - armW / 2), yb + armH, 0); }
    });
    box(g, w, st === 'modern' ? .62 : .78, .2, fab2, 0, yb, -d / 2 + .1, .07);
    for (let i = 0; i < n; i++) {
      const x = -iw / 2 + cw * (i + .5);
      box(g, cw - .025, .2, d - .3, fab, x, yb + baseH, .13, .08);
      const bk = box(g, cw - .03, st === 'modern' ? .46 : .54, .22, fab, x, yb + baseH + .1, -d / 2 + .28, .09); bk.rotation.x = -.14;
    }
    if (st === 'chester') for (let i = 0; i < 9; i++) for (let j = 0; j < 3; j++) sph(g, .022, M('#2b1a12', { r: .5 }), -w / 2 + .55 + i * (w - 1.1) / 8, yb + baseH + .28 + j * .17, -d / 2 + .39, 1, 1, .7, 8);
    const pc = p.pillow || '#f2e4c9';
    [[-iw / 2 + .32, .12], [iw / 2 - .32, -.1]].forEach(([x, r], i) => { const pl = box(g, .46, .44, .14, fabric(i ? p.pillow2 || shade(pc, -.2) : pc), x, yb + baseH + .2, -d / 2 + .46, .06); pl.rotation.set(-.3, 0, r); });
    if (p.throw) { const t = box(g, .42, .06, .62, fabric(p.throw), iw / 2 - .1, yb + baseH + .2, .12, .03); t.rotation.z = .1; }
    blob(g, w + .2, d + .2, .4);
  };

  // ------------------------------------------------------------------ RUG
  const rugTex = (style, w, d, c1, c2, c3) => toTex(cvs(w * 110, d * 110, (x, W, H) => {
    const R = RENO.rng(w * 7 + d);
    if (style === 'shag') { x.fillStyle = c1; x.fillRect(0, 0, W, H); for (let i = 0; i < 9000; i++) { x.fillStyle = R() > .5 ? 'rgba(255,255,255,.14)' : 'rgba(0,0,0,.07)'; x.fillRect(R() * W, R() * H, 2, 2); } x.strokeStyle = c2; x.lineWidth = 6; for (let r = 1; r < 4; r++) { x.beginPath(); x.ellipse(W / 2, H / 2, W * (.12 + r * .1), H * (.12 + r * .1), 0, 0, 7); x.stroke(); } }
    else if (style === 'stripe') { x.fillStyle = c1; x.fillRect(0, 0, W, H); const n = 12; for (let i = 0; i < n; i += 2) { x.fillStyle = c2; x.fillRect(0, i * H / n, W, H / n); } x.fillStyle = c3; x.fillRect(0, 0, W, 8); x.fillRect(0, H - 8, W, 8); for (let i = 0; i < 9000; i++) { x.fillStyle = 'rgba(0,0,0,.05)'; x.fillRect(R() * W, R() * H, 2, 2); } }
    else { x.fillStyle = c1; x.fillRect(0, 0, W, H); x.strokeStyle = c2; x.lineWidth = 8; x.strokeRect(14, 14, W - 28, H - 28); x.strokeStyle = c3; x.lineWidth = 3; x.strokeRect(30, 30, W - 60, H - 60);
      x.fillStyle = c2; x.beginPath(); x.moveTo(W / 2, H * .18); x.lineTo(W * .78, H / 2); x.lineTo(W / 2, H * .82); x.lineTo(W * .22, H / 2); x.fill(); x.fillStyle = c3; x.beginPath(); x.moveTo(W / 2, H * .3); x.lineTo(W * .64, H / 2); x.lineTo(W / 2, H * .7); x.lineTo(W * .36, H / 2); x.fill(); x.fillStyle = c1; x.beginPath(); x.arc(W / 2, H / 2, H * .06, 0, 7); x.fill();
      for (let i = 0; i < 18; i++) { x.fillStyle = c3; x.beginPath(); x.arc(40 + i * (W - 80) / 17, 22, 3.5, 0, 7); x.fill(); x.beginPath(); x.arc(40 + i * (W - 80) / 17, H - 22, 3.5, 0, 7); x.fill(); }
      for (let i = 0; i < 9000; i++) { x.fillStyle = 'rgba(0,0,0,.05)'; x.fillRect(R() * W, R() * H, 2, 2); } }
  }));
  B.rug = (g, p) => {
    const w = p.w, d = p.d, tex = rugTex(p.style, w, d, p.c1, p.c2, p.c3), top = new T.MeshStandardMaterial({ map: tex, roughness: 1 }), edge = M(shade(p.c2, -.25), { r: 1 });
    if (p.round) {
      const r = w / 2, base = cyl(g, r, r, .03, edge, 0, 0, 0, 48); const cap = new T.Mesh(new T.CircleGeometry(r - .005, 48), top); cap.rotation.x = -Math.PI / 2; cap.position.y = .0305; cap.receiveShadow = true; g.add(cap);
    } else {
      box(g, w, .03, d, edge, 0, 0, 0, .012); const cap = new T.Mesh(new T.PlaneGeometry(w - .02, d - .02), top); cap.rotation.x = -Math.PI / 2; cap.position.y = .0305; cap.receiveShadow = true; g.add(cap);
      if (p.fringe) for (let i = 0; i < 22; i++) { box(g, .012, .01, .09, M('#efe6d2', { r: 1 }), -w / 2 + .12 + i * (w - .24) / 21, 0, d / 2 + .04, .004); box(g, .012, .01, .09, M('#efe6d2', { r: 1 }), -w / 2 + .12 + i * (w - .24) / 21, 0, -d / 2 - .04, .004); }
    }
  };

  // ------------------------------------------------------------------ COFFEE TABLE
  B.coffee = (g, p) => {
    const st = p.style, wood = M(p.c, { r: .45 }), dark = M(p.c2 || '#2b2b2b', { r: .35, m: p.metal ? .8 : 0 });
    if (st === 'round') {
      cyl(g, .62, .62, .06, wood, 0, .38, 0, 40); [0, 1, 2].forEach(i => { const a = i * 2.094 + .5; const l = cyl(g, .03, .022, .4, dark, Math.cos(a) * .42, 0, Math.sin(a) * .42, 10); l.rotation.set(Math.sin(a) * .12, 0, -Math.cos(a) * .12); });
      cyl(g, .3, .3, .03, wood, 0, .14, 0, 28);
    } else if (st === 'glass') {
      box(g, 1.25, .035, .7, M('#bfe6ee', { t: .42, r: .06 }), 0, .4, 0, .01);
      [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => box(g, .045, .42, .045, dark, a * .56, 0, b * .3, .01));
      box(g, 1.2, .03, .06, dark, 0, .38, .3, .01); box(g, 1.2, .03, .06, dark, 0, .38, -.3, .01);
      box(g, 1.1, .03, .58, wood, 0, .13, 0, .01);
    } else { // oval marble with brass legs
      const top = cyl(g, .65, .65, .07, M(p.c, { r: .2 }), 0, .38, 0, 40); top.scale.z = .62;
      [[-1, 0], [1, 0]].forEach(([a]) => { box(g, .04, .4, .46, dark, a * .42, 0, 0, .012); });
      box(g, .84, .03, .05, dark, 0, .06, 0, .01);
    }
    // styling: books + vase
    const ty = st === 'glass' ? .435 : st === 'round' ? .44 : .45;
    box(g, .34, .05, .24, M('#355c7d'), -.2, ty, .05, .01); box(g, .3, .045, .21, M('#c06c84'), -.19, ty + .05, .05, .01).rotation.y = .15;
    cyl(g, .05, .07, .15, M('#f6f0e4', { r: .3 }), .24, ty, -.06, 16); [0, 1, 2].forEach(i => { const s = cyl(g, .008, .008, .28, M('#5a8f4e'), .24 + (i - 1) * .03, ty + .12, -.06, 6); s.rotation.z = (i - 1) * .22; sph(g, .04, M(['#ff8fa3', '#ffd166', '#ff6b6b'][i]), .24 + (i - 1) * .1, ty + .4 + (i === 1 ? .02 : 0), -.06, 1, 1, 1, 10); });
    blob(g, 1.3, .8, .35);
  };

  // ------------------------------------------------------------------ CURTAINS (origin: wall surface, centred under window)
  const curtainTex = {};
  B.curtains = (g, p, s) => {
    const win = s.win, W = win.w, topY = win.y + win.h + .2, pw = p.panel || .62, rodW = W + 1.0, key = p.c + p.c2 + p.pat;
    const mt = new T.MeshStandardMaterial({ map: curtainTex[key] || (curtainTex[key] = toTex(RENO.makeCurtainTex(p.c, p.c2, p.pat))), roughness: .95, side: T.DoubleSide });
    const rodM = M(p.rod || '#3a2a1c', { m: .6, r: .4 });
    if (p.style === 'blind') { // roman blind
      const h = win.h + .35, bl = new T.Mesh(new T.PlaneGeometry(W + .2, h, 1, 1), mt); bl.position.set(0, win.y - .1 + h / 2 - .02, .09); bl.castShadow = bl.receiveShadow = true; g.add(bl);
      for (let i = 0; i < 4; i++) box(g, W + .2, .035, .04, M(shade(p.c, -.15), { r: .9 }), 0, win.y + .12 + i * .38, .1, .01);
      box(g, W + .24, .06, .08, rodM, 0, topY - .1, .08, .02);
    } else {
      const sheer = p.style === 'sheer';
      const rod = hrz(cyl(g, .022, .022, rodW, rodM, 0, 0, .12, 10)); rod.position.set(0, topY, .12);
      [-1, 1].forEach(sgn => { sph(g, .045, rodM, sgn * rodW / 2, topY, .12); });
      [-1, 1].forEach(sgn => {
        const geo = new T.PlaneGeometry(pw, topY - .02, 18, 10), pos = geo.attributes.position;
        for (let i = 0; i < pos.count; i++) {
          const x = pos.getX(i), y = pos.getY(i) + (topY - .02) / 2, f = Math.sin((x / pw) * Math.PI * 6 + 0.5) * .035;
          const tie = 1 - .34 * Math.exp(-Math.pow((y - win.y * .85 - .5) / .3, 2)) * (p.tie === false ? 0 : 1);
          pos.setX(i, pos.getX(i) * 1 + 0); pos.setZ(i, f * (1 + (y < .1 ? .0 : 0)));
          const ox = sgn * ((W / 2 + .05 + pw / 2) - (1 - tie) * (pw * .9 + .3));
          pos.setX(i, x * (1 - (1 - tie) * .5) + ox); pos.setY(i, y);
        }
        geo.computeVertexNormals(); const m = new T.Mesh(geo, mt); m.castShadow = m.receiveShadow = true; m.position.set(0, 0, .12); g.add(m);
        // tie-back
        const tb = box(g, pw * .55, .06, .1, M(shade(p.c2, -.1), { r: .8 }), sgn * (W / 2 + .05 + pw / 2 - (1 - (1 - .34)) * (pw * .9 + .3)), win.y * .85 + .5 - .03, .13, .02);
      });
      if (sheer) { const sh = new T.Mesh(new T.PlaneGeometry(W + .1, win.h + .1), new T.MeshStandardMaterial({ color: '#ffffff', transparent: true, opacity: .35, roughness: 1, side: T.DoubleSide })); sh.position.set(0, win.y + win.h / 2, .06); g.add(sh); }
    }
  };

  // ------------------------------------------------------------------ FLOOR LAMP
  B.lamp = (g, p) => {
    const st = p.style, metal = M(p.metal, { m: .8, r: .3 }), shadeM = new T.MeshStandardMaterial({ color: p.shade, emissive: p.shade, emissiveIntensity: 0, roughness: .9, side: T.DoubleSide });
    g.userData.emissives = [shadeM]; g.userData.eBase = .0;
    if (st === 'tripod') {
      [0, 1, 2].forEach(i => { const a = i * 2.094; const l = box(g, .035, 1.5, .035, M(p.wood, { r: .5 }), Math.cos(a) * .17, 0, Math.sin(a) * .17, .01); l.rotation.set(Math.sin(a) * .13, 0, -Math.cos(a) * .13); });
      const sh = cyl(g, .26, .34, .34, shadeM, 0, 1.34, 0, 32); sh.material = shadeM; RENO.glow(g, 0, 1.5, 0, 1.4);
    } else if (st === 'arc') {
      cyl(g, .22, .24, .05, M('#e9e4da', { r: .3 }), 0, 0, 0, 32); const pole = cyl(g, .02, .02, 1.7, metal, 0, .04, 0, 10);
      const arc = new T.Mesh(new T.TorusGeometry(.62, .018, 8, 40, Math.PI * .55), metal); arc.position.set(.6, 1.73, 0); arc.rotation.z = Math.PI * .45; arc.castShadow = true; g.add(arc);
      const sh = sph(g, .22, shadeM, 1.05, 1.52, 0, 1, .8, 1, 24); RENO.glow(g, 1.05, 1.5, 0, 1.2);
      cyl(g, .01, .01, .12, metal, 1.05, 1.62, 0, 6);
    } else { // torchiere
      cyl(g, .2, .22, .05, metal, 0, 0, 0, 32); cyl(g, .018, .018, 1.55, metal, 0, .04, 0, 10);
      const sh = cyl(g, .2, .08, .34, shadeM, 0, 1.55, 0, 32); RENO.glow(g, 0, 1.75, 0, 1.2);
    }
    blob(g, .6, .6, .3);
  };

  // ------------------------------------------------------------------ PAINTING (origin on wall surface at hang centre)
  B.painting = (g, p) => {
    const w = p.w, h = p.h, fr = M(p.frame, { r: .45, m: p.metalFrame ? .7 : 0 }), t = .05, f = p.fw || .06;
    const tex = new T.CanvasTexture(RENO.paintArt(p.art, w, h, p.pal)); tex.colorSpace = T.SRGBColorSpace;
    box(g, w + f * 2, h + f * 2, t, fr, 0, -h / 2 - f, t / 2, .01);
    if (p.mat) box(g, w + .02, h + .02, t + .006, M('#f6f2ea'), 0, -h / 2 - .01, t / 2, .004);
    const im = new T.Mesh(new T.PlaneGeometry(p.mat ? w - .2 : w, p.mat ? h - .2 : h), new T.MeshStandardMaterial({ map: tex, roughness: .6 })); im.position.set(0, 0, t + .004); im.receiveShadow = true; g.add(im);
    g.position; 
  };
})();
