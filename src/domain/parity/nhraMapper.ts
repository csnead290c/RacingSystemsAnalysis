/**
 * NHRA Tech Parity — OData Extraction & Normalization (TypeScript mirror)
 *
 * This module mirrors the PHP logic in api/lib/parity.php for:
 * - Extracting rows from OData v2/v4 JSON shapes
 * - Normalizing raw rows using the configurable field alias map
 * - Computing deterministic row hashes for de-duplication
 *
 * Used by:
 * - Client-side display/preview (future)
 * - Unit tests validating the mapper design
 */

// ============================================================================
// OData Row Extraction
// ============================================================================

/**
 * Extract rows from an OData JSON response.
 * Supports:
 *   - OData v4: { "value": [...], "@odata.nextLink": "..." }
 *   - OData v2: { "d": { "results": [...], "__next": "..." } }
 *   - OData v2 alt: { "d": [...] }
 */
export function extractODataRows(json: Record<string, any>): Record<string, any>[] {
  // OData v4
  if (Array.isArray(json.value)) {
    return json.value;
  }
  // OData v2 with results
  if (json.d && Array.isArray(json.d.results)) {
    return json.d.results;
  }
  // OData v2 direct array
  if (Array.isArray(json.d)) {
    return json.d;
  }
  return [];
}

/**
 * Extract the next-page URL from an OData JSON response.
 */
export function extractODataNextLink(json: Record<string, any>): string | null {
  if (json['@odata.nextLink']) return json['@odata.nextLink'];
  if (json.d?.__next) return json.d.__next;
  return null;
}

// ============================================================================
// Field Alias Map
// ============================================================================

// Exact NHRA OData field names confirmed via $metadata + peek (2025-10-30 event).
// NHRA fields: TimeStamp, Round, Lane, QualPos, CarNumber, Name, ClassIndex,
//   DialIn, RT, ft60, ft330, ft660, mph660, ft1000, mph1000, ft1320, mph1320,
//   MOV, Win, IsDQ, Place, Category, DumbyID
// NOTE: IsDQ and Place contain the car number in real data, NOT boolean/position.
export const FIELD_ALIASES: Record<string, string[]> = {
  run_timestamp_utc: ['TimeStamp', 'RunTimeUtc', 'TimestampUtc', 'UTC_Timestamp', 'RunDateTimeUtc', 'RunDate', 'DateTime'],
  category: ['Category', 'Cat', 'EventCategory'],
  class_index: ['ClassIndex', 'Class', 'Class_Name', 'ClassName', 'ClassId'],
  round: ['Round', 'Rnd', 'RoundNumber', 'RoundNum'],
  lane: ['Lane', 'LaneChoice', 'LaneNumber'],
  driver_name: ['Name', 'DriverName', 'Driver', 'DriverFullName', 'Racer'],
  car_number: ['CarNumber', 'CarNo', 'Car', 'CarNum'],
  dial_in: ['DialIn', 'Dial', 'DialInTime'],
  rt: ['RT', 'ReactionTime', 'Reaction', 'RxnTime'],
  ft60: ['ft60', 'SixtyFoot', '60ft', 'Sixty', 'ET60'],
  ft330: ['ft330', 'ThreeThirty', '330ft', 'ET330'],
  ft660: ['ft660', 'SixSixty', '660ft', 'EighthMileET', 'ET660', 'Eighth'],
  mph660: ['mph660', 'EighthMileMPH', '660mph', 'MPH660', 'EighthMPH'],
  ft1000: ['ft1000', 'ThousandFoot', '1000ft', 'ET1000'],
  mph1000: ['mph1000', '1000mph', 'MPH1000'],
  ft1320: ['ft1320', 'QuarterMileET', '1320ft', 'ET1320', 'ET', 'ElapsedTime'],
  mph1320: ['mph1320', 'QuarterMileMPH', '1320mph', 'MPH1320', 'MPH', 'Speed'],
  win_flag: ['Win', 'IsWin', 'Winner', 'WinLoss'],
  dq_flag: ['DQ', 'Disqualified', 'Foul'],
  mov: ['MOV', 'MarginOfVictory', 'Margin'],
  place: ['QualPos', 'Finish', 'Position', 'FinishPosition'],
  source_ref: ['DumbyID', 'Id', 'RunId', 'ResultId', 'RowId', 'UniqueId', 'RecordId'],
};

/** Numeric fields that should be parsed as float */
const FLOAT_FIELDS = new Set([
  'dial_in', 'rt', 'ft60', 'ft330', 'ft660', 'mph660',
  'ft1000', 'mph1000', 'ft1320', 'mph1320', 'mov',
]);

/** Boolean fields */
const BOOL_FIELDS = new Set(['win_flag', 'dq_flag']);

/** Timestamp fields */
const TIMESTAMP_FIELDS = new Set(['run_timestamp_utc']);

// ============================================================================
// Normalization
// ============================================================================

export interface NormalizedParityRun {
  race_lookup: string;
  run_timestamp_utc: string | null;
  category: string | null;
  class_index: string | null;
  round: string | null;
  lane: string | null;
  driver_name: string | null;
  car_number: string | null;
  dial_in: number | null;
  rt: number | null;
  ft60: number | null;
  ft330: number | null;
  ft660: number | null;
  mph660: number | null;
  ft1000: number | null;
  mph1000: number | null;
  ft1320: number | null;
  mph1320: number | null;
  win_flag: boolean | null;
  dq_flag: boolean | null;
  mov: number | null;
  place: string | null;
  source_ref: string | null;
}

/**
 * Normalize a single raw OData row into a NormalizedParityRun.
 */
export function normalizeRow(raw: Record<string, any>, raceLookup: string): NormalizedParityRun {
  const row: Record<string, any> = { race_lookup: raceLookup };

  for (const [normalizedKey, aliases] of Object.entries(FIELD_ALIASES)) {
    const value = findField(raw, aliases);

    if (TIMESTAMP_FIELDS.has(normalizedKey)) {
      row[normalizedKey] = parseTimestamp(value);
    } else if (BOOL_FIELDS.has(normalizedKey)) {
      row[normalizedKey] = parseBool(value);
    } else if (FLOAT_FIELDS.has(normalizedKey)) {
      row[normalizedKey] = parseFloat_(value);
    } else {
      // String fields (round, place, category, etc.)
      row[normalizedKey] = (value != null && value !== '') ? String(value) : null;
    }
  }

  return row as NormalizedParityRun;
}

/**
 * Find a field value from a raw row using alias list (case-insensitive fallback).
 */
export function findField(raw: Record<string, any>, aliases: string[]): any {
  // Exact match first
  for (const alias of aliases) {
    if (alias in raw) return raw[alias];
  }
  // Case-insensitive fallback
  const lowered: Record<string, any> = {};
  for (const [k, v] of Object.entries(raw)) {
    lowered[k.toLowerCase()] = v;
  }
  for (const alias of aliases) {
    const key = alias.toLowerCase();
    if (key in lowered) return lowered[key];
  }
  return null;
}

/**
 * Parse a value as a float, returning null if not numeric.
 */
export function parseFloat_(value: any): number | null {
  if (value == null || value === '') return null;
  const n = Number(value);
  if (!isNaN(n)) return n;
  // Strip non-numeric chars
  const cleaned = String(value).replace(/[^0-9.\-]/g, '');
  if (cleaned !== '' && !isNaN(Number(cleaned))) return Number(cleaned);
  return null;
}

/**
 * Parse a value as a boolean, returning null if unparseable.
 */
export function parseBool(value: any): boolean | null {
  if (value == null || value === '') return null;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  const s = String(value).toLowerCase().trim();
  if (['true', '1', 'y', 'yes', 'w', 'win'].includes(s)) return true;
  if (['false', '0', 'n', 'no', 'l', 'loss'].includes(s)) return false;
  return null;
}

/**
 * Parse a timestamp string into ISO format, or null.
 */
export function parseTimestamp(value: any): string | null {
  if (value == null || value === '') return null;
  const s = String(value);

  // OData v2 date format: /Date(1234567890000)/
  const odataMatch = s.match(/\/Date\((\d+)\)\//);
  if (odataMatch) {
    return new Date(parseInt(odataMatch[1], 10)).toISOString();
  }

  // Try standard Date parsing
  const d = new Date(s);
  if (!isNaN(d.getTime())) {
    return d.toISOString();
  }

  return null;
}

/**
 * Compute a deterministic row hash for de-duplication.
 */
export function computeRowHash(raceLookup: string, normalized: NormalizedParityRun): string {
  if (normalized.source_ref != null && normalized.source_ref !== '') {
    return `${raceLookup}|${normalized.source_ref}`;
  }

  const parts = [
    raceLookup,
    normalized.driver_name ?? '',
    normalized.lane ?? '',
    normalized.round ?? '',
    normalized.class_index ?? '',
    normalized.ft1320 != null ? String(normalized.ft1320) : '',
    normalized.mph1320 != null ? String(normalized.mph1320) : '',
    normalized.rt != null ? String(normalized.rt) : '',
  ];

  return parts.join('|');
}
