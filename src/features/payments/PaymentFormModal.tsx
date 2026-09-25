import { useMemo, type FormEvent } from 'react';
import type { Draft, Payment, PaymentMethod } from '@/types';
import { Button, FormGrid, Modal, NumberField, SelectField, TextareaField, TextField, toOptions, useToast } from '@/components/ui';
import { useAppData } from '@/store/AppDataContext';
import { useForm } from '@/hooks/useForm';
import { useFormat } from '@/hooks/useFormat';
import { compact, hasErrors, required } from '@/utils/validation';
import { todayISO } from '@/utils/date';
import { invoiceBalance, invoiceTotal } from '@/utils/calc';
import { roundMoney } from '@/utils/format';
import { currencySymbol } from '@/utils/currency';

export const PAYMENT_METHODS: PaymentMethod[] = ['Cash', 'Bank Transfer', 'Card', 'Other'];

interface FormValues {
  customerId: string;
  invoiceId: string;
  date: string;
  amount: string;
  method: PaymentMethod;
  notes: string;
}

export function PaymentFormModal({
  open,
  onClose,
  payment,
  defaults,
}: {
  open: boolean;
  onClose: () => void;
  payment?: Payment | null;
  defaults?: { customerId?: string; invoiceId?: string };
}) {
  const { data, addPayment, updatePayment } = useAppData();
  const toast = useToast();
  const fmt = useFormat();

  /** Balance available on an invoice, counting this payment's own amount when editing. */
  const available = (invoiceId: string) => {
    const inv = data.invoices.find((i) => i.id === invoiceId);
    if (!inv) return 0;
    const own = payment && payment.invoiceId === invoiceId ? payment.amount : 0;
    return roundMoney(invoiceBalance(inv, data.payments) + own);
  };

  const { values, set, setValues, errors, setErrors } = useForm<FormValues>(() => {
    if (payment) return { ...payment, amount: String(payment.amount) };
    const inv = defaults?.invoiceId ? data.invoices.find((i) => i.id === defaults.invoiceId) : undefined;
    return {
      customerId: inv?.customerId ?? defaults?.customerId ?? '',
      invoiceId: inv?.id ?? '',
      date: todayISO(),
      amount: inv ? String(invoiceBalance(inv, data.payments)) : '',
      method: 'Card',
      notes: '',
    };
  }, [open, payment?.id, defaults?.invoiceId, defaults?.customerId]);

  const customerOptions = useMemo(
    () => [...data.customers].sort((a, b) => a.name.localeCompare(b.name)).map((c) => ({ value: c.id, label: c.name })),
    [data.customers],
  );

  const invoiceOptions = useMemo(
    () =>
      data.invoices
        .filter((i) => i.customerId === values.customerId && (available(i.id) > 0 || i.id === payment?.invoiceId))
        .sort((a, b) => b.invoiceDate.localeCompare(a.invoiceDate))
        .map((i) => ({
          value: i.id,
          label: `${i.number} · ${fmt.date(i.invoiceDate)} · balance ${fmt.money(available(i.id))} of ${fmt.money(invoiceTotal(i))}`,
        })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data.invoices, data.payments, values.customerId, payment?.id, fmt],
  );

  const onCustomerChange = (customerId: string) => {
    setValues((v) => ({ ...v, customerId, invoiceId: '' }));
    setErrors((e) => ({ ...e, customerId: '' }));
  };

  const onInvoiceChange = (invoiceId: string) => {
    setValues((v) => ({ ...v, invoiceId, amount: invoiceId ? String(available(invoiceId)) : v.amount }));
    setErrors((e) => ({ ...e, amount: '' }));
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const amount = Number(values.amount);
    const max = values.invoiceId ? available(values.invoiceId) : Infinity;
    const errs = compact({
      customerId: required(values.customerId, 'Customer'),
      date: required(values.date, 'Date'),
      amount:
        values.amount === '' || !Number.isFinite(amount) || amount <= 0
          ? 'Enter an amount greater than zero'
          : amount > max + 0.004
            ? `Amount exceeds the invoice balance of ${fmt.money(max)}`
            : undefined,
    });
    if (hasErrors(errs)) return setErrors(errs);

    const draft: Draft<Payment> = {
      customerId: values.customerId,
      invoiceId: values.invoiceId,
      date: values.date,
      amount: roundMoney(amount),
      method: values.method,
      notes: values.notes.trim(),
    };
    if (payment) {
      updatePayment(payment.id, draft);
      toast.success('Payment updated successfully');
    } else {
      addPayment(draft);
      toast.success('Payment recorded successfully');
    }
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={payment ? `Edit Payment ${payment.number}` : 'Record Payment'}
      description="Payments allocated to an invoice update its status automatically"
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="payment-form">
            {payment ? 'Save Changes' : 'Record Payment'}
          </Button>
        </>
      }
    >
      <form id="payment-form" onSubmit={submit} noValidate>
        <FormGrid>
          <SelectField
            label="Customer"
            required
            value={values.customerId}
            onChange={(e) => onCustomerChange(e.target.value)}
            options={customerOptions}
            placeholder="Select a customer"
            error={errors.customerId}
          />
          <SelectField
            label="Invoice"
            value={values.invoiceId}
            onChange={(e) => onInvoiceChange(e.target.value)}
            options={invoiceOptions}
            placeholder={
              !values.customerId ? 'Select a customer first' : invoiceOptions.length ? 'Not linked to an invoice' : 'No open invoices'
            }
            disabled={!values.customerId}
          />
          <TextField label="Date" required type="date" value={values.date} onChange={(e) => set('date', e.target.value)} error={errors.date} />
          <NumberField
            label="Amount"
            required
            min={0}
            step="0.01"
            prefix={currencySymbol(fmt.currency)}
            value={values.amount}
            onChange={(e) => set('amount', e.target.value)}
            error={errors.amount}
            placeholder="0.00"
          />
          <SelectField
            label="Payment Method"
            required
            value={values.method}
            onChange={(e) => set('method', e.target.value as PaymentMethod)}
            options={toOptions(PAYMENT_METHODS)}
          />
          <TextareaField
            label="Notes"
            value={values.notes}
            onChange={(e) => set('notes', e.target.value)}
            placeholder="Reference number, cheque details…"
            className="sm:col-span-2"
          />
        </FormGrid>
      </form>
    </Modal>
  );
}
