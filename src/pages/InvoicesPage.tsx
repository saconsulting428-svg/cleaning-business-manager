import { useMemo, useState } from 'react';
import { CircleCheck, Eye, FilePlus, FileText, Pencil, Trash2 } from 'lucide-react';
import type { Invoice, InvoiceStatus } from '@/types';
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
import { summarizeInvoice, type InvoiceSummary } from '@/utils/calc';
import { includesText, roundMoney } from '@/utils/format';
import { todayISO } from '@/utils/date';
import { InvoiceFormModal } from '@/features/invoices/InvoiceFormModal';
import { InvoiceViewModal, MarkPaidModal } from '@/features/invoices/InvoiceViewModal';

const INVOICE_STATUSES: InvoiceStatus[] = ['Pending', 'Partially Paid', 'Overdue', 'Paid'];

export function InvoicesPage() {
  const { data, deleteInvoice } = useAppData();
  const fmt = useFormat();
  const lookups = useLookups();
  const toast = useToast();
  const { confirm, dialog } = useConfirm();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Invoice | null>(null);
  const [viewId, setViewId] = useState<string | null>(null);
  const [payId, setPayId] = useState<string | null>(null);

  const today = todayISO();
  const all = useMemo(() => data.invoices.map((i) => summarizeInvoice(i, data.payments, today)), [data.invoices, data.payments, today]);

  const rows = useMemo(
    () =>
      all.filter(
        (s) =>
          (status === 'all' || s.status === status) &&
          includesText(
            [s.invoice.number, lookups.customerName(s.invoice.customerId), s.invoice.jobId ? lookups.jobs.get(s.invoice.jobId)?.number : ''],
            search,
          ),
      ),
    [all, status, search, lookups],
  );

  const totals = useMemo(
    () => ({
      invoiced: roundMoney(all.reduce((s, x) => s + x.total, 0)),
      paid: roundMoney(all.reduce((s, x) => s + x.paid, 0)),
      outstanding: roundMoney(all.reduce((s, x) => s + x.balance, 0)),
      overdue: roundMoney(all.filter((x) => x.status === 'Overdue').reduce((s, x) => s + x.balance, 0)),
      overdueCount: all.filter((x) => x.status === 'Overdue').length,
    }),
    [all],
  );

  const openForm = (i: Invoice | null) => {
    setEditing(i);
    setFormOpen(true);
  };

  const remove = (s: InvoiceSummary) => {
    const linked = data.payments.filter((p) => p.invoiceId === s.invoice.id).length;
    confirm({
      title: 'Delete invoice?',
      message: (
        <>
          Invoice <strong>{s.invoice.number}</strong> ({fmt.money(s.total)}) will be permanently deleted.
          {linked > 0 && <> {linked} recorded payment(s) will be kept but no longer linked to an invoice.</>}
        </>
      ),
      onConfirm: () => {
        deleteInvoice(s.invoice.id);
        toast.success('Invoice deleted successfully');
      },
    });
  };

  const columns: Column<InvoiceSummary>[] = [
    {
      key: 'number',
      header: 'Invoice',
      mobile: 'title',
      sortValue: (s) => s.invoice.number,
      cell: (s) => <span className="font-semibold text-slate-900">{s.invoice.number}</span>,
    },
    {
      key: 'customer',
      header: 'Customer',
      mobile: 'subtitle',
      sortValue: (s) => lookups.customerName(s.invoice.customerId),
      cell: (s) => lookups.customerName(s.invoice.customerId),
    },
    {
      key: 'job',
      header: 'Cleaning Job',
      cell: (s) => {
        const job = s.invoice.jobId ? lookups.jobs.get(s.invoice.jobId) : undefined;
        return job ? (
          <span className="text-slate-600">
            {job.number} <span className="text-slate-400">· {lookups.serviceName(job.serviceId)}</span>
          </span>
        ) : (
          <span className="text-slate-400">—</span>
        );
      },
    },
    { key: 'date', header: 'Invoice Date', sortValue: (s) => s.invoice.invoiceDate, cell: (s) => fmt.date(s.invoice.invoiceDate) },
    {
      key: 'due',
      header: 'Due Date',
      sortValue: (s) => s.invoice.dueDate,
      cell: (s) => <span className={s.status === 'Overdue' ? 'font-medium text-rose-600' : ''}>{fmt.date(s.invoice.dueDate)}</span>,
    },
    { key: 'subtotal', header: 'Subtotal', align: 'right', sortValue: (s) => s.subtotal, cell: (s) => <span className="tabular-nums">{fmt.money(s.subtotal)}</span> },
    { key: 'tax', header: 'Tax', align: 'right', sortValue: (s) => s.tax, cell: (s) => <span className="tabular-nums text-slate-500">{fmt.money(s.tax)}</span> },
    {
      key: 'total',
      header: 'Total',
      align: 'right',
      sortValue: (s) => s.total,
      cell: (s) => (
        <span className="tabular-nums">
          <span className="font-semibold text-slate-900">{fmt.money(s.total)}</span>
          {s.balance > 0 && s.paid > 0 && <span className="block text-xs text-amber-700">{fmt.money(s.balance)} due</span>}
        </span>
      ),
    },
    { key: 'status', header: 'Status', mobile: 'badge', sortValue: (s) => s.status, cell: (s) => <StatusBadge status={s.status} /> },
  ];

  return (
    <div>
      <PageHeader
        title="Invoices"
        description="Create invoices, print them and track what's owed"
        actions={
          <Button icon={<FilePlus className="h-4 w-4" />} onClick={() => openForm(null)}>
            Create Invoice
          </Button>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Total invoiced" value={fmt.money(totals.invoiced)} />
        <StatTile label="Paid" value={fmt.money(totals.paid)} tone="green" />
        <StatTile label="Outstanding" value={fmt.money(totals.outstanding)} tone={totals.outstanding ? 'amber' : 'default'} />
        <StatTile label={`Overdue (${totals.overdueCount})`} value={fmt.money(totals.overdue)} tone={totals.overdue ? 'red' : 'default'} />
      </div>

      <Card>
        <Toolbar>
          <SearchInput value={search} onChange={setSearch} placeholder="Search invoice, customer, job…" />
          <FilterSelect
            label="Filter by status"
            value={status}
            onChange={setStatus}
            options={[{ value: 'all', label: 'All statuses' }, ...INVOICE_STATUSES.map((s) => ({ value: s, label: s }))]}
          />
        </Toolbar>
        <DataTable
          columns={columns}
          rows={rows}
          rowKey={(s) => s.invoice.id}
          onRowClick={(s) => setViewId(s.invoice.id)}
          initialSort={{ key: 'date', dir: 'desc' }}
          actions={(s) => (
            <>
              <IconButton label="View invoice" onClick={() => setViewId(s.invoice.id)}>
                <Eye className="h-4 w-4" />
              </IconButton>
              {s.balance > 0 && (
                <IconButton label="Mark as paid" className="hover:!bg-emerald-50 hover:!text-emerald-600" onClick={() => setPayId(s.invoice.id)}>
                  <CircleCheck className="h-4 w-4" />
                </IconButton>
              )}
              <IconButton label="Edit invoice" onClick={() => openForm(s.invoice)}>
                <Pencil className="h-4 w-4" />
              </IconButton>
              <IconButton label="Delete invoice" tone="danger" onClick={() => remove(s)}>
                <Trash2 className="h-4 w-4" />
              </IconButton>
            </>
          )}
          empty={
            data.invoices.length === 0 ? (
              <EmptyState
                icon={<FileText className="h-6 w-6" />}
                title="No invoices yet"
                description="Create an invoice for a completed cleaning job."
                action={
                  <Button icon={<FilePlus className="h-4 w-4" />} onClick={() => openForm(null)}>
                    Create Invoice
                  </Button>
                }
              />
            ) : (
              <EmptyState title="No matching invoices" description="Try a different search or status filter." />
            )
          }
        />
      </Card>

      <InvoiceFormModal open={formOpen} onClose={() => setFormOpen(false)} invoice={editing} onSaved={(inv) => !editing && setViewId(inv.id)} />
      <InvoiceViewModal invoiceId={viewId} onClose={() => setViewId(null)} />
      <MarkPaidModal invoiceId={payId} onClose={() => setPayId(null)} />
      {dialog}
    </div>
  );
}
