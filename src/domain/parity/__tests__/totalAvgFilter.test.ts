/**
 * Tests for Total Average outlier filter.
 * Mirrors PHP parity.php logic: include only runs within X% of quickest per combo.
 */
import { describe, it, expect } from 'vitest';
import {
  computeFilteredTotalAvg,
  TOTAL_AVG_WITHIN_PCT_OF_QUICKEST,
} from '../totalAvgFilter';

describe('computeFilteredTotalAvg', () => {
  it('constant is 2%', () => {
    expect(TOTAL_AVG_WITHIN_PCT_OF_QUICKEST).toBe(0.02);
  });

  // ─── ET (lower-is-better) ─────────────────────────────────────────

  it('ET: includes all runs within 2% of quickest', () => {
    // Best = 3.700, cutoff = 3.700 * 1.02 = 3.774
    const values = [3.700, 3.720, 3.750, 3.770, 3.800, 4.100];
    const result = computeFilteredTotalAvg(values, true);

    // 3.700, 3.720, 3.750, 3.770 are ≤ 3.774 → included
    // 3.800, 4.100 are > 3.774 → excluded
    expect(result.countTotalAvg).toBe(4);
    expect(result.totalAvg).toBeCloseTo((3.700 + 3.720 + 3.750 + 3.770) / 4, 4);
  });

  it('ET: excludes obvious outlier (aborted run)', () => {
    // An aborted run at 9.999 should be excluded
    const values = [3.700, 3.710, 3.720, 9.999];
    const result = computeFilteredTotalAvg(values, true);

    expect(result.countTotalAvg).toBe(3);
    expect(result.totalAvg).toBeCloseTo((3.700 + 3.710 + 3.720) / 3, 4);
  });

  it('ET: all runs within threshold → all included', () => {
    const values = [3.700, 3.710, 3.720];
    const result = computeFilteredTotalAvg(values, true);

    expect(result.countTotalAvg).toBe(3);
    expect(result.totalAvg).toBeCloseTo((3.700 + 3.710 + 3.720) / 3, 4);
  });

  it('ET: single run → returns that value', () => {
    const result = computeFilteredTotalAvg([3.700], true);
    expect(result.countTotalAvg).toBe(1);
    expect(result.totalAvg).toBe(3.7);
  });

  it('ET: empty values → null', () => {
    const result = computeFilteredTotalAvg([], true);
    expect(result.countTotalAvg).toBe(0);
    expect(result.totalAvg).toBeNull();
  });

  // ─── MPH (higher-is-better) ───────────────────────────────────────

  it('MPH: includes runs within 2% of fastest (highest)', () => {
    // Best = 335.0 (highest), cutoff = 335.0 * 0.98 = 328.3
    const values = [335.0, 333.0, 330.0, 328.5, 325.0, 290.0];
    const result = computeFilteredTotalAvg(values, false);

    // 335.0, 333.0, 330.0, 328.5 are ≥ 328.3 → included
    // 325.0, 290.0 are < 328.3 → excluded
    expect(result.countTotalAvg).toBe(4);
    expect(result.totalAvg).toBeCloseTo((335.0 + 333.0 + 330.0 + 328.5) / 4, 4);
  });

  it('MPH: excludes slow outlier run', () => {
    const values = [335.0, 334.0, 333.0, 100.0]; // 100 is a failed run
    const result = computeFilteredTotalAvg(values, false);

    expect(result.countTotalAvg).toBe(3);
    expect(result.totalAvg).toBeCloseTo((335.0 + 334.0 + 333.0) / 3, 4);
  });

  // ─── Custom percentage ────────────────────────────────────────────

  it('respects custom withinPct parameter', () => {
    // Best = 3.700, with 5% cutoff = 3.700 * 1.05 = 3.885
    const values = [3.700, 3.750, 3.800, 3.850, 3.900, 4.100];
    const result = computeFilteredTotalAvg(values, true, 0.05);

    // 3.700, 3.750, 3.800, 3.850 are ≤ 3.885 → included
    expect(result.countTotalAvg).toBe(4);
    expect(result.totalAvg).toBeCloseTo((3.700 + 3.750 + 3.800 + 3.850) / 4, 4);
  });
});
