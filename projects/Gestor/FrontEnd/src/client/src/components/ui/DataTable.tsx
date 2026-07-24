import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  createColumnHelper,
  type ColumnDef as TanStackColumnDef,
  type SortingState,
  type ColumnFiltersState,
} from '@tanstack/react-table';
import { useState, useEffect, Fragment } from 'react';
import { ChevronDown, ChevronUp, ChevronsUpDown, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import type { JSX } from 'react';
import { getCachedSettings } from '@/lib/settings';

export { createColumnHelper };

export type ColumnDef<T> = TanStackColumnDef<T>;

interface DataTableProps<T> {
  columns: ColumnDef<T>[];
  data: T[];
  loading?: boolean;
  error?: string | null;
  emptyMessage?: string;
  renderSubComponent?: (row: T) => JSX.Element;
}

const inputStyles = 'w-full px-2 py-1 text-xs border border-border-primary rounded bg-background-primary text-text-primary placeholder:text-text-muted outline-none focus:border-accent-primary transition-colors';

const DEFAULT_PAGE_SIZES = [5, 10, 15, 20, 30, 50];

export function DataTable<T>({
  columns,
  data,
  loading,
  error,
  emptyMessage = 'Nenhum registro encontrado',
  renderSubComponent,
}: DataTableProps<T>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const cachedSettings = getCachedSettings();
  const pageSizeOptions = cachedSettings?.display?.grid?.pageSizeOptions ?? DEFAULT_PAGE_SIZES;
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(cachedSettings?.display?.grid?.defaultPageSize ?? 10);

  const table = useReactTable<T>({
    data,
    columns,
    state: { sorting, columnFilters },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  const allRows = table.getFilteredRowModel().rows;
  const totalRows = allRows.length;
  const pageCount = Math.max(1, Math.ceil(totalRows / pageSize));
  const safePageIndex = Math.min(pageIndex, pageCount - 1);
  const pageRows = allRows.slice(safePageIndex * pageSize, (safePageIndex + 1) * pageSize);
  const from = totalRows === 0 ? 0 : safePageIndex * pageSize + 1;
  const to = Math.min((safePageIndex + 1) * pageSize, totalRows);

  const canPreviousPage = safePageIndex > 0;
  const canNextPage = safePageIndex < pageCount - 1;

  useEffect(() => {
    setPageIndex(0);
  }, [data, columnFilters, sorting]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-accent-red">{error}</p>
      </div>
    );
  }

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="border-b border-border-subtle">
                {headerGroup.headers.map((header) => {
                  const canSort = header.column.getCanSort();
                  const sorted = header.column.getIsSorted();
                  const canFilter = header.column.getCanFilter();
                  return (
                    <th
                      key={header.id}
                      className={`text-sm font-medium text-text-secondary py-3 px-4 ${
                        (header.column.columnDef.meta as Record<string, string> | undefined)?.align === 'right' ? 'text-right' : 'text-left'
                      } ${
                        canSort ? 'cursor-pointer select-none' : ''
                      }`}
                    >
                      <div
                        className={`flex items-center gap-1 hover:text-text-primary transition-colors ${
                          (header.column.columnDef.meta as Record<string, string> | undefined)?.align === 'right' ? 'flex-row-reverse' : ''
                        }`}
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {canSort && (
                          sorted === 'asc' ? <ChevronUp size={14} />
                          : sorted === 'desc' ? <ChevronDown size={14} />
                          : <ChevronsUpDown size={14} className="text-text-muted" />
                        )}
                      </div>
                      {canFilter && (
                        <div className="mt-1.5 relative" onClick={(e) => e.stopPropagation()}>
                          <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-text-muted" />
                          <input
                            type="text"
                            value={(header.column.getFilterValue() as string) ?? ''}
                            onChange={(e) => header.column.setFilterValue(e.target.value)}
                            placeholder="Filtrar..."
                            className={inputStyles + ' pl-6'}
                          />
                        </div>
                      )}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {pageRows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="text-center py-8 text-text-muted">{emptyMessage}</td>
              </tr>
            ) : (
              pageRows.map((row) => (
                <Fragment key={row.id}>
                  <tr className="border-b border-border-subtle hover:bg-bg-muted/50 transition-colors">
                    {row.getVisibleCells().map((cell) => {
                      const isExpand = (cell.column.columnDef.meta as Record<string, unknown> | undefined)?.expand;
                      return (
                        <td key={cell.id} className={`py-3 px-4 text-sm text-text-primary ${
                            (cell.column.columnDef.meta as Record<string, string> | undefined)?.align === 'right' ? 'text-right' : 'text-left'
                          }`}>
                          {isExpand ? (
                            <button
                              onClick={() => setExpandedRows((prev) => {
                                const next = new Set(prev);
                                if (next.has(row.id)) next.delete(row.id); else next.add(row.id);
                                return next;
                              })}
                              className="p-0.5 rounded hover:bg-bg-muted transition-colors"
                            >
                              {expandedRows.has(row.id) ? <ChevronDown size={16} className="text-text-secondary" /> : <ChevronRight size={16} className="text-text-secondary" />}
                            </button>
                          ) : (
                            flexRender(cell.column.columnDef.cell, cell.getContext())
                          )}
                        </td>
                      );
                    })}
                  </tr>
                  {expandedRows.has(row.id) && renderSubComponent && (
                    <tr className="border-b border-border-subtle">
                      <td colSpan={columns.length} className="p-0">
                        <div className="bg-bg-muted/30 px-6 py-4">
                          {renderSubComponent(row.original)}
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalRows > pageSize && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-border-subtle">
          <div className="flex items-center gap-2 text-sm text-text-secondary">
            <span>Exibindo {from}–{to} de {totalRows}</span>
            <span className="text-text-muted">|</span>
            <span className="text-text-muted">Por página:</span>
            <select
              value={pageSize}
              onChange={(e) => { setPageSize(Number(e.target.value)); setPageIndex(0); }}
              className="px-2 py-1 text-xs border border-border-primary rounded bg-background-primary text-text-primary outline-none"
            >
              {pageSizeOptions.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setPageIndex((p) => p - 1)}
              disabled={!canPreviousPage}
              className="p-1.5 rounded hover:bg-bg-muted transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronLeft size={16} className="text-text-secondary" />
            </button>

            {Array.from({ length: pageCount }, (_, i) => i + 1)
              .filter((p) => {
                const current = safePageIndex + 1;
                return p === 1 || p === pageCount || Math.abs(p - current) <= 1;
              })
              .reduce<(number | 'ellipsis')[]>((acc, p, idx, arr) => {
                if (idx > 0 && p - arr[idx - 1] > 1) acc.push('ellipsis');
                acc.push(p);
                return acc;
              }, [])
              .map((p, i) =>
                p === 'ellipsis' ? (
                  <span key={`e-${i}`} className="px-1 text-text-muted text-sm">...</span>
                ) : (
                  <button
                    key={p}
                    onClick={() => setPageIndex(p - 1)}
                    className={`w-8 h-8 rounded text-sm font-medium transition-colors ${
                      p === safePageIndex + 1
                        ? 'bg-accent-primary text-white'
                        : 'text-text-secondary hover:bg-bg-muted'
                    }`}
                  >
                    {p}
                  </button>
                )
              )}

            <button
              onClick={() => setPageIndex((p) => p + 1)}
              disabled={!canNextPage}
              className="p-1.5 rounded hover:bg-bg-muted transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronRight size={16} className="text-text-secondary" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
