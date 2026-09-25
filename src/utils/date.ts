import type { DateFormat, ISODate, TimeString } from '@/types';

const pad = (n: number) => String(n).padStart(2, '0');

export const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const MONTHS_LONG = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
export const WEEKDAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** Convert a Date to a local `YYYY-MM-DD` string. */
export function toISODate(d: Date): ISODate {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Parse `YYYY-MM-DD` as a local date (midnight). */
export function parseISODate(s: ISODate): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

export function todayISO(): ISODate {
  return toISODate(new Date());
}

export function addDays(d: Date, days: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + days);
  return r;
}

export function addDaysISO(s: ISODate, days: number): ISODate {
  return toISODate(addDays(parseISODate(s), days));
}

export function addMonths(d: Date, months: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + months, 1);
}

export function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export function endOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}

export function startOfWeek(d: Date): Date {
  const r = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  r.setDate(r.getDate() - r.getDay());
  return r;
}

export function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/** `YYYY-MM` key for grouping by month. */
export function monthKey(s: ISODate): string {
  return s.slice(0, 7);
}

export function isInRange(s: ISODate, from: ISODate, to: ISODate): boolean {
  return s >= from && s <= to;
}

export function formatDate(s: ISODate, fmt: DateFormat): string {
  if (!s) return '—';
  const d = parseISODate(s);
  const dd = pad(d.getDate());
  const mm = pad(d.getMonth() + 1);
  const yyyy = d.getFullYear();
  switch (fmt) {
    case 'DD/MM/YYYY':
      return `${dd}/${mm}/${yyyy}`;
    case 'YYYY-MM-DD':
      return `${yyyy}-${mm}-${dd}`;
    case 'MMM D, YYYY':
      return `${MONTHS_SHORT[d.getMonth()]} ${d.getDate()}, ${yyyy}`;
    case 'MM/DD/YYYY':
    default:
      return `${mm}/${dd}/${yyyy}`;
  }
}

/** `09:30` → `9:30 AM` */
export function formatTime(t: TimeString): string {
  if (!t) return '—';
  const [h, m] = t.split(':').map(Number);
  const suffix = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${pad(m)} ${suffix}`;
}

export function timeToMinutes(t: TimeString): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

export function minutesToTime(mins: number): TimeString {
  const clamped = Math.max(0, Math.min(23 * 60 + 59, Math.round(mins)));
  return `${pad(Math.floor(clamped / 60))}:${pad(clamped % 60)}`;
}

export function formatDuration(mins: number): string {
  if (!mins) return '—';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h && m) return `${h}h ${m}m`;
  if (h) return `${h}h`;
  return `${m}m`;
}

export function relativeDayLabel(s: ISODate): string | null {
  const today = todayISO();
  if (s === today) return 'Today';
  if (s === addDaysISO(today, 1)) return 'Tomorrow';
  if (s === addDaysISO(today, -1)) return 'Yesterday';
  return null;
}

export function longDate(d: Date): string {
  return `${WEEKDAYS_SHORT[d.getDay()]}, ${MONTHS_LONG[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}
