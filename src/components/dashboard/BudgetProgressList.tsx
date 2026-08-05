import { useMemo } from 'react';
import { Link } from 'react-router';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { CategoryIcon } from '@/components/ui/Icon';
import { calculateBudgetProgress, transactionsInMonth } from '@/domain/budget';
import { formatMoney } from '@/domain/money';
import { useApp } from '@/store/AppContext';

export function BudgetProgressList() {
  const { state, categoryMap } = useApp();

  const progress = useMemo(() => {
    const today = new Date();
    const monthTransactions = transactionsInMonth(state.transactions, today.getFullYear(), today.getMonth());
    return state.budgets
      .map((b) => calculateBudgetProgress(b, monthTransactions, today))
      .sort((a, b) => b.percentUsed - a.percentUsed)
      .slice(0, 4);
  }, [state.transactions, state.budgets]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Budgets</CardTitle>
        <Link to="/budgets" className="text-xs font-medium text-accent hover:underline">
          View all
        </Link>
      </CardHeader>

      {progress.length === 0 ? (
        <p className="py-6 text-center text-sm text-text-muted">No budgets set yet.</p>
      ) : (
        <ul className="space-y-4">
          {progress.map((p) => {
            const category = categoryMap.get(p.categoryId);
            return (
              <li key={p.budgetId}>
                <div className="mb-1.5 flex items-center gap-2">
                  <CategoryIcon icon={category?.icon ?? 'tag'} color={category?.color ?? '#7C878E'} size="sm" />
                  <span className="flex-1 truncate text-sm font-medium text-text">{category?.name ?? 'Unknown'}</span>
                  <span className="figure text-xs text-text-muted">
                    {formatMoney(p.spentCents, state.settings.locale, state.settings.currency)} /{' '}
                    {formatMoney(p.limitCents, state.settings.locale, state.settings.currency)}
                  </span>
                </div>
                <ProgressBar percent={p.percentUsed} status={p.status} label={`${category?.name ?? 'Category'} budget usage`} />
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
