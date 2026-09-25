import { useMemo, useState } from 'react';
import { CircleCheck, DollarSign, Hourglass, TrendingUp, Users } from 'lucide-react';
import { Card, CardHeader, EmptyState, KpiCard, PageHeader, SegmentedControl } from '@/components/ui';
import { ColumnChart, HorizontalBarChart, STATUS_CHART_COLORS } from '@/components/charts/BarChart';
import { useAppData } from '@/store/AppDataContext';
import { useFormat } from '@/hooks/useFormat';
import { useLookups } from '@/hooks/useLookups';
import { invoiceBalance, isCompleted } from '@/utils/calc';
import { roundMoney } from '@/utils/format';
import { addDays, addMonths, endOfMonth, MONTHS_SHORT, startOfMonth, toISODate } from '@/utils/date';
import { JOB_STATUSES } from '@/features/jobs/JobFormModal';

type Period = 'this_month' | 'last_month' | 'last_3_months' | 'this_year';

const PERIODS: Array<{ value: Period; label: string }> = [
  { value: 'this_month', label: 'This Month' },
  { value: 'last_month', label: 'Last Month' },
  { value: 'last_3_months', label: 'Last 3 Months' },
  { value: 'this_year', label: 'This Year' },
];

function periodRange(p: Period): { from: Date; to: Date; months: number } {
  const now = new Date();
  switch (p) {
    case 'last_month': {
      const m = addMonths(now, -1);
      return { from: startOfMonth(m), to: endOfMonth(m), months: 1 };
    }
    case 'last_3_months':
      return { from: startOfMonth(addMonths(now, -2)), to: endOfMonth(now), months: 3 };
    case 'this_year':
      return { from: new Date(now.getFullYear(), 0, 1), to: endOfMonth(now), months: now.getMonth() + 1 };
    case 'this_month':
    default:
      return { from: startOfMonth(now), to: endOfMonth(now), months: 1 };
  }
}

export function ReportsPage() {
  const { data } = useAppData();
  const fmt = useFormat();
  const lookups = useLookups();
  const [period, setPeriod] = useState<Period>('this_month');

  const report = useMemo(() => {
    const { from, to, months } = periodRange(period);
    const f = toISODate(from);
    const t = toISODate(to);
    const inRange = (d: string) => d >= f && d <= t;

    const jobs = data.jobs.filter((j) => inRange(j.date));
    const completed = jobs.filter(isCompleted);
    const revenue = roundMoney(completed.reduce((s, j) => s + j.price, 0));

    // Revenue trend: by week for single-month periods, by month otherwise.
    let trend: Array<{ label: string; value: number; detail: string }>;
    if (months === 1) {
      trend = [];
      for (let start = new Date(from), w = 1; start <= to; start = addDays(start, 7), w++) {
        const end = addDays(start, 6) > to ? to : addDays(start, 6);
        const s = toISODate(start);
        const e = toISODate(end);
        const wk = completed.filter((j) => j.date >= s && j.date <= e);
        trend.push({
          label: `${MONTHS_SHORT[start.getMonth()]} ${start.getDate()}–${end.getDate()}`,
          value: roundMoney(wk.reduce((sum, j) => sum + j.price, 0)),
          detail: `Week ${w} · ${wk.length} completed job${wk.length === 1 ? '' : 's'}`,
        });
      }
    } else {
      trend = Array.from({ length: months }, (_, i) => {
        const m = addMonths(from, i);
        const s = toISODate(startOfMonth(m));
        const e = toISODate(endOfMonth(m));
        const mj = completed.filter((j) => j.date >= s && j.date <= e);
        return {
          label: MONTHS_SHORT[m.getMonth()]!,
          value: roundMoney(mj.reduce((sum, j) => sum + j.price, 0)),
          detail: `${mj.length} completed job${mj.length === 1 ? '' : 's'}`,
        };
      });
    }

    const byStatus = JOB_STATUSES.map((s) => {
      const n = jobs.filter((j) => j.status === s).length;
      return { label: s, value: n, color: STATUS_CHART_COLORS[s], detail: jobs.length ? `${Math.round((n / jobs.length) * 100)}% of jobs` : undefined };
    });

    const serviceTotals = new Map<string, { value: number; count: number }>();
    for (const j of completed) {
      const cur = serviceTotals.get(j.serviceId) ?? { value: 0, count: 0 };
      cur.value += j.price;
      cur.count += 1;
      serviceTotals.set(j.serviceId, cur);
    }
    const byService = [...serviceTotals.entries()]
      .map(([id, v]) => ({ label: lookups.serviceName(id), value: roundMoney(v.value), detail: `${v.count} completed job${v.count === 1 ? '' : 's'}` }))
      .sort((a, b) => b.value - a.value);

    const customerTotals = new Map<string, { value: number; count: number }>();
    for (const j of completed) {
      const cur = customerTotals.get(j.customerId) ?? { value: 0, count: 0 };
      cur.value += j.price;
      cur.count += 1;
      customerTotals.set(j.customerId, cur);
    }
    const topCustomers = [...customerTotals.entries()]
      .map(([id, v]) => ({ id, name: lookups.customerName(id), ...v }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);

    const periodInvoices = data.invoices.filter((i) => inRange(i.invoiceDate));
    const pending = roundMoney(periodInvoices.reduce((s, i) => s + invoiceBalance(i, data.payments), 0));
    const collected = roundMoney(data.payments.filter((p) => inRange(p.date)).reduce((s, p) => s + p.amount, 0));
    const newCustomers = data.customers.filter((c) => inRange(c.createdAt.slice(0, 10))).length;

    return {
      from: f,
      to: t,
      months,
      revenue,
      avgMonthly: roundMoney(revenue / months),
      completedCount: completed.length,
      totalJobs: jobs.length,
      pending,
      collected,
      newCustomers,
      trend,
      byStatus,
      byService,
      topCustomers,
      avgJobValue: completed.length ? roundMoney(revenue / completed.length) : 0,
    };
  }, [data, period, lookups]);

  const rangeLabel = `${fmt.date(report.from)} – ${fmt.date(report.to)}`;
  const maxTop = report.topCustomers[0]?.value ?? 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        description={`Business performance for ${rangeLabel}`}
        actions={<SegmentedControl value={period} onChange={setPeriod} options={PERIODS} />}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">
        <KpiCard label="Total Revenue" value={fmt.money(report.revenue)} icon={<DollarSign className="h-5 w-5" />} accent="teal" hint={`${fmt.money(report.collected)} collected`} />
        <KpiCard
          label="Monthly Revenue"
          value={fmt.money(report.avgMonthly)}
          icon={<TrendingUp className="h-5 w-5" />}
          accent="violet"
          hint={report.months > 1 ? `Average over ${report.months} months` : 'For the selected month'}
        />
        <KpiCard
          label="Completed Jobs"
          value={report.completedCount}
          icon={<CircleCheck className="h-5 w-5" />}
          accent="green"
          hint={`Avg. ${fmt.money(report.avgJobValue)} per job`}
        />
        <KpiCard label="Pending Payments" value={fmt.money(report.pending)} icon={<Hourglass className="h-5 w-5" />} accent="amber" hint="On invoices issued in period" />
        <KpiCard label="Total Customers" value={data.customers.length} icon={<Users className="h-5 w-5" />} accent="blue" hint={`${report.newCustomers} new in period`} />
      </div>

      <Card>
        <CardHeader
          title={report.months === 1 ? 'Weekly Revenue' : 'Monthly Revenue'}
          description={`Revenue from completed jobs, ${rangeLabel}`}
        />
        <div className="p-4 sm:p-5">
          {report.revenue === 0 ? (
            <EmptyState compact title="No revenue in this period" description="Revenue is counted when cleaning jobs are marked completed." />
          ) : (
            <ColumnChart data={report.trend} format={fmt.money} axisFormat={fmt.moneyCompact} showLabels labelFormat={report.trend.length > 6 ? fmt.moneyCompact : fmt.money} />
          )}
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Jobs by Status" description={`${report.totalJobs} jobs dated in the period`} />
          <div className="p-4 sm:p-5">
            {report.totalJobs === 0 ? (
              <EmptyState compact title="No jobs in this period" />
            ) : (
              <ColumnChart data={report.byStatus} format={(n) => String(n)} height={260} showLabels />
            )}
          </div>
        </Card>
        <Card>
          <CardHeader title="Revenue by Service" description="Completed job revenue per service" />
          <div className="p-4 sm:p-5">
            {report.byService.length === 0 ? (
              <EmptyState compact title="No completed jobs in this period" />
            ) : (
              <HorizontalBarChart data={report.byService} format={fmt.money} />
            )}
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader title="Top Customers" description="Highest revenue customers in the period" />
        {report.topCustomers.length === 0 ? (
          <EmptyState compact title="No customer revenue in this period" />
        ) : (
          <ul className="divide-y divide-slate-100">
            {report.topCustomers.map((c, i) => (
              <li key={c.id} className="flex items-center gap-4 px-5 py-3">
                <span className="w-5 text-sm font-semibold text-slate-400">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-3">
                    <span className="truncate text-sm font-medium text-slate-900">{c.name}</span>
                    <span className="text-sm font-semibold tabular-nums text-slate-900">{fmt.money(c.value)}</span>
                  </div>
                  <div className="mt-1.5 flex items-center gap-3">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full rounded-full bg-brand-500" style={{ width: `${maxTop ? (c.value / maxTop) * 100 : 0}%` }} />
                    </div>
                    <span className="w-16 text-right text-xs text-slate-500">
                      {c.count} job{c.count === 1 ? '' : 's'}
                    </span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
