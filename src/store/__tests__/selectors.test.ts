import { describe, expect, it } from 'vitest';
import { selectCategoryTotals, selectMonthlyTrend, selectSummary } from '../selectors';
import type { Transaction } from '@/types';

function tx(overrides: Partial<Transaction>): Transaction {
  return {
    id: Math.random().toString(36),
    type: 'expense',
    amountCents: 1000,
    categoryId: 'cat-groceries',
    description: 'Test',
    date: '2026-03-10',
    createdAt: '2026-03-10T00:00:00.000Z',
    updatedAt: '2026-03-10T00:00:00.000Z',
    ...overrides,
  };
}

const march15 = new Date(2026, 2, 15);

describe('selectSummary', () => {
  it('computes all-time balance and this-month income/expense separately', () => {
    const transactions = [
      tx({ type: 'income', amountCents: 500000, date: '2026-01-05' }), // outside current month
      tx({ type: 'income', amountCents: 300000, date: '2026-03-01' }),
      tx({ type: 'expense', amountCents: 100000, date: '2026-03-05' }),
    ];
    const summary = selectSummary(transactions, march15);
    expect(summary.balanceCents).toBe(500000 + 300000 - 100000);
    expect(summary.monthIncomeCents).toBe(300000);
    expect(summary.monthExpenseCents).toBe(100000);
  });

  it('computes savings rate as (income - expense) / income * 100', () => {
    const transactions = [
      tx({ type: 'income', amountCents: 100000, date: '2026-03-01' }),
      tx({ type: 'expense', amountCents: 75000, date: '2026-03-02' }),
    ];
    const summary = selectSummary(transactions, march15);
    expect(summary.savingsRatePercent).toBeCloseTo(25);
  });

  it('returns a null savings rate when there is no income this month, instead of NaN or Infinity', () => {
    const summary = selectSummary([tx({ type: 'expense', date: '2026-03-01' })], march15);
    expect(summary.savingsRatePercent).toBeNull();
  });
});

describe('selectCategoryTotals', () => {
  it('only includes expenses from the reference month, and computes percent of total', () => {
    const transactions = [
      tx({ categoryId: 'a', amountCents: 3000, date: '2026-03-01' }),
      tx({ categoryId: 'b', amountCents: 1000, date: '2026-03-02' }),
      tx({ categoryId: 'a', amountCents: 9999, date: '2026-02-01' }), // different month, excluded
      tx({ categoryId: 'a', amountCents: 9999, type: 'income', date: '2026-03-03' }), // income, excluded
    ];
    const totals = selectCategoryTotals(transactions, march15);
    expect(totals).toEqual([
      { categoryId: 'a', totalCents: 3000, percentOfTotal: 75 },
      { categoryId: 'b', totalCents: 1000, percentOfTotal: 25 },
    ]);
  });
});

describe('selectMonthlyTrend', () => {
  it('returns exactly `monthsCount` buckets in chronological order, even for empty months', () => {
    const trend = selectMonthlyTrend([], march15, 3);
    expect(trend.map((b) => b.month)).toEqual(['2026-01', '2026-02', '2026-03']);
  });

  it('buckets income and expense separately per month', () => {
    const transactions = [
      tx({ type: 'income', amountCents: 5000, date: '2026-02-10' }),
      tx({ type: 'expense', amountCents: 2000, date: '2026-02-15' }),
      tx({ type: 'expense', amountCents: 1000, date: '2026-03-01' }),
    ];
    const trend = selectMonthlyTrend(transactions, march15, 2);
    expect(trend).toEqual([
      { month: '2026-02', incomeCents: 5000, expenseCents: 2000 },
      { month: '2026-03', incomeCents: 0, expenseCents: 1000 },
    ]);
  });
});
