import type { FormEvent } from 'react';
import type { ActiveStatus, Draft, Employee, EmployeeRole } from '@/types';
import { Button, FormGrid, Modal, SelectField, TextField, toOptions, useToast } from '@/components/ui';
import { useAppData } from '@/store/AppDataContext';
import { useForm } from '@/hooks/useForm';
import { compact, hasErrors, isEmail, isPhone, required } from '@/utils/validation';

export const EMPLOYEE_ROLES: EmployeeRole[] = ['Cleaner', 'Supervisor', 'Manager'];
export const ACTIVE_STATUSES: ActiveStatus[] = ['Active', 'Inactive'];

const blank = (): Draft<Employee> => ({ name: '', phone: '', email: '', role: 'Cleaner', status: 'Active' });

export function EmployeeFormModal({ open, onClose, employee }: { open: boolean; onClose: () => void; employee?: Employee | null }) {
  const { addEmployee, updateEmployee } = useAppData();
  const toast = useToast();
  const { values, set, errors, setErrors } = useForm<Draft<Employee>>(
    () => (employee ? { name: employee.name, phone: employee.phone, email: employee.email, role: employee.role, status: employee.status } : blank()),
    [open, employee?.id],
  );

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const errs = compact({
      name: required(values.name, 'Full name'),
      phone: required(values.phone, 'Phone') ?? (isPhone(values.phone) ? undefined : 'Enter a valid phone number'),
      email: values.email.trim() && !isEmail(values.email) ? 'Enter a valid email address' : undefined,
    });
    if (hasErrors(errs)) return setErrors(errs);
    const draft = { ...values, name: values.name.trim(), phone: values.phone.trim(), email: values.email.trim() };
    if (employee) {
      updateEmployee(employee.id, draft);
      toast.success('Employee updated successfully');
    } else {
      addEmployee(draft);
      toast.success('Employee added successfully');
    }
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={employee ? 'Edit Employee' : 'Add Employee'}
      description={employee ? `Update details for ${employee.name}` : 'Add a new member to your cleaning team'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="employee-form">
            {employee ? 'Save Changes' : 'Add Employee'}
          </Button>
        </>
      }
    >
      <form id="employee-form" onSubmit={submit} noValidate>
        <FormGrid>
          <TextField
            label="Full Name"
            required
            value={values.name}
            onChange={(e) => set('name', e.target.value)}
            error={errors.name}
            placeholder="e.g. Aisha Johnson"
            className="sm:col-span-2"
          />
          <TextField label="Phone" required type="tel" value={values.phone} onChange={(e) => set('phone', e.target.value)} error={errors.phone} placeholder="(512) 555-0100" />
          <TextField label="Email" type="email" value={values.email} onChange={(e) => set('email', e.target.value)} error={errors.email} placeholder="name@example.com" />
          <SelectField label="Role" required value={values.role} onChange={(e) => set('role', e.target.value as EmployeeRole)} options={toOptions(EMPLOYEE_ROLES)} />
          <SelectField
            label="Status"
            required
            value={values.status}
            onChange={(e) => set('status', e.target.value as ActiveStatus)}
            options={toOptions(ACTIVE_STATUSES)}
            hint="Inactive employees can't be assigned to new jobs"
          />
        </FormGrid>
      </form>
    </Modal>
  );
}
