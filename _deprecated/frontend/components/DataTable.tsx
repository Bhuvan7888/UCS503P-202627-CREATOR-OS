import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface Column<T> {
  header: string;
  accessorKey?: keyof T;
  cell?: (item: T) => React.ReactNode;
  align?: "left" | "right";
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  keyExtractor: (item: T) => string;
  onRowClick?: (item: T) => void;
  page?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
}

export function DataTable<T>({
  data,
  columns,
  keyExtractor,
  onRowClick,
  page,
  totalPages,
  onPageChange,
}: DataTableProps<T>) {
  return (
    <div className="bg-[var(--color-surface)] rounded-[var(--radius-lg)] shadow-[var(--shadow-sm)] border border-[var(--color-border)] overflow-hidden flex flex-col">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-[var(--color-border)]">
              {columns.map((col, idx) => (
                <th
                  key={idx}
                  className={`py-[var(--spacing-3)] px-[var(--spacing-4)] text-label text-[var(--color-ink-soft)] bg-white sticky top-0 ${col.align === "right" ? "text-right" : ""}`}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="p-8 text-center text-[var(--color-ink-faint)] text-body">
                  No data available.
                </td>
              </tr>
            ) : (
              data.map((item, rowIndex) => (
                <tr
                  key={keyExtractor(item)}
                  onClick={() => onRowClick?.(item)}
                  className={`border-b border-[var(--color-border)] last:border-0 hover:bg-[var(--color-surface-sunken)] transition-colors duration-150 ${onRowClick ? "cursor-pointer" : ""}`}
                >
                  {columns.map((col, colIndex) => (
                    <td
                      key={colIndex}
                      className={`py-[var(--spacing-4)] px-[var(--spacing-4)] text-body text-[var(--color-ink)] ${col.align === "right" ? "text-right" : ""}`}
                    >
                      {col.cell ? col.cell(item) : col.accessorKey ? (item[col.accessorKey] as React.ReactNode) : null}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      
      {totalPages !== undefined && page !== undefined && (
        <div className="px-[var(--spacing-4)] py-[var(--spacing-3)] border-t border-[var(--color-border)] flex items-center justify-between text-small text-[var(--color-ink-soft)] bg-white">
          <span>
            Page {page} of {totalPages}
          </span>
          <div className="flex gap-2">
            <button
              disabled={page <= 1}
              onClick={() => onPageChange?.(page - 1)}
              className="p-1 rounded hover:bg-[var(--color-surface-sunken)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => onPageChange?.(page + 1)}
              className="p-1 rounded hover:bg-[var(--color-surface-sunken)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
