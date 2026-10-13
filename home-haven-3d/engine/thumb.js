// Home Haven 3D — renovation engine, part 5: thumbnails for style cards and task bubbles
(function () {
  const T = THREE, RENO = window.RENO, D = RENO.DATA, B = RENO.BUILD, { BY_ID, ROOMS } = D;
  let tr, ts, tc, ready = false; const cache = {}, SZ = 256;
  function init() {
    if (ready) return true;
    try {
      tr = new T.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true }); tr.setPixelRatio(1); tr.setSize(SZ, SZ, false); tr.setClearColor(0, 0);
      tr.outputColorSpace = T.SRGBColorSpace; tr.toneMapping = T.ACESFilmicToneMapping; tr.toneMappingExposure = 1.05;
      ts = new T.Scene(); ts.add(new T.HemisphereLight(0xfff4e2, 0x9a8c7a, 1.5)); const sun = new T.DirectionalLight(0xfff1d6, 2.4); sun.position.set(-4, 7, 6); ts.add(sun);
      tc = new T.PerspectiveCamera(28, 1, .1, 200); ready = true;
    } catch (e) { ready = false; }
    return ready;
  }
  function rounded(x, w, h, r) { x.beginPath(); x.moveTo(r, 0); x.lineTo(w - r, 0); x.quadraticCurveTo(w, 0, w, r); x.lineTo(w, h - r); x.quadraticCurveTo(w, h, w - r, h); x.lineTo(r, h); x.quadraticCurveTo(0, h, 0, h - r); x.lineTo(0, r); x.quadraticCurveTo(0, 0, r, 0); x.closePath(); }
  function surfaceThumb(s, vi) {
    const v = vi < 0 ? null : s.variants[vi].p, c = document.createElement('canvas'); c.width = c.height = 160; const x = c.getContext('2d');
    const src = RENO.makeSurface(s.surface === 'wall' ? v.kind : v.kind, v, s.surface === 'wall' ? 2.4 : 2.4, s.surface === 'wall' ? 2.4 : 2.4, 7 + vi).image;
    x.save(); rounded(x, 160, 160, 26); x.clip(); x.drawImage(src, 0, 0, 160, 160);
    if (v.wain) { x.fillStyle = v.wain.c; x.fillRect(0, 160 - 160 * v.wain.h / 2.4, 160, 160 * v.wain.h / 2.4); x.fillStyle = v.wain.rail || v.wain.c; x.fillRect(0, 160 - 160 * v.wain.h / 2.4 - 3, 160, 6); x.strokeStyle = 'rgba(0,0,0,.12)'; x.lineWidth = 2; for (let i = 1; i < 4; i++) { x.strokeRect(i * 38 - 28, 160 - 160 * v.wain.h / 2.4 + 10, 30, 160 * v.wain.h / 2.4 - 20); } }
    const g = x.createLinearGradient(0, 0, 160, 160); g.addColorStop(0, 'rgba(255,255,255,.22)'); g.addColorStop(.5, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(0,0,0,.12)'); x.fillStyle = g; x.fillRect(0, 0, 160, 160); x.restore();
    x.strokeStyle = 'rgba(255,255,255,.9)'; x.lineWidth = 5; rounded(x, 160, 160, 26); x.stroke();
    return c.toDataURL('image/png');
  }
  RENO.thumb = (id, vi) => {
    const s = BY_ID[id], k = id + ':' + vi; if (cache[k]) return cache[k];
    let url = '';
    try {
      if (s.surface) url = surfaceThumb(s, vi);
      else if (init()) {
        const g = new T.Group(), ctx = Object.assign({}, s, { thumb: true, win: s.win ? ROOMS[s.room].win : undefined }); B[s.type](g, s.variants[vi].p, ctx);
        if (s.type === 'nightstands') g.scale.setScalar(1);
        const holder = new T.Group(); holder.add(g); ts.add(holder);
        let wallM = null;
        if (s.wall || s.type === 'curtains') { const wl = new T.Mesh(new T.PlaneGeometry(4, 4), new T.MeshStandardMaterial({ color: '#efe7d8', roughness: 1 })); wl.position.set(0, 1.4, -.05); holder.add(wl); wallM = wl; if (s.type === 'curtains') { const win = ROOMS[s.room].win; const gl = new T.Mesh(new T.PlaneGeometry(win.w, win.h), new T.MeshBasicMaterial({ color: '#a8d8f0' })); gl.position.set(0, win.y + win.h / 2, -.03); holder.add(gl); const fr = new T.Mesh(new T.PlaneGeometry(win.w + .12, win.h + .12), new T.MeshBasicMaterial({ color: '#ffffff' })); fr.position.set(0, win.y + win.h / 2, -.04); holder.add(fr); } }
        const bb = new T.Box3().setFromObject(g); if (wallM) { bb.min.x = Math.max(bb.min.x, -1.4); bb.max.x = Math.min(bb.max.x, 1.4); }
        const size = bb.getSize(new T.Vector3()), ctr = bb.getCenter(new T.Vector3()), r = size.length() * .5 * .82;
        const flat = s.wall || s.type === 'curtains', yaw = flat ? .22 : .62, pit = flat ? .1 : .5, dist = r / Math.sin(14 * Math.PI / 180) * .95;
        tc.position.set(ctr.x + Math.sin(yaw) * Math.cos(pit) * dist, ctr.y + Math.sin(pit) * dist, ctr.z + Math.cos(yaw) * Math.cos(pit) * dist); tc.lookAt(ctr);
        tr.render(ts, tc); url = tr.domElement.toDataURL('image/png'); ts.remove(holder);
      }
    } catch (e) { url = ''; }
    return cache[k] = url;
  };
})();
