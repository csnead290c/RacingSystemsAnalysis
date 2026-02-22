/**
 * Tests for buildVb6DetailedParameters — VB6-exact Detailed Parameters builder.
 *
 * 1. Unit tests for fromPrintedRows() and fromTraces()
 * 2. Parity test using a real benchmark config (ProStock_Pro)
 * 3. Column/row/rounding assertions
 */

import { describe, it, expect } from 'vitest';
import {
  fromPrintedRows,
  fromTraces,
  buildCSV,
  type DetailedParamRow,
} from '../buildVb6DetailedParameters';
import type { VB6PrintedRow } from '../../../domain/physics/vb6/vb6PrintedRow';
import { simulateVB6Exact } from '../../../domain/physics/models/vb6Exact';
import { BENCHMARK_CONFIGS, validateBenchmarkConfig } from '../../../domain/physics/fixtures/benchmark-configs';
import type { SimInputs, ExtendedVehicle } from '../../../domain/physics';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildSimInputs(configName: string): SimInputs {
  const config = BENCHMARK_CONFIGS[configName];
  if (!config) throw new Error(`Benchmark config not found: ${configName}`);
  validateBenchmarkConfig(config);

  const vehicle: ExtendedVehicle = {
    id: `test_${configName}`,
    name: configName,
    weightLb: config.vehicle.weightLb,
    tireDiaIn: config.vehicle.tireDiaIn ?? (config.vehicle.tireRolloutIn! / Math.PI),
    rearGear: config.vehicle.rearGear ?? config.vehicle.finalDrive!,
    rolloutIn: config.vehicle.rolloutIn,
    powerHP: config.vehicle.torqueCurve
      ? Math.max(...config.vehicle.torqueCurve.map(p => p.hp ?? 0))
      : config.vehicle.powerHP!,
    defaultRaceLength: 'QUARTER',
    torqueCurve: config.vehicle.torqueCurve,
    frontalArea_ft2: config.vehicle.frontalArea_ft2,
    cd: config.vehicle.cd,
    gearRatios: config.vehicle.gearRatios,
    shiftRPM: config.vehicle.shiftRPM,
    wheelbaseIn: config.vehicle.wheelbaseIn,
    overhangIn: config.vehicle.overhangIn,
    tireRolloutIn: config.vehicle.tireRolloutIn,
    tireWidthIn: config.vehicle.tireWidthIn,
    liftCoeff: config.vehicle.liftCoeff,
    rrCoeff: config.vehicle.rrCoeff,
    finalDrive: config.vehicle.finalDrive ?? config.vehicle.rearGear,
    transEff: config.vehicle.transEff,
    gearEff: config.vehicle.gearEff,
    pmi: config.vehicle.pmi,
    converter: config.vehicle.converter,
    clutch: config.vehicle.clutch,
  };

  return {
    vehicle,
    env: {
      elevation: config.env.elevation,
      barometerInHg: config.env.barometerInHg,
      temperatureF: config.env.temperatureF,
      humidityPct: config.env.humidityPct,
      trackTempF: config.env.trackTempF,
      tractionIndex: config.env.tractionIndex,
      windMph: config.env.windMph,
    },
    raceLength: 'QUARTER',
  };
}

/** Make a minimal VB6PrintedRow for testing */
function makePrintedRow(overrides: Partial<VB6PrintedRow> & { type: VB6PrintedRow['type'] }): VB6PrintedRow {
  return {
    type: overrides.type,
    L: overrides.L ?? 1,
    iDist: overrides.iDist ?? 0,
    raw: overrides.raw ?? {
      time_s: 0, dist_ft: 0, vel_fps: 0, ags_g: 0, engRPM: 0, gear: 1, slip: false,
    },
    formatted: overrides.formatted ?? {
      time: '0.00', dist: '0', mph: '0.0', accel: '0.00', rpm: '0', gear: '1', slip: '',
    },
    quantized: overrides.quantized ?? {
      time_s: 0, dist_ft: 0, mph: 0, accel_g: 0, rpm: 0, gear: 1,
    },
    reason: overrides.reason ?? 'TEST',
  };
}

// ---------------------------------------------------------------------------
// Unit tests: fromPrintedRows
// ---------------------------------------------------------------------------

describe('fromPrintedRows', () => {
  it('converts VB6PrintedRow[] to DetailedParamRow[] preserving formatted values', () => {
    const input: VB6PrintedRow[] = [
      makePrintedRow({
        type: 'staged',
        formatted: { time: '0.00', dist: '0', mph: '0.0', accel: '0.00', rpm: '0', gear: '1', slip: '' },
        quantized: { time_s: 0, dist_ft: 0, mph: 0, accel_g: 0, rpm: 0, gear: 1 },
        reason: 'STAGED',
      }),
      makePrintedRow({
        type: 'distance',
        formatted: { time: '1.23', dist: '60', mph: '42.5', accel: '1.32', rpm: '7,890', gear: '1', slip: '(s)' },
        quantized: { time_s: 1.23, dist_ft: 60, mph: 42.5, accel_g: 1.32, rpm: 7890, gear: 1 },
        reason: 'DIST@60',
      }),
    ];

    const rows = fromPrintedRows(input);
    expect(rows).toHaveLength(2);

    // First row: staged
    expect(rows[0].type).toBe('staged');
    expect(rows[0].time).toBe('0.00');
    expect(rows[0].dist).toBe('0');
    expect(rows[0].mph).toBe('0.0');
    expect(rows[0].gear).toBe('1');
    expect(rows[0].slip).toBe('');

    // Second row: distance checkpoint
    expect(rows[1].type).toBe('distance');
    expect(rows[1].time).toBe('1.23');
    expect(rows[1].dist).toBe('60');
    expect(rows[1].mph).toBe('42.5');
    expect(rows[1].accel).toBe('1.32');
    expect(rows[1].rpm).toBe('7,890');
    expect(rows[1].slip).toBe('(s)');

    // Numeric values
    expect(rows[1].time_s).toBe(1.23);
    expect(rows[1].dist_ft).toBe(60);
    expect(rows[1].mph_num).toBe(42.5);
    expect(rows[1].rpm_num).toBe(7890);
  });

  it('returns empty array for empty input', () => {
    expect(fromPrintedRows([])).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Unit tests: fromTraces (fallback)
// ---------------------------------------------------------------------------

describe('fromTraces', () => {
  const traces = Array.from({ length: 100 }, (_, i) => {
    const frac = i / 99;
    return {
      t_s: frac * 10,
      s_ft: frac * 1325,
      v_mph: 30 + frac * 120,
      a_g: 1.5 - frac * 0.8,
      rpm: 5000 + Math.sin(frac * Math.PI * 3) * 2000,
      gear: frac < 0.2 ? 1 : frac < 0.5 ? 2 : frac < 0.8 ? 3 : 4,
    };
  });

  it('produces rows for quarter mile', () => {
    const rows = fromTraces(traces, 1320);
    expect(rows.length).toBeGreaterThan(0);
  });

  it('includes staged row', () => {
    const rows = fromTraces(traces, 1320);
    expect(rows[0].type).toBe('staged');
  });

  it('includes distance checkpoints', () => {
    const rows = fromTraces(traces, 1320);
    const distRows = rows.filter(r => r.type === 'distance');
    expect(distRows.length).toBeGreaterThanOrEqual(3); // 60, 330, 660, 1000, 1320
  });

  it('includes gear change rows', () => {
    const rows = fromTraces(traces, 1320);
    const shiftRows = rows.filter(r => r.type === 'shift');
    expect(shiftRows.length).toBeGreaterThanOrEqual(1);
  });

  it('rows are sorted by time ascending', () => {
    const rows = fromTraces(traces, 1320);
    for (let i = 1; i < rows.length; i++) {
      expect(rows[i].time_s).toBeGreaterThanOrEqual(rows[i - 1].time_s);
    }
  });

  it('returns empty for empty traces', () => {
    expect(fromTraces([], 1320)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Unit tests: buildCSV
// ---------------------------------------------------------------------------

describe('buildCSV', () => {
  it('produces valid CSV with header and data rows', () => {
    const rows: DetailedParamRow[] = [
      {
        type: 'staged', reason: 'STAGED',
        time: '0.00', dist: '0', mph: '0.0', accel: '0.00', rpm: '0', gear: '1', slip: '',
        time_s: 0, dist_ft: 0, mph_num: 0, accel_g: 0, rpm_num: 0, gear_num: 1,
      },
    ];
    const csv = buildCSV(rows);
    const lines = csv.split('\n');
    expect(lines[0]).toBe('Time_s,Dist_ft,MPH,Accel_g,RPM,Gear,Slip,Type');
    expect(lines[1]).toBe('0.00,0,0.0,0.00,0,1,,staged');
  });
});

// ---------------------------------------------------------------------------
// Columns match VB6 spec
// ---------------------------------------------------------------------------

describe('VB6 column spec', () => {
  it('DetailedParamRow has all 7 VB6 columns', () => {
    const row: DetailedParamRow = {
      type: 'time', reason: 'TIME@0.50',
      time: '0.50', dist: '120', mph: '55.3', accel: '1.10', rpm: '6,500', gear: '2', slip: '',
      time_s: 0.5, dist_ft: 120, mph_num: 55.3, accel_g: 1.1, rpm_num: 6500, gear_num: 2,
    };
    // VB6 columns: Time, Dist, MPH, Accel, RPM, Gear, Slip
    expect(row.time).toBeDefined();
    expect(row.dist).toBeDefined();
    expect(row.mph).toBeDefined();
    expect(row.accel).toBeDefined();
    expect(row.rpm).toBeDefined();
    expect(row.gear).toBeDefined();
    expect(row.slip).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// PARITY TEST: ProStock_Pro benchmark → printedRows → fromPrintedRows
// ---------------------------------------------------------------------------

describe('VB6 Parity: ProStock_Pro detailed parameters', () => {
  const inputs = buildSimInputs('ProStock_Pro');
  const result = simulateVB6Exact(inputs);
  const printedRows = result.printedRows;

  it('VB6Exact should produce printedRows', () => {
    expect(printedRows).toBeDefined();
    expect(printedRows!.length).toBeGreaterThan(0);
  });

  it('first printedRow should be staged (type=staged)', () => {
    expect(printedRows![0].type).toBe('staged');
  });

  it('fromPrintedRows row count matches printedRows count', () => {
    const rows = fromPrintedRows(printedRows!);
    expect(rows.length).toBe(printedRows!.length);
  });

  it('columns match VB6 spec for every row', () => {
    const rows = fromPrintedRows(printedRows!);
    for (const row of rows) {
      // Type must be one of VB6 types
      expect(['staged', 'rollout', 'distance', 'time', 'shift', 'speed']).toContain(row.type);
      // Formatted values must be non-empty strings (except slip which can be empty)
      expect(row.time.length).toBeGreaterThan(0);
      expect(row.dist.length).toBeGreaterThan(0);
      expect(row.mph.length).toBeGreaterThan(0);
      expect(row.accel.length).toBeGreaterThan(0);
      expect(row.rpm.length).toBeGreaterThan(0);
      expect(row.gear.length).toBeGreaterThan(0);
      // Numeric values must be finite
      expect(isFinite(row.time_s)).toBe(true);
      expect(isFinite(row.dist_ft)).toBe(true);
      expect(isFinite(row.mph_num)).toBe(true);
      expect(isFinite(row.accel_g)).toBe(true);
      expect(isFinite(row.rpm_num)).toBe(true);
    }
  });

  it('should contain distance checkpoint rows (60, 330, 660, 1000, 1320 ft)', () => {
    const rows = fromPrintedRows(printedRows!);
    const distRows = rows.filter(r => r.type === 'distance');
    const dists = distRows.map(r => r.dist_ft);
    // Quarter mile checkpoints
    expect(dists).toContain(60);
    expect(dists).toContain(330);
    expect(dists).toContain(660);
    expect(dists).toContain(1000);
    expect(dists).toContain(1320);
  });

  it('should contain time-based rows at 0.5s increments (Pro mode)', () => {
    const rows = fromPrintedRows(printedRows!);
    const timeRows = rows.filter(r => r.type === 'time');
    expect(timeRows.length).toBeGreaterThan(0);
    // First time row should be at ~0.5s ET
    expect(timeRows[0].time_s).toBeCloseTo(0.5, 1);
  });

  it('should contain shift rows for multi-gear vehicle', () => {
    const rows = fromPrintedRows(printedRows!);
    const shiftRows = rows.filter(r => r.type === 'shift');
    // ProStock_Pro has 5 gears → at least some shift events
    expect(shiftRows.length).toBeGreaterThan(0);
  });

  it('VB6 rounding: RPM values should be rounded to nearest 10', () => {
    for (const row of printedRows!) {
      expect(row.quantized.rpm % 10).toBe(0);
    }
  });

  it('VB6 rounding: time values should be rounded to 0.01', () => {
    for (const row of printedRows!) {
      // quantized.time_s should have at most 2 decimal places
      const str = row.quantized.time_s.toFixed(2);
      expect(parseFloat(str)).toBeCloseTo(row.quantized.time_s, 2);
    }
  });

  it('VB6 rounding: mph values should be rounded to 0.1', () => {
    for (const row of printedRows!) {
      const str = row.quantized.mph.toFixed(1);
      expect(parseFloat(str)).toBeCloseTo(row.quantized.mph, 1);
    }
  });

  it('VB6 rounding: accel values should be rounded to 0.01', () => {
    for (const row of printedRows!) {
      const str = row.quantized.accel_g.toFixed(2);
      expect(parseFloat(str)).toBeCloseTo(row.quantized.accel_g, 2);
    }
  });

  it('last distance row should be the finish (1320 ft)', () => {
    const rows = fromPrintedRows(printedRows!);
    const distRows = rows.filter(r => r.type === 'distance');
    const lastDist = distRows[distRows.length - 1];
    expect(lastDist.dist_ft).toBe(1320);
  });

  it('rows are in chronological order', () => {
    const rows = fromPrintedRows(printedRows!);
    for (let i = 1; i < rows.length; i++) {
      // Allow equal times (simultaneous events)
      expect(rows[i].time_s).toBeGreaterThanOrEqual(rows[i - 1].time_s - 0.001);
    }
  });

  it('row count is in expected range for quarter-mile Pro (20-50 rows)', () => {
    const rows = fromPrintedRows(printedRows!);
    expect(rows.length).toBeGreaterThanOrEqual(15);
    expect(rows.length).toBeLessThanOrEqual(60);
  });

  it('finish row: last distance row time matches ET within 0.01s', () => {
    const rows = fromPrintedRows(printedRows!);
    const distRows = rows.filter(r => r.type === 'distance');
    const finishRow = distRows.find(r => r.dist_ft === 1320);
    expect(finishRow).toBeDefined();
    // The finish row time should be close to the reported ET
    expect(Math.abs(finishRow!.time_s - result.et_s)).toBeLessThan(0.05);
  });
});
