import { useMemo } from 'react';
import { useAppData } from '@/store/AppDataContext';
import { byId } from '@/utils/calc';

/** Id → record maps for joining related records in tables and views. */
export function useLookups() {
  const { customers, employees, services, jobs, invoices } = useAppData().data;
  return useMemo(() => {
    const maps = {
      customers: byId(customers),
      employees: byId(employees),
      services: byId(services),
      jobs: byId(jobs),
      invoices: byId(invoices),
    };
    return {
      ...maps,
      customerName: (id: string) => maps.customers.get(id)?.name ?? 'Removed customer',
      employeeName: (id: string) => (id ? maps.employees.get(id)?.name ?? 'Removed employee' : 'Unassigned'),
      serviceName: (id: string) => maps.services.get(id)?.name ?? 'Removed service',
    };
  }, [customers, employees, services, jobs, invoices]);
}
