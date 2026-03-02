/**
 * NHRA Tech Parity — Mapper & OData Tests
 *
 * Tests:
 * 1. OData row extraction (v4 shape, v2 shape, v2 alt, empty)
 * 2. OData pagination link extraction
 * 3. Field alias resolution (exact, case-insensitive)
 * 4. Normalization (floats, bools, timestamps, strings)
 * 5. Row hash computation (with source_ref, without)
 * 6. De-dupe invariant (same data → same hash)
 * 7. Capability gating (nhra.parity is role-based, not plan-based)
 */

import { describe, it, expect } from 'vitest';
import {
  extractODataRows,
  extractODataNextLink,
  normalizeRow,
  findField,
  parseFloat_,
  parseBool,
  parseTimestamp,
  computeRowHash,
  FIELD_ALIASES,
} from '../nhraMapper';
import {
  hasCap,
  PLAN_CAPABILITIES,
  ROLE_CAPABILITIES,
  type UserCapabilityContext,
} from '../../config/capabilities';

// ── Fixtures ──────────────────────────────────────────────────────────

const SAMPLE_ROW_V4 = {
  DumbyID: 'R001',
  DriverName: 'John Force',
  Category: 'Funny Car',
  ClassIndex: 'FC',
  Round: '1',
  Lane: 'Left',
  RT: '0.062',
  ft60: '0.891',
  ft330: '2.345',
  ft660: '3.456',
  mph660: '278.5',
  ft1000: '4.567',
  mph1000: '305.2',
  ft1320: '5.678',
  mph1320: '320.1',
  DialIn: null,
  Win: true,
  DQ: 'N',
  MOV: '0.0234',
  QualPos: '1',
  CarNumber: '16',
  TimestampUtc: '2026-02-23T14:30:00Z',
};

// Real NHRA OData row from peek on 20251030 event
const SAMPLE_ROW_NHRA_REAL = {
  TimeStamp: '10/30/2025 07:35:38',
  Round: 'Q1',
  Lane: 'L',
  QualPos: '0',
  CarNumber: '7801',
  Name: 'Pete Lanciers',
  ClassIndex: 'F/SA',
  DialIn: '12.05',
  RT: '.008',
  ft60: '1.442',
  ft330: '4.430',
  ft660: '7.005',
  mph660: '94.78',
  ft1000: '9.256',
  mph1000: '',
  ft1320: '11.173',
  mph1320: '117.42',
  MOV: '',
  Win: 'W',
  IsDQ: '7801',
  Place: '7801',
  Category: 'STOCK ELIMINATOR',
  DumbyID: '1',
};

const SAMPLE_ROW_V2 = {
  Name: 'Brittany Force',
  Cat: 'Top Fuel',
  Class: 'TF',
  Rnd: 2,
  Lane: 'Right',
  ReactionTime: 0.044,
  SixtyFoot: 0.832,
  ThreeThirty: 2.198,
  SixSixty: 3.201,
  EighthMileMPH: 289.3,
  ThousandFoot: 4.321,
  '1000mph': 312.8,
  QuarterMileET: 5.432,
  QuarterMileMPH: 330.5,
  Winner: 'Y',
  DQ: 'N',
  MarginOfVictory: 0.0156,
  Finish: '1',
  CarNo: '2',
  TimeStamp: '/Date(1740320400000)/',
};

// ── 1. OData Row Extraction ──────────────────────────────────────────

describe('OData row extraction', () => {
  it('extracts rows from v4 shape (value array)', () => {
    const json = { value: [SAMPLE_ROW_V4, SAMPLE_ROW_V4] };
    const rows = extractODataRows(json);
    expect(rows).toHaveLength(2);
    expect(rows[0].DriverName).toBe('John Force');
  });

  it('extracts rows from v2 shape (d.results)', () => {
    const json = { d: { results: [SAMPLE_ROW_V2], __next: 'http://next' } };
    const rows = extractODataRows(json);
    expect(rows).toHaveLength(1);
    expect(rows[0].Name).toBe('Brittany Force');
  });

  it('extracts rows from v2 alt shape (d as array)', () => {
    const json = { d: [SAMPLE_ROW_V2] };
    const rows = extractODataRows(json);
    expect(rows).toHaveLength(1);
  });

  it('returns empty array for unknown shape', () => {
    expect(extractODataRows({})).toEqual([]);
    expect(extractODataRows({ data: [] })).toEqual([]);
  });

  it('handles paged v4 response with nextLink', () => {
    const page1 = {
      value: [SAMPLE_ROW_V4],
      '@odata.nextLink': 'http://odata.nhradata.com/api/oGetResults/GetResults/20260223?$skip=100',
    };
    const rows = extractODataRows(page1);
    expect(rows).toHaveLength(1);
    const next = extractODataNextLink(page1);
    expect(next).toBe('http://odata.nhradata.com/api/oGetResults/GetResults/20260223?$skip=100');
  });

  it('handles paged v2 response with __next', () => {
    const page1 = {
      d: { results: [SAMPLE_ROW_V2], __next: 'http://next-page' },
    };
    const next = extractODataNextLink(page1);
    expect(next).toBe('http://next-page');
  });

  it('returns null nextLink when no pagination', () => {
    expect(extractODataNextLink({ value: [] })).toBeNull();
    expect(extractODataNextLink({ d: { results: [] } })).toBeNull();
  });
});

// ── 2. Field Alias Resolution ────────────────────────────────────────

describe('Field alias resolution', () => {
  it('finds exact match', () => {
    expect(findField({ DriverName: 'Test' }, ['DriverName', 'Name'])).toBe('Test');
  });

  it('falls back to case-insensitive match', () => {
    expect(findField({ drivername: 'Test' }, ['DriverName'])).toBe('Test');
  });

  it('returns null when no match', () => {
    expect(findField({ foo: 'bar' }, ['DriverName', 'Name'])).toBeNull();
  });

  it('prefers earlier alias', () => {
    const raw = { Name: 'A', DriverName: 'B' };
    // DriverName comes before Name in the alias list
    expect(findField(raw, ['DriverName', 'Name'])).toBe('B');
  });

  it('FIELD_ALIASES covers all expected normalized fields', () => {
    const expectedFields = [
      'run_timestamp_utc', 'category', 'class_index', 'round', 'lane',
      'driver_name', 'car_number', 'dial_in', 'rt', 'ft60', 'ft330',
      'ft660', 'mph660', 'ft1000', 'mph1000', 'ft1320', 'mph1320',
      'win_flag', 'dq_flag', 'mov', 'place', 'source_ref',
    ];
    for (const field of expectedFields) {
      expect(FIELD_ALIASES).toHaveProperty(field);
      expect(FIELD_ALIASES[field].length).toBeGreaterThan(0);
    }
  });
});

// ── 3. Type Parsers ──────────────────────────────────────────────────

describe('parseFloat_', () => {
  it('parses numeric strings', () => {
    expect(parseFloat_('5.678')).toBe(5.678);
    expect(parseFloat_('320.1')).toBe(320.1);
  });

  it('parses numbers', () => {
    expect(parseFloat_(5.678)).toBe(5.678);
  });

  it('returns null for empty/null', () => {
    expect(parseFloat_(null)).toBeNull();
    expect(parseFloat_('')).toBeNull();
    expect(parseFloat_(undefined)).toBeNull();
  });

  it('strips non-numeric chars', () => {
    expect(parseFloat_('5.678s')).toBe(5.678);
  });

  it('returns null for non-numeric strings', () => {
    expect(parseFloat_('N/A')).toBeNull();
    expect(parseFloat_('---')).toBeNull();
  });
});

describe('parseBool', () => {
  it('parses true values', () => {
    expect(parseBool(true)).toBe(true);
    expect(parseBool(1)).toBe(true);
    expect(parseBool('Y')).toBe(true);
    expect(parseBool('yes')).toBe(true);
    expect(parseBool('W')).toBe(true);
    expect(parseBool('win')).toBe(true);
    expect(parseBool('true')).toBe(true);
    expect(parseBool('1')).toBe(true);
  });

  it('parses false values', () => {
    expect(parseBool(false)).toBe(false);
    expect(parseBool(0)).toBe(false);
    expect(parseBool('N')).toBe(false);
    expect(parseBool('no')).toBe(false);
    expect(parseBool('L')).toBe(false);
    expect(parseBool('loss')).toBe(false);
    expect(parseBool('false')).toBe(false);
    expect(parseBool('0')).toBe(false);
  });

  it('returns null for unparseable', () => {
    expect(parseBool(null)).toBeNull();
    expect(parseBool('')).toBeNull();
    expect(parseBool('maybe')).toBeNull();
  });
});

describe('parseTimestamp', () => {
  it('parses ISO string', () => {
    const result = parseTimestamp('2026-02-23T14:30:00Z');
    expect(result).toBe('2026-02-23T14:30:00.000Z');
  });

  it('parses OData v2 /Date()/ format', () => {
    const result = parseTimestamp('/Date(1740320400000)/');
    expect(result).not.toBeNull();
    // Should be a valid ISO string
    expect(new Date(result!).getTime()).toBe(1740320400000);
  });

  it('returns null for empty/null', () => {
    expect(parseTimestamp(null)).toBeNull();
    expect(parseTimestamp('')).toBeNull();
  });

  it('returns null for unparseable', () => {
    expect(parseTimestamp('not-a-date')).toBeNull();
  });
});

// ── 4. Full Row Normalization ────────────────────────────────────────

describe('normalizeRow', () => {
  it('normalizes a v4-style row', () => {
    const result = normalizeRow(SAMPLE_ROW_V4, '20260223');
    expect(result.race_lookup).toBe('20260223');
    expect(result.driver_name).toBe('John Force');
    expect(result.category).toBe('Funny Car');
    expect(result.class_index).toBe('FC');
    expect(result.round).toBe('1');
    expect(result.lane).toBe('Left');
    expect(result.rt).toBe(0.062);
    expect(result.ft60).toBe(0.891);
    expect(result.ft330).toBe(2.345);
    expect(result.ft660).toBe(3.456);
    expect(result.mph660).toBe(278.5);
    expect(result.ft1000).toBe(4.567);
    expect(result.mph1000).toBe(305.2);
    expect(result.ft1320).toBe(5.678);
    expect(result.mph1320).toBe(320.1);
    expect(result.win_flag).toBe(true);
    expect(result.dq_flag).toBe(false);
    expect(result.mov).toBe(0.0234);
    expect(result.place).toBe('1');
    expect(result.car_number).toBe('16');
    expect(result.source_ref).toBe('R001');
    expect(result.run_timestamp_utc).toBe('2026-02-23T14:30:00.000Z');
  });

  it('normalizes a real NHRA OData row correctly', () => {
    const result = normalizeRow(SAMPLE_ROW_NHRA_REAL, '20251030');
    expect(result.race_lookup).toBe('20251030');
    expect(result.driver_name).toBe('Pete Lanciers');
    expect(result.category).toBe('STOCK ELIMINATOR');
    expect(result.class_index).toBe('F/SA');
    expect(result.round).toBe('Q1');
    expect(result.lane).toBe('L');
    expect(result.car_number).toBe('7801');
    expect(result.dial_in).toBe(12.05);
    expect(result.rt).toBe(0.008);
    expect(result.ft60).toBe(1.442);
    expect(result.ft330).toBe(4.43);
    expect(result.ft660).toBe(7.005);
    expect(result.mph660).toBe(94.78);
    expect(result.ft1000).toBe(9.256);
    expect(result.mph1000).toBeNull(); // empty string in source
    expect(result.ft1320).toBe(11.173);
    expect(result.mph1320).toBe(117.42);
    expect(result.win_flag).toBe(true); // 'W' → true
    expect(result.dq_flag).toBeNull(); // IsDQ not in dq_flag aliases (contains car number)
    expect(result.mov).toBeNull(); // empty string
    expect(result.place).toBe('0'); // QualPos
    expect(result.source_ref).toBe('1'); // DumbyID
    expect(result.run_timestamp_utc).not.toBeNull();
  });

  it('normalizes a v2-style row with different field names', () => {
    const result = normalizeRow(SAMPLE_ROW_V2, '20260223');
    expect(result.driver_name).toBe('Brittany Force');
    expect(result.category).toBe('Top Fuel');
    expect(result.class_index).toBe('TF');
    expect(result.round).toBe('2');
    expect(result.rt).toBe(0.044);
    expect(result.ft60).toBe(0.832);
    expect(result.ft1320).toBe(5.432);
    expect(result.mph1320).toBe(330.5);
    expect(result.win_flag).toBe(true);
    expect(result.dq_flag).toBe(false);
    expect(result.car_number).toBe('2');
    expect(result.run_timestamp_utc).not.toBeNull();
  });

  it('handles missing fields gracefully', () => {
    const sparse = { DriverName: 'Test Driver' };
    const result = normalizeRow(sparse, '20260223');
    expect(result.driver_name).toBe('Test Driver');
    expect(result.rt).toBeNull();
    expect(result.ft1320).toBeNull();
    expect(result.win_flag).toBeNull();
    expect(result.run_timestamp_utc).toBeNull();
    expect(result.category).toBeNull();
  });

  it('handles all-null row', () => {
    const result = normalizeRow({}, '20260223');
    expect(result.race_lookup).toBe('20260223');
    expect(result.driver_name).toBeNull();
    expect(result.rt).toBeNull();
  });
});

// ── 5. Row Hash Computation ──────────────────────────────────────────

describe('computeRowHash', () => {
  it('uses source_ref when available', () => {
    const row = normalizeRow(SAMPLE_ROW_V4, '20260223');
    const hash = computeRowHash('20260223', row);
    expect(hash).toBe('20260223|R001');
  });

  it('uses source_ref from real NHRA DumbyID', () => {
    const row = normalizeRow(SAMPLE_ROW_NHRA_REAL, '20251030');
    const hash = computeRowHash('20251030', row);
    expect(hash).toBe('20251030|1');
  });

  it('uses stable fields when no source_ref', () => {
    const raw = { ...SAMPLE_ROW_V4 };
    delete (raw as any).DumbyID;
    const row = normalizeRow(raw, '20260223');
    const hash = computeRowHash('20260223', row);
    expect(hash).toContain('20260223');
    expect(hash).toContain('John Force');
    expect(hash).toContain('Left');
  });

  it('same data produces same hash (de-dupe invariant)', () => {
    const row1 = normalizeRow(SAMPLE_ROW_V4, '20260223');
    const row2 = normalizeRow(SAMPLE_ROW_V4, '20260223');
    expect(computeRowHash('20260223', row1)).toBe(computeRowHash('20260223', row2));
  });

  it('different data produces different hash', () => {
    const row1 = normalizeRow(SAMPLE_ROW_V4, '20260223');
    const modified = { ...SAMPLE_ROW_V4, DumbyID: 'R002' };
    const row2 = normalizeRow(modified, '20260223');
    expect(computeRowHash('20260223', row1)).not.toBe(computeRowHash('20260223', row2));
  });
});

// ── 6. Capability Gating ─────────────────────────────────────────────

describe('nhra.parity capability gating', () => {
  it('free user does NOT have nhra.parity', () => {
    const ctx: UserCapabilityContext = { plan: 'free', role: 'member' };
    expect(hasCap(ctx, 'nhra.parity')).toBe(false);
  });

  it('basic user does NOT have nhra.parity', () => {
    const ctx: UserCapabilityContext = { plan: 'basic', role: 'member' };
    expect(hasCap(ctx, 'nhra.parity')).toBe(false);
  });

  it('pro user does NOT have nhra.parity', () => {
    const ctx: UserCapabilityContext = { plan: 'pro', role: 'member' };
    expect(hasCap(ctx, 'nhra.parity')).toBe(false);
  });

  it('team user does NOT have nhra.parity', () => {
    const ctx: UserCapabilityContext = { plan: 'team', role: 'member' };
    expect(hasCap(ctx, 'nhra.parity')).toBe(false);
  });

  it('owner HAS nhra.parity (role-based)', () => {
    const ctx: UserCapabilityContext = { plan: 'free', role: 'owner' };
    expect(hasCap(ctx, 'nhra.parity')).toBe(true);
  });

  it('admin HAS nhra.parity (role-based)', () => {
    const ctx: UserCapabilityContext = { plan: 'free', role: 'admin' };
    expect(hasCap(ctx, 'nhra.parity')).toBe(true);
  });

  it('nhra.parity is NOT in free/basic/pro/team plan capabilities', () => {
    for (const planId of ['free', 'basic', 'pro', 'team'] as const) {
      expect(PLAN_CAPABILITIES[planId].has('nhra.parity' as any)).toBe(false);
    }
  });

  it('nhra.parity IS in the nhra plan', () => {
    expect(PLAN_CAPABILITIES.nhra.has('nhra.parity' as any)).toBe(true);
  });

  it('nhra plan user HAS nhra.parity', () => {
    const ctx: UserCapabilityContext = { plan: 'nhra', role: 'member' };
    expect(hasCap(ctx, 'nhra.parity')).toBe(true);
  });

  it('nhra plan user does NOT have nhra.parity.admin', () => {
    const ctx: UserCapabilityContext = { plan: 'nhra', role: 'member' };
    expect(hasCap(ctx, 'nhra.parity.admin')).toBe(false);
  });

  it('nhra.parity IS in owner and admin role capabilities', () => {
    expect(ROLE_CAPABILITIES.owner.has('nhra.parity' as any)).toBe(true);
    expect(ROLE_CAPABILITIES.admin.has('nhra.parity' as any)).toBe(true);
  });

  it('nhra.parity.admin IS in owner and admin role capabilities', () => {
    expect(ROLE_CAPABILITIES.owner.has('nhra.parity.admin' as any)).toBe(true);
    expect(ROLE_CAPABILITIES.admin.has('nhra.parity.admin' as any)).toBe(true);
  });

  it('nhra.parity is NOT in member or viewer role capabilities', () => {
    expect(ROLE_CAPABILITIES.member.has('nhra.parity' as any)).toBe(false);
    expect(ROLE_CAPABILITIES.viewer.has('nhra.parity' as any)).toBe(false);
  });

  it('fullAccess grants nhra.parity', () => {
    const ctx: UserCapabilityContext = { plan: 'free', role: 'member', fullAccess: true };
    expect(hasCap(ctx, 'nhra.parity')).toBe(true);
  });
});

// ── 7. Cross-import Dedupe Invariant ────────────────────────────────────

describe('cross-import dedupe', () => {
  it('same DumbyID + raceLookup produces identical hash across imports', () => {
    // Simulate two imports of the same event — same raw row should produce same hash
    const row1 = normalizeRow(SAMPLE_ROW_NHRA_REAL, '20251030');
    const hash1 = computeRowHash('20251030', row1);

    // Second "import" — identical raw data
    const row2 = normalizeRow({ ...SAMPLE_ROW_NHRA_REAL }, '20251030');
    const hash2 = computeRowHash('20251030', row2);

    expect(hash1).toBe(hash2);
    // Both use source_ref path (DumbyID)
    expect(hash1).toBe('20251030|1');
  });

  it('different DumbyID same raceLookup produces different hash', () => {
    const row1 = normalizeRow(SAMPLE_ROW_NHRA_REAL, '20251030');
    const row2 = normalizeRow({ ...SAMPLE_ROW_NHRA_REAL, DumbyID: '999' }, '20251030');
    expect(computeRowHash('20251030', row1)).not.toBe(computeRowHash('20251030', row2));
  });

  it('same DumbyID different raceLookup produces different hash', () => {
    const row1 = normalizeRow(SAMPLE_ROW_NHRA_REAL, '20251030');
    const row2 = normalizeRow(SAMPLE_ROW_NHRA_REAL, '20251031');
    expect(computeRowHash('20251030', row1)).not.toBe(computeRowHash('20251031', row2));
  });
});

// ── 8. 0-row Hint Contract ──────────────────────────────────────────────

describe('0-row hint contract', () => {
  it('extractODataRows returns empty array for empty v4 response', () => {
    const json = { value: [] };
    expect(extractODataRows(json)).toEqual([]);
  });

  it('extractODataRows returns empty array for empty v2 response', () => {
    const json = { d: { results: [] } };
    expect(extractODataRows(json)).toEqual([]);
  });

  it('FIELD_ALIASES has DumbyID as first source_ref alias', () => {
    expect(FIELD_ALIASES.source_ref[0]).toBe('DumbyID');
  });

  it('FIELD_ALIASES does NOT have IsDQ in dq_flag aliases', () => {
    expect(FIELD_ALIASES.dq_flag).not.toContain('IsDQ');
  });

  it('FIELD_ALIASES does NOT have Place in place aliases', () => {
    expect(FIELD_ALIASES.place).not.toContain('Place');
  });

  it('FIELD_ALIASES has QualPos as first place alias', () => {
    expect(FIELD_ALIASES.place[0]).toBe('QualPos');
  });
});
