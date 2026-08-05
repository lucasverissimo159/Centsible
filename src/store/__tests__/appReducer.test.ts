import { describe, expect, it } from 'vitest';
import { appReducer } from '../appReducer';
import { createEmptyState } from '@/domain/seedData';
import type { AppState, Transaction } from '@/types';

function baseState(): AppState {
  const state = createEmptyState();
  return {
    ...state,
    categories: [
      { id: 'cat-groceries', name: 'Groceries', color: '#000', icon: 'shopping-cart', kind: 'expense' },
      { id: 'cat-other', name: 'Other', color: '#111', icon: 'tag', kind: 'both' },
    ],
  };
}

function tx(overrides: Partial<Transaction>): Transaction {
  return {
    id: 't1',
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

describe('DELETE_CATEGORY', () => {
  it('removes the category and reassigns its transactions to the fallback category', () => {
    const state: AppState = { ...baseState(), transactions: [tx({})] };
    const next = appReducer(state, {
      type: 'DELETE_CATEGORY',
      payload: { id: 'cat-groceries', fallbackCategoryId: 'cat-other' },
    });
    expect(next.categories.find((c) => c.id === 'cat-groceries')).toBeUndefined();
    expect(next.transactions[0]?.categoryId).toBe('cat-other');
  });

  it('removes any budget tied to the deleted category rather than reassigning it', () => {
    const state: AppState = {
      ...baseState(),
      budgets: [{ id: 'b1', categoryId: 'cat-groceries', monthlyLimitCents: 10000 }],
    };
    const next = appReducer(state, {
      type: 'DELETE_CATEGORY',
      payload: { id: 'cat-groceries', fallbackCategoryId: 'cat-other' },
    });
    expect(next.budgets).toEqual([]);
  });

  it('refuses to delete the fallback category itself (no-op)', () => {
    const state = baseState();
    const next = appReducer(state, {
      type: 'DELETE_CATEGORY',
      payload: { id: 'cat-other', fallbackCategoryId: 'cat-other' },
    });
    expect(next).toBe(state);
  });
});

describe('SET_BUDGET', () => {
  it('adds a new budget when none exists for the category', () => {
    const state = baseState();
    const next = appReducer(state, {
      type: 'SET_BUDGET',
      payload: { id: 'b1', categoryId: 'cat-groceries', monthlyLimitCents: 50000 },
    });
    expect(next.budgets).toHaveLength(1);
  });

  it('upserts (replaces) the existing budget for that category instead of duplicating it', () => {
    const state: AppState = {
      ...baseState(),
      budgets: [{ id: 'b1', categoryId: 'cat-groceries', monthlyLimitCents: 50000 }],
    };
    const next = appReducer(state, {
      type: 'SET_BUDGET',
      payload: { id: 'b1', categoryId: 'cat-groceries', monthlyLimitCents: 70000 },
    });
    expect(next.budgets).toHaveLength(1);
    expect(next.budgets[0]?.monthlyLimitCents).toBe(70000);
  });
});

describe('BULK_DELETE_TRANSACTIONS', () => {
  it('removes exactly the given ids', () => {
    const state: AppState = {
      ...baseState(),
      transactions: [tx({ id: 'a' }), tx({ id: 'b' }), tx({ id: 'c' })],
    };
    const next = appReducer(state, { type: 'BULK_DELETE_TRANSACTIONS', payload: { ids: ['a', 'c'] } });
    expect(next.transactions.map((t) => t.id)).toEqual(['b']);
  });
});

describe('MATERIALIZE_RECURRING', () => {
  it('is a no-op (same state reference) when there is nothing new to materialize', () => {
    const state = baseState();
    const next = appReducer(state, {
      type: 'MATERIALIZE_RECURRING',
      payload: { newTransactions: [], updatedRules: [] },
    });
    expect(next).toBe(state);
  });
});
