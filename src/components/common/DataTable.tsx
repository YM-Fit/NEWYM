import { ReactNode, memo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface Column<T> {
  key: keyof T | string;
  header: string;
  render?: (item: T) => ReactNode;
  sortable?: boolean;
  className?: string;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  loading?: boolean;
  emptyMessage?: string;
  onRowClick?: (item: T) => void;
  pageSize?: number;
  className?: string;
}

export const DataTable = memo(<T extends { id: string }>({
  data,
  columns,
  loading = false,
  emptyMessage = 'אין נתונים להצגה',
  onRowClick,
  pageSize = 10,
  className = '',
}: DataTableProps<T>) => {
  if (loading) {
    return (
      <div className="premium-card-static p-6">
        <div className="space-y-3">
          {Array.from({ length: pageSize }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 animate-pulse">
              {columns.map((_, j) => (
                <div
                  key={j}
                  className="h-4 bg-surface/60 rounded flex-1"
                  style={{ width: `${100 / columns.length}%` }}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="premium-card-static p-12 text-center">
        <p className="text-muted">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className={`premium-card-static overflow-hidden ${className}`} dir="rtl">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-surface/60 border-b border-border/15">
            <tr>
              {columns.map((column) => (
                <th
                  key={String(column.key)}
                  className={`px-4 py-3 text-right text-sm font-semibold text-muted ${column.className || ''}`}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/10">
            {data.map((item) => (
              <tr
                key={item.id}
                onClick={() => onRowClick?.(item)}
                className={`hover:bg-surface/40 transition-colors ${
                  onRowClick ? 'cursor-pointer' : ''
                }`}
              >
                {columns.map((column) => (
                  <td
                    key={String(column.key)}
                    className={`px-4 py-3 text-sm text-secondary ${column.className || ''}`}
                  >
                    {column.render
                      ? column.render(item)
                      : String(item[column.key as keyof T] ?? '')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}) as <T extends { id: string }>(props: DataTableProps<T>) => JSX.Element;
