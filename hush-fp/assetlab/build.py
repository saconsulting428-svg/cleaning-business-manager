"""Run:  python build.py [name ...]   (needs bpy: `uv pip install bpy numpy pillow` in a Python 3.11 venv).  Exports assets/models/props/<name>.glb and a preview PNG per asset + a contact sheet."""
import sys, os, time
sys.path.insert(0, os.path.dirname(__file__))
import texgen, lib, assets
OUT = os.path.abspath(os.path.join(os.path.dirname(__file__), '../assets/models/props')); PRE = os.path.abspath(os.path.join(os.path.dirname(__file__), '../assets/models/previews'))
os.makedirs(OUT, exist_ok=True); os.makedirs(PRE, exist_ok=True); texgen.build()
want = set(sys.argv[1:]); report = []
for fn in assets.ALL:
    if want and fn.__name__ not in want: continue
    t = time.time(); lib.reset(); a = fn(); n = a.name; tris = a.tris(); objs = lib.export(a, os.path.join(OUT, n + '.glb')); lib.preview(objs, os.path.join(PRE, n + '.png'), 420)
    report.append((n, tris, os.path.getsize(os.path.join(OUT, n + '.glb')) // 1024)); print(n, tris, 'tris', report[-1][2], 'KB', '%.1fs' % (time.time() - t), flush=True)
print('done', len(report))
