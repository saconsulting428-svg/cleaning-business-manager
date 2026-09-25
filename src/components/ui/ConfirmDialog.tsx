import type { ReactNode } from 'react';
import { TriangleAlert } from 'lucide-react';
import { Modal } from './Modal';
import { Button } from './Button';

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  tone?: 'danger' | 'primary';
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Delete',
  tone = 'danger',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant={tone === 'danger' ? 'danger' : 'primary'} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="flex gap-4">
        <div
          className={
            tone === 'danger'
              ? 'flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rose-50 text-rose-600'
              : 'flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600'
          }
        >
          <TriangleAlert className="h-5 w-5" />
        </div>
        <div className="text-sm leading-relaxed text-slate-600">{message}</div>
      </div>
    </Modal>
  );
}
