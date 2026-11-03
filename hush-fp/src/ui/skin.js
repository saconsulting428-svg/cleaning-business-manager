/* GPT-made UI art (buttons, panels, icons, logo, menu background, chapter covers): the images are set as CSS variables and drawn by ui.css; the SVG icon symbols are swapped for the painted icons. */
import u_bar_header from '../assets/ui/bar_header.webp';
import u_btn_amber from '../assets/ui/btn_amber.webp';
import u_btn_dark from '../assets/ui/btn_dark.webp';
import u_btn_dark_disabled from '../assets/ui/btn_dark_disabled.webp';
import u_btn_dark_selected from '../assets/ui/btn_dark_selected.webp';
import u_btn_red from '../assets/ui/btn_red.webp';
import u_ch1 from '../assets/ui/ch1.webp';
import u_ch2 from '../assets/ui/ch2.webp';
import u_ch3 from '../assets/ui/ch3.webp';
import u_ic_back from '../assets/ui/ic_back.webp';
import u_ic_bag from '../assets/ui/ic_bag.webp';
import u_ic_bandage from '../assets/ui/ic_bandage.webp';
import u_ic_crouch from '../assets/ui/ic_crouch.webp';
import u_ic_exit from '../assets/ui/ic_exit.webp';
import u_ic_eye from '../assets/ui/ic_eye.webp';
import u_ic_fuse from '../assets/ui/ic_fuse.webp';
import u_ic_heart from '../assets/ui/ic_heart.webp';
import u_ic_hint from '../assets/ui/ic_hint.webp';
import u_ic_key from '../assets/ui/ic_key.webp';
import u_ic_keycard from '../assets/ui/ic_keycard.webp';
import u_ic_lock from '../assets/ui/ic_lock.webp';
import u_ic_map from '../assets/ui/ic_map.webp';
import u_ic_medkit from '../assets/ui/ic_medkit.webp';
import u_ic_note from '../assets/ui/ic_note.webp';
import u_ic_pause from '../assets/ui/ic_pause.webp';
import u_ic_pulse from '../assets/ui/ic_pulse.webp';
import u_ic_radio from '../assets/ui/ic_radio.webp';
import u_ic_settings from '../assets/ui/ic_settings.webp';
import u_ic_skull from '../assets/ui/ic_skull.webp';
import u_ic_torch from '../assets/ui/ic_torch.webp';
import u_ic_unlock from '../assets/ui/ic_unlock.webp';
import u_iconbtn from '../assets/ui/iconbtn.webp';
import u_iconbtn_pressed from '../assets/ui/iconbtn_pressed.webp';
import u_logo from '../assets/ui/logo.webp';
import u_menu_bg from '../assets/ui/menu_bg.webp';
import u_panel_card from '../assets/ui/panel_card.webp';
import u_panel_large from '../assets/ui/panel_large.webp';
import u_pulse from '../assets/ui/pulse.webp';
import u_pulse_pressed from '../assets/ui/pulse_pressed.webp';
const U = { bar_header: u_bar_header, btn_amber: u_btn_amber, btn_dark: u_btn_dark, btn_dark_disabled: u_btn_dark_disabled, btn_dark_selected: u_btn_dark_selected, btn_red: u_btn_red, ch1: u_ch1, ch2: u_ch2, ch3: u_ch3, ic_back: u_ic_back, ic_bag: u_ic_bag, ic_bandage: u_ic_bandage, ic_crouch: u_ic_crouch, ic_exit: u_ic_exit, ic_eye: u_ic_eye, ic_fuse: u_ic_fuse, ic_heart: u_ic_heart, ic_hint: u_ic_hint, ic_key: u_ic_key, ic_keycard: u_ic_keycard, ic_lock: u_ic_lock, ic_map: u_ic_map, ic_medkit: u_ic_medkit, ic_note: u_ic_note, ic_pause: u_ic_pause, ic_pulse: u_ic_pulse, ic_radio: u_ic_radio, ic_settings: u_ic_settings, ic_skull: u_ic_skull, ic_torch: u_ic_torch, ic_unlock: u_ic_unlock, iconbtn: u_iconbtn, iconbtn_pressed: u_iconbtn_pressed, logo: u_logo, menu_bg: u_menu_bg, panel_card: u_panel_card, panel_large: u_panel_large, pulse: u_pulse, pulse_pressed: u_pulse_pressed };
const IC = { 'i-gear': 'settings', 'i-pause': 'pause', 'i-back': 'back', 'i-lock': 'lock', 'i-pulse': 'pulse', 'i-crouch': 'crouch', 'i-eye': 'eye', 'i-flash': 'torch', 'i-card': 'keycard', 'i-key': 'key', 'i-fuse': 'fuse', 'i-radio': 'radio', 'i-bulb': 'hint', 'i-bag': 'bag', 'i-map': 'map', 'i-exit': 'exit', 'i-book': 'note' };
export function applySkin() {
  const r = document.documentElement.style, v = (k, u) => r.setProperty('--' + k, 'url(' + u + ')');
  for (const k of Object.keys(U)) if (!k.startsWith('ic_')) v('u-' + k.replace(/_/g, '-'), U[k]);
  for (const id of Object.keys(IC)) { const s = document.getElementById(id); if (s && U['ic_' + IC[id]]) s.innerHTML = '<image href="' + U['ic_' + IC[id]] + '" width="24" height="24"/>'; }
}
