/* The Blender-built prop pack (assetlab/): every GLB is parsed once, its materials are turned into cheap lit (Lambert) materials with the sonar-pulse patch, and level objects clone the
   shared geometry. Static props are baked into per-material merged meshes; interactive ones (doors, lockers, breakers, valves, generators) are placed one by one with their moving nodes
   ('door', 'lever', 'wheel') exposed. Front of every asset faces +z. If a file fails to load the older procedural builders are used instead. */
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { patchPulse } from './scene3d.js';
import g_alcove_shelf from '../assets/props/alcove_shelf.glb';
import g_barrel from '../assets/props/barrel.glb';
import g_bone_pile from '../assets/props/bone_pile.glb';
import g_breaker_panel from '../assets/props/breaker_panel.glb';
import g_cabinet_wood from '../assets/props/cabinet_wood.glb';
import g_cctv_camera from '../assets/props/cctv_camera.glb';
import g_chair_office from '../assets/props/chair_office.glb';
import g_console_terminal from '../assets/props/console_terminal.glb';
import g_crate_wood from '../assets/props/crate_wood.glb';
import g_desk_office from '../assets/props/desk_office.glb';
import g_door_exit from '../assets/props/door_exit.glb';
import g_door_keycard from '../assets/props/door_keycard.glb';
import g_door_lab from '../assets/props/door_lab.glb';
import g_door_plain from '../assets/props/door_plain.glb';
import g_door_steel from '../assets/props/door_steel.glb';
import g_egg_pod from '../assets/props/egg_pod.glb';
import g_fallen_shelf from '../assets/props/fallen_shelf.glb';
import g_filing_cabinet from '../assets/props/filing_cabinet.glb';
import g_generator from '../assets/props/generator.glb';
import g_hospital_bed from '../assets/props/hospital_bed.glb';
import g_item_bandage from '../assets/props/item_bandage.glb';
import g_item_fuse from '../assets/props/item_fuse.glb';
import g_item_key from '../assets/props/item_key.glb';
import g_item_keycard from '../assets/props/item_keycard.glb';
import g_item_medkit from '../assets/props/item_medkit.glb';
import g_item_note from '../assets/props/item_note.glb';
import g_item_radio from '../assets/props/item_radio.glb';
import g_keypad_panel from '../assets/props/keypad_panel.glb';
import g_lamp_caged from '../assets/props/lamp_caged.glb';
import g_lamp_fluorescent from '../assets/props/lamp_fluorescent.glb';
import g_locker from '../assets/props/locker.glb';
import g_pipe_cluster from '../assets/props/pipe_cluster.glb';
import g_pump_unit from '../assets/props/pump_unit.glb';
import g_rubble from '../assets/props/rubble.glb';
import g_server_rack from '../assets/props/server_rack.glb';
import g_shelf_metal from '../assets/props/shelf_metal.glb';
import g_specimen_tank from '../assets/props/specimen_tank.glb';
import g_torch_hand from '../assets/props/torch_hand.glb';
import g_valve_wheel from '../assets/props/valve_wheel.glb';
import g_vent_wall from '../assets/props/vent_wall.glb';
const SRC = { torch_hand: g_torch_hand, alcove_shelf: g_alcove_shelf, barrel: g_barrel, bone_pile: g_bone_pile, breaker_panel: g_breaker_panel, cabinet_wood: g_cabinet_wood, cctv_camera: g_cctv_camera, chair_office: g_chair_office, console_terminal: g_console_terminal, crate_wood: g_crate_wood, desk_office: g_desk_office, door_exit: g_door_exit, door_keycard: g_door_keycard, door_lab: g_door_lab, door_plain: g_door_plain, door_steel: g_door_steel, egg_pod: g_egg_pod, fallen_shelf: g_fallen_shelf, filing_cabinet: g_filing_cabinet, generator: g_generator, hospital_bed: g_hospital_bed, item_bandage: g_item_bandage, item_fuse: g_item_fuse, item_key: g_item_key, item_keycard: g_item_keycard, item_medkit: g_item_medkit, item_note: g_item_note, item_radio: g_item_radio, keypad_panel: g_keypad_panel, lamp_caged: g_lamp_caged, lamp_fluorescent: g_lamp_fluorescent, locker: g_locker, pipe_cluster: g_pipe_cluster, pump_unit: g_pump_unit, rubble: g_rubble, server_rack: g_server_rack, shelf_metal: g_shelf_metal, specimen_tank: g_specimen_tank, valve_wheel: g_valve_wheel, vent_wall: g_vent_wall };
const TPL = {}, CONV = new Map();

function convert(m) {
  let c = CONV.get(m.uuid); if (c) return c;
  c = new THREE.MeshLambertMaterial({ map: m.map || null, color: m.color ? m.color.clone().multiplyScalar(m.emissive && m.emissive.r + m.emissive.g + m.emissive.b > 0.01 ? 1 : 0.45) : 0xffffff, emissive: m.emissive ? m.emissive.clone() : 0x000000, emissiveIntensity: m.emissiveIntensity === undefined ? 1 : m.emissiveIntensity, transparent: !!m.transparent, opacity: m.opacity === undefined ? 1 : m.opacity, depthWrite: !m.transparent });
  if (m.map) m.map.userData.shared = true; c.userData.shared = true; patchPulse(c); CONV.set(m.uuid, c); return c;
}
export const PropsGLB = {
  ready: false, error: null,
  async load() {
    if (this.ready) return true;
    try {
      for (const k of Object.keys(SRC)) {
        const b = SRC[k], buf = b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength), gltf = await new Promise((res, rej) => new GLTFLoader().parse(buf, '', res, rej));
        gltf.scene.traverse(o => { if (o.isMesh) { o.geometry.userData.shared = true; o.material = Array.isArray(o.material) ? o.material.map(convert) : convert(o.material); o.castShadow = o.receiveShadow = false; } });
        TPL[k] = gltf.scene;
      }
      this.ready = true; return true;
    } catch (e) { this.error = String(e && e.message || e); this.ready = false; return false; }
  },
  has(n) { return this.ready && !!TPL[n]; },
  /* a fresh instance sharing geometry + materials; s = [sx, sy, sz]; moving nodes start in their rest pose */
  inst(n, s) {
    const r = TPL[n].clone(true); if (s) r.scale.set(s[0], s[1], s[2] === undefined ? s[0] : s[2]);
    r.traverse(o => { if (o.name === 'door' || o.name === 'lever' || o.name === 'wheel' || o.name === 'grille') o.rotation.set(0, 0, 0); });
    return r;
  },
  node(root, name) { return root.getObjectByName(name); },
  /* bake a static prop into material buckets (Map material -> [geometry]) */
  bake(n, s, ry, x, y, z, buckets) {
    const r = this.inst(n, s); r.rotation.y = ry; r.position.set(x, y, z); r.updateMatrixWorld(true);
    r.traverse(o => { if (o.isMesh) { const g = o.geometry.clone(); g.applyMatrix4(o.matrixWorld); const key = o.material; if (!buckets.has(key)) buckets.set(key, []); buckets.get(key).push(g); } });
  }
};
