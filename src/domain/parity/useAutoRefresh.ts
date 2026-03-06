import { useEffect, useRef, useState, useCallback } from 'react';

/** How often to auto-refetch visible data (ms). */
export const AUTO_REFRESH_INTERVAL_MS = 60_000; // 60 seconds

/**
 * Determines whether an event is "ongoing" based on its date range.
 * An event is ongoing if today (in the event's local timezone) falls
 * between start_date_local and end_date_local (inclusive, with +1 day buffer on end).
 */
export function isEventOngoing(
  startDateLocal: string | null | undefined,
  endDateLocal: string | null | undefined,
  timezoneIana: string | null | undefined,
): boolean {
  if (!startDateLocal || !endDateLocal) return false;
  try {
    // Get "today" in the event's timezone
    const tz = timezoneIana || 'America/New_York';
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' });
    const todayLocal = formatter.format(now); // YYYY-MM-DD

    // Add 1-day buffer on end (events often run past listed end date)
    const endDate = new Date(endDateLocal + 'T00:00:00');
    endDate.setDate(endDate.getDate() + 1);
    const endBuffered = endDate.toISOString().slice(0, 10);

    return todayLocal >= startDateLocal && todayLocal <= endBuffered;
  } catch {
    return false;
  }
}

/**
 * Hook that calls `onRefresh` at a fixed interval, gated by:
 *   1. `enabled` flag (caller controls — typically isEventOngoing)
 *   2. Tab is visible (document.visibilityState === 'visible')
 *   3. User hasn't toggled it off
 *
 * Returns { autoRefreshOn, toggleAutoRefresh, lastAutoRefreshAt }.
 */
export function useAutoRefresh(
  onRefresh: () => void | Promise<void>,
  enabled: boolean,
  intervalMs: number = AUTO_REFRESH_INTERVAL_MS,
): {
  autoRefreshOn: boolean;
  toggleAutoRefresh: () => void;
  lastAutoRefreshAt: number | null;
} {
  const [userEnabled, setUserEnabled] = useState(true);
  const [lastAutoRefreshAt, setLastAutoRefreshAt] = useState<number | null>(null);
  const onRefreshRef = useRef(onRefresh);
  onRefreshRef.current = onRefresh;

  const active = enabled && userEnabled;

  useEffect(() => {
    if (!active) return;

    let timer: ReturnType<typeof setInterval> | null = null;

    const tick = () => {
      if (document.visibilityState === 'visible') {
        setLastAutoRefreshAt(Date.now());
        onRefreshRef.current();
      }
    };

    timer = setInterval(tick, intervalMs);

    // Also listen for visibility changes — if tab becomes visible and enough
    // time passed, fire immediately
    const onVisChange = () => {
      // No-op: the interval will fire on next tick. We just ensure we don't
      // fire while hidden.
    };
    document.addEventListener('visibilitychange', onVisChange);

    return () => {
      if (timer) clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisChange);
    };
  }, [active, intervalMs]);

  const toggleAutoRefresh = useCallback(() => setUserEnabled(prev => !prev), []);

  return { autoRefreshOn: active, toggleAutoRefresh, lastAutoRefreshAt };
}
