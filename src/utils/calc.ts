/**
 * Business calculations derived from stored records.
 *
 * Conventions used across the app:
 *  - Revenue    = value of *completed* cleaning jobs (earned revenue, excl. tax).
 *  - Collected  = sum of recorded payments.
 *  - Outstanding / Pending payments = unpaid balance of invoices.
 *  - Invoice status is always derived from its payments and due date,
 *    so it can never drift out of sync.
 */
import type {
  AppData,
  CleaningJob,
  Customer,
  Invoice,
  InvoiceStatus,
  ISODate,
  JobPaymentStatus,
  Payment,
} from '@/types';
import { roundMoney } from './format';
import { todayISO } from './date';

/* ---------------------------------- Invoices --------------------------------- */

export function invoiceSubtotal(inv: Pick<Invoice, 'items'>): number {
  return roundMoney(inv.items.reduce((s, i) => s + (Number(i.quantity) || 0) * (Number(i.unitPrice) || 0), 0));
}

export function invoiceTax(inv: Pick<Invoice, 'items' | 'taxRate'>): number {
  return roundMoney((invoiceSubtotal(inv) * (Number(inv.taxRate) || 0)) / 100);
}

export function invoiceTotal(inv: Pick<Invoice, 'items' | 'taxRate'>): number {
  return roundMoney(invoiceSubtotal(inv) + invoiceTax(inv));
}

export function invoicePaid(invoiceId: string, payments: Payment[]): number {
  return roundMoney(payments.filter((p) => p.invoiceId === invoiceId).reduce((s, p) => s + p.amount, 0));
}

export function invoiceBalance(inv: Invoice, payments: Payment[]): number {
  return Math.max(0, roundMoney(invoiceTotal(inv) - invoicePaid(inv.id, payments)));
}

export function invoiceStatus(inv: Invoice, payments: Payment[], today: ISODate = todayISO()): InvoiceStatus {
  const total = invoiceTotal(inv);
  const paid = invoicePaid(inv.id, payments);
  if (total > 0 && paid >= total - 0.004) return 'Paid';
  if (total === 0) return 'Paid';
  if (inv.dueDate < today) return 'Overdue';
  if (paid > 0) return 'Partially Paid';
  return 'Pending';
}

export interface InvoiceSummary {
  invoice: Invoice;
  subtotal: number;
  tax: number;
  total: number;
  paid: number;
  balance: number;
  status: InvoiceStatus;
}

export function summarizeInvoice(inv: Invoice, payments: Payment[], today: ISODate = todayISO()): InvoiceSummary {
  const subtotal = invoiceSubtotal(inv);
  const tax = invoiceTax(inv);
  const total = roundMoney(subtotal + tax);
  const paid = invoicePaid(inv.id, payments);
  return {
    invoice: inv,
    subtotal,
    tax,
    total,
    paid,
    balance: Math.max(0, roundMoney(total - paid)),
    status: invoiceStatus(inv, payments, today),
  };
}

/* ------------------------------------ Jobs ----------------------------------- */

/**
 * A job's payment status follows its invoice(s) when it has any; otherwise the
 * manually selected status is kept. Returns `null` when the job has no invoice.
 */
export function jobPaymentStatusFromInvoices(
  jobId: string,
  invoices: Invoice[],
  payments: Payment[],
): JobPaymentStatus | null {
  const linked = invoices.filter((i) => i.jobId === jobId);
  if (linked.length === 0) return null;
  const total = linked.reduce((s, i) => s + invoiceTotal(i), 0);
  const paid = linked.reduce((s, i) => s + invoicePaid(i.id, payments), 0);
  if (total > 0 && paid >= total - 0.004) return 'Paid';
  if (paid > 0) return 'Partially Paid';
  return 'Pending';
}

/** Recompute job payment statuses for jobs linked to invoices. */
export function syncJobPaymentStatuses(data: AppData): AppData {
  let changed = false;
  const jobs = data.jobs.map((job) => {
    const derived = jobPaymentStatusFromInvoices(job.id, data.invoices, data.payments);
    if (derived && derived !== job.paymentStatus) {
      changed = true;
      return { ...job, paymentStatus: derived };
    }
    return job;
  });
  return changed ? { ...data, jobs } : data;
}

export const isCompleted = (j: CleaningJob) => j.status === 'Completed';
export const isActiveJob = (j: CleaningJob) => j.status === 'Scheduled' || j.status === 'In Progress';

export function sortJobsByDateTime(a: CleaningJob, b: CleaningJob): number {
  return a.date === b.date ? a.startTime.localeCompare(b.startTime) : a.date.localeCompare(b.date);
}

export function upcomingJobs(jobs: CleaningJob[], today: ISODate = todayISO()): CleaningJob[] {
  return jobs.filter((j) => j.date >= today && isActiveJob(j)).sort(sortJobsByDateTime);
}

export function revenueBetween(jobs: CleaningJob[], from: ISODate, to: ISODate): number {
  return roundMoney(
    jobs.filter((j) => isCompleted(j) && j.date >= from && j.date <= to).reduce((s, j) => s + j.price, 0),
  );
}

/* --------------------------------- Payments ---------------------------------- */

export function paymentsBetween(payments: Payment[], from: ISODate, to: ISODate): number {
  return roundMoney(payments.filter((p) => p.date >= from && p.date <= to).reduce((s, p) => s + p.amount, 0));
}

export function totalOutstanding(invoices: Invoice[], payments: Payment[]): number {
  return roundMoney(invoices.reduce((s, i) => s + invoiceBalance(i, payments), 0));
}

/* --------------------------------- Customers --------------------------------- */

export interface CustomerStats {
  totalJobs: number;
  completedJobs: number;
  revenue: number;
  paid: number;
  outstanding: number;
  lastJobDate: ISODate | null;
}

export function customerStats(customer: Customer, data: Pick<AppData, 'jobs' | 'invoices' | 'payments'>): CustomerStats {
  const jobs = data.jobs.filter((j) => j.customerId === customer.id);
  const completed = jobs.filter(isCompleted);
  const invoices = data.invoices.filter((i) => i.customerId === customer.id);
  const paid = roundMoney(data.payments.filter((p) => p.customerId === customer.id).reduce((s, p) => s + p.amount, 0));
  const lastJobDate = completed.reduce<ISODate | null>((acc, j) => (!acc || j.date > acc ? j.date : acc), null);
  return {
    totalJobs: jobs.length,
    completedJobs: completed.length,
    revenue: roundMoney(completed.reduce((s, j) => s + j.price, 0)),
    paid,
    outstanding: totalOutstanding(invoices, data.payments),
    lastJobDate,
  };
}

/** Lookup map by id for fast joins in tables. */
export function byId<T extends { id: string }>(items: T[]): Map<string, T> {
  return new Map(items.map((i) => [i.id, i]));
}
