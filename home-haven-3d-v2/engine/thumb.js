// Home Haven 3D — thumbnails of every part, rendered once from the 3D models
(function () {
  const T = THREE, RENO = window.RENO, PART = SPRITES.parts;
  let tr, ts, tc, ready = false; const cache = {}, SZ = 192;
  function init() {
    if (ready) return true;
    try {
      tr = new T.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true }); tr.setPixelRatio(1); tr.setSize(SZ, SZ, false); tr.setClearColor(0, 0);
      tr.outputColorSpace = T.SRGBColorSpace; tr.toneMapping = T.ACESFilmicToneMapping; tr.toneMappingExposure = 1.05;
      ts = new T.Scene(); ts.add(new T.HemisphereLight(0xfff4e2, 0x9a8c7a, 1.5)); const sun = new T.DirectionalLight(0xfff1d6, 2.4); sun.position.set(-4, 7, 6); ts.add(sun); tc = new T.PerspectiveCamera(26, 1, .1, 200); ready = true;
    } catch (e) { ready = false; } return ready;
  }
  RENO.partThumb = (id, color) => {
    const P = PART[id], col = color || P.color, k = id + col; if (cache[k] !== undefined) return cache[k]; let url = '';
    try {
      if (init()) {
        const o = { part: id, x: 0, z: 0, lvl: 0, rot: id === 'stairs' ? 3 : 0, color: col }, g = RENO.World.buildPartModel(o), h = new T.Group(); h.add(g); ts.add(h);
        if (P.kind === 'wall' && o.rot % 2 === 0) h.rotation.y = 0; if (P.kind === 'roof') h.rotation.y = 0;
        const bb = new T.Box3().setFromObject(h), size = bb.getSize(new T.Vector3()), c = bb.getCenter(new T.Vector3()), r = size.length() * .5 * .9, yaw = P.kind === 'wall' ? .55 : P.kind === 'floor' ? .6 : .7, pit = P.kind === 'floor' ? .75 : .45, dist = r / Math.sin(13 * Math.PI / 180);
        tc.position.set(c.x + Math.sin(yaw) * Math.cos(pit) * dist, c.y + Math.sin(pit) * dist, c.z + Math.cos(yaw) * Math.cos(pit) * dist); tc.lookAt(c); tr.render(ts, tc); url = tr.domElement.toDataURL('image/png'); ts.remove(h);
      }
    } catch (e) { console.error('partThumb', id, e && e.message); url = ''; } if (url) cache[k] = url; return url;
  };
  // dialogue portrait of the grown-up Ben, rendered from the same 3D model the world uses
  RENO.benPortrait = () => {
    try {
      const r = new T.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true }); r.setPixelRatio(1); r.setSize(512, 512, false); r.setClearColor(0, 0); r.outputColorSpace = T.SRGBColorSpace; r.toneMapping = T.ACESFilmicToneMapping; r.toneMappingExposure = 1.05;
      const s = new T.Scene(); s.add(new T.HemisphereLight(0xfff4e2, 0x9a8c7a, 1.6)); const sun = new T.DirectionalLight(0xfff1d6, 2.2); sun.position.set(-2, 4, 5); s.add(sun);
      const m = RENO.World.mkChar('ben'); m.rotation.y = .38; s.add(m); const c = new T.PerspectiveCamera(22, 1, .1, 50); c.position.set(0, .98, 2.9); c.lookAt(0, .93, 0); r.render(s, c);
      const url = r.domElement.toDataURL('image/png'); r.dispose(); if (r.forceContextLoss) r.forceContextLoss(); return url;
    } catch (e) { console.error('benPortrait', e && e.message); return ''; }
  };
  RENO.partImg = (id, w = 64, h = 56, color) => { const u = RENO.partThumb(id, color); return u ? `<img alt="" src="${u}" style="width:${w}px;height:${h}px;object-fit:contain;display:block">` : ''; };
})();
