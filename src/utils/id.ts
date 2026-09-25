export function createId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Next sequential reference such as `JOB-1024`, based on existing numbers. */
export function nextNumber(prefix: string, existing: Array<{ number: string }>, start = 1001): string {
  const max = existing.reduce((acc, item) => {
    const n = Number(item.number.replace(/^\D+-?/, ''));
    return Number.isFinite(n) && n > acc ? n : acc;
  }, start - 1);
  return `${prefix}-${max + 1}`;
}
