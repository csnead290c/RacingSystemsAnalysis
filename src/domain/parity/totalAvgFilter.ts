/**
 * Total Average outlier filter for parity combo aggregates.
 *
 * Mirrors the PHP logic in parity.php exactly:
 *   - Given sorted active values (best first) for a combo,
 *     include only runs within TOTAL_AVG_WITHIN_PCT of the quickest.
 *   - For ET (lower-is-better): include values ≤ best × (1 + pct)
 *   - For MPH (higher-is-better): include values ≥ best × (1 - pct)
 *
 * Constant is easy to tune — just change the default.
 */

/** Default outlier threshold: 2% of quickest run value */
export const TOTAL_AVG_WITHIN_PCT_OF_QUICKEST = 0.02;

export interface TotalAvgResult {
  totalAvg: number | null;
  countTotalAvg: number;
}

/**
 * Compute outlier-filtered Total Average.
 *
 * @param sortedValues  Active run values sorted best-first (ascending for ET, descending for MPH)
 * @param isLowerBetter true for ET metrics, false for MPH metrics
 * @param withinPct     fraction (default 0.02 = 2%)
 */
export function computeFilteredTotalAvg(
  sortedValues: number[],
  isLowerBetter: boolean,
  withinPct: number = TOTAL_AVG_WITHIN_PCT_OF_QUICKEST,
): TotalAvgResult {
  if (sortedValues.length === 0) {
    return { totalAvg: null, countTotalAvg: 0 };
  }

  const best = sortedValues[0];

  let filtered: number[];
  if (isLowerBetter) {
    const cutoff = best * (1 + withinPct);
    filtered = sortedValues.filter(v => v <= cutoff);
  } else {
    const cutoff = best * (1 - withinPct);
    filtered = sortedValues.filter(v => v >= cutoff);
  }

  if (filtered.length === 0) {
    return { totalAvg: null, countTotalAvg: 0 };
  }

  const sum = filtered.reduce((a, b) => a + b, 0);
  const avg = Math.round((sum / filtered.length) * 10000) / 10000; // 4 decimal places, matching PHP
  return { totalAvg: avg, countTotalAvg: filtered.length };
}
