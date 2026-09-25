import { useMemo, useState } from 'react';
import { Clock, Pencil, Plus, SprayCan, Trash2 } from 'lucide-react';
import type { Service } from '@/types';
import { Button, Card, EmptyState, IconButton, PageHeader, SearchInput, StatusBadge, useToast } from '@/components/ui';
import { useAppData } from '@/store/AppDataContext';
import { useFormat } from '@/hooks/useFormat';
import { useConfirm } from '@/hooks/useConfirm';
import { formatDuration } from '@/utils/date';
import { includesText } from '@/utils/format';
import { isCompleted } from '@/utils/calc';
import { ServiceFormModal } from '@/features/services/ServiceFormModal';

export function ServicesPage() {
  const { data, deleteService, updateService } = useAppData();
  const fmt = useFormat();
  const toast = useToast();
  const { confirm, dialog } = useConfirm();
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Service | null>(null);

  const stats = useMemo(() => {
    const m = new Map<string, { jobs: number; revenue: number }>();
    for (const j of data.jobs) {
      const s = m.get(j.serviceId) ?? { jobs: 0, revenue: 0 };
      s.jobs += 1;
      if (isCompleted(j)) s.revenue += j.price;
      m.set(j.serviceId, s);
    }
    return m;
  }, [data.jobs]);

  const services = data.services.filter((s) => includesText([s.name, s.description], search));

  const openForm = (s: Service | null) => {
    setEditing(s);
    setFormOpen(true);
  };

  const remove = (s: Service) => {
    const used = stats.get(s.id)?.jobs ?? 0;
    if (used > 0) {
      confirm({
        title: 'Service is in use',
        message: (
          <>
            <strong>{s.name}</strong> is used by {used} cleaning job{used === 1 ? '' : 's'} and can't be deleted without losing job history.
            {s.status === 'Active' ? ' You can set it to Inactive so it is no longer offered for new jobs.' : ' It is already inactive.'}
          </>
        ),
        confirmLabel: s.status === 'Active' ? 'Set Inactive' : 'OK',
        tone: 'primary',
        onConfirm: () => {
          if (s.status === 'Active') {
            updateService(s.id, { ...s, status: 'Inactive' });
            toast.success(`${s.name} set to Inactive`);
          }
        },
      });
      return;
    }
    confirm({
      title: 'Delete service?',
      message: (
        <>
          <strong>{s.name}</strong> will be permanently deleted.
        </>
      ),
      onConfirm: () => {
        deleteService(s.id);
        toast.success('Service deleted successfully');
      },
    });
  };

  return (
    <div>
      <PageHeader
        title="Services"
        description="Cleaning services you offer, with default pricing and duration"
        actions={
          <Button icon={<Plus className="h-4 w-4" />} onClick={() => openForm(null)}>
            Add Service
          </Button>
        }
      />

      {data.services.length > 0 && (
        <div className="mb-5">
          <SearchInput value={search} onChange={setSearch} placeholder="Search services…" />
        </div>
      )}

      {data.services.length === 0 ? (
        <Card>
          <EmptyState
            icon={<SprayCan className="h-6 w-6" />}
            title="No services yet"
            description="Add the cleaning services you offer so they can be booked as jobs."
            action={
              <Button icon={<Plus className="h-4 w-4" />} onClick={() => openForm(null)}>
                Add Service
              </Button>
            }
          />
        </Card>
      ) : services.length === 0 ? (
        <Card>
          <EmptyState title="No matching services" description="Try a different search term." />
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {services.map((s) => {
            const st = stats.get(s.id) ?? { jobs: 0, revenue: 0 };
            return (
              <Card key={s.id} className="flex flex-col p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                    <SprayCan className="h-5 w-5" />
                  </div>
                  <div className="flex items-center gap-1">
                    <StatusBadge status={s.status} />
                    <IconButton label="Edit service" onClick={() => openForm(s)}>
                      <Pencil className="h-4 w-4" />
                    </IconButton>
                    <IconButton label="Delete service" tone="danger" onClick={() => remove(s)}>
                      <Trash2 className="h-4 w-4" />
                    </IconButton>
                  </div>
                </div>
                <h3 className="mt-4 font-semibold text-slate-900">{s.name}</h3>
                <p className="mt-1 line-clamp-3 flex-1 text-sm text-slate-500">{s.description || 'No description'}</p>
                <div className="mt-4 flex items-end justify-between border-t border-slate-100 pt-4">
                  <div>
                    <p className="text-xl font-semibold tabular-nums text-slate-900">{fmt.money(s.defaultPrice)}</p>
                    <p className="mt-0.5 inline-flex items-center gap-1 text-xs text-slate-500">
                      <Clock className="h-3.5 w-3.5" /> {formatDuration(s.durationMinutes)}
                    </p>
                  </div>
                  <div className="text-right text-xs text-slate-500">
                    <p>
                      <span className="font-semibold text-slate-700">{st.jobs}</span> jobs
                    </p>
                    <p>{fmt.money(st.revenue)} revenue</p>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <ServiceFormModal open={formOpen} onClose={() => setFormOpen(false)} service={editing} />
      {dialog}
    </div>
  );
}
