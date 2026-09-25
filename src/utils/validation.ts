export type Errors<T> = Partial<Record<keyof T | string, string>>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_RE = /^[+()\-.\s\d]{7,20}$/;

export const isEmail = (v: string) => EMAIL_RE.test(v.trim());
export const isPhone = (v: string) => PHONE_RE.test(v.trim()) && /\d{3,}/.test(v.replace(/\D/g, ''));

export function required(v: string | number | undefined | null, label: string): string | undefined {
  if (v === undefined || v === null) return `${label} is required`;
  if (typeof v === 'string' && !v.trim()) return `${label} is required`;
  return undefined;
}

export function hasErrors(errors: Record<string, string | undefined>): boolean {
  return Object.values(errors).some(Boolean);
}

/** Drop undefined entries so the error object only contains real messages. */
export function compact<T extends Record<string, string | undefined>>(errors: T): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(errors)) if (v) out[k] = v;
  return out;
}
