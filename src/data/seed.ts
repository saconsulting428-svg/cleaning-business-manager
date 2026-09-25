/**
 * Starter business data created on first launch so the workspace is useful
 * immediately. Dates are generated relative to "today" so the dashboard,
 * schedule and reports always show current activity.
 */
import type {
  AppData,
  BusinessSettings,
  CleaningJob,
  Customer,
  Employee,
  Invoice,
  Payment,
  PaymentMethod,
  Service,
} from '@/types';
import { addDays, minutesToTime, toISODate, todayISO } from '@/utils/date';
import { roundMoney } from '@/utils/format';
import { invoiceTotal } from '@/utils/calc';
import { createId } from '@/utils/id';

export const DEFAULT_SETTINGS: BusinessSettings = {
  businessName: 'CleanPro Cleaning Services',
  phone: '(512) 555-0148',
  email: 'hello@cleanpro-services.com',
  address: '2100 Riverside Drive, Suite 210, Austin, TX 78741',
  website: 'www.cleanpro-services.com',
  currency: 'USD',
  dateFormat: 'MM/DD/YYYY',
  defaultTaxRate: 8.25,
  paymentTermsDays: 14,
};

export function emptyData(): AppData {
  return {
    customers: [],
    employees: [],
    services: [],
    jobs: [],
    invoices: [],
    payments: [],
    settings: { ...DEFAULT_SETTINGS },
  };
}

/** Small deterministic PRNG so the starter data is stable across resets. */
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createStarterData(): AppData {
  const rand = mulberry32(20260925);
  const pick = <T,>(arr: T[]): T => arr[Math.floor(rand() * arr.length)]!;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = todayISO();
  const stamp = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 9).toISOString();

  /* ------------------------------- Services ------------------------------- */
  const serviceDefs: Array<[string, string, number, number]> = [
    ['Standard Cleaning', 'Regular upkeep: dusting, vacuuming, mopping, kitchen and bathroom surfaces.', 120, 120],
    ['Deep Cleaning', 'Top-to-bottom clean including baseboards, inside appliances, grout and fixtures.', 260, 240],
    ['Move In Cleaning', 'Full sanitising clean of an empty property before the new occupants arrive.', 320, 300],
    ['Move Out Cleaning', 'End-of-tenancy clean to hand the property back in inspection-ready condition.', 340, 300],
    ['Office Cleaning', 'Workspace cleaning: desks, common areas, restrooms, kitchenettes and trash removal.', 220, 180],
    ['Carpet Cleaning', 'Hot water extraction and stain treatment for carpets and rugs.', 180, 150],
  ];
  const created = stamp(addDays(today, -200));
  const services: Service[] = serviceDefs.map(([name, description, defaultPrice, durationMinutes]) => ({
    id: createId(),
    name,
    description,
    defaultPrice,
    durationMinutes,
    status: 'Active',
    createdAt: created,
  }));

  /* ------------------------------- Employees ------------------------------ */
  const employeeDefs: Array<[string, Employee['role'], Employee['status']]> = [
    ['Maria Gonzalez', 'Manager', 'Active'],
    ['David Chen', 'Supervisor', 'Active'],
    ['Aisha Johnson', 'Cleaner', 'Active'],
    ['Lucas Martins', 'Cleaner', 'Active'],
    ['Priya Patel', 'Cleaner', 'Active'],
    ['James O’Connor', 'Cleaner', 'Active'],
    ['Sofia Rossi', 'Cleaner', 'Active'],
    ['Kevin Brooks', 'Cleaner', 'Inactive'],
  ];
  const employees: Employee[] = employeeDefs.map(([name, role, status], i) => ({
    id: createId(),
    name,
    phone: `(512) 555-01${String(20 + i * 3).padStart(2, '0')}`,
    email: `${name.split(' ')[0]!.toLowerCase()}@cleanpro-services.com`,
    role,
    status,
    createdAt: created,
  }));
  const fieldStaff = employees.filter((e) => e.status === 'Active' && e.role !== 'Manager');

  /* ------------------------------- Customers ------------------------------ */
  const customerDefs: Array<[string, Customer['type'], string, string, string]> = [
    ['Emily Carter', 'Residential', '418 Maple Avenue', 'Austin', 'Has a friendly golden retriever. Key under the front mat.'],
    ['Brightside Dental Clinic', 'Commercial', '1250 Congress Ave, Suite 300', 'Austin', 'Clean after 6 PM on weekdays. Alarm code provided by the office manager.'],
    ['Michael Thompson', 'Residential', '77 Oakwood Lane', 'Round Rock', ''],
    ['Summit Realty Group', 'Commercial', '980 Lamar Blvd', 'Austin', 'Move in / move out cleans for managed rental units.'],
    ['Olivia Nguyen', 'Residential', '2304 Willow Creek Dr', 'Pflugerville', 'Prefers eco-friendly products only.'],
    ['Greenleaf Co-Working', 'Commercial', '415 E 6th Street', 'Austin', 'Weekly office clean. Contact front desk on arrival.'],
    ['Daniel Rivera', 'Residential', '15 Hillcrest Court', 'Cedar Park', ''],
    ['Sarah Mitchell', 'Residential', '903 Barton Springs Rd', 'Austin', 'Focus on kitchen and upstairs bathrooms.'],
    ['Lone Star Law Partners', 'Commercial', '600 W 5th Street, Floor 4', 'Austin', 'Confidential documents on desks — do not move paperwork.'],
    ['Robert Kim', 'Residential', '5120 Shoal Creek Blvd', 'Austin', ''],
    ['Hannah Wright', 'Residential', '38 Sunset Ridge', 'Georgetown', 'Carpet cleaning twice a year.'],
    ['Metro Fitness Studio', 'Commercial', '2201 S Lamar Blvd', 'Austin', 'Mats and locker rooms need extra attention.'],
    ['Jessica Alvarez', 'Residential', '1120 Pecan Street', 'Round Rock', ''],
    ['Thomas Walker', 'Residential', '64 Bluebonnet Trail', 'Leander', 'Gate code 4417.'],
    ['Riverside Bakery & Café', 'Commercial', '310 Riverside Dr', 'Austin', 'Early morning clean before 6 AM opening.'],
    ['Natalie Brooks', 'Residential', '2780 Lakeview Terrace', 'Austin', 'New customer — referred by Emily Carter.'],
  ];
  const customers: Customer[] = customerDefs.map(([name, type, address, city, notes], i) => {
    // Most customers joined months ago; the last few joined recently.
    const daysAgo = i < 12 ? 190 - i * 12 : 40 - (i - 12) * 11;
    const slug = name.toLowerCase().replace(/[^a-z]+/g, '.').replace(/^\.|\.$/g, '');
    return {
      id: createId(),
      name,
      phone: `(512) 555-${String(1200 + i * 37).slice(-4)}`,
      email: type === 'Commercial' ? `office@${slug.split('.')[0]}.com` : `${slug}@mail.com`,
      type,
      address,
      city,
      notes,
      createdAt: stamp(addDays(today, -daysAgo)),
    };
  });

  const serviceFor = (c: Customer): Service => {
    if (c.type === 'Commercial') {
      if (c.name.includes('Realty')) return pick([services[2]!, services[3]!, services[1]!]);
      return rand() < 0.8 ? services[4]! : pick([services[1]!, services[5]!]);
    }
    const r = rand();
    if (r < 0.58) return services[0]!;
    if (r < 0.8) return services[1]!;
    if (r < 0.9) return services[5]!;
    return pick([services[2]!, services[3]!]);
  };

  /* --------------------------------- Jobs --------------------------------- */
  const startSlots = [7 * 60 + 30, 8 * 60, 9 * 60, 10 * 60, 11 * 60 + 30, 13 * 60, 14 * 60, 15 * 60 + 30];
  const rawJobs: Omit<CleaningJob, 'number'>[] = [];
  const firstDay = addDays(today, -165);
  const lastDay = addDays(today, 24);

  for (let d = new Date(firstDay); d <= lastDay; d = addDays(d, 1)) {
    if (d.getDay() === 0) continue; // closed on Sundays
    const dateStr = toISODate(d);
    const isToday = dateStr === todayStr;
    const isFuture = dateStr > todayStr;
    const count = isToday ? 4 : isFuture ? (rand() < 0.75 ? 1 + Math.floor(rand() * 2) : 0) : Math.floor(rand() * 3.2);
    const slots = [...startSlots].sort(() => rand() - 0.5).slice(0, count).sort((a, b) => a - b);

    slots.forEach((start, idx) => {
      const eligible = customers.filter((c) => c.createdAt.slice(0, 10) <= dateStr);
      if (eligible.length === 0) return;
      const customer = pick(eligible);
      const service = serviceFor(customer);
      const employee = fieldStaff[(idx + d.getDate()) % fieldStaff.length]!;
      const variance = Math.round((rand() * 0.3 - 0.1) * service.defaultPrice / 5) * 5;
      let status: CleaningJob['status'] = 'Scheduled';
      if (!isFuture && !isToday) status = rand() < 0.93 ? 'Completed' : 'Cancelled';
      if (isToday) status = idx === 0 ? 'Completed' : idx === 1 ? 'In Progress' : 'Scheduled';
      rawJobs.push({
        id: createId(),
        customerId: customer.id,
        serviceId: service.id,
        employeeId: employee.id,
        date: dateStr,
        startTime: minutesToTime(start),
        endTime: minutesToTime(start + service.durationMinutes),
        price: service.defaultPrice + variance,
        status,
        paymentStatus: 'Pending',
        notes: status === 'Cancelled' ? 'Cancelled by customer.' : '',
        createdAt: stamp(addDays(d, -7)),
      });
    });
  }

  const jobs: CleaningJob[] = rawJobs.map((j, i) => ({ ...j, number: `JOB-${1001 + i}` }));

  /* --------------------------- Invoices & payments -------------------------- */
  const invoices: Invoice[] = [];
  const payments: Payment[] = [];
  const serviceMap = new Map(services.map((s) => [s.id, s]));
  const methods: PaymentMethod[] = ['Card', 'Card', 'Bank Transfer', 'Cash', 'Bank Transfer', 'Other'];

  jobs
    .filter((j) => j.status === 'Completed')
    .forEach((job) => {
      const jobDate = new Date(`${job.date}T00:00:00`);
      const inv: Invoice = {
        id: createId(),
        number: `INV-${1001 + invoices.length}`,
        customerId: job.customerId,
        jobId: job.id,
        invoiceDate: job.date,
        dueDate: toISODate(addDays(jobDate, DEFAULT_SETTINGS.paymentTermsDays)),
        items: [{ id: createId(), description: serviceMap.get(job.serviceId)?.name ?? 'Cleaning service', quantity: 1, unitPrice: job.price }],
        taxRate: DEFAULT_SETTINGS.defaultTaxRate,
        notes: '',
        createdAt: stamp(jobDate),
      };
      invoices.push(inv);

      const total = invoiceTotal(inv);
      const age = Math.round((today.getTime() - jobDate.getTime()) / 86_400_000);
      const r = rand();
      let amount = 0;
      if (age > 24) amount = r < 0.95 ? total : r < 0.975 ? roundMoney(total / 2) : 0;
      else if (age > 3) amount = r < 0.55 ? total : r < 0.72 ? roundMoney(total / 2) : 0;
      if (amount <= 0) return;

      const payDate = addDays(jobDate, Math.min(age, Math.floor(rand() * 10)));
      payments.push({
        id: createId(),
        number: `PAY-${1001 + payments.length}`,
        customerId: job.customerId,
        invoiceId: inv.id,
        date: toISODate(payDate),
        amount,
        method: pick(methods),
        notes: amount < total ? 'Deposit received, balance to follow.' : '',
        createdAt: stamp(payDate),
      });
    });

  payments.sort((a, b) => a.date.localeCompare(b.date));
  payments.forEach((p, i) => (p.number = `PAY-${1001 + i}`));

  return {
    customers,
    employees,
    services,
    jobs,
    invoices,
    payments,
    settings: { ...DEFAULT_SETTINGS },
  };
}
