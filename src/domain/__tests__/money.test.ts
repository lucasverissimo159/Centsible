import { describe, expect, it } from 'vitest';
import { centsToDecimalString, formatMoney, formatSignedAmount, parseAmountToCents, sumCents } from '../money';

describe('parseAmountToCents', () => {
  it('converts a plain decimal string to cents', () => {
    expect(parseAmountToCents('12.50')).toBe(1250);
    expect(parseAmountToCents('12')).toBe(1200);
    expect(parseAmountToCents('0.01')).toBe(1);
  });

  it('strips thousands separators', () => {
    expect(parseAmountToCents('1,234.56')).toBe(123456);
  });

  it('rejects malformed input instead of silently guessing', () => {
    expect(parseAmountToCents('')).toBeNull();
    expect(parseAmountToCents('abc')).toBeNull();
    expect(parseAmountToCents('12.5.6')).toBeNull();
    expect(parseAmountToCents('12.999')).toBeNull(); // more than 2 decimal places
  });

  it('supports negative amounts', () => {
    expect(parseAmountToCents('-42.00')).toBe(-4200);
  });
});

describe('centsToDecimalString', () => {
  it('formats cents back to a 2-decimal string', () => {
    expect(centsToDecimalString(1250)).toBe('12.50');
    expect(centsToDecimalString(5)).toBe('0.05');
  });
});

describe('formatMoney', () => {
  it('formats cents as localized currency', () => {
    expect(formatMoney(105099, 'en-US', 'USD')).toBe('$1,050.99');
  });
});

describe('formatSignedAmount', () => {
  it('prefixes income with a plus sign and expense with a minus sign', () => {
    expect(formatSignedAmount(5000, 'income', 'en-US', 'USD')).toBe('+$50.00');
    expect(formatSignedAmount(5000, 'expense', 'en-US', 'USD')).toBe('\u2212$50.00');
  });

  it('ignores the sign of the input cents value — direction comes from `type`, not from negative numbers', () => {
    expect(formatSignedAmount(-5000, 'income', 'en-US', 'USD')).toBe('+$50.00');
  });
});

describe('sumCents', () => {
  it('sums a list of integer cent values without float drift', () => {
    // The classic float trap: 0.1 + 0.2 !== 0.3 in decimal dollars.
    // In integer cents there is no such trap.
    expect(sumCents([10, 20, 30])).toBe(60);
    expect(sumCents([])).toBe(0);
  });
});
