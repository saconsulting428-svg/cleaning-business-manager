import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, type ReactNode } from 'react';
import type {
  AppData,
  BusinessSettings,
  CleaningJob,
  Customer,
  Draft,
  Employee,
  Invoice,
  JobStatus,
  Payment,
  PaymentMethod,
  Service,
} from '@/types';
import { createStarterData, emptyData } from '@/data/seed';
import { loadData, saveData } from './storage';
import { createId, nextNumber } from '@/utils/id';
import { invoiceBalance, syncJobPaymentStatuses } from '@/utils/calc';
import { todayISO } from '@/utils/date';

type Updater = (data: AppData) => AppData;

function reducer(state: AppData, update: Updater): AppData {
  const next = update(state);
  return next === state ? state : syncJobPaymentStatuses(next);
}

const now = () => new Date().toISOString();

export interface AppDataApi {
  data: AppData;
  /* Customers */
  addCustomer: (draft: Draft<Customer>) => Customer;
  updateCustomer: (id: string, draft: Draft<Customer>) => void;
  deleteCustomer: (id: string) => void;
  /* Employees */
  addEmployee: (draft: Draft<Employee>) => Employee;
  updateEmployee: (id: string, draft: Draft<Employee>) => void;
  deleteEmployee: (id: string) => void;
  /* Services */
  addService: (draft: Draft<Service>) => Service;
  updateService: (id: string, draft: Draft<Service>) => void;
  deleteService: (id: string) => void;
  /* Jobs */
  addJob: (draft: Draft<CleaningJob>) => CleaningJob;
  updateJob: (id: string, draft: Draft<CleaningJob>) => void;
  setJobStatus: (id: string, status: JobStatus) => void;
  deleteJob: (id: string) => void;
  /* Invoices */
  addInvoice: (draft: Draft<Invoice>) => Invoice;
  updateInvoice: (id: string, draft: Draft<Invoice>) => void;
  deleteInvoice: (id: string) => void;
  markInvoicePaid: (id: string, method: PaymentMethod, date?: string) => Payment | null;
  /* Payments */
  addPayment: (draft: Draft<Payment>) => Payment;
  updatePayment: (id: string, draft: Draft<Payment>) => void;
  deletePayment: (id: string) => void;
  /* Settings */
  updateSettings: (settings: BusinessSettings) => void;
  resetAllData: () => void;
  restoreStarterData: () => void;
}

const AppDataContext = createContext<AppDataApi | null>(null);

export function AppDataProvider({ children }: { children: ReactNode }) {
  const [data, dispatch] = useReducer(reducer, undefined, () => syncJobPaymentStatuses(loadData()));

  // Keep a ref to the latest state so creators can compute sequential numbers synchronously.
  const ref = useRef(data);
  ref.current = data;

  useEffect(() => {
    saveData(data);
  }, [data]);

  const replaceIn = <K extends keyof AppData>(key: K, id: string, patch: object): Updater =>
    (s) => ({
      ...s,
      [key]: (s[key] as Array<{ id: string }>).map((item) => (item.id === id ? { ...item, ...patch } : item)),
    });

  /* ------------------------------ Customers ------------------------------ */
  const addCustomer = useCallback((draft: Draft<Customer>) => {
    const record: Customer = { ...draft, id: createId(), createdAt: now() };
    dispatch((s) => ({ ...s, customers: [record, ...s.customers] }));
    return record;
  }, []);
  const updateCustomer = useCallback((id: string, draft: Draft<Customer>) => dispatch(replaceIn('customers', id, draft)), []);
  const deleteCustomer = useCallback((id: string) => {
    dispatch((s) => {
      const invoiceIds = new Set(s.invoices.filter((i) => i.customerId === id).map((i) => i.id));
      return {
        ...s,
        customers: s.customers.filter((c) => c.id !== id),
        jobs: s.jobs.filter((j) => j.customerId !== id),
        invoices: s.invoices.filter((i) => i.customerId !== id),
        payments: s.payments.filter((p) => p.customerId !== id && !invoiceIds.has(p.invoiceId)),
      };
    });
  }, []);

  /* ------------------------------ Employees ------------------------------ */
  const addEmployee = useCallback((draft: Draft<Employee>) => {
    const record: Employee = { ...draft, id: createId(), createdAt: now() };
    dispatch((s) => ({ ...s, employees: [record, ...s.employees] }));
    return record;
  }, []);
  const updateEmployee = useCallback((id: string, draft: Draft<Employee>) => dispatch(replaceIn('employees', id, draft)), []);
  const deleteEmployee = useCallback((id: string) => {
    dispatch((s) => ({
      ...s,
      employees: s.employees.filter((e) => e.id !== id),
      jobs: s.jobs.map((j) => (j.employeeId === id ? { ...j, employeeId: '' } : j)),
    }));
  }, []);

  /* ------------------------------- Services ------------------------------ */
  const addService = useCallback((draft: Draft<Service>) => {
    const record: Service = { ...draft, id: createId(), createdAt: now() };
    dispatch((s) => ({ ...s, services: [...s.services, record] }));
    return record;
  }, []);
  const updateService = useCallback((id: string, draft: Draft<Service>) => dispatch(replaceIn('services', id, draft)), []);
  const deleteService = useCallback((id: string) => {
    dispatch((s) => ({ ...s, services: s.services.filter((x) => x.id !== id) }));
  }, []);

  /* --------------------------------- Jobs -------------------------------- */
  const addJob = useCallback((draft: Draft<CleaningJob>) => {
    const record: CleaningJob = { ...draft, id: createId(), number: nextNumber('JOB', ref.current.jobs), createdAt: now() };
    ref.current = { ...ref.current, jobs: [...ref.current.jobs, record] };
    dispatch((s) => ({ ...s, jobs: [...s.jobs, record] }));
    return record;
  }, []);
  const updateJob = useCallback((id: string, draft: Draft<CleaningJob>) => dispatch(replaceIn('jobs', id, draft)), []);
  const setJobStatus = useCallback((id: string, status: JobStatus) => dispatch(replaceIn('jobs', id, { status })), []);
  const deleteJob = useCallback((id: string) => {
    dispatch((s) => ({
      ...s,
      jobs: s.jobs.filter((j) => j.id !== id),
      invoices: s.invoices.map((i) => (i.jobId === id ? { ...i, jobId: '' } : i)),
    }));
  }, []);

  /* ------------------------------- Invoices ------------------------------ */
  const addInvoice = useCallback((draft: Draft<Invoice>) => {
    const record: Invoice = { ...draft, id: createId(), number: nextNumber('INV', ref.current.invoices), createdAt: now() };
    ref.current = { ...ref.current, invoices: [...ref.current.invoices, record] };
    dispatch((s) => ({ ...s, invoices: [...s.invoices, record] }));
    return record;
  }, []);
  const updateInvoice = useCallback((id: string, draft: Draft<Invoice>) => dispatch(replaceIn('invoices', id, draft)), []);
  const deleteInvoice = useCallback((id: string) => {
    dispatch((s) => ({
      ...s,
      invoices: s.invoices.filter((i) => i.id !== id),
      payments: s.payments.map((p) => (p.invoiceId === id ? { ...p, invoiceId: '' } : p)),
    }));
  }, []);

  /* ------------------------------- Payments ------------------------------ */
  const addPayment = useCallback((draft: Draft<Payment>) => {
    const record: Payment = { ...draft, id: createId(), number: nextNumber('PAY', ref.current.payments), createdAt: now() };
    ref.current = { ...ref.current, payments: [...ref.current.payments, record] };
    dispatch((s) => ({ ...s, payments: [...s.payments, record] }));
    return record;
  }, []);
  const updatePayment = useCallback((id: string, draft: Draft<Payment>) => dispatch(replaceIn('payments', id, draft)), []);
  const deletePayment = useCallback((id: string) => {
    dispatch((s) => ({ ...s, payments: s.payments.filter((p) => p.id !== id) }));
  }, []);

  const markInvoicePaid = useCallback(
    (id: string, method: PaymentMethod, date: string = todayISO()) => {
      const inv = ref.current.invoices.find((i) => i.id === id);
      if (!inv) return null;
      const balance = invoiceBalance(inv, ref.current.payments);
      if (balance <= 0) return null;
      return addPayment({
        customerId: inv.customerId,
        invoiceId: inv.id,
        date,
        amount: balance,
        method,
        notes: `Balance settled for ${inv.number}`,
      });
    },
    [addPayment],
  );

  /* ------------------------------- Settings ------------------------------ */
  const updateSettings = useCallback((settings: BusinessSettings) => dispatch((s) => ({ ...s, settings })), []);
  const resetAllData = useCallback(() => dispatch(() => emptyData()), []);
  const restoreStarterData = useCallback(() => dispatch(() => createStarterData()), []);

  const api = useMemo<AppDataApi>(
    () => ({
      data,
      addCustomer, updateCustomer, deleteCustomer,
      addEmployee, updateEmployee, deleteEmployee,
      addService, updateService, deleteService,
      addJob, updateJob, setJobStatus, deleteJob,
      addInvoice, updateInvoice, deleteInvoice, markInvoicePaid,
      addPayment, updatePayment, deletePayment,
      updateSettings, resetAllData, restoreStarterData,
    }),
    // Action callbacks are stable; only `data` changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data],
  );

  return <AppDataContext.Provider value={api}>{children}</AppDataContext.Provider>;
}

export function useAppData(): AppDataApi {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error('useAppData must be used inside <AppDataProvider>');
  return ctx;
}
