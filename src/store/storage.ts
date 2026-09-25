import type { AppData } from '@/types';
import { createStarterData, DEFAULT_SETTINGS } from '@/data/seed';

/** Single localStorage key that holds every record of the application. */
export const STORAGE_KEY = 'cleanpro:data:v1';

const COLLECTIONS = ['customers', 'employees', 'services', 'jobs', 'invoices', 'payments'] as const;

function isValid(value: unknown): value is AppData {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return COLLECTIONS.every((k) => Array.isArray(v[k])) && typeof v.settings === 'object' && v.settings !== null;
}

/** Load persisted data. First launch (nothing stored) creates the starter data. */
export function loadData(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed: unknown = JSON.parse(raw);
      if (isValid(parsed)) {
        return { ...parsed, settings: { ...DEFAULT_SETTINGS, ...parsed.settings } };
      }
    }
  } catch {
    // Corrupt or inaccessible storage — fall through to fresh data.
  }
  const data = createStarterData();
  saveData(data);
  return data;
}

export function saveData(data: AppData): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}
