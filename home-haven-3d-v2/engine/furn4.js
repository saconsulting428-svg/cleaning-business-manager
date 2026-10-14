// Home Haven 3D — renovation engine, part 2d: garden builders
(function () {
  const T = THREE, RENO = window.RENO, B = RENO.BUILD;
  const { box, cyl, sph, plane, grp, mat: M, blob, shade, mix, cvs, toTex } = RENO;
  const alongZ = (m) => { m.rotation.x = Math.PI / 2; return m; };
  const alongX = (m) => { m.rotation.z = Math.PI / 2; return m; };

  // ------------------------------------------------------------------ FENCE (origin: centre of fence line, 12 wide, gate gap in the middle)
  B.fence = (g, p, ctx) => {
    const st = p.style, c = M(p.c, { r: .6 }), post = M(p.post || p.c, { r: .55 }), GAP = 1.6, HW = (ctx && ctx.thumb) ? 2.9 : 6.1;
    const segs = [[-HW, -GAP / 2], [GAP / 2, HW]];
    segs.forEach(([a, b]) => {
      const n = Math.round((b - a) / (st === 'stone' ? 1 : .24));
      if (st === 'picket') { alongX(cyl(g, .02, .02, b - a, c, (a + b) / 2, 0, 0, 6)); box(g, b - a, .05, .03, c, (a + b) / 2, .22, -.015, .005); box(g, b - a, .05, .03, c, (a + b) / 2, .6, -.015, .005); for (let i = 0; i <= n; i++) { const x = a + (b - a) * i / n; const pk = box(g, .12, .85, .03, c, x, 0, 0, .008); box(g, .12, .02, .04, c, x, .85, 0, .004); } }
      else if (st === 'iron') { const ir = M(p.c, { m: .75, r: .35 }); box(g, b - a, .04, .04, ir, (a + b) / 2, .12, 0, .01); box(g, b - a, .04, .04, ir, (a + b) / 2, .95, 0, .01); for (let i = 0; i <= n; i++) { const x = a + (b - a) * i / n; cyl(g, .012, .012, 1.0, ir, x, 0, 0, 6); const tip = new T.Mesh(new T.ConeGeometry(.025, .07, 6), ir); tip.position.set(x, 1.04, 0); tip.castShadow = true; g.add(tip); } }
      else { const mc = M(p.c, { r: .95 }); box(g, b - a, .7, .32, mc, (a + b) / 2, 0, 0, .04); for (let i = 0; i < Math.round((b - a)); i++) box(g, .98, .1, .34, M(shade(p.c, -.08), { r: 1 }), a + .5 + i, .7, 0, .03); for (let k = 0; k < 4; k++) for (let i = 0; i < Math.round((b - a)) * 2; i++) if ((i + k) % 2 === 0) box(g, .5, .005, .01, M(shade(p.c, -.25)), a + .25 + i * .5, .1 + k * .17, .165, 0); }
    });
    // posts
    [-HW, -GAP / 2, GAP / 2, HW].forEach(x => { if (st === 'stone') box(g, .4, .95, .4, M(shade(p.c, -.15), { r: .9 }), x, 0, 0, .05); else box(g, .14, 1.05, .14, post, x, 0, 0, .02); if (st === 'iron') sph(g, .06, M('#c9a24a', { m: .8, r: .3 }), x, 1.1, 0); });
    // open gate leaves
    [-1, 1].forEach(s => { const gate = grp(g, s * GAP / 2, 0, 0, s * -1.05); const w = GAP / 2 - .05;
      if (st === 'iron') { const ir = M(p.c, { m: .75, r: .35 }); box(gate, .035, .85, .035, ir, s * .0, 0, 0); box(gate, w, .04, .03, ir, s * w / 2, .15, 0, .008); box(gate, w, .04, .03, ir, s * w / 2, .85, 0, .008); for (let i = 1; i <= 6; i++) cyl(gate, .01, .01, .9, ir, s * w * i / 6, 0, 0, 6); }
      else { box(gate, w, .05, .03, c, s * w / 2, .2, 0, .005); box(gate, w, .05, .03, c, s * w / 2, .62, 0, .005); for (let i = 0; i < 4; i++) box(gate, .1, .8, .03, c, s * (.06 + i * (w - .1) / 3), 0, .02, .006); } });
  };

  // ------------------------------------------------------------------ TREE
  B.tree = (g, p) => {
    const trunk = M(p.trunk || '#7a5233', { r: .9 }), st = p.style;
    if (st === 'pine') { cyl(g, .16, .22, 1.3, trunk, 0, 0, 0, 10); for (let i = 0; i < 5; i++) { const r = 1.15 - i * .2, c = new T.Mesh(new T.ConeGeometry(r, 1.1, 14), M(shade(p.c, -.04 * i + (i % 2) * .05), { r: .95 })); c.position.set(0, 1.0 + i * .7, 0); c.castShadow = c.receiveShadow = true; g.add(c); } }
    else {
      const k = cyl(g, .18, .28, 1.5, trunk, 0, 0, 0, 12); [[.5, 1.4, .1, .6], [-.4, 1.6, -.1, .5]].forEach(([x, y, z, h]) => { const br = cyl(g, .07, .1, h, trunk, x * .5, y - .1, z, 8); br.rotation.z = x > 0 ? -.8 : .8; });
      const cols = [p.c, shade(p.c, -.08), shade(p.c, .08), shade(p.c, -.14)];
      [[0, 2.5, 0, 1.15], [.85, 2.1, .3, .8], [-.8, 2.2, -.2, .85], [.1, 2.95, .45, .7], [-.2, 2.1, .8, .65]].forEach(([x, y, z, r], i) => sph(g, r, M(cols[i % 4], { r: .92 }), x, y, z, 1, .88, 1, 18));
      if (st === 'blossom') for (let i = 0; i < 26; i++) { const a = i * 2.4, h = 1.8 + (i % 7) * .22; sph(g, .06, M('#ffd6e4'), Math.cos(a) * (.8 + (i % 3) * .2), h + 1, Math.sin(a) * (.8 + (i % 3) * .2), 1, 1, 1, 6); }
      if (p.fruit) for (let i = 0; i < 9; i++) { const a = i * 2.2; sph(g, .075, M(p.fruit), Math.cos(a) * 1.0, 2.2 + (i % 4) * .25, Math.sin(a) * .95, 1, 1, 1, 8); }
    }
    blob(g, 2.6, 2.6, .3);
  };

  // ------------------------------------------------------------------ FLOWER BEDS (two planters flanking the path; origin: centre, spans ±5.2)
  B.flowerbeds = (g, p, ctx) => {
    const mk = (x, w, seed) => {
      const R = RENO.rng(seed), wood = M(p.box || '#8b5e3c', { r: .8 }); box(g, w, .32, .8, wood, x, 0, 0, .03); box(g, w - .1, .04, .7, M('#4a3223', { r: 1 }), x, .31, 0, .01);
      const n = Math.round(w * 9);
      for (let i = 0; i < n; i++) {
        const px = x + (R() - .5) * (w - .2), pz = (R() - .5) * .6, col = p.f[(R() * p.f.length) | 0], h = .25 + R() * .35;
        if (p.style === 'lavender') { cyl(g, .006, .006, h, M('#6b8f5a'), px, .32, pz, 4); cyl(g, .02, .014, .14, M(col, { r: .8 }), px, .32 + h, pz, 6); }
        else if (p.style === 'tulip') { cyl(g, .008, .008, h, M('#5c9a45'), px, .32, pz, 4); const bl = sph(g, .05, M(col, { r: .6 }), px, .32 + h, pz, 1, 1.3, 1, 8); }
        else { sph(g, .13, M('#4d8a3f', { r: .9 }), px, .42, pz, 1, .8, 1, 8); sph(g, .09, M(col, { r: .7 }), px, .5 + h * .2, pz, 1, 1, 1, 10); }
      }
    };
    if (ctx && ctx.thumb) mk(0, 3.2, 3); else { mk(-3.35, 3.2, 3); mk(3.35, 3.2, 8); }
  };

  // ------------------------------------------------------------------ BENCH
  B.bench = (g, p) => {
    const wood = M(p.c, { r: .55 }), leg = M(p.leg, { r: .4, m: p.metal ? .7 : 0 });
    const w = 1.6;
    if (p.style === 'park') { [-1, 1].forEach(k => { box(g, .08, .45, .55, leg, k * (w / 2 - .1), 0, 0, .02); box(g, .08, .5, .06, leg, k * (w / 2 - .1), .45, -.24, .02).rotation.x = -.18; }); for (let i = 0; i < 4; i++) box(g, w, .05, .11, wood, 0, .45, -.2 + i * .13, .015); for (let i = 0; i < 3; i++) box(g, w, .1, .03, wood, 0, .55 + i * .14, -.27 - i * .02, .01); }
    else if (p.style === 'modern') { box(g, w, .08, .5, wood, 0, .42, 0, .02); [-1, 1].forEach(k => box(g, .08, .42, .5, leg, k * (w / 2 - .12), 0, 0, .015)); box(g, w, .5, .06, wood, 0, .5, -.26, .02); }
    else { box(g, w, .1, .55, M(p.c, { r: .9 }), 0, .4, 0, .02); [-1, 1].forEach(k => { box(g, .12, .4, .55, M(shade(p.c, -.1), { r: .9 }), k * (w / 2 - .06), 0, 0, .02); }); box(g, w, .45, .1, M(p.c, { r: .9 }), 0, .45, -.25, .03); box(g, .5, .3, .08, fab2(p.accent), -.4, .5, -.12, .03).rotation.set(-.3, 0, .1); }
    blob(g, w + .3, .9, .35);
  };
  const fab2 = (c) => M(c, { r: .95 });

  // ------------------------------------------------------------------ FOUNTAIN / POND (origin: centre)
  const waterM = () => new T.MeshStandardMaterial({ color: '#7fd0f0', roughness: .05, metalness: .1, transparent: true, opacity: .8, emissive: '#2a88b0', emissiveIntensity: .15 });
  B.fountain = (g, p) => {
    const st = p.style, stone = M(p.c, { r: .85 });
    if (st === 'tiered') {
      cyl(g, 1.15, 1.2, .5, stone, 0, 0, 0, 36); cyl(g, 1.0, 1.0, .03, waterM(), 0, .47, 0, 36);
      cyl(g, .16, .22, 1.0, stone, 0, .4, 0, 16); cyl(g, .58, .5, .14, stone, 0, 1.1, 0, 28); cyl(g, .5, .5, .03, waterM(), 0, 1.23, 0, 28);
      cyl(g, .07, .1, .5, stone, 0, 1.2, 0, 12); sph(g, .13, stone, 0, 1.75, 0);
      for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; const jet = cyl(g, .008, .008, .5, M('#cfefff', { t: .6 }), Math.cos(a) * .25, 1.28, Math.sin(a) * .25, 5); jet.rotation.set(Math.sin(a) * .5, 0, -Math.cos(a) * .5); }
    } else if (st === 'pond') {
      const rim = new T.Mesh(new T.TorusGeometry(1.15, .17, 10, 40), M('#9a9a92', { r: .95 })); rim.rotation.x = Math.PI / 2; rim.scale.set(1.2, 1, 1); rim.position.y = .1; rim.castShadow = true; g.add(rim);
      const w = cyl(g, 1.15, 1.15, .02, waterM(), 0, .08, 0, 40); w.scale.set(1.2, 1, .98);
      for (let i = 0; i < 14; i++) { const a = i * .45, rr = 1.2 + (i % 2) * .08; const r = sph(g, .12 + (i % 3) * .05, M(shade('#8a8a82', (i % 4) * .06 - .1), { r: .95 }), Math.cos(a) * rr * 1.2, .12, Math.sin(a) * rr, 1, .75, 1, 8); }
      [[-.3, .2], [.4, -.2], [.1, .45]].forEach(([x, z]) => { const l = cyl(g, .17, .17, .01, M('#5fae4e'), x, .1, z, 16); sph(g, .06, M('#ffb3c7'), x + .02, .13, z, 1, .7, 1, 8); });
      const f = cyl(g, .03, .03, .5, M('#cfefff', { t: .5 }), .0, .1, 0, 6);
    } else { // birdbath
      cyl(g, .45, .5, .1, stone, 0, 0, 0, 24); cyl(g, .1, .14, .7, stone, 0, .08, 0, 12); cyl(g, .5, .12, .16, stone, 0, .78, 0, 28); cyl(g, .42, .42, .02, waterM(), 0, .92, 0, 28);
      const b = sph(g, .07, M('#e8a33d'), .1, 1.0, .05, 1, .9, 1.2); sph(g, .045, M('#e8a33d'), .15, 1.07, .1); box(g, .03, .02, .05, M('#d1462f'), .19, 1.07, .12, .005);
    }
    blob(g, 3, 3, .3);
  };

  // ------------------------------------------------------------------ garden path (surface patch from gate to the house; origin at gate line)
  B.path = (g, p, ctx) => {
    const len = (ctx && ctx.thumb) ? 3.0 : 6.0, st = p.style;
    if (st === 'stones') { const R = RENO.rng(5); for (let i = 0; i < Math.round(len / .68); i++) { const s = cyl(g, .34, .36, .05, M(p.c, { r: .95 }), (R() - .5) * .35, 0, -i * .68 + .1, 14); s.scale.z = .8; } }
    else if (st === 'brick') { const tex = new T.CanvasTexture(cvs(256, 600, (x, W, H) => { x.fillStyle = '#b9a58b'; x.fillRect(0, 0, W, H); const R = RENO.rng(3); for (let j = 0; j < 20; j++) for (let i = 0; i < 4; i++) { x.fillStyle = shade(p.c, (R() - .5) * .3); const ox = j % 2 ? 32 : 0; x.fillRect(i * 64 + ox - 32 + 2, j * 30 + 2, 60, 26); } })); tex.colorSpace = T.SRGBColorSpace; const m = new T.Mesh(new T.PlaneGeometry(1.5, len), new T.MeshStandardMaterial({ map: tex, roughness: .9 })); m.rotation.x = -Math.PI / 2; m.position.set(0, .012, -len / 2 + .5); m.receiveShadow = true; g.add(m); box(g, .08, .03, len, M('#8c7b6a'), -.77, 0, -len / 2 + .5, .01); box(g, .08, .03, len, M('#8c7b6a'), .77, 0, -len / 2 + .5, .01); }
    else { for (let i = 0; i < Math.round(len / .6); i++) box(g, 1.3, .05, .5, M(shade(p.c, (i % 3) * .05 - .05), { r: .7 }), 0, 0, -i * .6 + .3, .012); }
  };
})();
