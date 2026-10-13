/* Keyboard + gamepad input. Two independent controllers, remappable (saved in localStorage). */
export const DEFAULT_KEYS = [
  { left: ['KeyA'], right: ['KeyD'], crouch: ['KeyS'], sideUp: ['KeyW'], sideDown: ['KeyE'], jump: ['Space'], block: ['ShiftLeft'], run: ['KeyR'], lp: ['KeyF'], hp: ['KeyG'], lk: ['KeyV'], hk: ['KeyB'] },
  { left: ['ArrowLeft'], right: ['ArrowRight'], crouch: ['ArrowDown'], sideUp: ['ArrowUp'], sideDown: ['Numpad6'], jump: ['Numpad0'], block: ['Numpad3'], run: ['Numpad7'], lp: ['Numpad1'], hp: ['Numpad2'], lk: ['Numpad4'], hk: ['Numpad5'] }
];
const keys = {};
let bindings = JSON.parse(JSON.stringify(DEFAULT_KEYS));
const fillBindings = () => { bindings.forEach((b, p) => { for (const a in DEFAULT_KEYS[p]) if (!b[a]) b[a] = DEFAULT_KEYS[p][a].slice(); }); };
try { const s = JSON.parse(localStorage.getItem('sc3d_keys') || 'null'); if (s) bindings = s; } catch (e) {}
fillBindings();
export const getBindings = () => bindings;
export function setBinding(p, action, code) { bindings[p][action] = [code]; try { localStorage.setItem('sc3d_keys', JSON.stringify(bindings)); } catch (e) {} }
export function resetBindings() { bindings = JSON.parse(JSON.stringify(DEFAULT_KEYS)); try { localStorage.removeItem('sc3d_keys'); } catch (e) {} }
const listeners = new Set();
export const onKey = fn => listeners.add(fn);
addEventListener('keydown', e => {
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.code)) e.preventDefault();
  if (!keys[e.code]) { keys[e.code] = true; for (const l of listeners) l(e.code, e); }
});
addEventListener('keyup', e => { keys[e.code] = false; });
addEventListener('blur', () => { for (const k in keys) keys[k] = false; });
export const isDown = c => !!keys[c];
const ACTIONS = ['left', 'right', 'crouch', 'sideUp', 'sideDown', 'jump', 'block', 'run', 'lp', 'hp', 'lk', 'hk'];
const touch = [{}, {}]; export const touchState = touch;

export class Controller {
  constructor(player, pad = -1) { this.player = player; this.pad = pad; }
  poll(solo) { // solo: single player may use both layouts
    const I = {}, maps = solo ? [bindings[0], bindings[1]] : [bindings[this.player]];
    for (const a of ACTIONS) I[a] = maps.some(m => (m[a] || []).some(c => keys[c])) || touch[this.player][a] ? 1 : 0;
    const pads = navigator.getGamepads ? navigator.getGamepads() : [], gp = pads[this.pad >= 0 ? this.pad : -1] || (solo ? [...pads].find(p => p && p.connected) : null);
    if (gp) {
      const ax = gp.axes[0] || 0, ay = gp.axes[1] || 0, b = i => gp.buttons[i] && gp.buttons[i].pressed;
      if (ax < -.4 || b(14)) I.left = 1; if (ax > .4 || b(15)) I.right = 1; if (ay > .55 || b(13)) I.crouch = 1; if (ay < -.55 || b(12)) I.sideUp = 1;
      if (b(2)) I.lp = 1; if (b(3)) I.hp = 1; if (b(0)) I.lk = 1; if (b(1)) I.hk = 1; if (b(4) || b(6)) I.block = 1; if (b(5) || b(7)) I.jump = 1;
      if ((gp.axes[3] || 0) > .6) I.sideDown = 1;
    }
    return I;
  }
}
