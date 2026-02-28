/**
 * Exhaustive unit tests for NHRA Qualifying Sheet logic.
 *
 * Tests the pure functions in qualSheet.ts which mirror the backend
 * handleQualSheet (api/parity.php) algorithm.
 *
 * Coverage:
 *  1. Qualifying-only filter (Q vs E rounds)
 *  2. DQ handling (invalidates run, all-DQ drivers at bottom)
 *  3. Tie-breaking (ET → MPH → timestamp)
 *  4. Final sheet sorting
 *  5. Display correctness (MPH from best run only)
 */

import { describe, it, expect } from 'vitest';
import {
  filterQualifyingRuns,
  selectBestRun,
  buildQualSheet,
  type QualRun,
} from '../qualSheet';

// ── Helpers ──────────────────────────────────────────────────────────────

function makeRun(overrides: Partial<QualRun> & { driver_name: string }): QualRun {
  return {
    id: Math.floor(Math.random() * 100000),
    round: 'Q1',
    ft1320: null,
    mph1320: null,
    rt: null,
    ft60: null,
    ft660: null,
    run_timestamp_utc: '2025-10-30T10:00:00Z',
    dq_flag: false,
    car_number: null,
    ...overrides,
  };
}

// ── 1. Qualifying-Only Filter ────────────────────────────────────────────

describe('filterQualifyingRuns', () => {
  it('keeps Q1, Q2, Q3, Q4 rounds', () => {
    const runs = [
      makeRun({ driver_name: 'A', round: 'Q1' }),
      makeRun({ driver_name: 'A', round: 'Q2' }),
      makeRun({ driver_name: 'A', round: 'Q3' }),
      makeRun({ driver_name: 'A', round: 'Q4' }),
    ];
    expect(filterQualifyingRuns(runs)).toHaveLength(4);
  });

  it('excludes E1, E2, E3 elimination rounds', () => {
    const runs = [
      makeRun({ driver_name: 'A', round: 'Q1' }),
      makeRun({ driver_name: 'A', round: 'E1' }),
      makeRun({ driver_name: 'A', round: 'E2' }),
      makeRun({ driver_name: 'A', round: 'E3' }),
    ];
    expect(filterQualifyingRuns(runs)).toHaveLength(1);
    expect(filterQualifyingRuns(runs)[0].round).toBe('Q1');
  });

  it('excludes null rounds', () => {
    const runs = [
      makeRun({ driver_name: 'A', round: null }),
      makeRun({ driver_name: 'A', round: 'Q1' }),
    ];
    expect(filterQualifyingRuns(runs)).toHaveLength(1);
  });

  it('is case-insensitive for Q prefix', () => {
    const runs = [
      makeRun({ driver_name: 'A', round: 'q1' }),
      makeRun({ driver_name: 'A', round: 'q2' }),
    ];
    expect(filterQualifyingRuns(runs)).toHaveLength(2);
  });

  it('given only elimination rounds, returns empty', () => {
    const runs = [
      makeRun({ driver_name: 'A', round: 'E1' }),
      makeRun({ driver_name: 'B', round: 'E2' }),
    ];
    expect(filterQualifyingRuns(runs)).toHaveLength(0);
  });
});

// ── 2. DQ Handling ───────────────────────────────────────────────────────

describe('selectBestRun — DQ handling', () => {
  it('DQ run is never selected as best', () => {
    const runs = [
      makeRun({ driver_name: 'A', round: 'Q1', ft1320: 3.700, mph1320: 330.0, dq_flag: true }),
      makeRun({ driver_name: 'A', round: 'Q2', ft1320: 3.800, mph1320: 325.0, dq_flag: false }),
    ];
    const best = selectBestRun(runs);
    expect(best).not.toBeNull();
    expect(best!.ft1320).toBe(3.800);
    expect(best!.dq_flag).toBe(false);
  });

  it('all-DQ runs returns null', () => {
    const runs = [
      makeRun({ driver_name: 'A', round: 'Q1', ft1320: 3.700, mph1320: 330.0, dq_flag: true }),
      makeRun({ driver_name: 'A', round: 'Q2', ft1320: 3.750, mph1320: 328.0, dq_flag: true }),
    ];
    expect(selectBestRun(runs)).toBeNull();
  });

  it('valid run with worse ET chosen over DQ run with better ET', () => {
    const runs = [
      makeRun({ driver_name: 'A', round: 'Q1', ft1320: 3.600, mph1320: 340.0, dq_flag: true }),
      makeRun({ driver_name: 'A', round: 'Q2', ft1320: 4.000, mph1320: 310.0, dq_flag: false }),
    ];
    const best = selectBestRun(runs);
    expect(best!.ft1320).toBe(4.000);
  });

  it('mix of DQ and non-DQ — only non-DQ considered', () => {
    const runs = [
      makeRun({ driver_name: 'A', round: 'Q1', ft1320: 3.700, mph1320: 330.0, dq_flag: true }),
      makeRun({ driver_name: 'A', round: 'Q2', ft1320: 3.800, mph1320: 325.0, dq_flag: false }),
      makeRun({ driver_name: 'A', round: 'Q3', ft1320: 3.750, mph1320: 328.0, dq_flag: false }),
    ];
    const best = selectBestRun(runs);
    expect(best!.ft1320).toBe(3.750);
  });

  it('run with null ET is skipped even if not DQ', () => {
    const runs = [
      makeRun({ driver_name: 'A', round: 'Q1', ft1320: null, mph1320: 330.0, dq_flag: false }),
      makeRun({ driver_name: 'A', round: 'Q2', ft1320: 3.800, mph1320: 325.0, dq_flag: false }),
    ];
    const best = selectBestRun(runs);
    expect(best!.ft1320).toBe(3.800);
  });

  it('run with ET = 0 is skipped', () => {
    const runs = [
      makeRun({ driver_name: 'A', round: 'Q1', ft1320: 0, mph1320: 0, dq_flag: false }),
      makeRun({ driver_name: 'A', round: 'Q2', ft1320: 3.800, mph1320: 325.0, dq_flag: false }),
    ];
    const best = selectBestRun(runs);
    expect(best!.ft1320).toBe(3.800);
  });

  it('all runs have null ET — returns null', () => {
    const runs = [
      makeRun({ driver_name: 'A', round: 'Q1', ft1320: null, dq_flag: false }),
      makeRun({ driver_name: 'A', round: 'Q2', ft1320: null, dq_flag: false }),
    ];
    expect(selectBestRun(runs)).toBeNull();
  });
});

// ── 3. Tie-Breaking ──────────────────────────────────────────────────────

describe('selectBestRun — NHRA tie-breaking', () => {
  it('primary: lowest ET wins', () => {
    const runs = [
      makeRun({ driver_name: 'A', round: 'Q1', ft1320: 3.800, mph1320: 325.0 }),
      makeRun({ driver_name: 'A', round: 'Q2', ft1320: 3.750, mph1320: 320.0 }),
    ];
    const best = selectBestRun(runs);
    expect(best!.ft1320).toBe(3.750);
  });

  it('ET tie → higher MPH from SAME RUN wins', () => {
    const runs = [
      makeRun({ driver_name: 'A', round: 'Q1', ft1320: 3.800, mph1320: 325.0,
        run_timestamp_utc: '2025-10-30T10:00:00Z' }),
      makeRun({ driver_name: 'A', round: 'Q2', ft1320: 3.800, mph1320: 328.0,
        run_timestamp_utc: '2025-10-30T11:00:00Z' }),
    ];
    const best = selectBestRun(runs);
    expect(best!.mph1320).toBe(328.0);
  });

  it('ET + MPH tie → earliest timestamp wins', () => {
    const runs = [
      makeRun({ driver_name: 'A', round: 'Q1', ft1320: 3.800, mph1320: 325.0,
        run_timestamp_utc: '2025-10-30T14:00:00Z' }),
      makeRun({ driver_name: 'A', round: 'Q2', ft1320: 3.800, mph1320: 325.0,
        run_timestamp_utc: '2025-10-30T10:00:00Z' }),
    ];
    const best = selectBestRun(runs);
    expect(best!.run_timestamp_utc).toBe('2025-10-30T10:00:00Z');
  });

  it('three-way tie with different timestamps', () => {
    const runs = [
      makeRun({ driver_name: 'A', round: 'Q1', ft1320: 4.000, mph1320: 300.0,
        run_timestamp_utc: '2025-10-30T15:00:00Z' }),
      makeRun({ driver_name: 'A', round: 'Q2', ft1320: 4.000, mph1320: 300.0,
        run_timestamp_utc: '2025-10-30T12:00:00Z' }),
      makeRun({ driver_name: 'A', round: 'Q3', ft1320: 4.000, mph1320: 300.0,
        run_timestamp_utc: '2025-10-30T09:00:00Z' }),
    ];
    const best = selectBestRun(runs);
    expect(best!.run_timestamp_utc).toBe('2025-10-30T09:00:00Z');
  });

  it('null MPH treated as 0 in tiebreak', () => {
    const runs = [
      makeRun({ driver_name: 'A', round: 'Q1', ft1320: 3.800, mph1320: null,
        run_timestamp_utc: '2025-10-30T10:00:00Z' }),
      makeRun({ driver_name: 'A', round: 'Q2', ft1320: 3.800, mph1320: 325.0,
        run_timestamp_utc: '2025-10-30T11:00:00Z' }),
    ];
    const best = selectBestRun(runs);
    expect(best!.mph1320).toBe(325.0);
  });

  it('null timestamp treated as empty string in tiebreak', () => {
    const runs = [
      makeRun({ driver_name: 'A', round: 'Q1', ft1320: 3.800, mph1320: 325.0,
        run_timestamp_utc: null }),
      makeRun({ driver_name: 'A', round: 'Q2', ft1320: 3.800, mph1320: 325.0,
        run_timestamp_utc: '2025-10-30T10:00:00Z' }),
    ];
    const best = selectBestRun(runs);
    // Empty string sorts before any date
    expect(best!.run_timestamp_utc).toBeNull();
  });
});

// ── 4. buildQualSheet — Full Sheet Sorting ───────────────────────────────

describe('buildQualSheet — final ordering', () => {
  it('sorts by ET ascending', () => {
    const runs = [
      makeRun({ driver_name: 'Slow', round: 'Q1', ft1320: 4.000, mph1320: 310.0 }),
      makeRun({ driver_name: 'Fast', round: 'Q1', ft1320: 3.700, mph1320: 330.0 }),
      makeRun({ driver_name: 'Mid', round: 'Q1', ft1320: 3.850, mph1320: 320.0 }),
    ];
    const sheet = buildQualSheet(runs);
    expect(sheet.map(s => s.driver)).toEqual(['Fast', 'Mid', 'Slow']);
    expect(sheet.map(s => s.qual_pos)).toEqual([1, 2, 3]);
  });

  it('ET tie → MPH desc', () => {
    const runs = [
      makeRun({ driver_name: 'LowMPH', round: 'Q1', ft1320: 3.800, mph1320: 320.0 }),
      makeRun({ driver_name: 'HiMPH', round: 'Q1', ft1320: 3.800, mph1320: 330.0 }),
    ];
    const sheet = buildQualSheet(runs);
    expect(sheet[0].driver).toBe('HiMPH');
    expect(sheet[1].driver).toBe('LowMPH');
  });

  it('ET + MPH tie → timestamp asc', () => {
    const runs = [
      makeRun({ driver_name: 'Late', round: 'Q1', ft1320: 3.800, mph1320: 325.0,
        run_timestamp_utc: '2025-10-30T14:00:00Z' }),
      makeRun({ driver_name: 'Early', round: 'Q1', ft1320: 3.800, mph1320: 325.0,
        run_timestamp_utc: '2025-10-30T10:00:00Z' }),
    ];
    const sheet = buildQualSheet(runs);
    expect(sheet[0].driver).toBe('Early');
    expect(sheet[1].driver).toBe('Late');
  });

  it('invalid drivers appear after all valid drivers', () => {
    const runs = [
      makeRun({ driver_name: 'ValidSlow', round: 'Q1', ft1320: 4.000, mph1320: 310.0 }),
      makeRun({ driver_name: 'DQonly', round: 'Q1', ft1320: 3.500, mph1320: 340.0, dq_flag: true }),
      makeRun({ driver_name: 'ValidFast', round: 'Q1', ft1320: 3.700, mph1320: 330.0 }),
    ];
    const sheet = buildQualSheet(runs);
    expect(sheet).toHaveLength(3);
    expect(sheet[0].driver).toBe('ValidFast');
    expect(sheet[0].qual_pos).toBe(1);
    expect(sheet[1].driver).toBe('ValidSlow');
    expect(sheet[1].qual_pos).toBe(2);
    expect(sheet[2].driver).toBe('DQonly');
    expect(sheet[2].qual_pos).toBeNull();
    expect(sheet[2].is_valid).toBe(false);
  });

  it('multiple invalid drivers at bottom, all with null position', () => {
    const runs = [
      makeRun({ driver_name: 'Valid', round: 'Q1', ft1320: 3.800, mph1320: 325.0 }),
      makeRun({ driver_name: 'DQ1', round: 'Q1', ft1320: 3.500, dq_flag: true }),
      makeRun({ driver_name: 'DQ2', round: 'Q1', ft1320: 3.600, dq_flag: true }),
    ];
    const sheet = buildQualSheet(runs);
    expect(sheet[0].driver).toBe('Valid');
    expect(sheet[0].qual_pos).toBe(1);
    expect(sheet[1].is_valid).toBe(false);
    expect(sheet[1].qual_pos).toBeNull();
    expect(sheet[2].is_valid).toBe(false);
    expect(sheet[2].qual_pos).toBeNull();
  });
});

// ── 5. Display Correctness ───────────────────────────────────────────────

describe('buildQualSheet — display correctness', () => {
  it('MPH is always from the selected best run, not another attempt', () => {
    // Driver has two runs: Q1 with great MPH but worse ET, Q2 with best ET but lower MPH
    const runs = [
      makeRun({ driver_name: 'A', round: 'Q1', ft1320: 3.900, mph1320: 340.0,
        run_timestamp_utc: '2025-10-30T10:00:00Z' }),
      makeRun({ driver_name: 'A', round: 'Q2', ft1320: 3.800, mph1320: 325.0,
        run_timestamp_utc: '2025-10-30T11:00:00Z' }),
    ];
    const sheet = buildQualSheet(runs);
    expect(sheet[0].best_et).toBe(3.800);
    // MPH must be 325.0 (from the best ET run), NOT 340.0 (from another attempt)
    expect(sheet[0].best_mph).toBe(325.0);
  });

  it('RT and 60ft are from the best run', () => {
    const runs = [
      makeRun({ driver_name: 'A', round: 'Q1', ft1320: 3.900, mph1320: 320.0,
        rt: 0.950, ft60: 0.850 }),
      makeRun({ driver_name: 'A', round: 'Q2', ft1320: 3.800, mph1320: 325.0,
        rt: 0.920, ft60: 0.830 }),
    ];
    const sheet = buildQualSheet(runs);
    expect(sheet[0].best_rt).toBe(0.920);
    expect(sheet[0].best_ft60).toBe(0.830);
  });

  it('best_timestamp is from the best run', () => {
    const runs = [
      makeRun({ driver_name: 'A', round: 'Q1', ft1320: 3.900, mph1320: 320.0,
        run_timestamp_utc: '2025-10-30T10:00:00Z' }),
      makeRun({ driver_name: 'A', round: 'Q2', ft1320: 3.800, mph1320: 325.0,
        run_timestamp_utc: '2025-10-30T14:00:00Z' }),
    ];
    const sheet = buildQualSheet(runs);
    expect(sheet[0].best_timestamp).toBe('2025-10-30T14:00:00Z');
  });

  it('invalid driver has null for all performance fields', () => {
    const runs = [
      makeRun({ driver_name: 'DQdriver', round: 'Q1', ft1320: 3.700, mph1320: 330.0, dq_flag: true }),
    ];
    const sheet = buildQualSheet(runs);
    expect(sheet[0].best_et).toBeNull();
    expect(sheet[0].best_mph).toBeNull();
    expect(sheet[0].best_rt).toBeNull();
    expect(sheet[0].best_ft60).toBeNull();
    expect(sheet[0].best_ft660).toBeNull();
    expect(sheet[0].best_timestamp).toBeNull();
  });

  it('run_count includes DQ runs in total', () => {
    const runs = [
      makeRun({ driver_name: 'A', round: 'Q1', ft1320: 3.700, mph1320: 330.0, dq_flag: true }),
      makeRun({ driver_name: 'A', round: 'Q2', ft1320: 3.800, mph1320: 325.0, dq_flag: false }),
      makeRun({ driver_name: 'A', round: 'Q3', ft1320: 3.750, mph1320: 328.0, dq_flag: false }),
    ];
    const sheet = buildQualSheet(runs);
    expect(sheet[0].run_count).toBe(3);
  });
});

// ── 6. Integration: Mixed Qualifying + Elimination ───────────────────────

describe('buildQualSheet — qualifying-only filter integration', () => {
  it('elimination rounds are completely ignored even if they have better ETs', () => {
    const runs = [
      makeRun({ driver_name: 'A', round: 'Q1', ft1320: 3.800, mph1320: 325.0 }),
      makeRun({ driver_name: 'A', round: 'E1', ft1320: 3.500, mph1320: 340.0 }),
      makeRun({ driver_name: 'B', round: 'Q1', ft1320: 3.750, mph1320: 328.0 }),
      makeRun({ driver_name: 'B', round: 'E1', ft1320: 3.600, mph1320: 335.0 }),
    ];
    const sheet = buildQualSheet(runs);
    expect(sheet).toHaveLength(2);
    // B is faster in qualifying, A is slower
    expect(sheet[0].driver).toBe('B');
    expect(sheet[0].best_et).toBe(3.750);
    expect(sheet[1].driver).toBe('A');
    expect(sheet[1].best_et).toBe(3.800);
  });

  it('driver with only elimination runs does not appear on sheet', () => {
    const runs = [
      makeRun({ driver_name: 'QualDriver', round: 'Q1', ft1320: 3.800, mph1320: 325.0 }),
      makeRun({ driver_name: 'ElimOnly', round: 'E1', ft1320: 3.700, mph1320: 330.0 }),
    ];
    const sheet = buildQualSheet(runs);
    expect(sheet).toHaveLength(1);
    expect(sheet[0].driver).toBe('QualDriver');
  });

  it('empty input returns empty sheet', () => {
    expect(buildQualSheet([])).toEqual([]);
  });

  it('single driver with single valid run gets position 1', () => {
    const runs = [
      makeRun({ driver_name: 'Solo', round: 'Q1', ft1320: 3.800, mph1320: 325.0 }),
    ];
    const sheet = buildQualSheet(runs);
    expect(sheet).toHaveLength(1);
    expect(sheet[0].qual_pos).toBe(1);
    expect(sheet[0].is_valid).toBe(true);
  });
});

// ── 7. Edge Cases ────────────────────────────────────────────────────────

describe('buildQualSheet — edge cases', () => {
  it('driver with one DQ and one null-ET qualifying run → invalid', () => {
    const runs = [
      makeRun({ driver_name: 'A', round: 'Q1', ft1320: 3.700, dq_flag: true }),
      makeRun({ driver_name: 'A', round: 'Q2', ft1320: null, dq_flag: false }),
    ];
    const sheet = buildQualSheet(runs);
    expect(sheet[0].is_valid).toBe(false);
    expect(sheet[0].best_et).toBeNull();
  });

  it('16-driver field is numbered 1-16 with correct ordering', () => {
    const runs: QualRun[] = [];
    for (let i = 1; i <= 16; i++) {
      runs.push(makeRun({
        driver_name: `Driver${i}`,
        round: 'Q1',
        ft1320: 3.500 + i * 0.02,
        mph1320: 340 - i,
        run_timestamp_utc: `2025-10-30T${String(10 + i).padStart(2, '0')}:00:00Z`,
      }));
    }
    const sheet = buildQualSheet(runs);
    expect(sheet).toHaveLength(16);
    // Driver1 has best ET (3.520), Driver16 has worst (3.820)
    expect(sheet[0].driver).toBe('Driver1');
    expect(sheet[0].qual_pos).toBe(1);
    expect(sheet[15].driver).toBe('Driver16');
    expect(sheet[15].qual_pos).toBe(16);
    // Every driver is valid
    expect(sheet.every(s => s.is_valid)).toBe(true);
  });

  it('driver with negative ET is skipped (treated as invalid)', () => {
    const runs = [
      makeRun({ driver_name: 'A', round: 'Q1', ft1320: -1.0, mph1320: 325.0, dq_flag: false }),
    ];
    const sheet = buildQualSheet(runs);
    expect(sheet[0].is_valid).toBe(false);
  });

  it('multiple Q rounds for same driver — best across all rounds chosen', () => {
    const runs = [
      makeRun({ driver_name: 'A', round: 'Q1', ft1320: 3.900, mph1320: 320.0 }),
      makeRun({ driver_name: 'A', round: 'Q2', ft1320: 3.850, mph1320: 322.0 }),
      makeRun({ driver_name: 'A', round: 'Q3', ft1320: 3.800, mph1320: 325.0 }),
      makeRun({ driver_name: 'A', round: 'Q4', ft1320: 3.820, mph1320: 323.0 }),
    ];
    const sheet = buildQualSheet(runs);
    expect(sheet[0].best_et).toBe(3.800);
    expect(sheet[0].best_mph).toBe(325.0);
    expect(sheet[0].run_count).toBe(4);
  });
});
