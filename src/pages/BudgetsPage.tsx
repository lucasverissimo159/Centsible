import { useMemo, useState } from 'react';
import { Pencil, Plus, Trash2, Wallet } from 'lucide-react';
import { useApp } from '@/store/AppContext';
import { useToast } from '@/hooks/useToast';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { CategoryIcon } from '@/components/ui/Icon';
import { EmptyState } from '@/components/ui/EmptyState';
import { BudgetForm } from '@/components/budgets/BudgetForm';
import { calculateBudgetProgress, transactionsInMonth } from '@/domain/budget';
import { formatMoney } from '@/domain/money';
import type { Budget, BudgetStatus } from '@/types';

const STATUS_LABEL: Record<BudgetStatus, string> = {
  under: 'On track',
  warning: 'Near limit',
  over: 'Over budget',
};
const STATUS_TONE: Record<BudgetStatus, 'positive' | 'warning' | 'negative'> = {
  under: 'positive',
  warning: 'warning',
  over: 'negative',
};

export function BudgetsPage() {
  const { state, categoryMap, deleteBudget } = useApp();
  const { showToast } = useToast();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | undefined>(undefined);

  const today = useMemo(() => new Date(), []);
  const monthTransactions = useMemo(
    () => transactionsInMonth(state.transactions, today.getFullYear(), today.getMonth()),
    [state.transactions, today]
  );

  const progressList = useMemo(
    () =>
      state.budgets
        .map((b) => calculateBudgetProgress(b, monthTransactions, today))
        .sort((a, b) => b.percentUsed - a.percentUsed),
    [state.budgets, monthTransactions, today]
  );

  function openAdd() {
    setEditingBudget(undefined);
    setIsFormOpen(true);
  }

  function openEdit(budget: Budget) {
    setEditingBudget(budget);
    setIsFormOpen(true);
  }

  function handleDelete(budget: Budget) {
    deleteBudget(budget.id);
    showToast({ text: 'Budget removed.', tone: 'default' });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-text-muted">
          {progressList.length} budget{progressList.length === 1 ? '' : 's'} this month
        </p>
        <Button variant="primary" size="sm" icon={<Plus size={16} />} onClick={openAdd}>
          Set a budget
        </Button>
      </div>

      {progressList.length === 0 ? (
        <EmptyState
          icon={<Wallet size={28} />}
          title="No budgets set"
          description="Set a monthly limit on a category to track progress and catch overspending before the month ends."
          action={
            <Button variant="primary" onClick={openAdd}>
              Set a budget
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {progressList.map((progress) => {
            const category = categoryMap.get(progress.categoryId);
            const budget = state.budgets.find((b) => b.id === progress.budgetId);
            if (!budget) return null;
            return (
              <Card key={progress.budgetId}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <CategoryIcon icon={category?.icon ?? 'tag'} color={category?.color ?? '#7C878E'} />
                    <div>
                      <p className="text-sm font-semibold text-text">{category?.name ?? 'Unknown'}</p>
                      <Badge tone={STATUS_TONE[progress.status]}>{STATUS_LABEL[progress.status]}</Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-0.5">
                    <button
                      onClick={() => openEdit(budget)}
                      aria-label={`Edit ${category?.name ?? ''} budget`}
                      className="rounded p-1.5 text-text-faint transition-colors hover:bg-surface-raised hover:text-text"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => handleDelete(budget)}
                      aria-label={`Delete ${category?.name ?? ''} budget`}
                      className="rounded p-1.5 text-text-faint transition-colors hover:bg-negative-soft hover:text-negative"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                <div className="mt-4">
                  <div className="mb-1.5 flex items-baseline justify-between">
                    <span className="figure text-sm font-semibold text-text">
                      {formatMoney(progress.spentCents, state.settings.locale, state.settings.currency)}
                    </span>
                    <span className="figure text-xs text-text-faint">
                      of {formatMoney(progress.limitCents, state.settings.locale, state.settings.currency)}
                    </span>
                  </div>
                  <ProgressBar
                    percent={progress.percentUsed}
                    status={progress.status}
                    label={`${category?.name ?? 'Category'} budget usage`}
                  />
                </div>

                <p className="mt-3 text-xs text-text-muted">
                  Projected by month end:{' '}
                  <span className="figure font-medium text-text">
                    {formatMoney(progress.projectedEndOfMonthCents, state.settings.locale, state.settings.currency)}
                  </span>
                </p>
              </Card>
            );
          })}
        </div>
      )}

      <BudgetForm isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} budget={editingBudget} />
    </div>
  );
}
