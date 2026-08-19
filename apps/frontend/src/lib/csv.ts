/**
 * Formats a date value into DD-MM-YYYY format in Asia/Kolkata (IST) for frontend CSV exports.
 * Returns an empty string for null, undefined, or invalid date values.
 */
export function formatCsvDate(value: string | Date | null | undefined): string {
  if (!value) return '';

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return '';

    // Fast path if input is already YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      const [yyyy, mm, dd] = trimmed.split('-');
      return `${dd}-${mm}-${yyyy}`;
    }

    // Fast path if input is already DD-MM-YYYY
    if (/^\d{2}-\d{2}-\d{4}$/.test(trimmed)) {
      return trimmed;
    }
  }

  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '';

  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    const parts = formatter.formatToParts(d);
    const dd = parts.find((p) => p.type === 'day')?.value.padStart(2, '0') || '01';
    const mm = parts.find((p) => p.type === 'month')?.value.padStart(2, '0') || '01';
    const yyyy = parts.find((p) => p.type === 'year')?.value || '1970';
    return `${dd}-${mm}-${yyyy}`;
  } catch {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${dd}-${mm}-${yyyy}`;
  }
}
