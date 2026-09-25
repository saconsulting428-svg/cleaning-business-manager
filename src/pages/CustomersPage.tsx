import { useMemo, useState } from 'react';
import { Eye, Pencil, Trash2, UserPlus, Users } from 'lucide-react';
import type { Customer } from '@/types';
import { Button, Card, DataTable, EmptyState, FilterSelect, IconButton, PageHeader, SearchInput, StatusBadge, Toolbar, useToast, type Column } from '@/components/ui';
import { useAppData } from '@/store/AppDataContext';
import { useFormat } from '@/hooks/useFormat';
import { useConfirm } from '@/hooks/useConfirm';
import { customerStats, type CustomerStats } from '@/utils/calc';
import { includesText } from '@/utils/format';
import { CUSTOMER_TYPES, CustomerFormModal } from '@/features/customers/CustomerFormModal';
import { CustomerDetailModal } from '@/features/customers/CustomerDetailModal';

type Row = Customer & { stats: CustomerStats };

export function CustomersPage() {
  const { data, deleteCustomer } = useAppData();
  const fmt = useFormat();
  const toast = useToast();
  const { confirm, dialog } = useConfirm();
  const [search, setSearch] = useState('');
  const [type, setType] = useState('all');
  const [editing, setEditing] = useState<Customer | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [viewId, setViewId] = useState<string | null>(null);

  const rows = useMemo<Row[]>(
    () =>
      data.customers
        .filter((c) => (type === 'all' || c.type === type) && includesText([c.name, c.phone, c.email, c.address, c.city], search))
        .map((c) => ({ ...c, stats: customerStats(c, data) })),
    [data, search, type],
  );

  const openForm = (c: Customer | null) => {
    setEditing(c);
    setFormOpen(true);
  };

  const remove = (c: Customer) => {
    const jobs = data.jobs.filter((j) => j.customerId === c.id).length;
    const invoices = data.invoices.filter((i) => i.customerId === c.id).length;
    const payments = data.payments.filter((p) => p.customerId === c.id).length;
    confirm({
      title: 'Delete customer?',
      message: (
        <>
          <strong>{c.name}</strong> will be permanently deleted
          {jobs + invoices + payments > 0 ? (
            <>
              {' '}together with {jobs} job{jobs === 1 ? '' : 's'}, {invoices} invoice{invoices === 1 ? '' : 's'} and {payments} payment
              {payments === 1 ? '' : 's'}.
            </>
          ) : (
            '.'
          )}{' '}
          This cannot be undone.
        </>
      ),
      onConfirm: () => {
        deleteCustomer(c.id);
        toast.success('Customer deleted successfully');
      },
    });
  };

  const columns: Column<Row>[] = [
    {
      key: 'name',
      header: 'Name',
      mobile: 'title',
      sortValue: (r) => r.name,
      cell: (r) => <span className="font-medium text-slate-900">{r.name}</span>,
    },
    { key: 'type', header: 'Type', mobile: 'badge', sortValue: (r) => r.type, cell: (r) => <StatusBadge status={r.type} /> },
    { key: 'phone', header: 'Phone', cell: (r) => r.phone },
    { key: 'email', header: 'Email', cell: (r) => r.email || <span className="text-slate-400">—</span> },
    {
      key: 'address',
      header: 'Address',
      mobile: 'subtitle',
      sortValue: (r) => r.city,
      cell: (r) => (
        <span className="block max-w-[240px] truncate" title={`${r.address}, ${r.city}`}>
          {r.address}, {r.city}
        </span>
      ),
    },
    { key: 'jobs', header: 'Total Jobs', align: 'right', sortValue: (r) => r.stats.totalJobs, cell: (r) => r.stats.totalJobs },
    {
      key: 'revenue',
      header: 'Total Revenue',
      align: 'right',
      sortValue: (r) => r.stats.revenue,
      cell: (r) => <span className="font-medium tabular-nums text-slate-900">{fmt.money(r.stats.revenue)}</span>,
    },
  ];

  return (
    <div>
      <PageHeader
        title="Customers"
        description={`${data.customers.length} customers · ${data.customers.filter((c) => c.type === 'Commercial').length} commercial`}
        actions={
          <Button icon={<UserPlus className="h-4 w-4" />} onClick={() => openForm(null)}>
            Add Customer
          </Button>
        }
      />
      <Card>
        <Toolbar>
          <SearchInput value={search} onChange={setSearch} placeholder="Search name, phone, email, address…" />
          <FilterSelect
            label="Filter by customer type"
            value={type}
            onChange={setType}
            options={[{ value: 'all', label: 'All types' }, ...CUSTOMER_TYPES.map((t) => ({ value: t, label: t }))]}
          />
        </Toolbar>
        <DataTable
          columns={columns}
          rows={rows}
          rowKey={(r) => r.id}
          onRowClick={(r) => setViewId(r.id)}
          initialSort={{ key: 'name', dir: 'asc' }}
          actions={(r) => (
            <>
              <IconButton label="View details" onClick={() => setViewId(r.id)}>
                <Eye className="h-4 w-4" />
              </IconButton>
              <IconButton label="Edit customer" onClick={() => openForm(r)}>
                <Pencil className="h-4 w-4" />
              </IconButton>
              <IconButton label="Delete customer" tone="danger" onClick={() => remove(r)}>
                <Trash2 className="h-4 w-4" />
              </IconButton>
            </>
          )}
          empty={
            data.customers.length === 0 ? (
              <EmptyState
                icon={<Users className="h-6 w-6" />}
                title="No customers yet"
                description="Add your first customer to start booking cleaning jobs."
                action={
                  <Button icon={<UserPlus className="h-4 w-4" />} onClick={() => openForm(null)}>
                    Add Customer
                  </Button>
                }
              />
            ) : (
              <EmptyState title="No matching customers" description="Try a different search term or filter." />
            )
          }
        />
      </Card>

      <CustomerFormModal open={formOpen} onClose={() => setFormOpen(false)} customer={editing} />
      <CustomerDetailModal customerId={viewId} onClose={() => setViewId(null)} />
      {dialog}
    </div>
  );
}
