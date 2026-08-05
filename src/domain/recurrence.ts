import type { RecurringRule, Transaction } from '@/types';
import { generateId } from './id';

/**
 * Recurrence engine
 * -----------------
 * Generates the concrete dates a RecurringRule falls on within a window.
 * The tricky part is monthly/yearly recurrence: "the 31st of every month"
 * does not exist in February, and most calendar apps get the resulting
 * behavior subtly wrong by drifting the anchor day after the first clamp
 * (rule fires on the 31st, clamps to Feb 28, then incorrectly keeps
 * recurring on the 28th for the rest of the year instead of returning to
 * the 31st in March).
 *
 * The fix is to always compute each occurrence as an offset from the
 * ORIGINAL start date, never from the previous occurrence. That is what
 * `addMonthsClamped` + the `monthIndex` walk below does.
 */

function parseISODate(iso: string): Date {
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(year, (month ?? 1) - 1, day ?? 1);
}

function toISODate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/** Adds calendar months to `date`, clamping the day-of-month to the target month's length. */
function addMonthsClamped(date: Date, months: number): Date {
  const day = date.getDate();
  const firstOfTarget = new Date(date.getFullYear(), date.getMonth() + months, 1);
  const daysInTargetMonth = new Date(
    firstOfTarget.getFullYear(),
    firstOfTarget.getMonth() + 1,
    0
  ).getDate();
  firstOfTarget.setDate(Math.min(day, daysInTargetMonth));
  return firstOfTarget;
}

function startOfDay(date: Date): Date {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

/**
 * Returns every date the rule falls on within [rangeStart, rangeEnd]
 * (inclusive on both ends). Dates are returned in ascending order.
 */
export function generateOccurrences(rule: RecurringRule, rangeStart: Date, rangeEnd: Date): Date[] {
  if (rule.interval < 1) {
    throw new Error('RecurringRule.interval must be >= 1');
  }

  const start = startOfDay(parseISODate(rule.startDate));
  const from = startOfDay(rangeStart);
  const hardEnd = rule.endDate ? startOfDay(parseISODate(rule.endDate)) : null;
  const to = hardEnd && hardEnd < rangeEnd ? hardEnd : startOfDay(rangeEnd);

  const occurrences: Date[] = [];
  if (start > to) return occurrences;

  if (rule.frequency === 'daily' || rule.frequency === 'weekly') {
    const stepDays = rule.frequency === 'daily' ? rule.interval : rule.interval * 7;
    let cursor = start;
    if (cursor < from) {
      const elapsedDays = Math.floor((from.getTime() - cursor.getTime()) / 86_400_000);
      const stepsToSkip = Math.ceil(elapsedDays / stepDays);
      cursor = addDays(cursor, stepsToSkip * stepDays);
    }
    while (cursor <= to) {
      if (cursor >= from) occurrences.push(cursor);
      cursor = addDays(cursor, stepDays);
    }
    return occurrences;
  }

  // monthly / yearly: walk in units of the ORIGINAL start date, never the
  // previous occurrence, so a clamp in one month can't permanently shift
  // the anchor day (see module doc comment above).
  const monthsPerStep = rule.frequency === 'monthly' ? rule.interval : rule.interval * 12;
  let stepIndex = 0;
  let cursor = addMonthsClamped(start, 0);

  while (cursor < from) {
    stepIndex += 1;
    cursor = addMonthsClamped(start, stepIndex * monthsPerStep);
  }
  while (cursor <= to) {
    if (cursor >= from) occurrences.push(cursor);
    stepIndex += 1;
    cursor = addMonthsClamped(start, stepIndex * monthsPerStep);
  }

  return occurrences;
}

/** Human-readable summary used in forms and the upcoming-recurring widget. */
export function describeRecurrence(rule: Pick<RecurringRule, 'frequency' | 'interval'>): string {
  const { frequency, interval } = rule;
  const unit = frequency.slice(0, -2); // "monthly" -> "month", "daily" -> "d" (handled below)
  if (frequency === 'daily') return interval === 1 ? 'Every day' : `Every ${interval} days`;
  if (frequency === 'weekly') return interval === 1 ? 'Every week' : `Every ${interval} weeks`;
  if (frequency === 'monthly') return interval === 1 ? 'Every month' : `Every ${interval} months`;
  return interval === 1 ? 'Every year' : `Every ${interval} ${unit}s`;
}

export interface MaterializationResult {
  newTransactions: Transaction[];
  updatedRules: RecurringRule[];
}

/**
 * Converts due occurrences (start of rule -> asOf) into real Transaction
 * rows, the same way a bank auto-posts a recurring bill. Idempotent: rules
 * track `lastMaterializedDate`, so calling this repeatedly (e.g. on every
 * app load) never creates duplicate transactions.
 */
export function materializeDueTransactions(
  rules: RecurringRule[],
  asOf: Date,
  nowIso: string
): MaterializationResult {
  const newTransactions: Transaction[] = [];
  const updatedRules: RecurringRule[] = [];

  for (const rule of rules) {
    if (rule.isPaused) continue;

    const rangeStart = rule.lastMaterializedDate
      ? addDays(parseISODate(rule.lastMaterializedDate), 1)
      : parseISODate(rule.startDate);

    const occurrences = generateOccurrences(rule, rangeStart, asOf);
    if (occurrences.length === 0) continue;

    for (const date of occurrences) {
      newTransactions.push({
        id: generateId(),
        type: rule.type,
        amountCents: rule.amountCents,
        categoryId: rule.categoryId,
        description: rule.description,
        date: toISODate(date),
        recurringRuleId: rule.id,
        createdAt: nowIso,
        updatedAt: nowIso,
      });
    }

    const lastDate = occurrences[occurrences.length - 1];
    if (lastDate) {
      updatedRules.push({ ...rule, lastMaterializedDate: toISODate(lastDate) });
    }
  }

  return { newTransactions, updatedRules };
}

/**
 * Preview of what's coming up, WITHOUT materializing anything — used by
 * the dashboard's "Upcoming" widget. Purely a read of the future.
 */
export function previewUpcoming(
  rules: RecurringRule[],
  fromDate: Date,
  horizonDays: number
): { rule: RecurringRule; date: Date }[] {
  const toDate = addDays(fromDate, horizonDays);
  const results: { rule: RecurringRule; date: Date }[] = [];

  for (const rule of rules) {
    if (rule.isPaused) continue;
    const occurrences = generateOccurrences(rule, fromDate, toDate);
    for (const date of occurrences) {
      results.push({ rule, date });
    }
  }

  return results.sort((a, b) => a.date.getTime() - b.date.getTime());
}

export { toISODate, parseISODate };
