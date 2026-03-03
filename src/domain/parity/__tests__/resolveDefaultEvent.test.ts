import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { resolveDefaultEvent, todayInTimezone } from '../resolveDefaultEvent';
import type { EventWithStats } from '../../../services/parityApi';

/** Helper to build a minimal EventWithStats stub */
function mkEvent(overrides: Partial<EventWithStats> & { id: number; start_date_local: string; end_date_local: string; timezone_iana: string }): EventWithStats {
  return {
    event_name: `Event ${overrides.id}`,
    event_code: null,
    season_year: 2025,
    track_id: 1,
    track_name: 'Test Track',
    city: null,
    state: null,
    race_lookup: `2025${String(overrides.id).padStart(4, '0')}`,
    created_at: '2025-01-01T00:00:00Z',
    run_count: 100,
    weather_sample_count: 50,
    ...overrides,
  };
}

describe('todayInTimezone', () => {
  it('returns YYYY-MM-DD format', () => {
    const result = todayInTimezone('America/New_York');
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('falls back to UTC for invalid timezone', () => {
    const result = todayInTimezone('Invalid/Timezone');
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('handles timezone boundary — same instant can be different dates', () => {
    // This just validates it doesn't throw; actual date depends on wall clock
    const eastern = todayInTimezone('America/New_York');
    const pacific = todayInTimezone('America/Los_Angeles');
    const tokyo = todayInTimezone('Asia/Tokyo');
    expect(eastern).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(pacific).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(tokyo).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('resolveDefaultEvent', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  /** Pin "now" to a specific UTC instant so todayInTimezone is deterministic */
  function pinNow(isoUtc: string) {
    vi.useFakeTimers({ now: new Date(isoUtc) });
  }

  it('returns null for empty list', () => {
    expect(resolveDefaultEvent([])).toBeNull();
  });

  it('picks ongoing event when today is between start and end', () => {
    // Pin to 2025-06-20 12:00 UTC → in US/Eastern that's 2025-06-20
    pinNow('2025-06-20T12:00:00Z');

    const events = [
      mkEvent({ id: 1, start_date_local: '2025-06-01', end_date_local: '2025-06-05', timezone_iana: 'America/New_York' }),
      mkEvent({ id: 2, start_date_local: '2025-06-18', end_date_local: '2025-06-22', timezone_iana: 'America/New_York' }),
      mkEvent({ id: 3, start_date_local: '2025-07-10', end_date_local: '2025-07-14', timezone_iana: 'America/New_York' }),
    ];

    const result = resolveDefaultEvent(events);
    expect(result?.id).toBe(2);
  });

  it('picks most recently completed event when no ongoing', () => {
    // Pin to 2025-06-25 12:00 UTC → no event is ongoing
    pinNow('2025-06-25T12:00:00Z');

    const events = [
      mkEvent({ id: 1, start_date_local: '2025-06-01', end_date_local: '2025-06-05', timezone_iana: 'America/New_York' }),
      mkEvent({ id: 2, start_date_local: '2025-06-18', end_date_local: '2025-06-22', timezone_iana: 'America/New_York' }),
      mkEvent({ id: 3, start_date_local: '2025-07-10', end_date_local: '2025-07-14', timezone_iana: 'America/New_York' }),
    ];

    const result = resolveDefaultEvent(events);
    // Event 2 ended 2025-06-22, which is < 2025-06-25 → most recently completed
    expect(result?.id).toBe(2);
  });

  it('picks most recently completed even when events are in random order', () => {
    pinNow('2025-08-01T12:00:00Z');

    const events = [
      mkEvent({ id: 3, start_date_local: '2025-07-10', end_date_local: '2025-07-14', timezone_iana: 'America/New_York' }),
      mkEvent({ id: 1, start_date_local: '2025-06-01', end_date_local: '2025-06-05', timezone_iana: 'America/New_York' }),
      mkEvent({ id: 2, start_date_local: '2025-06-18', end_date_local: '2025-06-22', timezone_iana: 'America/New_York' }),
    ];

    const result = resolveDefaultEvent(events);
    expect(result?.id).toBe(3); // latest end_date
  });

  it('step D fallback: all events in the future picks latest start_date_local', () => {
    // Step C (closest prior start) is a safety net — if A ongoing and B completed
    // both miss, step C catches events whose start <= today. In practice, any event
    // with start <= today either has end >= today (step A) or end < today (step B).
    // So this test exercises step D: all future, no prior start.
    pinNow('2025-05-01T12:00:00Z');

    const events = [
      mkEvent({ id: 1, start_date_local: '2025-06-01', end_date_local: '2025-06-05', timezone_iana: 'America/New_York' }),
      mkEvent({ id: 2, start_date_local: '2025-06-18', end_date_local: '2025-06-22', timezone_iana: 'America/New_York' }),
      mkEvent({ id: 3, start_date_local: '2025-07-10', end_date_local: '2025-07-14', timezone_iana: 'America/New_York' }),
    ];

    const result = resolveDefaultEvent(events);
    expect(result?.id).toBe(3); // latest start_date_local
  });

  it('step D: all-future fallback picks latest start_date_local', () => {
    pinNow('2025-01-01T12:00:00Z');

    const events = [
      mkEvent({ id: 2, start_date_local: '2025-06-18', end_date_local: '2025-06-22', timezone_iana: 'America/New_York' }),
      mkEvent({ id: 1, start_date_local: '2025-06-01', end_date_local: '2025-06-05', timezone_iana: 'America/New_York' }),
    ];

    const result = resolveDefaultEvent(events);
    expect(result?.id).toBe(2); // latest start_date regardless of input order
  });

  it('step B: end_date_local == today counts as completed (picked over future events)', () => {
    // Pin to 2025-06-22 — event 2 ends today, event 3 is in the future
    pinNow('2025-06-22T20:00:00Z');

    const events = [
      mkEvent({ id: 1, start_date_local: '2025-06-01', end_date_local: '2025-06-05', timezone_iana: 'America/New_York' }),
      mkEvent({ id: 2, start_date_local: '2025-06-18', end_date_local: '2025-06-22', timezone_iana: 'America/New_York' }),
      mkEvent({ id: 3, start_date_local: '2025-07-10', end_date_local: '2025-07-14', timezone_iana: 'America/New_York' }),
    ];

    // 2025-06-22 20:00 UTC = 2025-06-22 16:00 ET → end_date_local == today
    // Step A: event 2 has start <= today AND end >= today → it's ongoing!
    // So step A catches it.
    const result = resolveDefaultEvent(events);
    expect(result?.id).toBe(2);
  });

  it('handles timezone edge case — event day end in Pacific but already next day in Eastern', () => {
    // Pin to 2025-06-23 03:00 UTC
    // In America/New_York: 2025-06-22 23:00 → still June 22
    // In America/Los_Angeles: 2025-06-22 20:00 → still June 22
    pinNow('2025-06-23T03:00:00Z');

    const evEastern = mkEvent({ id: 1, start_date_local: '2025-06-18', end_date_local: '2025-06-22', timezone_iana: 'America/New_York' });
    const evPacific = mkEvent({ id: 2, start_date_local: '2025-06-18', end_date_local: '2025-06-22', timezone_iana: 'America/Los_Angeles' });

    // Both should still be ongoing since in both timezones it's still June 22
    const result1 = resolveDefaultEvent([evEastern]);
    expect(result1?.id).toBe(1);

    const result2 = resolveDefaultEvent([evPacific]);
    expect(result2?.id).toBe(2);
  });

  it('handles timezone edge case — event ended in Eastern but still ongoing in Pacific', () => {
    // Pin to 2025-06-23 06:00 UTC
    // In America/New_York: 2025-06-23 02:00 → June 23 → event ended
    // In America/Los_Angeles: 2025-06-22 23:00 → June 22 → still ongoing!
    pinNow('2025-06-23T06:00:00Z');

    const evEastern = mkEvent({ id: 1, start_date_local: '2025-06-18', end_date_local: '2025-06-22', timezone_iana: 'America/New_York' });
    const evPacific = mkEvent({ id: 2, start_date_local: '2025-06-18', end_date_local: '2025-06-22', timezone_iana: 'America/Los_Angeles' });

    // Pacific event should be picked as ongoing
    const result = resolveDefaultEvent([evEastern, evPacific]);
    expect(result?.id).toBe(2);
  });

  it('single event — always returns it', () => {
    pinNow('2025-01-01T12:00:00Z');
    const events = [mkEvent({ id: 99, start_date_local: '2025-12-01', end_date_local: '2025-12-05', timezone_iana: 'America/Chicago' })];
    expect(resolveDefaultEvent(events)?.id).toBe(99);
  });
});
