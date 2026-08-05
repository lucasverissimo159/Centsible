import { describe, expect, it } from 'vitest';
import { calculateBudgetProgress, transactionsInMonth } from '../budget';
import type { Budget, Transaction } from '@/types';

function tx(overrides: Partial<Transaction>): Transaction {
  return {
    id: 't1',
    type: 'expense',
    amountCents: 1000,
    categoryId: 'groceries',
    description: 'Test',
    date: '2026-03-10',
    createdAt: '2026-03-10T00:00:00.000Z',
    updatedAt: '2026-03-10T00:00:00.000Z',
    ...overrides,
  };
}

const budget: Budget = { id: 'b1', categoryId: 'groceries', monthlyLimitCents: 40000 };

describe('calculateBudgetProgress', () => {
  it('sums only expense transactions in the matching category', () => {
    const transactions = [
      tx({ amountCents: 10000 }),
      tx({ amountCents: 5000 }),
      tx({ amountCents: 9999, categoryId: 'dining' }), // different category, excluded
      tx({ amountCents: 500, type: 'income' }), // income, excluded even if same category
    ];
    const progress = calculateBudgetProgress(budget, transactions, new Date(2026, 2, 15));
    expect(progress.spentCents).toBe(15000);
    expect(progress.remainingCents).toBe(25000);
  });

  it('classifies status as under/warning/over at the right thresholds', () => {
    const under = calculateBudgetProgress(budget, [tx({ amountCents: 20000 })], new Date(2026, 2, 15));
    expect(under.status).toBe('under');

    const warning = calculateBudgetProgress(budget, [tx({ amountCents: 32000 })], new Date(2026, 2, 15));
    expect(warning.status).toBe('warning'); // 80%

    const over = calculateBudgetProgress(budget, [tx({ amountCents: 40001 })], new Date(2026, 2, 15));
    expect(over.status).toBe('over');
  });

  it('projects end-of-month spend by linear extrapolation of the daily rate', () => {
    // $100 spent by day 10 of a 30-day month -> $10/day -> $300 projected.
    const marchTenth = new Date(2026, 2, 10);
    const progress = calculateBudgetProgress(
      { id: 'b2', categoryId: 'groceries', monthlyLimitCents: 100000 },
      [tx({ amountCents: 10000 })],
      marchTenth
    );
    expect(progress.projectedEndOfMonthCents).toBe(31000); // 10000/10 * 31 days in March
  });

  it('does not divide by zero when the budget limit is zero', () => {
    const zeroBudget: Budget = { id: 'b3', categoryId: 'groceries', monthlyLimitCents: 0 };
    const progress = calculateBudgetProgress(zeroBudget, [], new Date(2026, 2, 15));
    expect(progress.percentUsed).toBe(0);
    expect(Number.isFinite(progress.percentUsed)).toBe(true);
  });
});

describe('transactionsInMonth', () => {
  it('filters to only the given calendar month', () => {
    const transactions = [
      tx({ id: 'a', date: '2026-03-01' }),
      tx({ id: 'b', date: '2026-03-31' }),
      tx({ id: 'c', date: '2026-04-01' }),
      tx({ id: 'd', date: '2026-02-28' }),
    ];
    const result = transactionsInMonth(transactions, 2026, 2); // March, 0-indexed
    expect(result.map((t) => t.id)).toEqual(['a', 'b']);
  });
});
