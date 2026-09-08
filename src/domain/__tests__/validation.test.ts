import { describe, expect, it } from 'vitest';
import { createEmptyState } from '@/domain/seedData';
import { validateAppState } from '../validation';

describe('validateAppState', () => {
  it('accepts a valid empty state', () => {
    expect(validateAppState(createEmptyState()).valid).toBe(true);
  });

  it('rejects transactions with unknown categories', () => {
    const state = createEmptyState();
    const result = validateAppState({
      ...state,
      transactions: [{
        id: 't1',
        type: 'expense',
        amountCents: 100,
        categoryId: 'missing',
        description: 'Invalid',
        date: '2026-03-05',
        createdAt: '2026-03-05T00:00:00.000Z',
        updatedAt: '2026-03-05T00:00:00.000Z',
      }],
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('A transaction has invalid fields.');
  });

  it('rejects impossible calendar dates and duplicate ids', () => {
    const state = createEmptyState();
    const transaction = {
      id: 't1',
      type: 'expense' as const,
      amountCents: 100,
      categoryId: state.categories[0]!.id,
      description: 'Invalid',
      date: '2026-02-31',
      createdAt: '2026-03-05T00:00:00.000Z',
      updatedAt: '2026-03-05T00:00:00.000Z',
    };
    const result = validateAppState({ ...state, transactions: [transaction, transaction] });
    expect(result.valid).toBe(false);
  });
});