export const BUSINESS_TIMEZONE = 'Asia/Kolkata';
export const BUSINESS_TZ_OFFSET = '+05:30';

export interface ISTDateParts {
  year: number;
  month: number;
  day: number;
}

/**
 * Returns year, month (1-12), and day (1-31) in Asia/Kolkata timezone.
 */
export function getISTDateParts(date: Date = new Date()): ISTDateParts {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: BUSINESS_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = formatter.formatToParts(date);
  const year = parseInt(parts.find((p) => p.type === 'year')?.value || '1970', 10);
  const month = parseInt(parts.find((p) => p.type === 'month')?.value || '1', 10);
  const day = parseInt(parts.find((p) => p.type === 'day')?.value || '1', 10);
  return { year, month, day };
}

/**
 * Converts a YYYY-MM-DD string (or ISO string) into start of day (00:00:00.000) in Asia/Kolkata.
 */
export function getStartOfBusinessDay(dateStr?: string, fallbackDate: Date = new Date()): Date {
  if (!dateStr) {
    const { year, month, day } = getISTDateParts(fallbackDate);
    const mStr = String(month).padStart(2, '0');
    const dStr = String(day).padStart(2, '0');
    return new Date(`${year}-${mStr}-${dStr}T00:00:00.000${BUSINESS_TZ_OFFSET}`);
  }
  if (dateStr.includes('T')) {
    return new Date(dateStr);
  }
  return new Date(`${dateStr}T00:00:00.000${BUSINESS_TZ_OFFSET}`);
}

/**
 * Converts a YYYY-MM-DD string (or ISO string) into end of day (23:59:59.999) in Asia/Kolkata.
 */
export function getEndOfBusinessDay(dateStr?: string, fallbackDate: Date = new Date()): Date {
  if (!dateStr) {
    const { year, month, day } = getISTDateParts(fallbackDate);
    const mStr = String(month).padStart(2, '0');
    const dStr = String(day).padStart(2, '0');
    return new Date(`${year}-${mStr}-${dStr}T23:59:59.999${BUSINESS_TZ_OFFSET}`);
  }
  if (dateStr.includes('T')) {
    return new Date(dateStr);
  }
  return new Date(`${dateStr}T23:59:59.999${BUSINESS_TZ_OFFSET}`);
}

/**
 * Calculates previous comparison period without off-by-one errors.
 * For full calendar month (1st of month to last of month), returns full previous calendar month.
 * For custom range, returns exact immediately preceding equivalent-duration range.
 */
export function getPreviousPeriod(startDate: Date, endDate: Date): { prevStartDate: Date; prevEndDate: Date } {
  const startParts = getISTDateParts(startDate);
  const endParts = getISTDateParts(endDate);

  const lastDayOfStartMonth = new Date(startParts.year, startParts.month, 0).getDate();
  const isFullMonth =
    startParts.day === 1 &&
    endParts.day === lastDayOfStartMonth &&
    startParts.month === endParts.month &&
    startParts.year === endParts.year;

  if (isFullMonth) {
    const prevYear = startParts.month === 1 ? startParts.year - 1 : startParts.year;
    const prevMonth = startParts.month === 1 ? 12 : startParts.month - 1;
    const prevMonthStr = String(prevMonth).padStart(2, '0');
    const lastDayPrevMonth = new Date(prevYear, prevMonth, 0).getDate();
    const lastDayPrevMonthStr = String(lastDayPrevMonth).padStart(2, '0');

    const prevStartDate = new Date(`${prevYear}-${prevMonthStr}-01T00:00:00.000${BUSINESS_TZ_OFFSET}`);
    const prevEndDate = new Date(`${prevYear}-${prevMonthStr}-${lastDayPrevMonthStr}T23:59:59.999${BUSINESS_TZ_OFFSET}`);
    return { prevStartDate, prevEndDate };
  }

  // Exact equivalent duration calculation
  const diffMs = endDate.getTime() - startDate.getTime() + 1;
  const durationDays = Math.round(diffMs / (24 * 60 * 60 * 1000));
  const prevEndDate = new Date(startDate.getTime() - 1);
  const prevStartDate = new Date(startDate.getTime() - durationDays * 24 * 60 * 60 * 1000);
  return { prevStartDate, prevEndDate };
}
