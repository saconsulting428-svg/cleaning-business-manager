import { BrowserRouter, MemoryRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppDataProvider } from '@/store/AppDataContext';
import { ToastProvider } from '@/components/ui';
import { AppLayout } from '@/components/layout/AppLayout';
import { DashboardPage } from '@/pages/DashboardPage';
import { CustomersPage } from '@/pages/CustomersPage';
import { JobsPage } from '@/pages/JobsPage';
import { SchedulePage } from '@/pages/SchedulePage';
import { EmployeesPage } from '@/pages/EmployeesPage';
import { ServicesPage } from '@/pages/ServicesPage';
import { InvoicesPage } from '@/pages/InvoicesPage';
import { PaymentsPage } from '@/pages/PaymentsPage';
import { ReportsPage } from '@/pages/ReportsPage';
import { SettingsPage } from '@/pages/SettingsPage';

/**
 * Standard builds use clean URLs. The single-file preview build (`npm run build:preview`)
 * runs inside a frame without an address bar, so it keeps navigation in memory.
 */
const Router = import.meta.env.VITE_ROUTER === 'memory' ? MemoryRouter : BrowserRouter;

export default function App() {
  return (
    <AppDataProvider>
      <ToastProvider>
        <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <Routes>
            <Route element={<AppLayout />}>
              <Route index element={<DashboardPage />} />
              <Route path="customers" element={<CustomersPage />} />
              <Route path="jobs" element={<JobsPage />} />
              <Route path="schedule" element={<SchedulePage />} />
              <Route path="employees" element={<EmployeesPage />} />
              <Route path="services" element={<ServicesPage />} />
              <Route path="invoices" element={<InvoicesPage />} />
              <Route path="payments" element={<PaymentsPage />} />
              <Route path="reports" element={<ReportsPage />} />
              <Route path="settings" element={<SettingsPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </Router>
      </ToastProvider>
    </AppDataProvider>
  );
}
