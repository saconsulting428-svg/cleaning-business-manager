// Thin platform layer: haptics, external links, app lifecycle. Uses Capacitor plugins when
// present (Android build) and falls back to web APIs in the browser.
let hapticsOn = true;
export const setHapticsEnabled = (v) => { hapticsOn = !!v; };

const cap = () => globalThis.Capacitor;
export const isNative = () => !!cap()?.isNativePlatform?.();

/** Short vibration. `ms` may be a number or a pattern array. Always guarded. */
export function haptic(ms = 12) {
  if (!hapticsOn) return;
  try {
    const H = cap()?.Plugins?.Haptics;
    if (H?.vibrate) { H.vibrate({ duration: Array.isArray(ms) ? ms[0] : ms }); return; }
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') navigator.vibrate(ms);
  } catch { /* vibration is best effort */ }
}

export function openUrl(url) {
  try {
    const B = cap()?.Plugins?.Browser;
    if (B?.open) { B.open({ url }); return; }
    window.open(url, '_blank', 'noopener');
  } catch { /* ignore */ }
}

/** Calls cb when the app goes to background (true) or returns (false). Works in browser + Capacitor. */
export function onAppVisibility(cb) {
  document.addEventListener('visibilitychange', () => cb(document.hidden));
  window.addEventListener('pagehide', () => cb(true));
  try {
    const A = cap()?.Plugins?.App;
    A?.addListener?.('appStateChange', (s) => cb(!s.isActive));
  } catch { /* ignore */ }
}
