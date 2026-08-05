/**
 * All money in the app is an integer number of cents. These are the only
 * functions allowed to convert between that representation and a decimal
 * value a human types or reads.
 */

/** Parses a user-typed decimal string ("12.5", "12", "-3.40") into cents. */
export function parseAmountToCents(input: string): number | null {
  const trimmed = input.trim().replace(/,/g, '');
  if (trimmed === '' || Number.isNaN(Number(trimmed))) return null;
  if (!/^-?\d+(\.\d{1,2})?$/.test(trimmed)) return null;
  const value = Number(trimmed);
  return Math.round(value * 100);
}

/** Cents -> decimal number, for feeding back into a numeric <input>. */
export function centsToDecimalString(cents: number): string {
  return (cents / 100).toFixed(2);
}

const formatterCache = new Map<string, Intl.NumberFormat>();

function getFormatter(locale: string, currency: string): Intl.NumberFormat {
  const key = `${locale}|${currency}`;
  let formatter = formatterCache.get(key);
  if (!formatter) {
    formatter = new Intl.NumberFormat(locale, { style: 'currency', currency });
    formatterCache.set(key, formatter);
  }
  return formatter;
}

/** Formats cents as a localized currency string, e.g. 105099 -> "$1,050.99". */
export function formatMoney(cents: number, locale: string, currency: string): string {
  return getFormatter(locale, currency).format(cents / 100);
}

/**
 * Formats cents with an explicit sign and no currency symbol, for contexts
 * (ledger rows) where the emerald/wine ink color already carries the
 * income/expense meaning and a $ sign on every line would be noise.
 */
export function formatSignedAmount(
  cents: number,
  type: 'income' | 'expense',
  locale: string,
  currency: string
): string {
  const magnitude = getFormatter(locale, currency).format(Math.abs(cents) / 100);
  return type === 'income' ? `+${magnitude}` : `−${magnitude}`;
}

export function sumCents(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

const symbolCache = new Map<string, string>();

/** Returns just the currency symbol ("$", "€", "R$"), e.g. for compact chart axis labels. */
export function getCurrencySymbol(locale: string, currency: string): string {
  const key = `${locale}|${currency}`;
  let symbol = symbolCache.get(key);
  if (symbol === undefined) {
    const parts = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).formatToParts(0);
    symbol = parts.find((p) => p.type === 'currency')?.value ?? '';
    symbolCache.set(key, symbol);
  }
  return symbol;
}
