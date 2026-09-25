import { useState } from 'react';
import { CalendarDays, CircleCheck, CircleX, Clock, FilePlus, FileText, MapPin, Pencil, Play, RotateCcw, Trash2, User } from 'lucide-react';
import type { JobStatus } from '@/types';
import { Button, DetailItem, Modal, StatusBadge, useToast } from '@/components/ui';
import { useAppData } from '@/store/AppDataContext';
import { useFormat } from '@/hooks/useFormat';
import { useLookups } from '@/hooks/useLookups';
import { useConfirm } from '@/hooks/useConfirm';
import { formatDuration, formatTime, relativeDayLabel, timeToMinutes } from '@/utils/date';
import { JobFormModal } from './JobFormModal';
import { InvoiceFormModal } from '@/features/invoices/InvoiceFormModal';
import { InvoiceViewModal } from '@/features/invoices/InvoiceViewModal';

type Child = 'edit' | 'invoice' | 'viewInvoice' | null;

/** Self-contained job details with status changes, editing, invoicing and deletion. */
export function JobDetailModal({ jobId, onClose }: { jobId: string | null; onClose: () => void }) {
  const { data, setJobStatus, deleteJob } = useAppData();
  const fmt = useFormat();
  const lookups = useLookups();
  const toast = useToast();
  const { confirm, dialog } = useConfirm();
  const [child, setChild] = useState<Child>(null);

  const job = jobId ? data.jobs.find((j) => j.id === jobId) ?? null : null;
  const invoice = job ? data.invoices.find((i) => i.jobId === job.id) : undefined;
  const customer = job ? lookups.customers.get(job.customerId) : undefined;

  const changeStatus = (status: JobStatus) => {
    if (!job) return;
    setJobStatus(job.id, status);
    toast.success(`Job ${job.number} marked as ${status}`);
  };

  const remove = () => {
    if (!job) return;
    confirm({
      title: 'Delete cleaning job?',
      message: (
        <>
          <strong>{job.number}</strong> for {customer?.name ?? 'this customer'} will be permanently deleted.
          {invoice && <> Invoice {invoice.number} will be kept but no longer linked to a job.</>}
        </>
      ),
      onConfirm: () => {
        deleteJob(job.id);
        toast.success('Cleaning job deleted successfully');
        onClose();
      },
    });
  };

  const rel = job ? relativeDayLabel(job.date) : null;
  const duration = job ? timeToMinutes(job.endTime) - timeToMinutes(job.startTime) : 0;

  return (
    <>
      <Modal
        open={!!job && child === null}
        onClose={onClose}
        title={job ? `Job ${job.number}` : ''}
        description={job ? lookups.serviceName(job.serviceId) : undefined}
        size="lg"
        footer={
          job && (
            <>
              <Button variant="ghost" className="text-rose-600 hover:bg-rose-50 hover:text-rose-700 sm:mr-auto" icon={<Trash2 className="h-4 w-4" />} onClick={remove}>
                Delete
              </Button>
              {invoice ? (
                <Button variant="secondary" icon={<FileText className="h-4 w-4" />} onClick={() => setChild('viewInvoice')}>
                  View Invoice
                </Button>
              ) : (
                job.status !== 'Cancelled' && (
                  <Button variant="secondary" icon={<FilePlus className="h-4 w-4" />} onClick={() => setChild('invoice')}>
                    Create Invoice
                  </Button>
                )
              )}
              <Button icon={<Pencil className="h-4 w-4" />} onClick={() => setChild('edit')}>
                Edit Job
              </Button>
            </>
          )
        }
      >
        {job && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={job.status} />
              <StatusBadge status={job.paymentStatus} />
              {rel && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">{rel}</span>}
            </div>

            <dl className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <DetailItem label="Customer">
                <p className="font-medium text-slate-900">{customer?.name ?? 'Removed customer'}</p>
                {customer && (
                  <p className="mt-0.5 flex items-start gap-1 text-xs text-slate-500">
                    <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    {customer.address}, {customer.city}
                  </p>
                )}
              </DetailItem>
              <DetailItem label="Assigned Employee">
                <span className="inline-flex items-center gap-1.5">
                  <User className="h-4 w-4 text-slate-400" />
                  {lookups.employeeName(job.employeeId)}
                </span>
              </DetailItem>
              <DetailItem label="Date">
                <span className="inline-flex items-center gap-1.5">
                  <CalendarDays className="h-4 w-4 text-slate-400" />
                  {fmt.date(job.date)}
                </span>
              </DetailItem>
              <DetailItem label="Time">
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="h-4 w-4 text-slate-400" />
                  {formatTime(job.startTime)} – {formatTime(job.endTime)}
                  <span className="text-slate-400">({formatDuration(duration)})</span>
                </span>
              </DetailItem>
              <DetailItem label="Price">
                <span className="text-base font-semibold text-slate-900">{fmt.money(job.price)}</span>
              </DetailItem>
              <DetailItem label="Invoice">{invoice ? invoice.number : <span className="text-slate-400">Not invoiced yet</span>}</DetailItem>
              {job.notes && (
                <DetailItem label="Notes" className="sm:col-span-2">
                  <p className="whitespace-pre-line rounded-lg bg-slate-50 px-3 py-2 text-slate-600">{job.notes}</p>
                </DetailItem>
              )}
              {customer?.notes && (
                <DetailItem label="Customer Notes" className="sm:col-span-2">
                  <p className="whitespace-pre-line rounded-lg bg-amber-50/60 px-3 py-2 text-slate-600">{customer.notes}</p>
                </DetailItem>
              )}
            </dl>

            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">Update Status</p>
              <div className="flex flex-wrap gap-2">
                {job.status === 'Scheduled' && (
                  <Button size="sm" variant="secondary" icon={<Play className="h-3.5 w-3.5" />} onClick={() => changeStatus('In Progress')}>
                    Start Job
                  </Button>
                )}
                {(job.status === 'Scheduled' || job.status === 'In Progress') && (
                  <>
                    <Button size="sm" variant="success" icon={<CircleCheck className="h-3.5 w-3.5" />} onClick={() => changeStatus('Completed')}>
                      Mark Completed
                    </Button>
                    <Button size="sm" variant="secondary" icon={<CircleX className="h-3.5 w-3.5" />} onClick={() => changeStatus('Cancelled')}>
                      Cancel Job
                    </Button>
                  </>
                )}
                {(job.status === 'Completed' || job.status === 'Cancelled') && (
                  <Button size="sm" variant="secondary" icon={<RotateCcw className="h-3.5 w-3.5" />} onClick={() => changeStatus('Scheduled')}>
                    Reopen as Scheduled
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>

      <JobFormModal open={child === 'edit'} onClose={() => setChild(null)} job={job} />
      <InvoiceFormModal
        open={child === 'invoice'}
        onClose={() => setChild(null)}
        defaults={{ jobId: job?.id }}
        onSaved={() => setChild(null)}
      />
      <InvoiceViewModal invoiceId={child === 'viewInvoice' ? invoice?.id ?? null : null} onClose={() => setChild(null)} />
      {dialog}
    </>
  );
}
