import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '@/utils/cn';

const sizes = {
  sm: 'sm:max-w-md',
  md: 'sm:max-w-lg',
  lg: 'sm:max-w-2xl',
  xl: 'sm:max-w-4xl',
};

/** Open modals, top-most last. */
const openStack: symbol[] = [];

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  size?: keyof typeof sizes;
  children: ReactNode;
  footer?: ReactNode;
  /** Extra classes for the scrollable body. */
  bodyClassName?: string;
}

export function Modal({ open, onClose, title, description, size = 'md', children, footer, bodyClassName }: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const token = Symbol('modal');
    openStack.push(token);
    const onKey = (e: KeyboardEvent) => {
      // Only the top-most modal reacts to Escape.
      if (e.key === 'Escape' && openStack[openStack.length - 1] === token) onCloseRef.current();
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    // Focus the first form control for fast data entry.
    const t = window.setTimeout(() => {
      const el = panelRef.current?.querySelector<HTMLElement>('input:not([type=hidden]):not([disabled]), select, textarea');
      (el ?? panelRef.current)?.focus({ preventScroll: true });
    }, 30);
    return () => {
      document.removeEventListener('keydown', onKey);
      openStack.splice(openStack.indexOf(token), 1);
      if (openStack.length === 0) document.body.style.overflow = '';
      window.clearTimeout(t);
    };
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4" role="dialog" aria-modal="true">
      <div className="no-print absolute inset-0 animate-fade-in bg-slate-900/50 backdrop-blur-[2px]" onClick={onClose} />
      <div
        ref={panelRef}
        tabIndex={-1}
        className={cn(
          'print-container relative flex max-h-[92vh] w-full animate-scale-in flex-col rounded-t-2xl bg-white shadow-pop outline-none sm:rounded-2xl',
          sizes[size],
        )}
      >
        <div className="no-print flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4 sm:px-6">
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-slate-900">{title}</h2>
            {description && <p className="mt-0.5 text-sm text-slate-500">{description}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="-mr-1 rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className={cn('flex-1 overflow-y-auto px-5 py-5 sm:px-6', bodyClassName)}>{children}</div>
        {footer && (
          <div className="no-print flex flex-col-reverse gap-2 border-t border-slate-100 bg-slate-50/60 px-5 py-3.5 sm:flex-row sm:justify-end sm:px-6 sm:rounded-b-2xl">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
