/**
 * Baseline management for trend-based parity checks.
 * 
 * When PARITY_TREND=1, tests assert that current deltas don't exceed
 * baseline deltas by more than a small epsilon.
 * 
 * When PARITY_UPDATE_BASELINE=1, tests update the baseline file with
 * current deltas.
 * 
 * Note: Uses static baseline data imported at build time.
 * For updating baselines, run with PARITY_UPDATE_BASELINE=1 and
 * copy the console output to parity.baseline.json.
 */

// Import baseline data statically
import baselineData from './parity.baseline.json';

/**
 * Baseline entry for a single fixture.
 */
export interface BaselineEntry {
  etDelta: number;
  mphDelta: number;
}

/**
 * Full baseline file structure.
 */
export interface BaselineFile {
  _comment?: string;
  _updated?: string;
  fixtures: Record<string, BaselineEntry>;
}

// In-memory baseline (starts with imported data, can be updated in-memory)
let baselineCache: BaselineFile = baselineData as BaselineFile;

/**
 * Small epsilon for trend comparisons.
 * Allows for minor floating-point variations.
 */
export const TREND_EPSILON = {
  et_s: 0.005,  // 5ms tolerance for trend
  mph: 0.1,     // 0.1 mph tolerance for trend
};

/**
 * Get environment variable safely (works in Node and browser).
 */
function getEnv(key: string): string | undefined {
  try {
    // Vitest injects import.meta.env
    if (typeof import.meta !== 'undefined' && (import.meta as any).env) {
      return (import.meta as any).env[key];
    }
  } catch { /* ignore */ }
  return undefined;
}

/**
 * Check if trend mode is enabled.
 */
export function isTrendMode(): boolean {
  return getEnv('VITE_PARITY_TREND') === '1' || getEnv('PARITY_TREND') === '1';
}

/**
 * Check if baseline update mode is enabled.
 */
export function isUpdateBaselineMode(): boolean {
  return getEnv('VITE_PARITY_UPDATE_BASELINE') === '1' || getEnv('PARITY_UPDATE_BASELINE') === '1';
}

/**
 * Load the baseline (from cache).
 */
export function loadBaseline(): BaselineFile {
  return baselineCache;
}

/**
 * Save the baseline (in-memory only, logs for manual update).
 */
export function saveBaseline(baseline: BaselineFile): void {
  baseline._updated = new Date().toISOString();
  baselineCache = baseline;
  // Log JSON for manual copy to parity.baseline.json
  console.log('[PARITY] Updated baseline (copy to parity.baseline.json):');
  console.log(JSON.stringify(baseline, null, 2));
}

/**
 * Get baseline entry for a fixture.
 * Returns null if no baseline exists.
 */
export function getBaselineEntry(fixtureName: string): BaselineEntry | null {
  const baseline = loadBaseline();
  return baseline.fixtures[fixtureName] ?? null;
}

/**
 * Update baseline entry for a fixture.
 */
export function updateBaselineEntry(fixtureName: string, entry: BaselineEntry): void {
  const baseline = loadBaseline();
  baseline.fixtures[fixtureName] = entry;
  saveBaseline(baseline);
}

/**
 * Check if current deltas are within trend tolerance of baseline.
 * Returns { ok: true } if within tolerance, or { ok: false, reason: string } if not.
 */
export function checkTrend(
  fixtureName: string,
  currentEtDelta: number,
  currentMphDelta: number
): { ok: boolean; reason?: string } {
  const baselineEntry = getBaselineEntry(fixtureName);
  
  if (!baselineEntry) {
    // No baseline exists - pass but warn
    console.warn(`[PARITY] No baseline for ${fixtureName}, skipping trend check`);
    return { ok: true };
  }

  const etDiff = Math.abs(currentEtDelta) - Math.abs(baselineEntry.etDelta);
  const mphDiff = Math.abs(currentMphDelta) - Math.abs(baselineEntry.mphDelta);

  const etOk = etDiff <= TREND_EPSILON.et_s;
  const mphOk = mphDiff <= TREND_EPSILON.mph;

  if (!etOk || !mphOk) {
    const reasons: string[] = [];
    if (!etOk) {
      reasons.push(`ET delta grew: |${currentEtDelta.toFixed(4)}| vs baseline |${baselineEntry.etDelta.toFixed(4)}| (+${etDiff.toFixed(4)}s)`);
    }
    if (!mphOk) {
      reasons.push(`MPH delta grew: |${currentMphDelta.toFixed(2)}| vs baseline |${baselineEntry.mphDelta.toFixed(2)}| (+${mphDiff.toFixed(2)})`);
    }
    return { ok: false, reason: reasons.join('; ') };
  }

  return { ok: true };
}

/**
 * Perform trend-based assertion or update baseline.
 * Call this after running a parity test.
 * 
 * @param fixtureName - Name of the fixture
 * @param etDelta - Current ET delta (sim - vb6)
 * @param mphDelta - Current MPH delta (sim - vb6)
 * @param assertFn - Assertion function (e.g., expect from vitest)
 */
export function assertOrUpdateTrend(
  fixtureName: string,
  etDelta: number,
  mphDelta: number,
  assertFn?: (condition: boolean, message?: string) => void
): void {
  if (isUpdateBaselineMode()) {
    // Update baseline with current values
    updateBaselineEntry(fixtureName, { etDelta, mphDelta });
    console.log(`[PARITY] Updated baseline for ${fixtureName}: ET=${etDelta.toFixed(4)}s, MPH=${mphDelta.toFixed(2)}`);
    return;
  }

  if (isTrendMode()) {
    // Check trend against baseline
    const result = checkTrend(fixtureName, etDelta, mphDelta);
    if (!result.ok && assertFn) {
      assertFn(false, `Trend regression for ${fixtureName}: ${result.reason}`);
    }
  }
}
