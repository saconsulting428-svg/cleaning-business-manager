import { useMemo, type FormEvent } from 'react';
import type { CleaningJob, Draft, JobPaymentStatus, JobStatus } from '@/types';
import {
  Button,
  FormGrid,
  Modal,
  NumberField,
  SelectField,
  TextareaField,
  TextField,
  toOptions,
  useToast,
} from '@/components/ui';
import { useAppData } from '@/store/AppDataContext';
import { useForm } from '@/hooks/useForm';
import { useFormat } from '@/hooks/useFormat';
import { compact, hasErrors, required } from '@/utils/validation';
import { formatDuration, formatTime, minutesToTime, timeToMinutes, todayISO } from '@/utils/date';
import { currencySymbol } from '@/utils/currency';

export const JOB_STATUSES: JobStatus[] = ['Scheduled', 'In Progress', 'Completed', 'Cancelled'];
export const JOB_PAYMENT_STATUSES: JobPaymentStatus[] = ['Pending', 'Partially Paid', 'Paid'];

interface FormValues {
  customerId: string;
  serviceId: string;
  employeeId: string;
  date: string;
  startTime: string;
  endTime: string;
  price: string;
  status: JobStatus;
  paymentStatus: JobPaymentStatus;
  notes: string;
}

export function JobFormModal({
  open,
  onClose,
  job,
  defaults,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  job?: CleaningJob | null;
  defaults?: Partial<Pick<CleaningJob, 'customerId' | 'date' | 'employeeId'>>;
  onSaved?: (j: CleaningJob) => void;
}) {
  const { data, addJob, updateJob } = useAppData();
  const toast = useToast();
  const fmt = useFormat();

  const { values, set, setValues, errors, setErrors } = useForm<FormValues>(
    () =>
      job
        ? { ...job, price: String(job.price) }
        : {
            customerId: defaults?.customerId ?? '',
            serviceId: '',
            employeeId: defaults?.employeeId ?? '',
            date: defaults?.date ?? todayISO(),
            startTime: '09:00',
            endTime: '11:00',
            price: '',
            status: 'Scheduled',
            paymentStatus: 'Pending',
            notes: '',
          },
    [open, job?.id],
  );

  const linkedInvoice = job ? data.invoices.find((i) => i.jobId === job.id) : undefined;

  const customerOptions = useMemo(
    () =>
      [...data.customers]
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((c) => ({ value: c.id, label: `${c.name} · ${c.type}` })),
    [data.customers],
  );
  const serviceOptions = useMemo(
    () =>
      data.services
        .filter((s) => s.status === 'Active' || s.id === job?.serviceId)
        .map((s) => ({ value: s.id, label: `${s.name} — ${fmt.money(s.defaultPrice)}` })),
    [data.services, job?.serviceId, fmt],
  );
  const employeeOptions = useMemo(
    () =>
      data.employees
        .filter((e) => e.status === 'Active' || e.id === job?.employeeId)
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((e) => ({ value: e.id, label: `${e.name} (${e.role})` })),
    [data.employees, job?.employeeId],
  );

  // Pre-fill price and end time from the selected service's defaults.
  const onServiceChange = (serviceId: string) => {
    const s = data.services.find((x) => x.id === serviceId);
    setValues((v) => ({
      ...v,
      serviceId,
      price: s ? String(s.defaultPrice) : v.price,
      endTime: s ? minutesToTime(timeToMinutes(v.startTime) + s.durationMinutes) : v.endTime,
    }));
    setErrors((e) => ({ ...e, serviceId: '', price: '', endTime: '' }));
  };

  const onStartChange = (startTime: string) => {
    const s = data.services.find((x) => x.id === values.serviceId);
    const duration = s?.durationMinutes ?? Math.max(30, timeToMinutes(values.endTime) - timeToMinutes(values.startTime));
    setValues((v) => ({ ...v, startTime, endTime: startTime ? minutesToTime(timeToMinutes(startTime) + duration) : v.endTime }));
  };

  // Non-blocking warning when the employee already has a job overlapping this slot.
  const conflict = useMemo(() => {
    if (!values.employeeId || !values.date || !values.startTime || !values.endTime) return null;
    const start = timeToMinutes(values.startTime);
    const end = timeToMinutes(values.endTime);
    return data.jobs.find(
      (j) =>
        j.id !== job?.id &&
        j.employeeId === values.employeeId &&
        j.date === values.date &&
        j.status !== 'Cancelled' &&
        timeToMinutes(j.startTime) < end &&
        timeToMinutes(j.endTime) > start,
    );
  }, [values.employeeId, values.date, values.startTime, values.endTime, data.jobs, job?.id]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const price = Number(values.price);
    const errs = compact({
      customerId: required(values.customerId, 'Customer'),
      serviceId: required(values.serviceId, 'Service'),
      date: required(values.date, 'Date'),
      startTime: required(values.startTime, 'Start time'),
      endTime:
        required(values.endTime, 'End time') ??
        (values.startTime && timeToMinutes(values.endTime) <= timeToMinutes(values.startTime)
          ? 'End time must be after start time'
          : undefined),
      price: values.price === '' ? 'Price is required' : !Number.isFinite(price) || price < 0 ? 'Enter a valid price' : undefined,
    });
    if (hasErrors(errs)) return setErrors(errs);

    const draft: Draft<CleaningJob> = {
      customerId: values.customerId,
      serviceId: values.serviceId,
      employeeId: values.employeeId,
      date: values.date,
      startTime: values.startTime,
      endTime: values.endTime,
      price: Math.round(price * 100) / 100,
      status: values.status,
      paymentStatus: values.paymentStatus,
      notes: values.notes.trim(),
    };
    if (job) {
      updateJob(job.id, draft);
      toast.success('Cleaning job updated successfully');
      onSaved?.({ ...job, ...draft });
    } else {
      const created = addJob(draft);
      toast.success('Cleaning job added successfully');
      onSaved?.(created);
    }
    onClose();
  };

  const noCustomers = data.customers.length === 0;
  const noServices = serviceOptions.length === 0;
  const selectedService = data.services.find((s) => s.id === values.serviceId);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={job ? `Edit Job ${job.number}` : 'Add Cleaning Job'}
      description={job ? 'Update the job details, assignment or status' : 'Book a cleaning job and assign a team member'}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="job-form">
            {job ? 'Save Changes' : 'Add Job'}
          </Button>
        </>
      }
    >
      <form id="job-form" onSubmit={submit} noValidate>
        {(noCustomers || noServices) && (
          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {noCustomers && <p>Add a customer first — every job needs a customer.</p>}
            {noServices && <p>Add an active service first — every job needs a service.</p>}
          </div>
        )}
        <FormGrid>
          <SelectField
            label="Customer"
            required
            value={values.customerId}
            onChange={(e) => set('customerId', e.target.value)}
            options={customerOptions}
            placeholder="Select a customer"
            error={errors.customerId}
          />
          <SelectField
            label="Service"
            required
            value={values.serviceId}
            onChange={(e) => onServiceChange(e.target.value)}
            options={serviceOptions}
            placeholder="Select a service"
            error={errors.serviceId}
            hint={selectedService ? `Estimated duration: ${formatDuration(selectedService.durationMinutes)}` : undefined}
          />
          <TextField
            label="Date"
            required
            type="date"
            value={values.date}
            onChange={(e) => set('date', e.target.value)}
            error={errors.date}
          />
          <div className="grid grid-cols-2 gap-3">
            <TextField
              label="Start Time"
              required
              type="time"
              value={values.startTime}
              onChange={(e) => onStartChange(e.target.value)}
              error={errors.startTime}
            />
            <TextField
              label="End Time"
              required
              type="time"
              value={values.endTime}
              onChange={(e) => set('endTime', e.target.value)}
              error={errors.endTime}
            />
          </div>
          <SelectField
            label="Assigned Employee"
            value={values.employeeId}
            onChange={(e) => set('employeeId', e.target.value)}
            options={employeeOptions}
            placeholder="Unassigned"
            hint={
              conflict ? (
                <span className="font-medium text-amber-700">
                  Already booked {formatTime(conflict.startTime)}–{formatTime(conflict.endTime)} on this date ({conflict.number}).
                </span>
              ) : undefined
            }
          />
          <NumberField
            label="Price"
            required
            min={0}
            step="0.01"
            prefix={currencySymbol(fmt.currency)}
            value={values.price}
            onChange={(e) => set('price', e.target.value)}
            error={errors.price}
            placeholder="0.00"
          />
          <SelectField
            label="Job Status"
            required
            value={values.status}
            onChange={(e) => set('status', e.target.value as JobStatus)}
            options={toOptions(JOB_STATUSES)}
          />
          <SelectField
            label="Payment Status"
            required
            value={values.paymentStatus}
            onChange={(e) => set('paymentStatus', e.target.value as JobPaymentStatus)}
            options={toOptions(JOB_PAYMENT_STATUSES)}
            disabled={!!linkedInvoice}
            hint={linkedInvoice ? `Updated automatically from invoice ${linkedInvoice.number}` : undefined}
          />
          <TextareaField
            label="Notes"
            value={values.notes}
            onChange={(e) => set('notes', e.target.value)}
            placeholder="Special instructions for the cleaner…"
            className="sm:col-span-2"
          />
        </FormGrid>
      </form>
    </Modal>
  );
}
