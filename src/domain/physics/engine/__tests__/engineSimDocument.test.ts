import { describe, it, expect } from 'vitest';
import {
  serializeEngineSimDocument,
  parseEngineSimDocument,
  migrateEngineSimDocument,
  createEngineSimDocument,
  ENGINE_SIM_SCHEMA,
  ENGINE_SIM_CURRENT_VERSION,
  type EngineSimDocumentV1,
} from '../engineSimDocument';
import { createDefaultEngineProConfig, type EngineSimConfig } from '../engineAdapter';
import {
  hasValidFlowBenchData,
  hydrateFlowBenchFromConfig,
  normalizeFlowBenchForStorage,
} from '../worksheets/flowBenchWorksheet';

// ── Helpers ─────────────────────────────────────────────────────────

function makeValidDoc(overrides?: Partial<EngineSimDocumentV1>): EngineSimDocumentV1 {
  return {
    schema: ENGINE_SIM_SCHEMA,
    version: ENGINE_SIM_CURRENT_VERSION,
    createdAtIso: '2025-01-01T00:00:00.000Z',
    updatedAtIso: '2025-01-01T00:00:00.000Z',
    name: 'Test Config',
    config: createDefaultEngineProConfig(),
    ...overrides,
  };
}

// ── Round-trip ──────────────────────────────────────────────────────

describe('serializeEngineSimDocument / parseEngineSimDocument round-trip', () => {
  it('round-trips a full document preserving config values', () => {
    const original = makeValidDoc();
    const json = serializeEngineSimDocument(original);
    const parsed = parseEngineSimDocument(json);

    // Config should be identical
    expect(parsed.config).toEqual(original.config);
    expect(parsed.schema).toBe(ENGINE_SIM_SCHEMA);
    expect(parsed.version).toBe(1);
    expect(parsed.name).toBe('Test Config');
  });

  it('preserves numeric precision through round-trip', () => {
    const original = makeValidDoc();
    original.config.bore_in = 4.030;
    original.config.stroke_in = 3.480;
    original.config.intakeManifoldFlowFactor_pct = 96.0;

    const json = serializeEngineSimDocument(original);
    const parsed = parseEngineSimDocument(json);

    expect(parsed.config.bore_in).toBe(4.03);
    expect(parsed.config.stroke_in).toBe(3.48);
    expect(parsed.config.intakeManifoldFlowFactor_pct).toBe(96);
  });

  it('preserves optional fields through round-trip', () => {
    const original = makeValidDoc();
    original.config.lobeSeparationAngle_deg = 112;
    original.config.intakeLobeCenterline_deg = 108;
    original.config.maxIntakeValveLift_in = 0.550;
    original.ui = { activeTab: 'mech_details', selectedRpmMech: 6500 };

    const json = serializeEngineSimDocument(original);
    const parsed = parseEngineSimDocument(json);

    expect(parsed.config.lobeSeparationAngle_deg).toBe(112);
    expect(parsed.config.intakeLobeCenterline_deg).toBe(108);
    expect(parsed.config.maxIntakeValveLift_in).toBe(0.55);
    expect(parsed.ui?.activeTab).toBe('mech_details');
    expect(parsed.ui?.selectedRpmMech).toBe(6500);
  });

  it('updates updatedAtIso on serialize', () => {
    const original = makeValidDoc();
    original.updatedAtIso = '2020-01-01T00:00:00.000Z';

    const json = serializeEngineSimDocument(original);
    const parsed = parseEngineSimDocument(json);

    // Should be newer than the original
    expect(new Date(parsed.updatedAtIso).getTime()).toBeGreaterThan(
      new Date('2020-01-01T00:00:00.000Z').getTime()
    );
  });
});

// ── Validation errors ───────────────────────────────────────────────

describe('parseEngineSimDocument validation', () => {
  it('rejects non-JSON input', () => {
    expect(() => parseEngineSimDocument('not json {')).toThrow('not valid JSON');
  });

  it('rejects non-object JSON', () => {
    expect(() => parseEngineSimDocument('"hello"')).toThrow('expected a JSON object');
  });

  it('rejects array JSON', () => {
    expect(() => parseEngineSimDocument('[1,2,3]')).toThrow('expected a JSON object');
  });

  it('rejects wrong schema', () => {
    expect(() => parseEngineSimDocument(JSON.stringify({
      schema: 'rsa.otherThing', version: 1, config: {},
    }))).toThrow('expected schema "rsa.engineSim"');
  });

  it('rejects missing schema', () => {
    expect(() => parseEngineSimDocument(JSON.stringify({
      version: 1, config: {},
    }))).toThrow('expected schema "rsa.engineSim"');
  });

  it('rejects non-integer version', () => {
    expect(() => parseEngineSimDocument(JSON.stringify({
      schema: ENGINE_SIM_SCHEMA, version: 1.5, config: {},
    }))).toThrow('positive integer version');
  });

  it('rejects version 0', () => {
    expect(() => parseEngineSimDocument(JSON.stringify({
      schema: ENGINE_SIM_SCHEMA, version: 0, config: {},
    }))).toThrow('positive integer version');
  });

  it('rejects future version', () => {
    expect(() => parseEngineSimDocument(JSON.stringify({
      schema: ENGINE_SIM_SCHEMA, version: 999, config: {},
    }))).toThrow('newer version of RSA');
  });

  it('rejects missing config', () => {
    expect(() => parseEngineSimDocument(JSON.stringify({
      schema: ENGINE_SIM_SCHEMA, version: 1,
    }))).toThrow('missing or invalid "config"');
  });

  it('rejects config with non-numeric bore_in', () => {
    expect(() => parseEngineSimDocument(JSON.stringify({
      schema: ENGINE_SIM_SCHEMA, version: 1,
      config: { bore_in: 'four', stroke_in: 3.48, rodLength_in: 5.85, compressionRatio: 12.9 },
    }))).toThrow('config.bore_in must be a finite number');
  });

  it('rejects config with NaN compressionRatio', () => {
    expect(() => parseEngineSimDocument(JSON.stringify({
      schema: ENGINE_SIM_SCHEMA, version: 1,
      config: { bore_in: 4.03, stroke_in: 3.48, rodLength_in: 5.85, compressionRatio: null },
    }))).toThrow('config.compressionRatio must be a finite number');
  });
});

// ── Migration ───────────────────────────────────────────────────────

describe('migrateEngineSimDocument', () => {
  it('accepts a minimal valid V1 doc and fills timestamps', () => {
    const minimal = {
      schema: ENGINE_SIM_SCHEMA,
      version: 1,
      config: createDefaultEngineProConfig(),
    };

    const migrated = migrateEngineSimDocument(minimal);

    expect(migrated.schema).toBe(ENGINE_SIM_SCHEMA);
    expect(migrated.version).toBe(1);
    expect(typeof migrated.createdAtIso).toBe('string');
    expect(typeof migrated.updatedAtIso).toBe('string');
    expect(migrated.config.bore_in).toBe(4.03);
  });

  it('preserves existing timestamps', () => {
    const doc = makeValidDoc();
    const migrated = migrateEngineSimDocument(doc);

    expect(migrated.createdAtIso).toBe('2025-01-01T00:00:00.000Z');
    expect(migrated.updatedAtIso).toBe('2025-01-01T00:00:00.000Z');
  });
});

// ── Factory ─────────────────────────────────────────────────────────

describe('createEngineSimDocument', () => {
  it('creates a valid document from config', () => {
    const config = createDefaultEngineProConfig();
    const doc = createEngineSimDocument(config, 'My Engine');

    expect(doc.schema).toBe(ENGINE_SIM_SCHEMA);
    expect(doc.version).toBe(1);
    expect(doc.name).toBe('My Engine');
    expect(doc.config).toBe(config);
    expect(typeof doc.createdAtIso).toBe('string');

    // Should be parseable
    const json = serializeEngineSimDocument(doc);
    const parsed = parseEngineSimDocument(json);
    expect(parsed.config).toEqual(config);
  });
});

// =========================================================================
// Flowbench array round-trip persistence
// =========================================================================
describe('flowbench array round-trip', () => {
  const FB_LIFTS = [0.1, 0.2, 0.3, 0.4];
  const FB_FLOWS = [80, 140, 190, 230];

  function makeConfigWithFlowbench(
    lifts: number[],
    flows: number[],
  ): EngineSimConfig {
    return {
      ...createDefaultEngineProConfig(),
      flowBenchLifts_in: lifts,
      flowBenchFlows_cfm: flows,
    };
  }

  it('active-only arrays survive serialize -> parse round-trip', () => {
    const config = makeConfigWithFlowbench(FB_LIFTS, FB_FLOWS);
    const doc = createEngineSimDocument(config, 'FB Test');
    const json = serializeEngineSimDocument(doc);
    const parsed = parseEngineSimDocument(json);

    expect(parsed.config.flowBenchLifts_in).toEqual(FB_LIFTS);
    expect(parsed.config.flowBenchFlows_cfm).toEqual(FB_FLOWS);
  });

  it('arrays with trailing zeros survive round-trip', () => {
    const liftsWithZeros = [0.1, 0.2, 0.3, 0, 0, 0, 0, 0, 0, 0];
    const flowsWithZeros = [80, 140, 190, 0, 0, 0, 0, 0, 0, 0];
    const config = makeConfigWithFlowbench(liftsWithZeros, flowsWithZeros);
    const doc = createEngineSimDocument(config, 'FB Trailing Zeros');
    const json = serializeEngineSimDocument(doc);
    const parsed = parseEngineSimDocument(json);

    expect(parsed.config.flowBenchLifts_in).toEqual(liftsWithZeros);
    expect(parsed.config.flowBenchFlows_cfm).toEqual(flowsWithZeros);
  });

  it('round-tripped arrays pass hasValidFlowBenchData', () => {
    const config = makeConfigWithFlowbench(FB_LIFTS, FB_FLOWS);
    const doc = createEngineSimDocument(config, 'FB Valid');
    const json = serializeEngineSimDocument(doc);
    const parsed = parseEngineSimDocument(json);

    const check = hasValidFlowBenchData(
      parsed.config.flowBenchLifts_in,
      parsed.config.flowBenchFlows_cfm,
    );
    expect(check.valid).toBe(true);
  });

  it('round-tripped arrays hydrate correctly', () => {
    const config = makeConfigWithFlowbench(FB_LIFTS, FB_FLOWS);
    const doc = createEngineSimDocument(config, 'FB Hydrate');
    const json = serializeEngineSimDocument(doc);
    const parsed = parseEngineSimDocument(json);

    const h = hydrateFlowBenchFromConfig(
      parsed.config.flowBenchLifts_in!,
      parsed.config.flowBenchFlows_cfm!,
      v => v.toFixed(3),
    );

    expect(h.fbLifts).toEqual(FB_LIFTS);
    expect(h.fbFlows).toEqual(FB_FLOWS);
    expect(h.fbLiftTxt[0]).toBe('0.100');
    expect(h.fbLiftTxt[3]).toBe('0.400');
    expect(h.fbFlowTxt[0]).toBe('80');
    expect(h.fbFlowTxt[3]).toBe('230');
  });

  it('config WITHOUT flowbench arrays fails validation (triggers default gen)', () => {
    const config = createDefaultEngineProConfig();
    const doc = createEngineSimDocument(config, 'No FB');
    const json = serializeEngineSimDocument(doc);
    const parsed = parseEngineSimDocument(json);

    expect(parsed.config.flowBenchLifts_in).toBeUndefined();
    expect(parsed.config.flowBenchFlows_cfm).toBeUndefined();

    const check = hasValidFlowBenchData(
      parsed.config.flowBenchLifts_in,
      parsed.config.flowBenchFlows_cfm,
    );
    expect(check.valid).toBe(false);
    expect(check.reason).toBe('missing arrays');
  });

  it('numeric precision preserved through JSON round-trip', () => {
    const preciseLifts = [0.055, 0.110, 0.165, 0.220];
    const preciseFlows = [33.5, 78.2, 121.7, 158.3];
    const config = makeConfigWithFlowbench(preciseLifts, preciseFlows);
    const doc = createEngineSimDocument(config, 'FB Precision');
    const json = serializeEngineSimDocument(doc);
    const parsed = parseEngineSimDocument(json);

    expect(parsed.config.flowBenchLifts_in).toEqual(preciseLifts);
    expect(parsed.config.flowBenchFlows_cfm).toEqual(preciseFlows);
  });
});

// =========================================================================
// normalizeFlowBenchForStorage
// =========================================================================
describe('normalizeFlowBenchForStorage', () => {
  it('trims trailing zeros from arrays', () => {
    const result = normalizeFlowBenchForStorage(
      [0.1, 0.2, 0.3, 0, 0, 0],
      [80, 140, 190, 0, 0, 0],
    );
    expect(result).toEqual({ lifts: [0.1, 0.2, 0.3], flows: [80, 140, 190] });
  });

  it('returns active-only arrays unchanged', () => {
    const result = normalizeFlowBenchForStorage(
      [0.1, 0.2, 0.3],
      [80, 140, 190],
    );
    expect(result).toEqual({ lifts: [0.1, 0.2, 0.3], flows: [80, 140, 190] });
  });

  it('returns undefined for undefined inputs', () => {
    expect(normalizeFlowBenchForStorage(undefined, undefined)).toBeUndefined();
    expect(normalizeFlowBenchForStorage(undefined, [100])).toBeUndefined();
    expect(normalizeFlowBenchForStorage([0.1], undefined)).toBeUndefined();
  });

  it('returns undefined for fewer than 2 active points', () => {
    expect(normalizeFlowBenchForStorage([0.1], [80])).toBeUndefined();
    expect(normalizeFlowBenchForStorage([0, 0], [0, 0])).toBeUndefined();
    expect(normalizeFlowBenchForStorage([], [])).toBeUndefined();
  });

  it('normalized output passes hasValidFlowBenchData', () => {
    const result = normalizeFlowBenchForStorage(
      [0.1, 0.2, 0.3, 0.4, 0, 0, 0, 0, 0, 0],
      [80, 140, 190, 230, 0, 0, 0, 0, 0, 0],
    );
    expect(result).toBeDefined();
    const check = hasValidFlowBenchData(result!.lifts, result!.flows);
    expect(check.valid).toBe(true);
  });

  it('full normalize -> save -> load -> validate -> hydrate pipeline', () => {
    // Simulate what buildDoc does: normalize, then save
    const rawLifts = [0.1, 0.2, 0.3, 0.4, 0, 0, 0, 0, 0, 0];
    const rawFlows = [80, 140, 190, 230, 0, 0, 0, 0, 0, 0];
    const normalized = normalizeFlowBenchForStorage(rawLifts, rawFlows)!;

    const config: EngineSimConfig = {
      ...createDefaultEngineProConfig(),
      flowBenchLifts_in: normalized.lifts,
      flowBenchFlows_cfm: normalized.flows,
    };
    const doc = createEngineSimDocument(config, 'Pipeline Test');
    const json = serializeEngineSimDocument(doc);

    // Simulate load
    const parsed = parseEngineSimDocument(json);
    const check = hasValidFlowBenchData(
      parsed.config.flowBenchLifts_in,
      parsed.config.flowBenchFlows_cfm,
    );
    expect(check.valid).toBe(true);

    const h = hydrateFlowBenchFromConfig(
      parsed.config.flowBenchLifts_in!,
      parsed.config.flowBenchFlows_cfm!,
      v => v.toFixed(3),
    );
    expect(h.fbLifts).toEqual([0.1, 0.2, 0.3, 0.4]);
    expect(h.fbFlows).toEqual([80, 140, 190, 230]);
    expect(h.fbLiftTxt[0]).toBe('0.100');
    expect(h.fbFlowTxt[3]).toBe('230');
    // Trailing slots empty
    expect(h.fbLiftTxt[4]).toBe('');
    expect(h.fbFlowTxt[4]).toBe('');
  });
});
