import { useMemo, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, Clock, MapPin, Plus, User } from 'lucide-react';
import type { CleaningJob } from '@/types';
import { Button, Card, CardHeader, EmptyState, FilterSelect, JOB_CHIP_STYLES, PageHeader, SegmentedControl, StatusBadge } from '@/components/ui';
import { useAppData } from '@/store/AppDataContext';
import { useFormat } from '@/hooks/useFormat';
import { useLookups } from '@/hooks/useLookups';
import { sortJobsByDateTime, upcomingJobs } from '@/utils/calc';
import {
  addDays,
  addMonths,
  formatTime,
  isSameDay,
  longDate,
  MONTHS_LONG,
  MONTHS_SHORT,
  relativeDayLabel,
  startOfMonth,
  startOfWeek,
  toISODate,
  todayISO,
  WEEKDAYS_SHORT,
} from '@/utils/date';
import { JobDetailModal } from '@/features/jobs/JobDetailModal';
import { JobFormModal } from '@/features/jobs/JobFormModal';
import { cn } from '@/utils/cn';

type View = 'month' | 'week' | 'day';

function JobChip({ job, label, onClick, showTime = true }: { job: CleaningJob; label: string; onClick: () => void; showTime?: boolean }) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      title={`${formatTime(job.startTime)} ${label} (${job.status})`}
      className={cn('block w-full truncate rounded border-l-[3px] px-1.5 py-0.5 text-left text-[11px] font-medium leading-4 transition', JOB_CHIP_STYLES[job.status])}
    >
      {showTime && <span className="opacity-70">{formatTime(job.startTime).replace(':00', '')} </span>}
      {label}
    </button>
  );
}

export function SchedulePage() {
  const { data } = useAppData();
  const fmt = useFormat();
  const lookups = useLookups();
  const [view, setView] = useState<View>('month');
  const [cursor, setCursor] = useState(() => new Date());
  const [employee, setEmployee] = useState('all');
  const [showCancelled, setShowCancelled] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [newJobDate, setNewJobDate] = useState<string | null>(null);

  const today = new Date();
  const todayStr = todayISO();

  const jobs = useMemo(
    () =>
      data.jobs
        .filter((j) => (showCancelled || j.status !== 'Cancelled') && (employee === 'all' || j.employeeId === employee))
        .sort(sortJobsByDateTime),
    [data.jobs, employee, showCancelled],
  );
  const byDate = useMemo(() => {
    const m = new Map<string, CleaningJob[]>();
    for (const j of jobs) m.set(j.date, [...(m.get(j.date) ?? []), j]);
    return m;
  }, [jobs]);

  const move = (dir: 1 | -1) => {
    if (view === 'month') setCursor((c) => addMonths(c, dir));
    else if (view === 'week') setCursor((c) => addDays(c, dir * 7));
    else setCursor((c) => addDays(c, dir));
  };

  const openDay = (d: Date) => {
    setCursor(d);
    setView('day');
  };

  const weekStart = startOfWeek(cursor);
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const title =
    view === 'month'
      ? `${MONTHS_LONG[cursor.getMonth()]} ${cursor.getFullYear()}`
      : view === 'week'
        ? `${MONTHS_SHORT[weekDays[0]!.getMonth()]} ${weekDays[0]!.getDate()} – ${MONTHS_SHORT[weekDays[6]!.getMonth()]} ${weekDays[6]!.getDate()}, ${weekDays[6]!.getFullYear()}`
        : longDate(cursor);

  const upcoming = useMemo(
    () => upcomingJobs(data.jobs, todayStr).filter((j) => employee === 'all' || j.employeeId === employee).slice(0, 8),
    [data.jobs, todayStr, employee],
  );

  const customerLabel = (j: CleaningJob) => lookups.customerName(j.customerId);

  /* --------------------------------- Views -------------------------------- */

  const monthView = () => {
    const first = startOfWeek(startOfMonth(cursor));
    const cells = Array.from({ length: 42 }, (_, i) => addDays(first, i));
    return (
      <div>
        <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50/70 text-center text-[11px] font-semibold uppercase tracking-wide text-slate-500">
          {WEEKDAYS_SHORT.map((d) => (
            <div key={d} className="py-2">
              <span className="hidden sm:inline">{d}</span>
              <span className="sm:hidden">{d[0]}</span>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {cells.map((d, i) => {
            const key = toISODate(d);
            const dayJobs = byDate.get(key) ?? [];
            const inMonth = d.getMonth() === cursor.getMonth();
            const isToday = isSameDay(d, today);
            return (
              <div
                key={key}
                role="button"
                tabIndex={0}
                onClick={() => openDay(d)}
                onKeyDown={(e) => e.key === 'Enter' && openDay(d)}
                className={cn(
                  'min-h-[64px] cursor-pointer border-slate-100 p-1 text-left transition hover:bg-brand-50/40 sm:min-h-[108px] sm:p-1.5',
                  i % 7 !== 6 && 'border-r',
                  i < 35 && 'border-b',
                  !inMonth && 'bg-slate-50/60',
                )}
              >
                <div className="mb-1 flex items-center justify-between">
                  <span
                    className={cn(
                      'flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium',
                      isToday ? 'bg-brand-600 text-white' : inMonth ? 'text-slate-700' : 'text-slate-400',
                    )}
                  >
                    {d.getDate()}
                  </span>
                  {dayJobs.length > 0 && (
                    <span className="rounded-full bg-brand-50 px-1.5 text-[10px] font-semibold text-brand-700 sm:hidden">{dayJobs.length}</span>
                  )}
                </div>
                <div className="hidden space-y-0.5 sm:block">
                  {dayJobs.slice(0, 3).map((j) => (
                    <JobChip key={j.id} job={j} label={customerLabel(j)} onClick={() => setJobId(j.id)} />
                  ))}
                  {dayJobs.length > 3 && <p className="px-1 text-[11px] font-medium text-slate-500">+{dayJobs.length - 3} more</p>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const weekView = () => (
    <div className="grid grid-cols-1 divide-y divide-slate-100 md:grid-cols-7 md:divide-x md:divide-y-0">
      {weekDays.map((d) => {
        const key = toISODate(d);
        const dayJobs = byDate.get(key) ?? [];
        const isToday = isSameDay(d, today);
        return (
          <div key={key} className="min-h-0 md:min-h-[420px]">
            <button
              type="button"
              onClick={() => openDay(d)}
              className={cn('flex w-full items-center gap-2 px-3 py-2 text-left md:flex-col md:gap-0 md:text-center', isToday ? 'bg-brand-50' : 'bg-slate-50/70')}
            >
              <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{WEEKDAYS_SHORT[d.getDay()]}</span>
              <span className={cn('text-lg font-semibold', isToday ? 'text-brand-700' : 'text-slate-800')}>{d.getDate()}</span>
              <span className="ml-auto text-xs text-slate-400 md:hidden">{dayJobs.length} jobs</span>
            </button>
            <div className="space-y-1.5 p-2">
              {dayJobs.map((j) => (
                <button
                  key={j.id}
                  type="button"
                  onClick={() => setJobId(j.id)}
                  className={cn('block w-full rounded-md border-l-[3px] px-2 py-1.5 text-left text-xs transition', JOB_CHIP_STYLES[j.status])}
                >
                  <p className="font-semibold">
                    {formatTime(j.startTime)} – {formatTime(j.endTime)}
                  </p>
                  <p className="truncate font-medium">{customerLabel(j)}</p>
                  <p className="truncate opacity-75">{lookups.serviceName(j.serviceId)}</p>
                  <p className="truncate opacity-75">{lookups.employeeName(j.employeeId)}</p>
                </button>
              ))}
              {dayJobs.length === 0 && <p className="px-1 py-2 text-center text-xs text-slate-400">No jobs</p>}
            </div>
          </div>
        );
      })}
    </div>
  );

  const dayView = () => {
    const key = toISODate(cursor);
    const dayJobs = byDate.get(key) ?? [];
    if (dayJobs.length === 0) {
      return (
        <EmptyState
          icon={<CalendarDays className="h-6 w-6" />}
          title="No jobs scheduled"
          description={`Nothing is booked for ${fmt.date(key)}.`}
          action={
            <Button size="sm" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => setNewJobDate(key)}>
              Add Job on this day
            </Button>
          }
        />
      );
    }
    return (
      <ol className="relative space-y-3 p-4 sm:p-5">
        {dayJobs.map((j) => {
          const customer = lookups.customers.get(j.customerId);
          return (
            <li key={j.id} className="flex gap-3 sm:gap-4">
              <div className="w-16 shrink-0 pt-3 text-right text-xs font-semibold text-slate-500 sm:w-20">
                {formatTime(j.startTime)}
                <p className="font-normal text-slate-400">{formatTime(j.endTime)}</p>
              </div>
              <button
                type="button"
                onClick={() => setJobId(j.id)}
                className={cn('flex-1 rounded-xl border-l-4 px-4 py-3 text-left transition', JOB_CHIP_STYLES[j.status])}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold">{customer?.name ?? 'Removed customer'}</p>
                    <p className="text-sm opacity-80">{lookups.serviceName(j.serviceId)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold tabular-nums">{fmt.money(j.price)}</span>
                    <StatusBadge status={j.status} className="bg-white/70" />
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs opacity-80">
                  <span className="inline-flex items-center gap-1">
                    <User className="h-3.5 w-3.5" />
                    {lookups.employeeName(j.employeeId)}
                  </span>
                  {customer && (
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" />
                      {customer.address}, {customer.city}
                    </span>
                  )}
                </div>
              </button>
            </li>
          );
        })}
      </ol>
    );
  };

  return (
    <div>
      <PageHeader
        title="Schedule"
        description="See every cleaning job by month, week or day"
        actions={
          <Button icon={<Plus className="h-4 w-4" />} onClick={() => setNewJobDate(view === 'day' ? toISODate(cursor) : todayStr)}>
            Add Job
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <Card className="min-w-0 overflow-hidden">
          <div className="flex flex-col gap-3 border-b border-slate-100 p-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-2">
              <Button variant="secondary" size="icon" onClick={() => move(-1)} aria-label="Previous">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="secondary" size="icon" onClick={() => move(1)} aria-label="Next">
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button variant="secondary" size="sm" onClick={() => setCursor(new Date())}>
                Today
              </Button>
              <h2 className="ml-1 truncate text-sm font-semibold text-slate-900 sm:text-base">{title}</h2>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <FilterSelect
                label="Filter by employee"
                value={employee}
                onChange={setEmployee}
                className="h-8 w-auto py-1 text-xs sm:w-44"
                options={[
                  { value: 'all', label: 'All employees' },
                  ...data.employees.filter((e) => e.status === 'Active').map((e) => ({ value: e.id, label: e.name })),
                ]}
              />
              <label className="inline-flex items-center gap-1.5 text-xs text-slate-600">
                <input
                  type="checkbox"
                  checked={showCancelled}
                  onChange={(e) => setShowCancelled(e.target.checked)}
                  className="h-3.5 w-3.5 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                />
                Show cancelled
              </label>
              <SegmentedControl<View>
                value={view}
                onChange={setView}
                options={[
                  { value: 'month', label: 'Month' },
                  { value: 'week', label: 'Week' },
                  { value: 'day', label: 'Day' },
                ]}
              />
            </div>
          </div>
          {view === 'month' && monthView()}
          {view === 'week' && weekView()}
          {view === 'day' && dayView()}
          <div className="flex flex-wrap gap-3 border-t border-slate-100 px-4 py-3 text-xs text-slate-500">
            {Object.keys(JOB_CHIP_STYLES).map((s) => (
              <span key={s} className="inline-flex items-center gap-1.5">
                <span className={cn('h-3 w-3 rounded-sm border-l-[3px]', JOB_CHIP_STYLES[s])} />
                {s}
              </span>
            ))}
          </div>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Daily Schedule" description={relativeDayLabel(toISODate(cursor)) ?? fmt.date(toISODate(cursor))} />
            {(() => {
              const list = byDate.get(toISODate(cursor)) ?? [];
              if (list.length === 0) return <p className="px-5 py-6 text-center text-sm text-slate-400">No jobs on this day</p>;
              return (
                <ul className="divide-y divide-slate-100">
                  {list.map((j) => (
                    <li key={j.id}>
                      <button type="button" onClick={() => setJobId(j.id)} className="flex w-full items-center gap-3 px-5 py-3 text-left hover:bg-slate-50">
                        <span className="w-16 shrink-0 text-xs font-semibold text-slate-500">{formatTime(j.startTime)}</span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium text-slate-900">{customerLabel(j)}</span>
                          <span className="block truncate text-xs text-slate-500">{lookups.employeeName(j.employeeId)}</span>
                        </span>
                        <StatusBadge status={j.status} />
                      </button>
                    </li>
                  ))}
                </ul>
              );
            })()}
          </Card>

          <Card>
            <CardHeader title="Upcoming Jobs" description="Next scheduled cleanings" />
            {upcoming.length === 0 ? (
              <p className="px-5 py-6 text-center text-sm text-slate-400">No upcoming jobs</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {upcoming.map((j) => (
                  <li key={j.id}>
                    <button type="button" onClick={() => setJobId(j.id)} className="w-full px-5 py-3 text-left hover:bg-slate-50">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-medium text-slate-900">{customerLabel(j)}</span>
                        <span className="shrink-0 text-xs font-medium text-brand-700">{relativeDayLabel(j.date) ?? fmt.date(j.date)}</span>
                      </div>
                      <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-500">
                        <Clock className="h-3 w-3" />
                        {formatTime(j.startTime)} · {lookups.serviceName(j.serviceId)}
                      </p>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>

      <JobDetailModal jobId={jobId} onClose={() => setJobId(null)} />
      <JobFormModal open={newJobDate !== null} onClose={() => setNewJobDate(null)} defaults={{ date: newJobDate ?? undefined }} />
    </div>
  );
}

