// Home Haven 3D — procedural 3D models for every buildable part (items). Origin = footprint centre on the floor, front = +z.
(function () {
  const T = THREE, RENO = window.RENO, B = RENO.BUILD;
  const { box, cyl, sph, grp, mat: M, blob, shade, mix, cvs, toTex } = RENO;
  const P = RENO.PARTS = {};
  const fab = (c) => M(c, { r: .95 }), wood = (c) => M(c, { r: .5 });
  const scaled = (g, sx, sy, sz) => { g.scale.set(sx, sy ?? sx, sz ?? sx); return g; };
  const rotX = (m) => { m.rotation.x = Math.PI / 2; return m; };
  const rotZ = (m) => { m.rotation.z = Math.PI / 2; return m; };

  P.sofa = (g, c) => { const h = grp(g); B.sofa(h, { style: 'classic', c, leg: '#6b4a2f', pillow: '#f0d9a8', pillow2: shade(c, -.25), w: 1.9 }); h.scale.set(.98, 1, .92); };
  P.armchair = (g, c) => {
    const f = fab(c), f2 = fab(shade(c, -.12)); [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => box(g, .07, .12, .07, wood('#5a3d26'), a * .32, 0, b * .32, .02));
    box(g, .84, .22, .8, f2, 0, .12, 0, .06); box(g, .68, .16, .56, f, 0, .34, .08, .06); box(g, .8, .6, .18, f, 0, .12, -.31, .07).rotation.x = -.1;
    [-1, 1].forEach(s => { box(g, .16, .34, .72, f, s * .34, .12, 0, .06); const r = cyl(g, .09, .09, .7, f, 0, 0, 0, 14); rotX(r); r.position.set(s * .34, .47, 0); });
    box(g, .34, .3, .1, fab(shade(c, .25)), .15, .36, -.14, .04).rotation.set(-.3, 0, .15); blob(g, 1, 1, .35);
  };
  P.coffee_table = (g, c) => { const h = grp(g); B.coffee(h, { style: 'round', c, c2: '#2b2b2b' }); h.scale.setScalar(.72); };
  P.dining_table = (g, c) => { const w = wood(c); box(g, 1.9, .06, .92, w, 0, .72, 0, .02); [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => box(g, .07, .72, .07, wood(shade(c, -.25)), a * .85, 0, b * .38, .02)); box(g, 1.6, .05, .08, wood(shade(c, -.2)), 0, .6, 0, .01); cyl(g, .12, .08, .08, M('#f6f0e4', { r: .3 }), 0, .78, 0, 16); sph(g, .06, M('#e53935'), -.02, .9, 0); blob(g, 1.9, .9, .3); };
  P.chair = (g, c) => { [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => box(g, .05, .45, .05, wood(shade(c, -.25)), a * .19, 0, b * .19, .015)); box(g, .46, .07, .46, wood(c), 0, .45, 0, .03); box(g, .44, .42, .05, wood(c), 0, .52, -.21, .02).rotation.x = -.08; [-1, 0, 1].forEach(i => box(g, .06, .3, .02, wood(shade(c, -.15)), i * .13, .6, -.205, .008)); blob(g, .6, .6, .3); };
  P.bed = (g, c) => { const h = grp(g); B.bed(h, { style: 'wood', wood: '#8b5a3c', sheet: '#f5efe6', duvet: c, accent: '#e6a15c' }); h.scale.set(.55, .95, .94); h.position.z = .0; };
  P.wardrobe = (g, c) => { const h = grp(g); B.wardrobe(h, { style: 'shaker', c, hand: '#c9ced3', w: .95 }); h.scale.set(1, .95, .95); };
  P.bookshelf = (g, c) => {
    const w = wood(c); box(g, .9, 1.75, .36, w, 0, 0, 0, .02); const R = RENO.rng(7), cols = ['#c0392b', '#2980b9', '#27ae60', '#f39c12', '#8e44ad', '#16a085', '#e67e22'];
    [.12, .5, .88, 1.26].forEach((y, k) => { box(g, .84, .03, .34, wood(shade(c, -.2)), 0, y + .32, .01, .005); let x = -.38; while (x < .36) { const bw = .05 + R() * .05, bh = .22 + R() * .08; box(g, bw, bh, .24, M(cols[(R() * 7) | 0], { r: .8 }), x + bw / 2, y + .34, .03, .004); x += bw + .005; } });
    box(g, .9, .06, .38, wood(shade(c, -.15)), 0, 1.75, 0, .015); blob(g, 1, .6, .3);
  };
  P.tv = (g, c) => { box(g, .9, .5, .4, wood('#5a3d26'), 0, 0, 0, .02); box(g, .86, .02, .3, wood('#3b2819'), 0, .5, 0, .005); box(g, .08, .12, .06, M('#222', { m: .6 }), 0, .5, 0, .01); const sc = box(g, .86, .52, .05, M('#15171c', { r: .15, m: .3 }), 0, .62, 0, .015); box(g, .78, .44, .01, M('#27384a', { r: .1, e: '#3a5878', ei: .25 }), 0, .66, .027, .004); blob(g, 1, .6, .3); };
  P.lamp = (g, c) => B.lamp(g, { style: 'tripod', shade: shade(c, .55), wood: '#8b5e3c' });
  P.rug = (g, c) => B.rug(g, { w: 1.92, d: 1.92, style: 'persian', c1: c, c2: shade(c, .45), c3: shade(c, -.45), fringe: false });
  P.plant = (g, c) => {
    cyl(g, .2, .15, .3, M(c, { r: .6 }), 0, 0, 0, 16); cyl(g, .19, .19, .03, M('#4a3223'), 0, .3, 0, 14);
    const lf = M('#4f9d4a', { r: .8 }), lf2 = M('#6dbb5c', { r: .8 }); for (let i = 0; i < 9; i++) { const a = i * 2.4, l = box(g, .1, .5 + (i % 3) * .12, .02, i % 2 ? lf : lf2, Math.cos(a) * .1, .3, Math.sin(a) * .1, .01); l.rotation.set(Math.sin(a) * .5, a, -Math.cos(a) * .5); l.position.y += .3; }
    blob(g, .5, .5, .3);
  };
  const cabinet = (g, c, top = '#e9e6df') => { box(g, .96, .86, .94, M(c, { r: .55 }), 0, 0, 0, .02); box(g, .88, .74, .02, M(shade(c, .08)), 0, .06, .475, .006); box(g, 1.0, .05, .98, M(top, { r: .25 }), 0, .86, 0, .01); box(g, .12, .02, .03, M('#c9ced3', { m: .8 }), 0, .6, .5, .006); };
  P.counter = (g, c) => { cabinet(g, c); cyl(g, .05, .05, .2, M('#c4b69c'), -.25, .91, -.2, 12); box(g, .3, .04, .22, M('#b98756'), .15, .91, .1, .01); blob(g, 1, 1, .3); };
  P.stove = (g, c) => { cabinet(g, '#9aa1a8', '#2a2d31'); box(g, .8, .5, .02, M('#1a1c1f', { r: .1 }), 0, .2, .5, .006); [[-.2, -.2], [.2, -.2], [-.2, .2], [.2, .2]].forEach(([a, b]) => cyl(g, .09, .09, .01, M('#555', { m: .6 }), a, .91, b, 18)); rotZ(cyl(g, .012, .012, .7, M('#c9ced3', { m: .8 }), 0, 0, 0, 8)).position.set(0, .8, .52); blob(g, 1, 1, .3); };
  P.fridge = (g, c) => { const h = grp(g); B.fridge(h, { style: 'steel', c, hand: '#8a8f94', w: .88, h: 1.85 }); h.position.z = 0; };
  P.sink = (g, c) => { cabinet(g, c, '#cfd3d6'); box(g, .6, .02, .45, M('#aeb4ba', { m: .9, r: .2 }), 0, .89, .02, .008); box(g, .5, .004, .35, M('#6b7075', { m: .8 }), 0, .9, .02, .002); const f = M('#c9ced3', { m: .85, r: .25 }); cyl(g, .018, .018, .25, f, 0, .91, -.3, 10); rotX(cyl(g, .014, .014, .18, f, 0, 0, 0, 8)).position.set(0, 1.16, -.22); blob(g, 1, 1, .3); };
  P.bathtub = (g, c) => { const h = grp(g); B.bathtub(h, { style: 'built', tile: c }); h.scale.set(1, 1, 1.0); h.rotation.y = Math.PI / 2; h.scale.set(1.0, 1, .98); };
  P.toilet = (g, c) => { const h = grp(g); B.toilet(h, { style: 'modern', c: '#fbfcfd' }); };
  P.basin = (g, c) => { cyl(g, .12, .1, .75, M('#f7f8fa', { r: .15 }), 0, 0, -.1, 16); const b = cyl(g, .3, .22, .15, M('#f7f8fa', { r: .1 }), 0, .75, -.05, 28); b.scale.z = .8; cyl(g, .22, .22, .008, M('#cfd8dc'), 0, .9, -.05, 24).scale.z = .78; const f = M('#c9ced3', { m: .85 }); cyl(g, .016, .016, .15, f, 0, .9, -.24, 8); rotX(cyl(g, .012, .012, .1, f, 0, 0, 0, 8)).position.set(0, 1.05, -.19); box(g, .5, .5, .03, M('#d5e6ee', { r: .05, m: .2, e: '#b8d4de', ei: .15 }), 0, 1.15, -.46, .005); blob(g, .8, .8, .3); };
  P.charpai = (g, c) => { const w = wood(c); [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => cyl(g, .05, .04, .36, w, a * .4, 0, b * .88, 10)); box(g, .92, .06, 1.9, w, 0, .36, 0, .02); const rope = M('#d9c08a', { r: 1 }); for (let i = 0; i < 12; i++) box(g, .84, .012, .03, rope, 0, .4, -.8 + i * .145, .004); for (let i = 0; i < 6; i++) box(g, .03, .012, 1.8, rope, -.35 + i * .14, .405, 0, .004); box(g, .5, .1, .26, fab('#f1e3c0'), 0, .42, -.7, .04); blob(g, 1.1, 2, .3); };
  P.tree = (g, c) => { const h = grp(g); B.tree(h, { style: 'oak', c, trunk: '#7a5233' }); h.scale.setScalar(.34); };
  P.pine = (g, c) => { const h = grp(g); B.tree(h, { style: 'pine', c, trunk: '#6b4a2f' }); h.scale.setScalar(.34); };
  P.bush = (g, c) => { [[0, .3, 0, .32], [.28, .24, .1, .24], [-.26, .22, -.05, .26], [.05, .5, .05, .22]].forEach(([x, y, z, r], i) => sph(g, r, M(shade(c, (i % 3) * .06 - .06), { r: .95 }), x, y, z, 1, .85, 1, 14)); blob(g, .9, .8, .3); };
  P.flowers = (g, c) => { box(g, .86, .16, .86, wood('#7a5a3c'), 0, 0, 0, .03); box(g, .78, .02, .78, M('#4a3223', { r: 1 }), 0, .16, 0, .005); const R = RENO.rng(5); for (let i = 0; i < 16; i++) { const x = (R() - .5) * .7, z = (R() - .5) * .7, h = .2 + R() * .2; cyl(g, .006, .006, h, M('#5c9a45'), x, .16, z, 4); sph(g, .055, M(i % 3 ? c : shade(c, .3), { r: .6 }), x, .16 + h, z, 1, 1, 1, 8); } };
  P.swing = (g, c) => { const f = wood(c), ch = M('#9aa', { m: .6 }); [-1, 1].forEach(s => { [-1, 1].forEach(z => { const l = box(g, .07, 1.8, .07, f, s * .88, 0, z * .3, .015); l.rotation.z = -s * .12; l.rotation.x = z * .0; }); }); box(g, 1.9, .08, .08, f, 0, 1.75, 0, .015); [-.3, .3].forEach(x => { cyl(g, .008, .008, 1.2, ch, x, .55, 0, 4); }); box(g, .5, .05, .2, M('#e63946', { r: .6 }), -0, .52, 0, .02); blob(g, 2, .9, .3); };
  P.bench = (g, c) => { const h = grp(g); B.bench(h, { style: 'park', c, leg: '#2a2d33', metal: true }); h.scale.set(1.18, 1, .9); };
  P.lamp_post = (g, c) => { const m = M(c, { m: .6, r: .4 }); cyl(g, .12, .15, .12, m, 0, 0, 0, 14); cyl(g, .035, .05, 2.2, m, 0, .1, 0, 10); box(g, .26, .06, .26, m, 0, 2.25, 0, .01); const gl = new T.MeshStandardMaterial({ color: '#fff3c9', emissive: '#ffd56a', emissiveIntensity: 0, transparent: true, opacity: .9 }); box(g, .2, .3, .2, gl, 0, 2.31, 0, .02); g.userData.emissives = [gl]; const cp = new T.Mesh(new T.ConeGeometry(.2, .14, 4), m); cp.position.y = 2.68; cp.rotation.y = Math.PI / 4; cp.castShadow = true; g.add(cp); RENO.glow(g, 0, 2.45, 0, 1.8); };
  P.pond = (g, c) => { const h = grp(g); B.fountain(h, { style: 'pond', c: '#9a9a92' }); h.scale.setScalar(.78); };
  P.mailbox = (g, c) => { const m = M(c, { r: .5 }); box(g, .08, .8, .08, wood('#6b4a2f'), 0, 0, 0, .01); box(g, .34, .26, .22, m, 0, .8, 0, .09); box(g, .01, .15, .06, M('#fff'), .16, .86, .12, 0); box(g, .02, .12, .02, M('#e8c030'), .19, .98, 0, 0); blob(g, .5, .5, .3); };
  P.water_tank = (g, c) => { const m = M(c, { r: .4, m: .3 }); [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => box(g, .07, .7, .07, M('#555', { m: .6 }), a * .3, 0, b * .3, .01)); cyl(g, .42, .42, .8, m, 0, .7, 0, 22); cyl(g, .43, .43, .05, M(shade(c, .2), { r: .4 }), 0, 1.5, 0, 22); cyl(g, .03, .03, .5, M('#777', { m: .8 }), .3, .2, .3, 8); blob(g, 1, 1, .3); };
  P.car = (g, c) => {
    const bd = M(c, { r: .25, m: .35 }), gl = M('#a9d6ec', { r: .05, m: .2 }), tire = M('#1d1d1f', { r: .9 });
    box(g, .86, .34, 1.9, bd, 0, .22, 0, .12); box(g, .78, .3, 1.0, bd, 0, .54, .1, .1); const wnd = box(g, .8, .24, 1.04, gl, 0, .55, .1, .06); wnd.scale.set(1.0, 1, 1.0);
    [[-1, -.6], [1, -.6], [-1, .65], [1, .65]].forEach(([a, z]) => { const w = cyl(g, .19, .19, .14, tire, a * .42, .0, z, 18); w.rotation.z = Math.PI / 2; w.position.y = .19; cyl(g, .09, .09, .15, M('#cfd3d6', { m: .8 }), a * .42, .0, z, 12).rotation.z = Math.PI / 2; });
    [[-1], [1]].forEach(([a]) => { box(g, .16, .07, .04, M('#fff7d1', { e: '#ffeaa0', ei: .0 }), a * .28, .32, .96, .01); box(g, .14, .07, .04, M('#d22', { r: .4 }), a * .28, .32, -.96, .01); }); blob(g, 1, 2.1, .4);
  };
  P.cat_house = (g, c) => { const w = wood(c); box(g, .8, .5, .8, w, 0, 0, 0, .03); const rf = new T.Mesh(new T.ConeGeometry(.72, .4, 4), M(shade(c, -.3), { r: .7 })); rf.rotation.y = Math.PI / 4; rf.position.y = .7; rf.castShadow = true; g.add(rf); box(g, .26, .3, .04, M('#2a1c12'), 0, .02, .41, .02); blob(g, 1, 1, .3); };
  P.fountain = (g, c) => { const h = grp(g); B.fountain(h, { style: 'tiered', c }); h.scale.setScalar(.8); };
  P.bedside = (g, c) => { const w = wood(c); box(g, .5, .56, .42, w, 0, 0, 0, .025); [.12, .34].forEach(y => { box(g, .44, .2, .02, M(shade(c, .1)), 0, y, .215, .008); rotZ(cyl(g, .011, .011, .12, M('#c9a24a', { m: .8 }), 0, 0, 0, 8)).position.set(0, y + .1, .24); }); cyl(g, .05, .07, .22, M('#c9a24a', { m: .6 }), 0, .56, 0, 12); const sh = new T.MeshStandardMaterial({ color: '#f6e7c1', emissive: '#f6e7c1', emissiveIntensity: 0, roughness: .9, side: T.DoubleSide }); cyl(g, .13, .18, .2, sh, 0, .76, 0, 24); g.userData.emissives = [sh]; RENO.glow(g, 0, .86, 0, .9); blob(g, .6, .5, .3); };
  P.vase = (g, c) => { const m = M(c, { r: .25 }); cyl(g, .06, .12, .1, m, 0, 0, 0, 16); sph(g, .17, m, 0, .3, 0, 1, 1.3, 1, 18); cyl(g, .08, .08, .12, m, 0, .5, 0, 14); for (let i = 0; i < 5; i++) { const s = cyl(g, .008, .008, .5, M('#5a8f4e'), 0, .58, 0, 5); s.rotation.z = (i - 2) * .22; s.rotation.x = (i % 2 - .5) * .3; sph(g, .05, M(['#ff8fa3', '#ffd166', '#ff6b6b', '#fff', '#c3a6ff'][i]), (i - 2) * .12, 1.1, (i % 2 - .5) * .08, 1, 1, 1, 8); } blob(g, .5, .5, .3); };
  P.clock = (g, c) => { const w = wood(c); box(g, .5, .3, .38, w, 0, 0, 0, .03); box(g, .4, 1.1, .3, w, 0, .3, 0, .03); box(g, .5, .2, .38, wood(shade(c, -.2)), 0, 1.4, 0, .04); const f = cyl(g, .16, .16, .02, M('#f6f0e4', { r: .4 }), 0, 1.4, .17, 24); f.rotation.x = Math.PI / 2; f.position.set(0, 1.5, .17); box(g, .015, .1, .01, M('#111'), 0, 1.53, .185, 0); box(g, .08, .012, .01, M('#111'), .03, 1.5, .186, 0); const pd = cyl(g, .07, .07, .02, M('#c9a24a', { m: .8 }), 0, .6, .16, 18); pd.rotation.x = Math.PI / 2; pd.position.set(0, .75, .16); blob(g, .6, .5, .3); };
  P.aquarium = (g, c) => {
    box(g, 1.9, .5, .7, wood('#2b2d42'), 0, 0, 0, .03); box(g, 1.8, .6, .6, M('#7fd3ef', { t: .4, r: .05 }), 0, .5, 0, .02); box(g, 1.84, .04, .64, wood('#2b2d42'), 0, 1.1, 0, .01); box(g, 1.7, .08, .5, M('#e8d9a8', { r: 1 }), 0, .52, 0, .01);
    [[-.5, .2, '#ff8a3d'], [.3, .5, '#ffd34d'], [.7, .3, '#ff5d73']].forEach(([x, y, c2], i) => { sph(g, .08, M(c2, { r: .4 }), x, .5 + y, (i - 1) * .1, 1.5, 1, .6, 10); }); for (let i = 0; i < 5; i++) cyl(g, .01, .01, .35, M('#3f9e5b'), -.7 + i * .35, .55, -.15, 5); box(g, 1.7, .01, .5, M('#fffbe8', { e: '#bde8ff', ei: .35 }), 0, 1.08, 0, 0); blob(g, 2, .8, .3);
  };
  P.piano = (g, c) => {
    const bl = M(c, { r: .2, m: .1 }); box(g, 1.8, .85, .62, bl, 0, .1, -.12, .03); box(g, 1.8, .1, .4, bl, 0, .72, .1, .02); box(g, 1.7, .06, .3, M('#f4f1ea', { r: .3 }), 0, .66, .28, .005);
    for (let i = 0; i < 20; i++) if ([1, 2, 4, 5, 6, 8, 9, 11, 12, 13, 15, 16, 18, 19].includes(i % 7 + 0 === 0 ? 1 : i % 12 + 1) || i % 3 === 1) box(g, .03, .05, .16, M('#111'), -.78 + i * .082, .7, .22, .004);
    [-1, 1].forEach(s => box(g, .08, .1, .08, bl, s * .8, 0, .15, .01)); const st = box(g, .9, .06, .34, wood('#2b1c12'), 0, .28, .6, .02); [-1, 1].forEach(s => box(g, .05, .28, .05, wood('#2b1c12'), s * .4, 0, .6, .01)); blob(g, 2, 1.1, .35);
  };
  P.painting = (g, c) => { const fr = wood('#6b4a2f'); const tex = new T.CanvasTexture(RENO.paintArt('abstract', .8, 1, [c, '#2a9d8f', '#f4a261', '#264653', '#e9c46a'])); tex.colorSpace = T.SRGBColorSpace; [-1, 1].forEach(s => { const l = box(g, .04, 1.3, .04, fr, s * .3, 0, -.15, .01); l.rotation.x = .12; }); box(g, .8, 1.0, .05, fr, 0, .4, -.1, .015).rotation.x = -.08; const im = new T.Mesh(new T.PlaneGeometry(.68, .88), new T.MeshStandardMaterial({ map: tex, roughness: .6 })); im.position.set(0, .9, -.07); im.rotation.x = -.08; im.receiveShadow = true; g.add(im); blob(g, .8, .6, .3); };
  // Stairs: 1 x 2 cells, rises one level (rot 0 climbs toward -z)
  P.stairs = (g, c, H) => { const n = 9, rise = H / n, run = 2 / n, w = wood(c); for (let i = 0; i < n; i++) box(g, .9, rise * (i + 1), run * .98, w, 0, 0, 1 - run * (i + .5) - 0, .01); box(g, .06, .9, 2, wood(shade(c, -.25)), -.47, H - .0, 0, .01).visible = false; [-1, 1].forEach(s => { const r = box(g, .05, .08, 2.1, wood(shade(c, -.2)), s * .46, 0, 0, .01); r.position.y = H / 2 + .55; r.rotation.x = Math.atan2(H, 2); r.position.z = 0; for (let i = 0; i <= 4; i++) box(g, .035, .85, .035, wood(shade(c, -.2)), s * .46, 0, 0, .008).position.set(s * .46, (H * (i / 4)) * .98 + .45 + .0, 1 - 2 * (i / 4) * .98 - .0 + .0 - 0); }); };
  P.sofa_modern = (g, c) => { const h = grp(g); B.sofa(h, { style: 'modern', c, leg: '#c9a24a', pillow: '#f2e6c8', pillow2: '#e07b53', throw: '#e8cf9d', w: 1.9 }); h.scale.set(.98, 1, .92); };
  P.sofa_chester = (g, c) => { const h = grp(g); B.sofa(h, { style: 'chester', c, leg: '#2b1a12', pillow: '#e8c98f', pillow2: '#355c7d', w: 1.9 }); h.scale.set(.98, 1, .92); };
  P.bed_double = (g, c) => { const h = grp(g); B.bed(h, { style: 'upholstered', wood: '#7d8a96', sheet: '#f7f3ea', duvet: c, accent: '#4c6f86', w: 1.75, L: 2.0 }); h.scale.set(1.08, 1, .97); };
  P.table_round = (g, c) => { const t = M(c, { r: .45 }); cyl(g, .78, .78, .06, t, 0, .72, 0, 40); cyl(g, .09, .12, .7, M(shade(c, -.3), { r: .5 }), 0, .02, 0, 14); cyl(g, .4, .44, .04, M(shade(c, -.3), { r: .5 }), 0, 0, 0, 24); cyl(g, .13, .09, .08, M('#f6f0e4', { r: .3 }), 0, .78, 0, 16); sph(g, .06, M('#e53935'), -.04, .9, 0); blob(g, 1.7, 1.7, .3); };
  P.lamp_arc = (g, c) => B.lamp(g, { style: 'arc', metal: c, shade: '#ffd9a0' });
  P.plant_tall = (g, c) => { cyl(g, .22, .17, .38, M('#c9c2b2', { r: .6 }), 0, 0, 0, 18); cyl(g, .2, .2, .03, M('#4a3223'), 0, .38, 0, 14); cyl(g, .04, .05, 1.0, M('#6b4a2f', { r: 1 }), 0, .38, 0, 8); const lf = [M('#3f7f3a', { r: .85 }), M('#56a04c', { r: .85 })]; for (let i = 0; i < 26; i++) { const a = i * 2.4, yy = 1.0 + (i % 6) * .16, rr = .18 + (i % 4) * .08; sph(g, .17, lf[i % 2], Math.cos(a) * rr, yy, Math.sin(a) * rr, 1.2, .55, 1, 8); } blob(g, .7, .7, .3); };
  RENO.hasPart = (id) => !!P[id];
})();
