import { describe, expect, it } from 'vitest';
import { parseImportedTransactions, transactionsToCSV } from '../importExport';
import type { Category, Transaction } from '@/types';

const categories: Category[] = [
  { id: 'cat-groceries', name: 'Groceries', color: '#000', icon: 'shopping-cart', kind: 'expense' },
  { id: 'cat-salary', name: 'Salary', color: '#111', icon: 'briefcase', kind: 'income' },
];

describe('parseImportedTransactions — this app\'s own export format', () => {
  it('round-trips a CSV produced by transactionsToCSV', () => {
    const categoryMap = new Map(categories.map((c) => [c.id, c]));
    const original: Transaction[] = [
      {
        id: 't1',
        type: 'expense',
        amountCents: 4599,
        categoryId: 'cat-groceries',
        description: 'Whole Foods, weekly run',
        date: '2026-03-05',
        createdAt: '2026-03-05T00:00:00.000Z',
        updatedAt: '2026-03-05T00:00:00.000Z',
      },
    ];
    const csv = transactionsToCSV(original, categoryMap);
    const result = parseImportedTransactions(csv, categories);

    expect(result.skippedRows).toBe(0);
    expect(result.transactions).toHaveLength(1);
    expect(result.transactions[0]).toMatchObject({
      type: 'expense',
      amountCents: 4599,
      categoryId: 'cat-groceries',
      description: 'Whole Foods, weekly run',
      date: '2026-03-05',
    });
  });
});

describe('parseImportedTransactions — bank-style export (no type column, signed amount)', () => {
  it('infers expense from a negative amount and income from a positive one', () => {
    const csv = 'date,description,category,amount\n3/5/2026,Grocery run,Groceries,-45.99\n3/1/2026,Paycheck,Salary,3000.00';
    const result = parseImportedTransactions(csv, categories);
    expect(result.transactions[0]).toMatchObject({ type: 'expense', amountCents: 4599, date: '2026-03-05' });
    expect(result.transactions[1]).toMatchObject({ type: 'income', amountCents: 300000, date: '2026-03-01' });
  });
});

describe('parseImportedTransactions — resilience', () => {
  it('skips rows with an unparseable date or amount instead of throwing', () => {
    const csv = 'date,amount,category\nnot-a-date,10.00,Groceries\n2026-03-05,not-a-number,Groceries\n2026-03-06,25.00,Groceries';
    const result = parseImportedTransactions(csv, categories);
    expect(result.transactions).toHaveLength(1);
    expect(result.skippedRows).toBe(2);
  });

  it('falls back unmatched category names to "cat-other" and reports the count', () => {
    const csv = 'date,amount,category\n2026-03-05,10.00,Some Unknown Category';
    const result = parseImportedTransactions(csv, categories);
    expect(result.transactions[0]?.categoryId).toBe('cat-other');
    expect(result.unmatchedCategoryRows).toBe(1);
  });
});
