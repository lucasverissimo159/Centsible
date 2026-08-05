import { describe, expect, it } from 'vitest';
import { parseCSV, parseCSVWithHeader, serializeCSV } from '../csv';

describe('parseCSV', () => {
  it('parses simple unquoted rows', () => {
    expect(parseCSV('a,b,c\n1,2,3')).toEqual([
      ['a', 'b', 'c'],
      ['1', '2', '3'],
    ]);
  });

  it('handles a quoted field containing a comma', () => {
    expect(parseCSV('name,note\nRent,"Paid late, with fee"')).toEqual([
      ['name', 'note'],
      ['Rent', 'Paid late, with fee'],
    ]);
  });

  it('handles an escaped quote ("") inside a quoted field', () => {
    expect(parseCSV('note\n"She said ""hello"""')).toEqual([['note'], ['She said "hello"']]);
  });

  it('handles a quoted field containing a newline', () => {
    expect(parseCSV('note\n"line one\nline two"')).toEqual([['note'], ['line one\nline two']]);
  });

  it('handles CRLF line endings', () => {
    expect(parseCSV('a,b\r\n1,2\r\n3,4')).toEqual([
      ['a', 'b'],
      ['1', '2'],
      ['3', '4'],
    ]);
  });

  it('returns an empty array for an empty string', () => {
    expect(parseCSV('')).toEqual([]);
  });
});

describe('serializeCSV', () => {
  it('quotes a field only when it needs it', () => {
    const csv = serializeCSV([
      ['plain', 'has,comma', 'has"quote'],
    ]);
    expect(csv).toBe('plain,"has,comma","has""quote"');
  });

  it('round-trips arbitrary data through serialize -> parse', () => {
    const original = [
      ['date', 'description', 'amount'],
      ['2026-03-01', 'Coffee, latte', '4.50'],
      ['2026-03-02', 'Rent (March) "on time"', '1200.00'],
    ];
    const roundTripped = parseCSV(serializeCSV(original));
    expect(roundTripped).toEqual(original);
  });
});

describe('parseCSVWithHeader', () => {
  it('maps each row to an object keyed by the header', () => {
    const result = parseCSVWithHeader('date,amount\n2026-01-01,10.00\n2026-01-02,20.00');
    expect(result).toEqual([
      { date: '2026-01-01', amount: '10.00' },
      { date: '2026-01-02', amount: '20.00' },
    ]);
  });

  it('returns an empty array when there is no header row', () => {
    expect(parseCSVWithHeader('')).toEqual([]);
  });
});
