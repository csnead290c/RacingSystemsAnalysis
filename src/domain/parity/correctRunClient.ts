/**
 * correctRunClient — Client-side run correction using the authoritative HPC pipeline.
 *
 * This is the SINGLE source of truth for all "Corrected ET" / "Corrected MPH" values
 * shown anywhere in the Parity Suite. It uses the same functions as the Weather
 * Correction Preview panel:
 *
 *   correctET(et, hpc)  = et × hpc^(-0.33)
 *   correctMPH(mph, hpc) = mph × hpc^(0.33)
 *
 * where HPC = computeHPC({ engineCombo, tPower, dPower, FF, theta, delta })
 *
 * NEVER use the backend fields `corrected_ft1320`, `corrected_ft660`, `corrected_ft60`,
 * or `correction_factor` for display — those use a WRONG simple CF formula (ET × CF).
 */

import {
  computeWeather,
  computeHPC,
  applyN2OBlendToHpc,
  correctET,
  correctMPH,
  pct_to_frac,
  resolveEngineCombo,
  type ApiDriverComboRow,
  type ClassDefaultComboRow,
  type ResolvedCombo,
} from './weatherCorrection';
import type { EngineComboRow } from '../../services/parityApi';

// ── Input / Output types ────────────────────────────────────────────────

export interface CorrectionContext {
  engineCombos: EngineComboRow[];
  driverCombos: ApiDriverComboRow[];
  classDefaults: ClassDefaultComboRow[];
}

export interface RunWeather {
  temp_f: number | null;
  rh_pct: number | null;
  pressure_inhg: number | null;
}

export interface RunForCorrection {
  driver_name: string | null;
  class_index: string | null;
  run_timestamp_utc: string | null;
  ft1320?: number | null;
  ft660?: number | null;
  ft60?: number | null;
  mph1320?: number | null;
  weather?: RunWeather | null;
}

export interface CorrectedRunResult {
  hpc: number | null;
  isN2OBlended: boolean;
  correctedET: number | null;
  correctedMPH: number | null;
  corrected60: number | null;
  corrected660: number | null;
  comboResolution: ResolvedCombo | null;
}

// ── Core correction function ────────────────────────────────────────────

/**
 * Compute corrected ET/MPH for a single run using the authoritative HPC pipeline.
 *
 * Returns null values when:
 * - Weather data is missing
 * - No engine combo can be resolved for the driver/class/timestamp
 * - HPC is invalid (0 or non-finite)
 */
export function correctRunClientSide(
  run: RunForCorrection,
  ctx: CorrectionContext,
): CorrectedRunResult {
  const NULL_RESULT: CorrectedRunResult = {
    hpc: null, isN2OBlended: false, correctedET: null, correctedMPH: null,
    corrected60: null, corrected660: null, comboResolution: null,
  };

  // 1) Need weather
  if (!run.weather || run.weather.temp_f == null || run.weather.pressure_inhg == null) {
    return NULL_RESULT;
  }

  // 2) Need driver/class/timestamp for combo resolution
  if (!run.driver_name || !run.class_index || !run.run_timestamp_utc) {
    return NULL_RESULT;
  }

  // 3) Resolve engine combo
  const resolution = resolveEngineCombo({
    driverName: run.driver_name,
    classIndex: run.class_index,
    runTimestampUtc: run.run_timestamp_utc,
    driverCombos: ctx.driverCombos,
    classDefaults: ctx.classDefaults,
  });

  if (resolution.source === 'none' || resolution.engineComboId == null) {
    return { ...NULL_RESULT, comboResolution: resolution };
  }

  // 4) Find the engine combo parameters
  const combo = ctx.engineCombos.find(c => c.id === resolution.engineComboId);
  if (!combo) {
    return { ...NULL_RESULT, comboResolution: resolution };
  }

  // 5) Compute weather values
  const T = run.weather.temp_f;
  const H = pct_to_frac(run.weather.rh_pct ?? 0);
  const BP = run.weather.pressure_inhg;
  const w = computeWeather(T, H, BP);

  // 6) Compute HPC
  const rawHpc = computeHPC({
    engineCombo: combo.name,
    tPower: combo.t_power,
    dPower: combo.d_power,
    FF: combo.friction_factor,
    theta: w.theta,
    delta: w.delta,
  });

  if (rawHpc === 0 || !isFinite(rawHpc)) {
    return { ...NULL_RESULT, hpc: 0, comboResolution: resolution };
  }

  // 7) Apply N2O blend if enabled
  // For large nitrous combinations, assume roughly 50% of total power is from
  // the base gasoline engine and 50% is nitrous-assisted power. The nitrous-
  // assisted portion is treated as approximately weather-independent, so only
  // half of the gasoline weather correction is applied.
  const isN2OBlended = !!combo.uses_n2o;
  const hpc = isN2OBlended ? applyN2OBlendToHpc(rawHpc) : rawHpc;

  // 8) Apply corrections
  return {
    hpc,
    isN2OBlended,
    correctedET: run.ft1320 != null ? correctET(run.ft1320, hpc) : null,
    correctedMPH: run.mph1320 != null ? correctMPH(run.mph1320, hpc) : null,
    corrected60: run.ft60 != null ? correctET(run.ft60, hpc) : null,
    corrected660: run.ft660 != null ? correctET(run.ft660, hpc) : null,
    comboResolution: resolution,
  };
}

// ── Batch helper ────────────────────────────────────────────────────────

/**
 * Correct an array of runs, returning a Map keyed by a caller-supplied ID extractor.
 * This avoids O(n²) lookups when updating tables.
 */
export function correctRunsBatch<T extends RunForCorrection>(
  runs: T[],
  ctx: CorrectionContext,
  getId: (run: T) => number | string,
): Map<number | string, CorrectedRunResult> {
  const results = new Map<number | string, CorrectedRunResult>();
  for (const run of runs) {
    results.set(getId(run), correctRunClientSide(run, ctx));
  }
  return results;
}
