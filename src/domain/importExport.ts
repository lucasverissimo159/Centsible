import type { Category, Transaction } from '@/types';
import { parseAmountToCents } from './money';
import { parseCSVWithHeader, serializeCSV } from './csv';
import { generateId } from './id';

const EXPORT_HEADER = ['date', 'type', 'category', 'description', 'amount', 'notes'];

export function transactionsToCSV(transactions: Transaction[], categoryMap: Map<string, Category>): string {
  const rows = transactions.map((t) => [
    t.date,
    t.type,
    categoryMap.get(t.categoryId)?.name ?? 'Other',
    t.description,
    (t.amountCents / 100).toFixed(2),
    t.notes ?? '',
  ]);
  return serializeCSV([EXPORT_HEADER, ...rows]);
}

/** Accepts "2026-03-05" (this app's own export format) or "3/5/2026" (common bank-export format). */
function normalizeDate(raw: string): string | null {
  const trimmed = raw.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  const usFormat = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (usFormat) {
    const [, month, day, year] = usFormat;
    return `${year}-${month?.padStart(2, '0')}-${day?.padStart(2, '0')}`;
  }
  return null;
}

export interface ImportResult {
  transactions: Transaction[];
  skippedRows: number;
  unmatchedCategoryRows: number;
}

/**
 * Parses a CSV into Transaction rows. Understands two shapes:
 *  1. This app's own export (explicit `type` + always-positive `amount`)
 *  2. A typical bank export (no `type` column; sign of `amount` implies it)
 * Unrecognized category names fall back to "Other" rather than failing the
 * whole row — a partial import you can clean up beats an all-or-nothing one.
 */
export function parseImportedTransactions(csvText: string, categories: Category[]): ImportResult {
  const rows = parseCSVWithHeader(csvText);
  const categoryIdByName = new Map(categories.map((c) => [c.name.trim().toLowerCase(), c.id]));

  const transactions: Transaction[] = [];
  let skippedRows = 0;
  let unmatchedCategoryRows = 0;
  const now = new Date().toISOString();

  for (const row of rows) {
    const date = normalizeDate(row.date ?? row.Date ?? '');
    const rawAmount = (row.amount ?? row.Amount ?? '').replace(/[^0-9.-]/g, '');
    const parsedAmount = date ? parseAmountToCents(rawAmount) : null;

    if (!date || parsedAmount === null || parsedAmount === 0) {
      skippedRows += 1;
      continue;
    }

    const typeRaw = (row.type ?? row.Type ?? '').trim().toLowerCase();
    const type = typeRaw === 'income' || typeRaw === 'expense' ? typeRaw : parsedAmount < 0 ? 'expense' : 'income';
    const amountCents = Math.abs(parsedAmount);

    const categoryNameRaw = (row.category ?? row.Category ?? '').trim();
    const matchedCategoryId = categoryIdByName.get(categoryNameRaw.toLowerCase());
    if (categoryNameRaw && !matchedCategoryId) unmatchedCategoryRows += 1;

    transactions.push({
      id: generateId(),
      type,
      amountCents,
      categoryId: matchedCategoryId ?? 'cat-other',
      description: (row.description ?? row.Description ?? '').trim() || 'Imported transaction',
      date,
      notes: (row.notes ?? row.Notes ?? '').trim() || undefined,
      createdAt: now,
      updatedAt: now,
    });
  }

  return { transactions, skippedRows, unmatchedCategoryRows };
}

export function downloadTextFile(filename: string, content: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
