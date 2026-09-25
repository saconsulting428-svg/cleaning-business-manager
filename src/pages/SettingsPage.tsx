import { useState, type FormEvent } from 'react';
import { Building2, Database, RotateCcw, Save, SlidersHorizontal, Trash2 } from 'lucide-react';
import type { BusinessSettings, CurrencyCode, DateFormat } from '@/types';
import { Button, Card, CardHeader, FormGrid, NumberField, SelectField, TextField, useToast } from '@/components/ui';
import { useAppData } from '@/store/AppDataContext';
import { useForm } from '@/hooks/useForm';
import { useConfirm } from '@/hooks/useConfirm';
import { compact, hasErrors, isEmail, isPhone, required } from '@/utils/validation';
import { CURRENCIES } from '@/utils/currency';
import { formatDate, todayISO } from '@/utils/date';
import { formatMoney } from '@/utils/format';
import { STORAGE_KEY } from '@/store/storage';

const DATE_FORMATS: DateFormat[] = ['MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD', 'MMM D, YYYY'];

type FormValues = Omit<BusinessSettings, 'defaultTaxRate' | 'paymentTermsDays'> & { defaultTaxRate: string; paymentTermsDays: string };

export function SettingsPage() {
  const { data, updateSettings, resetAllData, restoreStarterData } = useAppData();
  const toast = useToast();
  const { confirm, dialog } = useConfirm();
  const [resetText, setResetText] = useState('');

  const { values, set, errors, setErrors } = useForm<FormValues>(
    () => ({
      ...data.settings,
      defaultTaxRate: String(data.settings.defaultTaxRate),
      paymentTermsDays: String(data.settings.paymentTermsDays),
    }),
    [data.settings],
  );

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const tax = Number(values.defaultTaxRate);
    const terms = Number(values.paymentTermsDays);
    const errs = compact({
      businessName: required(values.businessName, 'Business name'),
      phone: values.phone.trim() && !isPhone(values.phone) ? 'Enter a valid phone number' : undefined,
      email: values.email.trim() && !isEmail(values.email) ? 'Enter a valid email address' : undefined,
      defaultTaxRate: values.defaultTaxRate === '' || !Number.isFinite(tax) || tax < 0 || tax > 100 ? 'Enter a tax rate between 0 and 100' : undefined,
      paymentTermsDays:
        values.paymentTermsDays === '' || !Number.isInteger(terms) || terms < 0 || terms > 365 ? 'Enter a whole number of days (0–365)' : undefined,
    });
    if (hasErrors(errs)) return setErrors(errs);
    updateSettings({
      businessName: values.businessName.trim(),
      phone: values.phone.trim(),
      email: values.email.trim(),
      address: values.address.trim(),
      website: values.website.trim(),
      currency: values.currency,
      dateFormat: values.dateFormat,
      defaultTaxRate: tax,
      paymentTermsDays: terms,
    });
    toast.success('Settings saved successfully');
  };

  const counts = [
    ['Customers', data.customers.length],
    ['Employees', data.employees.length],
    ['Services', data.services.length],
    ['Cleaning jobs', data.jobs.length],
    ['Invoices', data.invoices.length],
    ['Payments', data.payments.length],
  ] as const;

  const reset = () =>
    confirm({
      title: 'Reset all application data?',
      message: (
        <>
          This permanently deletes <strong>all customers, employees, services, jobs, invoices, payments and settings</strong> stored in this
          browser. The application will start with a blank workspace. This cannot be undone.
        </>
      ),
      confirmLabel: 'Delete Everything',
      onConfirm: () => {
        resetAllData();
        setResetText('');
        toast.success('All application data has been reset');
      },
    });

  const restore = () =>
    confirm({
      title: 'Load starter business data?',
      message: 'This replaces all current records and settings with the starter set of customers, team members, services, jobs, invoices and payments.',
      confirmLabel: 'Replace Data',
      tone: 'primary',
      onConfirm: () => {
        restoreStarterData();
        toast.success('Starter business data loaded');
      },
    });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">Settings</h1>
        <p className="mt-1 text-sm text-slate-500">Business details appear on invoices. Preferences apply across the app.</p>
      </div>

      <form onSubmit={submit} noValidate className="space-y-6">
        <Card>
          <CardHeader title={<span className="inline-flex items-center gap-2"><Building2 className="h-4 w-4 text-brand-600" /> Business Information</span>} description="Shown on printed invoices" />
          <div className="p-5">
            <FormGrid>
              <TextField label="Business Name" required value={values.businessName} onChange={(e) => set('businessName', e.target.value)} error={errors.businessName} className="sm:col-span-2" />
              <TextField label="Phone" type="tel" value={values.phone} onChange={(e) => set('phone', e.target.value)} error={errors.phone} />
              <TextField label="Email" type="email" value={values.email} onChange={(e) => set('email', e.target.value)} error={errors.email} />
              <TextField label="Address" value={values.address} onChange={(e) => set('address', e.target.value)} className="sm:col-span-2" />
              <TextField label="Website" value={values.website} onChange={(e) => set('website', e.target.value)} placeholder="www.example.com" />
            </FormGrid>
          </div>
        </Card>

        <Card>
          <CardHeader title={<span className="inline-flex items-center gap-2"><SlidersHorizontal className="h-4 w-4 text-brand-600" /> Application Preferences</span>} description="Currency, date format and invoice defaults" />
          <div className="p-5">
            <FormGrid className="lg:grid-cols-4">
              <SelectField
                label="Currency"
                value={values.currency}
                onChange={(e) => set('currency', e.target.value as CurrencyCode)}
                options={CURRENCIES.map((c) => ({ value: c.code, label: `${c.code} — ${c.name}` }))}
                hint={`Example: ${formatMoney(1234.5, values.currency)}`}
              />
              <SelectField
                label="Date Format"
                value={values.dateFormat}
                onChange={(e) => set('dateFormat', e.target.value as DateFormat)}
                options={DATE_FORMATS.map((f) => ({ value: f, label: f }))}
                hint={`Today: ${formatDate(todayISO(), values.dateFormat)}`}
              />
              <NumberField label="Default Tax Rate" min={0} max={100} step="0.01" suffix="%" value={values.defaultTaxRate} onChange={(e) => set('defaultTaxRate', e.target.value)} error={errors.defaultTaxRate} />
              <NumberField label="Payment Terms" min={0} max={365} step="1" suffix="days" value={values.paymentTermsDays} onChange={(e) => set('paymentTermsDays', e.target.value)} error={errors.paymentTermsDays} hint="Due date for new invoices" />
            </FormGrid>
          </div>
          <div className="flex justify-end border-t border-slate-100 bg-slate-50/60 px-5 py-3.5 sm:rounded-b-xl">
            <Button type="submit" icon={<Save className="h-4 w-4" />}>
              Save Settings
            </Button>
          </div>
        </Card>
      </form>

      <Card>
        <CardHeader
          title={<span className="inline-flex items-center gap-2"><Database className="h-4 w-4 text-brand-600" /> Data Storage</span>}
          description={
            <>
              All data is stored in this browser's localStorage under the key <code className="rounded bg-slate-100 px-1">{STORAGE_KEY}</code>.
            </>
          }
        />
        <div className="grid grid-cols-2 gap-3 p-5 sm:grid-cols-3 lg:grid-cols-6">
          {counts.map(([label, n]) => (
            <div key={label} className="rounded-xl border border-slate-200 px-4 py-3">
              <p className="text-xs text-slate-500">{label}</p>
              <p className="mt-0.5 text-lg font-semibold tabular-nums text-slate-900">{n}</p>
            </div>
          ))}
        </div>
        <div className="flex flex-col gap-3 border-t border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-600">Replace everything with the starter set of business records.</p>
          <Button variant="secondary" icon={<RotateCcw className="h-4 w-4" />} onClick={restore}>
            Load Starter Data
          </Button>
        </div>
      </Card>

      <Card className="border-rose-200">
        <CardHeader title={<span className="text-rose-700">Danger Zone</span>} description="Irreversible actions" className="border-rose-100" />
        <div className="flex flex-col gap-4 p-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-xl">
            <p className="text-sm font-medium text-slate-900">Reset Application Data</p>
            <p className="mt-1 text-sm text-slate-500">
              Permanently deletes every record and setting stored by CleanPro in this browser. Type <strong>RESET</strong> to enable the button.
            </p>
            <input
              value={resetText}
              onChange={(e) => setResetText(e.target.value)}
              placeholder="Type RESET"
              aria-label="Type RESET to confirm"
              className="input mt-3 max-w-[200px]"
            />
          </div>
          <Button variant="danger" icon={<Trash2 className="h-4 w-4" />} disabled={resetText.trim().toUpperCase() !== 'RESET'} onClick={reset}>
            Reset Application Data
          </Button>
        </div>
      </Card>
      {dialog}
    </div>
  );
}
