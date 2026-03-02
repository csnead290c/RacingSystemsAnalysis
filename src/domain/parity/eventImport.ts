/**
 * Event bulk-import helpers: race_lookup generation, date parsing,
 * track name normalization, and CSV row validation.
 */

// ── buildRaceLookup ─────────────────────────────────────────────────────
// Deterministic: YYYYMMDD of start_date_local.
// This matches the existing system convention used everywhere in parity.php.

export function buildRaceLookup(startDateLocal: string): string {
  // Accept YYYY-MM-DD or already-compact YYYYMMDD
  const clean = startDateLocal.replace(/-/g, '');
  if (!/^\d{8}$/.test(clean)) {
    throw new Error(`Invalid date for race_lookup: "${startDateLocal}"`);
  }
  return clean;
}

// ── normalizeTrackName ──────────────────────────────────────────────────
// Lowercases, strips punctuation, collapses whitespace.
// Used for fuzzy matching user-provided track names against the DB.

export function normalizeTrackName(name: string): string {
  return name
    .toLowerCase()
    .replace(/['']/g, '')          // smart quotes
    .replace(/[^a-z0-9\s]/g, ' ') // punctuation → space
    .replace(/\s+/g, ' ')
    .trim();
}

// ── parseDateRange ──────────────────────────────────────────────────────
// Parses human-friendly date strings into { start: 'YYYY-MM-DD', end: 'YYYY-MM-DD' | null }.
// Supported formats:
//   "2010-02-11"                    → { start: '2010-02-11', end: null }
//   "2010-02-11 to 2010-02-14"     → { start: '2010-02-11', end: '2010-02-14' }
//   "February 11–14, 2010"         → { start: '2010-02-11', end: '2010-02-14' }
//   "Feb 11-14 2010"               → { start: '2010-02-11', end: '2010-02-14' }
//   "February 11, 2010"            → { start: '2010-02-11', end: null }
//   "Oct 30 – Nov 2, 2025"         → { start: '2025-10-30', end: '2025-11-02' }

const MONTH_MAP: Record<string, number> = {
  january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
  july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
  jan: 1, feb: 2, mar: 3, apr: 4, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
};

function parseMonthName(s: string): number | null {
  return MONTH_MAP[s.toLowerCase()] ?? null;
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function toIso(y: number, m: number, d: number): string {
  return `${y}-${pad2(m)}-${pad2(d)}`;
}

export interface DateRangeResult {
  start: string;        // YYYY-MM-DD
  end: string | null;   // YYYY-MM-DD or null
}

export function parseDateRange(input: string): DateRangeResult {
  const s = input.trim();

  // 1) Already ISO: "YYYY-MM-DD" or "YYYY-MM-DD to YYYY-MM-DD"
  const isoSingle = /^(\d{4})-(\d{2})-(\d{2})$/;
  const isoRange = /^(\d{4})-(\d{2})-(\d{2})\s*(?:to|–|—|-)\s*(\d{4})-(\d{2})-(\d{2})$/;
  {
    const m = s.match(isoRange);
    if (m) return { start: `${m[1]}-${m[2]}-${m[3]}`, end: `${m[4]}-${m[5]}-${m[6]}` };
  }
  {
    const m = s.match(isoSingle);
    if (m) return { start: `${m[1]}-${m[2]}-${m[3]}`, end: null };
  }

  // 2) "Month Day–Day, Year"  or  "Month Day, Year"
  //    e.g. "February 11–14, 2010" or "Feb 11-14 2010" or "February 11, 2010"
  const sameMoRange = /^(\w+)\s+(\d{1,2})\s*[–—-]\s*(\d{1,2})[,\s]+(\d{4})$/;
  {
    const m = s.match(sameMoRange);
    if (m) {
      const mo = parseMonthName(m[1]);
      if (mo) return { start: toIso(+m[4], mo, +m[2]), end: toIso(+m[4], mo, +m[3]) };
    }
  }

  const singleDate = /^(\w+)\s+(\d{1,2})[,\s]+(\d{4})$/;
  {
    const m = s.match(singleDate);
    if (m) {
      const mo = parseMonthName(m[1]);
      if (mo) return { start: toIso(+m[3], mo, +m[2]), end: null };
    }
  }

  // 3) Cross-month range: "Oct 30 – Nov 2, 2025" or "October 30 - November 2 2025"
  const crossMoRange = /^(\w+)\s+(\d{1,2})\s*[–—-]\s*(\w+)\s+(\d{1,2})[,\s]+(\d{4})$/;
  {
    const m = s.match(crossMoRange);
    if (m) {
      const mo1 = parseMonthName(m[1]);
      const mo2 = parseMonthName(m[3]);
      if (mo1 && mo2) return { start: toIso(+m[5], mo1, +m[2]), end: toIso(+m[5], mo2, +m[4]) };
    }
  }

  throw new Error(`Cannot parse date: "${input}"`);
}

// ── CSV Row Parsing ─────────────────────────────────────────────────────

export interface BulkEventRow {
  /** Row index (1-based, for display) */
  rowNum: number;
  /** Raw inputs */
  rawEventName: string;
  rawStartDate: string;
  rawEndDate: string;
  rawTrackName: string;
  /** Parsed / resolved */
  startDateLocal: string | null;
  endDateLocal: string | null;
  raceLookup: string | null;
  seasonYear: number | null;
  resolvedTrackId: number | null;
  resolvedTrackName: string | null;
  /** Validation status */
  status: 'ok' | 'error' | 'duplicate' | 'will_update';
  statusDetail: string;
}

export interface TrackRef {
  id: number;
  track_name: string;
  normalized: string;
}

export interface ExistingEventRef {
  id: number;
  start_date_local: string;
  track_id: number;
  race_lookup: string | null;
}

/**
 * Resolve a user-provided track name/code to a track ID.
 * Returns null if no match found.
 */
export function resolveTrack(rawName: string, tracks: TrackRef[]): TrackRef | null {
  const norm = normalizeTrackName(rawName);
  if (!norm) return null;
  // Exact normalized match
  const exact = tracks.find(t => t.normalized === norm);
  if (exact) return exact;
  // Substring / contains match (track name contains input, or input contains track name)
  const contains = tracks.find(t => t.normalized.includes(norm) || norm.includes(t.normalized));
  if (contains) return contains;
  return null;
}

/**
 * Parse a single CSV text line (tab or comma separated).
 * Expected columns: event_name, start_date (or date_range), track_name, [end_date]
 */
export function parseCsvLine(line: string): string[] {
  // Try tab-separated first, then comma
  const tabParts = line.split('\t');
  if (tabParts.length >= 3) return tabParts.map(s => s.trim());
  return line.split(',').map(s => s.trim().replace(/^["']|["']$/g, ''));
}

/**
 * Parse pasted CSV text into BulkEventRow[], validating each row.
 * Expects columns: event_name, start_date (or date range), track_name [, end_date]
 * Skips blank lines and lines that look like headers.
 */
export function parseBulkCsv(
  text: string,
  tracks: TrackRef[],
  existingEvents: ExistingEventRef[],
): BulkEventRow[] {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  const rows: BulkEventRow[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Skip header-like lines
    if (/^(event|name|start|date|track)/i.test(line)) continue;

    const cols = parseCsvLine(line);
    if (cols.length < 3) {
      rows.push({
        rowNum: i + 1, rawEventName: line, rawStartDate: '', rawEndDate: '',
        rawTrackName: '', startDateLocal: null, endDateLocal: null,
        raceLookup: null, seasonYear: null,
        resolvedTrackId: null, resolvedTrackName: null,
        status: 'error', statusDetail: `Need at least 3 columns (got ${cols.length})`,
      });
      continue;
    }

    const [rawEventName, rawDateOrStart, rawTrackName, rawEndCol] = cols;
    let startDateLocal: string | null = null;
    let endDateLocal: string | null = null;
    let parseError = '';

    // Parse dates
    try {
      const parsed = parseDateRange(rawDateOrStart);
      startDateLocal = parsed.start;
      endDateLocal = parsed.end;
    } catch (e: any) {
      parseError = e.message;
    }

    // If there's a separate end_date column, use it
    if (!parseError && rawEndCol && !endDateLocal) {
      try {
        const parsedEnd = parseDateRange(rawEndCol);
        endDateLocal = parsedEnd.start; // single date in end column
      } catch {
        // Ignore end parse failure — end is optional
      }
    }

    // If no end date at all, default to start + 3 days (typical NHRA event)
    if (startDateLocal && !endDateLocal) {
      const d = new Date(startDateLocal + 'T00:00:00');
      d.setDate(d.getDate() + 3);
      endDateLocal = d.toISOString().slice(0, 10);
    }

    // Resolve track
    const track = resolveTrack(rawTrackName, tracks);

    // Build race_lookup
    let raceLookup: string | null = null;
    if (startDateLocal) {
      try { raceLookup = buildRaceLookup(startDateLocal); } catch { /* skip */ }
    }

    // Season year
    const seasonYear = startDateLocal ? parseInt(startDateLocal.slice(0, 4), 10) : null;

    // Determine status
    let status: BulkEventRow['status'] = 'ok';
    let statusDetail = '';

    if (parseError) {
      status = 'error';
      statusDetail = parseError;
    } else if (!track) {
      status = 'error';
      statusDetail = `Track not found: "${rawTrackName}"`;
    } else if (startDateLocal && track) {
      // Check for duplicate
      const dup = existingEvents.find(
        e => e.start_date_local === startDateLocal && e.track_id === track.id,
      );
      if (dup) {
        status = 'duplicate';
        statusDetail = `Existing event #${dup.id} (lookup: ${dup.race_lookup ?? 'none'})`;
      }
    }

    rows.push({
      rowNum: i + 1,
      rawEventName, rawStartDate: rawDateOrStart, rawEndDate: rawEndCol || '',
      rawTrackName,
      startDateLocal, endDateLocal,
      raceLookup, seasonYear,
      resolvedTrackId: track?.id ?? null,
      resolvedTrackName: track?.track_name ?? null,
      status, statusDetail,
    });
  }

  return rows;
}
