"""Blender helpers: boxes/cylinders merged per (group, material) with bevelled edges and box-projected UVs, PBR materials from the generated textures, GLB export, Cycles preview.
Convention: asset front faces -Y in Blender (= +Z after the glTF Y-up export), 1 unit = 1 m, origin on the floor at the centre of the footprint; groups named 'door', 'wheel' ... are separate nodes with their pivot set."""
import bpy, bmesh, math, os, random
from mathutils import Vector, Euler, Matrix

TEX = '/tmp/hushtex/'
_mats = {}

def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True); _mats.clear()

def mat(name, tex=None, rough=0.7, metal=0.0, emit=None, emit_k=0, alpha=None, color=(1, 1, 1)):
    key = (name, tex, rough, metal, emit, emit_k, alpha, color)
    if key in _mats: return _mats[key]
    m = bpy.data.materials.new(name); m.use_nodes = True; nt = m.node_tree; b = nt.nodes['Principled BSDF']
    b.inputs['Roughness'].default_value = rough; b.inputs['Metallic'].default_value = metal
    if tex:
        im = bpy.data.images.get(tex) or bpy.data.images.load(TEX + tex + '.png'); im.name = tex
        t = nt.nodes.new('ShaderNodeTexImage'); t.image = im; nt.links.new(t.outputs['Color'], b.inputs['Base Color'])
    else: b.inputs['Base Color'].default_value = (*color, 1)
    if emit:
        b.inputs['Emission Color'].default_value = (*emit, 1); b.inputs['Emission Strength'].default_value = emit_k
    if alpha is not None:
        b.inputs['Alpha'].default_value = alpha
        try: m.surface_render_method = 'BLENDED'
        except Exception: pass
        try: m.blend_method = 'BLEND'
        except Exception: pass
    _mats[key] = m; return m

class Asset:
    def __init__(self, name):
        self.name = name; self.groups = {}; self.pivot = {}; self.pose = {}; self.rnd = random.Random(hash(name) & 0xffff)

    def _bm(self, group, m):
        d = self.groups.setdefault(group, {}); 
        if m.name + str(id(m)) not in d:
            bm = bmesh.new(); bm.loops.layers.uv.new('UVMap'); d[m.name + str(id(m))] = (m, bm)
        return d[m.name + str(id(m))][1]

    def _uv(self, bm, faces, scale=0.9):
        uv = bm.loops.layers.uv.active; o = (self.rnd.random(), self.rnd.random())
        for f in faces:
            n = f.normal; ax = max(range(3), key=lambda i: abs(n[i])); a, b = [i for i in range(3) if i != ax]
            for l in f.loops: p = l.vert.co; l[uv].uv = (p[a] * scale + o[0], p[b] * scale + o[1])

    def _finish(self, bm, geom_verts, rot, pos, bevel, scale, smooth=None):
        before = set(bm.faces)
        bmesh.ops.rotate(bm, verts=geom_verts, cent=(0, 0, 0), matrix=Euler(rot).to_matrix())
        bmesh.ops.translate(bm, verts=geom_verts, vec=pos)
        if bevel > 0:
            edges = list({e for v in geom_verts for e in v.link_edges}); 
            try: bmesh.ops.bevel(bm, geom=edges, offset=bevel, segments=2, affect='EDGES', profile=0.6)
            except Exception: pass
        new = [f for f in bm.faces if f not in before]; bm.normal_update(); self._uv(bm, new, scale)
        if smooth:
            for f in new:
                if smooth == 'all' or abs(f.normal.z) < 0.5: f.smooth = True

    def box(self, g, m, size, pos, rot=(0, 0, 0), bevel=0.008, scale=0.9, center=False):
        """size (x, y, z); pos = centre of the bottom face (or the centre of the box with center=True)."""
        bm = self._bm(g, m); r = bmesh.ops.create_cube(bm, size=1.0); vs = r['verts']
        for v in vs: v.co.x *= size[0]; v.co.y *= size[1]; v.co.z *= size[2]
        if not center:
            for v in vs: v.co.z += size[2] / 2
        self._finish(bm, vs, rot, pos, bevel, scale); return self

    def cyl(self, g, m, r, h, pos, axis='z', seg=16, r2=None, bevel=0.0, scale=0.9, rot=(0, 0, 0)):
        bm = self._bm(g, m); res = bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=False, segments=seg, radius1=r, radius2=r if r2 is None else r2, depth=h); vs = res['verts']
        for v in vs: v.co.z += h / 2
        R = {'z': (0, 0, 0), 'x': (0, math.pi / 2, 0), 'y': (-math.pi / 2, 0, 0)}[axis]
        e = (Euler(R).to_matrix() @ Euler(rot).to_matrix()).to_euler()
        self._finish(bm, vs, tuple(e), pos, bevel, scale, smooth='side' if seg >= 10 else None); return self

    def sphere(self, g, m, r, pos, seg=12, sx=1, sy=1, sz=1):
        bm = self._bm(g, m); res = bmesh.ops.create_uvsphere(bm, u_segments=seg, v_segments=max(6, seg // 2), radius=r); vs = res['verts']
        for v in vs: v.co.x *= sx; v.co.y *= sy; v.co.z *= sz
        self._finish(bm, vs, (0, 0, 0), pos, 0, 0.9, smooth='all'); return self

    def set_pivot(self, g, p, pose=None):
        self.pivot[g] = Vector(p)
        if pose: self.pose[g] = pose
        return self

    def ring(self, g, m, r, thick, pos, axis='y', n=14, depth=None):
        """a torus-like rim made of short bevelled boxes (valve wheels, handles)."""
        d = depth or thick
        for i in range(n):
            a = 2 * math.pi * i / n; ln = 2 * math.pi * r / n * 1.12
            if axis == 'y': self.box(g, m, (ln, d, thick), (pos[0] + math.cos(a) * r, pos[1], pos[2] + math.sin(a) * r), rot=(0, -a + math.pi / 2, 0) if False else (0, -a - math.pi / 2, 0), center=True, bevel=0.004)
            elif axis == 'z': self.box(g, m, (ln, thick, d), (pos[0] + math.cos(a) * r, pos[1] + math.sin(a) * r, pos[2]), rot=(0, 0, a + math.pi / 2), center=True, bevel=0.004)
            else: self.box(g, m, (d, ln, thick), (pos[0], pos[1] + math.cos(a) * r, pos[2] + math.sin(a) * r), rot=(a + math.pi / 2, 0, 0), center=True, bevel=0.004)
        return self

    def tris(self):
        return sum(len(bm.faces) * 0 + sum(len(f.verts) - 2 for f in bm.faces) for d in self.groups.values() for _, bm in d.values())

    def build(self):
        objs = []
        for gname, d in self.groups.items():
            me = bpy.data.meshes.new(gname); big = bmesh.new(); big.loops.layers.uv.new('UVMap'); slots = []
            for i, (m, bm) in enumerate(d.values()):
                for f in bm.faces: f.material_index = i
                slots.append(m); tmp = bpy.data.meshes.new('t'); bm.to_mesh(tmp); big.from_mesh(tmp); bpy.data.meshes.remove(tmp)
            pv = self.pivot.get(gname)
            if pv is not None: bmesh.ops.translate(big, verts=list(big.verts), vec=-pv)
            big.to_mesh(me); big.free()
            for m in slots: me.materials.append(m)
            # material indices were stored per face before the merge; rebuild by from_mesh keeps them
            ob = bpy.data.objects.new(gname, me); bpy.context.scene.collection.objects.link(ob)
            if pv is not None: ob.location = pv
            if gname in self.pose: ob.rotation_euler = self.pose[gname]
            objs.append(ob)
        return objs

def export(asset, path):
    objs = asset.build(); bpy.ops.object.select_all(action='DESELECT')
    for o in objs: o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    bpy.ops.export_scene.gltf(filepath=path, export_format='GLB', use_selection=True, export_apply=True, export_yup=True, export_image_format='JPEG', export_jpeg_quality=80, export_materials='EXPORT', export_cameras=False, export_lights=False)
    return objs

def preview(objs, path, size=420, yaw=35, pitch=18):
    sc = bpy.context.scene
    for o in list(sc.objects):
        if o.type in ('CAMERA', 'LIGHT'): bpy.data.objects.remove(o)
    pts = [o.matrix_world @ Vector(c) for o in objs for c in o.bound_box]; mn = Vector((min(p[i] for p in pts) for i in range(3))); mx = Vector((max(p[i] for p in pts) for i in range(3)))
    c = (mn + mx) / 2; ext = (mx - mn).length
    cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam')); sc.collection.objects.link(cam); cam.data.lens = 55; sc.camera = cam
    yw, pt = math.radians(yaw), math.radians(pitch); d = ext * 1.55 + 0.3
    cam.location = c + Vector((math.sin(yw) * math.cos(pt), -math.cos(yw) * math.cos(pt), math.sin(pt))) * d
    cam.rotation_euler = (c - cam.location).to_track_quat('-Z', 'Y').to_euler()
    def light(kind, loc, energy, size_, col=(1, 1, 1)):
        l = bpy.data.lights.new('l', kind); l.energy = energy; 
        if kind == 'AREA': l.size = size_
        l.color = col; o = bpy.data.objects.new('l', l); o.location = c + Vector(loc) * ext; sc.collection.objects.link(o); o.rotation_euler = (c - o.location).to_track_quat('-Z', 'Y').to_euler()
    light('AREA', (0.9, -1.1, 1.6), 260 * ext * ext, ext * 1.2, (1, 0.93, 0.82)); light('AREA', (-1.4, -0.4, 0.8), 70 * ext * ext, ext, (0.7, 0.8, 1.0))
    w = bpy.data.worlds.new('w'); w.use_nodes = True; w.node_tree.nodes['Background'].inputs['Color'].default_value = (0.09, 0.1, 0.11, 1); w.node_tree.nodes['Background'].inputs['Strength'].default_value = 1.0; sc.world = w
    floor = bpy.data.objects.new('floor', bpy.data.meshes.new('floor')); bm = bmesh.new(); bmesh.ops.create_grid(bm, x_segments=1, y_segments=1, size=ext * 3); bm.to_mesh(floor.data); bm.free(); sc.collection.objects.link(floor)
    fm = bpy.data.materials.new('fl'); fm.use_nodes = True; fm.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (0.12, 0.12, 0.13, 1); fm.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value = 0.9; floor.data.materials.append(fm); floor.location.z = -0.001
    sc.render.engine = 'CYCLES'; sc.cycles.device = 'CPU'; sc.cycles.samples = 24; sc.cycles.use_denoising = True
    try: sc.cycles.denoiser = 'OPENIMAGEDENOISE'
    except Exception: pass
    sc.render.resolution_x = sc.render.resolution_y = size; sc.render.filepath = path; sc.render.image_settings.file_format = 'PNG'; sc.view_settings.view_transform = 'Standard'
    bpy.ops.render.render(write_still=True); bpy.data.objects.remove(floor)
