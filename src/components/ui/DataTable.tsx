import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/utils/cn';

export interface Column<T> {
  key: string;
  header: string;
  cell: (row: T) => ReactNode;
  /** Enables sorting on this column. */
  sortValue?: (row: T) => string | number;
  align?: 'left' | 'right' | 'center';
  className?: string;
  /**
   * How the column renders in the mobile card layout:
   *  - `title`: bold headline of the card
   *  - `subtitle`: muted line under the title
   *  - `hidden`: not shown on mobile
   *  - default: label/value pair
   */
  mobile?: 'title' | 'subtitle' | 'hidden' | 'badge';
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  actions?: (row: T) => ReactNode;
  empty: ReactNode;
  initialSort?: { key: string; dir: 'asc' | 'desc' };
  pageSize?: number;
  footer?: ReactNode;
}

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  onRowClick,
  actions,
  empty,
  initialSort,
  pageSize = 10,
  footer,
}: DataTableProps<T>) {
  const [sort, setSort] = useState(initialSort ?? null);
  const [page, setPage] = useState(0);

  const sorted = useMemo(() => {
    if (!sort) return rows;
    const col = columns.find((c) => c.key === sort.key);
    if (!col?.sortValue) return rows;
    const get = col.sortValue;
    const dir = sort.dir === 'asc' ? 1 : -1;
    return [...rows].sort((a, b) => {
      const va = get(a);
      const vb = get(b);
      if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * dir;
      return String(va).localeCompare(String(vb), undefined, { numeric: true, sensitivity: 'base' }) * dir;
    });
  }, [rows, sort, columns]);

  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize));
  // Keep the page in range when filters shrink the result set.
  useEffect(() => {
    if (page > pageCount - 1) setPage(pageCount - 1);
  }, [page, pageCount]);
  const current = Math.min(page, pageCount - 1);
  const visible = sorted.slice(current * pageSize, current * pageSize + pageSize);

  const toggleSort = (key: string) => {
    setSort((s) => (s?.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }));
    setPage(0);
  };

  if (rows.length === 0) return <>{empty}</>;

  const alignCls = (a?: Column<T>['align']) => (a === 'right' ? 'text-right' : a === 'center' ? 'text-center' : 'text-left');
  const titleCol = columns.find((c) => c.mobile === 'title');
  const subtitleCol = columns.find((c) => c.mobile === 'subtitle');
  const badgeCols = columns.filter((c) => c.mobile === 'badge');
  const bodyCols = columns.filter((c) => !c.mobile);

  return (
    <div>
      {/* Desktop / tablet table */}
      <div className="hidden overflow-x-auto md:block">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/70">
              {columns.map((c) => (
                <th
                  key={c.key}
                  scope="col"
                  className={cn(
                    'whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500',
                    alignCls(c.align),
                    c.className,
                  )}
                >
                  {c.sortValue ? (
                    <button
                      type="button"
                      onClick={() => toggleSort(c.key)}
                      className={cn('inline-flex items-center gap-1 hover:text-slate-800', c.align === 'right' && 'flex-row-reverse')}
                    >
                      {c.header}
                      {sort?.key === c.key ? (
                        sort.dir === 'asc' ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />
                      ) : (
                        <ChevronsUpDown className="h-3.5 w-3.5 opacity-40" />
                      )}
                    </button>
                  ) : (
                    c.header
                  )}
                </th>
              ))}
              {actions && (
                <th scope="col" className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {visible.map((row) => (
              <tr
                key={rowKey(row)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={cn('bg-white transition-colors', onRowClick && 'cursor-pointer hover:bg-brand-50/40')}
              >
                {columns.map((c) => (
                  <td key={c.key} className={cn('whitespace-nowrap px-4 py-3 text-slate-700', alignCls(c.align), c.className)}>
                    {c.cell(row)}
                  </td>
                ))}
                {actions && (
                  <td className="whitespace-nowrap px-4 py-2 text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="inline-flex items-center gap-0.5">{actions(row)}</div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
          {footer && <tfoot className="border-t border-slate-200 bg-slate-50/70">{footer}</tfoot>}
        </table>
      </div>

      {/* Mobile cards */}
      <ul className="divide-y divide-slate-100 md:hidden">
        {visible.map((row) => (
          <li
            key={rowKey(row)}
            onClick={onRowClick ? () => onRowClick(row) : undefined}
            className={cn('px-4 py-4', onRowClick && 'cursor-pointer active:bg-slate-50')}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                {titleCol && <div className="truncate font-medium text-slate-900">{titleCol.cell(row)}</div>}
                {subtitleCol && <div className="mt-0.5 truncate text-xs text-slate-500">{subtitleCol.cell(row)}</div>}
              </div>
              {badgeCols.length > 0 && (
                <div className="flex shrink-0 flex-col items-end gap-1">
                  {badgeCols.map((c) => (
                    <div key={c.key}>{c.cell(row)}</div>
                  ))}
                </div>
              )}
            </div>
            {bodyCols.length > 0 && (
              <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2">
                {bodyCols.map((c) => (
                  <div key={c.key} className="min-w-0">
                    <dt className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{c.header}</dt>
                    <dd className="truncate text-sm text-slate-700">{c.cell(row)}</dd>
                  </div>
                ))}
              </dl>
            )}
            {actions && (
              <div className="mt-3 flex justify-end gap-1 border-t border-slate-100 pt-2" onClick={(e) => e.stopPropagation()}>
                {actions(row)}
              </div>
            )}
          </li>
        ))}
      </ul>

      {/* Pagination */}
      <div className="flex flex-col items-center justify-between gap-2 border-t border-slate-100 px-4 py-3 text-xs text-slate-500 sm:flex-row">
        <span>
          Showing <span className="font-medium text-slate-700">{current * pageSize + 1}</span>–
          <span className="font-medium text-slate-700">{Math.min(sorted.length, (current + 1) * pageSize)}</span> of{' '}
          <span className="font-medium text-slate-700">{sorted.length}</span>
        </span>
        {pageCount > 1 && (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setPage(current - 1)}
              disabled={current === 0}
              className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40"
            >
              <ChevronLeft className="h-3.5 w-3.5" /> Prev
            </button>
            <span className="px-2">
              Page {current + 1} of {pageCount}
            </span>
            <button
              type="button"
              onClick={() => setPage(current + 1)}
              disabled={current >= pageCount - 1}
              className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40"
            >
              Next <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
