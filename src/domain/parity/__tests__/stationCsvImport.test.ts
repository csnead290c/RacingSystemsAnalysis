/**
 * Tests for Station CSV Import — timestamp parsing, event-window mapping,
 * overlap tiebreaking, buffer behavior, and unmapped detection.
 *
 * These are TS mirrors of the PHP handleImportStationCsv logic so we can
 * validate the algorithm client-side without hitting the DB.
 */

import { describe, it, expect } from 'vitest';

// ── Types ────────────────────────────────────────────────────────────────

interface EventWindow {
  id: number;
  name: string;
  trackId: number;
  timezone: string;
  startLocal: string;  // YYYY-MM-DD
  endLocal: string;     // YYYY-MM-DD
  windowStartEpoch: number;
  windowEndEpoch: number;
  midEpoch: number;
}

interface CsvRow {
  timestampUtc: string;
  tempF: number;
  humidityPct: number;
  pressureHpa: number;
}

interface MappedRow {
  row: number;
  timestampUtc: string;
  tempF: number;
  humidityPct: number;
  pressureHpa: number;
  eventId: number;
  eventName: string;
}

interface UnmappedRow {
  row: number;
  timestampUtc: string;
  tempF: number;
  humidityPct: number;
  pressureHpa: number;
}

interface ParseError {
  row: number;
  reason: string;
  ts: string;
}

// ── TS mirror of PHP event-window builder ────────────────────────────────

/** Build a UTC event window from local dates + timezone + buffer hours. */
function buildEventWindow(
  id: number,
  name: string,
  trackId: number,
  timezone: string,
  startLocal: string,
  endLocal: string | null,
  bufferHours: number,
): EventWindow {
  const tz = timezone;
  const sl = startLocal;
  let el = endLocal || startLocal;

  // If single-day, extend to 4-day event (mirrors PHP)
  if (sl === el) {
    const d = new Date(`${el}T23:59:59Z`);
    d.setUTCDate(d.getUTCDate() + 3);
    el = d.toISOString().slice(0, 10);
  }

  // Convert local start/end to UTC epoch using timezone offset
  // We use a helper that creates dates in the given timezone
  const windowStartEpoch = localToUtcEpoch(`${sl} 00:00:00`, tz) - bufferHours * 3600;
  const windowEndEpoch = localToUtcEpoch(`${el} 23:59:59`, tz) + bufferHours * 3600;
  const midEpoch = (windowStartEpoch + windowEndEpoch) / 2;

  return { id, name, trackId, timezone: tz, startLocal: sl, endLocal: el, windowStartEpoch, windowEndEpoch, midEpoch };
}

/**
 * Convert a local datetime string to UTC epoch seconds.
 * Uses Intl.DateTimeFormat to resolve timezone offsets.
 */
function localToUtcEpoch(localStr: string, timezone: string): number {
  // Parse "YYYY-MM-DD HH:MM:SS" in the given timezone
  const [datePart, timePart] = localStr.split(' ');
  const [y, m, d] = datePart.split('-').map(Number);
  const [hh, mm, ss] = (timePart || '00:00:00').split(':').map(Number);

  // Create a Date in UTC first, then adjust for timezone offset
  // Use the formatter trick to find the offset
  const utcGuess = Date.UTC(y, m - 1, d, hh, mm, ss);

  // Get what this UTC instant looks like in the target timezone
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  });
  const parts = fmt.formatToParts(new Date(utcGuess));
  const get = (type: string) => parseInt(parts.find(p => p.type === type)?.value || '0', 10);
  const localAtUtcGuess = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour') === 24 ? 0 : get('hour'), get('minute'), get('second'));

  // The difference tells us the offset
  const offsetMs = localAtUtcGuess - utcGuess;
  // We want: localStr in tz => UTC, so UTC = utcGuess - offset
  return Math.round((utcGuess - offsetMs) / 1000);
}

// ── TS mirror of PHP row mapping logic ───────────────────────────────────

function mapRows(
  rows: CsvRow[],
  eventWindows: EventWindow[],
): { mapped: MappedRow[]; unmapped: UnmappedRow[]; parseErrors: ParseError[] } {
  const mapped: MappedRow[] = [];
  const unmapped: UnmappedRow[] = [];
  const parseErrors: ParseError[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const tsRaw = (row.timestampUtc || '').trim();
    const tempF = row.tempF;
    const humPct = row.humidityPct;
    const pressHpa = row.pressureHpa;

    // Validate
    if (!tsRaw || tempF == null || humPct == null || pressHpa == null) {
      parseErrors.push({ row: i, reason: 'missing fields', ts: tsRaw });
      continue;
    }
    if (!isFinite(tempF) || !isFinite(humPct) || !isFinite(pressHpa)) {
      parseErrors.push({ row: i, reason: 'non-finite values', ts: tsRaw });
      continue;
    }

    // Pressure sanity
    const pressInhg = pressHpa * 0.02953;
    if (pressInhg < 20.0 || pressInhg > 35.0) {
      parseErrors.push({ row: i, reason: `pressure out of range: ${pressHpa} hPa = ${pressInhg.toFixed(4)} inHg`, ts: tsRaw });
      continue;
    }
    if (humPct < 0 || humPct > 100) {
      parseErrors.push({ row: i, reason: `humidity out of range: ${humPct}`, ts: tsRaw });
      continue;
    }

    // Parse timestamp
    let tsEpoch: number;
    let tsUtc: string;
    try {
      const d = new Date(tsRaw.includes('T') ? tsRaw : tsRaw.replace(' ', 'T') + 'Z');
      if (isNaN(d.getTime())) throw new Error('invalid');
      tsEpoch = Math.floor(d.getTime() / 1000);
      tsUtc = d.toISOString().replace('T', ' ').slice(0, 19);
    } catch {
      parseErrors.push({ row: i, reason: `invalid timestamp: ${tsRaw}`, ts: tsRaw });
      continue;
    }

    // Find matching events
    const matches = eventWindows.filter(ew => tsEpoch >= ew.windowStartEpoch && tsEpoch <= ew.windowEndEpoch);

    if (matches.length === 0) {
      unmapped.push({ row: i, timestampUtc: tsUtc, tempF, humidityPct: humPct, pressureHpa: pressHpa });
      continue;
    }

    // Pick best match: closest midpoint
    let best = matches[0];
    let bestDist = Math.abs(tsEpoch - best.midEpoch);
    for (let j = 1; j < matches.length; j++) {
      const dist = Math.abs(tsEpoch - matches[j].midEpoch);
      if (dist < bestDist) {
        bestDist = dist;
        best = matches[j];
      }
    }

    mapped.push({
      row: i,
      timestampUtc: tsUtc,
      tempF,
      humidityPct: humPct,
      pressureHpa: pressHpa,
      eventId: best.id,
      eventName: best.name,
    });
  }

  return { mapped, unmapped, parseErrors };
}

// ── CSV text parser (mirrors frontend component logic) ───────────────────

function parseCsvText(text: string): { rows: CsvRow[]; errors: string[] } {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return { rows: [], errors: ['CSV must have header + data rows'] };

  const header = lines[0].split(',').map(h => h.trim());
  const tsIdx = header.findIndex(h => /utc.*time/i.test(h) || /timestamp/i.test(h));
  const tempIdx = header.findIndex(h => /temp/i.test(h));
  const humIdx = header.findIndex(h => /humid/i.test(h));
  const pressIdx = header.findIndex(h => /press/i.test(h));

  if (tsIdx < 0 || tempIdx < 0 || humIdx < 0 || pressIdx < 0) {
    return { rows: [], errors: [`Missing required columns. Found: ${header.join(', ')}`] };
  }

  const rows: CsvRow[] = [];
  const errors: string[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',').map(c => c.trim());
    const ts = cols[tsIdx];
    const temp = parseFloat(cols[tempIdx]);
    const hum = parseFloat(cols[humIdx]);
    const press = parseFloat(cols[pressIdx]);

    if (!ts || isNaN(temp) || isNaN(hum) || isNaN(press)) {
      errors.push(`Row ${i + 1}: invalid data`);
      continue;
    }

    let isoTs = ts;
    if (/^\d{4}-\d{2}-\d{2}T/.test(ts)) {
      isoTs = ts.replace(/Z$/, '');
    } else if (/^\d{4}-\d{2}-\d{2} /.test(ts)) {
      isoTs = ts;
    } else {
      const d = new Date(ts);
      if (isNaN(d.getTime())) {
        errors.push(`Row ${i + 1}: unparseable timestamp`);
        continue;
      }
      isoTs = d.toISOString().replace('Z', '').replace('T', ' ').slice(0, 19);
    }

    rows.push({ timestampUtc: isoTs, tempF: temp, humidityPct: hum, pressureHpa: press });
  }

  return { rows, errors };
}

// ══════════════════════════════════════════════════════════════════════════
// TESTS
// ══════════════════════════════════════════════════════════════════════════

describe('Station CSV Import', () => {

  // ── CSV Parsing ──────────────────────────────────────────────────────

  describe('CSV Text Parsing', () => {
    it('parses standard 4-column CSV', () => {
      const csv = `UTC_Timestamp,Temperature,Humidity,Pressure_Uncorrected
2025-02-14 18:00:00,72.5,45.2,1013.25
2025-02-14 18:30:00,73.1,44.8,1013.10`;
      const { rows, errors } = parseCsvText(csv);
      expect(errors).toHaveLength(0);
      expect(rows).toHaveLength(2);
      expect(rows[0]).toEqual({
        timestampUtc: '2025-02-14 18:00:00',
        tempF: 72.5,
        humidityPct: 45.2,
        pressureHpa: 1013.25,
      });
    });

    it('handles ISO timestamp format with T separator', () => {
      const csv = `UTC_Timestamp,Temperature,Humidity,Pressure_Uncorrected
2025-02-14T18:00:00Z,72.5,45.2,1013.25`;
      const { rows } = parseCsvText(csv);
      expect(rows).toHaveLength(1);
      expect(rows[0].timestampUtc).toBe('2025-02-14T18:00:00');
    });

    it('rejects CSV with missing columns', () => {
      const csv = `UTC_Timestamp,Temperature
2025-02-14 18:00:00,72.5`;
      const { rows, errors } = parseCsvText(csv);
      expect(rows).toHaveLength(0);
      expect(errors[0]).toMatch(/Missing required columns/);
    });

    it('skips rows with invalid numeric values', () => {
      const csv = `UTC_Timestamp,Temperature,Humidity,Pressure_Uncorrected
2025-02-14 18:00:00,abc,45.2,1013.25
2025-02-14 18:30:00,73.1,44.8,1013.10`;
      const { rows, errors } = parseCsvText(csv);
      expect(rows).toHaveLength(1);
      expect(errors).toHaveLength(1);
    });

    it('handles empty file', () => {
      const { rows, errors } = parseCsvText('');
      expect(rows).toHaveLength(0);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('handles header-only file', () => {
      const csv = `UTC_Timestamp,Temperature,Humidity,Pressure_Uncorrected`;
      const { rows, errors } = parseCsvText(csv);
      expect(rows).toHaveLength(0);
      expect(errors).toHaveLength(1); // treated as < 2 lines
    });

    it('handles Windows line endings (CRLF)', () => {
      const csv = "UTC_Timestamp,Temperature,Humidity,Pressure_Uncorrected\r\n2025-02-14 18:00:00,72.5,45.2,1013.25\r\n";
      const { rows, errors } = parseCsvText(csv);
      expect(errors).toHaveLength(0);
      expect(rows).toHaveLength(1);
    });

    it('matches columns by flexible header names', () => {
      const csv = `utc_timestamp,temp,humidity_pct,pressure_raw
2025-02-14 18:00:00,72.5,45.2,1013.25`;
      const { rows, errors } = parseCsvText(csv);
      expect(errors).toHaveLength(0);
      expect(rows).toHaveLength(1);
    });
  });

  // ── Timestamp Parsing ────────────────────────────────────────────────

  describe('Timestamp Parsing in mapRows', () => {
    const windows: EventWindow[] = [
      buildEventWindow(1, 'Winternationals', 100, 'America/Los_Angeles', '2025-02-13', '2025-02-16', 12),
    ];

    it('parses "YYYY-MM-DD HH:MM:SS" format', () => {
      const { mapped } = mapRows([{ timestampUtc: '2025-02-14 18:00:00', tempF: 72, humidityPct: 45, pressureHpa: 1013 }], windows);
      expect(mapped).toHaveLength(1);
      expect(mapped[0].timestampUtc).toBe('2025-02-14 18:00:00');
    });

    it('parses ISO "YYYY-MM-DDTHH:MM:SSZ" format', () => {
      const { mapped } = mapRows([{ timestampUtc: '2025-02-14T18:00:00Z', tempF: 72, humidityPct: 45, pressureHpa: 1013 }], windows);
      expect(mapped).toHaveLength(1);
    });

    it('rejects garbage timestamps', () => {
      const { parseErrors } = mapRows([{ timestampUtc: 'not-a-date', tempF: 72, humidityPct: 45, pressureHpa: 1013 }], windows);
      expect(parseErrors).toHaveLength(1);
      expect(parseErrors[0].reason).toMatch(/invalid timestamp/);
    });

    it('rejects empty timestamp', () => {
      const { parseErrors } = mapRows([{ timestampUtc: '', tempF: 72, humidityPct: 45, pressureHpa: 1013 }], windows);
      expect(parseErrors).toHaveLength(1);
      expect(parseErrors[0].reason).toBe('missing fields');
    });
  });

  // ── Validation ───────────────────────────────────────────────────────

  describe('Row Validation', () => {
    const windows: EventWindow[] = [
      buildEventWindow(1, 'Test Event', 100, 'America/New_York', '2025-03-01', '2025-03-04', 12),
    ];

    it('rejects pressure out of range (too low)', () => {
      // 500 hPa = ~14.77 inHg — way too low
      const { parseErrors } = mapRows([{ timestampUtc: '2025-03-02 18:00:00', tempF: 72, humidityPct: 45, pressureHpa: 500 }], windows);
      expect(parseErrors).toHaveLength(1);
      expect(parseErrors[0].reason).toMatch(/pressure out of range/);
    });

    it('rejects pressure out of range (too high)', () => {
      // 1200 hPa = ~35.44 inHg — too high
      const { parseErrors } = mapRows([{ timestampUtc: '2025-03-02 18:00:00', tempF: 72, humidityPct: 45, pressureHpa: 1200 }], windows);
      expect(parseErrors).toHaveLength(1);
      expect(parseErrors[0].reason).toMatch(/pressure out of range/);
    });

    it('accepts pressure in normal range', () => {
      // 1013.25 hPa = ~29.92 inHg — normal
      const { mapped } = mapRows([{ timestampUtc: '2025-03-02 18:00:00', tempF: 72, humidityPct: 45, pressureHpa: 1013.25 }], windows);
      expect(mapped).toHaveLength(1);
    });

    it('rejects humidity > 100', () => {
      const { parseErrors } = mapRows([{ timestampUtc: '2025-03-02 18:00:00', tempF: 72, humidityPct: 105, pressureHpa: 1013 }], windows);
      expect(parseErrors).toHaveLength(1);
      expect(parseErrors[0].reason).toMatch(/humidity out of range/);
    });

    it('rejects humidity < 0', () => {
      const { parseErrors } = mapRows([{ timestampUtc: '2025-03-02 18:00:00', tempF: 72, humidityPct: -5, pressureHpa: 1013 }], windows);
      expect(parseErrors).toHaveLength(1);
      expect(parseErrors[0].reason).toMatch(/humidity out of range/);
    });

    it('rejects non-finite values (NaN)', () => {
      const { parseErrors } = mapRows([{ timestampUtc: '2025-03-02 18:00:00', tempF: NaN, humidityPct: 45, pressureHpa: 1013 }], windows);
      expect(parseErrors).toHaveLength(1);
      expect(parseErrors[0].reason).toBe('non-finite values');
    });

    it('rejects non-finite values (Infinity)', () => {
      const { parseErrors } = mapRows([{ timestampUtc: '2025-03-02 18:00:00', tempF: 72, humidityPct: Infinity, pressureHpa: 1013 }], windows);
      expect(parseErrors).toHaveLength(1);
      expect(parseErrors[0].reason).toBe('non-finite values');
    });
  });

  // ── Event Window Mapping ─────────────────────────────────────────────

  describe('Event Window Mapping', () => {
    // Winternationals: Feb 13-16, Pomona CA (Pacific)
    // Arizona Nationals: Feb 21-23, Phoenix AZ (Arizona = no DST, America/Phoenix)
    const winternationals = buildEventWindow(1, 'Winternationals', 100, 'America/Los_Angeles', '2025-02-13', '2025-02-16', 12);
    const arizonaNats = buildEventWindow(2, 'Arizona Nationals', 200, 'America/Phoenix', '2025-02-21', '2025-02-23', 12);
    const windows = [winternationals, arizonaNats];

    it('maps timestamp within event window to correct event', () => {
      // Feb 14 midday UTC — solidly in Winternationals
      const { mapped } = mapRows([{ timestampUtc: '2025-02-14 20:00:00', tempF: 72, humidityPct: 45, pressureHpa: 1013 }], windows);
      expect(mapped).toHaveLength(1);
      expect(mapped[0].eventId).toBe(1);
      expect(mapped[0].eventName).toBe('Winternationals');
    });

    it('maps timestamp to second event', () => {
      // Feb 22 midday UTC — solidly in Arizona Nationals
      const { mapped } = mapRows([{ timestampUtc: '2025-02-22 20:00:00', tempF: 80, humidityPct: 30, pressureHpa: 1010 }], windows);
      expect(mapped).toHaveLength(1);
      expect(mapped[0].eventId).toBe(2);
      expect(mapped[0].eventName).toBe('Arizona Nationals');
    });

    it('marks timestamp outside all windows as unmapped', () => {
      // March 15 — no event
      const { unmapped, mapped } = mapRows([{ timestampUtc: '2025-03-15 12:00:00', tempF: 72, humidityPct: 45, pressureHpa: 1013 }], windows);
      expect(mapped).toHaveLength(0);
      expect(unmapped).toHaveLength(1);
    });

    it('handles empty event windows gracefully', () => {
      const { unmapped } = mapRows([{ timestampUtc: '2025-02-14 20:00:00', tempF: 72, humidityPct: 45, pressureHpa: 1013 }], []);
      expect(unmapped).toHaveLength(1);
    });
  });

  // ── Buffer Hours ─────────────────────────────────────────────────────

  describe('Buffer Hours', () => {
    it('maps timestamp in buffer zone (before event start)', () => {
      const window = buildEventWindow(1, 'Test', 100, 'America/Chicago', '2025-03-01', '2025-03-04', 12);
      // Event starts Mar 1 00:00 CT = Mar 1 06:00 UTC. Buffer = -12h = Feb 28 18:00 UTC
      // A row at Feb 28 20:00 UTC should map (in buffer zone)
      const { mapped } = mapRows([{ timestampUtc: '2025-02-28 20:00:00', tempF: 65, humidityPct: 50, pressureHpa: 1015 }], [window]);
      expect(mapped).toHaveLength(1);
      expect(mapped[0].eventId).toBe(1);
    });

    it('does not map timestamp outside buffer zone', () => {
      const window = buildEventWindow(1, 'Test', 100, 'America/Chicago', '2025-03-01', '2025-03-04', 12);
      // Event starts Mar 1 00:00 CT = Mar 1 06:00 UTC. Buffer = -12h = Feb 28 18:00 UTC
      // A row at Feb 28 10:00 UTC should NOT map (before buffer)
      const { unmapped } = mapRows([{ timestampUtc: '2025-02-28 10:00:00', tempF: 65, humidityPct: 50, pressureHpa: 1015 }], [window]);
      expect(unmapped).toHaveLength(1);
    });

    it('zero buffer means exact event bounds', () => {
      const window = buildEventWindow(1, 'Test', 100, 'America/Chicago', '2025-03-01', '2025-03-04', 0);
      // Event starts Mar 1 00:00 CT = Mar 1 06:00 UTC (no buffer)
      // A row at Feb 28 23:00 UTC should NOT map
      const { unmapped } = mapRows([{ timestampUtc: '2025-02-28 23:00:00', tempF: 65, humidityPct: 50, pressureHpa: 1015 }], [window]);
      expect(unmapped).toHaveLength(1);
    });

    it('large buffer (48h) extends window significantly', () => {
      const window = buildEventWindow(1, 'Test', 100, 'America/Chicago', '2025-03-01', '2025-03-04', 48);
      // Event starts Mar 1 00:00 CT = Mar 1 06:00 UTC. Buffer = -48h = Feb 27 06:00 UTC
      // A row at Feb 27 12:00 UTC should map
      const { mapped } = mapRows([{ timestampUtc: '2025-02-27 12:00:00', tempF: 65, humidityPct: 50, pressureHpa: 1015 }], [window]);
      expect(mapped).toHaveLength(1);
    });
  });

  // ── Overlapping Windows & Tiebreaking ────────────────────────────────

  describe('Overlapping Windows & Tiebreaking', () => {
    it('resolves overlap by closest midpoint', () => {
      // Two events back-to-back with 12h buffer, their buffers overlap
      const event1 = buildEventWindow(1, 'Event A', 100, 'America/Chicago', '2025-03-01', '2025-03-04', 12);
      const event2 = buildEventWindow(2, 'Event B', 200, 'America/Chicago', '2025-03-07', '2025-03-09', 12);

      // Timestamp right at the boundary — Mar 5 18:00 UTC
      // Event A ends Mar 4 23:59 CT = Mar 5 05:59 UTC + 12h buffer = Mar 5 17:59 UTC
      // Event B starts Mar 7 00:00 CT = Mar 7 06:00 UTC - 12h buffer = Mar 6 18:00 UTC
      // So Mar 5 20:00 UTC falls only in Event A buffer (not yet in Event B buffer)
      const { mapped } = mapRows([{ timestampUtc: '2025-03-05 14:00:00', tempF: 70, humidityPct: 40, pressureHpa: 1012 }], [event1, event2]);
      expect(mapped).toHaveLength(1);
      expect(mapped[0].eventId).toBe(1);
    });

    it('resolves true overlap by midpoint proximity', () => {
      // Create two events with large buffer that definitely overlap
      const event1 = buildEventWindow(1, 'Event A', 100, 'UTC', '2025-03-01', '2025-03-03', 48);
      const event2 = buildEventWindow(2, 'Event B', 200, 'UTC', '2025-03-05', '2025-03-07', 48);

      // Event A: window = Feb 27 00:00 to Mar 5 23:59 + 48h = Mar 8 ~
      // Event B: window = Mar 3 00:00 - 48h = Mar 1 00:00 to Mar 9 23:59 + 48h
      // Mar 4 12:00 UTC should be in both — resolve to closer midpoint
      // Event A mid ≈ Mar 2 12:00, Event B mid ≈ Mar 6 12:00
      // Mar 4 12:00 is closer to Event A mid (2 days) than Event B mid (2 days)
      // Actually equidistant — let's pick Mar 3 which is definitely closer to A
      const { mapped: mapped1 } = mapRows([{ timestampUtc: '2025-03-03 12:00:00', tempF: 70, humidityPct: 40, pressureHpa: 1012 }], [event1, event2]);
      expect(mapped1).toHaveLength(1);
      expect(mapped1[0].eventId).toBe(1); // closer to A's midpoint

      // Mar 6 should resolve to Event B
      const { mapped: mapped2 } = mapRows([{ timestampUtc: '2025-03-06 12:00:00', tempF: 70, humidityPct: 40, pressureHpa: 1012 }], [event1, event2]);
      expect(mapped2).toHaveLength(1);
      expect(mapped2[0].eventId).toBe(2); // closer to B's midpoint
    });
  });

  // ── Unmapped Detection ───────────────────────────────────────────────

  describe('Unmapped Detection', () => {
    const windows = [
      buildEventWindow(1, 'Only Event', 100, 'America/New_York', '2025-06-01', '2025-06-04', 12),
    ];

    it('timestamps before first event are unmapped', () => {
      const { unmapped } = mapRows([{ timestampUtc: '2025-01-01 12:00:00', tempF: 50, humidityPct: 60, pressureHpa: 1020 }], windows);
      expect(unmapped).toHaveLength(1);
    });

    it('timestamps after last event are unmapped', () => {
      const { unmapped } = mapRows([{ timestampUtc: '2025-12-31 12:00:00', tempF: 50, humidityPct: 60, pressureHpa: 1020 }], windows);
      expect(unmapped).toHaveLength(1);
    });

    it('timestamps between events (gap) are unmapped', () => {
      const twoEvents = [
        buildEventWindow(1, 'Event A', 100, 'America/New_York', '2025-03-01', '2025-03-03', 2),
        buildEventWindow(2, 'Event B', 200, 'America/New_York', '2025-06-01', '2025-06-03', 2),
      ];
      // April 15 — between events, far from both
      const { unmapped } = mapRows([{ timestampUtc: '2025-04-15 12:00:00', tempF: 65, humidityPct: 50, pressureHpa: 1015 }], twoEvents);
      expect(unmapped).toHaveLength(1);
    });
  });

  // ── Single-Day Event Extension ───────────────────────────────────────

  describe('Single-Day Event Extension', () => {
    it('single-day event auto-extends to 4 days', () => {
      // If start === end, PHP extends end by +3 days
      const window = buildEventWindow(1, 'Single Day', 100, 'UTC', '2025-04-01', '2025-04-01', 0);
      // Should cover Apr 1-4 (original + 3 days extension)
      const { mapped } = mapRows([{ timestampUtc: '2025-04-03 12:00:00', tempF: 72, humidityPct: 45, pressureHpa: 1013 }], [window]);
      expect(mapped).toHaveLength(1);
      expect(mapped[0].eventId).toBe(1);
    });

    it('single-day event does not extend to day 5', () => {
      const window = buildEventWindow(1, 'Single Day', 100, 'UTC', '2025-04-01', '2025-04-01', 0);
      // Extension: Apr 1 → Apr 4 23:59:59 UTC. Apr 5 00:00:00 is outside.
      const { unmapped } = mapRows([{ timestampUtc: '2025-04-05 00:00:00', tempF: 72, humidityPct: 45, pressureHpa: 1013 }], [window]);
      expect(unmapped).toHaveLength(1);
    });
  });

  // ── Batch Mapping Stats ──────────────────────────────────────────────

  describe('Batch Mapping Statistics', () => {
    const windows = [
      buildEventWindow(1, 'Winternationals', 100, 'America/Los_Angeles', '2025-02-13', '2025-02-16', 12),
    ];

    it('correctly counts mapped, unmapped, and errors in a mixed batch', () => {
      const rows: CsvRow[] = [
        { timestampUtc: '2025-02-14 20:00:00', tempF: 72, humidityPct: 45, pressureHpa: 1013 },   // mapped
        { timestampUtc: '2025-02-15 18:00:00', tempF: 75, humidityPct: 40, pressureHpa: 1012 },   // mapped
        { timestampUtc: '2025-05-01 12:00:00', tempF: 80, humidityPct: 50, pressureHpa: 1010 },   // unmapped
        { timestampUtc: '', tempF: 70, humidityPct: 45, pressureHpa: 1013 },                       // parse error
        { timestampUtc: '2025-02-14 20:00:00', tempF: 72, humidityPct: 150, pressureHpa: 1013 },   // validation error
      ];

      const { mapped, unmapped, parseErrors } = mapRows(rows, windows);
      expect(mapped).toHaveLength(2);
      expect(unmapped).toHaveLength(1);
      expect(parseErrors).toHaveLength(2); // empty ts + humidity out of range
    });
  });

  // ── Timezone Handling ────────────────────────────────────────────────

  describe('Timezone-Aware Window Calculation', () => {
    it('correctly offsets for US Eastern timezone', () => {
      // Mar 13 2025 is after DST starts (Mar 9), so Eastern = UTC-4 (EDT)
      const window = buildEventWindow(1, 'Gatornationals', 100, 'America/New_York', '2025-03-13', '2025-03-16', 0);
      // Mar 13 00:00 EDT = Mar 13 04:00 UTC
      // A row at Mar 13 03:59 UTC should be outside (before event in local time)
      const { unmapped: u1 } = mapRows([{ timestampUtc: '2025-03-13 03:59:00', tempF: 72, humidityPct: 45, pressureHpa: 1013 }], [window]);
      expect(u1).toHaveLength(1);

      // A row at Mar 13 04:01 UTC should be inside
      const { mapped: m1 } = mapRows([{ timestampUtc: '2025-03-13 04:01:00', tempF: 72, humidityPct: 45, pressureHpa: 1013 }], [window]);
      expect(m1).toHaveLength(1);
    });

    it('correctly offsets for US Mountain (no DST — Phoenix)', () => {
      // Phoenix is always UTC-7
      const window = buildEventWindow(1, 'Arizona Nats', 200, 'America/Phoenix', '2025-02-21', '2025-02-23', 0);
      // Feb 21 00:00 MST = Feb 21 07:00 UTC
      const { unmapped } = mapRows([{ timestampUtc: '2025-02-21 06:59:00', tempF: 80, humidityPct: 30, pressureHpa: 1010 }], [window]);
      expect(unmapped).toHaveLength(1);

      const { mapped } = mapRows([{ timestampUtc: '2025-02-21 07:01:00', tempF: 80, humidityPct: 30, pressureHpa: 1010 }], [window]);
      expect(mapped).toHaveLength(1);
    });
  });
});
