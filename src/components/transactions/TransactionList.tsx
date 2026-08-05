import { Pencil, Trash2 } from 'lucide-react';
import type { Category, Settings, Transaction } from '@/types';
import { CategoryIcon } from '@/components/ui/Icon';
import { formatSignedAmount } from '@/domain/money';
import { Button } from '@/components/ui/Button';

interface TransactionListProps {
  transactions: Transaction[];
  categoryMap: Map<string, Category>;
  settings: Settings;
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onEdit: (transaction: Transaction) => void;
  onDelete: (transaction: Transaction) => void;
  groupByDate: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
}

function formatDateHeading(iso: string, locale: string): string {
  const [year, month, day] = iso.split('-').map(Number);
  const date = new Date(year ?? 0, (month ?? 1) - 1, day ?? 1);
  return new Intl.DateTimeFormat(locale, { weekday: 'short', month: 'short', day: 'numeric' }).format(date);
}

export function TransactionList({
  transactions,
  categoryMap,
  settings,
  selectedIds,
  onToggleSelect,
  onEdit,
  onDelete,
  groupByDate,
  hasMore,
  onLoadMore,
}: TransactionListProps) {
  let lastHeading: string | null = null;

  return (
    <div>
      <ul className="divide-y divide-border">
        {transactions.map((t) => {
          const category = categoryMap.get(t.categoryId);
          const showHeading = groupByDate && t.date !== lastHeading;
          if (showHeading) lastHeading = t.date;

          return (
            <li key={t.id}>
              {showHeading && (
                <div className="px-1 pb-2 pt-4 text-xs font-semibold uppercase tracking-wide text-text-faint">
                  {formatDateHeading(t.date, settings.locale)}
                </div>
              )}
              <div className="flex items-center gap-3 px-1 py-3">
                <input
                  type="checkbox"
                  checked={selectedIds.has(t.id)}
                  onChange={() => onToggleSelect(t.id)}
                  aria-label={`Select ${t.description}`}
                  className="h-4 w-4 shrink-0 rounded border-border-strong accent-accent"
                />
                <CategoryIcon icon={category?.icon ?? 'tag'} color={category?.color ?? '#7C878E'} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-text">{t.description}</p>
                  <p className="truncate text-xs text-text-muted">
                    {category?.name ?? 'Uncategorized'}
                    {t.recurringRuleId && ' · Recurring'}
                  </p>
                </div>
                <p
                  className={`figure shrink-0 text-sm font-medium ${
                    t.type === 'income' ? 'text-positive' : 'text-negative'
                  }`}
                >
                  {formatSignedAmount(t.amountCents, t.type, settings.locale, settings.currency)}
                </p>
                <div className="flex shrink-0 items-center gap-0.5">
                  <button
                    onClick={() => onEdit(t)}
                    aria-label={`Edit ${t.description}`}
                    className="rounded p-1.5 text-text-faint transition-colors hover:bg-surface-raised hover:text-text"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => onDelete(t)}
                    aria-label={`Delete ${t.description}`}
                    className="rounded p-1.5 text-text-faint transition-colors hover:bg-negative-soft hover:text-negative"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
      {hasMore && (
        <div className="pt-4 text-center">
          <Button variant="secondary" size="sm" onClick={onLoadMore}>
            Load more
          </Button>
        </div>
      )}
    </div>
  );
}
