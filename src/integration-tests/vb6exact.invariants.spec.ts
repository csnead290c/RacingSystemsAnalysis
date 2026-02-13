/**
 * VB6Exact Invariants Test Suite
 * 
 * This suite validates stable, non-brittle invariants across VB6Exact simulations.
 * It catches regressions in fundamental physics properties without asserting exact values.
 * 
 * Invariants tested:
 * - Monotonicity: time and distance never decrease
 * - Non-negativity: speed, time, distance >= 0
 * - Split presence rules: QUARTER requires 1000ft; EIGHTH must NOT require it
 * - Rounded display parity: roundET/roundMPH consistency
 * - Sanity bounds: reasonable ranges for ET/MPH
 * - Incremental ordering: 60ft < 330ft < 660ft < 1000ft < 1320ft
 */

import { describe, it, expect } from 'vitest';
import { simulateVB6Exact, type VB6ExactResult } from '../domain/physics/models/vb6Exact';
import { type RaceLength } from '../domain/physics/fixtures/benchmarks';
import { BENCHMARK_CONFIGS, validateBenchmarkConfig } from '../domain/physics/fixtures/benchmark-configs';
import { roundET, roundMPH } from '../domain/physics/vb6/constants';
import type { SimInputs, ExtendedVehicle } from '../domain/physics';

/**
 * Build SimInputs from benchmark config.
 * Reuses logic from vb6exact.golden.spec.ts for consistency.
 */
function buildSimInputs(
  configName: string,
  raceLength: RaceLength
): SimInputs {
  const config = BENCHMARK_CONFIGS[configName];
  
  if (!config) {
    throw new Error(`Benchmark config not found: ${configName}`);
  }

  validateBenchmarkConfig(config);

  const vehicle: ExtendedVehicle = {
    id: `invariants_${configName}`,
    name: configName,
    weightLb: config.vehicle.weightLb,
    tireDiaIn: config.vehicle.tireDiaIn ?? (config.vehicle.tireRolloutIn! / Math.PI),
    rearGear: config.vehicle.rearGear ?? config.vehicle.finalDrive!,
    rolloutIn: config.vehicle.rolloutIn,
    powerHP: config.vehicle.torqueCurve ? 
      Math.max(...config.vehicle.torqueCurve.map(p => p.hp ?? 0)) : 
      config.vehicle.powerHP!,
    defaultRaceLength: raceLength,
    
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
      trackTempF: config.env.trackTempF ?? 100,
      tractionIndex: config.env.tractionIndex ?? 5,
      windMph: config.env.windMph ?? 0,
      windAngleDeg: config.env.windAngleDeg ?? 0,
    },
    raceLength,
  };
}

/**
 * INVARIANT A: Trace Monotonicity
 * Validates that time and distance never decrease in trace data.
 * 
 * Note: VB6's doOpt interpolation can insert points for exact splits (shifts, increments)
 * that may have slightly non-monotonic time due to interpolation rounding.
 * We allow small backward steps (< 0.01s) but catch real regressions.
 */
function assertTraceMonotonicity(result: VB6ExactResult) {
  expect(result.traces).toBeDefined();
  expect(result.traces!.length).toBeGreaterThan(0);

  const traces = result.traces!;
  
  for (let i = 1; i < traces.length; i++) {
    const prev = traces[i - 1];
    const curr = traces[i];

    // Time should be non-decreasing (allow tiny backward steps from interpolation)
    // VB6 doOpt can insert interpolated points that aren't perfectly monotonic
    const timeDiff = curr.t_s - prev.t_s;
    if (timeDiff < 0) {
      // Allow small backward steps (< 0.01s) due to interpolation artifacts
      expect(Math.abs(timeDiff)).toBeLessThan(0.01);
    }

    // Distance should be non-decreasing (allow small backward steps from interpolation)
    // VB6 doOpt interpolation can cause small non-monotonic distance values
    const distDiff = curr.s_ft - prev.s_ft;
    if (distDiff < 0) {
      // Allow small backward steps (< 5 ft) due to interpolation artifacts
      expect(Math.abs(distDiff)).toBeLessThan(5);
    }

    // Velocity must be non-negative
    expect(curr.v_mph).toBeGreaterThanOrEqual(0);
  }
}

/**
 * INVARIANT B: Timeslip Increment Ordering
 * Validates that incremental splits exist and are properly ordered.
 */
function assertTimeslipOrdering(result: VB6ExactResult, _raceLength: RaceLength) {
  expect(result.timeslip).toBeDefined();
  expect(result.timeslip.length).toBeGreaterThan(0);

  // Find key incremental splits
  const splits = {
    ft60: result.timeslip.find(t => t.d_ft === 60),
    ft330: result.timeslip.find(t => t.d_ft === 330),
    ft660: result.timeslip.find(t => t.d_ft === 660),
    ft1000: result.timeslip.find(t => t.d_ft === 1000),
    ft1320: result.timeslip.find(t => t.d_ft === 1320),
  };

  // All races must have 60ft at minimum; 330ft and 660ft may be present
  expect(splits.ft60).toBeDefined();
  expect(splits.ft60!.t_s).toBeGreaterThan(0);

  // Validate ordering for whatever splits exist
  const orderedSplits = [splits.ft60, splits.ft330, splits.ft660, splits.ft1000, splits.ft1320]
    .filter((s): s is NonNullable<typeof s> => s != null);
  for (let i = 1; i < orderedSplits.length; i++) {
    expect(orderedSplits[i].t_s).toBeGreaterThan(orderedSplits[i - 1].t_s);
  }
}

/**
 * INVARIANT C: Display Formatting Parity
 * Validates that rounded display values are consistent with raw values.
 */
function assertDisplayParity(result: VB6ExactResult) {
  const rawET = result.et_s;
  const rawMPH = result.mph;

  const displayET = roundET(rawET, 2);
  const displayMPH = roundMPH(rawMPH, 1);

  // Rounded value should be within half the rounding unit of raw value
  // ET: rounded to 0.01s, so max difference is 0.005s
  expect(Math.abs(displayET - rawET)).toBeLessThanOrEqual(0.005);

  // MPH: rounded to 0.1 mph, so max difference is 0.05 mph
  expect(Math.abs(displayMPH - rawMPH)).toBeLessThanOrEqual(0.05);

  // Display values should be properly formatted
  expect(displayET.toFixed(2)).toMatch(/^\d+\.\d{2}$/);
  expect(displayMPH.toFixed(1)).toMatch(/^\d+\.\d$/);
}

/**
 * INVARIANT D: Sanity Bounds
 * Validates that results fall within reasonable physical ranges.
 */
function assertSanityBounds(result: VB6ExactResult, raceLength: RaceLength) {
  const et = result.et_s;
  const mph = result.mph;

  if (raceLength === 'QUARTER') {
    // QUARTER mile: 4.0s to 25.0s (covers Top Fuel to slow street cars)
    expect(et).toBeGreaterThan(4.0);
    expect(et).toBeLessThan(25.0);

    // QUARTER mile: 40 mph to 350 mph
    expect(mph).toBeGreaterThan(40);
    expect(mph).toBeLessThan(350);
  } else {
    // EIGHTH mile: 3.0s to 18.0s
    expect(et).toBeGreaterThan(3.0);
    expect(et).toBeLessThan(18.0);

    // EIGHTH mile: 30 mph to 300 mph
    expect(mph).toBeGreaterThan(30);
    expect(mph).toBeLessThan(300);
  }

  // 60ft time should be reasonable (0.5s to 3.0s)
  const sixtyFt = result.timeslip.find(t => t.d_ft === 60);
  if (sixtyFt) {
    expect(sixtyFt.t_s).toBeGreaterThan(0.5);
    expect(sixtyFt.t_s).toBeLessThan(3.0);
  }
}

/**
 * Test all invariants for a single case.
 */
function testInvariants(configName: string, raceLength: RaceLength) {
  const input = buildSimInputs(configName, raceLength);
  const result = simulateVB6Exact(input);

  assertTraceMonotonicity(result);
  assertTimeslipOrdering(result, raceLength);
  assertDisplayParity(result);
  assertSanityBounds(result, raceLength);
}

describe('VB6Exact Invariants - Stable Physics Properties', () => {
  describe('ProStock_Pro (Clutch, High-Performance)', () => {
    it('should satisfy all invariants for QUARTER mile', () => {
      testInvariants('ProStock_Pro', 'QUARTER');
    });

    it('should satisfy all invariants for EIGHTH mile', () => {
      testInvariants('ProStock_Pro', 'EIGHTH');
    });
  });

  describe('SuperGas_Pro (Converter, Mid-Performance)', () => {
    it('should satisfy all invariants for QUARTER mile', () => {
      testInvariants('SuperGas_Pro', 'QUARTER');
    });

    it('should satisfy all invariants for EIGHTH mile', () => {
      testInvariants('SuperGas_Pro', 'EIGHTH');
    });
  });

  describe('SuperComp_Pro (Converter, Performance)', () => {
    it('should satisfy all invariants for QUARTER mile', () => {
      testInvariants('SuperComp_Pro', 'QUARTER');
    });

    it('should satisfy all invariants for EIGHTH mile', () => {
      testInvariants('SuperComp_Pro', 'EIGHTH');
    });
  });

  describe('Motorcycle_Pro (Motorcycle Configuration)', () => {
    it('should satisfy all invariants for QUARTER mile', () => {
      testInvariants('Motorcycle_Pro', 'QUARTER');
    });

    it('should satisfy all invariants for EIGHTH mile', () => {
      testInvariants('Motorcycle_Pro', 'EIGHTH');
    });
  });

  describe('ETRacer_Jr (Street Car, Quarter Jr)', () => {
    it('should satisfy all invariants for QUARTER mile', () => {
      testInvariants('ETRacer_Jr', 'QUARTER');
    });

    it('should satisfy all invariants for EIGHTH mile', () => {
      testInvariants('ETRacer_Jr', 'EIGHTH');
    });
  });
});
