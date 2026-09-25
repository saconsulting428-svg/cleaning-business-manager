import { useMemo, type FormEvent } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import type { Draft, Invoice, InvoiceLineItem } from '@/types';
import { Button, FormGrid, IconButton, Modal, NumberField, SelectField, StatusBadge, TextareaField, TextField, useToast } from '@/components/ui';
import { useAppData } from '@/store/AppDataContext';
import { useForm } from '@/hooks/useForm';
import { useFormat } from '@/hooks/useFormat';
import { useLookups } from '@/hooks/useLookups';
import { compact, hasErrors, required } from '@/utils/validation';
import { addDaysISO, todayISO } from '@/utils/date';
import { invoicePaid, invoiceStatus, invoiceSubtotal, invoiceTax, invoiceTotal } from '@/utils/calc';
import { createId } from '@/utils/id';
import { currencySymbol } from '@/utils/currency';
import { cn } from '@/utils/cn';

interface ItemValues {
  id: string;
  description: string;
  quantity: string;
  unitPrice: string;
}

interface FormValues {
  customerId: string;
  jobId: string;
  invoiceDate: string;
  dueDate: string;
  items: ItemValues[];
  taxRate: string;
  notes: string;
}

const toItemValues = (i: InvoiceLineItem): ItemValues => ({
  id: i.id,
  description: i.description,
  quantity: String(i.quantity),
  unitPrice: String(i.unitPrice),
});

const toItems = (items: ItemValues[]): InvoiceLineItem[] =>
  items.map((i) => ({ id: i.id, description: i.description.trim(), quantity: Number(i.quantity) || 0, unitPrice: Number(i.unitPrice) || 0 }));

const emptyItem = (): ItemValues => ({ id: createId(), description: '', quantity: '1', unitPrice: '' });

export function InvoiceFormModal({
  open,
  onClose,
  invoice,
  defaults,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  invoice?: Invoice | null;
  defaults?: { customerId?: string; jobId?: string };
  onSaved?: (inv: Invoice) => void;
}) {
  const { data, addInvoice, updateInvoice } = useAppData();
  const { settings } = data;
  const toast = useToast();
  const fmt = useFormat();
  const lookups = useLookups();

  const jobLine = (jobId: string): ItemValues[] => {
    const job = data.jobs.find((j) => j.id === jobId);
    if (!job) return [emptyItem()];
    return [
      {
        id: createId(),
        description: `${lookups.serviceName(job.serviceId)} — ${fmt.date(job.date)}`,
        quantity: '1',
        unitPrice: String(job.price),
      },
    ];
  };

  const { values, set, setValues, errors, setErrors } = useForm<FormValues>(() => {
    if (invoice) {
      return {
        customerId: invoice.customerId,
        jobId: invoice.jobId,
        invoiceDate: invoice.invoiceDate,
        dueDate: invoice.dueDate,
        items: invoice.items.map(toItemValues),
        taxRate: String(invoice.taxRate),
        notes: invoice.notes,
      };
    }
    const job = defaults?.jobId ? data.jobs.find((j) => j.id === defaults.jobId) : undefined;
    const today = todayISO();
    return {
      customerId: job?.customerId ?? defaults?.customerId ?? '',
      jobId: job?.id ?? '',
      invoiceDate: today,
      dueDate: addDaysISO(today, settings.paymentTermsDays),
      items: job ? jobLine(job.id) : [emptyItem()],
      taxRate: String(settings.defaultTaxRate),
      notes: '',
    };
  }, [open, invoice?.id, defaults?.jobId, defaults?.customerId]);

  const customerOptions = useMemo(
    () => [...data.customers].sort((a, b) => a.name.localeCompare(b.name)).map((c) => ({ value: c.id, label: c.name })),
    [data.customers],
  );

  const jobOptions = useMemo(() => {
    const invoicedJobIds = new Set(data.invoices.filter((i) => i.id !== invoice?.id && i.jobId).map((i) => i.jobId));
    return data.jobs
      .filter((j) => j.customerId === values.customerId && j.status !== 'Cancelled' && !invoicedJobIds.has(j.id))
      .sort((a, b) => b.date.localeCompare(a.date))
      .map((j) => ({
        value: j.id,
        label: `${j.number} · ${lookups.serviceName(j.serviceId)} · ${fmt.date(j.date)} · ${fmt.money(j.price)}`,
      }));
  }, [data.jobs, data.invoices, values.customerId, invoice?.id, lookups, fmt]);

  const onCustomerChange = (customerId: string) => {
    setValues((v) => ({ ...v, customerId, jobId: '' }));
    setErrors((e) => ({ ...e, customerId: '' }));
  };

  const onJobChange = (jobId: string) => {
    setValues((v) => ({ ...v, jobId, items: jobId ? jobLine(jobId) : v.items }));
    setErrors((e) => ({ ...e, items: '' }));
  };

  const updateItem = (id: string, patch: Partial<ItemValues>) => {
    setValues((v) => ({ ...v, items: v.items.map((i) => (i.id === id ? { ...i, ...patch } : i)) }));
    if (errors.items) setErrors((e) => ({ ...e, items: '' }));
  };

  const calc = { items: toItems(values.items), taxRate: Number(values.taxRate) || 0 };
  const subtotal = invoiceSubtotal(calc);
  const tax = invoiceTax(calc);
  const total = invoiceTotal(calc);
  const paid = invoice ? invoicePaid(invoice.id, data.payments) : 0;
  const status = invoice
    ? invoiceStatus({ ...invoice, ...calc, dueDate: values.dueDate }, data.payments)
    : values.dueDate && values.dueDate < todayISO()
      ? 'Overdue'
      : 'Pending';

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const taxRate = Number(values.taxRate);
    const badItem = values.items.some(
      (i) => !i.description.trim() || !(Number(i.quantity) > 0) || i.unitPrice === '' || Number(i.unitPrice) < 0,
    );
    const errs = compact({
      customerId: required(values.customerId, 'Customer'),
      invoiceDate: required(values.invoiceDate, 'Invoice date'),
      dueDate:
        required(values.dueDate, 'Due date') ??
        (values.dueDate < values.invoiceDate ? 'Due date cannot be before the invoice date' : undefined),
      taxRate: values.taxRate === '' || !Number.isFinite(taxRate) || taxRate < 0 || taxRate > 100 ? 'Enter a tax rate between 0 and 100' : undefined,
      items:
        values.items.length === 0
          ? 'Add at least one line item'
          : badItem
            ? 'Each line item needs a description, a quantity above 0 and a price'
            : total <= 0
              ? 'Invoice total must be greater than zero'
              : paid > total
                ? `Total cannot be less than the ${fmt.money(paid)} already paid`
                : undefined,
    });
    if (hasErrors(errs)) return setErrors(errs);

    const draft: Draft<Invoice> = {
      customerId: values.customerId,
      jobId: values.jobId,
      invoiceDate: values.invoiceDate,
      dueDate: values.dueDate,
      items: toItems(values.items),
      taxRate,
      notes: values.notes.trim(),
    };
    if (invoice) {
      updateInvoice(invoice.id, draft);
      toast.success('Invoice updated successfully');
      onSaved?.({ ...invoice, ...draft });
    } else {
      const created = addInvoice(draft);
      toast.success(`Invoice ${created.number} created successfully`);
      onSaved?.(created);
    }
    onClose();
  };

  const symbol = currencySymbol(fmt.currency);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={invoice ? `Edit Invoice ${invoice.number}` : 'Create Invoice'}
      description="Subtotal, tax and total are calculated automatically"
      size="xl"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="invoice-form">
            {invoice ? 'Save Changes' : 'Create Invoice'}
          </Button>
        </>
      }
    >
      <form id="invoice-form" onSubmit={submit} noValidate className="space-y-6">
        <FormGrid className="lg:grid-cols-4">
          <SelectField
            label="Customer"
            required
            value={values.customerId}
            onChange={(e) => onCustomerChange(e.target.value)}
            options={customerOptions}
            placeholder="Select a customer"
            error={errors.customerId}
            className="lg:col-span-2"
          />
          <SelectField
            label="Cleaning Job"
            value={values.jobId}
            onChange={(e) => onJobChange(e.target.value)}
            options={jobOptions}
            placeholder={values.customerId ? (jobOptions.length ? 'No linked job' : 'No uninvoiced jobs') : 'Select a customer first'}
            disabled={!values.customerId}
            hint="Linking a job fills in the line item automatically"
            className="lg:col-span-2"
          />
          <TextField
            label="Invoice Date"
            required
            type="date"
            value={values.invoiceDate}
            onChange={(e) => set('invoiceDate', e.target.value)}
            error={errors.invoiceDate}
          />
          <TextField
            label="Due Date"
            required
            type="date"
            value={values.dueDate}
            onChange={(e) => set('dueDate', e.target.value)}
            error={errors.dueDate}
          />
          <NumberField
            label="Tax Rate"
            required
            min={0}
            max={100}
            step="0.01"
            suffix="%"
            value={values.taxRate}
            onChange={(e) => set('taxRate', e.target.value)}
            error={errors.taxRate}
          />
          <div>
            <span className="label">Payment Status</span>
            <div className="flex h-[38px] items-center">
              <StatusBadge status={status} />
            </div>
          </div>
        </FormGrid>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <h4 className="text-sm font-semibold text-slate-800">Line Items</h4>
            <Button size="sm" variant="secondary" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => set('items', [...values.items, emptyItem()])}>
              Add Item
            </Button>
          </div>
          <div className={cn('overflow-hidden rounded-xl border', errors.items ? 'border-rose-300' : 'border-slate-200')}>
            <div className="hidden grid-cols-12 gap-3 bg-slate-50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500 sm:grid">
              <span className="col-span-6">Description</span>
              <span className="col-span-2">Qty</span>
              <span className="col-span-2">Unit Price</span>
              <span className="col-span-2 text-right">Amount</span>
            </div>
            <div className="divide-y divide-slate-100">
              {values.items.map((item) => {
                const amount = (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0);
                return (
                  <div key={item.id} className="grid grid-cols-12 items-center gap-3 px-4 py-3">
                    <input
                      aria-label="Description"
                      className="input col-span-12 sm:col-span-6"
                      value={item.description}
                      placeholder="Service description"
                      onChange={(e) => updateItem(item.id, { description: e.target.value })}
                    />
                    <input
                      aria-label="Quantity"
                      type="number"
                      min={0}
                      step="1"
                      className="input col-span-3 sm:col-span-2"
                      value={item.quantity}
                      onChange={(e) => updateItem(item.id, { quantity: e.target.value })}
                    />
                    <div className="relative col-span-5 sm:col-span-2">
                      <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-2.5 text-xs text-slate-400">{symbol}</span>
                      <input
                        aria-label="Unit price"
                        type="number"
                        min={0}
                        step="0.01"
                        className={cn('input', symbol.length > 1 ? 'pl-11' : 'pl-6')}
                        value={item.unitPrice}
                        placeholder="0.00"
                        onChange={(e) => updateItem(item.id, { unitPrice: e.target.value })}
                      />
                    </div>
                    <div className="col-span-4 flex items-center justify-end gap-1 sm:col-span-2">
                      <span className="text-sm font-medium tabular-nums text-slate-800">{fmt.money(amount)}</span>
                      <IconButton
                        label="Remove item"
                        tone="danger"
                        disabled={values.items.length === 1}
                        className="disabled:opacity-30"
                        onClick={() => set('items', values.items.filter((i) => i.id !== item.id))}
                      >
                        <Trash2 className="h-4 w-4" />
                      </IconButton>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          {errors.items && <p className="mt-1.5 text-xs font-medium text-rose-600">{errors.items}</p>}
        </div>

        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <TextareaField
            label="Notes"
            value={values.notes}
            onChange={(e) => set('notes', e.target.value)}
            placeholder="Payment instructions or a thank-you message"
            className="sm:w-1/2"
          />
          <dl className="w-full space-y-2 rounded-xl bg-slate-50 p-4 text-sm sm:w-72">
            <div className="flex justify-between">
              <dt className="text-slate-500">Subtotal</dt>
              <dd className="font-medium tabular-nums">{fmt.money(subtotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Tax ({Number(values.taxRate) || 0}%)</dt>
              <dd className="font-medium tabular-nums">{fmt.money(tax)}</dd>
            </div>
            <div className="flex justify-between border-t border-slate-200 pt-2 text-base">
              <dt className="font-semibold text-slate-900">Total</dt>
              <dd className="font-semibold tabular-nums text-slate-900">{fmt.money(total)}</dd>
            </div>
            {paid > 0 && (
              <div className="flex justify-between text-emerald-700">
                <dt>Already paid</dt>
                <dd className="tabular-nums">{fmt.money(paid)}</dd>
              </div>
            )}
          </dl>
        </div>
      </form>
    </Modal>
  );
}
