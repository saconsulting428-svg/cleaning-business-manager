import { useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { cn } from '@/utils/cn';

interface FieldShellProps {
  label: string;
  error?: string;
  hint?: ReactNode;
  required?: boolean;
  className?: string;
  children: (id: string, describedBy: string | undefined) => ReactNode;
}

/** Label + control + hint/error, shared by every form field. */
export function Field({ label, error, hint, required, className, children }: FieldShellProps) {
  const id = useId();
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  return (
    <div className={className}>
      <label htmlFor={id} className="label">
        {label}
        {required && <span className="ml-0.5 text-rose-500">*</span>}
      </label>
      {children(id, describedBy)}
      {error ? (
        <p id={`${id}-error`} className="mt-1.5 text-xs font-medium text-rose-600">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="mt-1.5 text-xs text-slate-500">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

type Common = { label: string; error?: string; hint?: ReactNode; className?: string };

export function TextField({ label, error, hint, className, required, ...rest }: Common & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <Field label={label} error={error} hint={hint} required={required} className={className}>
      {(id, describedBy) => (
        <input
          id={id}
          aria-invalid={!!error}
          aria-describedby={describedBy}
          className={cn('input', error && 'input-error')}
          {...rest}
        />
      )}
    </Field>
  );
}

/** Numeric input with an optional leading/trailing adornment (e.g. currency symbol, %). */
export function NumberField({
  label,
  error,
  hint,
  className,
  required,
  prefix,
  suffix,
  ...rest
}: Common & InputHTMLAttributes<HTMLInputElement> & { prefix?: string; suffix?: string }) {
  return (
    <Field label={label} error={error} hint={hint} required={required} className={className}>
      {(id, describedBy) => (
        <div className="relative">
          {prefix && (
            <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-sm text-slate-400">
              {prefix}
            </span>
          )}
          <input
            id={id}
            type="number"
            inputMode="decimal"
            aria-invalid={!!error}
            aria-describedby={describedBy}
            className={cn('input', prefix && (prefix.length > 1 ? 'pl-12' : 'pl-8'), suffix && 'pr-12', error && 'input-error')}
            {...rest}
          />
          {suffix && (
            <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-sm text-slate-400">
              {suffix}
            </span>
          )}
        </div>
      )}
    </Field>
  );
}

export interface Option {
  value: string;
  label: string;
}

export function SelectField({
  label,
  error,
  hint,
  className,
  required,
  options,
  placeholder,
  ...rest
}: Common & SelectHTMLAttributes<HTMLSelectElement> & { options: Option[]; placeholder?: string }) {
  return (
    <Field label={label} error={error} hint={hint} required={required} className={className}>
      {(id, describedBy) => (
        <select
          id={id}
          aria-invalid={!!error}
          aria-describedby={describedBy}
          className={cn('input pr-8', error && 'input-error')}
          {...rest}
        >
          {placeholder !== undefined && <option value="">{placeholder}</option>}
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      )}
    </Field>
  );
}

export function TextareaField({ label, error, hint, className, required, ...rest }: Common & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <Field label={label} error={error} hint={hint} required={required} className={className}>
      {(id, describedBy) => (
        <textarea
          id={id}
          rows={3}
          aria-invalid={!!error}
          aria-describedby={describedBy}
          className={cn('input resize-y', error && 'input-error')}
          {...rest}
        />
      )}
    </Field>
  );
}

/** Two-column responsive grid for forms. */
export function FormGrid({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('grid grid-cols-1 gap-4 sm:grid-cols-2', className)}>{children}</div>;
}

export const toOptions = <T extends string>(values: readonly T[]): Option[] => values.map((v) => ({ value: v, label: v }));
