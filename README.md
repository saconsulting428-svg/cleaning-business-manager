# CleanPro — Cleaning Business Manager

A complete, browser-only business management app for small cleaning companies:
customers, cleaning jobs, scheduling, employees, services, invoices, payments and
reports. Built with React, TypeScript, Vite, Tailwind CSS, Lucide icons and Recharts.

There is no backend, database, login or external service. Everything runs in the
browser and is saved to `localStorage`.

## Requirements

- Node.js 18 or newer (tested with Node 22)
- npm

## Install

```bash
npm install
```

## Run (development)

```bash
npm run dev
```

Open the URL Vite prints (usually http://localhost:5173).

## Build (production)

```bash
npm run build     # type-checks with tsc, then builds to dist/
npm run preview   # serves the production build locally (http://localhost:4173)
```

`npm run typecheck` runs the TypeScript check on its own.

The build in `dist/` is a static single-page app. If you host it on a static web
server, route all unknown paths to `index.html` so deep links such as `/invoices`
still load.

## Using the application

On first launch CleanPro loads a starter set of business records (customers,
team members, the six standard services, about six months of jobs, invoices and
payments) so every screen shows real figures. All dates are relative to today.

| Page | What you can do |
| --- | --- |
| **Dashboard** | KPIs (customers, today's jobs, completed jobs, monthly revenue, pending payments, upcoming jobs), 6-month revenue chart, upcoming jobs, recent customers, and quick actions: Add Customer, Add Cleaning Job, Create Invoice. KPI cards link to their pages. |
| **Customers** | Search, filter by Residential/Commercial, sort columns, and add, edit or delete customers. Click a row for details: contact info, total jobs, revenue, amount paid, outstanding balance, job history and invoices. |
| **Cleaning Jobs** | Add, edit, delete, search and filter jobs by date, status, payment status and employee. Change a job's status straight from the table. Choosing a service fills in its default price and end time, and the form warns you when an employee is double-booked. |
| **Schedule** | Month, week and day calendar views, a daily schedule and upcoming jobs. Click any job to open its details; click a day to open the day view. |
| **Employees** | Add, edit, delete and search employees (Cleaner / Supervisor / Manager, Active / Inactive) and view each person's upcoming and past jobs. Only active employees can be assigned to new jobs. |
| **Services** | Add, edit and delete services with a default price, estimated duration and status. A service used by jobs can't be deleted, but you can set it to Inactive. |
| **Invoices** | Create invoices, optionally linked to a job (the line item is filled in for you). Subtotal, tax and total are calculated automatically. View a professional invoice, **Print Invoice** (uses the browser's print dialog), record a payment or **Mark as Paid**. |
| **Payments** | Record payments (Cash, Bank Transfer, Card, Other) against an invoice or unallocated. Shows totals for all time and this month, plus the pending amount. Overpaying an invoice is blocked. |
| **Reports** | Total revenue, monthly revenue, completed jobs, pending payments and customers, with charts for revenue over time, jobs by status and revenue by service, plus top customers. Filters: This Month, Last Month, Last 3 Months, This Year. |
| **Settings** | Business information (printed on invoices), currency, date format, default tax rate and payment terms. Also has data management and reset. |

### How the numbers are calculated

- **Revenue** is the value of cleaning jobs marked **Completed** (before tax), counted on the job date.
- **Payments / collected** is the sum of recorded payments.
- **Pending payments / outstanding** is the unpaid balance of invoices.
- **Invoice status** is always worked out from its payments and due date: *Paid* (fully paid), *Partially Paid*, *Overdue* (past due and not fully paid) or *Pending*.
- A job's **payment status** follows its linked invoice automatically. Jobs without an invoice keep the status you set by hand.

Every figure is computed from the stored records, so any add, edit or delete
shows up right away on the dashboard, schedule and reports.

## Where data is stored

All records and settings are saved in your browser's `localStorage` under a
single key:

```
cleanpro:data:v1
```

The data stays after you refresh or restart the browser. It is tied to this
browser and site address, so it doesn't sync between devices or browsers.
Clearing site data in the browser also deletes it.

## Resetting application data

1. Open **Settings**.
2. In **Danger Zone**, type `RESET` and click **Reset Application Data**.
3. Confirm in the dialog. This permanently deletes every record and setting and
   leaves you with a blank workspace.

To start over with the starter business records instead, click **Load Starter
Data** under **Data Storage** in Settings and confirm.

You can also clear everything from the browser's developer tools by removing
the `cleanpro:data:v1` key from localStorage. The starter data loads again on
the next visit.

## Project structure

```
src/
  types/            TypeScript interfaces (Customer, Employee, Service, CleaningJob, Invoice, Payment, BusinessSettings)
  data/seed.ts      Default settings and starter business data
  store/            App state (React context + reducer) and localStorage persistence
  utils/            Dates, money formatting, business calculations, validation, ids
  hooks/            Form state, formatting, lookups, confirmation dialog
  components/
    ui/             Button, Card, Modal, ConfirmDialog, Toast, DataTable, form fields, StatusBadge, KpiCard, EmptyState, toolbar controls
    layout/         Sidebar, header and app layout
    charts/         Bar/column chart wrappers
  features/         Forms and detail views per module (customers, jobs, employees, services, invoices, payments)
  pages/            One page per navigation item
```
