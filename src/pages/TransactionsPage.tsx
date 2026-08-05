import { useEffect, useMemo, useState } from 'react';
import { List, Trash2 } from 'lucide-react';
import { useApp } from '@/store/AppContext';
import { useToast } from '@/hooks/useToast';
import { useDebounce } from '@/hooks/useDebounce';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { TransactionFiltersBar } from '@/components/transactions/TransactionFilters';
import { TransactionList } from '@/components/transactions/TransactionList';
import { TransactionForm } from '@/components/transactions/TransactionForm';
import { RecurringRulesPanel } from '@/components/transactions/RecurringRulesPanel';
import { ImportExportBar } from '@/components/transactions/ImportExportBar';
import {
  selectFilteredTransactions,
  selectSortedTransactions,
  type SortDirection,
  type TransactionFilters,
  type TransactionSortField,
} from '@/store/selectors';
import type { Transaction } from '@/types';

const PAGE_SIZE = 30;

export function TransactionsPage() {
  const { state, categoryMap, deleteTransaction, bulkDeleteTransactions, undo } = useApp();
  const { showToast } = useToast();

  const [filters, setFilters] = useState<TransactionFilters>({ type: 'all', categoryId: 'all', searchText: '' });
  const debouncedSearch = useDebounce(filters.searchText ?? '', 200);
  const [sortField, setSortField] = useState<TransactionSortField>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formTransaction, setFormTransaction] = useState<Transaction | undefined>(undefined);

  const effectiveType = filters.type;
  const effectiveCategoryId = filters.categoryId;

  const filteredSorted = useMemo(() => {
    const filtered = selectFilteredTransactions(state.transactions, {
      type: effectiveType,
      categoryId: effectiveCategoryId,
      searchText: debouncedSearch,
    });
    return selectSortedTransactions(filtered, sortField, sortDirection);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.transactions, effectiveType, effectiveCategoryId, debouncedSearch, sortField, sortDirection]);

  // A new filter/sort result set starts back on page one.
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [effectiveType, effectiveCategoryId, debouncedSearch, sortField, sortDirection]);

  const visibleTransactions = filteredSorted.slice(0, visibleCount);
  const hasMore = filteredSorted.length > visibleCount;

  function toggleSelect(id: string) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function openAddForm() {
    setFormTransaction(undefined);
    setIsFormOpen(true);
  }

  function openEditForm(transaction: Transaction) {
    setFormTransaction(transaction);
    setIsFormOpen(true);
  }

  function handleDelete(transaction: Transaction) {
    deleteTransaction(transaction.id);
    showToast({
      text: `Deleted "${transaction.description}".`,
      tone: 'default',
      actionLabel: 'Undo',
      onAction: undo,
    });
  }

  function handleBulkDelete() {
    const count = selectedIds.size;
    bulkDeleteTransactions(Array.from(selectedIds));
    setSelectedIds(new Set());
    showToast({
      text: `Deleted ${count} transaction${count === 1 ? '' : 's'}.`,
      tone: 'default',
      actionLabel: 'Undo',
      onAction: undo,
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <RecurringRulesPanel />

      <Card padded={false} className="p-4 sm:p-5">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
            <TransactionFiltersBar
              filters={filters}
              onFiltersChange={setFilters}
              categories={state.categories}
              sortField={sortField}
              sortDirection={sortDirection}
              onSortChange={(field, direction) => {
                setSortField(field);
                setSortDirection(direction);
              }}
            />
            <ImportExportBar transactions={filteredSorted} />
          </div>

          {selectedIds.size > 0 && (
            <div className="flex items-center justify-between rounded-md bg-accent-soft px-3 py-2">
              <span className="text-sm font-medium text-accent">
                {selectedIds.size} selected
              </span>
              <Button variant="danger" size="sm" icon={<Trash2 size={14} />} onClick={handleBulkDelete}>
                Delete
              </Button>
            </div>
          )}

          {filteredSorted.length === 0 ? (
            <EmptyState
              icon={<List size={28} />}
              title="No transactions found"
              description={
                state.transactions.length === 0
                  ? 'Add your first transaction to start tracking.'
                  : 'Try adjusting your search or filters.'
              }
              action={
                state.transactions.length === 0 ? (
                  <Button variant="primary" onClick={openAddForm}>
                    Add transaction
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <TransactionList
              transactions={visibleTransactions}
              categoryMap={categoryMap}
              settings={state.settings}
              selectedIds={selectedIds}
              onToggleSelect={toggleSelect}
              onEdit={openEditForm}
              onDelete={handleDelete}
              groupByDate={sortField === 'date'}
              hasMore={hasMore}
              onLoadMore={() => setVisibleCount((count) => count + PAGE_SIZE)}
            />
          )}
        </div>
      </Card>

      <TransactionForm isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} transaction={formTransaction} />
    </div>
  );
}
