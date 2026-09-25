import { useMemo, useState } from 'react';
import { Building2, FilePlus, House, Mail, MapPin, Pencil, Phone, Plus } from 'lucide-react';
import { Button, EmptyState, Modal, StatTile, StatusBadge } from '@/components/ui';
import { useAppData } from '@/store/AppDataContext';
import { useFormat } from '@/hooks/useFormat';
import { useLookups } from '@/hooks/useLookups';
import { customerStats, sortJobsByDateTime, summarizeInvoice } from '@/utils/calc';
import { formatTime } from '@/utils/date';
import { CustomerFormModal } from './CustomerFormModal';
import { JobFormModal } from '@/features/jobs/JobFormModal';
import { JobDetailModal } from '@/features/jobs/JobDetailModal';
import { InvoiceFormModal } from '@/features/invoices/InvoiceFormModal';
import { InvoiceViewModal } from '@/features/invoices/InvoiceViewModal';
import { cn } from '@/utils/cn';

type Child = { kind: 'edit' } | { kind: 'addJob' } | { kind: 'invoice' } | { kind: 'job'; id: string } | { kind: 'viewInvoice'; id: string } | null;

export function CustomerDetailModal({ customerId, onClose }: { customerId: string | null; onClose: () => void }) {
  const { data } = useAppData();
  const fmt = useFormat();
  const lookups = useLookups();
  const [child, setChild] = useState<Child>(null);
  const [tab, setTab] = useState<'jobs' | 'invoices'>('jobs');

  const customer = customerId ? lookups.customers.get(customerId) ?? null : null;
  const stats = useMemo(() => (customer ? customerStats(customer, data) : null), [customer, data]);
  const jobs = useMemo(
    () => (customer ? data.jobs.filter((j) => j.customerId === customer.id).sort(sortJobsByDateTime).reverse() : []),
    [customer, data.jobs],
  );
  const invoices = useMemo(
    () =>
      customer
        ? data.invoices
            .filter((i) => i.customerId === customer.id)
            .sort((a, b) => b.invoiceDate.localeCompare(a.invoiceDate))
            .map((i) => summarizeInvoice(i, data.payments))
        : [],
    [customer, data.invoices, data.payments],
  );

  const close = () => {
    setTab('jobs');
    onClose();
  };

  return (
    <>
      <Modal
        open={!!customer && child === null}
        onClose={close}
        title={customer?.name ?? ''}
        description={customer ? `Customer since ${fmt.date(customer.createdAt.slice(0, 10))}` : undefined}
        size="xl"
        footer={
          customer && (
            <>
              <Button variant="secondary" icon={<FilePlus className="h-4 w-4" />} onClick={() => setChild({ kind: 'invoice' })}>
                Create Invoice
              </Button>
              <Button variant="secondary" icon={<Plus className="h-4 w-4" />} onClick={() => setChild({ kind: 'addJob' })}>
                Add Job
              </Button>
              <Button icon={<Pencil className="h-4 w-4" />} onClick={() => setChild({ kind: 'edit' })}>
                Edit Customer
              </Button>
            </>
          )
        }
      >
        {customer && stats && (
          <div className="space-y-6">
            <div className="flex flex-col gap-4 rounded-xl border border-slate-200 p-4 sm:flex-row sm:items-start">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                {customer.type === 'Commercial' ? <Building2 className="h-6 w-6" /> : <House className="h-6 w-6" />}
              </div>
              <div className="grid flex-1 gap-2 text-sm text-slate-600 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <StatusBadge status={customer.type} />
                </div>
                <p className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-slate-400" />
                  {customer.phone}
                </p>
                <p className="flex min-w-0 items-center gap-2">
                  <Mail className="h-4 w-4 shrink-0 text-slate-400" />
                  <span className="truncate">{customer.email || '—'}</span>
                </p>
                <p className="flex items-start gap-2 sm:col-span-2">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                  {customer.address}, {customer.city}
                </p>
                {customer.notes && <p className="rounded-lg bg-amber-50/70 px-3 py-2 text-slate-600 sm:col-span-2">{customer.notes}</p>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <StatTile label="Total Jobs" value={stats.totalJobs} />
              <StatTile label="Total Revenue" value={fmt.money(stats.revenue)} />
              <StatTile label="Total Paid" value={fmt.money(stats.paid)} tone="green" />
              <StatTile label="Outstanding" value={fmt.money(stats.outstanding)} tone={stats.outstanding > 0 ? 'amber' : 'default'} />
            </div>

            <div>
              <div className="mb-3 flex gap-4 border-b border-slate-200">
                {(['jobs', 'invoices'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTab(t)}
                    className={cn(
                      '-mb-px border-b-2 px-1 pb-2 text-sm font-medium transition',
                      tab === t ? 'border-brand-600 text-brand-700' : 'border-transparent text-slate-500 hover:text-slate-800',
                    )}
                  >
                    {t === 'jobs' ? `Cleaning Jobs (${jobs.length})` : `Invoices (${invoices.length})`}
                  </button>
                ))}
              </div>

              {tab === 'jobs' &&
                (jobs.length === 0 ? (
                  <EmptyState compact title="No cleaning jobs yet" description="Book the first job for this customer." />
                ) : (
                  <ul className="max-h-80 divide-y divide-slate-100 overflow-y-auto rounded-xl border border-slate-200">
                    {jobs.map((j) => (
                      <li key={j.id}>
                        <button
                          type="button"
                          onClick={() => setChild({ kind: 'job', id: j.id })}
                          className="flex w-full flex-wrap items-center justify-between gap-2 px-4 py-3 text-left hover:bg-slate-50"
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-slate-900">
                              {lookups.serviceName(j.serviceId)} <span className="font-normal text-slate-400">· {j.number}</span>
                            </p>
                            <p className="text-xs text-slate-500">
                              {fmt.date(j.date)} · {formatTime(j.startTime)} · {lookups.employeeName(j.employeeId)}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium tabular-nums text-slate-900">{fmt.money(j.price)}</span>
                            <StatusBadge status={j.status} />
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                ))}

              {tab === 'invoices' &&
                (invoices.length === 0 ? (
                  <EmptyState compact title="No invoices yet" description="Create an invoice to bill this customer." />
                ) : (
                  <ul className="max-h-80 divide-y divide-slate-100 overflow-y-auto rounded-xl border border-slate-200">
                    {invoices.map((s) => (
                      <li key={s.invoice.id}>
                        <button
                          type="button"
                          onClick={() => setChild({ kind: 'viewInvoice', id: s.invoice.id })}
                          className="flex w-full flex-wrap items-center justify-between gap-2 px-4 py-3 text-left hover:bg-slate-50"
                        >
                          <div>
                            <p className="text-sm font-medium text-slate-900">{s.invoice.number}</p>
                            <p className="text-xs text-slate-500">
                              {fmt.date(s.invoice.invoiceDate)} · due {fmt.date(s.invoice.dueDate)}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="text-right">
                              <p className="text-sm font-medium tabular-nums text-slate-900">{fmt.money(s.total)}</p>
                              {s.balance > 0 && <p className="text-xs tabular-nums text-amber-700">{fmt.money(s.balance)} due</p>}
                            </div>
                            <StatusBadge status={s.status} />
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                ))}
            </div>
          </div>
        )}
      </Modal>

      <CustomerFormModal open={child?.kind === 'edit'} onClose={() => setChild(null)} customer={customer} />
      <JobFormModal open={child?.kind === 'addJob'} onClose={() => setChild(null)} defaults={{ customerId: customer?.id }} />
      <InvoiceFormModal open={child?.kind === 'invoice'} onClose={() => setChild(null)} defaults={{ customerId: customer?.id }} />
      <JobDetailModal jobId={child?.kind === 'job' ? child.id : null} onClose={() => setChild(null)} />
      <InvoiceViewModal invoiceId={child?.kind === 'viewInvoice' ? child.id : null} onClose={() => setChild(null)} />
    </>
  );
}
