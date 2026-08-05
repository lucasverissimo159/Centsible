import { useMemo } from 'react';
import { Link } from 'react-router';
import { useApp } from '@/store/AppContext';
import { SummaryCards } from '@/components/dashboard/SummaryCards';
import { CategoryBreakdownChart } from '@/components/dashboard/CategoryBreakdownChart';
import { MonthlyTrendChart } from '@/components/dashboard/MonthlyTrendChart';
import { BudgetProgressList } from '@/components/dashboard/BudgetProgressList';
import { UpcomingRecurring } from '@/components/dashboard/UpcomingRecurring';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { CategoryIcon } from '@/components/ui/Icon';
import { formatSignedAmount } from '@/domain/money';
import { selectCategoryTotals, selectMonthlyTrend, selectSummary } from '@/store/selectors';

const TREND_MONTHS = 6;
const RECENT_COUNT = 5;

export function DashboardPage() {
  const { state, categoryMap } = useApp();
  const today = useMemo(() => new Date(), []);

  const summary = useMemo(() => selectSummary(state.transactions, today), [state.transactions, today]);
  const categoryTotals = useMemo(() => selectCategoryTotals(state.transactions, today), [state.transactions, today]);
  const monthlyTrend = useMemo(
    () => selectMonthlyTrend(state.transactions, today, TREND_MONTHS),
    [state.transactions, today]
  );

  const recentTransactions = useMemo(() => {
    return [...state.transactions]
      .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt))
      .slice(0, RECENT_COUNT);
  }, [state.transactions]);

  return (
    <div className="flex flex-col gap-4 sm:gap-6">
      <SummaryCards summary={summary} settings={state.settings} />

      <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-2">
        <CategoryBreakdownChart data={categoryTotals} categoryMap={categoryMap} settings={state.settings} />
        <MonthlyTrendChart data={monthlyTrend} settings={state.settings} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-2">
        <BudgetProgressList />
        <UpcomingRecurring />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent activity</CardTitle>
          <Link to="/transactions" className="text-xs font-medium text-accent hover:underline">
            View all
          </Link>
        </CardHeader>
        {recentTransactions.length === 0 ? (
          <p className="py-6 text-center text-sm text-text-muted">No transactions yet.</p>
        ) : (
          <ul className="divide-y divide-border">
            {recentTransactions.map((t) => {
              const category = categoryMap.get(t.categoryId);
              return (
                <li key={t.id} className="flex items-center gap-3 py-2.5">
                  <CategoryIcon icon={category?.icon ?? 'tag'} color={category?.color ?? '#7C878E'} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-text">{t.description}</p>
                    <p className="text-xs text-text-faint">{category?.name ?? 'Uncategorized'}</p>
                  </div>
                  <p
                    className={`figure shrink-0 text-sm font-medium ${
                      t.type === 'income' ? 'text-positive' : 'text-negative'
                    }`}
                  >
                    {formatSignedAmount(t.amountCents, t.type, state.settings.locale, state.settings.currency)}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}
