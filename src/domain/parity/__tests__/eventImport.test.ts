/**
 * Tests for event bulk-import helpers:
 * - buildRaceLookup
 * - parseDateRange
 * - normalizeTrackName
 * - resolveTrack
 * - parseBulkCsv
 */
import { describe, it, expect } from 'vitest';
import {
  buildRaceLookup,
  normalizeTrackName,
  parseDateRange,
  resolveTrack,
  parseBulkCsv,
  type TrackRef,
  type ExistingEventRef,
} from '../eventImport';

// ── buildRaceLookup ─────────────────────────────────────────────────────

describe('buildRaceLookup', () => {
  it('converts ISO date to YYYYMMDD', () => {
    expect(buildRaceLookup('2025-10-30')).toBe('20251030');
  });

  it('passes through already-compact YYYYMMDD', () => {
    expect(buildRaceLookup('20251030')).toBe('20251030');
  });

  it('throws on invalid date', () => {
    expect(() => buildRaceLookup('Oct 30')).toThrow('Invalid date');
    expect(() => buildRaceLookup('')).toThrow('Invalid date');
    expect(() => buildRaceLookup('2025-1-3')).toThrow('Invalid date');
  });

  it('handles edge case: Jan 1', () => {
    expect(buildRaceLookup('2010-01-01')).toBe('20100101');
  });

  it('handles edge case: Dec 31', () => {
    expect(buildRaceLookup('2019-12-31')).toBe('20191231');
  });
});

// ── normalizeTrackName ──────────────────────────────────────────────────

describe('normalizeTrackName', () => {
  it('lowercases and strips punctuation', () => {
    expect(normalizeTrackName('Gainesville Raceway')).toBe('gainesville raceway');
  });

  it('handles smart quotes', () => {
    expect(normalizeTrackName("Brainerd Int'l Raceway")).toBe('brainerd intl raceway');
  });

  it('collapses whitespace', () => {
    expect(normalizeTrackName('  Auto   Club   Raceway  ')).toBe('auto club raceway');
  });

  it('strips special chars', () => {
    expect(normalizeTrackName('zMAX Dragway (Charlotte)')).toBe('zmax dragway charlotte');
  });

  it('returns empty for empty input', () => {
    expect(normalizeTrackName('')).toBe('');
  });
});

// ── parseDateRange ──────────────────────────────────────────────────────

describe('parseDateRange', () => {
  it('parses ISO single date', () => {
    expect(parseDateRange('2010-02-11')).toEqual({ start: '2010-02-11', end: null });
  });

  it('parses ISO range with "to"', () => {
    expect(parseDateRange('2010-02-11 to 2010-02-14')).toEqual({
      start: '2010-02-11', end: '2010-02-14',
    });
  });

  it('parses ISO range with en-dash', () => {
    expect(parseDateRange('2010-02-11–2010-02-14')).toEqual({
      start: '2010-02-11', end: '2010-02-14',
    });
  });

  it('parses "Month Day–Day, Year"', () => {
    expect(parseDateRange('February 11–14, 2010')).toEqual({
      start: '2010-02-11', end: '2010-02-14',
    });
  });

  it('parses "Mon Day-Day Year" (abbreviated, hyphen, no comma)', () => {
    expect(parseDateRange('Feb 11-14 2010')).toEqual({
      start: '2010-02-11', end: '2010-02-14',
    });
  });

  it('parses single "Month Day, Year"', () => {
    expect(parseDateRange('February 11, 2010')).toEqual({
      start: '2010-02-11', end: null,
    });
  });

  it('parses cross-month range', () => {
    expect(parseDateRange('Oct 30 – Nov 2, 2025')).toEqual({
      start: '2025-10-30', end: '2025-11-02',
    });
  });

  it('parses cross-month range with hyphen', () => {
    expect(parseDateRange('October 30-November 2 2025')).toEqual({
      start: '2025-10-30', end: '2025-11-02',
    });
  });

  it('throws on unparseable input', () => {
    expect(() => parseDateRange('not a date')).toThrow('Cannot parse date');
  });
});

// ── resolveTrack ────────────────────────────────────────────────────────

describe('resolveTrack', () => {
  const tracks: TrackRef[] = [
    { id: 1, track_name: 'Gainesville Raceway', normalized: 'gainesville raceway' },
    { id: 2, track_name: 'Auto Club Raceway at Pomona', normalized: 'auto club raceway at pomona' },
    { id: 3, track_name: 'zMAX Dragway', normalized: 'zmax dragway' },
  ];

  it('exact match', () => {
    expect(resolveTrack('Gainesville Raceway', tracks)?.id).toBe(1);
  });

  it('case-insensitive match', () => {
    expect(resolveTrack('gainesville raceway', tracks)?.id).toBe(1);
  });

  it('substring match (input is substring of track)', () => {
    expect(resolveTrack('Pomona', tracks)?.id).toBe(2);
  });

  it('substring match (track is substring of input)', () => {
    expect(resolveTrack('zMAX Dragway (Charlotte)', tracks)?.id).toBe(3);
  });

  it('returns null for no match', () => {
    expect(resolveTrack('Unknown Speedway', tracks)).toBeNull();
  });

  it('returns null for empty', () => {
    expect(resolveTrack('', tracks)).toBeNull();
  });
});

// ── parseBulkCsv ────────────────────────────────────────────────────────

describe('parseBulkCsv', () => {
  const tracks: TrackRef[] = [
    { id: 1, track_name: 'Gainesville Raceway', normalized: 'gainesville raceway' },
    { id: 2, track_name: 'Auto Club Raceway at Pomona', normalized: 'auto club raceway at pomona' },
  ];
  const existing: ExistingEventRef[] = [
    { id: 100, start_date_local: '2010-02-11', track_id: 2, race_lookup: '20100211' },
  ];

  it('parses valid tab-separated rows', () => {
    const csv = 'Gatornationals\t2010-03-11\tGainesville Raceway\t2010-03-14';
    const rows = parseBulkCsv(csv, tracks, existing);
    expect(rows).toHaveLength(1);
    expect(rows[0].status).toBe('ok');
    expect(rows[0].startDateLocal).toBe('2010-03-11');
    expect(rows[0].endDateLocal).toBe('2010-03-14');
    expect(rows[0].raceLookup).toBe('20100311');
    expect(rows[0].seasonYear).toBe(2010);
    expect(rows[0].resolvedTrackId).toBe(1);
  });

  it('parses comma-separated rows', () => {
    const csv = 'Gatornationals,2010-03-11,Gainesville Raceway';
    const rows = parseBulkCsv(csv, tracks, existing);
    expect(rows).toHaveLength(1);
    expect(rows[0].status).toBe('ok');
    expect(rows[0].resolvedTrackId).toBe(1);
    // end date auto-filled (+3 days)
    expect(rows[0].endDateLocal).toBe('2010-03-14');
  });

  it('detects duplicate events', () => {
    const csv = 'Winternationals\t2010-02-11\tAuto Club Raceway at Pomona\t2010-02-14';
    const rows = parseBulkCsv(csv, tracks, existing);
    expect(rows).toHaveLength(1);
    expect(rows[0].status).toBe('duplicate');
    expect(rows[0].statusDetail).toContain('#100');
  });

  it('marks unresolved tracks as error', () => {
    const csv = 'Some Event\t2010-05-01\tUnknown Speedway';
    const rows = parseBulkCsv(csv, tracks, existing);
    expect(rows).toHaveLength(1);
    expect(rows[0].status).toBe('error');
    expect(rows[0].statusDetail).toContain('Track not found');
  });

  it('marks unparseable dates as error', () => {
    const csv = 'Bad Event\tnot a date\tGainesville Raceway';
    const rows = parseBulkCsv(csv, tracks, existing);
    expect(rows).toHaveLength(1);
    expect(rows[0].status).toBe('error');
    expect(rows[0].statusDetail).toContain('Cannot parse date');
  });

  it('skips header-like lines', () => {
    const csv = 'Event Name\tStart Date\tTrack\nGatornationals\t2010-03-11\tGainesville Raceway';
    const rows = parseBulkCsv(csv, tracks, existing);
    expect(rows).toHaveLength(1);
    expect(rows[0].rawEventName).toBe('Gatornationals');
  });

  it('handles date ranges in start column', () => {
    const csv = 'Gatornationals\tMarch 11-14, 2010\tGainesville Raceway';
    const rows = parseBulkCsv(csv, tracks, existing);
    expect(rows).toHaveLength(1);
    expect(rows[0].status).toBe('ok');
    expect(rows[0].startDateLocal).toBe('2010-03-11');
    expect(rows[0].endDateLocal).toBe('2010-03-14');
  });

  it('marks rows with too few columns as error', () => {
    const csv = 'Just two columns\t2010-03-11';
    const rows = parseBulkCsv(csv, tracks, existing);
    expect(rows).toHaveLength(1);
    expect(rows[0].status).toBe('error');
    expect(rows[0].statusDetail).toContain('3 columns');
  });

  it('handles empty input', () => {
    const rows = parseBulkCsv('', tracks, existing);
    expect(rows).toHaveLength(0);
  });

  it('handles multiple rows with mixed statuses', () => {
    const csv = [
      'Gatornationals\t2010-03-11\tGainesville Raceway',
      'Winternationals\t2010-02-11\tPomona',     // duplicate
      'Bad Event\tbaddate\tGainesville Raceway',  // error
    ].join('\n');
    const rows = parseBulkCsv(csv, tracks, existing);
    expect(rows).toHaveLength(3);
    expect(rows[0].status).toBe('ok');
    expect(rows[1].status).toBe('duplicate');
    expect(rows[2].status).toBe('error');
  });
});
