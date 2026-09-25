import { useCallback, useState, type ReactNode } from 'react';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

interface ConfirmOptions {
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  tone?: 'danger' | 'primary';
  onConfirm: () => void;
}

/** Imperative confirmation dialog: `confirm({...})` and render `dialog`. */
export function useConfirm() {
  const [opts, setOpts] = useState<ConfirmOptions | null>(null);
  const confirm = useCallback((o: ConfirmOptions) => setOpts(o), []);
  const close = () => setOpts(null);
  const dialog = (
    <ConfirmDialog
      open={!!opts}
      title={opts?.title ?? ''}
      message={opts?.message ?? ''}
      confirmLabel={opts?.confirmLabel}
      tone={opts?.tone}
      onCancel={close}
      onConfirm={() => {
        opts?.onConfirm();
        close();
      }}
    />
  );
  return { confirm, dialog };
}
