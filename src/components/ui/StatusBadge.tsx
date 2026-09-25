import { cn } from '@/utils/cn';

type Tone = 'blue' | 'amber' | 'green' | 'red' | 'slate' | 'teal' | 'violet';

const tones: Record<Tone, string> = {
  blue: 'bg-sky-50 text-sky-700 ring-sky-600/20',
  amber: 'bg-amber-50 text-amber-800 ring-amber-600/25',
  green: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  red: 'bg-rose-50 text-rose-700 ring-rose-600/20',
  slate: 'bg-slate-100 text-slate-600 ring-slate-500/20',
  teal: 'bg-brand-50 text-brand-700 ring-brand-600/20',
  violet: 'bg-violet-50 text-violet-700 ring-violet-600/20',
};

const dots: Record<Tone, string> = {
  blue: 'bg-sky-500',
  amber: 'bg-amber-500',
  green: 'bg-emerald-500',
  red: 'bg-rose-500',
  slate: 'bg-slate-400',
  teal: 'bg-brand-500',
  violet: 'bg-violet-500',
};

/** Every status label used in the app mapped to a colour tone. */
const STATUS_TONES: Record<string, Tone> = {
  // Jobs
  Scheduled: 'blue',
  'In Progress': 'amber',
  Completed: 'green',
  Cancelled: 'slate',
  // Payments / invoices
  Paid: 'green',
  Pending: 'amber',
  'Partially Paid': 'violet',
  Overdue: 'red',
  // Active flags
  Active: 'green',
  Inactive: 'slate',
  // Customer type
  Residential: 'teal',
  Commercial: 'blue',
  // Roles
  Cleaner: 'teal',
  Supervisor: 'violet',
  Manager: 'blue',
};

export function statusTone(status: string): Tone {
  return STATUS_TONES[status] ?? 'slate';
}

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const tone = statusTone(status);
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset',
        tones[tone],
        className,
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', dots[tone])} />
      {status}
    </span>
  );
}

/** Accent classes for calendar chips, keyed by job status. */
export const JOB_CHIP_STYLES: Record<string, string> = {
  Scheduled: 'border-l-sky-500 bg-sky-50 text-sky-900 hover:bg-sky-100',
  'In Progress': 'border-l-amber-500 bg-amber-50 text-amber-900 hover:bg-amber-100',
  Completed: 'border-l-emerald-500 bg-emerald-50 text-emerald-900 hover:bg-emerald-100',
  Cancelled: 'border-l-slate-400 bg-slate-100 text-slate-500 line-through hover:bg-slate-200',
};
