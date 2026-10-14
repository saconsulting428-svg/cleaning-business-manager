// Home Haven 3D — renovation engine, part 2c: bedroom & bathroom builders
(function () {
  const T = THREE, RENO = window.RENO, B = RENO.BUILD;
  const { box, cyl, sph, plane, grp, mat: M, blob, shade, mix, cvs, toTex } = RENO;
  const alongZ = (m) => { m.rotation.x = Math.PI / 2; return m; };
  const alongX = (m) => { m.rotation.z = Math.PI / 2; return m; };
  const fab = (c) => M(c, { r: .95 });
  const steel = () => M('#c9ced3', { m: .85, r: .28 });

  // ------------------------------------------------------------------ BED (origin: centre of footprint 1.7 × 2.1, headboard at -z)
  B.bed = (g, p) => {
    const w = p.w || 1.75, L = p.L || 2.1, st = p.style, wood = M(p.wood, { r: .5 }), lin = fab(p.sheet), duv = fab(p.duvet), pil = fab(p.pillow || '#f7f2e8');
    const legH = st === 'upholstered' ? .1 : .16;
    if (st === 'upholstered') { box(g, w + .1, .3, L, fab(p.wood), 0, .1, 0, .06); box(g, w + .12, 1.25, .2, fab(p.wood), 0, 0, -L / 2 - .03, .1); [-2, -1, 0, 1, 2].forEach(i => box(g, .01, 1.0, .02, M(shade(p.wood, -.2)), i * .3, .15, -L / 2 + .08, .002)); for (let i = -1; i <= 1; i++) for (let j = 0; j < 4; j++) sph(g, .02, M(shade(p.wood, -.4), { m: .5 }), i * .45 + (j % 2 ? .22 : 0), .55 + j * .22, -L / 2 + .1, 1, 1, .6, 8); }
    else if (st === 'wood') { box(g, w + .06, .24, L, wood, 0, legH, 0, .03); [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => box(g, .09, legH + .2, .09, wood, a * (w / 2 + .0), 0, b * (L / 2 - .02), .02)); box(g, w + .14, 1.15, .1, wood, 0, 0, -L / 2 - .02, .03); for (let i = -3; i <= 3; i++) box(g, .035, .5, .04, M(shade(p.wood, -.12)), i * .22, .6, -L / 2 + .04, .01); box(g, w + .06, .5, .1, wood, 0, 0, L / 2 + .02, .03); }
    else { // metal frame, sleigh style
      const mm = M(p.wood, { m: .8, r: .4 }); box(g, w, .12, L, mm, 0, .2, 0, .02); [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => cyl(g, .025, .025, .6 + (b < 0 ? .7 : 0), mm, a * (w / 2 - .02), 0, b * (L / 2 - .02), 10));
      [-1, 1].forEach(a => { for (let i = 0; i < 8; i++) cyl(g, .01, .01, .55, mm, a * 0, 0, 0, 6).position.set((i - 3.5) * .21, .9, -L / 2 + .02); }); box(g, w, .03, .03, mm, 0, 1.28, -L / 2 + .02, .01); box(g, w, .03, .03, mm, 0, .65, L / 2 - .02, .01); }
    const my = st === 'upholstered' ? .4 : legH + .24;
    box(g, w - .1, .26, L - .1, lin, 0, my, 0, .09); // mattress
    box(g, w - .06, .06, L * .62, duv, 0, my + .26, L * .15, .03); box(g, w - .02, .19, L * .62, duv, 0, my + .1, L * .16, .09);
    const fold = box(g, w - .02, .12, .3, fab(shade(p.duvet, -.18)), 0, my + .26, L * .16 - .2, .05);
    if (w > 1.3) { box(g, .6, .2, .42, pil, -.4, my + .26, -L / 2 + .36, .09).rotation.x = -.1; box(g, .6, .2, .42, pil, .4, my + .26, -L / 2 + .36, .09).rotation.x = -.1; } else box(g, .6, .2, .42, pil, 0, my + .26, -L / 2 + .36, .09).rotation.x = -.1;
    box(g, .5, .18, .3, fab(p.accent || '#e6a15c'), 0, my + .3, -L / 2 + .62, .08).rotation.x = -.35;
    box(g, w - .14, .05, .38, fab(p.accent || '#e6a15c'), 0, my + .3, L / 2 - .5, .02);
    blob(g, w + .5, L + .5, .45);
  };

  // ------------------------------------------------------------------ WARDROBE (origin: floor centre, back at -z)
  B.wardrobe = (g, p) => {
    const w = p.w || 1.5, h = 2.1, d = .62, st = p.style, body = M(p.c, { r: .45 }), hand = M(p.hand, { m: .8, r: .3 });
    box(g, w, h, d, body, 0, 0, 0, .03);
    if (st === 'sliding') { [-1, 1].forEach(k => { box(g, w / 2 - .02, h - .12, .03, M(k < 0 ? p.c2 : p.c, { r: .4 }), k * w / 4, .05, d / 2 + .0 + (k < 0 ? .0 : .03), .01); box(g, .02, .6, .03, hand, k * (w / 4) - k * .15 + k * 0.2, .9, d / 2 + .05 + (k < 0 ? 0 : .03), .005); }); box(g, w, .04, .05, M('#2b2b2b'), 0, h - .06, d / 2, .005); }
    else { [-1, 1].forEach(k => { box(g, w / 2 - .015, h - .12, .03, body, k * w / 4, .06, d / 2, .012); box(g, w / 2 - .14, h - .3, .01, M(shade(p.c, -.1)), k * w / 4, .15, d / 2 + .02, .004); box(g, .025, .5, .035, hand, -k * .06 + k * 0, 1.0, d / 2 + .045, .008); }); if (st === 'mirror') { box(g, w / 2 - .22, h - .5, .008, M('#d5e6ee', { r: .05, m: .2, e: '#b8d4de', ei: .15 }), w / 4, .25, d / 2 + .022, .002); } }
    box(g, w + .06, .06, d + .04, M(shade(p.c, -.12), { r: .5 }), 0, h, 0, .015);
    box(g, w, .1, d - .06, M(shade(p.c, -.3)), 0, 0, 0, .01);
    // decor on top
    box(g, .4, .22, .3, M('#c8a77b', { r: .8 }), -w / 2 + .35, h + .06, 0, .02); box(g, .34, .18, .26, M('#a87f56', { r: .8 }), -w / 2 + .4, h + .28, 0, .02);
    blob(g, w + .2, d + .3, .35);
  };

  // ------------------------------------------------------------------ NIGHTSTANDS + lamps (origin: bed centre; units at ±x)
  B.nightstands = (g, p) => {
    [-1, 1].forEach(s => {
      const u = grp(g, s * 1.28, 0, 0), wood = M(p.c, { r: .5 }), hand = M(p.hand, { m: .8, r: .3 });
      if (p.style === 'round') { cyl(u, .27, .27, .04, wood, 0, .56, 0, 28); cyl(u, .03, .04, .54, M(p.c2, { m: .7, r: .35 }), 0, 0, 0, 10); cyl(u, .18, .2, .03, wood, 0, .15, 0, 20); }
      else { box(u, .5, .56, .42, wood, 0, 0, 0, .025); [.12, .34].forEach(y => { box(u, .44, .2, .02, M(shade(p.c, .08)), 0, y, .215, .008); alongX(cyl(u, .011, .011, .12, hand, 0, 0, 0, 8)).position.set(0, y + .1, .24); }); [-1, 1].forEach(a => box(u, .04, .08, .04, M(p.c2), a * .2, -.0, a * 0 + .16, .01)); }
      const ty = .58, lampM = new T.MeshStandardMaterial({ color: p.shade, emissive: p.shade, emissiveIntensity: 0, roughness: .9, side: T.DoubleSide });
      (g.userData.emissives = g.userData.emissives || []).push(lampM);
      if (p.lamp === 'globe') { cyl(u, .07, .08, .05, M(p.c2, { m: .6 }), 0, ty, 0, 14); sph(u, .14, new T.MeshStandardMaterial({ color: '#fff6e2', emissive: '#ffe2a0', emissiveIntensity: 0, transparent: true, opacity: .92, roughness: .2 }), 0, ty + .22, 0); g.userData.emissives.push(u.children[u.children.length - 1].material); }
      else { cyl(u, .04, .06, .22, M(p.c2, { m: .6 }), 0, ty, 0, 12); cyl(u, .13, .18, .2, lampM, 0, ty + .2, 0, 24); }
      RENO.glow(u, 0, ty + .28, 0, .9);
      box(u, .2, .035, .15, M(s < 0 ? '#5d6d7e' : '#a2573f'), s * .08, ty, .1, .008); // book
    });
    blob(g, 3.2, .7, .0);
  };

  // ------------------------------------------------------------------ BATHTUB (origin: footprint centre, 1.8 × .82)
  B.bathtub = (g, p) => {
    const st = p.style, L = 1.8, d = .84, white = M('#f8f9fb', { r: .15 }), water = M('#8fd3ee', { t: .72, r: .05 });
    if (st === 'free') {
      const outer = cyl(g, .5, .5, .55, white, 0, .1, 0, 40); outer.scale.set(L / 1.0 * .5, 1, d / 1.0 * .56 / .5 * .5 * 2 * .5);
      outer.scale.set(1.8, 1, .84 / 1.0 * 1.0);
      const rim = new T.Mesh(new T.TorusGeometry(.5, .05, 12, 40), white); rim.rotation.x = Math.PI / 2; rim.scale.set(1.8, .84, 1); rim.position.y = .66; rim.castShadow = true; g.add(rim);
      const inner = cyl(g, .5, .5, .02, water, 0, .56, 0, 40); inner.scale.set(1.74, 1, .78);
      [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => cyl(g, .045, .035, .12, M('#c9a24a', { m: .8, r: .3 }), a * .72, 0, b * .26, 10));
      const fc = M('#c9a24a', { m: .85, r: .25 }); cyl(g, .02, .02, .7, fc, 0.78, .02, -.02, 10); cyl(g, .018, .018, .12, fc, .74, .72, -.02, 8).rotation.z = Math.PI / 2;
    } else if (st === 'claw') {
      const body = cyl(g, .5, .46, .5, white, 0, .15, 0, 40); body.scale.set(1.78, 1, .82);
      const rim = new T.Mesh(new T.TorusGeometry(.5, .045, 12, 40), white); rim.rotation.x = Math.PI / 2; rim.scale.set(1.78, .82, 1); rim.position.y = .65; rim.castShadow = true; g.add(rim);
      const inner = cyl(g, .5, .5, .02, water, 0, .55, 0, 40); inner.scale.set(1.7, 1, .74);
      [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => { const f = cyl(g, .05, .035, .17, M('#b8860b', { m: .8, r: .3 }), a * .66, 0, b * .24, 10); sph(g, .06, M('#b8860b', { m: .8, r: .3 }), a * .66, .06, b * .24); });
      const fc = M('#b8860b', { m: .85, r: .25 }); cyl(g, .02, .02, .85, fc, 0.0, .45, -.46, 10); alongZ(cyl(g, .018, .018, .2, fc, 0, 0, 0, 8)).position.set(0, 1.28, -.38);
      box(g, .08, .04, .08, fc, .1, 1.18, -.46, .01); box(g, .08, .04, .08, fc, -.1, 1.18, -.46, .01);
    } else { // built-in with tiled surround and glass screen
      box(g, L, .6, d, M(p.tile || '#9fd0dc', { r: .25 }), 0, 0, 0, .03);
      box(g, L - .22, .04, d - .22, white, 0, .6, 0, .02); box(g, L - .3, .02, d - .3, water, 0, .56, 0, .01);
      box(g, L + .02, .62, .04, white, 0, 0, d / 2 - .02, .02);
      const glass = M('#dff3f7', { t: .28, r: .05 }); box(g, .9, 1.3, .02, glass, -.35, .62, d / 2 + .0, .002); box(g, .045, 1.32, .045, steel(), -.8, .62, d / 2 + .0, .01);
      const fc = steel(); cyl(g, .02, .02, .22, fc, .6, .62, -.3, 10); cyl(g, .02, .02, .8, fc, .6, .62, -.4, 8); box(g, .2, .16, .03, M('#cfd5da', { m: .8, r: .2 }), .6, 1.4, -.4, .02);
    }
    blob(g, L + .3, d + .3, .35);
  };

  // ------------------------------------------------------------------ TOILET (origin: footprint centre, tank at -z)
  B.toilet = (g, p) => {
    const w = M(p.c, { r: .12 }), st = p.style;
    if (st === 'modern') { box(g, .38, .38, .66, w, 0, 0, .0, .1); box(g, .4, .42, .2, w, 0, .0, -.22, .05); box(g, .4, .06, .5, M(shade(p.c, -.05), { r: .15 }), 0, .4, .1, .03); box(g, .4, .12, .22, w, 0, .48, -.28, .03); cyl(g, .035, .035, .02, M('#c9ced3', { m: .8 }), 0, .6, -.28, 14); }
    else if (st === 'classic') { box(g, .4, .4, .62, w, 0, 0, .04, .1); box(g, .42, .5, .22, w, 0, .0, -.22, .06); box(g, .4, .06, .5, M(p.seat || '#e9d9b8', { r: .35 }), 0, .4, .08, .03); box(g, .38, .08, .16, w, 0, .5, -.3, .03); box(g, .03, .5, .03, steel(), .0, .98, -.25, .01); box(g, .5, .06, .22, w, 0, 1.08, -.3, .02); cyl(g, .02, .02, .6, steel(), .12, .5, -.24, 8); }
    else { box(g, .36, .34, .56, w, 0, .22, .04, .1); box(g, .4, .06, .5, w, 0, .56, .05, .03); box(g, .42, .62, .14, w, 0, .0, -.27, .05); box(g, .42, .2, .1, M(shade(p.c, -.1)), 0, .62, -.3, .02); }
    blob(g, .7, .9, .35);
  };

  // ------------------------------------------------------------------ VANITY (origin: footprint centre, back at -z, 1.1 wide)
  B.vanity = (g, p) => {
    const w = p.w || 1.1, d = .52, st = p.style, body = M(p.c, { r: .45 }), top = M(p.top, { r: .18 }), hand = M(p.hand || '#c9a24a', { m: .85, r: .3 });
    if (st === 'floating') { box(g, w, .42, d, body, 0, .42, 0, .03); [0, 1].forEach(i => alongX(cyl(g, .01, .01, .3, hand, 0, 0, 0, 8)).position.set(0, .56 - i * .0, d / 2 + .03)); box(g, w - .04, .008, .02, M(shade(p.c, -.35)), 0, .62, d / 2 + .0, .002); box(g, w + .04, .06, d + .04, top, 0, .84, 0, .015); }
    else { box(g, w, .8, d, body, 0, .0, 0, .03); [-1, 1].forEach(k => { box(g, w / 2 - .035, .66, .03, M(shade(p.c, .06)), k * w / 4, .08, d / 2, .01); box(g, .02, .08, .035, hand, -k * .05 + k * 0, .5, d / 2 + .03, .008); }); box(g, w + .06, .05, d + .05, top, 0, .8, 0, .015); box(g, w + .06, .08, .02, top, 0, .85, -d / 2 - .02, .008); }
    const ty = .85 + (st === 'floating' ? .04 : .0);
    const basin = cyl(g, .22, .18, .1, M('#f7f8fa', { r: .1 }), 0, ty - .02, .02, 30); basin.scale.z = .8; cyl(g, .16, .16, .008, M('#cfd8dc'), 0, ty + .07, .02, 24).scale.z = .78;
    const fc = M(p.hand || '#c9a24a', { m: .9, r: .25 }); cyl(g, .018, .018, .2, fc, 0, ty, -.18, 10); alongZ(cyl(g, .016, .016, .12, fc, 0, 0, 0, 8)).position.set(0, ty + .2, -.13);
    box(g, .1, .12, .1, M('#e9f2f4'), -.42, ty, -.08, .03); cyl(g, .035, .035, .14, M('#79b6c4'), .42, ty, -.08, 12); // soap
    blob(g, w + .2, d + .2, .35);
  };

  // ------------------------------------------------------------------ MIRROR (origin: hang centre on wall)
  B.mirror = (g, p) => {
    const fr = M(p.frame, { m: p.metal ? .8 : 0, r: .35 }), glass = new T.MeshStandardMaterial({ color: '#dcecf2', roughness: .06, metalness: .35, emissive: '#aac8d4', emissiveIntensity: .25 });
    const st = p.style;
    if (st === 'round') { const r = .45, ring = new T.Mesh(new T.TorusGeometry(r, .035, 12, 48), fr); ring.position.set(0, 0, .04); ring.castShadow = true; g.add(ring); const gl = new T.Mesh(new T.CircleGeometry(r, 48), glass); gl.position.z = .03; g.add(gl); }
    else if (st === 'arch') { const sh = new T.Shape(); const w = .46, h = .95; sh.moveTo(-w, -h / 2); sh.lineTo(w, -h / 2); sh.lineTo(w, h / 2 - w); sh.absarc(0, h / 2 - w, w, 0, Math.PI, false); sh.lineTo(-w, -h / 2);
      const fg = new T.ExtrudeGeometry(sh, { depth: .04, bevelEnabled: false }); const f = new T.Mesh(fg, fr); f.scale.set(1.1, 1.06, 1); f.castShadow = true; g.add(f); const gl = new T.Mesh(new T.ShapeGeometry(sh), glass); gl.position.z = .045; g.add(gl); }
    else { box(g, .95, 1.0, .05, fr, 0, -.5, .025, .015); const gl = new T.Mesh(new T.PlaneGeometry(.85, .9), glass); gl.position.z = .052; g.add(gl); box(g, .6, .04, .06, M('#fffbe8', { e: '#ffe9a8', ei: .5 }), 0, .56, .07, .01); }
  };

  // ------------------------------------------------------------------ BATH MAT
  B.bathmat = (g, p) => {
    if (p.round) { const m = cyl(g, .5, .5, .035, M(p.c, { r: 1 }), 0, 0, 0, 36); cyl(g, .3, .3, .045, M(p.c2, { r: 1 }), 0, 0, 0, 36); }
    else { box(g, .9, .035, .55, M(p.c, { r: 1 }), 0, 0, 0, .015); for (let i = 0; i < 4; i++) box(g, .8, .02, .05, M(p.c2, { r: 1 }), 0, .03, -.18 + i * .12, .008); }
    // towel stack + slippers
    box(g, .3, .12, .22, M(p.t || '#ffffff', { r: 1 }), .95, 0, .05, .04); box(g, .3, .05, .22, M(p.t2 || '#ffcf9f', { r: 1 }), .95, .12, .05, .03);
    blob(g, 1.0, .7, .15);
  };
})();
