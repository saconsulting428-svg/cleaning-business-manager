"""The hand torch built from the supplied photo (rusty field torch with hazard stripe, red switch, wrist strap): a lathe profile whose surface is the photo itself, wrapped so that the switch
faces up. Front of the torch is -z after export (like the other torches); the lens is added by the game."""
import sys, os, math
import bpy, bmesh
sys.path.insert(0, os.path.dirname(__file__))
from PIL import Image
import lib
from mathutils import Vector
HERE = os.path.dirname(__file__); OUT = os.path.abspath(os.path.join(HERE, '../assets/models/props'))
im = Image.open(os.path.join(HERE, 'torch_photo.webp')).convert('RGB'); W0, H0 = im.size; os.makedirs('/tmp/hushtex', exist_ok=True)
sm = im.resize((1024, int(H0 * 1024 / W0)), Image.LANCZOS); sm.save('/tmp/hushtex/torch_photo.png'); W, H = W0, H0; k = W / 2000.0
YC = 305 * k * (H / (H0)) ; YC = H * 0.465            # image row of the torch axis
PROF = [(1805, 140), (1775, 150), (1500, 152), (1490, 152), (1010, 152), (1005, 158), (640, 158), (638, 150), (620, 168), (440, 285), (380, 285), (92, 282)]
PROF = [(x * k, r * k) for x, r in PROF]; L = 0.30; s = L / (PROF[0][0] - PROF[-1][0]); XM = (PROF[0][0] + PROF[-1][0]) / 2
lib.reset(); mT = lib.mat('torch', 'torch_photo', 0.55, 0.35); mR = lib.mat('reflector', None, 0.25, 0.85, color=(0.55, 0.42, 0.2)); mS = lib.mat('strap', 'torch_photo', 0.9, 0.0)
bmT = bmesh.new(); uvT = bmT.loops.layers.uv.new('UVMap'); bmR = bmesh.new(); uvR = bmR.loops.layers.uv.new('UVMap'); bmS = bmesh.new(); uvS = bmS.loops.layers.uv.new('UVMap')
N = 36
def ring(bm, uvl, xi, r, uvfun):
    vs = []
    for kk in range(N + 1):
        th = 2 * math.pi * kk / N; y = (XM - xi) * s; v = bm.verts.new((r * s * math.sin(th), y, r * s * math.cos(th))); vs.append((v, th))
    return vs
def band(bm, uvl, a, b):
    (xa, ra), (xb, rb) = a, b; A = ring(bm, uvl, xa, ra, None); B = ring(bm, uvl, xb, rb, None)
    for kk in range(N):
        f = bm.faces.new((A[kk][0], A[kk + 1][0], B[kk + 1][0], B[kk][0]))
        for lo, (xi, r, th) in zip(f.loops, [(xa, ra, A[kk][1]), (xa, ra, A[kk + 1][1]), (xb, rb, B[kk + 1][1]), (xb, rb, B[kk][1])]):
            lo[uvl].uv = (xi / W, 1 - (YC + r * math.sin(th)) / H)
for a, b in zip(PROF[:-1], PROF[1:]): band(bmT, uvT, a, b)
# rear cap
xc = PROF[0][0]; rc = PROF[0][1]; c = bmT.verts.new((0, (XM - xc) * s, 0)); R = ring(bmT, uvT, xc, rc, None)
for kk in range(N):
    f = bmT.faces.new((c, R[kk + 1][0], R[kk][0])); 
    for lo in f.loops: lo[uvT].uv = (xc / W, 1 - YC / H)
# front: rim annulus + reflector cone
xf, rf = PROF[-1]; ri = rf * 0.84; Ro = ring(bmT, uvT, xf, rf, None); Ri = ring(bmT, uvT, xf, ri, None)
for kk in range(N):
    f = bmT.faces.new((Ro[kk][0], Ri[kk][0], Ri[kk + 1][0], Ro[kk + 1][0]))
    for lo in f.loops: lo[uvT].uv = (xf / W, 1 - YC / H)
xd = xf + 120 * k; rd = ri * 0.32; Rd = ring(bmR, uvR, xd, rd, None); Rb = ring(bmR, uvR, xf + 4 * k, ri, None)
for kk in range(N):
    f = bmR.faces.new((Rb[kk][0], Rd[kk][0], Rd[kk + 1][0], Rb[kk + 1][0]))
    for lo in f.loops: lo[uvR].uv = (0.5, 0.5)
cd = bmR.verts.new((0, (XM - xd) * s, 0))
for kk in range(N):
    f = bmR.faces.new((cd, Rd[kk][0], Rd[kk + 1][0])); 
    for lo in f.loops: lo[uvR].uv = (0.5, 0.5)
# strap: a small ring at the back and a hanging loop (boxes), flat colour taken from the strap in the photo
su, sv = 1500 * k / W, 1 - 560 * (H / H0) / H
def box(bm, uvl, cx, cy, cz, sx, sy, sz, rx=0, ry=0, rz=0):
    r = bmesh.ops.create_cube(bm, size=1.0); vs = r['verts']
    from mathutils import Euler
    for v in vs: v.co.x *= sx; v.co.y *= sy; v.co.z *= sz
    bmesh.ops.rotate(bm, verts=vs, cent=(0, 0, 0), matrix=Euler((rx, ry, rz)).to_matrix()); bmesh.ops.translate(bm, verts=vs, vec=(cx, cy, cz))
    for f in set(f for v in vs for f in v.link_faces):
        for lo in f.loops: lo[uvl].uv = (su, sv)
yb = (XM - PROF[0][0]) * s
for kk in range(12):
    a = 2 * math.pi * kk / 12; box(bmS, uvS, 0.0, yb - 0.004 + math.cos(a) * 0.0, -0.022 + math.cos(a) * 0.014 - 0.0, 0.004, 0.006, 0.011, rx=a)
for kk in range(14):
    t = kk / 13.0; ang = t * math.pi; yy = yb - 0.004 - 0.02 - math.sin(ang) * 0.02 - t * 0.075; zz = -0.03 - 0.075 * math.sin(ang * 0.5 + 0.0) - 0.0 * t
    box(bmS, uvS, 0.0, yb + 0.0 - t * 0.14 * 0.5 - 0.0, -0.03 - 0.10 * math.sin(math.pi * t), 0.016, 0.014, 0.01, rx=-math.pi * (0.5 - t) * 0.5)
objs = []
for name, bm, m in (('body', bmT, mT), ('reflector', bmR, mR), ('strap', bmS, mS)):
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces); me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free(); me.materials.append(m)
    for p in me.polygons: p.use_smooth = (name != 'strap')
    ob = bpy.data.objects.new(name, me); bpy.context.scene.collection.objects.link(ob); objs.append(ob)
bpy.ops.object.select_all(action='DESELECT')
for o in objs: o.select_set(True)
bpy.context.view_layer.objects.active = objs[0]
bpy.ops.export_scene.gltf(filepath=os.path.join(OUT, 'torch_hand.glb'), export_format='GLB', use_selection=True, export_apply=True, export_yup=True, export_image_format='JPEG', export_jpeg_quality=85, export_materials='EXPORT')
lib.preview(objs, os.path.abspath(os.path.join(HERE, '../assets/models/previews/torch_hand.png')), 520, yaw=70, pitch=25)
print('ok', os.path.getsize(os.path.join(OUT, 'torch_hand.glb')) // 1024, 'KB')
