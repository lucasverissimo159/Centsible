import type { Budget, BudgetProgress, Transaction } from '@/types';

const WARNING_THRESHOLD_PERCENT = 80;

/**
 * Projects end-of-month spend by linear extrapolation of the current daily
 * rate: (spent so far / days elapsed) * days in month. It's a naive model —
 * a real forecasting engine would weight recent days more heavily, account
 * for known upcoming recurring bills, etc — but it is honest about being
 * naive, cheap to compute, and good enough to flag "you're on pace to blow
 * this budget" before the month is over, which is the entire point of a
 * budget in the first place.
 */
export function calculateBudgetProgress(
  budget: Budget,
  monthTransactions: Transaction[],
  today: Date
): BudgetProgress {
  const spentCents = monthTransactions
    .filter((t) => t.categoryId === budget.categoryId && t.type === 'expense')
    .reduce((sum, t) => sum + t.amountCents, 0);

  const dayOfMonth = today.getDate();
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const dailyRate = dayOfMonth > 0 ? spentCents / dayOfMonth : 0;
  const projectedEndOfMonthCents = Math.round(dailyRate * daysInMonth);

  const percentUsed = budget.monthlyLimitCents > 0 ? (spentCents / budget.monthlyLimitCents) * 100 : 0;

  let status: BudgetProgress['status'] = 'under';
  if (percentUsed >= 100) status = 'over';
  else if (percentUsed >= WARNING_THRESHOLD_PERCENT) status = 'warning';

  return {
    budgetId: budget.id,
    categoryId: budget.categoryId,
    limitCents: budget.monthlyLimitCents,
    spentCents,
    remainingCents: budget.monthlyLimitCents - spentCents,
    percentUsed,
    projectedEndOfMonthCents,
    status,
  };
}

/** Transactions whose ISO date falls within the given calendar month (0-indexed month, like Date#getMonth). */
export function transactionsInMonth(transactions: Transaction[], year: number, month: number): Transaction[] {
  const prefix = `${year}-${String(month + 1).padStart(2, '0')}`;
  return transactions.filter((t) => t.date.startsWith(prefix));
}
