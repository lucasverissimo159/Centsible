/**
 * A small RFC 4180 -ish CSV reader/writer. `String.split(',')` breaks the
 * instant a description field contains a comma ("Dinner, drinks & a movie"),
 * which is exactly the kind of free-text field a transaction description
 * is. This walks the string char-by-char and tracks quote state instead,
 * so it correctly handles: quoted fields, commas inside quoted fields,
 * escaped quotes (`""` inside a quoted field), and \r\n / \n line endings.
 */

export function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  let i = 0;
  const length = text.length;

  while (i < length) {
    const char = text[i];

    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i += 1;
        continue;
      }
      field += char;
      i += 1;
      continue;
    }

    switch (char) {
      case '"':
        inQuotes = true;
        i += 1;
        break;
      case ',':
        row.push(field);
        field = '';
        i += 1;
        break;
      case '\r':
        i += 1;
        break;
      case '\n':
        row.push(field);
        rows.push(row);
        row = [];
        field = '';
        i += 1;
        break;
      default:
        field += char;
        i += 1;
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows.filter((r) => !(r.length === 1 && r[0] === ''));
}

function needsQuoting(value: string): boolean {
  return /[",\n\r]/.test(value);
}

export function serializeCSV(rows: (string | number)[][]): string {
  return rows
    .map((row) =>
      row
        .map((cell) => {
          const str = String(cell);
          return needsQuoting(str) ? `"${str.replace(/"/g, '""')}"` : str;
        })
        .join(',')
    )
    .join('\r\n');
}

/** Parses rows into objects keyed by the header row (first row). */
export function parseCSVWithHeader(text: string): Record<string, string>[] {
  const [header, ...rows] = parseCSV(text);
  if (!header) return [];
  return rows.map((row) => {
    const record: Record<string, string> = {};
    header.forEach((key, index) => {
      record[key.trim()] = row[index]?.trim() ?? '';
    });
    return record;
  });
}
