# Employee Timesheet (HTML)

Single-file HTML version of the Power Apps "Employee Timesheet" app. No build step,
no server: open `index.html` in any browser. Data is saved in the browser's
`localStorage`; Settings → "Reset to sample data" restores the demo workspace.

## Screens
- **Dashboard** – KPI cards (employees, weekly hours vs prior week, pending, overtime),
  weekly hours chart with week navigation and hover tooltips, quick actions, recent timesheets.
- **Timesheets** – search, calendar date filter, employee / project / status filters,
  pagination, Add timesheet and View / Edit (approve, reject, delete). Total hours are
  calculated from start, end and break (overnight shifts supported) with validation.
- **Employees** – searchable list with department filter, add / edit / remove, per-employee history.
- **Projects** – cards with status, assigned employees, hours logged and budget usage; add / edit.
- **Reports** – Weekly / Monthly toggle, total / regular / overtime hours, stacked bar chart, breakdown table.
- **Settings** – company name and timezone, working hours, overtime tracking and weekly
  threshold, notification toggles.

Works on desktop and mobile, light and dark mode.
