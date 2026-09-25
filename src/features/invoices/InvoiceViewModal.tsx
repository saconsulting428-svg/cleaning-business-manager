import { useEffect, useState } from 'react';
import { CircleCheck, Droplets, Pencil, Printer, Trash2, Wallet } from 'lucide-react';
import type { PaymentMethod } from '@/types';
import { Button, Modal, SelectField, StatusBadge, TextField, toOptions, useToast } from '@/components/ui';
import { useAppData } from '@/store/AppDataContext';
import { useFormat } from '@/hooks/useFormat';
import { useLookups } from '@/hooks/useLookups';
import { useConfirm } from '@/hooks/useConfirm';
import { summarizeInvoice } from '@/utils/calc';
import { todayISO } from '@/utils/date';
import { InvoiceFormModal } from './InvoiceFormModal';
import { PAYMENT_METHODS, PaymentFormModal } from '@/features/payments/PaymentFormModal';

type Child = 'edit' | 'payment' | 'markPaid' | null;

/** Professional, printable invoice document with payment actions. */
export function InvoiceViewModal({ invoiceId, onClose }: { invoiceId: string | null; onClose: () => void }) {
  const { data, deleteInvoice } = useAppData();
  const { settings } = data;
  const fmt = useFormat();
  const lookups = useLookups();
  const toast = useToast();
  const { confirm, dialog } = useConfirm();
  const [child, setChild] = useState<Child>(null);

  const invoice = invoiceId ? data.invoices.find((i) => i.id === invoiceId) ?? null : null;
  const summary = invoice ? summarizeInvoice(invoice, data.payments) : null;
  const customer = invoice ? lookups.customers.get(invoice.customerId) : undefined;
  const job = invoice?.jobId ? lookups.jobs.get(invoice.jobId) : undefined;
  const payments = invoice ? data.payments.filter((p) => p.invoiceId === invoice.id).sort((a, b) => a.date.localeCompare(b.date)) : [];

  const remove = () => {
    if (!invoice) return;
    confirm({
      title: 'Delete invoice?',
      message: (
        <>
          Invoice <strong>{invoice.number}</strong> will be permanently deleted.
          {payments.length > 0 && <> {payments.length} recorded payment(s) will be kept but no longer linked to an invoice.</>}
        </>
      ),
      onConfirm: () => {
        deleteInvoice(invoice.id);
        toast.success('Invoice deleted successfully');
        onClose();
      },
    });
  };

  return (
    <>
      <Modal
        open={!!invoice && child === null}
        onClose={onClose}
        title={invoice ? `Invoice ${invoice.number}` : ''}
        description={customer?.name}
        size="xl"
        bodyClassName="bg-slate-100/70"
        footer={
          invoice &&
          summary && (
            <>
              <Button variant="ghost" className="text-rose-600 hover:bg-rose-50 hover:text-rose-700 sm:mr-auto" icon={<Trash2 className="h-4 w-4" />} onClick={remove}>
                Delete
              </Button>
              <Button variant="secondary" icon={<Pencil className="h-4 w-4" />} onClick={() => setChild('edit')}>
                Edit
              </Button>
              <Button variant="secondary" icon={<Printer className="h-4 w-4" />} onClick={() => window.print()}>
                Print Invoice
              </Button>
              {summary.balance > 0 && (
                <>
                  <Button variant="secondary" icon={<Wallet className="h-4 w-4" />} onClick={() => setChild('payment')}>
                    Record Payment
                  </Button>
                  <Button
                    variant="success"
                    icon={<CircleCheck className="h-4 w-4" />}
                    onClick={() => setChild('markPaid')}
                  >
                    Mark as Paid
                  </Button>
                </>
              )}
            </>
          )
        }
      >
        {invoice && summary && (
          <article className="print-area mx-auto max-w-3xl rounded-xl bg-white p-6 shadow-card sm:p-10">
            {/* Header */}
            <header className="flex flex-col gap-6 border-b border-slate-200 pb-6 sm:flex-row sm:justify-between">
              <div>
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-white">
                    <Droplets className="h-5 w-5" />
                  </div>
                  <p className="text-lg font-bold text-slate-900">{settings.businessName || 'Your Business'}</p>
                </div>
                <div className="mt-3 space-y-0.5 text-sm text-slate-500">
                  {settings.address && <p>{settings.address}</p>}
                  {settings.phone && <p>{settings.phone}</p>}
                  {settings.email && <p>{settings.email}</p>}
                  {settings.website && <p>{settings.website}</p>}
                </div>
              </div>
              <div className="sm:text-right">
                <p className="text-2xl font-bold uppercase tracking-[0.2em] text-brand-700">Invoice</p>
                <p className="mt-1 font-semibold text-slate-800">{invoice.number}</p>
                <div className="mt-2">
                  <StatusBadge status={summary.status} />
                </div>
                <dl className="mt-3 grid grid-cols-[auto_auto] gap-x-4 gap-y-1 text-sm sm:justify-end">
                  <dt className="text-slate-500">Invoice Date</dt>
                  <dd className="font-medium text-slate-800">{fmt.date(invoice.invoiceDate)}</dd>
                  <dt className="text-slate-500">Due Date</dt>
                  <dd className="font-medium text-slate-800">{fmt.date(invoice.dueDate)}</dd>
                </dl>
              </div>
            </header>

            {/* Parties */}
            <section className="grid gap-6 py-6 sm:grid-cols-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Bill To</p>
                {customer ? (
                  <div className="mt-2 space-y-0.5 text-sm text-slate-600">
                    <p className="font-semibold text-slate-900">{customer.name}</p>
                    <p>{customer.address}</p>
                    <p>{customer.city}</p>
                    {customer.phone && <p>{customer.phone}</p>}
                    {customer.email && <p>{customer.email}</p>}
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-slate-500">Removed customer</p>
                )}
              </div>
              {job && (
                <div className="sm:text-right">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Service Details</p>
                  <div className="mt-2 space-y-0.5 text-sm text-slate-600">
                    <p className="font-semibold text-slate-900">{lookups.serviceName(job.serviceId)}</p>
                    <p>Job {job.number}</p>
                    <p>Performed on {fmt.date(job.date)}</p>
                    {job.employeeId && <p>Cleaner: {lookups.employeeName(job.employeeId)}</p>}
                  </div>
                </div>
              )}
            </section>

            {/* Line items */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-y border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-3 py-2.5 text-left font-semibold">Description</th>
                    <th className="px-3 py-2.5 text-right font-semibold">Qty</th>
                    <th className="px-3 py-2.5 text-right font-semibold">Unit Price</th>
                    <th className="px-3 py-2.5 text-right font-semibold">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {invoice.items.map((item) => (
                    <tr key={item.id}>
                      <td className="px-3 py-3 text-slate-800">{item.description}</td>
                      <td className="px-3 py-3 text-right tabular-nums text-slate-600">{item.quantity}</td>
                      <td className="px-3 py-3 text-right tabular-nums text-slate-600">{fmt.money(item.unitPrice)}</td>
                      <td className="px-3 py-3 text-right font-medium tabular-nums text-slate-900">{fmt.money(item.quantity * item.unitPrice)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <div className="mt-6 flex justify-end">
              <dl className="w-full space-y-2 text-sm sm:w-72">
                <div className="flex justify-between">
                  <dt className="text-slate-500">Subtotal</dt>
                  <dd className="tabular-nums text-slate-800">{fmt.money(summary.subtotal)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500">Tax ({invoice.taxRate}%)</dt>
                  <dd className="tabular-nums text-slate-800">{fmt.money(summary.tax)}</dd>
                </div>
                <div className="flex justify-between border-t border-slate-200 pt-2 text-base font-semibold text-slate-900">
                  <dt>Total</dt>
                  <dd className="tabular-nums">{fmt.money(summary.total)}</dd>
                </div>
                <div className="flex justify-between text-emerald-700">
                  <dt>Amount Paid</dt>
                  <dd className="tabular-nums">{summary.paid > 0 ? `−${fmt.money(summary.paid)}` : fmt.money(0)}</dd>
                </div>
                <div className="flex justify-between rounded-lg bg-brand-50 px-3 py-2 text-base font-bold text-brand-800">
                  <dt>Balance Due</dt>
                  <dd className="tabular-nums">{fmt.money(summary.balance)}</dd>
                </div>
              </dl>
            </div>

            {payments.length > 0 && (
              <section className="mt-8">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Payment History</p>
                <ul className="mt-2 divide-y divide-slate-100 rounded-lg border border-slate-200 text-sm">
                  {payments.map((p) => (
                    <li key={p.id} className="flex items-center justify-between gap-3 px-3 py-2">
                      <span className="text-slate-600">
                        {fmt.date(p.date)} · {p.method} <span className="text-slate-400">({p.number})</span>
                      </span>
                      <span className="font-medium tabular-nums text-slate-900">{fmt.money(p.amount)}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {invoice.notes && (
              <section className="mt-8">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Notes</p>
                <p className="mt-2 whitespace-pre-line text-sm text-slate-600">{invoice.notes}</p>
              </section>
            )}

            <footer className="mt-10 border-t border-slate-200 pt-4 text-center text-xs text-slate-400">
              Thank you for choosing {settings.businessName || 'our services'}. Payment is due by {fmt.date(invoice.dueDate)}.
            </footer>
          </article>
        )}
      </Modal>

      <InvoiceFormModal open={child === 'edit'} onClose={() => setChild(null)} invoice={invoice} />
      <PaymentFormModal open={child === 'payment'} onClose={() => setChild(null)} defaults={{ invoiceId: invoice?.id }} />

      <MarkPaidModal invoiceId={child === 'markPaid' ? invoice?.id ?? null : null} onClose={() => setChild(null)} />
      {dialog}
    </>
  );
}

/** Settles an invoice's remaining balance by recording a payment. */
export function MarkPaidModal({ invoiceId, onClose }: { invoiceId: string | null; onClose: () => void }) {
  const { data, markInvoicePaid } = useAppData();
  const fmt = useFormat();
  const toast = useToast();
  const [method, setMethod] = useState<PaymentMethod>('Card');
  const [payDate, setPayDate] = useState(todayISO());
  const invoice = invoiceId ? data.invoices.find((i) => i.id === invoiceId) : undefined;
  const balance = invoice ? summarizeInvoice(invoice, data.payments).balance : 0;

  useEffect(() => {
    if (invoiceId) setPayDate(todayISO());
  }, [invoiceId]);

  const submit = () => {
    if (!invoice) return;
    if (markInvoicePaid(invoice.id, method, payDate || todayISO())) toast.success(`Invoice ${invoice.number} marked as paid`);
    onClose();
  };

  return (
    <Modal
      open={!!invoice}
      onClose={onClose}
      title="Mark invoice as paid"
      description={invoice ? `A payment of ${fmt.money(balance)} will be recorded for ${invoice.number}.` : undefined}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="success" onClick={submit}>
            Confirm Payment
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <SelectField label="Payment Method" value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)} options={toOptions(PAYMENT_METHODS)} />
        <TextField label="Payment Date" type="date" value={payDate} onChange={(e) => setPayDate(e.target.value)} />
      </div>
    </Modal>
  );
}
