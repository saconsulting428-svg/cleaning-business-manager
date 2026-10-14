// Home Haven 3D — 3D construction world (Three.js). Implements the same interface the game flow used with the old Phaser iso scene.
(function () {
  const T = THREE, RENO = window.RENO, PART = SPRITES.parts, PB = RENO.PARTS;
  const { box, cyl, sph, grp, mat: M, shade, cvs, toTex } = RENO;
  const N = 12, H = 2.5, FT = .1, WT = .2, EDGE = [[0, -.5], [.5, 0], [0, .5], [-.5, 0]];
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v)), rand = RENO.rng;
  const W3 = RENO.World = {
    N, H, cb: {}, view: 0, level: 0, mode: 'view', interior: false, night: false, layout: [], selected: null, place: null, ghost: null, ghostCand: null, chars: [], pendingRot: 0, ready: false,
  };
  window.WORLD = W3;
  let renderer, scene, camera, root, objGroup, hemi, sun, el, active = false, last = 0, Wd = 400, Hd = 700, dirty = 3;
  const objs = new Map(), cam = W3._cam = { tx: N / 2, ty: 1, tz: N / 2, dist: 24, yaw: Math.PI / 4, pitch: .93, sx: 0, sy: 0 }, goal = Object.assign({}, cam);
  const FOV = 28; let nightK = 0, gridLines, gridLevel = -1, hi, foundation, ghostBox;
  const alphaCache = new Map();

  // ---------------------------------------------------------------- textures for structural parts (neutral, tinted by paint colour)
  const TEX = {};
  const noise = (x, W, Hh, R, n, a) => { for (let i = 0; i < n; i++) { x.fillStyle = R() > .5 ? `rgba(255,255,255,${a})` : `rgba(0,0,0,${a})`; x.fillRect(R() * W, R() * Hh, 2, 2); } };
  const texOf = (k) => {
    if (TEX[k]) return TEX[k]; const R = rand(k.length * 31 + 5), S = 128;
    const mk = (fn, w = S, h = S) => { const t = toTex(cvs(w, h, (x, W, Hh) => fn(x, W, Hh)), true); t.anisotropy = 4; return t; };
    if (k === 'wood') TEX[k] = mk((x, W, Hh) => { x.fillStyle = '#f0e0c8'; x.fillRect(0, 0, W, Hh); for (let i = 0; i < 4; i++) { const y = i * Hh / 4; x.fillStyle = `hsl(30,${30 + R() * 10}%,${80 + R() * 10}%)`; x.fillRect(0, y, W, Hh / 4); x.fillStyle = 'rgba(60,35,10,.55)'; x.fillRect(0, y, W, 2); for (let j = 0; j < 4; j++) { x.strokeStyle = 'rgba(80,50,20,.18)'; x.beginPath(); x.moveTo(0, y + 6 + R() * 18); x.bezierCurveTo(W * .3, y + R() * 28, W * .6, y + R() * 28, W, y + 4 + R() * 24); x.stroke(); } x.fillStyle = 'rgba(60,35,10,.5)'; x.fillRect((i * 53 % W), y, 2, Hh / 4); } });
    else if (k === 'tile') TEX[k] = mk((x, W, Hh) => { x.fillStyle = '#b9b2a4'; x.fillRect(0, 0, W, Hh); for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) { x.fillStyle = `hsl(35,${8 + R() * 6}%,${88 + R() * 7}%)`; x.fillRect(i * W / 2 + 2, j * Hh / 2 + 2, W / 2 - 4, Hh / 2 - 4); } });
    else if (k === 'marble') TEX[k] = mk((x, W, Hh) => { x.fillStyle = '#f7f6f2'; x.fillRect(0, 0, W, Hh); x.strokeStyle = 'rgba(120,125,140,.3)'; for (let i = 0; i < 5; i++) { x.beginPath(); let px = R() * W, py = 0; x.moveTo(px, py); for (let s = 0; s < 5; s++) { px += (R() - .5) * 40; py += Hh / 5; x.lineTo(px, py); } x.stroke(); } x.strokeStyle = 'rgba(160,160,160,.5)'; x.strokeRect(1, 1, W - 2, Hh - 2); });
    else if (k === 'parquet') TEX[k] = mk((x, W, Hh) => { x.fillStyle = '#e9dcc4'; x.fillRect(0, 0, W, Hh); const sw = W / 2; for (let i = 0; i < 2; i++) for (let y = -sw; y < Hh + sw; y += 16) { x.fillStyle = `hsl(32,${30 + R() * 10}%,${72 + R() * 18}%)`; const dir = i % 2 ? -1 : 1, base = i % 2 ? sw : 0; x.beginPath(); x.moveTo(i * sw, y + base); x.lineTo((i + 1) * sw, y + base + dir * sw); x.lineTo((i + 1) * sw, y + base + dir * sw + 14); x.lineTo(i * sw, y + base + 14); x.fill(); } })
    else if (k === 'carpet') TEX[k] = mk((x, W, Hh) => { x.fillStyle = '#e8e8e8'; x.fillRect(0, 0, W, Hh); noise(x, W, Hh, R, 2600, .14); });
    else if (k === 'concrete') TEX[k] = mk((x, W, Hh) => { x.fillStyle = '#e4e4e4'; x.fillRect(0, 0, W, Hh); noise(x, W, Hh, R, 1500, .09); x.strokeStyle = 'rgba(0,0,0,.15)'; x.strokeRect(0, 0, W, Hh); });
    else if (k === 'cobble') TEX[k] = mk((x, W, Hh) => { x.fillStyle = '#8c8578'; x.fillRect(0, 0, W, Hh); for (let i = 0; i < 14; i++) { x.fillStyle = `hsl(40,${6 + R() * 6}%,${78 + R() * 14}%)`; x.beginPath(); x.ellipse(R() * W, R() * Hh, 14 + R() * 8, 10 + R() * 6, R() * 3, 0, 7); x.fill(); } });
    else if (k === 'brick') TEX[k] = mk((x, W, Hh) => { x.fillStyle = '#a8a29a'; x.fillRect(0, 0, W, Hh); const bw = 32, bh = 16; for (let j = 0; j < 8; j++) for (let i = -1; i < 5; i++) { x.fillStyle = `hsl(0,0%,${74 + R() * 18}%)`; x.fillRect(i * bw + (j % 2 ? bw / 2 : 0) + 1, j * bh + 1, bw - 2, bh - 2); } });
    else if (k === 'stone') TEX[k] = mk((x, W, Hh) => { x.fillStyle = '#9a958c'; x.fillRect(0, 0, W, Hh); for (let j = 0; j < 4; j++) { let px = (j % 2) * 20 - 20; while (px < W) { const w = 36 + R() * 26; x.fillStyle = `hsl(35,6%,${72 + R() * 18}%)`; x.fillRect(px + 1, j * 32 + 1, w - 2, 30); px += w; } } noise(x, W, Hh, R, 600, .08); });
    else if (k === 'plank') TEX[k] = mk((x, W, Hh) => { for (let i = 0; i < 6; i++) { x.fillStyle = `hsl(32,${24 + R() * 10}%,${78 + R() * 12}%)`; x.fillRect(i * W / 6, 0, W / 6, Hh); x.fillStyle = 'rgba(50,30,10,.5)'; x.fillRect(i * W / 6, 0, 2, Hh); for (let j = 0; j < 3; j++) { x.strokeStyle = 'rgba(80,50,20,.16)'; x.beginPath(); x.moveTo(i * W / 6 + 4 + R() * 14, 0); x.lineTo(i * W / 6 + 4 + R() * 14, Hh); x.stroke(); } } });
    else if (k === 'plaster') TEX[k] = mk((x, W, Hh) => { x.fillStyle = '#f2f2f2'; x.fillRect(0, 0, W, Hh); noise(x, W, Hh, R, 1100, .06); });
    else if (k === 'shingle') TEX[k] = mk((x, W, Hh) => { x.fillStyle = '#c9c9c9'; x.fillRect(0, 0, W, Hh); for (let j = 0; j < 6; j++) for (let i = -1; i < 5; i++) { x.fillStyle = `hsl(0,0%,${72 + R() * 22}%)`; const ox = j % 2 ? 16 : 0; x.beginPath(); x.moveTo(i * 32 + ox + 1, j * 21 + 1); x.lineTo(i * 32 + ox + 31, j * 21 + 1); x.lineTo(i * 32 + ox + 31, j * 21 + 15); x.quadraticCurveTo(i * 32 + ox + 16, j * 21 + 24, i * 32 + ox + 1, j * 21 + 15); x.fill(); } });
    else if (k === 'slate') TEX[k] = mk((x, W, Hh) => { x.fillStyle = '#9a9a9a'; x.fillRect(0, 0, W, Hh); for (let j = 0; j < 8; j++) for (let i = -1; i < 4; i++) { x.fillStyle = `hsl(215,8%,${60 + R() * 22}%)`; const ox = j % 2 ? 20 : 0; x.fillRect(i * 40 + ox + 1, j * 16 + 1, 38, 14); } });
    else TEX[k] = mk((x, W, Hh) => { x.fillStyle = '#ffffff'; x.fillRect(0, 0, W, Hh); });
    return TEX[k];
  };
  const matCache = {};
  const tmat = (tex, color, o = {}) => { const k = `${tex}|${color}|${o.r ?? .85}|${o.rep || 1}`; if (matCache[k]) return matCache[k]; const t = o.rep ? texOf(tex).clone() : texOf(tex); if (o.rep) { t.repeat.set(o.rep, o.rep); t.needsUpdate = true; } return matCache[k] = new T.MeshStandardMaterial({ map: t, color, roughness: o.r ?? .85 }); };
  const FLOOR_TEX = { floor_parquet: 'parquet', floor_slate: 'tile', floor_concrete: 'concrete', floor_wood: 'wood', floor_tile: 'tile', floor_marble: 'marble', floor_carpet: 'carpet', path_stone: 'cobble' };
  const WALL_TEX = { wall_plaster: 'plaster', wall_brick: 'brick', wall_stone: 'stone', wall_wood: 'plank', wall_half: 'plaster', door_wood: 'plaster', door_glass: 'plaster', window_small: 'plaster', window_big: 'plaster', arch: 'plaster' };

  // ---------------------------------------------------------------- geometry helpers
  const footprint = (part, rot) => { const P = PART[part]; return rot % 2 ? [P.d, P.w] : [P.w, P.d]; };
  const cellsOf = (o) => { const [fw, fd] = footprint(o.part, o.rot), c = []; for (let i = 0; i < fw; i++) for (let j = 0; j < fd; j++) c.push([o.x + i, o.z + j]); return c; };
  const centerOf = (o) => { const P = PART[o.part]; if (P.kind === 'wall') { const e = EDGE[o.rot]; return [o.x + .5 + e[0], o.z + .5 + e[1]]; } const [fw, fd] = footprint(o.part, o.rot); return [o.x + fw / 2, o.z + fd / 2]; };
  const hasFloor = (x, z, lvl, ignore) => W3.layout.some(o => o !== ignore && o.lvl === lvl && PART[o.part].kind === 'floor' && o.x === x && o.z === z && o.part !== 'path_stone');
  W3.footprint = footprint; W3.cellsOf = cellsOf; W3.centerOf = centerOf; W3.hasFloor = hasFloor;

  // ---------------------------------------------------------------- build the 3D shape of any part
  function wallShape(len, hgt, hole) { const s = new T.Shape(); if (hole && hole.floor) { const a = hole.x0, b = hole.x1; s.moveTo(0, 0); s.lineTo(a, 0); s.lineTo(a, hole.y1 - (hole.arch ? (b - a) / 2 : 0)); if (hole.arch) s.absarc((a + b) / 2, hole.y1 - (b - a) / 2, (b - a) / 2, Math.PI, 0, true); else s.lineTo(b, hole.y1); s.lineTo(b, 0); s.lineTo(len, 0); s.lineTo(len, hgt); s.lineTo(0, hgt); s.lineTo(0, 0); } else { s.moveTo(0, 0); s.lineTo(len, 0); s.lineTo(len, hgt); s.lineTo(0, hgt); s.lineTo(0, 0); if (hole) { const p = new T.Path(); p.moveTo(hole.x0, hole.y0); p.lineTo(hole.x0, hole.y1); p.lineTo(hole.x1, hole.y1); p.lineTo(hole.x1, hole.y0); p.lineTo(hole.x0, hole.y0); s.holes.push(p); } } return s; }
  function extrudeWall(len, hgt, hole, m) { const g = new T.ExtrudeGeometry(wallShape(len, hgt, hole), { depth: WT, bevelEnabled: false }); // uv -> world metres
    const uv = g.attributes.uv, pos = g.attributes.position; for (let i = 0; i < uv.count; i++) uv.setXY(i, pos.getX(i), pos.getY(i)); const me = new T.Mesh(g, m); me.position.set(-len / 2, 0, -WT / 2); me.castShadow = me.receiveShadow = true; return me; }
  const glassM = () => new T.MeshStandardMaterial({ color: '#bfe3f4', transparent: true, opacity: .28, roughness: .05, metalness: .1, depthWrite: false });
  let glassMat; const getGlass = () => glassMat || (glassMat = glassM());

  function buildStructure(o, P) {
    const g = new T.Group(), id = o.part, col = o.color || P.color, L = 1 + WT;
    if (P.kind === 'floor') {
      const top = tmat(FLOOR_TEX[id], col, { r: id === 'floor_marble' || id === 'floor_tile' ? .3 : .85 }), side = M(shade(col, -.2), { r: .8 });
      const m = new T.Mesh(new T.BoxGeometry(1, id === 'path_stone' ? .05 : FT, 1), [side, side, top, side, side, side]); m.position.set(0, (id === 'path_stone' ? .025 : FT / 2), 0); m.castShadow = id !== 'path_stone'; m.receiveShadow = true; g.add(m); return g;
    }
    if (P.kind === 'wall') {
      const horiz = o.rot % 2 === 0; const inner = new T.Group(); g.add(inner); if (!horiz) inner.rotation.y = Math.PI / 2;
      const wm = tmat(WALL_TEX[id] || 'plaster', col, { r: .9 }); let hh = H;
      if (id === 'wall_half') hh = 1.1;
      if (id === 'fence') { const c = M(col, { r: .6 }); for (let i = 0; i < 5; i++) { box(inner, .12, .95, .04, c, -.4 + i * .2, 0, 0, .008); box(inner, .12, .02, .05, c, -.4 + i * .2, .95, 0, .004); } box(inner, 1.0, .06, .05, c, 0, .22, -.04, .005); box(inner, 1.0, .06, .05, c, 0, .62, -.04, .005); box(inner, .09, 1.05, .09, M(shade(col, -.12), { r: .6 }), -.5, 0, 0, .01); box(inner, .09, 1.05, .09, M(shade(col, -.12), { r: .6 }), .5, 0, 0, .01); return g; }
      if (id === 'gate') { const c = M(col, { r: .6 }); [-.5, .5].forEach(x => box(inner, .12, 1.4, .12, M(shade(col, -.2), { r: .6 }), x, 0, 0, .015)); box(inner, 1.1, .1, .12, M(shade(col, -.2), { r: .6 }), 0, 1.4, 0, .02); for (let i = 0; i < 4; i++) box(inner, .08, .95, .04, c, -.3 + i * .2, .0, .0, .005); box(inner, .8, .06, .04, c, 0, .25, 0, .005); box(inner, .8, .06, .04, c, 0, .7, 0, .005); return g; }
      if (id === 'wall_glass') { const fm = M(col, { m: .5, r: .35 }); box(inner, L, .08, WT, fm, 0, 0, 0, .01); box(inner, L, .08, WT, fm, 0, H - .08, 0, .01); [-.5, 0, .5].forEach(x => box(inner, .06, H, WT, fm, x, 0, 0, .008)); const gl = new T.Mesh(new T.PlaneGeometry(L, H - .16), getGlass()); gl.position.set(0, H / 2, 0); inner.add(gl); const gl2 = gl.clone(); gl2.rotation.y = Math.PI; inner.add(gl2); return g; }
      let hole = null, extra = null;
      if (id === 'window_small') hole = { x0: .22 + 0, x1: L - .22 - 0, y0: 1.0, y1: 1.7 };
      if (id === 'window_big') hole = { x0: .14, x1: L - .14, y0: .7, y1: 2.0 };
      if (id === 'door_wood' || id === 'door_glass') hole = { floor: true, x0: .2, x1: L - .2, y0: 0, y1: 2.05 };
      if (id === 'arch') hole = { floor: true, arch: true, x0: .16, x1: L - .16, y0: 0, y1: 2.15 };
      const body = extrudeWall(L, hh, hole && hole.floor && hole.arch ? hole : hole, wm); inner.add(body);
      const frame = M('#fffdf7', { r: .5 });
      if (id.startsWith('window')) {
        const x0 = hole.x0 - L / 2, x1 = hole.x1 - L / 2, y0 = hole.y0, y1 = hole.y1, w = x1 - x0, h = y1 - y0, fw = .05;
        box(inner, w + fw * 2, fw, WT + .06, frame, (x0 + x1) / 2, y0 - fw, 0, .008); box(inner, w + fw * 2, fw, WT + .06, frame, (x0 + x1) / 2, y1, 0, .008); box(inner, fw, h, WT + .06, frame, x0 - fw / 2, y0, 0, .008); box(inner, fw, h, WT + .06, frame, x1 + fw / 2, y0, 0, .008);
        box(inner, .03, h, .05, frame, (x0 + x1) / 2, y0, 0, .004); box(inner, w, .03, .05, frame, (x0 + x1) / 2, (y0 + y1) / 2 - .015, 0, .004); const gl = new T.Mesh(new T.PlaneGeometry(w, h), getGlass()); gl.position.set((x0 + x1) / 2, (y0 + y1) / 2, 0); gl.userData.glass = 1; inner.add(gl); box(inner, w + .16, .04, .16, frame, (x0 + x1) / 2, y0 - fw - .03, .0, .008);
      } else if (id === 'door_wood') {
        const x0 = hole.x0 - L / 2, x1 = hole.x1 - L / 2, w = x1 - x0; box(inner, .06, 2.1, WT + .06, frame, x0 - .03, 0, 0, .008); box(inner, .06, 2.1, WT + .06, frame, x1 + .03, 0, 0, .008); box(inner, w + .12, .06, WT + .06, frame, (x0 + x1) / 2, 2.05, 0, .008);
        const dl = grp(inner, x0, 0, WT / 2 - .0); dl.rotation.y = -1.25; box(dl, w, 2.03, .05, M('#8a5a3a', { r: .55 }), w / 2, 0, 0, .01); box(dl, w - .2, .8, .02, M('#774a2e', { r: .6 }), w / 2, 1.1, .03, .005); box(dl, w - .2, .8, .02, M('#774a2e', { r: .6 }), w / 2, .15, .03, .005); sph(dl, .035, M('#c9a24a', { m: .8, r: .3 }), w - .1, 1.0, .06);
      } else if (id === 'door_glass') {
        const x0 = hole.x0 - L / 2, x1 = hole.x1 - L / 2, w = x1 - x0, fm = M('#2f3a46', { m: .5, r: .3 }); box(inner, .06, 2.1, WT + .06, frame, x0 - .03, 0, 0, .008); box(inner, .06, 2.1, WT + .06, frame, x1 + .03, 0, 0, .008); box(inner, w + .12, .06, WT + .06, frame, (x0 + x1) / 2, 2.05, 0, .008);
        const dl = grp(inner, x0, 0, WT / 2); dl.rotation.y = -1.2; box(dl, .06, 2.0, .05, fm, .03, 0, 0, .008); box(dl, .06, 2.0, .05, fm, w - .03, 0, 0, .008); box(dl, w, .06, .05, fm, w / 2, 0, 0, .008); box(dl, w, .06, .05, fm, w / 2, 1.96, 0, .008); box(dl, w, .04, .05, fm, w / 2, 1.0, 0, .008); const gl = new T.Mesh(new T.PlaneGeometry(w - .1, 1.9), getGlass()); gl.position.set(w / 2, 1.0, 0); gl.userData.glass = 1; dl.add(gl); box(dl, .03, .3, .04, M('#c9ced3', { m: .8 }), w - .1, .9, .05, .005);
      } else if (id === 'arch') { /* plain arched opening */ }
      return g;
    }
    if (P.kind === 'roof') {
      const roofM = id === 'roof_slope_slate' ? tmat('slate', col, { r: .8 }) : id === 'roof_slope' ? tmat('shingle', col, { r: .85 }) : tmat('concrete', col, { r: .9 });
      const ins = new T.Group(); g.add(ins);
      if (id === 'roof_flat') { const s = new T.Mesh(new T.BoxGeometry(1, .14, 1), roofM); s.position.y = .07; s.castShadow = s.receiveShadow = true; ins.add(s); box(ins, 1.0, .06, 1.0, M(shade(col, -.2), { r: .9 }), 0, .14, 0, .005); }
      else if (id === 'roof_rail') { const m = M(col, { m: .4, r: .5 }); box(ins, 1.02, .05, .05, m, 0, 1.0, .46, .005); box(ins, 1.02, .05, .05, m, 0, .5, .46, .005); for (let i = 0; i < 5; i++) box(ins, .04, 1.0, .04, m, -.5 + i * .25, 0, .46, .005); }
      else { // pitched piece: rises towards -z (rot 0). Pieces that continue the same slope stack up, so deep roofs stay continuous
        const rr = .75, k = W3.roofK(o), lo = k * rr, hi = (k + 1) * rr, oh = .06, geo = new T.BufferGeometry();
        const v = [[-.5 - oh, 0, .5 + (k ? 0 : .12)], [.5 + oh, 0, .5 + (k ? 0 : .12)], [.5 + oh, lo, .5 + (k ? 0 : .12)], [-.5 - oh, lo, .5 + (k ? 0 : .12)], [.5 + oh, hi, -.5], [-.5 - oh, hi, -.5], [-.5 - oh, 0, -.5], [.5 + oh, 0, -.5]];
        const f = [[3, 2, 4], [3, 4, 5], [0, 1, 2], [0, 2, 3], [1, 7, 4], [1, 4, 2], [6, 0, 3], [6, 3, 5], [7, 6, 5], [7, 5, 4], [0, 6, 7], [0, 7, 1]];
        const pos = [], uv = []; f.forEach(t => t.forEach(i => { pos.push(...v[i]); uv.push(v[i][0] * .9 + .5, (v[i][2] * 1.15 + v[i][1]) * 1.0); }));
        geo.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); geo.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); geo.computeVertexNormals();
        const m = new T.Mesh(geo, roofM); m.castShadow = m.receiveShadow = true; ins.add(m); box(ins, 1.0 + 2 * oh, .05, .07, M(shade(col, -.25), { r: .8 }), 0, hi, -.47, .01);
        const body = new T.Mesh(new T.BoxGeometry(.96, 0.01, .96), M(shade(col, -.3))); body.visible = false; ins.add(body);
      }
      g.userData.roofTop = true; return g;
    }
    return g;
  }
  const RISE = [[0, -1], [1, 0], [0, 1], [-1, 0]];
  W3.roofK = (o) => { if (!o || o.part !== 'roof_slope' && o.part !== 'roof_slope_slate') return 0; const dv = RISE[o.rot], dx = -dv[0], dz = -dv[1]; let k = 0; for (let i = 1; i < 12; i++) { const hit = W3.layout.some(q => q !== o && q.lvl === o.lvl && q.rot === o.rot && (q.part === 'roof_slope' || q.part === 'roof_slope_slate') && q.x === o.x + dx * i && q.z === o.z + dz * i); if (!hit) break; k++; } return k; };
  const refreshRoofs = () => { W3.layout.forEach(q => { const P = PART[q.part]; if (P.kind === 'roof' && (q.part === 'roof_slope' || q.part === 'roof_slope_slate')) drawObj(q); }); };
  W3.refreshRoofs = refreshRoofs;
  function buildPartModel(o) { // returns {g, wallLike}
    const P = PART[o.part];
    if (['floor', 'wall', 'roof'].includes(P.kind)) return buildStructure(o, P);
    const g = new T.Group(), col = o.color || P.color, f = PB[o.part];
    if (o.part === 'stairs') PB.stairs(g, col, H); else if (f) f(g, col); else box(g, P.w * .8, .8, P.d * .8, M(col), 0, 0, 0);
    return g;
  }
  W3.buildPartModel = buildPartModel;

  // ---------------------------------------------------------------- placement of objects in the world
  const baseY = (o) => { const P = PART[o.part]; let y = o.lvl * H; if (P.kind === 'roof') return y + H; if (P.kind === 'item' && hasFloor(o.x, o.z, o.lvl)) y += o.part === 'rug' || o.part === 'pond' ? FT : FT; return y; };
  function drawObj(o) {
    const old = objs.get(o.id); if (old) objGroup.remove(old.g);
    const P = PART[o.part], g = buildPartModel(o), holder = new T.Group(); holder.add(g);
    const [cx, cz] = centerOf(o); holder.position.set(cx, baseY(o), cz);
    if (P.kind === 'wall') { /* orientation handled by o.rot parity inside buildStructure */ }
    else if (P.kind === 'roof') holder.rotation.y = -o.rot * Math.PI / 2 + 0; else if (P.kind === 'item') holder.rotation.y = -o.rot * Math.PI / 2;
    // wall pieces are built along x / z already; mirror so windows face outward on S/E — symmetrical, nothing to do
    holder.userData.oid = o.id; holder.traverse(m => { if (m.isMesh) { m.userData.bm = m.material; } });
    objGroup.add(holder); const e = { o, g: holder }; objs.set(o.id, e); applyNightTo(holder); return e;
  }
  W3.drawObj = drawObj;
  const clearObjs = () => { objs.forEach(e => objGroup.remove(e.g)); objs.clear(); };
  W3.setLayout = (layout) => { W3.layout = layout; W3.redraw(); };
  W3.redraw = () => { clearObjs(); W3.layout.forEach(o => drawObj(o)); W3.applyAlpha(); drawFoundation(); dirty = 3; };
  W3.refreshAll = W3.redraw;

  // ---------------------------------------------------------------- visibility: levels, roofs, interior cutaway
  const ghostOf = (m, a) => { if (!m) return m; const k = m.uuid + '|' + a; let c = alphaCache.get(k); if (!c) { c = m.clone(); c.transparent = true; c.opacity = Math.min(m.opacity ?? 1, a); c.depthWrite = false; alphaCache.set(k, c); } return c; };
  function setAlpha(e, a) {
    const g = e.g; g.visible = a > .02; if (!g.visible) return; if (e.a === a) return; e.a = a;
    g.traverse(m => { if (!m.isMesh || !m.userData.bm) return; const bm = m.userData.bm; if (Array.isArray(bm)) m.material = a >= .99 ? bm : bm.map(x => ghostOf(x, a)); else m.material = a >= .99 ? bm : ghostOf(bm, a); m.castShadow = a >= .99 && !m.userData.noShadow; });
  }
  const camVec = () => { const ya = cam.yaw; return [Math.sin(ya), Math.cos(ya)]; };
  W3.isFront = (o) => { const e = EDGE[o.rot], c = camVec(); return e[0] * c[0] + e[1] * c[1] > .1; };
  W3.applyAlpha = () => {
    const lvlView = W3._vl !== undefined ? W3._vl : (W3.mode === 'build' ? W3.level : 0), placingRoof = W3.place && PART[W3.place.part].kind === 'roof';
    objs.forEach(e => {
      const o = e.o, P = PART[o.part]; let a = 1;
      if (W3.mode === 'build') { if (o.lvl > W3.level) a = .08; else if (o.lvl === W3.level && P.kind === 'roof' && !placingRoof) a = .3; else if (o.lvl < W3.level && P.kind === 'roof') a = .3; }
      if (W3.interior) { if (o.lvl > lvlView || (P.kind === 'roof' && !placingRoof)) a = 0; else if (P.kind === 'wall' && o.lvl === lvlView && P.cat !== 'garden' && W3.isFront(o)) a = .14; }
      setAlpha(e, a);
    });
    W3.chars.forEach(c => c.m && (c.m.visible = !(W3.mode === 'build' && W3.level > 0)));
    drawFoundation(); gridRefresh(); dirty = 2;
  };
  W3.setInterior = (on) => { W3.interior = !!on; W3.applyAlpha(); };

  // ---------------------------------------------------------------- foundation marker (when nothing built yet)
  function drawFoundation() {
    if (!foundation) return; const has = W3.layout.some(o => o.lvl === 0 && PART[o.part].kind === 'floor' && o.part !== 'path_stone'); foundation.visible = !has;
  }
  function buildFoundation() {
    foundation = new T.Group(); const x0 = 3, z0 = 3, x1 = 9, z1 = 8;
    const pl = new T.Mesh(new T.PlaneGeometry(x1 - x0, z1 - z0), new T.MeshBasicMaterial({ color: 0xc9a27a, transparent: true, opacity: .55, depthWrite: false })); pl.rotation.x = -Math.PI / 2; pl.position.set((x0 + x1) / 2, .02, (z0 + z1) / 2); foundation.add(pl);
    const pts = [[x0, z0], [x1, z0], [x1, z1], [x0, z1]]; for (let i = 0; i < 4; i++) { const a = pts[i], b = pts[(i + 1) % 4], n = Math.round(Math.hypot(b[0] - a[0], b[1] - a[1]) * 2); for (let k = 0; k < n; k += 2) { const s = [a[0] + (b[0] - a[0]) * k / n, a[1] + (b[1] - a[1]) * k / n], e = [a[0] + (b[0] - a[0]) * (k + 1) / n, a[1] + (b[1] - a[1]) * (k + 1) / n]; const len = Math.hypot(e[0] - s[0], e[1] - s[1]); const d = new T.Mesh(new T.BoxGeometry(len, .02, .09), new T.MeshBasicMaterial({ color: 0xffffff })); d.position.set((s[0] + e[0]) / 2, .04, (s[1] + e[1]) / 2); d.rotation.y = -Math.atan2(e[1] - s[1], e[0] - s[0]); foundation.add(d); } }
    pts.forEach(([x, z]) => { box(foundation, .1, 1, .1, M('#8E5A34'), x, 0, z, .01); const fl = new T.Mesh(new T.BoxGeometry(.4, .24, .02), new T.MeshBasicMaterial({ color: 0xf2a529 })); fl.position.set(x + .22, .85, z); foundation.add(fl); });
    const c = cvs(512, 128, (x, W, Hh) => { x.font = 'bold 56px Poppins, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.lineWidth = 12; x.strokeStyle = '#6B4A2E'; x.strokeText('Your house goes here', W / 2, Hh / 2); x.fillStyle = '#fff'; x.fillText('Your house goes here', W / 2, Hh / 2); });
    const tx = toTex(c); const sp = new T.Mesh(new T.PlaneGeometry(4, 1), new T.MeshBasicMaterial({ map: tx, transparent: true, depthWrite: false })); sp.rotation.x = -Math.PI / 2; sp.position.set((x0 + x1) / 2, .06, (z0 + z1) / 2); foundation.add(sp); foundation.userData.label = sp;
    root.add(foundation);
  }

  // ---------------------------------------------------------------- terrain & surroundings
  let tGarden, tBeach, tCur = 'garden';
  function buildTerrain() {
    tGarden = new T.Group(); root.add(tGarden); const _root = tGarden;
    scene.fog = new T.Fog(0xcfe9ff, 60, 170);
    const lawnTex = toTex(cvs(512, 512, (x, w, h) => { const R = rand(4); x.fillStyle = '#7cbc5f'; x.fillRect(0, 0, w, h); for (let i = 0; i < 40; i++) { x.fillStyle = `rgba(${R() > .5 ? '255,255,200' : '20,70,20'},.06)`; x.beginPath(); x.arc(R() * w, R() * h, 20 + R() * 50, 0, 7); x.fill(); } for (let i = 0; i < 3000; i++) { x.strokeStyle = R() > .5 ? '#6fb054' : '#8cca6f'; x.lineWidth = 1.3; const px = R() * w, py = R() * h; x.beginPath(); x.moveTo(px, py); x.lineTo(px + (R() - .5) * 5, py - 3 - R() * 5); x.stroke(); } }), true); lawnTex.repeat.set(30, 30); lawnTex.anisotropy = 8;
    const ground = new T.Mesh(new T.PlaneGeometry(300, 300), new T.MeshStandardMaterial({ map: lawnTex, roughness: 1 })); ground.rotation.x = -Math.PI / 2; ground.position.y = -.02; ground.receiveShadow = true; _root.add(ground);
    // plot: checkered lawn
    const pt = toTex(cvs(N * 32, N * 32, (x, w, h) => { for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) { x.fillStyle = (i + j) % 2 ? '#8ccf6a' : '#82c561'; x.fillRect(i * 32, j * 32, 32, 32); } const R = rand(11); for (let i = 0; i < 2500; i++) { x.strokeStyle = R() > .5 ? 'rgba(60,120,40,.5)' : 'rgba(180,230,140,.5)'; x.beginPath(); const px = R() * w, py = R() * h; x.moveTo(px, py); x.lineTo(px + (R() - .5) * 4, py - 3 - R() * 4); x.stroke(); } })); pt.anisotropy = 8;
    const plot = new T.Mesh(new T.PlaneGeometry(N, N), new T.MeshStandardMaterial({ map: pt, roughness: 1 })); plot.rotation.x = -Math.PI / 2; plot.position.set(N / 2, 0, N / 2); plot.receiveShadow = true; _root.add(plot); W3.plot = plot; W3.plotTex = pt;
    const cb = (x, z, w, d, c, hgt = .12) => box(_root, w, hgt, d, M(c, { r: 1 }), x, -.02, z, .02);
    cb(N / 2, -1.1, N + 4.4, .22, '#b9b3a6'); cb(N / 2, N + 1.1, N + 4.4, .22, '#b9b3a6'); cb(-1.1, N / 2, .22, N + 2.4, '#b9b3a6'); cb(N + 1.1, N / 2, .22, N + 2.4, '#b9b3a6');
    const walk = new T.Mesh(new T.PlaneGeometry(300, 1.8), M('#d3ccbf', { r: 1 })); walk.rotation.x = -Math.PI / 2; walk.position.set(0, -.01, N + 2.1); walk.receiveShadow = true; _root.add(walk);
    const road = new T.Mesh(new T.PlaneGeometry(300, 4.6), M('#5c6068', { r: 1 })); road.rotation.x = -Math.PI / 2; road.position.set(0, -.015, N + 5.2); road.receiveShadow = true; _root.add(road);
    for (let i = -18; i < 18; i++) { const d = new T.Mesh(new T.PlaneGeometry(1.2, .14), M('#f1ead2', { r: 1 })); d.rotation.x = -Math.PI / 2; d.position.set(i * 2.6, -.005, N + 5.2); _root.add(d); }
    // hills & trees
    const hill = (z, y, c, seed, hgt) => { const t = toTex(cvs(1024, 256, (x, w, h) => { const R = rand(seed); x.fillStyle = c; x.beginPath(); x.moveTo(0, h); for (let i = 0; i <= 16; i++) x.lineTo(w * i / 16, h * (.35 + R() * .3)); x.lineTo(w, h); x.fill(); })); const m = new T.Mesh(new T.PlaneGeometry(220, hgt), new T.MeshBasicMaterial({ map: t, transparent: true, fog: true })); m.position.set(N / 2, y, z); _root.add(m); return m; };
    hill(-58, 10, '#9ccd8a', 11, 22); hill(-46, 7, '#86c27a', 5, 15);
    const R = rand(7);
    for (let i = 0; i < 46; i++) { let x = -16 + R() * (N + 32), z = -14 + R() * (N + 18); if (x > -3.5 && x < N + 3.5 && z > -3.5 && z < N + 8) continue; const tr = grp(_root, x, 0, z); const k = R(); if (k < .5) { cyl(tr, .16, .22, 1.2, M('#7a5233', { r: 1 }), 0, 0, 0, 8); sph(tr, 1 + R() * .5, M(shade('#5aa34a', (R() - .5) * .3), { r: .95 }), 0, 1.7, 0, 1, .95, 1, 12); } else if (k < .8) { for (let j = 0; j < 4; j++) { const c = new T.Mesh(new T.ConeGeometry(1.0 - j * .2, 1, 12), M(shade('#2f7d52', (j % 2) * .06), { r: .95 })); c.position.y = 1 + j * .6; c.castShadow = true; tr.add(c); } } else { sph(tr, .5 + R() * .3, M('#4e9e4a', { r: .95 }), 0, .4, 0, 1, .8, 1, 10); } }
    for (let x = -8; x < N + 9; x += 4) { const lp = grp(_root, x + .5, 0, N + 1.3); P_lamp(lp); }
    const mb = grp(_root, N - .6, 0, N + 1.2); PB.mailbox(mb, '#D63E3E');
  }

  // ---------------------------------------------------------------- themes (properties): garden (default) and beach
  function buildBeach() {
    tBeach = new T.Group(); tBeach.visible = false; root.add(tBeach);
    const sandTex = toTex(cvs(512, 512, (x, w, h) => { const R = rand(14); x.fillStyle = '#ead9a8'; x.fillRect(0, 0, w, h); for (let i = 0; i < 5000; i++) { x.fillStyle = R() > .5 ? 'rgba(255,255,255,.35)' : 'rgba(150,120,60,.25)'; x.fillRect(R() * w, R() * h, 2, 2); } }), true); sandTex.repeat.set(20, 20);
    const g = new T.Mesh(new T.PlaneGeometry(300, 300), new T.MeshStandardMaterial({ map: sandTex, roughness: 1 })); g.rotation.x = -Math.PI / 2; g.position.y = -.025; g.receiveShadow = true; tBeach.add(g);
    const plotT = toTex(cvs(N * 32, N * 32, (x, w, h) => { const R = rand(15); for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) { x.fillStyle = (i + j) % 2 ? '#f1e2b4' : '#ecdba8'; x.fillRect(i * 32, j * 32, 32, 32); } for (let i = 0; i < 3000; i++) { x.fillStyle = R() > .5 ? 'rgba(255,255,255,.4)' : 'rgba(150,120,60,.25)'; x.fillRect(R() * w, R() * h, 2, 2); } }));
    const pl = new T.Mesh(new T.PlaneGeometry(N, N), new T.MeshStandardMaterial({ map: plotT, roughness: 1 })); pl.rotation.x = -Math.PI / 2; pl.position.set(N / 2, 0, N / 2); pl.receiveShadow = true; tBeach.add(pl);
    const sea = new T.Mesh(new T.PlaneGeometry(300, 90), new T.MeshStandardMaterial({ color: '#3fb6e8', roughness: .15, metalness: .1, transparent: true, opacity: .92 })); sea.rotation.x = -Math.PI / 2; sea.position.set(N / 2, -.015, N + 52); tBeach.add(sea);
    const foam = new T.Mesh(new T.PlaneGeometry(300, 1.4), new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .75 })); foam.rotation.x = -Math.PI / 2; foam.position.set(N / 2, -.01, N + 7.4); tBeach.add(foam); tBeach.userData.foam = foam;
    const R = rand(33);
    for (let i = 0; i < 18; i++) { const x = -14 + R() * (N + 28), z = -10 + R() * 14; if (x > -2 && x < N + 2 && z > -2) continue; const pm = grp(tBeach, x, 0, z); const lean = (R() - .5) * .3; const tr = cyl(pm, .12, .18, 3.2, M('#9a7650', { r: 1 }), 0, 0, 0, 8); tr.rotation.z = lean; tr.position.x = -lean * 1.6; for (let k = 0; k < 7; k++) { const a = k * .9; const lf = box(pm, .16, .05, 1.7, M('#3f9e4a', { r: .9 }), Math.cos(a) * .9 - lean * 3.2, 3.15, Math.sin(a) * .9, .02); lf.rotation.y = -a + Math.PI / 2; lf.rotation.x = .5; } }
    for (let i = 0; i < 4; i++) { const u = grp(tBeach, 3 + i * 2.6, 0, N + 4.2 + (i % 2) * .8); cyl(u, .03, .03, 1.9, M('#eee'), 0, 0, 0, 6); const cn = new T.Mesh(new T.ConeGeometry(.95, .5, 10), M(['#e63946', '#f4a261', '#2a9d8f', '#ffd166'][i], { r: .8 })); cn.position.y = 1.95; cn.castShadow = true; u.add(cn); }
    const hills = new T.Mesh(new T.PlaneGeometry(220, 12), new T.MeshBasicMaterial({ color: 0xa9d6e8, fog: true })); hills.position.set(N / 2, 4, -70); tBeach.add(hills);
  }
  W3.setTheme = (name) => { tCur = name; const beach = name === 'beach'; tGarden.visible = !beach; tBeach.visible = beach; W3.theme = name; dirty = 3; };
  const P_lamp = (g) => PB.lamp_post(g, '#3A3D52');

  // ---------------------------------------------------------------- grid, highlight, ghost
  function gridRefresh() {
    if (!gridLines) return; gridLines.visible = W3.mode === 'build'; if (!gridLines.visible) return;
    const lv = W3.level; gridLines.position.y = lv * H + .045; gridLines.material.color.set(lv ? 0x6FB5FF : 0xffffff); gridLines.material.opacity = lv ? .8 : .55;
  }
  function buildGrid() { const pts = []; for (let i = 0; i <= N; i++) { pts.push(i, 0, 0, i, 0, N, 0, 0, i, N, 0, i); } const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pts, 3)); gridLines = new T.LineSegments(g, new T.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: .55, depthWrite: false })); gridLines.visible = false; root.add(gridLines); }
  function outline(poly, y, col) { const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(poly.flatMap(([x, z]) => [x, y, z]), 3)); const l = new T.LineLoop(g, new T.LineBasicMaterial({ color: col, linewidth: 3, depthTest: false, transparent: true })); l.renderOrder = 50; return l; }
  function highlight(o, col = 0xFFD166) {
    if (hi) { root.remove(hi); hi = null; } if (!o) return; const P = PART[o.part], y = baseY(o) + (P.kind === 'wall' ? 0.05 : .08), grpH = new T.Group();
    if (P.kind === 'wall') { const e = EDGE[o.rot], cx = o.x + .5 + e[0], cz = o.z + .5 + e[1]; const a = o.rot % 2 ? [[cx, cz - .5], [cx, cz + .5]] : [[cx - .5, cz], [cx + .5, cz]]; grpH.add(outline([a[0], a[1], [a[1][0] + .001, a[1][1] + .001], [a[0][0] + .001, a[0][1] + .001]], y + .02, col)); grpH.add(outline([a[0], a[1], a[1], a[0]], y + H, col)); const gm = new T.BufferGeometry(); gm.setAttribute('position', new T.Float32BufferAttribute([a[0][0], y, a[0][1], a[0][0], y + H, a[0][1], a[1][0], y, a[1][1], a[1][0], y + H, a[1][1]], 3)); const ln = new T.LineSegments(gm, new T.LineBasicMaterial({ color: col, depthTest: false })); ln.renderOrder = 50; grpH.add(ln); }
    else { const [fw, fd] = footprint(o.part, o.rot); grpH.add(outline([[o.x, o.z], [o.x + fw, o.z], [o.x + fw, o.z + fd], [o.x, o.z + fd]], y, col)); }
    hi = grpH; root.add(hi); dirty = 2;
  }
  W3.highlight = highlight;

  // ---------------------------------------------------------------- placement rules (ported from the original world scene)
  W3.canPlace = (c) => {
    W3.blockedByDebris = false; const P = PART[c.part]; if (!P) return false;
    const others = W3.layout.filter(o => o.lvl === c.lvl && (!c.id || o.id !== c.id));
    if (P.kind === 'wall') {
      if (c.x < 0 || c.z < 0 || c.x >= N || c.z >= N) return false;
      const key = (o) => { const e = EDGE[o.rot]; return `${(o.x + .5 + e[0]).toFixed(1)},${(o.z + .5 + e[1]).toFixed(1)}`; };
      const k = key(c), hit = others.filter(o => PART[o.part].kind === 'wall' && key(o) === k); c.replace = null;
      if (hit.length === 1 && P.cat === 'openings' && PART[hit[0].part].cat === 'walls') { c.replace = hit[0]; return true; }
      return !hit.length;
    }
    const cells = cellsOf(c); if (cells.some(([x, z]) => x < 0 || z < 0 || x >= N || z >= N)) return false;
    if (c.lvl === 0 && P.kind !== 'roof' && cells.some(([x, z]) => debrisAt(x, z))) { W3.blockedByDebris = true; return false; }
    const layer = (p) => p.kind === 'item' ? (p.layer || 'item') : p.kind, L = layer(P);
    return !others.some(o => { const Q = PART[o.part]; if (Q.kind === 'wall' || layer(Q) !== L) return false; return cellsOf(o).some(([a, b]) => cells.some(([x, z]) => a === x && b === z)); });
  };

  // ---------------------------------------------------------------- debris to clear in chapter 1
  const DEBRIS_SPOTS = [[3, 3, 'crate'], [8, 3, 'rubble'], [5, 5, 'barrel'], [7, 7, 'planks'], [4, 7, 'tire'], [9, 6, 'crate'], [6, 4, 'rubble'], [3, 5, 'weeds']];
  W3.DEBRIS = DEBRIS_SPOTS; W3.debris = []; let debrisGroup;
  function debrisModel(k, seed) {
    const g = new T.Group(), R = rand(seed * 7 + 3);
    if (k === 'crate') { box(g, .6, .5, .6, M('#a77d4d', { r: 1 }), 0, 0, 0, .03).rotation.y = R(); box(g, .5, .35, .5, M('#946c3f', { r: 1 }), .08, .5, .0, .03).rotation.y = R() + .4; }
    else if (k === 'rubble') { for (let i = 0; i < 8; i++) { const sz = .12 + R() * .2; const r = sph(g, sz, M(shade('#8e8a82', (R() - .5) * .3), { r: 1 }), (R() - .5) * .7, sz * .6, (R() - .5) * .7, 1, .7, 1, 6); r.rotation.set(R(), R(), R()); } }
    else if (k === 'barrel') { cyl(g, .28, .3, .7, M('#7b4a2a', { r: .9 }), 0, 0, 0, 14); [.12, .5].forEach(y => cyl(g, .31, .31, .04, M('#55575c', { m: .6 }), 0, y, 0, 14)); }
    else if (k === 'planks') { for (let i = 0; i < 5; i++) { const pl = box(g, 1.0, .05, .14, M('#8b6a47', { r: 1 }), (R() - .5) * .2, i * .05, (i - 2) * .17, .01); pl.rotation.y = (R() - .5) * .6; } }
    else if (k === 'tire') { const t = new T.Mesh(new T.TorusGeometry(.28, .12, 8, 16), M('#222', { r: 1 })); t.rotation.x = Math.PI / 2; t.position.y = .13; t.castShadow = true; g.add(t); }
    else { for (let i = 0; i < 10; i++) { const w = cyl(g, .01, .03, .5 + R() * .4, M(shade('#6d8f3a', (R() - .5) * .3), { r: 1 }), (R() - .5) * .7, 0, (R() - .5) * .7, 5); w.rotation.z = (R() - .5) * .6; } }
    return g;
  }
  W3.setDebris = (idx) => { if (!debrisGroup) { debrisGroup = new T.Group(); root.add(debrisGroup); } while (debrisGroup.children.length) debrisGroup.remove(debrisGroup.children[0]); W3.debris = idx.slice(); idx.forEach(i => { const [x, z, k] = DEBRIS_SPOTS[i]; const m = debrisModel(k, i + 1); m.position.set(x + .5, 0, z + .5); m.rotation.y = i; m.userData.debris = i; debrisGroup.add(m); }); dirty = 3; };
  W3.clearDebris = (i) => { const m = debrisGroup && debrisGroup.children.find(c => c.userData.debris === i); if (!m) return; debrisGroup.remove(m); W3.debris = W3.debris.filter(d => d !== i); const [x, z] = DEBRIS_SPOTS[i]; puff({ part: 'chair', x, z, rot: 0, lvl: 0 }); dirty = 3; };
  const debrisAt = (x, z) => W3.debris.some(i => DEBRIS_SPOTS[i][0] === x && DEBRIS_SPOTS[i][1] === z);
  // ---------------------------------------------------------------- picking
  const ray = new T.Raycaster(), ndc = new T.Vector2(), plane = new T.Plane(new T.Vector3(0, 1, 0), 0);
  function setRay(cx, cy) { const r = renderer.domElement.getBoundingClientRect(); const x = (cx - r.left), y = (cy - r.top); ndc.set((x / r.width) * 2 - 1, -(y / r.height) * 2 + 1); ray.setFromCamera(ndc, camera); }
  W3.cellAt = (cx, cy, kind) => { setRay(cx, cy); const h = W3.level * H + (kind === 'roof' ? H : 0); plane.constant = -h; const p = new T.Vector3(); if (!ray.ray.intersectPlane(plane, p)) return { x: -9, z: -9, cx: -9, cz: -9 }; return { x: p.x, z: p.z, cx: Math.floor(p.x), cz: Math.floor(p.z) }; };
  W3.pick = (cx, cy) => {
    setRay(cx, cy); const list = []; objs.forEach(e => { if (!e.g.visible) return; const o = e.o; if (W3.mode === 'build' && !(o.lvl === W3.level || (PART[o.part].kind === 'roof' && o.lvl === W3.level))) return; if ((e.a ?? 1) < .2 && !(PART[o.part].kind === 'roof' && (e.a ?? 1) > 0)) return; list.push(e.g); });
    const hits = ray.intersectObjects(list, true); for (const h of hits) { let m = h.object; while (m && !m.userData.oid) m = m.parent; if (m) { const e = objs.get(m.userData.oid); if (e) return e.o; } } return null;
  };

  // ---------------------------------------------------------------- ghost preview
  function ghostify(g, ok) {
    g.traverse(m => { if (!m.isMesh) return; const cl = (x) => { const c = x.clone(); c.transparent = true; c.opacity = .72; c.depthWrite = false; if (c.color) c.color.lerp(new T.Color(ok ? 0xbfffc0 : 0xff6b6b), ok ? .12 : .55); if (c.emissive) { c.emissive.set(ok ? 0x103010 : 0x601010); c.emissiveIntensity = .5; } return c; }; m.material = Array.isArray(m.material) ? m.material.map(cl) : cl(m.material); m.castShadow = false; });
  }
  W3.showGhost = (c) => {
    if (W3.ghost) { objGroup.remove(W3.ghost.g); W3.ghost = null; } const ok = W3.canPlace(c), g = buildPartModel(c), P = PART[c.part], h = new T.Group(); h.add(g);
    const [cx, cz] = centerOf(c); h.position.set(cx, baseY(c), cz); if (P.kind !== 'wall') h.rotation.y = -c.rot * Math.PI / 2; ghostify(h, ok); objGroup.add(h); W3.ghost = { g: h, ok }; W3.ghostCand = c; highlight(c, ok ? 0x7DDB6A : 0xFF5A5A); dirty = 2;
  };
  W3.cancelGhostOnly = () => { if (W3.ghost) { objGroup.remove(W3.ghost.g); W3.ghost = null; } W3.ghostCand = null; highlight(null); };
  W3.startPlace = (part, moving) => { W3.deselect(); W3.place = { part, moving: moving || null, rot: moving ? moving.rot : W3.pendingRot }; W3.cancelGhostOnly(); W3.applyAlpha(); };
  W3.cancelPlace = () => { W3.place = null; W3.cancelGhostOnly(); W3.applyAlpha(); };
  W3.rotatePlace = () => {
    if (W3.place) { W3.place.rot = (W3.place.rot + 1) % 4; W3.pendingRot = W3.place.rot; if (W3.ghostCand) { W3.ghostCand.rot = W3.place.rot; W3.showGhost(W3.ghostCand); } return true; }
    if (W3.selected) { const o = W3.selected, old = o.rot; let tries = 0; do { o.rot = (o.rot + 1) % 4; tries++; } while (!W3.canPlace(o) && tries < 4); if (tries >= 4 && !W3.canPlace(o)) { o.rot = old; W3.cb.sfx && W3.cb.sfx('bad'); return false; } drawObj(o); W3.applyAlpha(); highlight(o); W3.cb.rotated && W3.cb.rotated(o, old); W3.cb.changed && W3.cb.changed(); return true; }
    return false;
  };
  W3.confirmGhost = () => {
    const c = W3.ghostCand; if (!c || !W3.canPlace(c)) { if (!W3._dragPaint) W3.cb.sfx && W3.cb.sfx('bad'); if (c && W3.blockedByDebris) { W3.blockedByDebris = false; W3.cb.blocked && W3.cb.blocked('debris'); } if (c && PART[c.part].kind !== 'item') setTimeout(() => { if (W3.ghostCand === c) W3.cancelGhostOnly(); }, 350); return false; }
    if (W3.place.moving) { const o = W3.place.moving; Object.assign(o, { x: c.x, z: c.z, rot: c.rot, lvl: c.lvl }); o.hidden = false; W3.cancelPlace(); W3.redraw(); W3.cb.changed && W3.cb.changed(); W3.cb.moved && W3.cb.moved(o); return true; }
    const rep = c.replace; delete c.replace; const ok = W3.cb.place ? W3.cb.place(c, rep) : false; if (!ok) return false;
    if (rep) { const e = objs.get(rep.id); if (e) { objGroup.remove(e.g); objs.delete(rep.id); } }
    drawObj(c); if (PART[c.part].kind === 'roof') refreshRoofs(); W3.applyAlpha(); puff(c); W3.cancelGhostOnly(); return true;
  };
  function puff(o) { const [cx, cz] = centerOf(o), y = baseY(o) + .4; for (let i = 0; i < 9; i++) { const s = new T.Sprite(new T.SpriteMaterial({ map: RENO.glowTex(), color: 0xffffff, transparent: true, opacity: .8, depthWrite: false })); s.position.set(cx + (Math.random() - .5) * .8, y + Math.random() * .6, cz + (Math.random() - .5) * .8); s.scale.setScalar(.4); root.add(s); fx.push({ s, t: 0, v: [(Math.random() - .5) * .8, .5 + Math.random() * .6, (Math.random() - .5) * .8] }); } }
  const fx = [];
  W3.select = (o) => { W3.selected = o; highlight(o); W3.cb.selected && W3.cb.selected(o); };
  W3.deselect = () => { if (W3.selected) { W3.selected = null; highlight(null); W3.cb.selected && W3.cb.selected(null); } };
  W3.removeSelected = () => { const o = W3.selected; if (!o) return null; W3.deselect(); const e = objs.get(o.id); if (e) { objGroup.remove(e.g); objs.delete(o.id); } const i = W3.layout.indexOf(o); if (i >= 0) W3.layout.splice(i, 1); if (PART[o.part].kind === 'roof') { refreshRoofs(); W3.applyAlpha(); } W3.cb.changed && W3.cb.changed(); return o; };
  W3.moveSelected = () => { const o = W3.selected; if (!o) return; o._prev = { x: o.x, z: o.z, rot: o.rot, lvl: o.lvl }; W3.deselect(); const e = objs.get(o.id); if (e) setAlpha(e, .25); W3.startPlace(o.part, o); };
  W3.paintSelected = (col) => { const o = W3.selected; if (!o) return; o.color = col; drawObj(o); W3.applyAlpha(); highlight(o); };

  // ---------------------------------------------------------------- tap handling (same rules as the original)
  W3.tap = (cx, cy) => {
    if (debrisGroup && debrisGroup.children.length && !W3.place) { setRay(cx, cy); const dh = ray.intersectObjects(debrisGroup.children, true); if (dh.length) { let m = dh[0].object; while (m && m.userData.debris === undefined) m = m.parent; if (m) { W3.cb.tapDebris && W3.cb.tapDebris(m.userData.debris); return; } } }
    if (W3.mode !== 'build') { for (const c of W3.chars) { if (!c.m || !c.m.visible) continue; setRay(cx, cy); const hit = ray.intersectObject(c.m, true); if (hit.length) { W3.cb.tapChar && W3.cb.tapChar(c.kind, c); bounceChar(c); return; } } return; }
    if (W3.place) {
      const kind = PART[W3.place.part].kind, cell = W3.cellAt(cx, cy, kind);
      const c = { part: W3.place.part, x: cell.cx, z: cell.cz, lvl: W3.level, rot: W3.place.rot, color: W3.place.moving ? W3.place.moving.color : PART[W3.place.part].color, id: W3.place.moving ? W3.place.moving.id : null };
      if (kind === 'wall') { const fx_ = cell.x - cell.cx, fz = cell.z - cell.cz, d = [fz, 1 - fx_, 1 - fz, fx_]; c.rot = d.indexOf(Math.min(...d)); }
      if (kind === 'item' || kind === 'roof') { const [fw, fd] = footprint(c.part, c.rot); c.x = Math.round(cell.x - fw / 2); c.z = Math.round(cell.z - fd / 2); }
      if (kind === 'roof' && PART[c.part].cat === 'roof' && c.part !== 'roof_flat' && c.part !== 'roof_rail' && !W3.pendingRotSet) { /* keep player's rotation */ }
      const same = W3.ghostCand && W3.ghostCand.x === c.x && W3.ghostCand.z === c.z && W3.ghostCand.rot === c.rot, quick = !W3.place.moving && (kind === 'floor' || kind === 'wall' || kind === 'roof');
      W3.showGhost(c); if (quick || same) W3.confirmGhost(); else W3.cb.ghost && W3.cb.ghost(c, W3.ghost.ok); return;
    }
    const o = W3.pick(cx, cy); if (o) { W3.cb.sfx && W3.cb.sfx('tick'); W3.select(o); } else W3.deselect();
  };

  // ---------------------------------------------------------------- modes, camera
  W3.setMode = (m) => { W3.mode = m; if (m !== 'build') { W3.cancelPlace(); W3.deselect(); } gridRefresh(); W3.applyAlpha(); };
  W3.setLevel = (l) => { W3.level = l; gridRefresh(); W3.applyAlpha(); W3.cancelGhostOnly(); };
  W3.rotateView = () => { W3.view = (W3.view + 1) % 4; goal.yaw += Math.PI / 2; };
  W3.zoomBy = (f) => { const n = W3._fit || 24; goal.dist = clamp(goal.dist / f, n * .3, n * 1.5); };
  W3._goal = goal; W3.focus = (offsetY = 0, offsetX = 0) => { goal.sy = offsetY; goal.sx = offsetX; };
  W3.fitCamera = (reset) => { const t = Math.tan(FOV * Math.PI / 360), build = W3.mode === 'build', availW = Math.max(120, Wd - (W3._insetW || 0)), asp = availW / Hd, plot = build ? 18 : 16; const need = Math.max(plot / (2 * t * asp), (build ? 18 : 16.5) / (2 * t)); W3._fit = need; if (reset) { goal.dist = need; goal.tx = N / 2; goal.tz = N / 2 + .5; goal.ty = 1; if (reset === 'now') cam.dist = need; } };
  W3.setInset = (w) => { W3._insetW = w; W3.fitCamera(true); };

  W3.focusRoom = (cells, lvl) => { const xs = cells.map(c => c[0]), zs = cells.map(c => c[1]), x0 = Math.min(...xs), x1 = Math.max(...xs) + 1, z0 = Math.min(...zs), z1 = Math.max(...zs) + 1; goal.tx = (x0 + x1) / 2; goal.tz = (z0 + z1) / 2 + .6; goal.ty = lvl * H + .5; const span = Math.max(x1 - x0, z1 - z0, 4); const n = W3._fit || 24; goal.dist = clamp(span * 3.3 + 4, n * .22, n * 1.2); };
  W3.resetFocus = () => { goal.ty = 1; W3.fitCamera(true); };
  W3.shot = (cells, lvl, w = 320, h = 220) => {
    if (!renderer) return null; const sv = { cam: Object.assign({}, cam), W: Wd, H: Hd, pr: renderer.getPixelRatio(), i: W3.interior, vl: W3._vl, m: W3.mode };
    try {
      W3.interior = true; W3._vl = lvl; W3.mode = 'view'; W3.applyAlpha();
      renderer.setPixelRatio(1); renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); Wd = w; Hd = h;
      const xs = cells.map(c => c[0]), zs = cells.map(c => c[1]), x0 = Math.min(...xs), x1 = Math.max(...xs) + 1, z0 = Math.min(...zs), z1 = Math.max(...zs) + 1, span = Math.max(x1 - x0, z1 - z0, 3), dist = span * 2.6 + 4, pit = 1.0, yaw = Math.PI / 4;
      const tx = (x0 + x1) / 2, tz = (z0 + z1) / 2, ty = lvl * H + .3; camera.position.set(tx + dist * Math.sin(yaw) * Math.cos(pit), ty + dist * Math.sin(pit), tz + dist * Math.cos(yaw) * Math.cos(pit)); camera.lookAt(tx, ty, tz); camera.clearViewOffset(); renderer.shadowMap.needsUpdate = true;
      const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); const gr = x.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#9fd6f5'); gr.addColorStop(1, '#e3f5ff'); x.fillStyle = gr; x.fillRect(0, 0, w, h); renderer.render(scene, camera); x.drawImage(renderer.domElement, 0, 0, w, h); return c.toDataURL('image/jpeg', .8);
    } finally { renderer.setPixelRatio(sv.pr); Wd = sv.W; Hd = sv.H; renderer.setSize(Wd, Hd, false); camera.aspect = Wd / Hd; camera.updateProjectionMatrix(); W3.interior = sv.i; W3._vl = sv.vl; W3.mode = sv.m; W3.applyAlpha(); dirty = 2; }
  };
  W3.toScreen = (x, z, h = 0) => { const v = new T.Vector3(x, h, z).project(camera); return [(v.x * .5 + .5) * Wd, (-v.y * .5 + .5) * Hd]; };
  W3.snapshot = (cb) => { try { renderer.render(scene, camera); const src = renderer.domElement, c = document.createElement('canvas'), w = 360, h = Math.round(src.height * w / src.width); c.width = w; c.height = h; const x = c.getContext('2d'); const gr = x.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#7EC8F8'); gr.addColorStop(1, '#E3F5FF'); x.fillStyle = gr; x.fillRect(0, 0, w, h); x.drawImage(src, 0, 0, w, h); cb(c.toDataURL('image/jpeg', .8)); } catch (e) { cb(null); } };

  // ---------------------------------------------------------------- night & glow
  function applyNightTo(g) {
    g.traverse(o => { if (o.userData && o.userData.emissives) o.userData.emissives.forEach(m => { m.emissiveIntensity = nightK * 1.1; }); if (o.isSprite && o.userData.glow) o.material.opacity = nightK * .85; if (o.isMesh && o.userData.glass) { /* windows glow */ } });
  }
  function nightAll() {
    hemi.intensity = T.MathUtils.lerp(1.35, 1.0, nightK); sun.intensity = T.MathUtils.lerp(2.5, .85, nightK); sun.color.setHex(0xfff1d6).lerp(new T.Color(0x9fb4ff), nightK); hemi.color.setHex(0xfff4e2).lerp(new T.Color(0x8294d8), nightK);
    glassMat && (glassMat.emissive = new T.Color(0xffc870), glassMat.emissiveIntensity = nightK * .9, glassMat.opacity = .28 + nightK * .25);
    objs.forEach(e => applyNightTo(e.g)); renderer.toneMappingExposure = 1.05 - nightK * .02; scene.fog.color.setHex(nightK > .5 ? 0x1c2450 : 0xcfe9ff); dirty = 2;
  }
  W3.setNight = (n) => { W3.night = !!n; };

  // ---------------------------------------------------------------- characters
  function mkChar(kind) {
    const g = new T.Group();
    if (kind === 'ben') {
      const skin = M('#f2c9a0', { r: .6 }), shirt = M('#3f8fe0', { r: .8 }), jeans = M('#2b3a67', { r: .8 }), hair = M('#5a3a22', { r: .7 });
      const legL = grp(g, -.09, .42, 0), legR = grp(g, .09, .42, 0); [legL, legR].forEach(l => { box(l, .13, .42, .14, jeans, 0, -.42, 0, .05); box(l, .14, .08, .2, M('#222'), 0, -.42, .03, .03); });
      box(g, .38, .5, .22, shirt, 0, .4, 0, .08); const armL = grp(g, -.26, .85, 0), armR = grp(g, .26, .85, 0); [armL, armR].forEach(a => { box(a, .1, .42, .1, shirt, 0, -.38, 0, .04); sph(a, .06, skin, 0, -.42, 0); });
      sph(g, .19, skin, 0, 1.08, 0, 1, 1.05, 1, 16); sph(g, .2, hair, 0, 1.16, -.03, 1, .75, 1, 14); sph(g, .03, M('#222'), -.07, 1.1, .17, 1, 1, .5, 6); sph(g, .03, M('#222'), .07, 1.1, .17, 1, 1, .5, 6);
      box(g, .22, .14, .12, M('#8a5a2b'), .0, .4, .0, 0).visible = false; g.userData.limbs = [legL, legR, armL, armR]; g.scale.setScalar(.95);
    } else {
      const fur = M('#f0963c', { r: .9 }), light = M('#fbe3c0', { r: .9 });
      box(g, .22, .2, .46, fur, 0, .16, 0, .09); const head = grp(g, 0, .34, .27); sph(head, .13, fur, 0, 0, 0, 1, .95, .95, 14); [-1, 1].forEach(s => { const e = new T.Mesh(new T.ConeGeometry(.045, .1, 4), fur); e.position.set(s * .07, .13, 0); e.castShadow = true; head.add(e); sph(head, .02, M('#222'), s * .05, .02, .12, 1, 1, .5, 6); }); sph(head, .03, M('#f6a1a8'), 0, -.03, .125, 1, .7, .6, 6);
      const tail = grp(g, 0, .2, -.25); const tl = box(tail, .05, .05, .3, fur, 0, 0, -.14, .02); tl.rotation.x = -.5; g.userData.tail = tail;
      const legs = []; [[-.08, .16], [.08, .16], [-.08, -.16], [.08, -.16]].forEach(([x, z]) => { const l = grp(g, x, .1, z); box(l, .06, .12, .06, light, 0, -.1, 0, .02); legs.push(l); }); g.userData.limbs = legs; g.scale.setScalar(1.0);
    }
    g.traverse(m => { if (m.isMesh) m.castShadow = true; }); return g;
  }
  const edgeBlocked = (x, z, dir) => { // dir 0..3 = N,E,S,W ; walls/windows/fences block, doors/arches/gates do not
    const e = EDGE[dir]; const ex = x + .5 + e[0], ez = z + .5 + e[1];
    return W3.layout.some(o => { if (o.lvl !== 0) return false; const P = PART[o.part]; if (P.kind !== 'wall') return false; if (['door_wood', 'door_glass', 'arch', 'gate'].includes(o.part)) return false; const f = EDGE[o.rot]; return Math.abs(o.x + .5 + f[0] - ex) < .01 && Math.abs(o.z + .5 + f[1] - ez) < .01; });
  };
  const blockedCell = (x, z) => W3.layout.some(o => o.lvl === 0 && PART[o.part].kind === 'item' && PART[o.part].layer !== 'rug' && cellsOf(o).some(([a, b]) => a === x && b === z));
  function reachable(sx, sz) { const seen = new Set([sx + ',' + sz]), q = [[sx, sz, []]], out = []; const D = [[0, -1], [1, 0], [0, 1], [-1, 0]]; while (q.length) { const [x, z, path] = q.shift(); if (path.length) out.push(path); if (path.length > 9) continue; for (let d = 0; d < 4; d++) { const nx = x + D[d][0], nz = z + D[d][1], k = nx + ',' + nz; if (nx < 0 || nz < 0 || nx >= N || nz >= N || seen.has(k) || blockedCell(nx, nz) || edgeBlocked(x, z, d)) continue; seen.add(k); q.push([nx, nz, path.concat([[nx, nz]])]); } } return out; }
  W3.makeChar = (kind, x, z) => { const c = { kind, x: x + .5, z: z + .5, path: [], wait: 800 + Math.random() * 1500, speed: kind === 'tommy' ? 1.7 : 1.15, t: 0, dir: 0, m: null }; c.m = mkChar(kind); c.m.userData.char = c; root.add(c.m); placeChar(c); return c; };
  function placeChar(c) { const m = c.m; const y = (hasFloor(Math.floor(c.x), Math.floor(c.z), 0) ? FT : 0) + (c.hop || 0); m.position.set(c.x, y, c.z); m.rotation.y = c.dir; const L = m.userData.limbs, sw = c.moving ? Math.sin(c.t / 110) * .7 : 0; if (L) { if (c.kind === 'ben') { L[0].rotation.x = sw; L[1].rotation.x = -sw; L[2].rotation.x = -sw; L[3].rotation.x = sw; } else { L[0].rotation.x = sw; L[3].rotation.x = sw; L[1].rotation.x = -sw; L[2].rotation.x = -sw; } } if (m.userData.tail) m.userData.tail.rotation.y = Math.sin(performance.now() / 300) * .4; }
  function tickChars(dt) {
    W3.chars.forEach(c => {
      if (c.hop !== undefined && c.hopT > 0) { c.hopT -= dt; c.hop = Math.max(0, Math.sin((1 - c.hopT / 300) * Math.PI) * .22); if (c.hopT <= 0) c.hop = 0; }
      if (c.wait > 0) { c.wait -= dt; c.moving = false; if (c.wait <= 0) { const cx = Math.floor(c.x), cz = Math.floor(c.z), list = reachable(cx, cz); if (list.length && !blockedCell(cx, cz)) c.path = list[Math.floor(Math.random() * list.length)].slice(); else c.wait = 2000; } }
      else if (c.path.length) { const [tx, tz] = c.path[0], dx = tx + .5 - c.x, dz = tz + .5 - c.z, d = Math.hypot(dx, dz); if (d < .04) { c.path.shift(); if (!c.path.length) { c.wait = 1500 + Math.random() * 3500; c.moving = false; } } else { const st = Math.min(d, c.speed * dt / 1000); c.x += dx / d * st; c.z += dz / d * st; c.moving = true; c.t += dt; const want = Math.atan2(dx, dz); let df = want - c.dir; while (df > Math.PI) df -= 2 * Math.PI; while (df < -Math.PI) df += 2 * Math.PI; c.dir += df * Math.min(1, dt / 90); } }
      else { c.wait = 1200; c.moving = false; }
      placeChar(c);
    });
  }
  function bounceChar(c) { c.hop = 0; c.hopT = 300; }
  W3.bounceChar = bounceChar;
  W3.charBubble = (c, text) => { const p = W3.toScreen(c.x, c.z, 1.4), d = document.createElement('div'); d.className = 'cbub'; d.textContent = text; d.style.left = p[0] + 'px'; d.style.top = p[1] + 'px'; el.appendChild(d); setTimeout(() => d.remove(), 2400); };

  // ---------------------------------------------------------------- loop / init
  function resize() { const r = el.getBoundingClientRect(); Wd = Math.max(50, r.width | 0); Hd = Math.max(50, r.height | 0); renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2)); renderer.setSize(Wd, Hd, false); camera.aspect = Wd / Hd; camera.updateProjectionMatrix(); W3.fitCamera(false); dirty = 2; }
  function frame(t) {
    requestAnimationFrame(frame); if (!active) return; const dt = Math.min(.05, (t - last) / 1000 || .016); last = t;
    if ((W3.night ? 1 : 0) !== nightK) { nightK += ((W3.night ? 1 : 0) - nightK) * Math.min(1, dt * 4); if (Math.abs((W3.night ? 1 : 0) - nightK) < .01) nightK = W3.night ? 1 : 0; nightAll(); }
    const k = 1 - Math.exp(-dt * 7); ['tx', 'tz', 'dist', 'pitch', 'yaw', 'sx', 'sy'].forEach(p => cam[p] += (goal[p] - cam[p]) * k);
    const cp = Math.cos(cam.pitch); camera.position.set(cam.tx + cam.dist * Math.sin(cam.yaw) * cp, cam.ty + cam.dist * Math.sin(cam.pitch), cam.tz + cam.dist * Math.cos(cam.yaw) * cp); camera.lookAt(cam.tx, cam.ty, cam.tz);
    if (Math.abs(cam.sx) > .3 || Math.abs(cam.sy) > .3) camera.setViewOffset(Wd, Hd, -cam.sx, cam.sy, Wd, Hd); else camera.clearViewOffset();
    // yaw changes toggle which walls are "in front"
    const key = Math.round(((cam.yaw % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2) / (Math.PI / 2) * 4); if (key !== W3._yk) { W3._yk = key; if (W3.interior) W3.applyAlpha(); }
    tickChars(dt * 1000);
    for (let i = fx.length - 1; i >= 0; i--) { const f = fx[i]; f.t += dt; f.s.position.x += f.v[0] * dt; f.s.position.y += f.v[1] * dt; f.s.position.z += f.v[2] * dt; f.s.scale.setScalar(.4 + f.t * 1.6); f.s.material.opacity = Math.max(0, .8 - f.t * 1.4); if (f.t > .6) { root.remove(f.s); f.s.material.dispose(); fx.splice(i, 1); } }
    if (foundation && foundation.visible && foundation.userData.label) foundation.userData.label.position.y = .06;
    if (dirty > 0 || W3.chars.some(c => c.moving) || fx.length) { renderer.shadowMap.needsUpdate = true; if (dirty > 0) dirty--; }
    renderer.render(scene, camera); W3.cb.frame && W3.cb.frame();
  }
  W3.start = () => { if (!renderer) return; active = true; resize(); last = performance.now(); dirty = 3; };
  W3.stop = () => { active = false; };
  W3.init = (container) => {
    el = container; renderer = W3._renderer = new T.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance', preserveDrawingBuffer: false });
    renderer.setClearColor(0, 0); renderer.outputColorSpace = T.SRGBColorSpace; renderer.toneMapping = T.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05; renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFSoftShadowMap; renderer.shadowMap.autoUpdate = false;
    renderer.domElement.style.cssText = 'width:100%;height:100%;display:block;touch-action:none'; el.appendChild(renderer.domElement);
    scene = new T.Scene(); camera = W3._camera = new T.PerspectiveCamera(FOV, 1, .5, 400); root = new T.Group(); scene.add(root); objGroup = new T.Group(); root.add(objGroup);
    hemi = new T.HemisphereLight(0xfff4e2, 0x8b7d6a, 1.35); scene.add(hemi); sun = new T.DirectionalLight(0xfff1d6, 2.5); sun.position.set(-9, 18, 8); sun.target.position.set(N / 2, 0, N / 2); scene.add(sun, sun.target);
    sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); const sc = sun.shadow.camera; sc.left = -14; sc.right = 14; sc.top = 14; sc.bottom = -14; sc.near = 1; sc.far = 60; sun.shadow.bias = -.0006; sun.shadow.normalBias = .03; sun.shadow.radius = 2.5;
    buildTerrain(); buildBeach(); buildGrid(); buildFoundation();
    W3.chars = [W3.makeChar('ben', 5, 13 - 0), W3.makeChar('tommy', 7, 13 - 0)]; W3.chars[0].x = 5.5; W3.chars[0].z = 10.5; W3.chars[1].x = 7.5; W3.chars[1].z = 10.5;
    resize(); W3.fitCamera('now'); bindInput(); requestAnimationFrame(frame);
    new ResizeObserver(() => { if (active) resize(); }).observe(el);
    W3.ready = true; window.onWorldReady && window.onWorldReady();
  };
  // ---------------------------------------------------------------- room tool: drag a rectangle on the grid, translucent preview
  let roomPrev; W3.roomMode = false;
  W3.setRoomMode = (on) => { W3.roomMode = !!on; if (!on) W3.setRoomPreview(null); };
  W3.setRoomPreview = (r, ok, label) => {
    if (roomPrev) { root.remove(roomPrev); roomPrev = null; } dirty = 2; if (!r) return;
    const g = new T.Group(), w = r.x1 - r.x0, d = r.z1 - r.z0, y = W3.level * H, col = ok ? 0x58d86a : 0xff5a5a;
    const fl = new T.Mesh(new T.PlaneGeometry(w, d), new T.MeshBasicMaterial({ color: ok ? 0x37e05a : 0xff4040, transparent: true, opacity: .55, depthWrite: false })); fl.rotation.x = -Math.PI / 2; fl.position.set(r.x0 + w / 2, y + .08, r.z0 + d / 2); g.add(fl);
    const wm = new T.MeshBasicMaterial({ color: col, transparent: true, opacity: .2, depthWrite: false }), hh = H * .85, t = .12;
    [[w, t, r.x0 + w / 2, r.z0], [w, t, r.x0 + w / 2, r.z1], [t, d, r.x0, r.z0 + d / 2], [t, d, r.x1, r.z0 + d / 2]].forEach(([bw, bd, cx, cz]) => { const m = new T.Mesh(new T.BoxGeometry(bw, hh, bd), wm); m.position.set(cx, y + hh / 2, cz); g.add(m); });
    const ol = new T.LineLoop(new T.BufferGeometry().setFromPoints([[r.x0, r.z0], [r.x1, r.z0], [r.x1, r.z1], [r.x0, r.z1]].map(([x, z]) => new T.Vector3(x, y + hh, z))), new T.LineBasicMaterial({ color: col })); g.add(ol);
    for (let i = 1; i < w; i++) g.add(new T.Line(new T.BufferGeometry().setFromPoints([new T.Vector3(r.x0 + i, y + .09, r.z0), new T.Vector3(r.x0 + i, y + .09, r.z1)]), new T.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: .55 })));
    for (let i = 1; i < d; i++) g.add(new T.Line(new T.BufferGeometry().setFromPoints([new T.Vector3(r.x0, y + .09, r.z0 + i), new T.Vector3(r.x1, y + .09, r.z0 + i)]), new T.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: .55 })));
    const txt = label || `${w} × ${d}`, c = cvs(256, 96, (x, W_, H_) => { x.font = 'bold 54px Poppins, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.lineWidth = 12; x.strokeStyle = ok ? '#2E7D32' : '#A8321F'; x.strokeText(txt, W_ / 2, H_ / 2); x.fillStyle = '#fff'; x.fillText(txt, W_ / 2, H_ / 2); });
    const sp = new T.Sprite(new T.SpriteMaterial({ map: toTex(c), transparent: true, depthTest: false })); sp.scale.set(2.2, .83, 1); sp.position.set(r.x0 + w / 2, y + hh + .5, r.z0 + d / 2); sp.renderOrder = 60; g.add(sp);
    root.add(g); roomPrev = g;
  };
  const isPaintKind = () => W3.place && !W3.place.moving && ['floor', 'wall'].includes(PART[W3.place.part].kind);
  function bindInput() {
    const dom = renderer.domElement, ptrs = new Map(); let drag = null, pinch = null;
    const panBy = (dx, dy) => { const upp = 2 * goal.dist * Math.tan(FOV * Math.PI / 360) / Hd, ya = cam.yaw, rx = [Math.cos(ya), -Math.sin(ya)], fz = [-Math.sin(ya), -Math.cos(ya)]; goal.tx = clamp(goal.tx - (dx * rx[0] + dy * fz[0] * -1.2) * upp, -2, N + 2); goal.tz = clamp(goal.tz - (dx * rx[1] + dy * fz[1] * -1.2) * upp, -2, N + 2); cam.tx = goal.tx; cam.tz = goal.tz; dirty = 1; };
    const rectOf = (a, b) => ({ x0: clamp(Math.min(a.cx, b.cx), 0, N - 1), z0: clamp(Math.min(a.cz, b.cz), 0, N - 1), x1: clamp(Math.max(a.cx, b.cx), 0, N - 1) + 1, z1: clamp(Math.max(a.cz, b.cz), 0, N - 1) + 1 });
    dom.addEventListener('pointerdown', (e) => {
      dom.setPointerCapture(e.pointerId); ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (ptrs.size === 1) { drag = { sx: e.clientX, sy: e.clientY, moved: false }; if (W3.mode === 'build' && W3.roomMode) { const c = W3.cellAt(e.clientX, e.clientY, 'floor'); if (c.cx >= 0 && c.cz >= 0 && c.cx < N && c.cz < N && !(W3.cb.cellFree && !W3.cb.cellFree(c.cx, c.cz))) drag.room = c; } else if (W3.mode === 'build' && isPaintKind()) drag.paint = true; }
      else if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), z: goal.dist, mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2 }; if (drag && drag.room) W3.setRoomPreview(null); drag = null; }
    });
    dom.addEventListener('pointermove', (e) => {
      if (!ptrs.has(e.pointerId)) return; const p = ptrs.get(e.pointerId), dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY;
      if (pinch && ptrs.size >= 2) { const [a, b] = [...ptrs.values()], n = W3._fit || 24, mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2; goal.dist = clamp(pinch.z * pinch.d / Math.hypot(a.x - b.x, a.y - b.y), n * .3, n * 1.5); panBy(mx - pinch.mx, my - pinch.my); pinch.mx = mx; pinch.my = my; return; }
      if (!drag) return; if (!drag.moved && Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) > 9) drag.moved = true;
      if (!drag.moved) return;
      if (drag.room) { const c = W3.cellAt(e.clientX, e.clientY, 'floor'); drag.rect = rectOf(drag.room, c); W3.cb.roomRect && W3.cb.roomRect(drag.rect, false); return; }
      if (drag.paint) { const c = W3.cellAt(e.clientX, e.clientY, PART[W3.place.part].kind); const k = c.cx + ',' + c.cz; if (k !== drag.lastKey && c.cx >= 0 && c.cz >= 0 && c.cx < N && c.cz < N) { drag.lastKey = k; W3._dragPaint = true; W3.tap(e.clientX, e.clientY); W3._dragPaint = false; } return; }
      panBy(dx, dy);
    });
    const up = (e) => {
      const was = ptrs.has(e.pointerId); ptrs.delete(e.pointerId); if (ptrs.size < 2) pinch = null; if (!was) return;
      if (drag && e.type === 'pointerup') { if (drag.room && drag.moved && drag.rect) W3.cb.roomRect && W3.cb.roomRect(drag.rect, true); else if (!drag.moved) W3.tap(e.clientX, e.clientY); }
      if (!ptrs.size) drag = null;
    };
    dom.addEventListener('pointerup', up); dom.addEventListener('pointercancel', up);
    dom.addEventListener('wheel', (e) => { e.preventDefault(); W3.zoomBy(e.deltaY < 0 ? 1.1 : 1 / 1.1); }, { passive: false });
  }
  RENO.glowTex = RENO.glowTex || (() => { let t; return () => t || (t = toTex(cvs(128, 128, (x) => { const g = x.createRadialGradient(64, 64, 0, 64, 64, 64); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.3, 'rgba(255,255,255,.45)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 128, 128); }))); })();
})();
