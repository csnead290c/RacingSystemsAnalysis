import { describe, it, expect } from 'vitest';
import {
  formatLocalTimeLabel,
  formatLocalDate,
  formatLocalDateTime,
} from '../formatLocalTime';

// Use deterministic UTC timestamps so tests don't depend on wall clock.

describe('formatLocalTimeLabel', () => {
  it('converts UTC to Pacific local time (HH:MM)', () => {
    // 2025-10-30T20:00:00Z = 1:00 PM PDT (UTC-7, Oct is still DST)
    const result = formatLocalTimeLabel('2025-10-30T20:00:00Z', 'America/Los_Angeles');
    expect(result).toBe('13:00');
  });

  it('converts UTC to Eastern local time', () => {
    // 2025-10-30T20:00:00Z = 4:00 PM EDT (UTC-4, Oct is still DST until Nov 2)
    const result = formatLocalTimeLabel('2025-10-30T20:00:00Z', 'America/New_York');
    expect(result).toBe('16:00');
  });

  it('converts UTC to Central local time', () => {
    // 2025-03-15T18:30:00Z = 1:30 PM CDT (UTC-5, March 15 is in DST)
    const result = formatLocalTimeLabel('2025-03-15T18:30:00Z', 'America/Chicago');
    expect(result).toBe('13:30');
  });

  it('handles space-separated timestamps (no T, no Z)', () => {
    const result = formatLocalTimeLabel('2025-10-30 20:00:00', 'America/Los_Angeles');
    expect(result).toBe('13:00');
  });

  it('falls back to slicing on invalid timezone', () => {
    const result = formatLocalTimeLabel('2025-10-30T20:00:00Z', 'Invalid/Zone');
    // Should not throw; returns fallback
    expect(result).toMatch(/\d{2}:\d{2}/);
  });
});

describe('formatLocalDate', () => {
  it('returns YYYY-MM-DD in event-local time', () => {
    // 2025-10-31T03:00:00Z = Oct 30 in Pacific (UTC-7)
    const result = formatLocalDate('2025-10-31T03:00:00Z', 'America/Los_Angeles');
    expect(result).toBe('2025-10-30');
  });

  it('respects timezone for date boundary', () => {
    // 2025-10-31T03:00:00Z = Oct 31 in Eastern (UTC-4, still EDT)
    const result = formatLocalDate('2025-10-31T03:00:00Z', 'America/New_York');
    expect(result).toBe('2025-10-30');
  });

  it('handles UTC midnight correctly', () => {
    // 2025-10-30T00:00:00Z = Oct 29 in Pacific
    const result = formatLocalDate('2025-10-30T00:00:00Z', 'America/Los_Angeles');
    expect(result).toBe('2025-10-29');
  });
});

describe('formatLocalDateTime', () => {
  it('returns MM/DD HH:MM in event-local time', () => {
    const result = formatLocalDateTime('2025-10-30T20:15:00Z', 'America/Los_Angeles');
    expect(result).toBe('10/30, 13:15');
  });

  it('handles Eastern timezone', () => {
    const result = formatLocalDateTime('2025-10-30T20:15:00Z', 'America/New_York');
    expect(result).toBe('10/30, 16:15');
  });
});
