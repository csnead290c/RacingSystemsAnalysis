/**
 * Tests for event range resolution helper and RefreshEventData response shape.
 */
import { describe, it, expect } from 'vitest';
import {
  resolveEventRange,
  EVENT_RANGE_FALLBACK_DAYS,
  type EventRangeInput,
} from '../eventRange';
import type { RefreshEventDataResponse, RefreshStepResult } from '../../../services/parityApi';

// ── resolveEventRange ────────────────────────────────────────────────────

describe('resolveEventRange', () => {
  it('uses start and end dates as-is when both present and in the past', () => {
    const event: EventRangeInput = {
      start_date_local: '2025-10-30',
      end_date_local: '2025-11-02',
      timezone_iana: 'America/New_York',
    };
    const result = resolveEventRange(event, '2026-01-01');
    expect(result.startLocal).toBe('2025-10-30');
    expect(result.endLocal).toBe('2025-11-02');
    expect(result.timezone).toBe('America/New_York');
    expect(result.fallbackApplied).toBe(false);
    expect(result.cappedToToday).toBe(false);
  });

  it('applies fallback of +4 days when end_date_local is null', () => {
    const event: EventRangeInput = {
      start_date_local: '2025-10-30',
      end_date_local: null,
      timezone_iana: 'America/Denver',
    };
    const result = resolveEventRange(event, '2026-01-01');
    expect(result.startLocal).toBe('2025-10-30');
    expect(result.endLocal).toBe('2025-11-03'); // +4 days
    expect(result.fallbackApplied).toBe(true);
    expect(result.cappedToToday).toBe(false);
  });

  it('applies fallback when end_date_local is empty string', () => {
    const event: EventRangeInput = {
      start_date_local: '2025-02-20',
      end_date_local: '',
      timezone_iana: 'US/Eastern',
    };
    const result = resolveEventRange(event, '2026-01-01');
    expect(result.endLocal).toBe('2025-02-24'); // +4 days
    expect(result.fallbackApplied).toBe(true);
  });

  it('caps end_date_local to today when event is in the future', () => {
    const event: EventRangeInput = {
      start_date_local: '2026-03-01',
      end_date_local: '2026-03-04',
      timezone_iana: 'America/Chicago',
    };
    const result = resolveEventRange(event, '2026-03-02');
    expect(result.endLocal).toBe('2026-03-02');
    expect(result.cappedToToday).toBe(true);
    expect(result.fallbackApplied).toBe(false);
  });

  it('applies both fallback and cap when end is missing and start is recent', () => {
    const event: EventRangeInput = {
      start_date_local: '2026-02-28',
      end_date_local: null,
      timezone_iana: 'America/Los_Angeles',
    };
    // Fallback would be 2026-03-04, but today is 2026-03-01
    const result = resolveEventRange(event, '2026-03-01');
    expect(result.endLocal).toBe('2026-03-01');
    expect(result.fallbackApplied).toBe(true);
    expect(result.cappedToToday).toBe(true);
  });

  it('does not cap when end equals today', () => {
    const event: EventRangeInput = {
      start_date_local: '2025-12-28',
      end_date_local: '2025-12-31',
      timezone_iana: 'America/New_York',
    };
    const result = resolveEventRange(event, '2025-12-31');
    expect(result.endLocal).toBe('2025-12-31');
    expect(result.cappedToToday).toBe(false);
  });

  it('fallback constant is 4 days', () => {
    expect(EVENT_RANGE_FALLBACK_DAYS).toBe(4);
  });
});

// ── RefreshEventDataResponse shape ───────────────────────────────────────

describe('RefreshEventDataResponse type shape', () => {
  it('validates a well-formed response', () => {
    const response: RefreshEventDataResponse = {
      ok: true,
      event_id: 104,
      event_name: 'In-N-Out Burger NHRA Finals',
      range: { startLocal: '2025-10-30', endLocal: '2025-11-02', timezone: 'America/New_York' },
      timing: { fetched: 2204, inserted: 0, deduped: 2204, errors: [] },
      tempest: { daysFetched: 4, inserted: 192, deduped: 0, errors: [] },
      open_meteo: { fetched: 96, inserted: 96, deduped: 0, errors: [] },
      canonical: { bucketsProcessed: 200, errors: [] },
      duration_ms: 12345,
    };

    expect(response.ok).toBe(true);
    expect(response.event_id).toBe(104);
    expect(response.range.startLocal).toBe('2025-10-30');
    expect(response.timing.fetched).toBe(2204);
    expect(response.tempest.daysFetched).toBe(4);
    expect(response.open_meteo.inserted).toBe(96);
    expect(response.canonical.bucketsProcessed).toBe(200);
    expect(response.duration_ms).toBeGreaterThan(0);
  });

  it('validates a response with errors in some steps', () => {
    const response: RefreshEventDataResponse = {
      ok: true,
      event_id: 50,
      event_name: 'Test Event',
      range: { startLocal: '2025-06-01', endLocal: '2025-06-04', timezone: 'US/Eastern' },
      timing: { fetched: 0, inserted: 0, deduped: 0, errors: ['No valid race_lookup on event'] },
      tempest: { daysFetched: 4, inserted: 100, deduped: 0, errors: [] },
      open_meteo: { fetched: 0, inserted: 0, deduped: 0, errors: ['Track has no lat/lon coordinates'] },
      canonical: { bucketsProcessed: 50, errors: [] },
      duration_ms: 5000,
    };

    expect(response.timing.errors).toHaveLength(1);
    expect(response.open_meteo.errors).toHaveLength(1);
    expect(response.tempest.errors).toHaveLength(0);
  });

  it('RefreshStepResult allows optional numeric fields', () => {
    // Timing step has fetched/inserted/deduped
    const timing: RefreshStepResult = { fetched: 100, inserted: 50, deduped: 50, errors: [] };
    expect(timing.daysFetched).toBeUndefined();
    expect(timing.bucketsProcessed).toBeUndefined();

    // Canonical step has bucketsProcessed
    const canonical: RefreshStepResult = { bucketsProcessed: 200, errors: [] };
    expect(canonical.fetched).toBeUndefined();
    expect(canonical.inserted).toBeUndefined();
  });
});
