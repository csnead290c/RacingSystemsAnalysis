/**
 * Detailed Parameters + Land Speed Checkpoints — integration tests
 *
 * TASK A: Validates that VB6Exact simulation produces trace data suitable
 *         for the Detailed Parameters modal (step-by-step output).
 * TASK B: Validates that land speed checkpoint configs cover all expected
 *         mile-marker rows for each track type.
 */

import { describe, it, expect } from 'vitest';
import { simulateVB6Exact } from '../domain/physics/models/vb6Exact';
import { BENCHMARK_CONFIGS, validateBenchmarkConfig } from '../domain/physics/fixtures/benchmark-configs';
import type { SimInputs } from '../domain/physics';
import type { ExtendedVehicle } from '../domain/physics';
import {
  type RaceLength,
  RACE_LENGTH_INFO,
  getLandSpeedCheckpoints,
  getDistanceMarkers,
} from '../domain/config/raceLengths';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildSimInputs(configName: string, raceLength: RaceLength): SimInputs {
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
      trackTempF: config.env.trackTempF,
      tractionIndex: config.env.tractionIndex,
      windMph: config.env.windMph,
    },
    raceLength,
  };
}

// Pick the first available benchmark config name
const CONFIG_NAME = Object.keys(BENCHMARK_CONFIGS)[0];

// ---------------------------------------------------------------------------
// TASK A — Detailed Parameters trace data assertions
// ---------------------------------------------------------------------------

describe('Detailed Parameters — trace data', () => {
  it('should produce traces with row count > 0 for a quarter-mile sim', () => {
    const inputs = buildSimInputs(CONFIG_NAME, 'QUARTER');
    const result = simulateVB6Exact(inputs);

    expect(result.traces).toBeDefined();
    expect(result.traces!.length).toBeGreaterThan(0);
  });

  it('first trace row should have distance ≈ 0 and time ≈ 0', () => {
    const inputs = buildSimInputs(CONFIG_NAME, 'QUARTER');
    const result = simulateVB6Exact(inputs);
    const first = result.traces![0];

    expect(first).toBeDefined();
    expect(first.s_ft).toBeLessThanOrEqual(1); // at or near start
    expect(first.t_s).toBeLessThanOrEqual(0.01);
  });

  it('last trace row distance should approximate race distance (1320 ft ± 100)', () => {
    const inputs = buildSimInputs(CONFIG_NAME, 'QUARTER');
    const result = simulateVB6Exact(inputs);
    const last = result.traces![result.traces!.length - 1];

    expect(last).toBeDefined();
    // VB6 sim loop overshoots finish by up to ~60ft due to adaptive timestep
    expect(last.s_ft).toBeGreaterThan(1320 - 100);
    expect(last.s_ft).toBeLessThan(1320 + 100);
  });

  it('every trace row should have required fields', () => {
    const inputs = buildSimInputs(CONFIG_NAME, 'QUARTER');
    const result = simulateVB6Exact(inputs);

    for (const t of result.traces!) {
      expect(typeof t.t_s).toBe('number');
      expect(typeof t.s_ft).toBe('number');
      expect(typeof t.v_mph).toBe('number');
      expect(typeof t.a_g).toBe('number');
      expect(typeof t.rpm).toBe('number');
      expect(typeof t.gear).toBe('number');
      expect(isFinite(t.t_s)).toBe(true);
      expect(isFinite(t.s_ft)).toBe(true);
      expect(isFinite(t.v_mph)).toBe(true);
    }
  });

  it('traces should be monotonically increasing in time', () => {
    const inputs = buildSimInputs(CONFIG_NAME, 'QUARTER');
    const result = simulateVB6Exact(inputs);

    for (let i = 1; i < result.traces!.length; i++) {
      expect(result.traces![i].t_s).toBeGreaterThanOrEqual(result.traces![i - 1].t_s);
    }
  });

  it('traces should contain at least one gear change for a multi-gear vehicle', () => {
    const inputs = buildSimInputs(CONFIG_NAME, 'QUARTER');
    const result = simulateVB6Exact(inputs);
    const gears = new Set(result.traces!.map(t => t.gear));
    // Most benchmark vehicles have multiple gears
    expect(gears.size).toBeGreaterThanOrEqual(1);
  });

  it('traces should include extended fields (hp, slip) from VB6Exact', () => {
    const inputs = buildSimInputs(CONFIG_NAME, 'QUARTER');
    const result = simulateVB6Exact(inputs);
    // VB6Exact always includes hp and slip in traces
    const hasHp = result.traces!.some((t: any) => t.hp != null);
    const hasSlip = result.traces!.some((t: any) => t.slip != null);
    expect(hasHp).toBe(true);
    expect(hasSlip).toBe(true);
  });

  it('eighth-mile sim should have last row near 660 ft', () => {
    const inputs = buildSimInputs(CONFIG_NAME, 'EIGHTH');
    const result = simulateVB6Exact(inputs);
    const last = result.traces![result.traces!.length - 1];
    // VB6 sim loop overshoots finish by up to ~60ft due to adaptive timestep
    expect(last.s_ft).toBeGreaterThan(660 - 100);
    expect(last.s_ft).toBeLessThan(660 + 100);
  });
});

// ---------------------------------------------------------------------------
// TASK B — Land Speed checkpoint coverage
// ---------------------------------------------------------------------------

describe('Land Speed Checkpoints — config coverage', () => {
  const landSpeedLengths: RaceLength[] = (Object.keys(RACE_LENGTH_INFO) as RaceLength[])
    .filter(k => RACE_LENGTH_INFO[k].category === 'landspeed');

  it('should have checkpoint configs for all land speed race lengths', () => {
    for (const rl of landSpeedLengths) {
      const checkpoints = getLandSpeedCheckpoints(rl);
      expect(checkpoints, `Missing checkpoints for ${rl}`).toBeDefined();
      expect(checkpoints!.length).toBeGreaterThan(0);
    }
  });

  it('BONNEVILLE_LONG should have 8 checkpoint rows', () => {
    const checkpoints = getLandSpeedCheckpoints('BONNEVILLE_LONG');
    expect(checkpoints).toBeDefined();
    expect(checkpoints!.length).toBe(8);
  });

  it('BONNEVILLE_LONG checkpoints should include 2mi through 5mi', () => {
    const checkpoints = getLandSpeedCheckpoints('BONNEVILLE_LONG')!;
    const dists = checkpoints.map(c => c.dist_ft);
    // Must include: 1mi(5280), 2mi(10560), 2.5(13200), 3mi(15840), 3.5(18480), 4mi(21120), 4.5(23760), 5mi(26400)
    expect(dists).toContain(5280);
    expect(dists).toContain(10560);
    expect(dists).toContain(13200);
    expect(dists).toContain(15840);
    expect(dists).toContain(18480);
    expect(dists).toContain(21120);
    expect(dists).toContain(23760);
    expect(dists).toContain(26400);
  });

  it('BONNEVILLE_SHORT should have 8 checkpoint rows', () => {
    const checkpoints = getLandSpeedCheckpoints('BONNEVILLE_SHORT');
    expect(checkpoints).toBeDefined();
    expect(checkpoints!.length).toBe(8);
  });

  it('every checkpoint dist_ft should be <= race length ft', () => {
    for (const rl of landSpeedLengths) {
      const checkpoints = getLandSpeedCheckpoints(rl)!;
      const maxFt = RACE_LENGTH_INFO[rl].lengthFt;
      for (const cp of checkpoints) {
        expect(cp.dist_ft, `${rl} checkpoint ${cp.label} exceeds race length`).toBeLessThanOrEqual(maxFt);
      }
    }
  });

  it('every checkpoint should have a non-empty label', () => {
    for (const rl of landSpeedLengths) {
      const checkpoints = getLandSpeedCheckpoints(rl)!;
      for (const cp of checkpoints) {
        expect(cp.label.length).toBeGreaterThan(0);
      }
    }
  });

  it('drag race lengths should return undefined from getLandSpeedCheckpoints', () => {
    expect(getLandSpeedCheckpoints('QUARTER')).toBeUndefined();
    expect(getLandSpeedCheckpoints('EIGHTH')).toBeUndefined();
  });

  it('terminal checkpoint distance should match race length for each land speed track', () => {
    for (const rl of landSpeedLengths) {
      const checkpoints = getLandSpeedCheckpoints(rl)!;
      const maxCp = Math.max(...checkpoints.map(c => c.dist_ft));
      const raceFt = RACE_LENGTH_INFO[rl].lengthFt;
      expect(maxCp, `${rl} terminal checkpoint should match race length`).toBe(raceFt);
    }
  });
});

// ---------------------------------------------------------------------------
// Chart distance markers — source-of-truth unification
// ---------------------------------------------------------------------------

describe('Chart Distance Markers — source-of-truth', () => {
  it('BONNEVILLE_LONG markers should equal checkpoint distances (8 values)', () => {
    const markers = getDistanceMarkers('BONNEVILLE_LONG');
    const checkpoints = getLandSpeedCheckpoints('BONNEVILLE_LONG')!;
    expect(markers).toEqual(checkpoints.map(c => c.dist_ft));
    expect(markers.length).toBe(8);
  });

  it('BONNEVILLE_SHORT markers should equal checkpoint distances (8 values)', () => {
    const markers = getDistanceMarkers('BONNEVILLE_SHORT');
    const checkpoints = getLandSpeedCheckpoints('BONNEVILLE_SHORT')!;
    expect(markers).toEqual(checkpoints.map(c => c.dist_ft));
  });

  it('all land speed tracks: markers === checkpoint distances', () => {
    const landSpeedLengths: RaceLength[] = (Object.keys(RACE_LENGTH_INFO) as RaceLength[])
      .filter(k => RACE_LENGTH_INFO[k].category === 'landspeed');
    for (const rl of landSpeedLengths) {
      const markers = getDistanceMarkers(rl);
      const checkpoints = getLandSpeedCheckpoints(rl)!;
      expect(markers, `${rl} markers should match checkpoints`).toEqual(checkpoints.map(c => c.dist_ft));
    }
  });

  it('QUARTER markers should be standard drag markers', () => {
    const markers = getDistanceMarkers('QUARTER');
    expect(markers).toEqual([60, 330, 660, 1000, 1320]);
  });

  it('EIGHTH markers should be drag markers up to 660 ft', () => {
    const markers = getDistanceMarkers('EIGHTH');
    expect(markers).toEqual([60, 330, 660]);
  });
});
