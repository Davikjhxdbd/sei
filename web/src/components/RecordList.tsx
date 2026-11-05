import type { ReactNode } from 'react';
import { Inbox } from 'lucide-react';
import { cx, EmptyState, LoadingBlock } from './ui';

export interface Column<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  className?: string;
  primary?: boolean;
  mobileHidden?: boolean;
  align?: 'left' | 'right';
}

export function RecordList<T>({
  items,
  columns,
  rowKey,
  onRowClick,
  loading,
  emptyTitle = 'Nenhum registro encontrado',
  emptyDescription,
  emptyAction,
}: {
  items: T[];
  columns: Column<T>[];
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  loading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: ReactNode;
}) {
  if (loading) return <LoadingBlock />;

  if (!items.length) {
    return (
      <EmptyState
        icon={Inbox}
        title={emptyTitle}
        description={emptyDescription}
        action={emptyAction}
      />
    );
  }

  const primaryColumn = columns.find((column) => column.primary) ?? columns[0];
  const secondaryColumns = columns.filter(
    (column) => column !== primaryColumn && !column.mobileHidden,
  );

  return (
    <>
      {/* Desktop */}
      <div className="hidden md:block">
        <div className="mmv-scroll overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-line">
                {columns.map((column) => (
                  <th
                    key={column.key}
                    scope="col"
                    className={cx(
                      'px-4 py-2.5 text-[10.5px] font-semibold uppercase tracking-wider2 text-muted',
                      column.align === 'right' && 'text-right',
                    )}
                  >
                    {column.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((row) => (
                <tr
                  key={rowKey(row)}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={cx(
                    'border-b border-line/70 last:border-0',
                    onRowClick && 'cursor-pointer hover:bg-ink/[0.025]',
                  )}
                >
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className={cx(
                        'px-4 py-3 align-middle text-[13px] text-ink/85',
                        column.align === 'right' && 'text-right',
                        column.className,
                      )}
                    >
                      {column.render(row)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile */}
      <ul className="divide-y divide-line md:hidden">
        {items.map((row) => (
          <li key={rowKey(row)}>
            <button
              type="button"
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={cx(
                'block w-full px-4 py-3 text-left',
                onRowClick && 'active:bg-ink/[0.03]',
              )}
            >
              <div className="text-[13.5px] font-medium text-ink">
                {primaryColumn.render(row)}
              </div>
              <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1.5">
                {secondaryColumns.map((column) => (
                  <div key={column.key} className="min-w-0">
                    <dt className="text-[10px] font-semibold uppercase tracking-wider2 text-muted">
                      {column.header}
                    </dt>
                    <dd className="truncate text-[12.5px] text-ink/80">
                      {column.render(row)}
                    </dd>
                  </div>
                ))}
              </dl>
            </button>
          </li>
        ))}
      </ul>
    </>
  );
}
