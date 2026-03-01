/**
 * Pure functions implementing NHRA qualifying sheet logic.
 * Mirrors the backend (api/parity.php handleQualSheet) for testability.
 *
 * Rules:
 *  1. Only qualifying rounds (round starts with "Q") are considered.
 *  2. DQ invalidates the entire run — never used for best-run selection.
 *  3. Per-driver best run: lowest ET → higher MPH (same run) → earliest local timestamp.
 *  4. Drivers with no valid qualifying run appear at bottom as invalid.
 *  5. Final sort: ET asc → MPH desc → local timestamp asc.
 *  6. MPH displayed is always from the selected best run.
 *
 * TIMESTAMP MODEL: NHRA timing system reports event-local wall-clock time.
 * run_time_local is the canonical chronological ordering field.
 * run_timestamp_utc is derived (local→UTC via track timezone) for weather joins only.
 */

// ── Types ─────────────────────────────────────────────────────────────────

export interface QualRun {
  id: number;
  driver_name: string;
  round: string | null;
  ft1320: number | null;
  mph1320: number | null;
  rt: number | null;
  ft60: number | null;
  ft660: number | null;
  /** Event-local wall-clock time. Preferred for tie-breaking and display. */
  run_time_local: string | null;
  /** Derived UTC (for weather joins). Legacy: may equal local if not yet backfilled. */
  run_timestamp_utc: string | null;
  dq_flag: boolean;
  car_number?: string | null;
}

export interface QualSheetEntry {
  driver: string;
  car_number: string | null;
  best_et: number | null;
  best_mph: number | null;
  best_rt: number | null;
  best_ft60: number | null;
  best_ft660: number | null;
  best_timestamp: string | null;
  run_count: number;
  is_valid: boolean;
  qual_pos: number | null;
}

// ── Pure helpers ──────────────────────────────────────────────────────────

/** Filter to qualifying rounds only (round starts with 'Q') */
export function filterQualifyingRuns(runs: QualRun[]): QualRun[] {
  return runs.filter(r => r.round != null && r.round.toUpperCase().startsWith('Q'));
}

/**
 * Select the best qualifying run for a single driver.
 * Input: all qualifying runs for one driver (already filtered to Q-rounds).
 * Returns null if no valid run exists.
 *
 * NHRA tiebreakers:
 *  1. Lowest ET (ft1320)
 *  2. Higher MPH from the same run (mph1320 desc)
 *  3. Earliest local timestamp (run_time_local asc)
 */
export function selectBestRun(qualRuns: QualRun[]): QualRun | null {
  // Filter out DQ and runs with no valid ET
  const valid = qualRuns.filter(r => !r.dq_flag && r.ft1320 != null && r.ft1320 > 0);
  if (valid.length === 0) return null;

  // Sort by NHRA tiebreaker rules
  valid.sort((a, b) => {
    // (1) Lowest ET first
    const etCmp = a.ft1320! - b.ft1320!;
    if (etCmp !== 0) return etCmp;
    // (2) Higher MPH (descending)
    const mphA = a.mph1320 ?? 0;
    const mphB = b.mph1320 ?? 0;
    const mphCmp = mphB - mphA;
    if (mphCmp !== 0) return mphCmp;
    // (3) Earliest LOCAL timestamp (who ran first at the track)
    const tsA = a.run_time_local ?? a.run_timestamp_utc ?? '';
    const tsB = b.run_time_local ?? b.run_timestamp_utc ?? '';
    return tsA.localeCompare(tsB);
  });

  return valid[0];
}

/**
 * Build the full qualifying sheet from raw runs.
 * This is the pure-function equivalent of handleQualSheet in parity.php.
 */
export function buildQualSheet(allRuns: QualRun[]): QualSheetEntry[] {
  // Step 1: filter to qualifying rounds only
  const qualRuns = filterQualifyingRuns(allRuns);

  // Step 2: group by driver
  const byDriver = new Map<string, { runs: QualRun[]; totalRuns: number; carNumber: string | null }>();
  for (const r of qualRuns) {
    const driver = r.driver_name ?? '(unknown)';
    if (!byDriver.has(driver)) {
      byDriver.set(driver, { runs: [], totalRuns: 0, carNumber: r.car_number ?? null });
    }
    const entry = byDriver.get(driver)!;
    entry.totalRuns++;
    entry.runs.push(r);
  }

  // Step 3: select best run per driver, split into valid/invalid
  const validEntries: QualSheetEntry[] = [];
  const invalidEntries: QualSheetEntry[] = [];

  for (const [driver, data] of byDriver) {
    const best = selectBestRun(data.runs);
    if (best) {
      validEntries.push({
        driver,
        car_number: data.carNumber,
        best_et: best.ft1320,
        best_mph: best.mph1320,
        best_rt: best.rt,
        best_ft60: best.ft60,
        best_ft660: best.ft660,
        best_timestamp: best.run_time_local ?? best.run_timestamp_utc,
        run_count: data.totalRuns,
        is_valid: true,
        qual_pos: null, // set below
      });
    } else {
      invalidEntries.push({
        driver,
        car_number: data.carNumber,
        best_et: null,
        best_mph: null,
        best_rt: null,
        best_ft60: null,
        best_ft660: null,
        best_timestamp: null,
        run_count: data.totalRuns,
        is_valid: false,
        qual_pos: null,
      });
    }
  }

  // Step 4: sort valid drivers by NHRA rules: ET asc, MPH desc, timestamp asc
  validEntries.sort((a, b) => {
    const etCmp = (a.best_et ?? 999) - (b.best_et ?? 999);
    if (etCmp !== 0) return etCmp;
    const mphCmp = (b.best_mph ?? 0) - (a.best_mph ?? 0);
    if (mphCmp !== 0) return mphCmp;
    return (a.best_timestamp ?? '').localeCompare(b.best_timestamp ?? '');
  });

  // Step 5: assign positions and combine
  let pos = 1;
  for (const entry of validEntries) {
    entry.qual_pos = pos++;
  }

  return [...validEntries, ...invalidEntries];
}
