import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { PageLoader } from './Loader';
import type { TableColumn } from '@/shared/types';

interface TableProps<T> {
  columns: TableColumn<T>[];
  data: T[];
  loading?: boolean;
  emptyMessage?: string;
  onRowClick?: (row: T) => void;
  keyExtractor: (row: T) => string;
  emptyIcon?: ReactNode;
}

export default function Table<T>({
  columns,
  data,
  loading,
  emptyMessage = 'Aucun résultat',
  onRowClick,
  keyExtractor,
  emptyIcon,
}: TableProps<T>) {
  if (loading) return <PageLoader />;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-secondary-200">
            {columns.map((col) => (
              <th
                key={String(col.key)}
                className={cn('px-4 py-3 text-left text-xs font-semibold text-secondary-500 uppercase tracking-wider', col.className)}
                style={col.width ? { width: col.width } : undefined}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="py-16 text-center">
                {emptyIcon && <div className="flex justify-center mb-3 text-secondary-300">{emptyIcon}</div>}
                <p className="text-secondary-500 text-sm">{emptyMessage}</p>
              </td>
            </tr>
          ) : (
            data.map((row) => (
              <tr
                key={keyExtractor(row)}
                className={cn(
                  'border-b border-secondary-100 transition-colors',
                  onRowClick && 'cursor-pointer hover:bg-secondary-50'
                )}
                onClick={() => onRowClick?.(row)}
              >
                {columns.map((col) => (
                  <td key={String(col.key)} className={cn('px-4 py-3 text-secondary-700', col.className)}>
                    {col.render ? col.render(row) : String((row as Record<string, unknown>)[String(col.key)] ?? '')}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
