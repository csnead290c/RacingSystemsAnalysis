/**
 * Tests for the Anomaly Engine — timing-data confidence and anomaly detection.
 *
 * Covers:
 *   - Layer 1: Hard integrity checks (missing splits, non-monotonic, zero values, duplicates)
 *   - Layer 2: Shape consistency (segment ratios, mph vs ET)
 *   - Layer 3: Historical baseline comparison (outlier detection, peer selection)
 *   - Scoring model (overall score, field scores, confidence bands)
 *   - Derived intervals computation
 *   - Baseline quality and exclusion of hard-fail runs
 *   - Narrative generation
 *   - Batch analysis summary
 */

import { describe, it, expect } from 'vitest';
import {
  analyzeRuns,
  computeIntervals,
  confidenceBand,
  BAND_COLORS,
  CUMULATIVE_FIELDS,
  INTERVAL_SEGMENTS,
  type DerivedIntervals,
  type RunAnomalyResult,
} from '../anomalyEngine';
import type { ParityRun } from '../../../services/parityApi';

// ── Test Helpers ─────────────────────────────────────────────────────────

/** Create a minimal valid ParityRun for testing */
function makeRun(overrides: Partial<ParityRun> & { id: number }): ParityRun {
  return {
    uuid: `test-${overrides.id}`,
    race_lookup: '20260301',
    run_timestamp_utc: null,
    run_time_local: null,
    category: 'Top Fuel',
    class_index: 'TF',
    round: 'Q1',
    lane: 'L',
    driver_name: 'Test Driver',
    car_number: '1',
    dial_in: null,
    rt: 0.050,
    ft60: 0.850,
    ft330: 2.200,
    ft660: 3.700,
    mph660: 290.0,
    ft1000: 4.800,
    mph1000: null,
    ft1320: 5.500,
    mph1320: 330.0,
    win_flag: null,
    dq_flag: null,
    mov: null,
    place: null,
    source_ref: null,
    created_at: '2026-03-01T00:00:00Z',
    ...overrides,
  };
}

/** Create a population of similar runs for baseline testing */
function makePopulation(count: number, base: Partial<ParityRun> = {}): ParityRun[] {
  return Array.from({ length: count }, (_, i) => makeRun({
    id: 1000 + i,
    driver_name: `Driver ${i}`,
    // Add small random-ish variation to make realistic baselines
    ft60: 0.850 + (i % 5) * 0.002,
    ft330: 2.200 + (i % 7) * 0.003,
    ft660: 3.700 + (i % 6) * 0.004,
    mph660: 290.0 + (i % 8) * 0.5,
    ft1000: 4.800 + (i % 5) * 0.005,
    ft1320: 5.500 + (i % 9) * 0.006,
    mph1320: 330.0 + (i % 7) * 0.4,
    ...base,
  }));
}

// ══════════════════════════════════════════════════════════════════════════
// DERIVED INTERVALS
// ══════════════════════════════════════════════════════════════════════════

describe('computeIntervals', () => {
  it('computes all intervals from a complete run', () => {
    const run = makeRun({ id: 1 });
    const iv = computeIntervals(run);
    expect(iv.t_0_60).toBeCloseTo(0.850, 3);
    expect(iv.t_60_330).toBeCloseTo(1.350, 3);   // 2.200 - 0.850
    expect(iv.t_330_660).toBeCloseTo(1.500, 3);   // 3.700 - 2.200
    expect(iv.t_660_1000).toBeCloseTo(1.100, 3);  // 4.800 - 3.700
    expect(iv.t_1000_1320).toBeCloseTo(0.700, 3); // 5.500 - 4.800
  });

  it('returns null for intervals when splits are missing', () => {
    const run = makeRun({ id: 2, ft330: null, ft660: null });
    const iv = computeIntervals(run);
    expect(iv.t_0_60).toBeCloseTo(0.850, 3);
    expect(iv.t_60_330).toBeNull();
    expect(iv.t_330_660).toBeNull();
    expect(iv.t_660_1000).toBeNull(); // ft660 missing
    expect(iv.t_1000_1320).toBeCloseTo(0.700, 3);
  });

  it('returns null for intervals with zero values', () => {
    const run = makeRun({ id: 3, ft60: 0 });
    const iv = computeIntervals(run);
    expect(iv.t_0_60).toBeNull();
  });
});

// ══════════════════════════════════════════════════════════════════════════
// CONFIDENCE BANDS
// ══════════════════════════════════════════════════════════════════════════

describe('confidenceBand', () => {
  it('maps scores to correct bands', () => {
    expect(confidenceBand(100)).toBe('High');
    expect(confidenceBand(80)).toBe('High');
    expect(confidenceBand(79)).toBe('Medium');
    expect(confidenceBand(55)).toBe('Medium');
    expect(confidenceBand(54)).toBe('Low');
    expect(confidenceBand(30)).toBe('Low');
    expect(confidenceBand(29)).toBe('Critical');
    expect(confidenceBand(0)).toBe('Critical');
  });

  it('BAND_COLORS has all bands', () => {
    expect(BAND_COLORS.High).toBeDefined();
    expect(BAND_COLORS.Medium).toBeDefined();
    expect(BAND_COLORS.Low).toBeDefined();
    expect(BAND_COLORS.Critical).toBeDefined();
  });
});

// ══════════════════════════════════════════════════════════════════════════
// LAYER 1: HARD INTEGRITY
// ══════════════════════════════════════════════════════════════════════════

describe('Layer 1: Hard integrity checks', () => {
  it('clean run produces no flags and high confidence', () => {
    const run = makeRun({ id: 1 });
    const result = analyzeRuns([run]);
    const r = result.runs[0];
    expect(r.overallScore).toBeGreaterThanOrEqual(80);
    expect(r.band).toBe('High');
    // Should have no critical/high flags
    const hardFlags = r.flags.filter(f => f.severity === 'critical' || f.severity === 'high');
    expect(hardFlags.length).toBe(0);
  });

  it('detects non-monotonic splits (660 < 330)', () => {
    const run = makeRun({ id: 1, ft330: 4.000, ft660: 3.500 });
    const result = analyzeRuns([run]);
    const r = result.runs[0];
    const nonMono = r.flags.filter(f => f.code === 'NON_MONOTONIC_SPLITS');
    expect(nonMono.length).toBeGreaterThanOrEqual(1);
    expect(nonMono[0].severity).toBe('critical');
    expect(nonMono[0].field).toBe('ft660');
  });

  it('detects zero timing values', () => {
    const run = makeRun({ id: 1, ft60: 0 });
    const result = analyzeRuns([run]);
    const r = result.runs[0];
    const zeroFlags = r.flags.filter(f => f.code === 'ZERO_OR_NEGATIVE_TIMING');
    expect(zeroFlags.length).toBeGreaterThanOrEqual(1);
    expect(zeroFlags[0].field).toBe('ft60');
  });

  it('detects negative timing values', () => {
    const run = makeRun({ id: 1, ft330: -1.5 });
    const result = analyzeRuns([run]);
    const r = result.runs[0];
    const negFlags = r.flags.filter(f => f.code === 'ZERO_OR_NEGATIVE_TIMING');
    expect(negFlags.length).toBeGreaterThanOrEqual(1);
  });

  it('detects missing intermediate splits', () => {
    // 330 missing but 660, 1000, ET exist
    const run = makeRun({ id: 1, ft330: null });
    const result = analyzeRuns([run]);
    const r = result.runs[0];
    const missing = r.flags.filter(f => f.code === 'MISSING_SPLIT_VALUE');
    expect(missing.length).toBeGreaterThanOrEqual(1);
    expect(missing[0].field).toBe('ft330');
  });

  it('detects duplicate split values', () => {
    const run = makeRun({ id: 1, ft330: 3.700, ft660: 3.700 });
    const result = analyzeRuns([run]);
    const r = result.runs[0];
    const dupes = r.flags.filter(f => f.code === 'DUPLICATE_SPLIT_VALUES');
    expect(dupes.length).toBeGreaterThanOrEqual(1);
  });

  it('detects invalid intervals (ET < 1000 ft)', () => {
    const run = makeRun({ id: 1, category: 'Pro Stock', class_index: 'PS', ft1000: 5.600, ft1320: 5.500 });
    const result = analyzeRuns([run]);
    const r = result.runs[0];
    const invalidInterval = r.flags.filter(f => f.code === 'NON_MONOTONIC_SPLITS' || f.code === 'INVALID_INTERVAL');
    expect(invalidInterval.length).toBeGreaterThanOrEqual(1);
  });

  it('reports incomplete run with no timing data', () => {
    const run = makeRun({ id: 1, rt: null, ft60: null, ft330: null, ft660: null, mph660: null, ft1000: null, ft1320: null, mph1320: null });
    const result = analyzeRuns([run]);
    const r = result.runs[0];
    const incomplete = r.flags.filter(f => f.code === 'INCOMPLETE_RUN_DATA');
    expect(incomplete.length).toBe(1);
  });
});

// ══════════════════════════════════════════════════════════════════════════
// LAYER 2: SHAPE CONSISTENCY
// ══════════════════════════════════════════════════════════════════════════

describe('Layer 2: Shape consistency', () => {
  it('detects wildly inconsistent segment shape', () => {
    // Normal run except 330 ft is way too high — makes 60-330 interval huge
    const run = makeRun({ id: 1, ft330: 4.500 });
    // With ft60=0.850, ft330=4.500, ft660=3.700: non-monotonic will fire first,
    // but let's use a case where 330 is just excessively slow
    const run2 = makeRun({ id: 2, ft60: 0.850, ft330: 3.500, ft660: 3.700, ft1000: 4.800, ft1320: 5.500 });
    // intervals: 0.850, 2.650, 0.200, 1.100, 0.700 — the 0.200 is very small vs neighbors
    const result = analyzeRuns([run2]);
    const r = result.runs[0];
    const shape = r.flags.filter(f => f.code === 'SEGMENT_SHAPE_INCONSISTENT');
    expect(shape.length).toBeGreaterThanOrEqual(1);
  });

  it('does not flag normal shape variation', () => {
    const run = makeRun({ id: 1 });
    const result = analyzeRuns([run]);
    const r = result.runs[0];
    const shape = r.flags.filter(f => f.code === 'SEGMENT_SHAPE_INCONSISTENT');
    expect(shape.length).toBe(0);
  });
});

// ══════════════════════════════════════════════════════════════════════════
// LAYER 3: HISTORICAL BASELINE
// ══════════════════════════════════════════════════════════════════════════

describe('Layer 3: Historical baseline', () => {
  it('identifies outlier when run is far from peer population', () => {
    const population = makePopulation(20);
    // Add an extreme outlier run
    const outlier = makeRun({ id: 999, ft1320: 8.500, mph1320: 200.0 });
    const allRuns = [...population, outlier];
    const result = analyzeRuns([outlier], allRuns);
    const r = result.runs[0];
    const outlierFlags = r.flags.filter(f => f.code === 'OUTLIER_FIELD' || f.code === 'OUTLIER_INTERVAL');
    expect(outlierFlags.length).toBeGreaterThan(0);
    expect(r.overallScore).toBeLessThan(80);
  });

  it('does not flag runs consistent with peers', () => {
    const population = makePopulation(20);
    // Analyze one of the population runs against the rest
    const target = population[0];
    const result = analyzeRuns([target], population);
    const r = result.runs[0];
    const outlierFlags = r.flags.filter(f => f.code === 'OUTLIER_FIELD' || f.code === 'OUTLIER_INTERVAL');
    expect(outlierFlags.length).toBe(0);
    expect(r.overallScore).toBeGreaterThanOrEqual(80);
  });

  it('excludes hard-fail runs from baseline calculation', () => {
    const population = makePopulation(15);
    // Add some bad runs to the population
    const badRun1 = makeRun({ id: 2001, ft60: 0, ft330: 2.2, ft660: 3.7, ft1000: 4.8, ft1320: 5.5 });
    const badRun2 = makeRun({ id: 2002, ft330: 5.0, ft660: 3.0, ft1000: 4.8, ft1320: 5.5 }); // non-monotonic
    const allRuns = [...population, badRun1, badRun2];

    // Analyze a normal run — bad runs should be excluded from baseline
    const target = population[0];
    const result = analyzeRuns([target], allRuns);
    const r = result.runs[0];
    expect(r.baseline.hardFailsExcluded).toBeGreaterThanOrEqual(2);
    expect(r.overallScore).toBeGreaterThanOrEqual(80);
  });

  it('reports baseline quality based on peer count', () => {
    // Small population → weak baseline
    const small = makePopulation(4);
    const target = small[0];
    const result = analyzeRuns([target], small);
    const r = result.runs[0];
    expect(['weak', 'moderate', 'none']).toContain(r.baseline.quality);
  });

  it('reports no baseline when no peers match', () => {
    // Target has a unique category
    const target = makeRun({ id: 1, category: 'Unique Category XYZ' });
    const population = makePopulation(20);
    const result = analyzeRuns([target], population);
    const r = result.runs[0];
    expect(r.baseline.quality).toBe('none');
    expect(r.baseline.sampleSize).toBe(0);
  });
});

// ══════════════════════════════════════════════════════════════════════════
// SCORING MODEL
// ══════════════════════════════════════════════════════════════════════════

describe('Scoring model', () => {
  it('perfect run scores 100', () => {
    const run = makeRun({ id: 1 });
    // Analyze alone (no baseline comparison possible with single run)
    const result = analyzeRuns([run]);
    const r = result.runs[0];
    expect(r.overallScore).toBe(100);
  });

  it('critical flags cause large score deductions', () => {
    const run = makeRun({ id: 1, ft330: 5.000, ft660: 3.500 }); // non-monotonic
    const result = analyzeRuns([run]);
    const r = result.runs[0];
    expect(r.overallScore).toBeLessThan(55);
  });

  it('multiple flags compound deductions', () => {
    const run = makeRun({ id: 1, ft60: 0, ft330: null, ft660: -1.0, ft1000: null });
    const result = analyzeRuns([run]);
    const r = result.runs[0];
    expect(r.overallScore).toBeLessThanOrEqual(40);
    expect(r.band).not.toBe('High');
  });

  it('field scores reflect per-field issues', () => {
    // Only ft330 is bad
    const run = makeRun({ id: 1, ft330: null });
    const result = analyzeRuns([run]);
    const r = result.runs[0];
    const ft330Score = r.fieldScores.find(f => f.field === 'ft330');
    expect(ft330Score).toBeDefined();
    expect(ft330Score!.score).toBeLessThan(100);
    // ft60 should still be fine
    const ft60Score = r.fieldScores.find(f => f.field === 'ft60');
    // ft60 might have no flags at all (not in fieldScores) or score 100
    if (ft60Score) {
      expect(ft60Score.score).toBe(100);
    }
  });

  it('suspect fields list reflects lowest-scored fields', () => {
    const run = makeRun({ id: 1, ft330: 5.000, ft660: 3.500 }); // non-monotonic at 660
    const result = analyzeRuns([run]);
    const r = result.runs[0];
    expect(r.suspectFields.length).toBeGreaterThan(0);
    expect(r.suspectFields).toContain('ft660');
  });
});

// ══════════════════════════════════════════════════════════════════════════
// NARRATIVE GENERATION
// ══════════════════════════════════════════════════════════════════════════

describe('Narrative generation', () => {
  it('produces clean narrative for good runs', () => {
    const run = makeRun({ id: 1 });
    const result = analyzeRuns([run]);
    const r = result.runs[0];
    expect(r.narrative).toContain('consistent');
  });

  it('mentions integrity issues for bad runs', () => {
    const run = makeRun({ id: 1, ft330: 5.0, ft660: 3.5 });
    const result = analyzeRuns([run]);
    const r = result.runs[0];
    expect(r.narrative).toContain('integrity');
  });

  it('mentions weak baseline when applicable', () => {
    // Create 3 peers (category-only match) — gives weak baseline (3 ≥ 3 but < 5)
    const peers = [
      makeRun({ id: 101, category: 'Pro Stock', class_index: 'PS', driver_name: 'A' }),
      makeRun({ id: 102, category: 'Pro Stock', class_index: 'PS', driver_name: 'B' }),
      makeRun({ id: 103, category: 'Pro Stock', class_index: 'PS', driver_name: 'C' }),
    ];
    // outlier is same category but very different values
    const outlier = makeRun({ id: 999, category: 'Pro Stock', class_index: 'PS', driver_name: 'X', ft1320: 12.0, mph1320: 100.0 });
    const result = analyzeRuns([outlier], [...peers, outlier]);
    const r = result.runs[0];
    // With only 3 peers, baseline is weak — narrative should mention it
    expect(r.narrative.toLowerCase()).toMatch(/baseline|peer|historical|no suitable|no historical/);
  });
});

// ══════════════════════════════════════════════════════════════════════════
// BATCH ANALYSIS & SUMMARY
// ══════════════════════════════════════════════════════════════════════════

describe('Batch analysis', () => {
  it('computes correct summary counts', () => {
    const good = makePopulation(10);
    const bad = makeRun({ id: 9999, ft330: 5.0, ft660: 3.5, ft1000: 2.0 }); // multiple critical issues
    const result = analyzeRuns([...good, bad]);
    expect(result.summary.runsAnalyzed).toBe(11);
    expect(result.summary.highCount + result.summary.mediumCount + result.summary.lowCount + result.summary.criticalCount).toBe(11);
    expect(result.summary.criticalCount).toBeGreaterThanOrEqual(1);
  });

  it('identifies most flagged field', () => {
    // Create runs where ft330 has critical issues (non-monotonic)
    const runs = Array.from({ length: 5 }, (_, i) => makeRun({
      id: 100 + i,
      ft330: 4.000, ft660: 3.500, // non-monotonic → critical on ft660
    }));
    const result = analyzeRuns(runs);
    // ft660 gets flagged for non-monotonic
    expect(result.summary.mostFlaggedField).toBeTruthy();
    expect(result.summary.mostFlaggedFieldCount).toBe(5);
  });

  it('handles empty input gracefully', () => {
    const result = analyzeRuns([]);
    expect(result.summary.runsAnalyzed).toBe(0);
    expect(result.runs.length).toBe(0);
  });

  it('handles single run input', () => {
    const run = makeRun({ id: 1 });
    const result = analyzeRuns([run]);
    expect(result.summary.runsAnalyzed).toBe(1);
    expect(result.runs.length).toBe(1);
  });
});

// ══════════════════════════════════════════════════════════════════════════
// REASON CODES
// ══════════════════════════════════════════════════════════════════════════

describe('Reason codes are structured', () => {
  it('every flag has code, severity, and explanation', () => {
    const bad = makeRun({ id: 1, ft330: 5.0, ft660: 3.5, ft1000: null });
    const result = analyzeRuns([bad]);
    const r = result.runs[0];
    expect(r.flags.length).toBeGreaterThan(0);
    for (const flag of r.flags) {
      expect(flag.code).toBeTruthy();
      expect(flag.severity).toBeTruthy();
      expect(flag.explanation).toBeTruthy();
      expect(['critical', 'high', 'medium', 'low', 'info']).toContain(flag.severity);
    }
  });

  it('primary reason reflects worst flag', () => {
    const run = makeRun({ id: 1, ft330: 5.0, ft660: 3.5 });
    const result = analyzeRuns([run]);
    const r = result.runs[0];
    expect(r.primaryReasonCode).toBeTruthy();
    // Primary should be one of the critical flags
    expect(r.flags.some(f => f.code === r.primaryReasonCode)).toBe(true);
  });
});

// ══════════════════════════════════════════════════════════════════════════
// ISOLATED SUSPECT FIELD DETECTION
// ══════════════════════════════════════════════════════════════════════════

describe('Isolated suspect field detection', () => {
  it('identifies when only one field is problematic (critical severity)', () => {
    // ft660 has non-monotonic issue (critical, 25pt penalty → score 75 per field)
    // Plus adjacent shape flags push it well below 70
    const run = makeRun({ id: 1, ft330: 4.000, ft660: 3.500 });
    const result = analyzeRuns([run]);
    const r = result.runs[0];
    expect(r.suspectFields).toContain('ft660');
    // ft60 and ft1320 should not be suspect
    expect(r.suspectFields).not.toContain('ft60');
    expect(r.suspectFields).not.toContain('ft1320');
  });

  it('missing split flags are present even if field score stays above threshold', () => {
    // A single missing split is a high-severity flag but may not push score below 70
    const run = makeRun({ id: 1, ft330: null });
    const result = analyzeRuns([run]);
    const r = result.runs[0];
    const missingFlags = r.flags.filter(f => f.code === 'MISSING_SPLIT_VALUE' && f.field === 'ft330');
    expect(missingFlags.length).toBe(1);
    // The flag exists; the overall score is reduced
    expect(r.overallScore).toBeLessThan(100);
  });

  it('narrative mentions integrity issue when critical flags exist', () => {
    const run = makeRun({ id: 1, ft330: 4.0, ft660: 3.5 });
    const result = analyzeRuns([run]);
    const r = result.runs[0];
    expect(r.narrative.toLowerCase()).toMatch(/integrity|timing|issue/);
  });
});

// ══════════════════════════════════════════════════════════════════════════
// NITRO CLASS DETECTION & NORMALIZED FINISH
// ══════════════════════════════════════════════════════════════════════════

describe('Nitro class: normalized finish model', () => {
  it('nitro run with ft1000 blank and finish in ft1320 is NOT penalized for missing ft1000', () => {
    // Top Fuel: ft1000 is blank, finish time is in ft1320 field (1000 ft convention)
    const nitroRun = makeRun({
      id: 1,
      category: 'Top Fuel',
      class_index: 'TF',
      ft60: 0.840,
      ft330: 2.180,
      ft660: 3.680,
      mph660: 292.0,
      ft1000: null,    // intentionally blank — 1000 ft race, finish in ft1320
      mph1000: null,
      ft1320: 3.720,   // This is actually the 1000 ft finish time
      mph1320: 338.0,
    });
    const result = analyzeRuns([nitroRun]);
    const r = result.runs[0];
    // Should NOT have a MISSING_SPLIT_VALUE flag for ft1000
    const missingFt1000 = r.flags.filter(f => f.code === 'MISSING_SPLIT_VALUE' && f.field === 'ft1000');
    expect(missingFt1000.length).toBe(0);
    // Should have finish info indicating nitro
    expect(r.finish.isNitro).toBe(true);
    expect(r.finish.effectiveFinishDistance).toBe(1000);
    expect(r.finish.effectiveFinishTime).toBe(3.720);
  });

  it('nitro run with ft1000 populated uses ft1000 as finish', () => {
    const nitroRun = makeRun({
      id: 2,
      category: 'Top Fuel',
      class_index: 'TF',
      ft60: 0.840,
      ft330: 2.180,
      ft660: 3.680,
      mph660: 292.0,
      ft1000: 4.780,
      mph1000: 320.0,
      ft1320: null,
      mph1320: null,
    });
    const result = analyzeRuns([nitroRun]);
    const r = result.runs[0];
    expect(r.finish.isNitro).toBe(true);
    expect(r.finish.effectiveFinishTime).toBe(4.780);
    expect(r.finish.finishTimeField).toBe('ft1000');
  });

  it('full-quarter run uses ft1320 as finish (not nitro)', () => {
    const fullQRun = makeRun({
      id: 3,
      category: 'Pro Stock',
      class_index: 'PS',
      ft60: 0.960,
      ft330: 2.480,
      ft660: 4.200,
      mph660: 175.0,
      ft1000: 5.400,
      mph1000: null,
      ft1320: 6.500,
      mph1320: 210.0,
    });
    const result = analyzeRuns([fullQRun]);
    const r = result.runs[0];
    expect(r.finish.isNitro).toBe(false);
    expect(r.finish.effectiveFinishDistance).toBe(1320);
    expect(r.finish.effectiveFinishTime).toBe(6.500);
    expect(r.finish.finishTimeField).toBe('ft1320');
  });

  it('computes t_660_finish interval for nitro runs', () => {
    const nitroRun = makeRun({
      id: 4,
      category: 'Funny Car',
      class_index: 'FC',
      ft60: 0.860,
      ft330: 2.200,
      ft660: 3.700,
      mph660: 290.0,
      ft1000: null,
      ft1320: 3.900, // finish at 1000 ft reported in ft1320
      mph1320: 330.0,
    });
    const iv = computeIntervals(nitroRun);
    // t_660_finish = effectiveFinishTime - ft660 = 3.900 - 3.700 = 0.200
    expect(iv.t_660_finish).toBeCloseTo(0.200, 3);
  });
});

// ══════════════════════════════════════════════════════════════════════════
// OFF-PACE / REPRESENTATIVE RUN DETECTION
// ══════════════════════════════════════════════════════════════════════════

describe('Off-pace / representative run detection', () => {
  it('marks dramatically slow run as off-pace when peers exist', () => {
    const population = makePopulation(20);
    // This run is way slower than the population (ft1320 ~5.5 → 12.0)
    const slowRun = makeRun({
      id: 8888,
      ft60: 1.800,
      ft330: 4.800,
      ft660: 7.500,
      mph660: 150.0,
      ft1000: 10.000,
      ft1320: 12.000,
      mph1320: 160.0,
    });
    const allRuns = [...population, slowRun];
    const result = analyzeRuns([slowRun], allRuns);
    const r = result.runs[0];
    expect(r.representativeRun).toBe(false);
    expect(r.representativeRunReason).toBeTruthy();
    expect(r.excludedFromBaseline).toBe(true);
    // Off-pace flag should be present
    const offPaceFlags = r.flags.filter(f => f.code === 'OFF_PACE_RUN');
    expect(offPaceFlags.length).toBe(1);
    expect(offPaceFlags[0].severity).toBe('info');
  });

  it('does not mark competitive run as off-pace', () => {
    const population = makePopulation(20);
    const target = population[0];
    const result = analyzeRuns([target], population);
    const r = result.runs[0];
    expect(r.representativeRun).toBe(true);
    expect(r.representativeRunReason).toBeNull();
    const offPaceFlags = r.flags.filter(f => f.code === 'OFF_PACE_RUN');
    expect(offPaceFlags.length).toBe(0);
  });

  it('off-pace run with coherent data gets score floor at Medium band', () => {
    const population = makePopulation(20);
    // Slow but internally coherent (all splits monotonic, no zero/negative)
    const slowRun = makeRun({
      id: 7777,
      ft60: 1.500,
      ft330: 4.000,
      ft660: 6.500,
      mph660: 160.0,
      ft1000: 8.500,
      ft1320: 10.500,
      mph1320: 180.0,
    });
    const allRuns = [...population, slowRun];
    const result = analyzeRuns([slowRun], allRuns);
    const r = result.runs[0];
    // Score should be floored at 55 (Medium band minimum)
    expect(r.overallScore).toBeGreaterThanOrEqual(55);
    expect(r.band).not.toBe('Critical');
    // Classification should NOT be probable_timing_issue for coherent off-pace
    expect(r.classification).not.toBe('probable_timing_issue');
  });
});

// ══════════════════════════════════════════════════════════════════════════
// SUMMARY: representativeCount and offPaceCount
// ══════════════════════════════════════════════════════════════════════════

describe('Summary includes representative and off-pace counts', () => {
  it('summary.representativeCount and summary.offPaceCount are present', () => {
    const population = makePopulation(20);
    const result = analyzeRuns(population);
    expect(typeof result.summary.representativeCount).toBe('number');
    expect(typeof result.summary.offPaceCount).toBe('number');
    expect(result.summary.representativeCount + result.summary.offPaceCount).toBe(result.summary.runsAnalyzed);
  });
});
