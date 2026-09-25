import type { FormEvent } from 'react';
import type { Customer, CustomerType, Draft } from '@/types';
import { Button, FormGrid, Modal, SelectField, TextareaField, TextField, toOptions, useToast } from '@/components/ui';
import { useAppData } from '@/store/AppDataContext';
import { useForm } from '@/hooks/useForm';
import { compact, hasErrors, isEmail, isPhone, required } from '@/utils/validation';

export const CUSTOMER_TYPES: CustomerType[] = ['Residential', 'Commercial'];

const blank = (): Draft<Customer> => ({
  name: '',
  phone: '',
  email: '',
  type: 'Residential',
  address: '',
  city: '',
  notes: '',
});

export function CustomerFormModal({
  open,
  onClose,
  customer,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  customer?: Customer | null;
  onSaved?: (c: Customer) => void;
}) {
  const { addCustomer, updateCustomer } = useAppData();
  const toast = useToast();
  const { values, set, errors, setErrors } = useForm<Draft<Customer>>(
    () => (customer ? { ...blank(), ...customer } : blank()),
    [open, customer?.id],
  );

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const errs = compact({
      name: required(values.name, 'Full name'),
      phone: required(values.phone, 'Phone') ?? (isPhone(values.phone) ? undefined : 'Enter a valid phone number'),
      email: values.email.trim() && !isEmail(values.email) ? 'Enter a valid email address' : undefined,
      address: required(values.address, 'Address'),
      city: required(values.city, 'City'),
    });
    if (hasErrors(errs)) return setErrors(errs);

    const draft: Draft<Customer> = {
      name: values.name.trim(),
      phone: values.phone.trim(),
      email: values.email.trim(),
      type: values.type,
      address: values.address.trim(),
      city: values.city.trim(),
      notes: values.notes.trim(),
    };
    if (customer) {
      updateCustomer(customer.id, draft);
      toast.success('Customer updated successfully');
      onSaved?.({ ...customer, ...draft });
    } else {
      const created = addCustomer(draft);
      toast.success('Customer added successfully');
      onSaved?.(created);
    }
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={customer ? 'Edit Customer' : 'Add Customer'}
      description={customer ? `Update details for ${customer.name}` : 'Add a new residential or commercial customer'}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="customer-form">
            {customer ? 'Save Changes' : 'Add Customer'}
          </Button>
        </>
      }
    >
      <form id="customer-form" onSubmit={submit} noValidate>
        <FormGrid>
          <TextField
            label="Full Name"
            required
            value={values.name}
            onChange={(e) => set('name', e.target.value)}
            error={errors.name}
            placeholder="e.g. Emily Carter"
            className="sm:col-span-2"
          />
          <TextField
            label="Phone"
            required
            type="tel"
            value={values.phone}
            onChange={(e) => set('phone', e.target.value)}
            error={errors.phone}
            placeholder="(512) 555-0100"
          />
          <TextField
            label="Email"
            type="email"
            value={values.email}
            onChange={(e) => set('email', e.target.value)}
            error={errors.email}
            placeholder="name@example.com"
          />
          <SelectField
            label="Customer Type"
            required
            value={values.type}
            onChange={(e) => set('type', e.target.value as CustomerType)}
            options={toOptions(CUSTOMER_TYPES)}
          />
          <TextField
            label="City"
            required
            value={values.city}
            onChange={(e) => set('city', e.target.value)}
            error={errors.city}
            placeholder="e.g. Austin"
          />
          <TextField
            label="Address"
            required
            value={values.address}
            onChange={(e) => set('address', e.target.value)}
            error={errors.address}
            placeholder="Street address, suite or unit"
            className="sm:col-span-2"
          />
          <TextareaField
            label="Notes"
            value={values.notes}
            onChange={(e) => set('notes', e.target.value)}
            placeholder="Access instructions, pets, preferences…"
            className="sm:col-span-2"
          />
        </FormGrid>
      </form>
    </Modal>
  );
}
