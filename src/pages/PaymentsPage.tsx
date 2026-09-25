import { useMemo, useState } from 'react';
import { Banknote, CalendarCheck, CreditCard, Hourglass, Pencil, Plus, Trash2, Wallet } from 'lucide-react';
import type { Payment } from '@/types';
import { Button, Card, DataTable, EmptyState, FilterSelect, IconButton, KpiCard, PageHeader, SearchInput, Toolbar, useToast, type Column } from '@/components/ui';
import { useAppData } from '@/store/AppDataContext';
import { useFormat } from '@/hooks/useFormat';
import { useLookups } from '@/hooks/useLookups';
import { useConfirm } from '@/hooks/useConfirm';
import { paymentsBetween, totalOutstanding } from '@/utils/calc';
import { includesText, roundMoney } from '@/utils/format';
import { endOfMonth, startOfMonth, toISODate } from '@/utils/date';
import { PAYMENT_METHODS, PaymentFormModal } from '@/features/payments/PaymentFormModal';
import { InvoiceViewModal } from '@/features/invoices/InvoiceViewModal';

export function PaymentsPage() {
  const { data, deletePayment } = useAppData();
  const fmt = useFormat();
  const lookups = useLookups();
  const toast = useToast();
  const { confirm, dialog } = useConfirm();
  const [search, setSearch] = useState('');
  const [method, setMethod] = useState('all');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Payment | null>(null);
  const [invoiceId, setInvoiceId] = useState<string | null>(null);

  const kpis = useMemo(() => {
    const now = new Date();
    const total = roundMoney(data.payments.reduce((s, p) => s + p.amount, 0));
    const month = paymentsBetween(data.payments, toISODate(startOfMonth(now)), toISODate(endOfMonth(now)));
    const monthCount = data.payments.filter((p) => p.date >= toISODate(startOfMonth(now)) && p.date <= toISODate(endOfMonth(now))).length;
    return { total, month, monthCount, pending: totalOutstanding(data.invoices, data.payments) };
  }, [data.payments, data.invoices]);

  const rows = useMemo(
    () =>
      data.payments.filter(
        (p) =>
          (method === 'all' || p.method === method) &&
          includesText(
            [p.number, lookups.customerName(p.customerId), p.invoiceId ? lookups.invoices.get(p.invoiceId)?.number : '', p.notes, p.method],
            search,
          ),
      ),
    [data.payments, method, search, lookups],
  );

  const filteredTotal = roundMoney(rows.reduce((s, p) => s + p.amount, 0));

  const openForm = (p: Payment | null) => {
    setEditing(p);
    setFormOpen(true);
  };

  const remove = (p: Payment) =>
    confirm({
      title: 'Delete payment?',
      message: (
        <>
          Payment <strong>{p.number}</strong> of {fmt.money(p.amount)} from {lookups.customerName(p.customerId)} will be permanently deleted.
          {p.invoiceId && <> The related invoice balance will increase accordingly.</>}
        </>
      ),
      onConfirm: () => {
        deletePayment(p.id);
        toast.success('Payment deleted successfully');
      },
    });

  const columns: Column<Payment>[] = [
    {
      key: 'number',
      header: 'Payment ID',
      mobile: 'hidden',
      sortValue: (p) => p.number,
      cell: (p) => <span className="font-mono text-xs font-semibold text-slate-500">{p.number}</span>,
    },
    {
      key: 'customer',
      header: 'Customer',
      mobile: 'title',
      sortValue: (p) => lookups.customerName(p.customerId),
      cell: (p) => <span className="font-medium text-slate-900">{lookups.customerName(p.customerId)}</span>,
    },
    {
      key: 'invoice',
      header: 'Invoice',
      cell: (p) => {
        const inv = p.invoiceId ? lookups.invoices.get(p.invoiceId) : undefined;
        return inv ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setInvoiceId(inv.id);
            }}
            className="font-medium text-brand-700 hover:underline"
          >
            {inv.number}
          </button>
        ) : (
          <span className="text-slate-400">Unallocated</span>
        );
      },
    },
    { key: 'date', header: 'Date', mobile: 'subtitle', sortValue: (p) => p.date, cell: (p) => fmt.date(p.date) },
    {
      key: 'amount',
      header: 'Amount',
      mobile: 'badge',
      align: 'right',
      sortValue: (p) => p.amount,
      cell: (p) => <span className="font-semibold tabular-nums text-emerald-700">{fmt.money(p.amount)}</span>,
    },
    {
      key: 'method',
      header: 'Method',
      sortValue: (p) => p.method,
      cell: (p) => (
        <span className="inline-flex items-center gap-1.5 text-slate-600">
          {p.method === 'Card' ? <CreditCard className="h-4 w-4 text-slate-400" /> : p.method === 'Cash' ? <Banknote className="h-4 w-4 text-slate-400" /> : <Wallet className="h-4 w-4 text-slate-400" />}
          {p.method}
        </span>
      ),
    },
    {
      key: 'notes',
      header: 'Notes',
      cell: (p) => (
        <span className="block max-w-[220px] truncate text-slate-500" title={p.notes}>
          {p.notes || '—'}
        </span>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Payments"
        description="Record payments received and keep invoices up to date"
        actions={
          <Button icon={<Plus className="h-4 w-4" />} onClick={() => openForm(null)}>
            Record Payment
          </Button>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <KpiCard label="Total Payments" value={fmt.money(kpis.total)} icon={<Wallet className="h-5 w-5" />} accent="teal" hint={`${data.payments.length} payments recorded`} />
        <KpiCard label="This Month" value={fmt.money(kpis.month)} icon={<CalendarCheck className="h-5 w-5" />} accent="green" hint={`${kpis.monthCount} payments this month`} />
        <KpiCard label="Pending Amount" value={fmt.money(kpis.pending)} icon={<Hourglass className="h-5 w-5" />} accent="amber" hint="Unpaid invoice balances" />
      </div>

      <Card>
        <Toolbar>
          <SearchInput value={search} onChange={setSearch} placeholder="Search payment, customer, invoice…" />
          <FilterSelect
            label="Filter by payment method"
            value={method}
            onChange={setMethod}
            options={[{ value: 'all', label: 'All methods' }, ...PAYMENT_METHODS.map((m) => ({ value: m, label: m }))]}
          />
          {rows.length > 0 && (
            <p className="text-sm text-slate-500 sm:ml-auto">
              Total shown: <span className="font-semibold tabular-nums text-slate-900">{fmt.money(filteredTotal)}</span>
            </p>
          )}
        </Toolbar>
        <DataTable
          columns={columns}
          rows={rows}
          rowKey={(p) => p.id}
          onRowClick={(p) => openForm(p)}
          initialSort={{ key: 'date', dir: 'desc' }}
          actions={(p) => (
            <>
              <IconButton label="Edit payment" onClick={() => openForm(p)}>
                <Pencil className="h-4 w-4" />
              </IconButton>
              <IconButton label="Delete payment" tone="danger" onClick={() => remove(p)}>
                <Trash2 className="h-4 w-4" />
              </IconButton>
            </>
          )}
          empty={
            data.payments.length === 0 ? (
              <EmptyState
                icon={<Wallet className="h-6 w-6" />}
                title="No payments recorded"
                description="Record a payment when a customer pays an invoice."
                action={
                  <Button icon={<Plus className="h-4 w-4" />} onClick={() => openForm(null)}>
                    Record Payment
                  </Button>
                }
              />
            ) : (
              <EmptyState title="No matching payments" description="Try a different search or method filter." />
            )
          }
        />
      </Card>

      <PaymentFormModal open={formOpen} onClose={() => setFormOpen(false)} payment={editing} />
      <InvoiceViewModal invoiceId={invoiceId} onClose={() => setInvoiceId(null)} />
      {dialog}
    </div>
  );
}
