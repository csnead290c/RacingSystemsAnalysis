/**
 * Event range resolution helper.
 *
 * Mirrors the PHP logic in handleRefreshEventData:
 * - Uses start_date_local and end_date_local as the event window.
 * - If end_date_local is missing, falls back to start + 4 days.
 * - Caps end to today in the event's timezone (no future weather).
 */

/** Default fallback days when end_date_local is missing. */
export const EVENT_RANGE_FALLBACK_DAYS = 4;

export interface EventRangeInput {
  start_date_local: string; // 'YYYY-MM-DD'
  end_date_local?: string | null; // 'YYYY-MM-DD' or missing
  timezone_iana: string;
}

export interface ResolvedEventRange {
  startLocal: string; // 'YYYY-MM-DD'
  endLocal: string;   // 'YYYY-MM-DD'
  timezone: string;
  fallbackApplied: boolean;
  cappedToToday: boolean;
}

/**
 * Resolve the effective event date range for refresh operations.
 *
 * @param event  Event with start/end dates and timezone
 * @param today  Override for "today" in the event's timezone (for testing). Defaults to actual today.
 */
export function resolveEventRange(
  event: EventRangeInput,
  today?: string,
): ResolvedEventRange {
  const startLocal = event.start_date_local;
  let endLocal = event.end_date_local || '';
  let fallbackApplied = false;
  let cappedToToday = false;

  // Fallback: if end_date_local is missing, use start + FALLBACK_DAYS
  if (!endLocal) {
    const start = new Date(startLocal + 'T00:00:00');
    start.setDate(start.getDate() + EVENT_RANGE_FALLBACK_DAYS);
    endLocal = start.toISOString().slice(0, 10);
    fallbackApplied = true;
  }

  // Cap end to today (can't fetch future weather)
  const todayStr = today ?? new Date().toISOString().slice(0, 10);
  if (endLocal > todayStr) {
    endLocal = todayStr;
    cappedToToday = true;
  }

  return {
    startLocal,
    endLocal,
    timezone: event.timezone_iana,
    fallbackApplied,
    cappedToToday,
  };
}
