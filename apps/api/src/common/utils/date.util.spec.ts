import { formatCsvDate } from './date.util';

describe('date.util - formatCsvDate', () => {
  it('formats YYYY-MM-DD string into DD-MM-YYYY', () => {
    expect(formatCsvDate('2026-08-19')).toBe('19-08-2026');
  });

  it('formats ISO timestamp preserving IST timezone boundary (18:30 UTC = 00:00 IST next day)', () => {
    // 2026-08-18T19:00:00.000Z is 00:30 AM IST on Aug 19, 2026
    const isoDate = '2026-08-18T19:00:00.000Z';
    expect(formatCsvDate(isoDate)).toBe('19-08-2026');
  });

  it('pads single-digit day and month with leading zeroes', () => {
    const d = new Date('2026-01-05T10:00:00.000Z');
    expect(formatCsvDate(d)).toBe('05-01-2026');
  });

  it('returns empty string for null, undefined, or empty values', () => {
    expect(formatCsvDate(null)).toBe('');
    expect(formatCsvDate(undefined)).toBe('');
    expect(formatCsvDate('')).toBe('');
    expect(formatCsvDate('   ')).toBe('');
  });

  it('returns empty string for invalid date values', () => {
    expect(formatCsvDate('invalid-date')).toBe('');
  });
});
