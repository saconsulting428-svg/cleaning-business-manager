import { useEffect, useState } from 'react';

/**
 * Minimal form state helper: values, per-field errors, and a reset whenever
 * the modal re-opens with different initial values.
 */
export function useForm<T extends object>(initial: () => T, deps: unknown[]) {
  const [values, setValues] = useState<T>(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    setValues(initial());
    setErrors({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  const set = <K extends keyof T>(key: K, value: T[K]) => {
    setValues((v) => ({ ...v, [key]: value }));
    if (errors[key as string]) setErrors((e) => ({ ...e, [key as string]: '' }));
  };

  return { values, setValues, set, errors, setErrors };
}
