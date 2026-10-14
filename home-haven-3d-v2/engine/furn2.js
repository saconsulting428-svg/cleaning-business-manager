// Home Haven 3D — renovation engine, part 2b: kitchen & dining builders
(function () {
  const T = THREE, RENO = window.RENO, B = RENO.BUILD;
  const { box, cyl, sph, plane, grp, mat: M, blob, shade, mix, cvs, toTex } = RENO;
  const alongZ = (m) => { m.rotation.x = Math.PI / 2; return m; };
  const alongX = (m) => { m.rotation.z = Math.PI / 2; return m; };
  const steel = () => M('#c9ced3', { m: .85, r: .28 });

  const faucet = (g, x, y, z, c = steel()) => { cyl(g, .018, .018, .22, c, x, y, z, 10); const a = alongZ(cyl(g, .014, .014, .16, c, 0, 0, 0, 10)); a.position.set(x, y + .22, z + .07); cyl(g, .02, .02, .03, c, x, y + .2, z + .14, 8); };

  // ------------------------------------------------------------------ KITCHEN RUN (origin: centre of run on back wall, run is 3.9 long)
  B.cabinets = (g, p) => {
    const L = 3.9, dep = .66, bodyH = .86, top = .05, body = M(p.c, { r: .55 }), door = M(p.c, { r: .5 }), trim = M(shade(p.c, -.2), { r: .6 }), hand = M(p.hand, { m: .85, r: .3 });
    const z0 = 0, wt = M(p.top, { r: .3 });
    box(g, L, .1, dep - .04, M('#2a2420', { r: .8 }), 0, 0, z0, .01); // kick plinth
    // base cabinet doors
    box(g, L, bodyH - .1, dep, body, 0, .1, z0, .015);
    const xs = [-1.95, -1.5, -.6, 0, .6, 1.3, 1.95]; // door boundaries; stove = segment 1 (centre -1.05), sink centred on 0
    for (let i = 0; i < xs.length - 1; i++) {
      const cx = (xs[i] + xs[i + 1]) / 2, w = xs[i + 1] - xs[i] - .02, stove = i === 1;
      if (stove) { // oven front
        box(g, w, bodyH - .14, .04, M('#2a2d31', { r: .35, m: .5 }), cx, .1, dep / 2 + .0, .015); box(g, w * .68, .3, .02, M('#1a1c1f', { r: .1 }), cx, .3, dep / 2 + .03, .01);
        alongX(cyl(g, .012, .012, w * .7, steel(), cx, 0, 0, 8)).position.set(cx, .64, dep / 2 + .07); [-1, 0, 1].forEach(k => cyl(g, .025, .025, .03, steel(), cx + k * .18, .73, dep / 2 + .02, 12).rotation.x = Math.PI / 2);
        continue;
      }
      const dm = box(g, w, bodyH - .14, .035, door, cx, .1, dep / 2, .012);
      if (p.style === 'shaker') { box(g, w - .14, bodyH - .28, .012, trim, cx, .17, dep / 2 + .02, .004); }
      if (p.style === 'wood') { for (let k = 0; k < 4; k++) box(g, .004, bodyH - .14, .004, trim, cx - w / 2 + (k + 1) * w / 5, .1, dep / 2 + .02, .001); }
      if (p.hand !== 'none') alongZ(cyl(g, .011, .011, .02, hand, 0, 0, 0, 8)).position.set(cx + (w > .6 ? (i % 2 ? -1 : 1) * w * .35 : w * .35), .72 - (p.knob ? 0 : 0), dep / 2 + .04);
      if (p.hand !== 'none' && !p.knob) { const bar = cyl(g, .01, .01, .2, hand, 0, 0, 0, 8); bar.position.set(cx + (i % 2 ? -1 : 1) * w * .3, .66, dep / 2 + .055); }
    }
    // worktop with sink & hob
    box(g, L + .04, top, dep + .05, wt, 0, bodyH, z0 + .01, .01);
    box(g, .75, .02, .42, M('#aeb4ba', { m: .9, r: .2 }), 0, bodyH + top, .02, .008); box(g, .62, .004, .3, M('#6b7075', { m: .8, r: .3 }), 0, bodyH + top + .02, .02, .002);
    faucet(g, 0, bodyH + top, -.2);
    const hob = box(g, .72, .012, .5, M('#17191c', { r: .08, m: .4 }), -1.05, bodyH + top, .0, .004);
    [[-.18, -.12], [.18, -.12], [-.18, .12], [.18, .12]].forEach(([a, b]) => { cyl(g, .085, .085, .008, M('#3a3d42', { r: .3, m: .6 }), -1.05 + a, bodyH + top + .012, b, 20); cyl(g, .03, .03, .012, M('#111'), -1.05 + a, bodyH + top + .012, b, 12); });
    // splash backsplash edge
    box(g, L + .04, .1, .02, wt, 0, bodyH + top, -dep / 2 - .0, .005);
    // utensils & decor on counter
    cyl(g, .06, .05, .2, M('#c4b69c', { r: .8 }), 1.35, bodyH + top, -.15, 16); [0, 1, 2].forEach(i => { const s = cyl(g, .008, .008, .28, M(['#8b5a2b', '#c97b4a', '#6b6b6b'][i]), 1.35 + (i - 1) * .02, bodyH + top + .14, -.15, 6); s.rotation.z = (i - 1) * .2; });
    box(g, .5, .04, .32, M('#b98756', { r: .6 }), 1.05, bodyH + top, .0, .015); sph(g, .06, M('#d94a3a'), .95, bodyH + top + .09, .0); sph(g, .06, M('#9ccc65'), 1.1, bodyH + top + .09, .04);
    box(g, .3, .22, .22, M(shade(p.c, .1), { r: .4 }), -.35, bodyH + top, -.15, .04); // toaster / canister
    // upper cabinets (right of window)
    const ux = 1.0, uw = .95;
    box(g, uw, .78, .36, body, ux, 1.52, -dep / 2 + .02, .015);
    [-1, 1].forEach(k => { box(g, uw / 2 - .02, .74, .03, door, ux + k * uw / 4, 1.54, -dep / 2 + .21, .01); if (p.hand !== 'none') box(g, .015, .12, .02, hand, ux + k * .05, 1.7 - .0, -dep / 2 + .24, .005); });
    // open shelf left of the hob under the hood zone
    blob(g, L, dep + .1, .35);
  };

  B.hood = (g, p) => {
    const st = p.style, c = M(p.c, { m: st === 'copper' ? .8 : .65, r: st === 'copper' ? .3 : .35 });
    if (st === 'chimney') { box(g, .9, .12, .52, c, 0, 1.55, 0, .02); box(g, .34, .85, .3, c, 0, 1.67, -.12, .015); box(g, .85, .02, .48, M('#111'), 0, 1.55, 0, .004); }
    else if (st === 'copper') { const k = cyl(g, .14, .5, .55, c, 0, 1.55, -.05, 4); k.rotation.y = Math.PI / 4; box(g, .2, .6, .2, c, 0, 2.1, -.13, .01); box(g, .06, .02, .06, M('#222'), 0, 1.58, 0, 0); }
    else { const b = box(g, .88, .16, .5, c, 0, 1.55, 0, .03); const slope = box(g, .88, .5, .08, c, 0, 1.7, -.17, .02); slope.rotation.x = .35; box(g, .8, .02, .44, M('#fffbe8', { e: '#ffe9a8', ei: .3 }), 0, 1.545, 0, .004); }
    box(g, .12, .02, .06, M('#ffd98a', { e: '#ffcf70', ei: .5 }), 0, 1.545, .1, .004);
  };

  // ------------------------------------------------------------------ FRIDGE
  B.fridge = (g, p) => {
    const st = p.style, w = p.w || .8, d = .72, h = p.h || 1.85, body = M(p.c, { r: st === 'steel' ? .25 : .25, m: st === 'steel' ? .6 : 0 }), hand = M(p.hand || '#bbb', { m: .8, r: .3 }), r = st === 'retro' ? .14 : .04;
    box(g, w, h, d, body, 0, .0, 0, r);
    const frz = st === 'retro' ? h * .32 : st === 'steel' ? h * .35 : h * .3;
    box(g, w - .02, .012, .02, M(shade(p.c, -.3)), 0, h - frz, d / 2 - .01, .003);
    if (st === 'steel') { box(g, .008, h - frz - .1, .01, M(shade(p.c, -.3)), 0, 0.05, d / 2 + .0, .002); box(g, .03, .5, .04, hand, -.06, h - frz - .6, d / 2 + .04, .01); box(g, .03, .5, .04, hand, .06, h - frz - .6, d / 2 + .04, .01); box(g, .03, .26, .04, hand, 0, h - frz + .05, d / 2 + .04, .01); }
    else { box(g, .035, .55, .045, hand, w / 2 - .1, h - frz - .62, d / 2 + .04, .012); box(g, .035, .3, .045, hand, w / 2 - .1, h - frz + .1, d / 2 + .04, .012); }
    if (st === 'retro') { box(g, .22, .07, .02, M('#c33', { m: .4 }), -.14, h - .22, d / 2 + .004, .01); box(g, .08, .02, .01, M('#fff'), -.14, h - .22, d / 2 + .02, 0); }
    if (st !== 'steel') { [['#ff6b6b', -.18, 1.3], ['#4ecdc4', .08, 1.42], ['#ffe66d', -.05, 1.18]].forEach(([c, x, y]) => box(g, .07, .07, .005, M(c), x, y, d / 2 + .005, .01)); }
    blob(g, w + .1, d + .1, .4);
  };

  // ------------------------------------------------------------------ DINING SET (origin: table centre)
  const chair = (g, p, x, z, ry) => {
    const c = grp(g, x, 0, z, ry), seat = M(p.seat, { r: p.fabric ? .95 : .5 }), leg = M(p.leg, { r: .5, m: p.metal ? .7 : 0 });
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => box(c, .04, .45, .04, leg, a * .19, 0, b * .19, .012));
    box(c, .46, .07, .46, seat, 0, .45, 0, .03);
    box(c, .44, .38, .045, seat, 0, .54, -.21, .02).rotation.x = -.08;
    if (p.slats) [-1, 0, 1].forEach(i => box(c, .06, .26, .02, leg, i * .13, .56, -.215, .008));
    return c;
  };
  B.dining = (g, p) => {
    const st = p.style, wood = M(p.c, { r: .45 }), leg = M(p.leg, { r: .4, m: p.metal ? .7 : 0 });
    if (st === 'round') { cyl(g, .62, .62, .05, wood, 0, .72, 0, 40); cyl(g, .07, .09, .7, leg, 0, .02, 0, 14); cyl(g, .3, .34, .04, leg, 0, 0, 0, 24);
      [0, 1, 2, 3].forEach(i => { const a = i * Math.PI / 2 + .3; chair(g, p, Math.cos(a) * .85, Math.sin(a) * .85, -a + Math.PI / 2 + Math.PI); }); }
    else if (st === 'rect') { box(g, 1.5, .05, .9, wood, 0, .72, 0, .02); [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => box(g, .07, .72, .07, leg, a * .66, 0, b * .36, .02));
      [-.4, .4].forEach(x => { chair(g, p, x, .7, Math.PI); chair(g, p, x, -.7, 0); }); }
    else { box(g, 1.6, .045, .8, wood, 0, .73, 0, .015); [-1, 1].forEach(a => { box(g, .05, .72, .75, leg, a * .65, 0, 0, .012); }); box(g, 1.3, .04, .04, leg, 0, .2, 0, .01);
      [-.45, .45].forEach(x => { chair(g, p, x, .62, Math.PI); }); box(g, 1.4, .07, .34, M(p.seat, { r: .9 }), 0, .45, -.62, .03); [-1, 1].forEach(a => box(g, .05, .45, .3, leg, a * .62, 0, -.62, .01)); }
    // table setting: bowl of fruit
    cyl(g, .14, .09, .07, M('#f6f0e4', { r: .3 }), 0, .745, 0, 20); [[0, 0], [.06, .03], [-.05, -.04]].forEach(([a, b], i) => sph(g, .05, M(['#e53935', '#fdd835', '#7cb342'][i]), a, .82, b));
    blob(g, 2.2, 2.2, .3);
  };

  // ------------------------------------------------------------------ PENDANTS (origin: centre on ceiling height, spans x ±1)
  B.pendant = (g, p) => {
    const top = 3.0; box(g, 2.6, .12, .12, M('#6b4a2f', { r: .6 }), 0, top - .12, 0, .02);
    const lights = [-.9, 0, .9], em = [];
    lights.forEach((x, i) => {
      const len = .55 + (p.stagger ? (i % 2) * .2 : 0), y = top - .12 - len;
      cyl(g, .008, .008, len, M('#222'), x, y, 0, 6);
      let shadeM;
      if (p.style === 'dome') { shadeM = new T.MeshStandardMaterial({ color: p.c, roughness: .35, metalness: .1, side: T.DoubleSide }); const s = new T.Mesh(new T.SphereGeometry(.25, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), shadeM); s.position.set(x, y, 0); s.castShadow = true; g.add(s); sph(g, .08, M('#fff6dc', { e: '#ffe7a8', ei: .6 }), x, y - .02, 0); }
      else if (p.style === 'globe') { shadeM = new T.MeshStandardMaterial({ color: '#fff6dc', emissive: '#ffe7a8', emissiveIntensity: .45, transparent: true, opacity: .88, roughness: .1 }); sph(g, .17, shadeM, x, y - .15, 0); cyl(g, .035, .035, .06, M('#222', { m: .8 }), x, y - .02, 0, 10); }
      else { shadeM = new T.MeshStandardMaterial({ color: p.c, roughness: .95, side: T.DoubleSide }); cyl(g, .2, .27, .3, shadeM, x, y - .3, 0, 20); sph(g, .07, M('#fff6dc', { e: '#ffe7a8', ei: .6 }), x, y - .22, 0); }
      RENO.glow(g, x, y - .22, 0, 1.0);
    });
  };
})();
