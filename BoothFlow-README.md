# BoothFlow — Photo Booth Rental Business Manager

**Open:** double-click `BoothFlow.html` (any modern browser). No install, no internet needed. Demo data loads on first launch (Settings → Reset demo data to restore it; Clear all data to start fresh).

**Data:** stored in your browser (localStorage; logo in IndexedDB). Use Settings → Export backup regularly (includes logo); Import backup restores everything.

## Workflow
Lead → Client → Event (package, add-ons, deposit) → Equipment/staff → Checklist → Completion → Final payment. The **Event workspace** (Events → click an event) holds overview, pricing, equipment & team, checklist, contract, payments and notes.

## Features
Overview (today's schedule, timeline, pipeline, action-required) · Events CRUD, status, filters, sort, CSV · Calendar (month/week/day, create from date, booth availability) · Clients (history, balance, delete safeguards) · Leads board → one-click convert to client+event · Quote builder (live pricing, print, sent/approved/declined, convert) · Package & add-on management + pricing configurator · Equipment inventory (conflict-proof assignment, maintenance log) · Payments (deposit/partial/final/refund/charges, auto balance, over-payment blocked) · Contracts (status tracking, printable booking summary) · Team · Expenses · Reports (date ranges, revenue by booth/event type, utilization, lead conversion, CSV) · Settings (profile, logo, taxes, templates, lists, backup/restore).

## QA performed (automated + visual)
1 client→event→package→add-ons ✔ · 2 lead→quote→approve→convert ✔ · 3 overlapping equipment blocked ✔ · 4 deposit→partial→final = $0 balance, overpay blocked ✔ · 5 checklist→completed ✔ · 6 backup→clear→restore incl. logo ✔ · 7 reload persistence ✔ · 8 fully offline (no network resources) ✔ · 9 desktop/tablet/mobile, no horizontal overflow ✔ · 10 reports computed from stored data ✔

## Known limitations
- Data lives in one browser/device; clearing site data deletes it (back up!).
- No email sending, payment gateway or legally binding e-signatures (status tracking only).
- "Additional Charge" payments raise the event total; they are not cash received.
- Equipment conflicts use setup→teardown time windows; staff double-booking is not checked.
- Printing uses the browser print dialog (choose "Save as PDF" for PDFs).
