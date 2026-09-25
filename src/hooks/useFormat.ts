import { useMemo } from 'react';
import { useAppData } from '@/store/AppDataContext';
import { formatDate } from '@/utils/date';
import { formatMoney } from '@/utils/format';
import type { ISODate } from '@/types';

/** Formatting helpers bound to the user's currency and date preferences. */
export function useFormat() {
  const { currency, dateFormat } = useAppData().data.settings;
  return useMemo(
    () => ({
      money: (n: number) => formatMoney(n, currency),
      moneyCompact: (n: number) => formatMoney(n, currency, true),
      date: (d: ISODate) => formatDate(d, dateFormat),
      currency,
    }),
    [currency, dateFormat],
  );
}
