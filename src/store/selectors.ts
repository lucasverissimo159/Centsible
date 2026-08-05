import type { Category, CategoryTotal, MonthlyTotal, Transaction } from '@/types';

export function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function monthLabel(key: string, locale: string): string {
  const [year, month] = key.split('-').map(Number);
  const date = new Date(year ?? 0, (month ?? 1) - 1, 1);
  return new Intl.DateTimeFormat(locale, { month: 'short', year: 'numeric' }).format(date);
}

export interface SummaryFigures {
  balanceCents: number;
  monthIncomeCents: number;
  monthExpenseCents: number;
  savingsRatePercent: number | null;
}

/** All-time net balance plus this-month income/expense/savings-rate. */
export function selectSummary(transactions: Transaction[], referenceDate: Date): SummaryFigures {
  const key = monthKey(referenceDate);

  let balanceCents = 0;
  let monthIncomeCents = 0;
  let monthExpenseCents = 0;

  for (const t of transactions) {
    const signedAmount = t.type === 'income' ? t.amountCents : -t.amountCents;
    balanceCents += signedAmount;
    if (t.date.startsWith(key)) {
      if (t.type === 'income') monthIncomeCents += t.amountCents;
      else monthExpenseCents += t.amountCents;
    }
  }

  const savingsRatePercent =
    monthIncomeCents > 0 ? ((monthIncomeCents - monthExpenseCents) / monthIncomeCents) * 100 : null;

  return { balanceCents, monthIncomeCents, monthExpenseCents, savingsRatePercent };
}

/** Expense-only breakdown by category for one calendar month, sorted largest first. */
export function selectCategoryTotals(
  transactions: Transaction[],
  referenceDate: Date
): CategoryTotal[] {
  const key = monthKey(referenceDate);
  const totals = new Map<string, number>();
  let grandTotal = 0;

  for (const t of transactions) {
    if (t.type !== 'expense' || !t.date.startsWith(key)) continue;
    totals.set(t.categoryId, (totals.get(t.categoryId) ?? 0) + t.amountCents);
    grandTotal += t.amountCents;
  }

  return Array.from(totals.entries())
    .map(([categoryId, totalCents]) => ({
      categoryId,
      totalCents,
      percentOfTotal: grandTotal > 0 ? (totalCents / grandTotal) * 100 : 0,
    }))
    .sort((a, b) => b.totalCents - a.totalCents);
}

/** Income vs. expense totals for the last `monthsCount` months, oldest first (chart-ready). */
export function selectMonthlyTrend(
  transactions: Transaction[],
  referenceDate: Date,
  monthsCount: number
): MonthlyTotal[] {
  const buckets = new Map<string, MonthlyTotal>();
  for (let i = monthsCount - 1; i >= 0; i -= 1) {
    const d = new Date(referenceDate.getFullYear(), referenceDate.getMonth() - i, 1);
    const key = monthKey(d);
    buckets.set(key, { month: key, incomeCents: 0, expenseCents: 0 });
  }

  for (const t of transactions) {
    const bucket = buckets.get(t.date.slice(0, 7));
    if (!bucket) continue;
    if (t.type === 'income') bucket.incomeCents += t.amountCents;
    else bucket.expenseCents += t.amountCents;
  }

  return Array.from(buckets.values());
}

export function selectCategoryMap(categories: Category[]): Map<string, Category> {
  return new Map(categories.map((c) => [c.id, c]));
}

export interface TransactionFilters {
  searchText?: string;
  type?: 'income' | 'expense' | 'all';
  categoryId?: string | 'all';
  dateFrom?: string;
  dateTo?: string;
}

export function selectFilteredTransactions(
  transactions: Transaction[],
  filters: TransactionFilters
): Transaction[] {
  const search = filters.searchText?.trim().toLowerCase();
  return transactions.filter((t) => {
    if (filters.type && filters.type !== 'all' && t.type !== filters.type) return false;
    if (filters.categoryId && filters.categoryId !== 'all' && t.categoryId !== filters.categoryId) return false;
    if (filters.dateFrom && t.date < filters.dateFrom) return false;
    if (filters.dateTo && t.date > filters.dateTo) return false;
    if (search && !t.description.toLowerCase().includes(search) && !t.notes?.toLowerCase().includes(search)) {
      return false;
    }
    return true;
  });
}

export type TransactionSortField = 'date' | 'amount' | 'description';
export type SortDirection = 'asc' | 'desc';

export function selectSortedTransactions(
  transactions: Transaction[],
  field: TransactionSortField,
  direction: SortDirection
): Transaction[] {
  const sorted = [...transactions].sort((a, b) => {
    let comparison = 0;
    if (field === 'date') comparison = a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt);
    else if (field === 'amount') comparison = a.amountCents - b.amountCents;
    else comparison = a.description.localeCompare(b.description);
    return direction === 'asc' ? comparison : -comparison;
  });
  return sorted;
}
