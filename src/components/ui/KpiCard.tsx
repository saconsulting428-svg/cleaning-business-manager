import type { ReactNode } from 'react';
import { TrendingDown, TrendingUp } from 'lucide-react';
import { cn } from '@/utils/cn';

const accents = {
  teal: 'bg-brand-50 text-brand-600',
  blue: 'bg-sky-50 text-sky-600',
  green: 'bg-emerald-50 text-emerald-600',
  amber: 'bg-amber-50 text-amber-600',
  violet: 'bg-violet-50 text-violet-600',
  rose: 'bg-rose-50 text-rose-600',
};

export interface KpiCardProps {
  label: string;
  value: ReactNode;
  icon: ReactNode;
  accent?: keyof typeof accents;
  /** Secondary line under the value. */
  hint?: ReactNode;
  /** Percentage change vs. the previous period. */
  trend?: number | null;
  onClick?: () => void;
}

export function KpiCard({ label, value, icon, accent = 'teal', hint, trend, onClick }: KpiCardProps) {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={cn(
        'card flex w-full items-start gap-4 p-5 text-left',
        onClick && 'transition hover:border-brand-200 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40',
      )}
    >
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <p className="mt-1.5 truncate text-2xl font-semibold tracking-tight text-slate-900 tabular-nums">{value}</p>
        {(hint || (trend !== undefined && trend !== null)) && (
          <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
            {trend !== undefined && trend !== null && Number.isFinite(trend) && (
              <span
                className={cn(
                  'inline-flex items-center gap-0.5 font-semibold',
                  trend >= 0 ? 'text-emerald-600' : 'text-rose-600',
                )}
              >
                {trend >= 0 ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                {trend >= 0 ? '+' : ''}
                {trend.toFixed(1)}%
              </span>
            )}
            {hint && <span className="truncate">{hint}</span>}
          </div>
        )}
      </div>
      <div className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-xl', accents[accent])}>{icon}</div>
    </Tag>
  );
}
