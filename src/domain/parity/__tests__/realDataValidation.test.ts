/**
 * Real-Data Validation — Nitro Normalization & Off-Pace Detection
 *
 * These tests use realistic NHRA timing patterns (not synthetic) to validate
 * that the anomaly engine behaves correctly with domain-accurate data.
 *
 * Scenarios:
 *   1. Top Fuel nitro class — blank ft1000, finish in ft1320 fields
 *   2. Pro Stock full-quarter — standard 1320 ft interpretation
 *   3. Off-pace but coherent Pro Stock — slow run, not a timing failure
 */

import { describe, it, expect } from 'vitest';
import {
  analyzeRuns,
  computeIntervals,
  resolveFinish,
  isNitroClass,
} from '../anomalyEngine';
import type { ParityRun } from '../../../services/parityApi';

// ── Helper ──────────────────────────────────────────────────────────────

function makeRealRun(overrides: Partial<ParityRun> & { id: number }): ParityRun {
  return {
    uuid: `val-${overrides.id}`,
    race_lookup: '20260309',
    run_timestamp_utc: null,
    run_time_local: null,
    category: null,
    class_index: null,
    round: 'Q1',
    lane: 'L',
    driver_name: 'Validation Driver',
    car_number: '1',
    dial_in: null,
    rt: null,
    ft60: null,
    ft330: null,
    ft660: null,
    mph660: null,
    ft1000: null,
    mph1000: null,
    ft1320: null,
    mph1320: null,
    win_flag: null,
    dq_flag: null,
    mov: null,
    place: null,
    source_ref: null,
    created_at: '2026-03-09T00:00:00Z',
    ...overrides,
  };
}

// ── Realistic Top Fuel population (20 runs, ~3.7s ET range) ─────────

function makeTopFuelPopulation(): ParityRun[] {
  // Realistic TF data: 1000 ft, finish times ~3.68–3.78, mph ~330–340
  // Convention: ft1000 blank, finish in ft1320/mph1320
  const base = [
    { et: 3.689, mph: 338.77, ft60: 0.838, ft330: 2.164, ft660: 3.658, mph660: 289.1 },
    { et: 3.701, mph: 337.50, ft60: 0.841, ft330: 2.170, ft660: 3.670, mph660: 288.5 },
    { et: 3.712, mph: 336.82, ft60: 0.845, ft330: 2.178, ft660: 3.681, mph660: 287.9 },
    { et: 3.698, mph: 337.93, ft60: 0.840, ft330: 2.167, ft660: 3.666, mph660: 289.0 },
    { et: 3.725, mph: 335.56, ft60: 0.849, ft330: 2.185, ft660: 3.694, mph660: 287.2 },
    { et: 3.705, mph: 337.12, ft60: 0.842, ft330: 2.172, ft660: 3.674, mph660: 288.3 },
    { et: 3.692, mph: 338.43, ft60: 0.839, ft330: 2.165, ft660: 3.660, mph660: 289.3 },
    { et: 3.718, mph: 336.10, ft60: 0.847, ft330: 2.181, ft660: 3.688, mph660: 287.5 },
    { et: 3.710, mph: 336.98, ft60: 0.844, ft330: 2.176, ft660: 3.679, mph660: 288.1 },
    { et: 3.695, mph: 338.15, ft60: 0.840, ft330: 2.166, ft660: 3.663, mph660: 289.2 },
    { et: 3.730, mph: 335.20, ft60: 0.851, ft330: 2.188, ft660: 3.699, mph660: 286.8 },
    { et: 3.703, mph: 337.65, ft60: 0.842, ft330: 2.171, ft660: 3.672, mph660: 288.4 },
    { et: 3.715, mph: 336.55, ft60: 0.846, ft330: 2.180, ft660: 3.685, mph660: 287.7 },
    { et: 3.690, mph: 338.60, ft60: 0.838, ft330: 2.163, ft660: 3.658, mph660: 289.4 },
    { et: 3.708, mph: 337.00, ft60: 0.843, ft330: 2.174, ft660: 3.677, mph660: 288.2 },
    { et: 3.722, mph: 335.80, ft60: 0.848, ft330: 2.183, ft660: 3.691, mph660: 287.3 },
    { et: 3.699, mph: 337.85, ft60: 0.841, ft330: 2.168, ft660: 3.667, mph660: 288.8 },
    { et: 3.714, mph: 336.62, ft60: 0.846, ft330: 2.179, ft660: 3.684, mph660: 287.8 },
    { et: 3.693, mph: 338.30, ft60: 0.839, ft330: 2.165, ft660: 3.661, mph660: 289.1 },
    { et: 3.707, mph: 337.10, ft60: 0.843, ft330: 2.173, ft660: 3.676, mph660: 288.3 },
  ];

  return base.map((d, i) => makeRealRun({
    id: 5000 + i,
    category: 'Top Fuel',
    class_index: 'TF',
    driver_name: `TF Driver ${i + 1}`,
    rt: 0.050 + (i % 5) * 0.010,
    ft60: d.ft60,
    ft330: d.ft330,
    ft660: d.ft660,
    mph660: d.mph660,
    ft1000: null,       // Blank — convention
    mph1000: null,
    ft1320: d.et,       // Finish time in ft1320 field
    mph1320: d.mph,     // Finish mph in mph1320 field
  }));
}

// ── Realistic Pro Stock population (20 runs, ~6.5s ET range) ────────

function makeProStockPopulation(): ParityRun[] {
  const base = [
    { et: 6.512, mph: 210.31, ft60: 0.965, ft330: 2.481, ft660: 4.198, mph660: 174.8, ft1000: 5.389 },
    { et: 6.525, mph: 209.85, ft60: 0.968, ft330: 2.487, ft660: 4.210, mph660: 174.2, ft1000: 5.401 },
    { et: 6.508, mph: 210.52, ft60: 0.963, ft330: 2.478, ft660: 4.192, mph660: 175.0, ft1000: 5.382 },
    { et: 6.531, mph: 209.60, ft60: 0.970, ft330: 2.491, ft660: 4.218, mph660: 173.9, ft1000: 5.410 },
    { et: 6.519, mph: 210.10, ft60: 0.966, ft330: 2.484, ft660: 4.205, mph660: 174.5, ft1000: 5.396 },
    { et: 6.505, mph: 210.65, ft60: 0.962, ft330: 2.476, ft660: 4.188, mph660: 175.2, ft1000: 5.378 },
    { et: 6.540, mph: 209.30, ft60: 0.972, ft330: 2.495, ft660: 4.225, mph660: 173.6, ft1000: 5.418 },
    { et: 6.515, mph: 210.22, ft60: 0.965, ft330: 2.482, ft660: 4.200, mph660: 174.7, ft1000: 5.391 },
    { et: 6.528, mph: 209.72, ft60: 0.969, ft330: 2.489, ft660: 4.215, mph660: 174.1, ft1000: 5.406 },
    { et: 6.510, mph: 210.45, ft60: 0.964, ft330: 2.479, ft660: 4.195, mph660: 174.9, ft1000: 5.385 },
    { et: 6.535, mph: 209.48, ft60: 0.971, ft330: 2.493, ft660: 4.222, mph660: 173.8, ft1000: 5.414 },
    { et: 6.520, mph: 210.05, ft60: 0.967, ft330: 2.485, ft660: 4.207, mph660: 174.4, ft1000: 5.398 },
    { et: 6.503, mph: 210.75, ft60: 0.961, ft330: 2.474, ft660: 4.185, mph660: 175.4, ft1000: 5.375 },
    { et: 6.518, mph: 210.15, ft60: 0.966, ft330: 2.483, ft660: 4.203, mph660: 174.6, ft1000: 5.394 },
    { et: 6.538, mph: 209.38, ft60: 0.972, ft330: 2.494, ft660: 4.224, mph660: 173.7, ft1000: 5.416 },
    { et: 6.507, mph: 210.58, ft60: 0.963, ft330: 2.477, ft660: 4.190, mph660: 175.1, ft1000: 5.380 },
    { et: 6.522, mph: 209.95, ft60: 0.967, ft330: 2.486, ft660: 4.209, mph660: 174.3, ft1000: 5.400 },
    { et: 6.514, mph: 210.28, ft60: 0.965, ft330: 2.481, ft660: 4.199, mph660: 174.8, ft1000: 5.390 },
    { et: 6.533, mph: 209.55, ft60: 0.971, ft330: 2.492, ft660: 4.220, mph660: 173.8, ft1000: 5.412 },
    { et: 6.509, mph: 210.48, ft60: 0.964, ft330: 2.479, ft660: 4.194, mph660: 175.0, ft1000: 5.384 },
  ];

  return base.map((d, i) => makeRealRun({
    id: 6000 + i,
    category: 'Pro Stock',
    class_index: 'PS',
    driver_name: `PS Driver ${i + 1}`,
    rt: 0.020 + (i % 5) * 0.005,
    ft60: d.ft60,
    ft330: d.ft330,
    ft660: d.ft660,
    mph660: d.mph660,
    ft1000: d.ft1000,
    mph1000: null,
    ft1320: d.et,
    mph1320: d.mph,
  }));
}

// ══════════════════════════════════════════════════════════════════════════
// SCENARIO 1: Top Fuel Nitro — blank ft1000, finish in ft1320
// ══════════════════════════════════════════════════════════════════════════

describe('Validation: Top Fuel nitro class (real-data patterns)', () => {
  const population = makeTopFuelPopulation();

  it('isNitroClass correctly identifies Top Fuel', () => {
    expect(isNitroClass(population[0])).toBe(true);
  });

  it('resolveFinish uses ft1320 as effective 1000-ft finish when ft1000 is blank', () => {
    const run = population[0];
    const finish = resolveFinish(run);
    expect(finish.isNitro).toBe(true);
    expect(finish.effectiveFinishDistance).toBe(1000);
    expect(finish.effectiveFinishTime).toBe(run.ft1320); // 3.689
    expect(finish.effectiveFinishMph).toBe(run.mph1320); // 338.77
    expect(finish.finishTimeField).toBe('ft1320');
    expect(finish.finishMphField).toBe('mph1320');
  });

  it('t_660_finish is computed correctly for nitro runs', () => {
    const run = population[0];
    const iv = computeIntervals(run);
    // t_660_finish = ft1320 (effective finish) - ft660 = 3.689 - 3.658 = 0.031
    expect(iv.t_660_finish).toBeCloseTo(0.031, 3);
    // t_660_1000 should be null (ft1000 is blank)
    expect(iv.t_660_1000).toBeNull();
    // t_1000_1320 should be null (ft1000 is blank)
    expect(iv.t_1000_1320).toBeNull();
  });

  it('blank ft1000 does NOT trigger MISSING_SPLIT_VALUE for nitro class', () => {
    const result = analyzeRuns(population);
    for (const r of result.runs) {
      const missingFt1000 = r.flags.filter(f =>
        f.code === 'MISSING_SPLIT_VALUE' && f.field === 'ft1000'
      );
      expect(missingFt1000.length).toBe(0);
    }
  });

  it('all competitive TF runs classified as clean with High confidence', () => {
    const result = analyzeRuns(population);
    for (const r of result.runs) {
      expect(r.band).toBe('High');
      expect(r.classification).toBe('clean');
      expect(r.finish.isNitro).toBe(true);
      expect(r.representativeRun).toBe(true);
    }
  });

  it('summary counts are correct for all-clean TF population', () => {
    const result = analyzeRuns(population);
    expect(result.summary.runsAnalyzed).toBe(20);
    expect(result.summary.highCount).toBe(20);
    expect(result.summary.criticalCount).toBe(0);
    expect(result.summary.representativeCount).toBe(20);
    expect(result.summary.offPaceCount).toBe(0);
  });
});

// ══════════════════════════════════════════════════════════════════════════
// SCENARIO 2: Pro Stock full-quarter — standard 1320 ft
// ══════════════════════════════════════════════════════════════════════════

describe('Validation: Pro Stock full-quarter (real-data patterns)', () => {
  const population = makeProStockPopulation();

  it('isNitroClass correctly identifies Pro Stock as NOT nitro', () => {
    expect(isNitroClass(population[0])).toBe(false);
  });

  it('resolveFinish uses ft1320 as standard 1320-ft finish', () => {
    const run = population[0];
    const finish = resolveFinish(run);
    expect(finish.isNitro).toBe(false);
    expect(finish.effectiveFinishDistance).toBe(1320);
    expect(finish.effectiveFinishTime).toBe(6.512);
    expect(finish.effectiveFinishMph).toBe(210.31);
    expect(finish.finishTimeField).toBe('ft1320');
  });

  it('computes all 5 full-quarter intervals including t_660_finish', () => {
    const run = population[0];
    const iv = computeIntervals(run);
    expect(iv.t_0_60).toBeCloseTo(0.965, 3);
    expect(iv.t_60_330).toBeCloseTo(1.516, 3);    // 2.481 - 0.965
    expect(iv.t_330_660).toBeCloseTo(1.717, 3);   // 4.198 - 2.481
    expect(iv.t_660_1000).toBeCloseTo(1.191, 3);  // 5.389 - 4.198
    expect(iv.t_1000_1320).toBeCloseTo(1.123, 3); // 6.512 - 5.389
    // t_660_finish for non-nitro = ft1320 - ft660
    expect(iv.t_660_finish).toBeCloseTo(2.314, 3); // 6.512 - 4.198
  });

  it('all competitive PS runs classified as clean with High confidence', () => {
    const result = analyzeRuns(population);
    for (const r of result.runs) {
      expect(r.band).toBe('High');
      expect(r.classification).toBe('clean');
      expect(r.finish.isNitro).toBe(false);
      expect(r.representativeRun).toBe(true);
    }
  });
});

// ══════════════════════════════════════════════════════════════════════════
// SCENARIO 3: Off-pace but coherent Pro Stock
// ══════════════════════════════════════════════════════════════════════════

describe('Validation: Off-pace but coherent run (real-data patterns)', () => {
  const population = makeProStockPopulation();

  // A dramatically slow but internally coherent Pro Stock run
  // (e.g., engine issue, not a timing failure — all splits monotonic and plausible)
  const slowRun = makeRealRun({
    id: 9999,
    category: 'Pro Stock',
    class_index: 'PS',
    driver_name: 'Slow But Real',
    rt: 0.150,
    ft60: 1.250,     // very slow launch
    ft330: 3.300,     // proportionally slow
    ft660: 5.600,     // consistent deceleration profile
    mph660: 140.0,    // much lower mph
    ft1000: 7.200,    // proportionally slow
    mph1000: null,
    ft1320: 8.800,    // ~2.3s slower than field
    mph1320: 165.0,   // ~45 mph slower than field
  });

  it('slow run is internally coherent (no integrity flags)', () => {
    const allRuns = [...population, slowRun];
    const result = analyzeRuns([slowRun], allRuns);
    const r = result.runs[0];
    const integrityFlags = r.flags.filter(f =>
      f.code === 'NON_MONOTONIC_SPLITS' ||
      f.code === 'ZERO_OR_NEGATIVE_TIMING' ||
      f.code === 'DUPLICATE_SPLIT_VALUES' ||
      f.code === 'INCOMPLETE_RUN_DATA'
    );
    expect(integrityFlags.length).toBe(0);
  });

  it('slow run is marked as off-pace, NOT representative', () => {
    const allRuns = [...population, slowRun];
    const result = analyzeRuns([slowRun], allRuns);
    const r = result.runs[0];
    expect(r.representativeRun).toBe(false);
    expect(r.representativeRunReason).toBeTruthy();
    expect(r.representativeRunReason).toMatch(/slower|below/i);
  });

  it('slow run is excluded from baseline', () => {
    const allRuns = [...population, slowRun];
    const result = analyzeRuns([slowRun], allRuns);
    const r = result.runs[0];
    expect(r.excludedFromBaseline).toBe(true);
    expect(r.baselineExclusionReason).toBeTruthy();
  });

  it('slow run has OFF_PACE_RUN flag at info severity', () => {
    const allRuns = [...population, slowRun];
    const result = analyzeRuns([slowRun], allRuns);
    const r = result.runs[0];
    const offPaceFlags = r.flags.filter(f => f.code === 'OFF_PACE_RUN');
    expect(offPaceFlags.length).toBe(1);
    expect(offPaceFlags[0].severity).toBe('info');
  });

  it('slow run is NOT classified as probable_timing_issue', () => {
    const allRuns = [...population, slowRun];
    const result = analyzeRuns([slowRun], allRuns);
    const r = result.runs[0];
    expect(r.classification).not.toBe('probable_timing_issue');
    // Should be unusual_but_plausible (off-pace + coherent override)
    expect(r.classification).toBe('unusual_but_plausible');
  });

  it('slow run score is floored at Medium (>=55), not Critical', () => {
    const allRuns = [...population, slowRun];
    const result = analyzeRuns([slowRun], allRuns);
    const r = result.runs[0];
    expect(r.overallScore).toBeGreaterThanOrEqual(55);
    expect(r.band).not.toBe('Critical');
  });

  it('competitive runs in same batch are not affected by slow run', () => {
    const allRuns = [...population, slowRun];
    // Analyze a competitive run with the slow run in the population
    const competitiveRun = population[0];
    const result = analyzeRuns([competitiveRun], allRuns);
    const r = result.runs[0];
    expect(r.band).toBe('High');
    expect(r.representativeRun).toBe(true);
    expect(r.classification).toBe('clean');
  });
});
