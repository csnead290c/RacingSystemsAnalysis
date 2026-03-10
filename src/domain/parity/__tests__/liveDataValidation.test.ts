/**
 * Live-Data Validation Harness
 *
 * Exercises the TS anomaly engine with realistic NHRA timing patterns
 * for Top Fuel, Funny Car, Pro Stock, and Pro Stock Motorcycle.
 * Each population uses real-world timing ranges from published results.
 */

import { describe, it, expect } from 'vitest';
import {
  analyzeRuns,
  resolveFinish,
  isNitroClass,
  type RunAnomalyResult,
} from '../anomalyEngine';
import type { ParityRun } from '../../../services/parityApi';

// ── Base run factory ────────────────────────────────────────────────────

let _nextId = 10000;
function mkRun(overrides: Partial<ParityRun>): ParityRun {
  return {
    id: _nextId++,
    uuid: `val-${_nextId}`,
    race_lookup: '20250223',
    run_timestamp_utc: null,
    run_time_local: null,
    category: null,
    class_index: null,
    round: 'Q1',
    lane: 'L',
    driver_name: 'Driver',
    car_number: '1',
    dial_in: null,
    rt: 0.060,
    ft60: null, ft330: null, ft660: null, mph660: null,
    ft1000: null, mph1000: null, ft1320: null, mph1320: null,
    win_flag: null, dq_flag: null, mov: null, place: null,
    source_ref: null,
    created_at: '2025-02-23T00:00:00Z',
    ...overrides,
  };
}

function jit(base: number, range: number): number {
  return +(base + (Math.random() - 0.5) * 2 * range).toFixed(4);
}

// ══════════════════════════════════════════════════════════════════════════
// POPULATION BUILDERS
// ══════════════════════════════════════════════════════════════════════════

function makeTopFuel(n: number): ParityRun[] {
  const runs: ParityRun[] = [];
  for (let i = 0; i < n; i++) {
    runs.push(mkRun({
      category: 'Top Fuel', class_index: 'TF',
      driver_name: `TF-${String.fromCharCode(65 + (i % 16))}`,
      round: i < n / 2 ? 'Q1' : 'Q2', lane: i % 2 ? 'R' : 'L',
      ft60: jit(0.842, 0.008), ft330: jit(2.170, 0.015),
      ft660: jit(3.670, 0.020), mph660: jit(289, 3),
      ft1000: null, mph1000: null,
      ft1320: jit(3.710, 0.025), mph1320: jit(337, 3),
    }));
  }
  return runs;
}

function makeFunnyCar(n: number): ParityRun[] {
  const runs: ParityRun[] = [];
  for (let i = 0; i < n; i++) {
    const et = jit(3.870, 0.030);
    const mph = jit(328, 3);
    const hasFt1000 = i % 10 < 3;
    runs.push(mkRun({
      category: 'Funny Car', class_index: 'FC',
      driver_name: `FC-${String.fromCharCode(65 + (i % 16))}`,
      round: i < n / 2 ? 'Q1' : 'Q2', lane: i % 2 ? 'R' : 'L',
      ft60: jit(0.858, 0.008), ft330: jit(2.220, 0.015),
      ft660: jit(3.780, 0.020), mph660: jit(282, 3),
      ft1000: hasFt1000 ? et : null,
      mph1000: hasFt1000 ? mph : null,
      ft1320: hasFt1000 ? null : et,
      mph1320: hasFt1000 ? null : mph,
    }));
  }
  return runs;
}

function makeProStock(n: number): ParityRun[] {
  const runs: ParityRun[] = [];
  for (let i = 0; i < n; i++) {
    runs.push(mkRun({
      category: 'Pro Stock', class_index: 'PS',
      driver_name: `PS-${String.fromCharCode(65 + (i % 16))}`,
      round: i < n / 2 ? 'Q1' : 'Q2', lane: i % 2 ? 'R' : 'L',
      ft60: jit(0.965, 0.005), ft330: jit(2.482, 0.010),
      ft660: jit(4.200, 0.015), mph660: jit(174.5, 1.5),
      ft1000: jit(5.390, 0.015), mph1000: null,
      ft1320: jit(6.520, 0.020), mph1320: jit(210, 2),
    }));
  }
  return runs;
}

function makePSM(n: number): ParityRun[] {
  const runs: ParityRun[] = [];
  for (let i = 0; i < n; i++) {
    runs.push(mkRun({
      category: 'Pro Stock Motorcycle', class_index: 'PSM',
      driver_name: `PSM-${String.fromCharCode(65 + (i % 10))}`,
      round: i < n / 2 ? 'Q1' : 'Q2', lane: i % 2 ? 'R' : 'L',
      ft60: jit(1.010, 0.008), ft330: jit(2.610, 0.012),
      ft660: jit(4.420, 0.018), mph660: jit(168, 2),
      ft1000: jit(5.640, 0.018), mph1000: null,
      ft1320: jit(6.780, 0.025), mph1320: jit(201, 3),
    }));
  }
  return runs;
}

// ── Special runs ────────────────────────────────────────────────────────

const tfSlow = mkRun({
  category: 'Top Fuel', class_index: 'TF', driver_name: 'TF-Slow',
  round: 'Q1', lane: 'R',
  ft60: 0.890, ft330: 2.450, ft660: 4.800, mph660: 210,
  ft1000: null, mph1000: null, ft1320: 5.200, mph1320: 230,
});

const tfAbort = mkRun({
  category: 'Top Fuel', class_index: 'TF', driver_name: 'TF-Abort',
  round: 'E1', lane: 'L',
  ft60: 0.845, ft330: null, ft660: null, mph660: null,
  ft1000: null, mph1000: null, ft1320: null, mph1320: null,
});

const fcSlow = mkRun({
  category: 'Funny Car', class_index: 'FC', driver_name: 'FC-Slow',
  round: 'Q2', lane: 'L',
  ft60: 0.920, ft330: 2.600, ft660: 5.100, mph660: 200,
  ft1000: null, mph1000: null, ft1320: 5.600, mph1320: 220,
});

const psSlow = mkRun({
  category: 'Pro Stock', class_index: 'PS', driver_name: 'PS-Slow',
  round: 'Q1', lane: 'L',
  ft60: 1.200, ft330: 3.100, ft660: 5.300, mph660: 155,
  ft1000: 6.900, mph1000: null, ft1320: 8.400, mph1320: 175,
});

const psCorrupt = mkRun({
  category: 'Pro Stock', class_index: 'PS', driver_name: 'PS-Corrupt',
  round: 'E1', lane: 'R',
  ft60: 0.968, ft330: 2.490, ft660: 4.180, mph660: 175,
  ft1000: 5.350, mph1000: null,
  ft1320: 5.200, mph1320: 210, // ft1320 < ft1000 → corrupt
});

const psmSlow = mkRun({
  category: 'Pro Stock Motorcycle', class_index: 'PSM', driver_name: 'PSM-Slow',
  round: 'Q2', lane: 'R',
  ft60: 1.150, ft330: 3.000, ft660: 5.200, mph660: 145,
  ft1000: 6.800, mph1000: null, ft1320: 8.200, mph1320: 170,
});

// ══════════════════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════════════════

function findRun(results: RunAnomalyResult[], id: number) {
  return results.find(r => r.runId === id);
}

function dumpReport(label: string, pop: ParityRun[]) {
  const res = analyzeRuns(pop);
  const s = res.summary;
  console.log(`\n=== ${label} (${s.runsAnalyzed} runs) ===`);
  console.log(`  Bands: High=${s.highCount} Med=${s.mediumCount} Low=${s.lowCount} Crit=${s.criticalCount}`);
  console.log(`  Representative=${s.representativeCount} OffPace=${s.offPaceCount} BaselineExcl=${s.baselineExcluded}`);

  const classif: Record<string, number> = {};
  for (const r of res.runs) classif[r.classification] = (classif[r.classification] ?? 0) + 1;
  console.log('  Classifications:', classif);

  // Show non-High runs
  for (const r of res.runs) {
    if (r.band !== 'High' || !r.representativeRun) {
      const pop_run = pop.find(p => p.id === r.runId);
      console.log(`  [${r.band}/${r.overallScore}] ${pop_run?.driver_name} | ${r.classification} | rep=${r.representativeRun} | flags=${r.flagCount}: ${r.flags.map(f => `${f.code}:${f.field||'_'}(${f.severity})`).join(', ')}`);
    }
  }

  // Show 2 clean samples
  const clean = res.runs.filter(r => r.band === 'High').slice(0, 2);
  for (const r of clean) {
    const pop_run = pop.find(p => p.id === r.runId);
    console.log(`  [CLEAN] ${pop_run?.driver_name} | score=${r.overallScore} | nitro=${r.finish.isNitro} | finishET=${r.finish.effectiveFinishTime} finishDist=${r.finish.effectiveFinishDistance} | t660f=${r.intervals.t_660_finish?.toFixed(4) ?? 'null'}`);
  }

  return res;
}

// ══════════════════════════════════════════════════════════════════════════
// SCENARIO 1: TOP FUEL
// ══════════════════════════════════════════════════════════════════════════

describe('Live validation: Top Fuel (24 competitive + slow + abort)', () => {
  const pop = [...makeTopFuel(24), tfSlow, tfAbort];

  it('report and structural checks', () => {
    const res = dumpReport('TOP FUEL', pop);
    const s = res.summary;
    expect(s.runsAnalyzed).toBe(26);

    // All detected as nitro
    for (const r of res.runs) expect(r.finish.isNitro).toBe(true);

    // No MISSING_SPLIT_VALUE for ft1000
    for (const r of res.runs) {
      expect(r.flags.filter(f => f.code === 'MISSING_SPLIT_VALUE' && f.field === 'ft1000').length).toBe(0);
    }

    // Competitive runs mostly High
    expect(s.highCount).toBeGreaterThanOrEqual(20);
  });

  it('slow TF run handled correctly', () => {
    const res = analyzeRuns(pop);
    const slow = findRun(res.runs, tfSlow.id)!;
    expect(slow).toBeDefined();
    expect(slow.representativeRun).toBe(false);
    expect(slow.classification).not.toBe('probable_timing_issue');
    expect(slow.overallScore).toBeGreaterThanOrEqual(55);
    console.log(`  TF-Slow: band=${slow.band} score=${slow.overallScore} class=${slow.classification} rep=${slow.representativeRun}`);
  });

  it('abort TF run flagged as incomplete', () => {
    const res = analyzeRuns(pop);
    const abort = findRun(res.runs, tfAbort.id)!;
    expect(abort).toBeDefined();
    // Should have MISSING_SPLIT_VALUE or INCOMPLETE flags
    expect(abort.flagCount).toBeGreaterThan(0);
    console.log(`  TF-Abort: band=${abort.band} score=${abort.overallScore} class=${abort.classification} flags=${abort.flags.map(f=>f.code).join(',')}`);
  });

  it('clean TF runs show correct nitro normalization', () => {
    const res = analyzeRuns(pop);
    const clean = res.runs.filter(r => r.band === 'High').slice(0, 3);
    for (const r of clean) {
      expect(r.finish.effectiveFinishDistance).toBe(1000);
      expect(r.finish.effectiveFinishTime).toBeGreaterThan(3.5);
      expect(r.finish.effectiveFinishTime).toBeLessThan(4.0);
      expect(r.intervals.t_660_finish).toBeGreaterThan(0);
      expect(r.intervals.t_660_finish).toBeLessThan(0.15);
    }
  });
});

// ══════════════════════════════════════════════════════════════════════════
// SCENARIO 2: FUNNY CAR (mixed ft1000 convention)
// ══════════════════════════════════════════════════════════════════════════

describe('Live validation: Funny Car (20 competitive + slow)', () => {
  const pop = [...makeFunnyCar(20), fcSlow];

  it('report and structural checks', () => {
    const res = dumpReport('FUNNY CAR', pop);
    expect(res.summary.runsAnalyzed).toBe(21);
    for (const r of res.runs) expect(r.finish.isNitro).toBe(true);
    expect(res.summary.highCount).toBeGreaterThanOrEqual(16);
  });

  it('mixed ft1000/ft1320 convention handled correctly', () => {
    const res = analyzeRuns(pop);
    for (const r of res.runs) {
      const raw = pop.find(p => p.id === r.runId)!;
      expect(r.finish.effectiveFinishDistance).toBe(1000);
      if (raw.ft1000 !== null && raw.ft1000 > 0) {
        expect(r.finish.finishTimeField).toBe('ft1000');
        expect(r.finish.effectiveFinishTime).toBe(raw.ft1000);
      } else if (raw.ft1320 !== null && raw.ft1320 > 0) {
        expect(r.finish.finishTimeField).toBe('ft1320');
        expect(r.finish.effectiveFinishTime).toBe(raw.ft1320);
      }
    }
  });

  it('slow FC run is off-pace, not probable_timing_issue', () => {
    const res = analyzeRuns(pop);
    const slow = findRun(res.runs, fcSlow.id)!;
    expect(slow.representativeRun).toBe(false);
    expect(slow.classification).not.toBe('probable_timing_issue');
    expect(slow.overallScore).toBeGreaterThanOrEqual(55);
  });
});

// ══════════════════════════════════════════════════════════════════════════
// SCENARIO 3: PRO STOCK (full quarter)
// ══════════════════════════════════════════════════════════════════════════

describe('Live validation: Pro Stock (24 competitive + slow + corrupt)', () => {
  const pop = [...makeProStock(24), psSlow, psCorrupt];

  it('report and structural checks', () => {
    const res = dumpReport('PRO STOCK', pop);
    expect(res.summary.runsAnalyzed).toBe(26);
    for (const r of res.runs) expect(r.finish.isNitro).toBe(false);
    expect(res.summary.highCount).toBeGreaterThanOrEqual(20);
  });

  it('full-quarter intervals computed correctly', () => {
    const res = analyzeRuns(pop);
    const clean = res.runs.filter(r => r.band === 'High').slice(0, 3);
    for (const r of clean) {
      expect(r.finish.effectiveFinishDistance).toBe(1320);
      expect(r.intervals.t_0_60).toBeGreaterThan(0.9);
      expect(r.intervals.t_660_1000).toBeGreaterThan(1.0);
      expect(r.intervals.t_1000_1320).toBeGreaterThan(1.0);
      expect(r.intervals.t_660_finish).toBeGreaterThan(2.0);
    }
  });

  it('slow PS run is off-pace, not probable_timing_issue', () => {
    const res = analyzeRuns(pop);
    const slow = findRun(res.runs, psSlow.id)!;
    expect(slow.representativeRun).toBe(false);
    expect(slow.classification).not.toBe('probable_timing_issue');
    expect(slow.overallScore).toBeGreaterThanOrEqual(55);
    expect(slow.excludedFromBaseline).toBe(true);
  });

  it('corrupt PS run IS flagged as timing issue', () => {
    const res = analyzeRuns(pop);
    const corrupt = findRun(res.runs, psCorrupt.id)!;
    expect(corrupt.band).not.toBe('High');
    const hasNonMono = corrupt.flags.some(f => f.code === 'NON_MONOTONIC_SPLITS');
    expect(hasNonMono).toBe(true);
    console.log(`  PS-Corrupt: band=${corrupt.band} score=${corrupt.overallScore} class=${corrupt.classification}`);
  });

  it('competitive PS runs unaffected by slow/corrupt peers', () => {
    const res = analyzeRuns(pop);
    const competitive = res.runs.filter(r =>
      r.runId !== psSlow.id && r.runId !== psCorrupt.id
    );
    const highPct = competitive.filter(r => r.band === 'High').length / competitive.length;
    expect(highPct).toBeGreaterThan(0.8);
  });
});

// ══════════════════════════════════════════════════════════════════════════
// SCENARIO 4: PRO STOCK MOTORCYCLE
// ══════════════════════════════════════════════════════════════════════════

describe('Live validation: Pro Stock Motorcycle (20 competitive + slow)', () => {
  const pop = [...makePSM(20), psmSlow];

  it('report and structural checks', () => {
    const res = dumpReport('PRO STOCK MOTORCYCLE', pop);
    expect(res.summary.runsAnalyzed).toBe(21);
    for (const r of res.runs) expect(r.finish.isNitro).toBe(false);
    expect(res.summary.highCount).toBeGreaterThanOrEqual(16);
  });

  it('slow PSM run is off-pace, not timing failure', () => {
    const res = analyzeRuns(pop);
    const slow = findRun(res.runs, psmSlow.id)!;
    expect(slow.representativeRun).toBe(false);
    expect(slow.classification).not.toBe('probable_timing_issue');
    expect(slow.overallScore).toBeGreaterThanOrEqual(55);
  });
});

// ══════════════════════════════════════════════════════════════════════════
// CROSS-CLASS DISTRIBUTION CHECK
// ══════════════════════════════════════════════════════════════════════════

describe('Classification distribution sanity check', () => {
  it('no class has >15% critical rate on competitive runs', () => {
    const classes = [
      { name: 'TF', pop: makeTopFuel(30) },
      { name: 'FC', pop: makeFunnyCar(30) },
      { name: 'PS', pop: makeProStock(30) },
      { name: 'PSM', pop: makePSM(30) },
    ];

    for (const cls of classes) {
      const res = analyzeRuns(cls.pop);
      const critPct = res.summary.criticalCount / res.summary.runsAnalyzed;
      console.log(`  ${cls.name}: ${res.summary.runsAnalyzed} runs, crit=${res.summary.criticalCount} (${(critPct * 100).toFixed(1)}%), high=${res.summary.highCount}, med=${res.summary.mediumCount}, low=${res.summary.lowCount}`);
      expect(critPct).toBeLessThan(0.15);
    }
  });

  it('no class has >30% review_recommended on competitive runs', () => {
    const classes = [
      { name: 'TF', pop: makeTopFuel(30) },
      { name: 'FC', pop: makeFunnyCar(30) },
      { name: 'PS', pop: makeProStock(30) },
      { name: 'PSM', pop: makePSM(30) },
    ];

    for (const cls of classes) {
      const res = analyzeRuns(cls.pop);
      const reviewCount = res.runs.filter(r => r.classification === 'review_recommended').length;
      const reviewPct = reviewCount / res.summary.runsAnalyzed;
      console.log(`  ${cls.name}: review_recommended=${reviewCount} (${(reviewPct * 100).toFixed(1)}%)`);
      expect(reviewPct).toBeLessThan(0.30);
    }
  });

  it('off-pace count is 0 for competitive-only populations', () => {
    const classes = [
      { name: 'TF', pop: makeTopFuel(20) },
      { name: 'PS', pop: makeProStock(20) },
    ];
    for (const cls of classes) {
      const res = analyzeRuns(cls.pop);
      console.log(`  ${cls.name}: offPace=${res.summary.offPaceCount}`);
      expect(res.summary.offPaceCount).toBe(0);
    }
  });
});
