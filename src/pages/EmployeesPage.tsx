import { useMemo, useState } from 'react';
import { ClipboardList, Pencil, Trash2, UserCog, UserPlus } from 'lucide-react';
import type { Employee } from '@/types';
import {
  Button,
  Card,
  DataTable,
  EmptyState,
  FilterSelect,
  IconButton,
  Modal,
  PageHeader,
  SearchInput,
  SegmentedControl,
  StatusBadge,
  Toolbar,
  useToast,
  type Column,
} from '@/components/ui';
import { useAppData } from '@/store/AppDataContext';
import { useFormat } from '@/hooks/useFormat';
import { useLookups } from '@/hooks/useLookups';
import { useConfirm } from '@/hooks/useConfirm';
import { includesText, initials } from '@/utils/format';
import { formatTime, todayISO } from '@/utils/date';
import { isActiveJob, sortJobsByDateTime } from '@/utils/calc';
import { ACTIVE_STATUSES, EMPLOYEE_ROLES, EmployeeFormModal } from '@/features/employees/EmployeeFormModal';
import { JobDetailModal } from '@/features/jobs/JobDetailModal';

type Row = Employee & { assigned: number; upcoming: number };

function AssignedJobsModal({ employee, onClose }: { employee: Employee | null; onClose: () => void }) {
  const { data } = useAppData();
  const fmt = useFormat();
  const lookups = useLookups();
  const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming');
  const [jobId, setJobId] = useState<string | null>(null);
  const today = todayISO();

  const jobs = useMemo(() => {
    if (!employee) return [];
    const all = data.jobs.filter((j) => j.employeeId === employee.id).sort(sortJobsByDateTime);
    return tab === 'upcoming' ? all.filter((j) => j.date >= today && isActiveJob(j)) : all.filter((j) => !(j.date >= today && isActiveJob(j))).reverse();
  }, [employee, data.jobs, tab, today]);

  return (
    <>
      <Modal
        open={!!employee && !jobId}
        onClose={() => {
          setTab('upcoming');
          onClose();
        }}
        title={employee ? `${employee.name} — Assigned Jobs` : ''}
        description={employee?.role}
        size="lg"
      >
        <SegmentedControl
          value={tab}
          onChange={setTab}
          options={[
            { value: 'upcoming', label: 'Upcoming' },
            { value: 'past', label: 'Past & closed' },
          ]}
          className="mb-4"
        />
        {jobs.length === 0 ? (
          <EmptyState compact icon={<ClipboardList className="h-6 w-6" />} title={tab === 'upcoming' ? 'No upcoming jobs assigned' : 'No past jobs'} />
        ) : (
          <ul className="max-h-[55vh] divide-y divide-slate-100 overflow-y-auto rounded-xl border border-slate-200">
            {jobs.map((j) => (
              <li key={j.id}>
                <button type="button" onClick={() => setJobId(j.id)} className="flex w-full flex-wrap items-center justify-between gap-2 px-4 py-3 text-left hover:bg-slate-50">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900">{lookups.customerName(j.customerId)}</p>
                    <p className="text-xs text-slate-500">
                      {fmt.date(j.date)} · {formatTime(j.startTime)}–{formatTime(j.endTime)} · {lookups.serviceName(j.serviceId)}
                    </p>
                  </div>
                  <StatusBadge status={j.status} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </Modal>
      <JobDetailModal jobId={jobId} onClose={() => setJobId(null)} />
    </>
  );
}

export function EmployeesPage() {
  const { data, deleteEmployee } = useAppData();
  const toast = useToast();
  const { confirm, dialog } = useConfirm();
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('all');
  const [status, setStatus] = useState('all');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [viewing, setViewing] = useState<Employee | null>(null);
  const today = todayISO();

  const rows = useMemo<Row[]>(
    () =>
      data.employees
        .filter(
          (e) =>
            (role === 'all' || e.role === role) &&
            (status === 'all' || e.status === status) &&
            includesText([e.name, e.phone, e.email, e.role], search),
        )
        .map((e) => {
          const jobs = data.jobs.filter((j) => j.employeeId === e.id);
          return { ...e, assigned: jobs.length, upcoming: jobs.filter((j) => j.date >= today && isActiveJob(j)).length };
        }),
    [data.employees, data.jobs, role, status, search, today],
  );

  const openForm = (e: Employee | null) => {
    setEditing(e);
    setFormOpen(true);
  };

  const remove = (e: Row) =>
    confirm({
      title: 'Delete employee?',
      message: (
        <>
          <strong>{e.name}</strong> will be permanently deleted.
          {e.assigned > 0 && <> Their {e.assigned} assigned job(s) will become unassigned.</>} Consider setting the employee to Inactive
          instead to keep job history.
        </>
      ),
      onConfirm: () => {
        deleteEmployee(e.id);
        toast.success('Employee deleted successfully');
      },
    });

  const columns: Column<Row>[] = [
    {
      key: 'name',
      header: 'Name',
      mobile: 'title',
      sortValue: (r) => r.name,
      cell: (r) => (
        <span className="inline-flex items-center gap-3">
          <span className="hidden h-8 w-8 items-center justify-center rounded-full bg-brand-50 text-xs font-semibold text-brand-700 md:inline-flex">
            {initials(r.name)}
          </span>
          <span className="font-medium text-slate-900">{r.name}</span>
        </span>
      ),
    },
    { key: 'role', header: 'Role', mobile: 'subtitle', sortValue: (r) => r.role, cell: (r) => r.role },
    { key: 'phone', header: 'Phone', cell: (r) => r.phone },
    { key: 'email', header: 'Email', cell: (r) => r.email || <span className="text-slate-400">—</span> },
    { key: 'status', header: 'Status', mobile: 'badge', sortValue: (r) => r.status, cell: (r) => <StatusBadge status={r.status} /> },
    {
      key: 'assigned',
      header: 'Assigned Jobs',
      align: 'right',
      sortValue: (r) => r.upcoming,
      cell: (r) => (
        <span className="tabular-nums">
          <span className="font-semibold text-slate-900">{r.upcoming}</span>
          <span className="text-slate-400"> upcoming · {r.assigned} total</span>
        </span>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Employees"
        description={`${data.employees.filter((e) => e.status === 'Active').length} active team members`}
        actions={
          <Button icon={<UserPlus className="h-4 w-4" />} onClick={() => openForm(null)}>
            Add Employee
          </Button>
        }
      />
      <Card>
        <Toolbar>
          <SearchInput value={search} onChange={setSearch} placeholder="Search employees…" />
          <div className="grid grid-cols-2 gap-2 sm:flex">
            <FilterSelect
              label="Filter by role"
              value={role}
              onChange={setRole}
              options={[{ value: 'all', label: 'All roles' }, ...EMPLOYEE_ROLES.map((r) => ({ value: r, label: r }))]}
            />
            <FilterSelect
              label="Filter by status"
              value={status}
              onChange={setStatus}
              options={[{ value: 'all', label: 'All statuses' }, ...ACTIVE_STATUSES.map((s) => ({ value: s, label: s }))]}
            />
          </div>
        </Toolbar>
        <DataTable
          columns={columns}
          rows={rows}
          rowKey={(r) => r.id}
          onRowClick={(r) => setViewing(r)}
          initialSort={{ key: 'name', dir: 'asc' }}
          actions={(r) => (
            <>
              <IconButton label="View assigned jobs" onClick={() => setViewing(r)}>
                <ClipboardList className="h-4 w-4" />
              </IconButton>
              <IconButton label="Edit employee" onClick={() => openForm(r)}>
                <Pencil className="h-4 w-4" />
              </IconButton>
              <IconButton label="Delete employee" tone="danger" onClick={() => remove(r)}>
                <Trash2 className="h-4 w-4" />
              </IconButton>
            </>
          )}
          empty={
            data.employees.length === 0 ? (
              <EmptyState
                icon={<UserCog className="h-6 w-6" />}
                title="No employees yet"
                description="Add your team so you can assign them to cleaning jobs."
                action={
                  <Button icon={<UserPlus className="h-4 w-4" />} onClick={() => openForm(null)}>
                    Add Employee
                  </Button>
                }
              />
            ) : (
              <EmptyState title="No matching employees" description="Try a different search or filter." />
            )
          }
        />
      </Card>
      <EmployeeFormModal open={formOpen} onClose={() => setFormOpen(false)} employee={editing} />
      <AssignedJobsModal employee={viewing} onClose={() => setViewing(null)} />
      {dialog}
    </div>
  );
}
