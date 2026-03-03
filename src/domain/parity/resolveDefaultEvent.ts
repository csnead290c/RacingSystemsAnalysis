import type { EventWithStats } from '../../services/parityApi';

/**
 * Get today's date string (YYYY-MM-DD) in a given IANA timezone.
 * Uses Intl.DateTimeFormat for zero-dependency timezone resolution.
 */
export function todayInTimezone(tz: string): string {
  try {
    // sv-SE locale gives YYYY-MM-DD format natively
    return new Intl.DateTimeFormat('sv-SE', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  } catch {
    // Bad timezone — fall back to UTC
    return new Date().toISOString().slice(0, 10);
  }
}

/**
 * Pick the best default event from a list:
 *   A) Ongoing event — today (in the event's local timezone) falls between
 *      start_date_local and end_date_local inclusive.
 *   B) Most recently completed — end_date_local <= today, pick latest end_date_local.
 *   C) Closest prior start — start_date_local <= today, pick latest start_date_local.
 *   D) Final fallback — last chronological event (latest start_date_local).
 *
 * Each event carries timezone_iana so "today" is evaluated per-event.
 */
export function resolveDefaultEvent(events: EventWithStats[]): EventWithStats | null {
  if (events.length === 0) return null;

  // A) Ongoing event — today in the event's local timezone is between start and end (inclusive)
  const ongoing = events.find(e => {
    const localToday = todayInTimezone(e.timezone_iana);
    return e.start_date_local <= localToday && e.end_date_local >= localToday;
  });
  if (ongoing) return ongoing;

  // B) Most recently completed: end_date_local <= today, pick latest end_date_local
  const completed = events
    .filter(e => {
      const localToday = todayInTimezone(e.timezone_iana);
      return e.end_date_local <= localToday;
    })
    .sort((a, b) => b.end_date_local.localeCompare(a.end_date_local));
  if (completed.length > 0) return completed[0];

  // C) Closest prior start_date_local: start_date_local <= today, pick latest start_date_local
  const priorStart = events
    .filter(e => {
      const localToday = todayInTimezone(e.timezone_iana);
      return e.start_date_local <= localToday;
    })
    .sort((a, b) => b.start_date_local.localeCompare(a.start_date_local));
  if (priorStart.length > 0) return priorStart[0];

  // D) Final fallback: last chronological event (latest start_date_local)
  const sorted = [...events].sort((a, b) => b.start_date_local.localeCompare(a.start_date_local));
  return sorted[0];
}
