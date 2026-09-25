import type { FormEvent } from 'react';
import type { ActiveStatus, Draft, Service } from '@/types';
import { Button, FormGrid, Modal, NumberField, SelectField, TextareaField, TextField, toOptions, useToast } from '@/components/ui';
import { useAppData } from '@/store/AppDataContext';
import { useForm } from '@/hooks/useForm';
import { useFormat } from '@/hooks/useFormat';
import { compact, hasErrors, required } from '@/utils/validation';
import { currencySymbol } from '@/utils/currency';
import { ACTIVE_STATUSES } from '@/features/employees/EmployeeFormModal';

interface FormValues {
  name: string;
  description: string;
  defaultPrice: string;
  hours: string;
  minutes: string;
  status: ActiveStatus;
}

export function ServiceFormModal({ open, onClose, service }: { open: boolean; onClose: () => void; service?: Service | null }) {
  const { data, addService, updateService } = useAppData();
  const toast = useToast();
  const fmt = useFormat();
  const { values, set, errors, setErrors } = useForm<FormValues>(
    () =>
      service
        ? {
            name: service.name,
            description: service.description,
            defaultPrice: String(service.defaultPrice),
            hours: String(Math.floor(service.durationMinutes / 60)),
            minutes: String(service.durationMinutes % 60),
            status: service.status,
          }
        : { name: '', description: '', defaultPrice: '', hours: '2', minutes: '0', status: 'Active' },
    [open, service?.id],
  );

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const price = Number(values.defaultPrice);
    const duration = (Number(values.hours) || 0) * 60 + (Number(values.minutes) || 0);
    const nameTaken = data.services.some(
      (s) => s.id !== service?.id && s.name.trim().toLowerCase() === values.name.trim().toLowerCase(),
    );
    const errs = compact({
      name: required(values.name, 'Service name') ?? (nameTaken ? 'A service with this name already exists' : undefined),
      defaultPrice:
        values.defaultPrice === '' || !Number.isFinite(price) || price < 0 ? 'Enter a valid default price' : undefined,
      duration: duration <= 0 ? 'Estimated duration must be greater than zero' : duration > 24 * 60 ? 'Duration cannot exceed 24 hours' : undefined,
    });
    if (hasErrors(errs)) return setErrors(errs);

    const draft: Draft<Service> = {
      name: values.name.trim(),
      description: values.description.trim(),
      defaultPrice: Math.round(price * 100) / 100,
      durationMinutes: duration,
      status: values.status,
    };
    if (service) {
      updateService(service.id, draft);
      toast.success('Service updated successfully');
    } else {
      addService(draft);
      toast.success('Service added successfully');
    }
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={service ? 'Edit Service' : 'Add Service'}
      description="Default price and duration are used when booking new jobs"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="service-form">
            {service ? 'Save Changes' : 'Add Service'}
          </Button>
        </>
      }
    >
      <form id="service-form" onSubmit={submit} noValidate>
        <FormGrid>
          <TextField
            label="Service Name"
            required
            value={values.name}
            onChange={(e) => set('name', e.target.value)}
            error={errors.name}
            placeholder="e.g. Window Cleaning"
            className="sm:col-span-2"
          />
          <TextareaField
            label="Description"
            value={values.description}
            onChange={(e) => set('description', e.target.value)}
            placeholder="What's included in this service"
            className="sm:col-span-2"
          />
          <NumberField
            label="Default Price"
            required
            min={0}
            step="0.01"
            prefix={currencySymbol(fmt.currency)}
            value={values.defaultPrice}
            onChange={(e) => set('defaultPrice', e.target.value)}
            error={errors.defaultPrice}
            placeholder="0.00"
          />
          <SelectField label="Status" required value={values.status} onChange={(e) => set('status', e.target.value as ActiveStatus)} options={toOptions(ACTIVE_STATUSES)} />
          <div className="sm:col-span-2">
            <span className="label">
              Estimated Duration<span className="ml-0.5 text-rose-500">*</span>
            </span>
            <div className="grid grid-cols-2 gap-3">
              <NumberField label="Hours" min={0} max={24} step="1" suffix="hrs" value={values.hours} onChange={(e) => set('hours', e.target.value)} className="[&_label]:sr-only" />
              <NumberField label="Minutes" min={0} max={59} step="5" suffix="min" value={values.minutes} onChange={(e) => set('minutes', e.target.value)} className="[&_label]:sr-only" />
            </div>
            {errors.duration && <p className="mt-1.5 text-xs font-medium text-rose-600">{errors.duration}</p>}
          </div>
        </FormGrid>
      </form>
    </Modal>
  );
}
