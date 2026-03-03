/**
 * Format a UTC timestamp string into event-local time using an IANA timezone.
 * Uses Intl.DateTimeFormat — zero dependencies.
 *
 * @param utcTimestamp  ISO 8601 UTC string, e.g. "2025-10-30T14:23:00Z" or "2025-10-30 14:23:00"
 * @param timezoneIana  IANA timezone, e.g. "America/Los_Angeles"
 * @returns formatted local time/date parts
 */

/** Short time label for chart axes: "HH:MM" in event-local time */
export function formatLocalTimeLabel(utcTimestamp: string, timezoneIana: string): string {
  try {
    const d = parseUtc(utcTimestamp);
    return new Intl.DateTimeFormat('en-US', {
      timeZone: timezoneIana,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(d);
  } catch {
    // Fallback: slice HH:MM from the raw string
    return utcTimestamp.length >= 16 ? utcTimestamp.slice(11, 16) : utcTimestamp;
  }
}

/** Date string in event-local time: "YYYY-MM-DD" */
export function formatLocalDate(utcTimestamp: string, timezoneIana: string): string {
  try {
    const d = parseUtc(utcTimestamp);
    return new Intl.DateTimeFormat('sv-SE', {
      timeZone: timezoneIana,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(d);
  } catch {
    return utcTimestamp.slice(0, 10);
  }
}

/** Full local datetime: "MM/DD HH:MM" for tooltips */
export function formatLocalDateTime(utcTimestamp: string, timezoneIana: string): string {
  try {
    const d = parseUtc(utcTimestamp);
    return new Intl.DateTimeFormat('en-US', {
      timeZone: timezoneIana,
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(d);
  } catch {
    return utcTimestamp.slice(0, 16).replace('T', ' ');
  }
}

/** Parse a UTC timestamp string, handling both "...Z" and "... " (space) formats */
function parseUtc(ts: string): Date {
  // Ensure it's treated as UTC: append Z if not present and no timezone offset
  let s = ts.trim();
  if (!s.endsWith('Z') && !/[+-]\d{2}:\d{2}$/.test(s)) {
    s = s.replace(' ', 'T');
    if (!s.endsWith('Z')) s += 'Z';
  }
  return new Date(s);
}
