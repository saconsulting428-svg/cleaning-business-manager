import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowUpRight, CalendarCheck, CalendarClock, CircleCheck, DollarSign, FilePlus, Hourglass, Plus, UserPlus, Users } from 'lucide-react';
import { Button, Card, CardHeader, EmptyState, KpiCard, StatusBadge } from '@/components/ui';
import { ColumnChart } from '@/components/charts/BarChart';
import { useAppData } from '@/store/AppDataContext';
import { useFormat } from '@/hooks/useFormat';
import { useLookups } from '@/hooks/useLookups';
import { customerStats, isCompleted, revenueBetween, summarizeInvoice, upcomingJobs } from '@/utils/calc';
import { addDaysISO, addMonths, endOfMonth, formatTime, MONTHS_SHORT, relativeDayLabel, startOfMonth, toISODate, todayISO } from '@/utils/date';
import { initials } from '@/utils/format';
import { CustomerFormModal } from '@/features/customers/CustomerFormModal';
import { CustomerDetailModal } from '@/features/customers/CustomerDetailModal';
import { JobFormModal } from '@/features/jobs/JobFormModal';
import { JobDetailModal } from '@/features/jobs/JobDetailModal';
import { InvoiceFormModal } from '@/features/invoices/InvoiceFormModal';

type Dialog = 'customer' | 'job' | 'invoice' | null;

function pctChange(current: number, previous: number): number | null {
  if (previous === 0) return current > 0 ? 100 : null;
  return ((current - previous) / previous) * 100;
}

export function DashboardPage() {
  const { data } = useAppData();
  const fmt = useFormat();
  const lookups = useLookups();
  const navigate = useNavigate();
  const [dialog, setDialog] = useState<Dialog>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [customerId, setCustomerId] = useState<string | null>(null);

  const today = todayISO();

  const kpis = useMemo(() => {
    const now = new Date();
    const mStart = toISODate(startOfMonth(now));
    const mEnd = toISODate(endOfMonth(now));
    const prev = addMonths(now, -1);
    const pStart = toISODate(startOfMonth(prev));
    const pEnd = toISODate(endOfMonth(prev));

    const todays = data.jobs.filter((j) => j.date === today && j.status !== 'Cancelled');
    const completed = data.jobs.filter(isCompleted);
    const completedThisMonth = completed.filter((j) => j.date >= mStart && j.date <= mEnd).length;
    const monthRevenue = revenueBetween(data.jobs, mStart, mEnd);
    const lastMonthRevenue = revenueBetween(data.jobs, pStart, pEnd);
    const summaries = data.invoices.map((i) => summarizeInvoice(i, data.payments, today));
    const open = summaries.filter((s) => s.balance > 0);
    const upcoming = upcomingJobs(data.jobs, today);
    const next7 = upcoming.filter((j) => j.date <= addDaysISO(today, 7));
    const newCustomers = data.customers.filter((c) => c.createdAt.slice(0, 10) >= mStart).length;

    return {
      todays,
      todaysDone: todays.filter(isCompleted).length,
      completed: completed.length,
      completedThisMonth,
      monthRevenue,
      revenueTrend: pctChange(monthRevenue, lastMonthRevenue),
      pendingAmount: open.reduce((s, x) => s + x.balance, 0),
      openInvoices: open.length,
      overdue: open.filter((s) => s.status === 'Overdue').length,
      upcoming,
      next7: next7.length,
      newCustomers,
    };
  }, [data, today]);

  const revenueSeries = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 6 }, (_, i) => {
      const m = addMonths(now, i - 5);
      const from = toISODate(startOfMonth(m));
      const to = toISODate(endOfMonth(m));
      const jobs = data.jobs.filter((j) => isCompleted(j) && j.date >= from && j.date <= to).length;
      return {
        label: `${MONTHS_SHORT[m.getMonth()]}${m.getMonth() === 0 || i === 0 ? ` '${String(m.getFullYear()).slice(2)}` : ''}`,
        value: revenueBetween(data.jobs, from, to),
        detail: `${jobs} completed job${jobs === 1 ? '' : 's'}`,
      };
    });
  }, [data.jobs]);
  const sixMonthTotal = revenueSeries.reduce((s, d) => s + d.value, 0);

  const recentCustomers = useMemo(
    () => [...data.customers].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5),
    [data.customers],
  );

  return (
    <div className="space-y-6">
      {/* Greeting + quick actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">Welcome back</h1>
          <p className="mt-1 text-sm text-slate-500">
            You have <span className="font-medium text-slate-700">{kpis.todays.length - kpis.todaysDone} open job{kpis.todays.length - kpis.todaysDone === 1 ? '' : 's'}</span> today
            {kpis.overdue > 0 && (
              <>
                {' '}and <span className="font-medium text-rose-600">{kpis.overdue} overdue invoice{kpis.overdue === 1 ? '' : 's'}</span>
              </>
            )}
            .
          </p>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:flex sm:flex-wrap">
          <Button variant="secondary" icon={<UserPlus className="h-4 w-4" />} onClick={() => setDialog('customer')}>
            Add Customer
          </Button>
          <Button variant="secondary" icon={<FilePlus className="h-4 w-4" />} onClick={() => setDialog('invoice')}>
            Create Invoice
          </Button>
          <Button icon={<Plus className="h-4 w-4" />} onClick={() => setDialog('job')}>
            Add Cleaning Job
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <KpiCard
          label="Total Customers"
          value={data.customers.length}
          icon={<Users className="h-5 w-5" />}
          accent="teal"
          hint={`${kpis.newCustomers} new this month`}
          onClick={() => navigate('/customers')}
        />
        <KpiCard
          label="Today's Jobs"
          value={kpis.todays.length}
          icon={<CalendarCheck className="h-5 w-5" />}
          accent="blue"
          hint={`${kpis.todaysDone} completed so far`}
          onClick={() => navigate('/schedule')}
        />
        <KpiCard
          label="Completed Jobs"
          value={kpis.completed}
          icon={<CircleCheck className="h-5 w-5" />}
          accent="green"
          hint={`${kpis.completedThisMonth} this month`}
          onClick={() => navigate('/jobs')}
        />
        <KpiCard
          label="Monthly Revenue"
          value={fmt.money(kpis.monthRevenue)}
          icon={<DollarSign className="h-5 w-5" />}
          accent="violet"
          trend={kpis.revenueTrend}
          hint="vs last month"
          onClick={() => navigate('/reports')}
        />
        <KpiCard
          label="Pending Payments"
          value={fmt.money(kpis.pendingAmount)}
          icon={<Hourglass className="h-5 w-5" />}
          accent="amber"
          hint={`${kpis.openInvoices} open invoice${kpis.openInvoices === 1 ? '' : 's'}`}
          onClick={() => navigate('/invoices')}
        />
        <KpiCard
          label="Upcoming Jobs"
          value={kpis.upcoming.length}
          icon={<CalendarClock className="h-5 w-5" />}
          accent="rose"
          hint={`${kpis.next7} in the next 7 days`}
          onClick={() => navigate('/schedule')}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* Revenue chart */}
        <Card className="xl:col-span-2">
          <CardHeader
            title="Revenue Overview"
            description="Completed job revenue over the last 6 months"
            action={
              <div className="text-right">
                <p className="text-lg font-semibold tabular-nums text-slate-900">{fmt.money(sixMonthTotal)}</p>
                <p className="text-xs text-slate-500">6-month total</p>
              </div>
            }
          />
          <div className="p-4 sm:p-5">
            {sixMonthTotal === 0 ? (
              <EmptyState compact title="No revenue yet" description="Revenue appears here as cleaning jobs are marked completed." />
            ) : (
              <ColumnChart data={revenueSeries} format={fmt.money} axisFormat={fmt.moneyCompact} showLabels />
            )}
          </div>
        </Card>

        {/* Recent customers */}
        <Card>
          <CardHeader
            title="Recent Customers"
            description="Newest customers first"
            action={
              <Button size="sm" variant="ghost" onClick={() => navigate('/customers')}>
                View all <ArrowUpRight className="h-3.5 w-3.5" />
              </Button>
            }
          />
          {recentCustomers.length === 0 ? (
            <EmptyState
              compact
              icon={<Users className="h-6 w-6" />}
              title="No customers yet"
              action={
                <Button size="sm" icon={<UserPlus className="h-3.5 w-3.5" />} onClick={() => setDialog('customer')}>
                  Add Customer
                </Button>
              }
            />
          ) : (
            <ul className="divide-y divide-slate-100">
              {recentCustomers.map((c) => {
                const stats = customerStats(c, data);
                return (
                  <li key={c.id}>
                    <button type="button" onClick={() => setCustomerId(c.id)} className="flex w-full items-center gap-3 px-5 py-3 text-left hover:bg-slate-50">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-semibold text-brand-700">
                        {initials(c.name)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-slate-900">{c.name}</span>
                        <span className="block truncate text-xs text-slate-500">
                          {c.city} · {stats.totalJobs} job{stats.totalJobs === 1 ? '' : 's'}
                        </span>
                      </span>
                      <StatusBadge status={c.type} />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>

      {/* Upcoming jobs */}
      <Card>
        <CardHeader
          title="Upcoming Jobs"
          description="Next scheduled and in-progress cleaning jobs"
          action={
            <Button size="sm" variant="ghost" onClick={() => navigate('/schedule')}>
              Open schedule <ArrowUpRight className="h-3.5 w-3.5" />
            </Button>
          }
        />
        {kpis.upcoming.length === 0 ? (
          <EmptyState
            icon={<CalendarClock className="h-6 w-6" />}
            title="No upcoming jobs"
            description="Book a cleaning job to see it here."
            action={
              <Button size="sm" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => setDialog('job')}>
                Add Cleaning Job
              </Button>
            }
          />
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/70 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <th className="px-5 py-3">Customer</th>
                    <th className="px-4 py-3">Service</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Time</th>
                    <th className="px-4 py-3">Assigned Cleaner</th>
                    <th className="px-4 py-3 text-right">Price</th>
                    <th className="px-5 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {kpis.upcoming.slice(0, 8).map((j) => (
                    <tr key={j.id} onClick={() => setJobId(j.id)} className="cursor-pointer hover:bg-brand-50/40">
                      <td className="whitespace-nowrap px-5 py-3 font-medium text-slate-900">{lookups.customerName(j.customerId)}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-600">{lookups.serviceName(j.serviceId)}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                        {relativeDayLabel(j.date) ? <span className="font-medium text-brand-700">{relativeDayLabel(j.date)}</span> : fmt.date(j.date)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                        {formatTime(j.startTime)} – {formatTime(j.endTime)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-600">{lookups.employeeName(j.employeeId)}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-right font-medium tabular-nums text-slate-900">{fmt.money(j.price)}</td>
                      <td className="whitespace-nowrap px-5 py-3">
                        <StatusBadge status={j.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <ul className="divide-y divide-slate-100 md:hidden">
              {kpis.upcoming.slice(0, 8).map((j) => (
                <li key={j.id}>
                  <button type="button" onClick={() => setJobId(j.id)} className="w-full px-4 py-3 text-left active:bg-slate-50">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-900">{lookups.customerName(j.customerId)}</p>
                        <p className="truncate text-xs text-slate-500">{lookups.serviceName(j.serviceId)}</p>
                      </div>
                      <StatusBadge status={j.status} />
                    </div>
                    <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                      <span>
                        {relativeDayLabel(j.date) ?? fmt.date(j.date)} · {formatTime(j.startTime)} · {lookups.employeeName(j.employeeId)}
                      </span>
                      <span className="text-sm font-semibold tabular-nums text-slate-900">{fmt.money(j.price)}</span>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
            {kpis.upcoming.length > 8 && (
              <div className="border-t border-slate-100 px-5 py-3 text-center">
                <Button size="sm" variant="ghost" onClick={() => navigate('/jobs')}>
                  View all {kpis.upcoming.length} upcoming jobs
                </Button>
              </div>
            )}
          </>
        )}
      </Card>

      <CustomerFormModal open={dialog === 'customer'} onClose={() => setDialog(null)} />
      <JobFormModal open={dialog === 'job'} onClose={() => setDialog(null)} />
      <InvoiceFormModal open={dialog === 'invoice'} onClose={() => setDialog(null)} />
      <JobDetailModal jobId={jobId} onClose={() => setJobId(null)} />
      <CustomerDetailModal customerId={customerId} onClose={() => setCustomerId(null)} />
    </div>
  );
}
