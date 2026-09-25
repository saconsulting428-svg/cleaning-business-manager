import { useMemo, useState } from 'react';
import { ClipboardList, Eye, Pencil, Plus, Trash2 } from 'lucide-react';
import type { CleaningJob, JobStatus } from '@/types';
import {
  Button,
  Card,
  DataTable,
  EmptyState,
  FilterSelect,
  IconButton,
  PageHeader,
  SearchInput,
  StatTile,
  StatusBadge,
  Toolbar,
  useToast,
  type Column,
} from '@/components/ui';
import { useAppData } from '@/store/AppDataContext';
import { useFormat } from '@/hooks/useFormat';
import { useLookups } from '@/hooks/useLookups';
import { useConfirm } from '@/hooks/useConfirm';
import { includesText, roundMoney } from '@/utils/format';
import { endOfMonth, formatTime, startOfMonth, toISODate, todayISO } from '@/utils/date';
import { JOB_PAYMENT_STATUSES, JOB_STATUSES, JobFormModal } from '@/features/jobs/JobFormModal';
import { JobDetailModal } from '@/features/jobs/JobDetailModal';
import { cn } from '@/utils/cn';

const STATUS_SELECT_TONES: Record<JobStatus, string> = {
  Scheduled: 'bg-sky-50 text-sky-700 ring-sky-600/20',
  'In Progress': 'bg-amber-50 text-amber-800 ring-amber-600/25',
  Completed: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  Cancelled: 'bg-slate-100 text-slate-600 ring-slate-500/20',
};

const DATE_RANGES = [
  { value: 'all', label: 'All dates' },
  { value: 'today', label: 'Today' },
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'past', label: 'Past' },
  { value: 'month', label: 'This month' },
];

export function JobsPage() {
  const { data, setJobStatus, deleteJob } = useAppData();
  const fmt = useFormat();
  const lookups = useLookups();
  const toast = useToast();
  const { confirm, dialog } = useConfirm();

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [payment, setPayment] = useState('all');
  const [employee, setEmployee] = useState('all');
  const [range, setRange] = useState('all');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<CleaningJob | null>(null);
  const [viewId, setViewId] = useState<string | null>(null);

  const today = todayISO();

  const rows = useMemo(() => {
    const mStart = toISODate(startOfMonth(new Date()));
    const mEnd = toISODate(endOfMonth(new Date()));
    return data.jobs.filter((j) => {
      if (status !== 'all' && j.status !== status) return false;
      if (payment !== 'all' && j.paymentStatus !== payment) return false;
      if (employee !== 'all' && j.employeeId !== (employee === 'none' ? '' : employee)) return false;
      if (range === 'today' && j.date !== today) return false;
      if (range === 'upcoming' && j.date < today) return false;
      if (range === 'past' && j.date >= today) return false;
      if (range === 'month' && (j.date < mStart || j.date > mEnd)) return false;
      return includesText(
        [j.number, lookups.customerName(j.customerId), lookups.serviceName(j.serviceId), lookups.employeeName(j.employeeId), j.notes],
        search,
      );
    });
  }, [data.jobs, status, payment, employee, range, search, lookups, today]);

  const totals = useMemo(() => {
    const active = rows.filter((j) => j.status !== 'Cancelled');
    return {
      count: rows.length,
      value: roundMoney(active.reduce((s, j) => s + j.price, 0)),
      completed: rows.filter((j) => j.status === 'Completed').length,
      completedValue: roundMoney(rows.filter((j) => j.status === 'Completed').reduce((s, j) => s + j.price, 0)),
      unpaid: active.filter((j) => j.status === 'Completed' && j.paymentStatus !== 'Paid').length,
    };
  }, [rows]);

  const openForm = (j: CleaningJob | null) => {
    setEditing(j);
    setFormOpen(true);
  };

  const changeStatus = (j: CleaningJob, s: JobStatus) => {
    setJobStatus(j.id, s);
    toast.success(`Job ${j.number} marked as ${s}`);
  };

  const remove = (j: CleaningJob) =>
    confirm({
      title: 'Delete cleaning job?',
      message: (
        <>
          <strong>{j.number}</strong> for {lookups.customerName(j.customerId)} on {fmt.date(j.date)} will be permanently deleted.
        </>
      ),
      onConfirm: () => {
        deleteJob(j.id);
        toast.success('Cleaning job deleted successfully');
      },
    });

  const columns: Column<CleaningJob>[] = [
    {
      key: 'number',
      header: 'Job ID',
      sortValue: (j) => j.number,
      mobile: 'hidden',
      cell: (j) => <span className="font-mono text-xs font-semibold text-slate-500">{j.number}</span>,
    },
    {
      key: 'customer',
      header: 'Customer',
      mobile: 'title',
      sortValue: (j) => lookups.customerName(j.customerId),
      cell: (j) => <span className="font-medium text-slate-900">{lookups.customerName(j.customerId)}</span>,
    },
    {
      key: 'service',
      header: 'Service',
      mobile: 'subtitle',
      sortValue: (j) => lookups.serviceName(j.serviceId),
      cell: (j) => (
        <>
          {lookups.serviceName(j.serviceId)}
          <span className="md:hidden"> · {j.number}</span>
        </>
      ),
    },
    { key: 'date', header: 'Date', sortValue: (j) => `${j.date} ${j.startTime}`, cell: (j) => fmt.date(j.date) },
    {
      key: 'time',
      header: 'Time',
      cell: (j) => (
        <span className="text-slate-600">
          {formatTime(j.startTime)} – {formatTime(j.endTime)}
        </span>
      ),
    },
    {
      key: 'employee',
      header: 'Employee',
      sortValue: (j) => lookups.employeeName(j.employeeId),
      cell: (j) => (j.employeeId ? lookups.employeeName(j.employeeId) : <span className="text-amber-700">Unassigned</span>),
    },
    {
      key: 'price',
      header: 'Price',
      align: 'right',
      sortValue: (j) => j.price,
      cell: (j) => <span className="font-medium tabular-nums text-slate-900">{fmt.money(j.price)}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      mobile: 'badge',
      sortValue: (j) => j.status,
      cell: (j) => (
        <select
          aria-label={`Change status of ${j.number}`}
          value={j.status}
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => changeStatus(j, e.target.value as JobStatus)}
          className={cn(
            'cursor-pointer rounded-full border-0 py-0.5 pl-2.5 pr-7 text-xs font-medium ring-1 ring-inset focus:outline-none focus:ring-2 focus:ring-brand-500',
            STATUS_SELECT_TONES[j.status],
          )}
        >
          {JOB_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      ),
    },
    {
      key: 'payment',
      header: 'Payment Status',
      sortValue: (j) => j.paymentStatus,
      cell: (j) => <StatusBadge status={j.paymentStatus} />,
    },
  ];

  return (
    <div>
      <PageHeader
        title="Cleaning Jobs"
        description="Book, assign and track every cleaning job"
        actions={
          <Button icon={<Plus className="h-4 w-4" />} onClick={() => openForm(null)}>
            Add Job
          </Button>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Jobs shown" value={totals.count} />
        <StatTile label="Booked value (excl. cancelled)" value={fmt.money(totals.value)} />
        <StatTile label={`Completed (${totals.completed})`} value={fmt.money(totals.completedValue)} tone="green" />
        <StatTile label="Completed, awaiting payment" value={totals.unpaid} tone={totals.unpaid ? 'amber' : 'default'} />
      </div>

      <Card>
        <Toolbar>
          <SearchInput value={search} onChange={setSearch} placeholder="Search job ID, customer, service…" />
          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
            <FilterSelect label="Filter by date" value={range} onChange={setRange} options={DATE_RANGES} />
            <FilterSelect
              label="Filter by status"
              value={status}
              onChange={setStatus}
              options={[{ value: 'all', label: 'All statuses' }, ...JOB_STATUSES.map((s) => ({ value: s, label: s }))]}
            />
            <FilterSelect
              label="Filter by payment status"
              value={payment}
              onChange={setPayment}
              options={[{ value: 'all', label: 'All payments' }, ...JOB_PAYMENT_STATUSES.map((s) => ({ value: s, label: s }))]}
            />
            <FilterSelect
              label="Filter by employee"
              value={employee}
              onChange={setEmployee}
              options={[
                { value: 'all', label: 'All employees' },
                { value: 'none', label: 'Unassigned' },
                ...[...data.employees].sort((a, b) => a.name.localeCompare(b.name)).map((e) => ({ value: e.id, label: e.name })),
              ]}
            />
          </div>
        </Toolbar>
        <DataTable
          columns={columns}
          rows={rows}
          rowKey={(j) => j.id}
          onRowClick={(j) => setViewId(j.id)}
          initialSort={{ key: 'date', dir: 'desc' }}
          actions={(j) => (
            <>
              <IconButton label="View job" onClick={() => setViewId(j.id)}>
                <Eye className="h-4 w-4" />
              </IconButton>
              <IconButton label="Edit job" onClick={() => openForm(j)}>
                <Pencil className="h-4 w-4" />
              </IconButton>
              <IconButton label="Delete job" tone="danger" onClick={() => remove(j)}>
                <Trash2 className="h-4 w-4" />
              </IconButton>
            </>
          )}
          empty={
            data.jobs.length === 0 ? (
              <EmptyState
                icon={<ClipboardList className="h-6 w-6" />}
                title="No cleaning jobs yet"
                description="Book your first cleaning job and assign it to a team member."
                action={
                  <Button icon={<Plus className="h-4 w-4" />} onClick={() => openForm(null)}>
                    Add Job
                  </Button>
                }
              />
            ) : (
              <EmptyState title="No matching jobs" description="Try adjusting the search or filters." />
            )
          }
        />
      </Card>

      <JobFormModal open={formOpen} onClose={() => setFormOpen(false)} job={editing} />
      <JobDetailModal jobId={viewId} onClose={() => setViewId(null)} />
      {dialog}
    </div>
  );
}
