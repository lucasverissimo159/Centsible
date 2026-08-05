import { describe, expect, it } from 'vitest';
import {
  describeRecurrence,
  generateOccurrences,
  materializeDueTransactions,
  previewUpcoming,
  toISODate,
} from '../recurrence';
import type { RecurringRule } from '@/types';

function rule(overrides: Partial<RecurringRule>): RecurringRule {
  return {
    id: 'r1',
    type: 'expense',
    amountCents: 1000,
    categoryId: 'cat-1',
    description: 'Test rule',
    frequency: 'monthly',
    interval: 1,
    startDate: '2024-01-01',
    ...overrides,
  };
}

const iso = (dates: Date[]) => dates.map(toISODate);

describe('generateOccurrences — daily/weekly', () => {
  it('generates every day in range for a daily rule', () => {
    const r = rule({ frequency: 'daily', interval: 1, startDate: '2026-03-01' });
    const result = generateOccurrences(r, new Date(2026, 2, 1), new Date(2026, 2, 5));
    expect(iso(result)).toEqual(['2026-03-01', '2026-03-02', '2026-03-03', '2026-03-04', '2026-03-05']);
  });

  it('respects an interval greater than 1 ("every 2 weeks")', () => {
    const r = rule({ frequency: 'weekly', interval: 2, startDate: '2026-01-05' }); // a Monday
    const result = generateOccurrences(r, new Date(2026, 0, 1), new Date(2026, 1, 28));
    expect(iso(result)).toEqual(['2026-01-05', '2026-01-19', '2026-02-02', '2026-02-16']);
  });

  it('fast-forwards correctly when the range starts long after the rule start date', () => {
    const r = rule({ frequency: 'daily', interval: 3, startDate: '2026-01-01' });
    const result = generateOccurrences(r, new Date(2026, 5, 1), new Date(2026, 5, 10));
    // Every 3rd day from Jan 1: ... confirm every returned date is a multiple of 3 days from start.
    for (const d of result) {
      const diffDays = Math.round((d.getTime() - new Date(2026, 0, 1).getTime()) / 86_400_000);
      expect(diffDays % 3).toBe(0);
    }
    expect(result.length).toBeGreaterThan(0);
  });
});

describe('generateOccurrences — monthly clamping', () => {
  it('clamps the 31st to the last day of shorter months, then RETURNS to the 31st when the month allows it', () => {
    const r = rule({ frequency: 'monthly', interval: 1, startDate: '2024-01-31' });
    const result = generateOccurrences(r, new Date(2024, 0, 1), new Date(2024, 5, 30));
    // 2024 is a leap year, so Feb has 29 days.
    expect(iso(result)).toEqual([
      '2024-01-31',
      '2024-02-29',
      '2024-03-31', // <- must snap back to 31, not drift to 28/29 forever
      '2024-04-30',
      '2024-05-31',
      '2024-06-30',
    ]);
  });

  it('clamps Feb 29 (yearly) to Feb 28 on non-leap years and back to Feb 29 on leap years', () => {
    const r = rule({ frequency: 'yearly', interval: 1, startDate: '2024-02-29' });
    const result = generateOccurrences(r, new Date(2024, 0, 1), new Date(2029, 0, 1));
    expect(iso(result)).toEqual([
      '2024-02-29',
      '2025-02-28',
      '2026-02-28',
      '2027-02-28',
      '2028-02-29', // next leap year
    ]);
  });

  it('supports "every 3 months" starting mid-month', () => {
    const r = rule({ frequency: 'monthly', interval: 3, startDate: '2026-01-15' });
    const result = generateOccurrences(r, new Date(2026, 0, 1), new Date(2026, 11, 31));
    expect(iso(result)).toEqual(['2026-01-15', '2026-04-15', '2026-07-15', '2026-10-15']);
  });

  it('is inclusive of both range boundaries', () => {
    const r = rule({ frequency: 'monthly', interval: 1, startDate: '2026-01-01' });
    const result = generateOccurrences(r, new Date(2026, 0, 1), new Date(2026, 0, 1));
    expect(iso(result)).toEqual(['2026-01-01']);
  });

  it('stops at an explicit endDate even if the query range extends further', () => {
    const r = rule({
      frequency: 'monthly',
      interval: 1,
      startDate: '2026-01-01',
      endDate: '2026-03-01',
    });
    const result = generateOccurrences(r, new Date(2026, 0, 1), new Date(2026, 11, 31));
    expect(iso(result)).toEqual(['2026-01-01', '2026-02-01', '2026-03-01']);
  });

  it('returns nothing when the range is entirely before the start date', () => {
    const r = rule({ frequency: 'monthly', interval: 1, startDate: '2026-06-01' });
    const result = generateOccurrences(r, new Date(2026, 0, 1), new Date(2026, 2, 1));
    expect(result).toEqual([]);
  });

  it('throws for an invalid interval of 0', () => {
    const r = rule({ interval: 0 });
    expect(() => generateOccurrences(r, new Date(2026, 0, 1), new Date(2026, 1, 1))).toThrow();
  });
});

describe('materializeDueTransactions', () => {
  it('creates one transaction per due occurrence and advances lastMaterializedDate', () => {
    const r = rule({ frequency: 'monthly', interval: 1, startDate: '2026-01-01' });
    const { newTransactions, updatedRules } = materializeDueTransactions(
      [r],
      new Date(2026, 2, 15), // as of March 15
      '2026-03-15T00:00:00.000Z'
    );
    expect(newTransactions.map((t) => t.date)).toEqual(['2026-01-01', '2026-02-01', '2026-03-01']);
    expect(updatedRules[0]?.lastMaterializedDate).toBe('2026-03-01');
  });

  it('is idempotent: re-running with the same asOf date materializes nothing new', () => {
    const r = rule({ frequency: 'monthly', interval: 1, startDate: '2026-01-01', lastMaterializedDate: '2026-03-01' });
    const { newTransactions, updatedRules } = materializeDueTransactions([r], new Date(2026, 2, 15), '2026-03-15T00:00:00.000Z');
    expect(newTransactions).toEqual([]);
    expect(updatedRules).toEqual([]);
  });

  it('skips paused rules entirely', () => {
    const r = rule({ frequency: 'daily', interval: 1, startDate: '2026-01-01', isPaused: true });
    const { newTransactions } = materializeDueTransactions([r], new Date(2026, 0, 10), '2026-01-10T00:00:00.000Z');
    expect(newTransactions).toEqual([]);
  });

  it('stamps generated transactions with the recurringRuleId and the rule amount/category', () => {
    const r = rule({ frequency: 'monthly', interval: 1, startDate: '2026-01-01', amountCents: 250000, categoryId: 'rent' });
    const { newTransactions } = materializeDueTransactions([r], new Date(2026, 0, 1), '2026-01-01T00:00:00.000Z');
    expect(newTransactions[0]).toMatchObject({
      recurringRuleId: 'r1',
      amountCents: 250000,
      categoryId: 'rent',
    });
  });
});

describe('previewUpcoming', () => {
  it('lists occurrences within the horizon without mutating any rule', () => {
    const r = rule({ frequency: 'weekly', interval: 1, startDate: '2026-01-01' });
    const upcoming = previewUpcoming([r], new Date(2026, 0, 1), 14);
    expect(upcoming.length).toBe(3); // Jan 1, 8, 15
    expect(r.lastMaterializedDate).toBeUndefined();
  });

  it('sorts occurrences from multiple rules chronologically', () => {
    const rentRule = rule({ id: 'rent', frequency: 'monthly', interval: 1, startDate: '2026-01-01', description: 'Rent' });
    const gymRule = rule({ id: 'gym', frequency: 'weekly', interval: 1, startDate: '2026-01-03', description: 'Gym' });
    const upcoming = previewUpcoming([rentRule, gymRule], new Date(2026, 0, 1), 10);
    const dates = upcoming.map((u) => toISODate(u.date));
    expect(dates).toEqual([...dates].sort());
  });
});

describe('describeRecurrence', () => {
  it('produces a natural-language summary', () => {
    expect(describeRecurrence({ frequency: 'daily', interval: 1 })).toBe('Every day');
    expect(describeRecurrence({ frequency: 'weekly', interval: 2 })).toBe('Every 2 weeks');
    expect(describeRecurrence({ frequency: 'monthly', interval: 1 })).toBe('Every month');
    expect(describeRecurrence({ frequency: 'yearly', interval: 1 })).toBe('Every year');
  });
});
