// Time helpers. All game timers are based on Date.now() (wall clock) so they keep
// running while the app is closed.

const pad = (n) => String(n).padStart(2, '0');

/** Local calendar day key: '2026-10-19' */
export function dayKey(ts = Date.now()) {
  const d = new Date(ts);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Local ISO-ish week key: Monday-based, e.g. '2026-W43' */
export function weekKey(ts = Date.now()) {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const week1 = new Date(d.getFullYear(), 0, 4);
  const w = 1 + Math.round(((d - week1) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
  return `${d.getFullYear()}-W${pad(w)}`;
}

export function msToMidnight(ts = Date.now()) {
  const d = new Date(ts);
  d.setHours(24, 0, 0, 0);
  return d.getTime() - ts;
}

export function msToNextMonday(ts = Date.now()) {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + (8 - (d.getDay() || 7)));
  return d.getTime() - ts;
}

/** 83000 -> '1:23' ; 3725000 -> '1:02:05' */
export function fmtClock(ms) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${m}:${pad(sec)}`;
}

/** Compact: '3:59' (h:mm) when over an hour, else 'mm:ss' */
export function fmtShort(ms) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  if (s >= 3600) return `${Math.floor(s / 3600)}:${pad(Math.floor((s % 3600) / 60))}h`;
  return `${Math.floor(s / 60)}:${pad(s % 60)}`;
}

/** 'Xh Ym' for "away for" text */
export function fmtAway(ms) {
  const m = Math.floor(ms / 60000);
  if (m < 60) return `${Math.max(1, m)}m`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}
