export type ID = string;

/** ISO calendar date, `YYYY-MM-DD` (local, no time zone). */
export type ISODate = string;
/** 24h clock time, `HH:MM`. */
export type TimeString = string;

export type CustomerType = 'Residential' | 'Commercial';

export interface Customer {
  id: ID;
  name: string;
  phone: string;
  email: string;
  type: CustomerType;
  address: string;
  city: string;
  notes: string;
  createdAt: string;
}

export type EmployeeRole = 'Cleaner' | 'Supervisor' | 'Manager';
export type ActiveStatus = 'Active' | 'Inactive';

export interface Employee {
  id: ID;
  name: string;
  phone: string;
  email: string;
  role: EmployeeRole;
  status: ActiveStatus;
  createdAt: string;
}

export interface Service {
  id: ID;
  name: string;
  description: string;
  defaultPrice: number;
  /** Estimated duration in minutes. */
  durationMinutes: number;
  status: ActiveStatus;
  createdAt: string;
}

export type JobStatus = 'Scheduled' | 'In Progress' | 'Completed' | 'Cancelled';
export type JobPaymentStatus = 'Paid' | 'Pending' | 'Partially Paid';

export interface CleaningJob {
  id: ID;
  /** Human-readable reference, e.g. `JOB-1001`. */
  number: string;
  customerId: ID;
  serviceId: ID;
  /** Empty string when unassigned. */
  employeeId: ID;
  date: ISODate;
  startTime: TimeString;
  endTime: TimeString;
  price: number;
  status: JobStatus;
  paymentStatus: JobPaymentStatus;
  notes: string;
  createdAt: string;
}

export type InvoiceStatus = 'Paid' | 'Pending' | 'Overdue' | 'Partially Paid';

export interface InvoiceLineItem {
  id: ID;
  description: string;
  quantity: number;
  unitPrice: number;
}

export interface Invoice {
  id: ID;
  /** Human-readable reference, e.g. `INV-1001`. */
  number: string;
  customerId: ID;
  /** Empty string when the invoice is not linked to a job. */
  jobId: ID;
  invoiceDate: ISODate;
  dueDate: ISODate;
  items: InvoiceLineItem[];
  /** Tax rate as a percentage, e.g. `8.5`. */
  taxRate: number;
  notes: string;
  createdAt: string;
}

export type PaymentMethod = 'Cash' | 'Bank Transfer' | 'Card' | 'Other';

export interface Payment {
  id: ID;
  /** Human-readable reference, e.g. `PAY-1001`. */
  number: string;
  customerId: ID;
  /** Empty string when not allocated to an invoice. */
  invoiceId: ID;
  date: ISODate;
  amount: number;
  method: PaymentMethod;
  notes: string;
  createdAt: string;
}

export type CurrencyCode = 'USD' | 'EUR' | 'GBP' | 'CAD' | 'AUD' | 'ZAR' | 'INR' | 'AED';
export type DateFormat = 'MM/DD/YYYY' | 'DD/MM/YYYY' | 'YYYY-MM-DD' | 'MMM D, YYYY';

export interface BusinessSettings {
  businessName: string;
  phone: string;
  email: string;
  address: string;
  website: string;
  currency: CurrencyCode;
  dateFormat: DateFormat;
  /** Default tax rate (%) applied to new invoices. */
  defaultTaxRate: number;
  /** Days until an invoice is due, used for new invoices. */
  paymentTermsDays: number;
}

export interface AppData {
  customers: Customer[];
  employees: Employee[];
  services: Service[];
  jobs: CleaningJob[];
  invoices: Invoice[];
  payments: Payment[];
  settings: BusinessSettings;
}

/** Record fields supplied by the user when creating/editing an entity. */
export type Draft<T> = Omit<T, 'id' | 'createdAt' | 'number'>;
