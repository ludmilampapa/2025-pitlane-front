// Shared Argentina timezone utilities (America/Argentina/Buenos_Aires, UTC-3, no DST)
export const ARGENTINA_TZ = 'America/Argentina/Buenos_Aires';
export const ARGENTINA_OFFSET = '-03:00';

const ymdFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: ARGENTINA_TZ,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

const hhmmFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: ARGENTINA_TZ,
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

/**
 * Formats a Date (defaults to now) as YYYY-MM-DD in Argentina timezone.
 */
export function formatArgentinaYMD(date: Date = new Date()): string {
  return ymdFormatter.format(date);
}

/**
 * Formats a Date (defaults to now) as HH:mm (24h) in Argentina timezone.
 */
export function formatArgentinaHHMM(date: Date = new Date()): string {
  return hhmmFormatter.format(date);
}

/**
 * Strictly validates a YYYY-MM-DD calendar date (rejects e.g. 2026-02-31 or 2026-13-01).
 */
export function isValidYMD(ymd: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd.trim())) return false;
  const [y, m, d] = ymd.trim().split('-').map(Number);
  if (y < 1900 || y > 2100 || m < 1 || m > 12 || d < 1 || d > 31) return false;
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

/**
 * Strictly validates an HH:mm 24-hour time string.
 */
export function isValidHHMM(hhmm: string): boolean {
  if (!/^\d{2}:\d{2}$/.test(hhmm.trim())) return false;
  const [h, m] = hhmm.trim().split(':').map(Number);
  return h >= 0 && h <= 23 && m >= 0 && m <= 59;
}

/**
 * Converts a YYYY-MM-DD date and HH:mm time picked in Argentina time to a UTC ISO string.
 */
export function argentinaDateTimeToISO(ymd: string, hhmm: string): string {
  if (!isValidYMD(ymd) || !isValidHHMM(hhmm)) {
    throw new Error('Invalid date or time');
  }
  const normalizedTime = hhmm.length === 5 ? `${hhmm}:00` : hhmm;
  return new Date(`${ymd}T${normalizedTime}${ARGENTINA_OFFSET}`).toISOString();
}

/**
 * Adds (or subtracts) whole calendar days to a YYYY-MM-DD string using pure UTC date math.
 */
export function addDaysYMD(ymd: string, days: number): string {
  const [y, m, d] = ymd.split('-').map(Number);
  const dt = new Date(Date.UTC(y, (m || 1) - 1, (d || 1) + days));
  return dt.toISOString().slice(0, 10);
}

/**
 * Returns the YYYY-MM-DD of Monday for the week containing baseDate in Argentina timezone.
 */
export function getArgentinaMondayYMD(baseDate: Date = new Date()): string {
  const todayYMD = formatArgentinaYMD(baseDate);
  const [y, m, d] = todayYMD.split('-').map(Number);
  const utcDate = new Date(Date.UTC(y, (m || 1) - 1, d || 1));
  const day = utcDate.getUTCDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  return addDaysYMD(todayYMD, mondayOffset);
}

/**
 * Formats a pure YYYY-MM-DD calendar date for display in Argentina timezone without day-shift.
 */
export function formatYMDDisplay(
  ymd: string,
  locale = 'en-US',
  options?: Intl.DateTimeFormatOptions
): string {
  const date = new Date(`${ymd}T12:00:00${ARGENTINA_OFFSET}`);
  return date.toLocaleDateString(locale, {
    timeZone: ARGENTINA_TZ,
    ...options,
  });
}

/**
 * Formats any timestamp/Date as a date string in Argentina timezone.
 */
export function formatArgentinaDate(
  value: string | number | Date,
  locale = 'en-US',
  options?: Intl.DateTimeFormatOptions
): string {
  return new Date(value).toLocaleDateString(locale, {
    timeZone: ARGENTINA_TZ,
    ...options,
  });
}

/**
 * Formats any timestamp/Date as a time string in Argentina timezone.
 */
export function formatArgentinaTime(
  value: string | number | Date,
  locale = 'en-US',
  options?: Intl.DateTimeFormatOptions
): string {
  return new Date(value).toLocaleTimeString(locale, {
    timeZone: ARGENTINA_TZ,
    hour: '2-digit',
    minute: '2-digit',
    ...options,
  });
}

/**
 * Formats any timestamp/Date as a date+time string in Argentina timezone.
 */
export function formatArgentinaDateTime(
  value: string | number | Date,
  locale = 'en-US',
  options?: Intl.DateTimeFormatOptions
): string {
  return new Date(value).toLocaleString(locale, {
    timeZone: ARGENTINA_TZ,
    ...options,
  });
}
