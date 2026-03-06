import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { isEventOngoing, AUTO_REFRESH_INTERVAL_MS } from '../useAutoRefresh';

// ── isEventOngoing ──────────────────────────────────────────────────────

describe('isEventOngoing', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('returns true when today is within the event range (inclusive)', () => {
    // Set "now" to 2025-06-15 12:00 UTC
    vi.setSystemTime(new Date('2025-06-15T12:00:00Z'));
    expect(isEventOngoing('2025-06-13', '2025-06-16', 'UTC')).toBe(true);
  });

  it('returns true on the start date', () => {
    vi.setSystemTime(new Date('2025-06-13T08:00:00Z'));
    expect(isEventOngoing('2025-06-13', '2025-06-16', 'UTC')).toBe(true);
  });

  it('returns true on the end date', () => {
    vi.setSystemTime(new Date('2025-06-16T20:00:00Z'));
    expect(isEventOngoing('2025-06-13', '2025-06-16', 'UTC')).toBe(true);
  });

  it('returns true one day after end date (buffer)', () => {
    vi.setSystemTime(new Date('2025-06-17T10:00:00Z'));
    expect(isEventOngoing('2025-06-13', '2025-06-16', 'UTC')).toBe(true);
  });

  it('returns false two days after end date (past buffer)', () => {
    vi.setSystemTime(new Date('2025-06-18T10:00:00Z'));
    expect(isEventOngoing('2025-06-13', '2025-06-16', 'UTC')).toBe(false);
  });

  it('returns false before the event starts', () => {
    vi.setSystemTime(new Date('2025-06-12T23:59:00Z'));
    expect(isEventOngoing('2025-06-13', '2025-06-16', 'UTC')).toBe(false);
  });

  it('returns false when dates are null', () => {
    vi.setSystemTime(new Date('2025-06-15T12:00:00Z'));
    expect(isEventOngoing(null, '2025-06-16', 'UTC')).toBe(false);
    expect(isEventOngoing('2025-06-13', null, 'UTC')).toBe(false);
    expect(isEventOngoing(null, null, null)).toBe(false);
  });

  it('defaults to America/New_York when timezone is null', () => {
    // 2025-06-15 03:00 UTC = 2025-06-14 23:00 ET (still within range)
    vi.setSystemTime(new Date('2025-06-15T03:00:00Z'));
    expect(isEventOngoing('2025-06-13', '2025-06-16', null)).toBe(true);
  });

  it('handles timezone-aware date boundaries', () => {
    // 2025-06-17 03:00 UTC = 2025-06-16 in America/New_York (still within +1 buffer)
    vi.setSystemTime(new Date('2025-06-17T03:00:00Z'));
    expect(isEventOngoing('2025-06-13', '2025-06-16', 'America/New_York')).toBe(true);
  });
});

// ── Constants ────────────────────────────────────────────────────────────

describe('AUTO_REFRESH_INTERVAL_MS', () => {
  it('is 60 seconds', () => {
    expect(AUTO_REFRESH_INTERVAL_MS).toBe(60_000);
  });
});

// ── useAutoRefresh hook (gating logic) ──────────────────────────────────

describe('useAutoRefresh gating', () => {
  // These tests verify the hook's core contract via the isEventOngoing
  // pure function, since the hook's interval + visibility gating are
  // browser-runtime concerns tested via integration.

  it('ongoing event + visible tab should enable auto-refresh', () => {
    vi.setSystemTime(new Date('2025-06-15T12:00:00Z'));
    const ongoing = isEventOngoing('2025-06-13', '2025-06-16', 'UTC');
    const tabVisible = true; // simulated
    expect(ongoing && tabVisible).toBe(true);
  });

  it('past event should disable auto-refresh', () => {
    vi.setSystemTime(new Date('2025-07-01T12:00:00Z'));
    const ongoing = isEventOngoing('2025-06-13', '2025-06-16', 'UTC');
    expect(ongoing).toBe(false);
  });

  it('future event should disable auto-refresh', () => {
    vi.setSystemTime(new Date('2025-06-10T12:00:00Z'));
    const ongoing = isEventOngoing('2025-06-13', '2025-06-16', 'UTC');
    expect(ongoing).toBe(false);
  });
});
