// Home Haven 3D — renovation engine, part 4: house shell, scene, camera, picking, effects
(function () {
  const T = THREE, RENO = window.RENO, D = RENO.DATA, B = RENO.BUILD;
  const { ROOMS, SLOTS, BY_ID } = D, RW = D.W, RD = D.D, RH = D.H, FY = D.FY;
  const { box, cyl, sph, plane, grp, mat: M, shade, mix, cvs, toTex } = RENO;
  const GY = -.42; // ground level (house floor is raised 0.42 above the lawn)
  const WT = .3;   // wall thickness
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  let renderer, scene, camera, root, hemi, sun, fill, el, W = 400, Hh = 700, active = false, raf = 0, last = 0;
  const rooms = {}, slots = {}, anims = [], parts = [];
  const choices = {}, previews = {};
  let night = false, nightK = 0, upperLift = 0, shadowDirty = 2, lastInteract = 0;
  const cb = RENO.cb = { tap() { }, frame() { }, ready() { } };
  const cam = { tx: 0, ty: 3, tz: 0, dist: 30, yaw: 0, pitch: .3, shift: 0 }, goal = Object.assign({}, cam);
  let focusRoom = null, userZoom = 1, boundsX = 5.4;
  const FOV = 34;

  // ============================================================ world
  function buildWorld() {
    scene.fog = new T.Fog(0xcfe9ff, 55, 150);
    // lawn (tiling)
    const gt = toTex(cvs(512, 512, (x, w, h) => { x.fillStyle = '#78b95c'; x.fillRect(0, 0, w, h); const R = RENO.rng(4); for (let i = 0; i < 40; i++) { x.fillStyle = `rgba(${R() > .5 ? '255,255,200' : '20,70,20'},.07)`; x.beginPath(); x.arc(R() * w, R() * h, 20 + R() * 50, 0, 7); x.fill(); } for (let i = 0; i < 3000; i++) { x.strokeStyle = R() > .5 ? '#6aac4f' : '#8bc96d'; x.lineWidth = 1.3; const px = R() * w, py = R() * h; x.beginPath(); x.moveTo(px, py); x.lineTo(px + (R() - .5) * 5, py - 3 - R() * 5); x.stroke(); } }), true);
    gt.repeat.set(26, 26); gt.anisotropy = 8;
    const ground = new T.Mesh(new T.PlaneGeometry(260, 260), new T.MeshStandardMaterial({ map: gt, roughness: 1 })); ground.rotation.x = -Math.PI / 2; ground.position.y = GY - .02; ground.receiveShadow = true; root.add(ground);
    // sidewalk + road in front of the garden
    const walk = new T.Mesh(new T.PlaneGeometry(260, 2.2), M('#cfc8bb', { r: 1 })); walk.rotation.x = -Math.PI / 2; walk.position.set(0, GY - .005, 11.2); walk.receiveShadow = true; root.add(walk);
    const road = new T.Mesh(new T.PlaneGeometry(260, 6), M('#5c6068', { r: 1 })); road.rotation.x = -Math.PI / 2; road.position.set(0, GY - .01, 15.4); road.receiveShadow = true; root.add(road);
    for (let i = -12; i < 12; i++) { const d = new T.Mesh(new T.PlaneGeometry(1.4, .16), M('#f1ead2', { r: 1 })); d.rotation.x = -Math.PI / 2; d.position.set(i * 2.8, GY, 15.4); root.add(d); }
    const curb = box(root, 260, .12, .18, M('#b5afa3'), 0, GY, 10.0, .02);
    // distant hills + trees backdrop (flat cards, cheap)
    const hill = (z, y, c, seed, hgt, s = 1) => {
      const t = toTex(cvs(1024, 256, (x, w, h) => { const R = RENO.rng(seed); x.fillStyle = c; x.beginPath(); x.moveTo(0, h); for (let i = 0; i <= 16; i++) x.lineTo(w * i / 16, h * (.35 + R() * .3)); x.lineTo(w, h); x.fill(); const tc = shade(c, -.18); for (let i = 0; i < 26; i++) { const px = R() * w, py = h * (.42 + R() * .25); x.fillStyle = tc; x.beginPath(); x.arc(px, py, 14 + R() * 18, 0, 7); x.fill(); x.fillRect(px - 2, py, 4, 20); } }));
      const m = new T.Mesh(new T.PlaneGeometry(180 * s, hgt * s), new T.MeshBasicMaterial({ map: t, transparent: true, fog: true })); m.position.set(0, y, z); root.add(m); return m;
    };
    hill(-48, 9, '#9ccd8a', 11, 20); hill(-36, 6.5, '#7fbb74', 5, 14); hill(-30, 4.2, '#5fa65a', 9, 9);
    // neighbour trees at the sides
    const R = RENO.rng(21);
    for (let i = 0; i < 14; i++) { const x = (i < 7 ? -1 : 1) * (10 + R() * 14), z = -6 + R() * 16, tr = new T.Group(); tr.position.set(x, GY, z); const h = 2 + R() * 1.4; cyl(tr, .18, .26, h, M('#7a5233', { r: 1 }), 0, 0, 0, 8); sph(tr, 1.2 + R() * .5, M(shade('#5aa34a', (R() - .5) * .3), { r: .95 }), 0, h + .6, 0, 1, .95, 1, 12); root.add(tr); }
  }

  // ============================================================ house shell
  function wallBody(parent, shape, x, y, z, depth, m) {
    const g = new T.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 4 }); const mesh = new T.Mesh(g, m); mesh.position.set(x, y, z); mesh.castShadow = mesh.receiveShadow = true; parent.add(mesh); return mesh;
  }
  const rectShape = (x0, y0, x1, y1) => { const s = new T.Shape(); s.moveTo(x0, y0); s.lineTo(x1, y0); s.lineTo(x1, y1); s.lineTo(x0, y1); s.lineTo(x0, y0); return s; };
  const holePath = (x0, y0, x1, y1) => { const p = new T.Path(); p.moveTo(x0, y0); p.lineTo(x0, y1); p.lineTo(x1, y1); p.lineTo(x1, y0); p.lineTo(x0, y0); return p; };

  function buildRoom(id) {
    const R = ROOMS[id], g = grp(root, R.cx, FY[R.floor], 0), room = rooms[id] = { id, def: R, g, skins: [], wains: grp(g), junk: grp(g) };
    const plaster = M('#f4ead8', { r: .9 }), trimM = M('#fdfbf5', { r: .5 });
    // ---- floor surface
    const fm = new T.MeshStandardMaterial({ roughness: .75 }); const floor = new T.Mesh(new T.PlaneGeometry(RW, RD), fm); floor.rotation.x = -Math.PI / 2; floor.position.set(0, .003, 0); floor.receiveShadow = true; g.add(floor);
    room.floor = floor; floor.userData.slotId = id.slice(0, 3) === 'liv' ? 'liv_floor' : null;
    // ---- wall skins: back (with window), left, right
    const win = R.win, door = R.door, doorZ = [-1.2, -.2];
    // back wall body + skin
    const wx0 = -RW / 2, wx1 = RW / 2;
    const bShape = rectShape(-RW / 2 - WT, 0, RW / 2 + WT, RH); bShape.holes.push(holePath(win.x - win.w / 2, win.y, win.x + win.w / 2, win.y + win.h));
    const bb = wallBody(g, bShape, 0, 0, -RD / 2 - WT, WT, plaster);
    const sShape = rectShape(0, 0, RW, RH); sShape.holes.push(holePath(win.x + RW / 2 - win.w / 2, win.y, win.x + RW / 2 + win.w / 2, win.y + win.h));
    const mkSkin = (shape, w, name) => { const m = new T.Mesh(new T.ShapeGeometry(shape), new T.MeshStandardMaterial({ roughness: .9, side: T.FrontSide })); m.receiveShadow = true; m.userData.w = w; m.userData.name = name; room.skins.push(m); g.add(m); return m; };
    const back = mkSkin(sShape, RW, 'back'); back.position.set(-RW / 2, 0, -RD / 2 + .004);
    // side walls (outer wall + divider)
    const leftOuter = R.door === 'right'; // left room: outer wall on the left, divider on the right
    const sideShape = (doorSide) => { const s = new T.Shape(); if (doorSide) { const u0 = doorSide[0], u1 = doorSide[1]; s.moveTo(0, 0); s.lineTo(u0, 0); s.lineTo(u0, 2.1); s.lineTo(u1, 2.1); s.lineTo(u1, 0); s.lineTo(RD, 0); s.lineTo(RD, RH); s.lineTo(0, RH); s.lineTo(0, 0); } else return rectShape(0, 0, RD, RH); return s; };
    // left skin (faces +x): u = D/2 - z ; right skin (faces -x): u = z + D/2
    const leftDoor = !leftOuter ? [RD / 2 - doorZ[1], RD / 2 - doorZ[0]] : null, rightDoor = leftOuter ? [doorZ[0] + RD / 2, doorZ[1] + RD / 2] : null;
    const L = mkSkin(sideShape(leftDoor), RD, 'left'); L.rotation.y = Math.PI / 2; L.position.set(-RW / 2 + .004, 0, RD / 2);
    const Rr = mkSkin(sideShape(rightDoor), RD, 'right'); Rr.rotation.y = -Math.PI / 2; Rr.position.set(RW / 2 - .004, 0, -RD / 2);
    // bodies: outer wall and divider (divider with doorway)
    const outerX = leftOuter ? -RW / 2 - WT : RW / 2, divX = leftOuter ? RW / 2 : -RW / 2 - WT;
    const outer = box(g, WT, RH, RD + WT, plaster, outerX + WT / 2, 0, -WT / 2, 0);
    // divider split around the doorway
    const dx = divX + WT / 2;
    box(g, WT, RH, doorZ[0] - -RD / 2 + WT * 0, plaster, dx, 0, (-RD / 2 + doorZ[0]) / 2 - .0, 0);
    box(g, WT, RH, RD / 2 - doorZ[1], plaster, dx, 0, (doorZ[1] + RD / 2) / 2, 0);
    box(g, WT, RH - 2.1, doorZ[1] - doorZ[0], plaster, dx, 2.1, (doorZ[0] + doorZ[1]) / 2, 0);
    // door frame (both faces)
    [-1, 1].forEach(s => { const fx = divX + WT / 2 + s * (WT / 2 + .012); box(g, .03, 2.12, .07, trimM, fx, 0, doorZ[0] - .02, .005); box(g, .03, 2.12, .07, trimM, fx, 0, doorZ[1] + .02, .005); box(g, .03, .07, doorZ[1] - doorZ[0] + .14, trimM, fx, 2.1, (doorZ[0] + doorZ[1]) / 2, .005); });
    // coping on top of everything (white cap)
    box(g, RW + WT * 2 + .1, .08, WT + .12, trimM, 0, RH, -RD / 2 - WT / 2, .02);
    box(g, WT + .08, .08, RD + .02, trimM, outerX + WT / 2, RH, 0, .02);
    box(g, WT + .08, .08, RD + .02, trimM, dx, RH, 0, .02);
    // ---- window: frame, glass, sill, mullions
    const wz = -RD / 2 - WT / 2, fr = M('#fffdf7', { r: .4 });
    const glass = new T.Mesh(new T.PlaneGeometry(win.w, win.h), new T.MeshStandardMaterial({ color: '#cfe8f6', transparent: true, opacity: .16, roughness: .05, metalness: 0, depthWrite: false })); glass.position.set(win.x, win.y + win.h / 2, wz); g.add(glass); room.glass = glass;
    const fw = .06;
    box(g, win.w + fw * 2, fw, WT + .06, fr, win.x, win.y - fw, wz, .01); box(g, win.w + fw * 2, fw, WT + .06, fr, win.x, win.y + win.h, wz, .01);
    box(g, fw, win.h, WT + .06, fr, win.x - win.w / 2 - fw / 2, win.y, wz, .01); box(g, fw, win.h, WT + .06, fr, win.x + win.w / 2 + fw / 2, win.y, wz, .01);
    box(g, .035, win.h, .05, fr, win.x, win.y, wz, .005); box(g, win.w, .035, .05, fr, win.x, win.y + win.h / 2 - .017, wz, .005);
    box(g, win.w + .3, .05, .26, fr, win.x, win.y - fw - .05, -RD / 2 + .08, .015); // inner sill
    // ---- baseboard + crown (interior)
    const bsb = M('#fffdf7', { r: .5 });
    box(g, RW, .13, .035, bsb, 0, 0, -RD / 2 + .02, .008); box(g, .035, .13, RD, bsb, -RW / 2 + .02, 0, 0, .008); box(g, .035, .13, RD, bsb, RW / 2 - .02, 0, 0, .008);
    box(g, RW, .07, .06, bsb, 0, RH - .07, -RD / 2 + .035, .01); box(g, .06, .07, RD, bsb, -RW / 2 + .035, RH - .07, 0, .01); box(g, .06, .07, RD, bsb, RW / 2 - .035, RH - .07, 0, .01);
    // ---- room point light (night)
    const pl = new T.PointLight(0xffcf8a, 0, 14, 1.6); pl.position.set(0, RH - .5, .4); g.add(pl); room.light = pl;
    // ---- hit volume for taps
    const vol = new T.Mesh(new T.BoxGeometry(RW, RH, RD), new T.MeshBasicMaterial({ visible: false })); vol.position.set(0, RH / 2, 0); vol.userData.roomId = id; g.add(vol); room.vol = vol;
    return room;
  }

  function buildShell() {
    const stone = M('#a79d8d', { r: .95 }), conc = M('#d9cdb9', { r: .9 }), trimM = M('#fdfbf5', { r: .5 });
    // foundation + ground slab
    box(root, 11.3, .62, 5.5, stone, 0, GY - .2, .05, .03);
    box(root, 11.2, .4, 5.3, M('#cfc4b0', { r: .85 }), 0, -.4, 0, .02);
    // front steps
    box(root, 2.4, .2, .7, stone, 0, GY, 2.9, .04); box(root, 2.0, .2, .5, stone, 0, GY + .2, 2.78, .04);
    // everything on the upper level hangs off one group, so it can lift away when the ground floor is in focus
    const up = RENO.upper = grp(root);
    const slabU = box(up, 11.2, .3, 5.3, conc, 0, RH, 0, .02); slabU.castShadow = false; // floor between levels = ground-floor ceiling
    box(up, 11.4, .06, 5.45, trimM, 0, FY[1] - .06, 0, .02);
    ['living', 'kitchen', 'bedroom', 'bath'].forEach(id => { const r = buildRoom(id); if (ROOMS[id].floor === 1) up.add(r.g); });
    // roof details on top of the upper floor: chimney + water tank
    const chim = grp(up, 4.2, FY[1] + RH + .08, -RD / 2 - .15); box(chim, .6, 1.0, .5, M('#b45f3c', { r: .95 }), 0, 0, 0, .02); box(chim, .75, .12, .65, M('#8c7b6a'), 0, 1.1, 0, .02);
    const tank = grp(up, -4.2, FY[1] + RH + .08, -RD / 2 - .15); cyl(tank, .45, .45, .8, M('#4b6d8a', { r: .5, m: .3 }), 0, .15, 0, 20); [-1, 1].forEach(a => [-1, 1].forEach(b => box(tank, .06, .15, .06, M('#555'), a * .3, 0, b * .3, .01)));
  }

  // ============================================================ slots
  function buildSlots() {
    SLOTS.forEach(s => {
      const parent = s.room === 'garden' ? (RENO.garden || (RENO.garden = grp(root, 0, GY, 0))) : rooms[s.room].g;
      const sg = s.surface ? null : grp(parent, s.pos[0], s.pos[1], s.pos[2], s.rot || 0);
      slots[s.id] = { def: s, g: sg, cur: undefined, vi: null, parent };
      if (sg) sg.userData.slotId = s.id;
    });
    // tag surfaces
    Object.values(rooms).forEach(r => { const fs = SLOTS.find(s => s.room === r.id && s.type === 'floor'), ws = SLOTS.find(s => s.room === r.id && s.type === 'wall'); r.floorSlot = fs.id; r.wallSlot = ws.id; r.floor.userData.slotId = fs.id; r.skins.forEach(m => m.userData.slotId = ws.id); });
    // garden lawn patch + old yard
    const yard = new T.Mesh(new T.PlaneGeometry(26, 7.2), new T.MeshStandardMaterial({ roughness: 1 })); yard.rotation.x = -Math.PI / 2; yard.position.set(0, GY + .004, 6.6 + .0); yard.receiveShadow = true; yard.userData.slotId = 'gar_lawn'; root.add(yard); RENO.yard = yard;
    // garden root hit volume
    const gv = new T.Mesh(new T.BoxGeometry(24, 2, 7), new T.MeshBasicMaterial({ visible: false })); gv.position.set(0, GY + 1, 6.4); gv.userData.roomId = 'garden'; root.add(gv); rooms.garden = { id: 'garden', def: ROOMS.garden, g: RENO.garden, vol: gv };
  }

  // ---- surface materials (cached per slot/variant)
  const surfCache = {};
  function surfaceTex(s, vi) {
    const k = s.id + ':' + vi, v = vi < 0 ? null : s.variants[vi].p;
    if (surfCache[k]) return surfCache[k];
    let tex;
    if (s.surface === 'floor') tex = RENO.makeSurface(vi < 0 ? 'old' : v.kind, v || {}, RW, RD, s.id.length + vi + 3);
    else if (s.surface === 'lawn') { tex = RENO.makeSurface(vi < 0 ? 'oldlawn' : v.kind, v || {}, 26, 7.2, 5 + vi); }
    return surfCache[k] = tex;
  }
  RENO.makeSurfaceOldLawn = null;
  function applyFloor(s, vi) {
    const room = rooms[s.room], tex = surfaceTex(s, vi); room.floor.material.map = tex; room.floor.material.needsUpdate = true; room.floor.material.roughness = vi >= 0 && /tiles/.test(s.variants[vi].p.kind) ? .35 : .75;
  }
  function applyWall(s, vi) {
    const room = rooms[s.room], v = vi < 0 ? null : s.variants[vi].p;
    room.skins.forEach(m => {
      const w = m.userData.w, k = s.id + ':' + vi + ':' + m.userData.name; let tex = surfCache[k];
      if (!tex) { tex = RENO.makeSurface(vi < 0 ? 'old' : v.kind, v || {}, w, RH, 31 + vi + m.userData.name.length); tex.repeat.set(1 / w, 1 / RH); surfCache[k] = tex; }
      m.material.map = tex; m.material.needsUpdate = true;
    });
    room.wains.clear(); while (room.wains.children.length) room.wains.remove(room.wains.children[0]);
    if (v && v.wain) {
      const wn = v.wain, c = M(wn.c, { r: .5 }), rail = M(wn.rail || wn.c, { r: .5 }), h = wn.h, win = room.def.win;
      const strip = (axis, a, b, off, rot) => { const len = b - a; if (len <= .01) return; const pn = box(room.wains, len, h, .035, c, (a + b) / 2, 0, 0, .006), rl = box(room.wains, len, .05, .06, rail, (a + b) / 2, h, 0, .01);
        [pn, rl].forEach(m => { m.position.add(new T.Vector3(0, 0, 0)); }); const holder = grp(room.wains); holder.add(pn); holder.add(rl); holder.rotation.y = rot; holder.position.set(off[0], 0, off[1]); };
      strip('back', -RW / 2 + .03, RW / 2 - .03, [0, -RD / 2 + .035], 0);
      // side panels (left/right) – keep clear of the doorway
      const dz = [-1.2, -.2];
      const side = (x, rot, door) => { const segs = door ? [[-RD / 2 + .03, dz[0] - .08], [dz[1] + .08, RD / 2 - .03]] : [[-RD / 2 + .03, RD / 2 - .03]]; segs.forEach(([a, b]) => { const len = b - a; const hd = grp(room.wains); box(hd, len, h, .035, c, 0, 0, 0, .006); box(hd, len, .05, .06, rail, 0, h, 0, .01); hd.rotation.y = rot; hd.position.set(x, 0, (a + b) / 2); }); };
      side(-RW / 2 + .035, Math.PI / 2, room.def.door === 'left'); side(RW / 2 - .035, Math.PI / 2, room.def.door === 'right');
    }
  }
  function applyLawn(s, vi) {
    const yard = RENO.yard; let tex;
    if (vi < 0) { tex = surfCache['oldlawn']; if (!tex) tex = surfCache['oldlawn'] = toTex(cvs(26 * 40, 7.2 * 40, (x, w, h) => { const R = RENO.rng(9); x.fillStyle = '#8a8f55'; x.fillRect(0, 0, w, h); for (let i = 0; i < 60; i++) { x.fillStyle = `rgba(${R() > .5 ? '120,90,55' : '150,150,80'},.45)`; x.beginPath(); x.ellipse(R() * w, R() * h, 20 + R() * 60, 10 + R() * 30, R() * 3, 0, 7); x.fill(); } for (let i = 0; i < 2500; i++) { x.strokeStyle = R() > .5 ? '#a49a58' : '#7c7a45'; x.lineWidth = 1; const px = R() * w, py = R() * h; x.beginPath(); x.moveTo(px, py); x.lineTo(px + (R() - .5) * 6, py - 4 - R() * 6); x.stroke(); } })); }
    else tex = surfaceTex(s, vi);
    yard.material.map = tex; yard.material.needsUpdate = true;
  }

  // ---- old (unrenovated) states
  const sheetMat = () => M('#e6e1d3', { r: 1 });
  function dustSheets(g, s) {
    const boxes = s.sheets || [[0, s.size[0], s.size[1], s.size[2], 0]]; // [x, w, h, d, z]
    boxes.forEach(([x, w, h, d, z], i) => {
      const hh = h * .88, r = Math.min(.18, w / 4, d / 4);
      const m = box(g, w * .96, hh * .8, d * .96, sheetMat(), x, 0, z || 0, r); box(g, w * .8, hh * .3, d * .8, sheetMat(), x, hh * .7, z || 0, r * .8);
      [[-1, .22], [1, -.2]].forEach(([sg, rr]) => { const f = box(g, w * .16, hh * .65, d * 1.0, M('#dcd6c6', { r: 1 }), x + sg * w * .38, 0, z || 0, .06); f.rotation.z = rr * sg; });
    });
  }
  const OLD = {
    rug() { }, curtains(g, s) { const win = ROOMS[s.room].win; const rod = RENO.cyl(g, .015, .015, win.w + .6, M('#5a4a3a', { m: .5 }), 0, 0, .12, 8); rod.rotation.z = Math.PI / 2; rod.position.set(0, win.y + win.h + .2, .12); const rag = box(g, .25, .5, .01, M('#8a8374', { r: 1 }), win.w / 2 + .05, win.y + win.h - .25, .1, .004); rag.rotation.z = .05; },
    painting(g, s) { box(g, s.size[0] * .8, s.size[1] * .8, .006, M('#d9d1bd', { r: 1 }), 0, -s.size[1] * .4 - .1, .004, .002); sph(g, .018, M('#777', { m: .8 }), 0, .02, .01); },
    mirror(g, s) { box(g, .8, .9, .006, M('#d6cdb6', { r: 1 }), 0, -.45, .004, .002); sph(g, .018, M('#777', { m: .8 }), 0, .02, .01); },
    pendant(g) { cyl(g, .008, .008, .45, M('#222'), 0, 2.45, 0, 6); sph(g, .05, M('#f3ead0', { e: '#ffe9a8', ei: .08 }), 0, 2.4, 0); },
    hood() { }, lawn() { }, path() { },
    fence(g) { const wood = M('#8b6b4a', { r: 1 }); [-5.5, -3.2, -.8, 3.6].forEach((x, i) => { const p = box(g, .14, .9 - i * .15, .14, wood, x, 0, 0, .01); p.rotation.z = (i - 1.5) * .08; }); box(g, 1.4, .06, .03, wood, -4.3, .45, 0).rotation.z = .12; box(g, 1.2, .06, .03, wood, 4.5, .3, 0).rotation.z = -.2; },
    tree(g) { cyl(g, .3, .36, .45, M('#7a5a3a', { r: 1 }), 0, 0, 0, 12); cyl(g, .2, .2, .02, M('#c9a77a'), 0, .45, 0, 12); sph(g, .45, M('#6e7a43', { r: 1 }), .9, .3, .3, 1, .6, 1, 8); },
    flowerbeds(g) { const R = RENO.rng(4); [-3.35, 3.35].forEach(x => { box(g, 3.2, .3, .8, M('#6b5a47', { r: 1 }), x, 0, 0, .03); for (let i = 0; i < 14; i++) sph(g, .16 + R() * .12, M(R() > .5 ? '#7a8a45' : '#a09a55', { r: 1 }), x + (R() - .5) * 2.8, .38, (R() - .5) * .5, 1, .7, 1, 6); }); },
    fountain(g) { cyl(g, 1.15, 1.2, .5, M('#9c9486', { r: 1 }), 0, 0, 0, 24); cyl(g, 1.0, 1.0, .03, M('#5a4a3a', { r: 1 }), 0, .47, 0, 24); box(g, .3, .8, .3, M('#a29a8c', { r: 1 }), .1, .4, 0, .05).rotation.z = .3; },
  };
  RENO.OLD = OLD;
  function buildOld(s, g) { if (OLD[s.type]) return OLD[s.type](g, s); dustSheets(g, s); }
  const SHEETS = { nightstands: null };
  BY_ID.bed_stands.sheets = [[-1.28, .55, .62, .45, 0], [1.28, .55, .62, .45, 0]];
  BY_ID.kit_dining.sheets = [[0, 1.5, .9, .9, 0], [-1.0, .5, .8, .5, 0], [1.0, .5, .8, .5, 0]];
  BY_ID.kit_pendant.size = [2.6, .8, .3];

  // junk props (removed when the floor is renovated)
  function addJunk(room) {
    const j = room.junk, R = RENO.rng(room.id.length * 17 + 3), wood = M('#9b7a52', { r: 1 }), card = M('#b99a6c', { r: 1 });
    const spots = [[-1.9, 1.5], [2.0, .9], [1.5, 1.7], [-.6, 1.6]];
    spots.forEach(([x, z], i) => {
      if (i % 2 === 0) { box(j, .5, .4, .45, card, x, 0, z, .02).rotation.y = R() * 2; box(j, .38, .3, .34, shade('#b99a6c', -.1) && M('#a68858', { r: 1 }), x + .05, .4, z, .02).rotation.y = R(); }
      else if (i === 1) { cyl(j, .17, .15, .3, M('#c1423c', { r: .6 }), x, 0, z, 14); cyl(j, .12, .12, .02, M('#e8e0d0'), x, .29, z, 12); }
      else { [0, 1, 2].forEach(k => box(j, 1.0, .05, .12, wood, x, k * .05, z + k * .13, .01).rotation.y = (k - 1) * .2); }
    });
    // cobweb in the back corner
    j.userData.junk = true;
  }

  // ============================================================ slot application
  function clearGroup(g) { while (g.children.length) { const c = g.children[0]; g.remove(c); } g.userData.emissives = null; }
  function applySlot(id, vi, opts = {}) {
    const s = slots[id], d = s.def; s.vi = vi;
    if (d.surface) {
      if (d.surface === 'floor') { applyFloor(d, vi); if (vi >= 0 && rooms[d.room].junk.children.length) { clearJunk(rooms[d.room]); } }
      else if (d.surface === 'wall') applyWall(d, vi); else applyLawn(d, vi);
      shadowDirty = 2; if (opts.pop) { poof(d); } return;
    }
    clearGroup(s.g);
    if (vi < 0) buildOld(d, s.g); else { const v = d.variants[vi].p; B[d.type](s.g, d.type === 'curtains' ? v : v, d.win ? Object.assign({}, d, { win: ROOMS[d.room].win }) : d); }
    applyNight(s.g);
    s.g.traverse(o => { if (o.isMesh) { o.castShadow = o.castShadow !== false; o.receiveShadow = true; } });
    if (opts.pop) anims.push({ o: s.g, t: 0, dur: .55, kind: 'pop', s0: s.g.scale.x || 1 });
    shadowDirty = 2;
  }
  function clearJunk(room) { const j = room.junk; j.children.slice().forEach((c, i) => anims.push({ o: c, t: -i * .05, dur: .35, kind: 'shrink', done: () => j.remove(c) })); }
  RENO.sheetsOf = (id) => slots[id];

  // ============================================================ night
  function applyNight(g) {
    g.traverse(o => {
      if (o.userData && o.userData.emissives) o.userData.emissives.forEach(m => { m.emissiveIntensity = nightK * 1.0; });
      if (o.isSprite && o.userData.glow) o.material.opacity = nightK * .85;
    });
  }
  function nightAll() {
    hemi.intensity = THREE.MathUtils.lerp(1.35, .55, nightK); sun.intensity = THREE.MathUtils.lerp(2.6, .35, nightK);
    sun.color.set(night ? 0x8fa0e0 : 0xfff1d6).lerp(new T.Color(0xfff1d6), 1 - nightK);
    hemi.color.setHex(0xfff4e2).lerp(new T.Color(0x6f7fc0), nightK);
    Object.values(rooms).forEach(r => { if (r.light) r.light.intensity = nightK * 3.2; if (r.glass) r.glass.material.opacity = .16 + nightK * .25; });
    Object.values(slots).forEach(s => s.g && applyNight(s.g));
    renderer.toneMappingExposure = 1.05 - nightK * .1; shadowDirty = 1;
  }

  // ============================================================ effects
  let starTex, puffTex;
  function fxTextures() {
    if (starTex) return;
    starTex = toTex(cvs(64, 64, (x) => { x.translate(32, 32); x.fillStyle = '#ffe27a'; x.strokeStyle = '#fff'; x.lineWidth = 3; x.beginPath(); for (let i = 0; i < 10; i++) { const r = i % 2 ? 11 : 28, a = -Math.PI / 2 + i * Math.PI / 5; x.lineTo(Math.cos(a) * r, Math.sin(a) * r); } x.closePath(); x.fill(); x.stroke(); }));
    puffTex = toTex(cvs(64, 64, (x) => { const g = x.createRadialGradient(32, 32, 2, 32, 32, 30); g.addColorStop(0, 'rgba(255,255,255,.95)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); }));
  }
  function worldPos(d) { // anchors are room-local (garden: world x/z on the lawn)
    const base = d.room === 'garden' ? RENO.garden : rooms[d.room].g, a = d.anchor || [0, 1, 0], v = new T.Vector3(a[0], a[1], a[2]);
    base.updateWorldMatrix(true, false); return v.applyMatrix4(base.matrixWorld);
  }
  function poof(d) {
    fxTextures(); const c = centerOf(d);
    for (let i = 0; i < 12; i++) { const sp = new T.Sprite(new T.SpriteMaterial({ map: puffTex, transparent: true, opacity: .8, depthWrite: false, color: 0xffffff })); sp.position.copy(c).add(new T.Vector3((Math.random() - .5) * d.size[0], (Math.random() - .3) * d.size[1] * .6, (Math.random() - .5) * d.size[2])); sp.scale.setScalar(.5); root.add(sp); anims.push({ o: sp, t: 0, dur: .8 + Math.random() * .3, kind: 'puff', v: new T.Vector3((Math.random() - .5) * 1.2, .5 + Math.random() * .8, (Math.random() - .5) * .8) }); }
    for (let i = 0; i < 16; i++) { const sp = new T.Sprite(new T.SpriteMaterial({ map: starTex, transparent: true, depthWrite: false, depthTest: false })); sp.position.copy(c); sp.scale.setScalar(.22 + Math.random() * .2); sp.renderOrder = 10; root.add(sp); const a = Math.random() * 6.28, sp2 = 1.5 + Math.random() * 2.5; anims.push({ o: sp, t: -Math.random() * .1, dur: 1.0 + Math.random() * .5, kind: 'star', v: new T.Vector3(Math.cos(a) * sp2, 2 + Math.random() * 2.5, (Math.random() - .5) * 2) }); }
  }
  function centerOf(d) { const s = slots[d.id]; const r = rooms[d.room]; const v = new T.Vector3(d.surface ? 0 : d.pos[0], d.surface ? 0 : d.pos[1], d.surface ? 0 : d.pos[2]); if (d.surface === 'lawn') return new T.Vector3(0, GY + .3, 7); if (d.surface === 'floor') v.set(0, .4, 0.5); else if (d.surface === 'wall') v.set(0, 1.5, -2.1); else v.y += d.size[1] / 2 + (d.wall ? -d.size[1] / 2 : 0) + (d.type === 'curtains' ? 1.4 : 0) + (d.type === 'pendant' ? 2.5 : 0); const base = d.room === 'garden' ? RENO.garden : r.g; base.updateWorldMatrix(true, false); return v.applyMatrix4(base.matrixWorld); }
  RENO.centerOf = (id) => centerOf(BY_ID[id]);

  function stepAnims(dt) {
    for (let i = anims.length - 1; i >= 0; i--) {
      const a = anims[i]; a.t += dt; if (a.t < 0) continue; const k = Math.min(1, a.t / a.dur);
      if (a.kind === 'pop') { const e = 1 + Math.sin(k * Math.PI * 2.2) * (1 - k) * .14 - (1 - k) * (1 - k) * .55 * (k < .35 ? 1 : 0); const sc = k < .25 ? .6 + k * 1.6 : e; a.o.scale.setScalar(Math.max(.01, k >= 1 ? 1 : (k < .3 ? .55 + (k / .3) * .6 : 1.15 - (k - .3) / .7 * .15 + Math.sin(k * 14) * .02 * (1 - k)))); if (k >= 1) a.o.scale.setScalar(1); shadowDirty = 1; }
      else if (a.kind === 'puff') { a.o.position.addScaledVector(a.v, dt); a.o.scale.setScalar(.5 + k * 1.5); a.o.material.opacity = .75 * (1 - k); }
      else if (a.kind === 'star') { a.v.y -= 6 * dt; a.o.position.addScaledVector(a.v, dt); a.o.material.opacity = 1 - k * k; a.o.scale.multiplyScalar(1 - dt * .4); a.o.material.rotation += dt * 3; }
      else if (a.kind === 'shrink') { a.o.scale.setScalar(Math.max(.001, 1 - k)); shadowDirty = 1; }
      else if (a.kind === 'fn') { a.f(k); }
      if (k >= 1) { if (a.kind === 'puff' || a.kind === 'star') { root.remove(a.o); a.o.material.dispose(); } if (a.done) a.done(); anims.splice(i, 1); }
    }
  }

  // ============================================================ camera
  function fitDist(width, height) { const t = Math.tan(FOV * Math.PI / 360), asp = W / Hh; return Math.max(width / (2 * t * asp), height / (2 * t)); }
  function viewFor(roomId, slotId) {
    if (!roomId) return { tx: 0, ty: 3.1, tz: .4, dist: fitDist(12.6, 8.4) * 1.0, pitch: .27, yaw: 0, lift: 0, bx: 5.5, by: [0.8, 4.5] };
    const r = ROOMS[roomId];
    if (r.garden) return { tx: 0, ty: GY + 1.2, tz: 5.2, dist: fitDist(13.6, 7.0), pitch: .46, yaw: 0, lift: 1, bx: 6, by: [0, 2] };
    const up = r.floor === 1;
    const t = { tx: r.cx, ty: FY[r.floor] + 1.35, tz: .1, dist: fitDist(6.3, 4.9), pitch: .38, yaw: 0, lift: up ? 0 : 1, bx: 5.4, by: [FY[r.floor] + .6, FY[r.floor] + 2.2] };
    if (slotId) { const d = BY_ID[slotId]; if (!d.surface) { const dx = clamp((d.pos[0]) * .55, -1.1, 1.1); t.tx += dx; } }
    return t;
  }
  function goTo(v, instant) {
    goal.tx = v.tx; goal.ty = v.ty; goal.tz = v.tz; goal.dist = v.dist * userZoom; goal.pitch = v.pitch; goal.yaw = v.yaw; goal.lift = v.lift; goal.bx = v.bx; goal.by = v.by; goal.base = v;
    if (instant) { Object.assign(cam, goal); upperLift = goal.lift ?? 0; }
  }
  RENO.focus = (roomId, slotId, opts = {}) => { focusRoom = roomId || null; userZoom = 1; goal.shift = opts.shift ?? goal.shift; goTo(viewFor(roomId, slotId), opts.instant); lastInteract = performance.now(); };
  RENO.overview = (opts) => RENO.focus(null, null, opts);
  RENO.setShift = (px) => { goal.shift = px; };
  RENO.currentRoom = () => focusRoom;
  RENO.nudgeYaw = () => { const ys = [0, .32, -.32]; const i = ys.findIndex(y => Math.abs(y - goal.yaw) < .05); goal.yaw = ys[(i + 1) % 3]; };
  RENO.zoom = (f) => { userZoom = clamp(userZoom / f, .55, 1.5); const b = goal.base || viewFor(focusRoom); goal.dist = b.dist * userZoom; };

  function updateCamera(dt) {
    const k = 1 - Math.exp(-dt * 5.2);
    ['tx', 'ty', 'tz', 'dist', 'pitch', 'yaw', 'shift'].forEach(p => cam[p] += (goal[p] - cam[p]) * k);
    const sway = Math.sin(performance.now() / 3200) * .012, yaw = cam.yaw + sway, cp = Math.cos(cam.pitch);
    camera.position.set(cam.tx + cam.dist * Math.sin(yaw) * cp, cam.ty + cam.dist * Math.sin(cam.pitch), cam.tz + cam.dist * Math.cos(yaw) * cp);
    camera.lookAt(cam.tx, cam.ty, cam.tz);
    if (Math.abs(cam.shift) > .3) camera.setViewOffset(W, Hh, 0, cam.shift, W, Hh); else camera.clearViewOffset();
    // upper floor lifts away when the ground floor is in focus
    const tl = goal.lift ?? 0, before = upperLift; upperLift += (tl - upperLift) * (1 - Math.exp(-dt * 4)); if (Math.abs(tl - upperLift) < .003) upperLift = tl;
    RENO.upper.position.y = upperLift * 9; RENO.upper.visible = upperLift < .985; if (before !== upperLift) shadowDirty = 1;
  }

  // ============================================================ rendering
  function resize() {
    const r = el.getBoundingClientRect(); W = Math.max(50, r.width | 0); Hh = Math.max(50, r.height | 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2)); renderer.setSize(W, Hh, false); camera.aspect = W / Hh; camera.updateProjectionMatrix();
    if (focusRoom !== undefined && goal.base) { const b = viewFor(focusRoom); goal.dist = b.dist * userZoom; goal.base = b; }
  }
  function frame(t) {
    raf = requestAnimationFrame(frame); if (!active) return;
    const dt = Math.min(.05, (t - last) / 1000 || .016); last = t;
    if (night !== (nightK > .5) || (night && nightK < 1) || (!night && nightK > 0)) { nightK += ((night ? 1 : 0) - nightK) * Math.min(1, dt * 4); if (Math.abs((night ? 1 : 0) - nightK) < .01) nightK = night ? 1 : 0; nightAll(); }
    stepAnims(dt); updateCamera(dt);
    if (shadowDirty > 0) { renderer.shadowMap.needsUpdate = true; shadowDirty--; }
    renderer.render(scene, camera); cb.frame();
  }
  RENO.start = () => { if (!renderer) return; active = true; resize(); last = performance.now(); shadowDirty = 3; };
  RENO.stop = () => { active = false; };
  RENO.isActive = () => active;

  // ============================================================ init
  RENO.init = (container) => {
    el = container;
    renderer = new T.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setClearColor(0x000000, 0); renderer.outputColorSpace = T.SRGBColorSpace; renderer.toneMapping = T.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFSoftShadowMap; renderer.shadowMap.autoUpdate = false;
    renderer.domElement.style.cssText = 'width:100%;height:100%;display:block;touch-action:none';
    el.appendChild(renderer.domElement);
    scene = new T.Scene(); camera = new T.PerspectiveCamera(FOV, 1, .5, 400); root = new T.Group(); scene.add(root);
    hemi = new T.HemisphereLight(0xfff4e2, 0x8b7d6a, 1.35); scene.add(hemi);
    sun = new T.DirectionalLight(0xfff1d6, 2.6); sun.position.set(-8, 15, 13); sun.target.position.set(0, 1, 2); scene.add(sun, sun.target);
    sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); const sc = sun.shadow.camera; sc.left = -15; sc.right = 15; sc.top = 13; sc.bottom = -9; sc.near = 1; sc.far = 50; sun.shadow.bias = -.0006; sun.shadow.normalBias = .03; sun.shadow.radius = 3;
    buildWorld(); buildShell(); buildSlots();
    Object.values(rooms).forEach(r => { if (r.junk) addJunk(r); });
    SLOTS.forEach(s => applySlot(s.id, -1));
    resize(); RENO.overview({ instant: true });
    new ResizeObserver(() => { if (active) resize(); }).observe(el); window.addEventListener('resize', () => active && resize());
    bindInput(); requestAnimationFrame(frame);
    cb.ready();
  };

  // ============================================================ state api
  RENO.setChoices = (map) => { Object.keys(choices).forEach(k => delete choices[k]); Object.assign(choices, map || {}); SLOTS.forEach(s => applySlot(s.id, choices[s.id] ?? -1)); };
  RENO.commit = (id, vi, o = {}) => { choices[id] = vi; delete previews[id]; applySlot(id, vi, { pop: o.pop !== false }); };
  RENO.preview = (id, vi) => { previews[id] = vi; applySlot(id, vi, { pop: BY_ID[id].surface ? false : true }); };
  RENO.revert = (id) => { delete previews[id]; applySlot(id, choices[id] ?? -1, { pop: false }); };
  RENO.setNight = (n) => { night = !!n; };
  RENO.setNightNow = (n) => { night = !!n; nightK = n ? 1 : 0; nightAll(); };
  RENO.celebrate = (id) => poof(BY_ID[id]);
  RENO.roomComplete = (roomId) => { const rm = rooms[roomId]; if (!rm) return; fxTextures(); const d = { id: roomId, size: [5, 2, 4] }; const c = new T.Vector3(0, 1.5, 0); rm.g.updateWorldMatrix(true, false); c.applyMatrix4(rm.g.matrixWorld); for (let i = 0; i < 40; i++) { const sp = new T.Sprite(new T.SpriteMaterial({ map: starTex, transparent: true, depthWrite: false, depthTest: false, color: [0xffe27a, 0xff9ec4, 0x9fe3ff, 0xb9f08a][i % 4] })); sp.position.copy(c).add(new T.Vector3((Math.random() - .5) * 4, Math.random() * 1.5, (Math.random() - .5) * 2)); sp.scale.setScalar(.2 + Math.random() * .25); sp.renderOrder = 10; root.add(sp); anims.push({ o: sp, t: -Math.random() * .4, dur: 1.6 + Math.random() * .6, kind: 'star', v: new T.Vector3((Math.random() - .5) * 3, 3 + Math.random() * 3, (Math.random() - .5) * 2) }); } };
  RENO.project = (id) => { const d = BY_ID[id]; const v = worldPos(d); const room = rooms[d.room]; const hidden = room && room.def.floor === 1 && upperLift > .5; v.project(camera); const vis = !hidden && v.z < 1 && v.z > -1; return { x: (v.x * .5 + .5) * W - 0, y: (-v.y * .5 + .5) * Hh - cam.shift * 0, vis, w: W, h: Hh }; };
  RENO.size = () => ({ w: W, h: Hh });
  RENO.slotWorld = (id) => worldPos(BY_ID[id]);

  // snapshot a room (before/after pictures)
  RENO.shot = (roomId, w = 480, h = 360) => {
    if (!renderer) return null;
    const saved = { cam: Object.assign({}, cam), goal: Object.assign({}, goal), lift: upperLift, W, Hh, vo: camera.view };
    const v = viewFor(roomId); const pr = renderer.getPixelRatio();
    renderer.setPixelRatio(1); renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); W = w; Hh = h;
    const vv = viewFor(roomId); Object.assign(cam, { tx: vv.tx, ty: vv.ty, tz: vv.tz, dist: vv.dist * 1.02, pitch: vv.pitch, yaw: .08, shift: 0 }); upperLift = vv.lift; RENO.upper.position.y = upperLift * 9; RENO.upper.visible = upperLift < .985;
    const cp = Math.cos(cam.pitch); camera.position.set(cam.tx + cam.dist * Math.sin(cam.yaw) * cp, cam.ty + cam.dist * Math.sin(cam.pitch), cam.tz + cam.dist * Math.cos(cam.yaw) * cp); camera.lookAt(cam.tx, cam.ty, cam.tz); camera.clearViewOffset();
    renderer.shadowMap.needsUpdate = true;
    // opaque sky behind the transparent canvas
    const bg = document.createElement('canvas'); bg.width = w; bg.height = h; const x = bg.getContext('2d'); const gr = x.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, night ? '#25306A' : '#7EC8F8'); gr.addColorStop(1, night ? '#3E3F7A' : '#E3F5FF'); x.fillStyle = gr; x.fillRect(0, 0, w, h);
    renderer.render(scene, camera); x.drawImage(renderer.domElement, 0, 0, w, h); const url = bg.toDataURL('image/jpeg', .85);
    renderer.setPixelRatio(pr); W = saved.W; Hh = saved.Hh; renderer.setSize(W, Hh, false); camera.aspect = W / Hh; camera.updateProjectionMatrix();
    Object.assign(cam, saved.cam); upperLift = saved.lift; RENO.upper.position.y = upperLift * 9; RENO.upper.visible = upperLift < .985; shadowDirty = 2;
    return url;
  };

  // ============================================================ picking & input
  const ray = new T.Raycaster(), ndc = new T.Vector2();
  function pickAt(cx, cy) {
    const r = renderer.domElement.getBoundingClientRect(); ndc.set(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1);
    if (camera.view && camera.view.enabled) { // account for the vertical view offset
      ndc.y = -(((cy - r.top) + cam.shift) / Hh) * 2 + 1;
    }
    ray.setFromCamera(ndc, camera);
    const hits = ray.intersectObject(root, true);
    for (const h of hits) { let o = h.object; if (o.material && o.material.visible === false) continue; if (!o.visible) continue; let hid = false; for (let p = o; p; p = p.parent) { if (p.visible === false) { hid = true; break; } } if (hid) continue; while (o) { if (o.userData && o.userData.slotId) return { slot: o.userData.slotId, room: BY_ID[o.userData.slotId].room }; o = o.parent; } }
    const vols = Object.values(rooms).map(r => r.vol).filter(Boolean).filter(v => { for (let p = v; p; p = p.parent) if (p.visible === false) return false; return true; });
    const vh = ray.intersectObjects(vols, false); if (vh.length) return { room: vh[0].object.userData.roomId };
    return null;
  }
  RENO.pick = pickAt;
  function bindInput() {
    const dom = renderer.domElement, ptrs = new Map(); let drag = null, pinch = null;
    dom.addEventListener('pointerdown', (e) => { dom.setPointerCapture(e.pointerId); ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY }); if (ptrs.size === 1) drag = { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, moved: false, t: performance.now() }; else if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), z: userZoom }; drag = null; } });
    dom.addEventListener('pointermove', (e) => {
      if (!ptrs.has(e.pointerId)) return; const p = ptrs.get(e.pointerId); const dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY;
      if (pinch && ptrs.size >= 2) { const [a, b] = [...ptrs.values()]; const d = Math.hypot(a.x - b.x, a.y - b.y); userZoom = clamp(pinch.z * pinch.d / d, .55, 1.5); const bs = goal.base || viewFor(focusRoom); goal.dist = bs.dist * userZoom; return; }
      if (!drag) return; if (!drag.moved && Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) > 7) drag.moved = true;
      if (drag.moved) { const upp = 2 * goal.dist * Math.tan(FOV * Math.PI / 360) / Hh; goal.tx = clamp(goal.tx - dx * upp * 1.0, -(goal.bx || 5.4), goal.bx || 5.4); const by = goal.by || [0.8, 4.5]; goal.ty = clamp(goal.ty + dy * upp / Math.cos(goal.pitch) * 1.0, by[0], by[1]); cam.tx = goal.tx; cam.ty = goal.ty; lastInteract = performance.now(); }
    });
    const up = (e) => { const was = ptrs.has(e.pointerId); ptrs.delete(e.pointerId); if (ptrs.size < 2) pinch = null; if (!was) return; if (drag && !drag.moved && e.type === 'pointerup') { const hit = pickAt(e.clientX, e.clientY); cb.tap(hit, e); } if (ptrs.size === 0) drag = null; };
    dom.addEventListener('pointerup', up); dom.addEventListener('pointercancel', up);
    dom.addEventListener('wheel', (e) => { e.preventDefault(); RENO.zoom(e.deltaY < 0 ? 1.1 : 1 / 1.1); }, { passive: false });
  }
})();
