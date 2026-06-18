/**
 * DENSITY Run Data Analysis — Sensitivity Calculator
 *
 * Mirrors the "Run Data Analysis" screen in RSA's DENSITY program (Patrick Hale).
 * For each weather variable (and vehicle weight / HP correction factor), it
 * computes the INDEPENDENT effect of a one-variable change on ET and MPH,
 * holding all other variables constant.
 *
 * This is NOT the same as the two-step main prediction:
 *   Main: baseline actual → RSA Standard Day → target weather (full path)
 *   Sensitivity: "what happens if THIS one variable changes by X, all else equal?"
 *
 * ─── Math sources ─────────────────────────────────────────────────────────────
 * Weather variables (T, RH, Baro, Elevation):
 *   Use RSA HPC ratio: ΔET = ET_base × ((hpc_new / hpc_base)^(1/3) - 1)
 *   Source: QTRPERF.BAS Weather() by Patrick Hale.
 *
 * HP Correction Factor row:
 *   Direct HPC ratio: treat hpc_base ± Δhpc as the new correction factor.
 *   ΔET = ET_base × ((hpc_base + Δhpc) / hpc_base)^(1/3) - ET_base
 *
 * Vehicle Weight row:
 *   From Patrick Hale's ET formula: ET = A + B × (W / HP_eff)^(1/3)
 *   Where A = DENSITY_ET_INTERCEPT (1.825 for 1/4 mile)
 *   When W → W + ΔW:
 *     ΔET = (ET_base - A) × ((1 + ΔW/W)^(1/3) - 1)
 *   Source: TIMESLIP.FRM line 882, QTRPERF.BAS.
 *
 * MPH sensitivity (when baseMPH is provided):
 *   From MPH × (ET - A) = C × B (constant, from Hale's dual-formula):
 *     dMPH/dET = -MPH / (ET - A)
 *     ΔMPH ≈ -(baseMPH / (baseET - A)) × ΔET
 *
 * ─── DENSITY screenshot calibration ──────────────────────────────────────────
 * The DENSITY Run Data Analysis screenshot (reference) shows these values
 * at approximately ET_base ≈ 5.3 s, MPH_base ≈ 87.5, W ≈ 1460 lb, standard day:
 *   Barometer −0.10 inHg → ET +0.007, MPH −0.18
 *   Temperature +10.0°F → ET +0.023, MPH −0.57
 *   Humidity +10.0%    → ET +0.005, MPH −0.12   (RSA formula gives ≈ 0.004)
 *   HPC +0.010         → ET +0.018, MPH −0.45
 *   Weight +20 lb      → ET +0.016, MPH −0.40
 * Our implementation matches within ±0.003 s / ±0.10 MPH for all rows.
 */

import { computeRsaHpc } from './weatherImpact';
import type { WeatherInput } from './runCorrection';
import type { FuelType } from './runCorrection';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

/**
 * ET formula intercept from Patrick Hale's 1/4-mile DENSITY formula:
 *   ET = DENSITY_ET_INTERCEPT + B × (W / HP_eff)^(1/3)
 * Source: TIMESLIP.FRM — 1.8 in formula, 1.825 commonly used for 1/4 mile.
 * Used only for weight and MPH sensitivity rows.
 */
export const DENSITY_ET_INTERCEPT = 1.825;

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

/** Editable "change" amounts for each sensitivity row. */
export interface SensitivityConfig {
  /** Change in barometer (inHg). Default: −0.10 (lower = worse air). */
  barometerChangeInHg: number;
  /** Change in temperature (°F). Default: +10.0 (hotter = worse). */
  temperatureChangeF: number;
  /** Change in relative humidity (%). Default: +10.0 (more humid = worse). */
  humidityChangePct: number;
  /** Change in RSA HP Correction Factor. Default: +0.010 (higher = worse). */
  hpCorrectionFactorChange: number;
  /** Change in vehicle weight (lb). Default: +20 (heavier = worse). */
  weightChangeLb: number;
}

export const DEFAULT_SENSITIVITY_CONFIG: SensitivityConfig = {
  barometerChangeInHg: -0.10,
  temperatureChangeF: +10.0,
  humidityChangePct: +10.0,
  hpCorrectionFactorChange: +0.010,
  weightChangeLb: +20,
};

/** One row in the sensitivity table (one variable, held-others-constant). */
export interface SensitivityRow {
  /** Human-readable variable name. */
  variable: string;
  /** Unit for base value and change. */
  unit: string;
  /** The current (base) value of this variable. */
  baseValue: number;
  /** The change applied (+/−). */
  change: number;
  /**
   * Predicted ET change for this variable alone (seconds).
   * Positive = slower, negative = faster.
   */
  predictedETChange: number;
  /**
   * Predicted MPH change for this variable alone (mph).
   * Null when no baseMPH was supplied.
   */
  predictedMPHChange: number | null;
}

/** Full sensitivity result containing base values and all five rows. */
export interface SensitivityResult {
  /** RSA HPC at the base weather conditions. */
  baseHpc: number;
  /** Editable "change" values used to compute the rows. */
  config: SensitivityConfig;
  /** The five DENSITY-style rows. */
  rows: SensitivityRow[];
  /** True when weight row was calculated (baseWeightLb was supplied). */
  hasWeightRow: boolean;
  /** True when MPH changes are populated (baseMPH was supplied). */
  hasMPH: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Core function
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Compute DENSITY-style per-variable sensitivity rows.
 *
 * @param baseWeather  Current/baseline weather conditions.
 * @param baseET       Baseline ET (seconds). Must be > DENSITY_ET_INTERCEPT for weight/MPH rows.
 * @param config       Change amounts (defaults match DENSITY screenshot values).
 * @param options.fuelType      'gasoline' (default) or 'alcohol'.
 * @param options.baseMPH       Trap speed at baseET — enables MPH sensitivity column.
 * @param options.baseWeightLb  Vehicle weight at baseline — enables weight sensitivity row.
 */
export function computeSensitivities(
  baseWeather: WeatherInput,
  baseET: number,
  config: SensitivityConfig = DEFAULT_SENSITIVITY_CONFIG,
  options: {
    fuelType?: FuelType;
    baseMPH?: number;
    baseWeightLb?: number;
  } = {}
): SensitivityResult {
  const fuelType = options.fuelType ?? 'gasoline';
  const baseMPH = options.baseMPH;
  const baseWeightLb = options.baseWeightLb;

  const baro = baseWeather.barometerInHg;
  const temp = baseWeather.temperatureF;
  const hum  = baseWeather.humidityPct;

  const hpcBase = computeRsaHpc(baseWeather, fuelType);

  // ── MPH derivative: dMPH/dET = -baseMPH / (baseET - DENSITY_ET_INTERCEPT) ─
  // Valid only when baseET > DENSITY_ET_INTERCEPT (guard below).
  const etOverIntercept = baseET - DENSITY_ET_INTERCEPT;
  const mphSensitivity = (baseMPH !== undefined && etOverIntercept > 0)
    ? -(baseMPH / etOverIntercept)
    : null;

  function etDelta(hpcNew: number): number {
    return baseET * (Math.pow(hpcNew / hpcBase, 1 / 3) - 1);
  }

  function mphDelta(deltaET: number): number | null {
    return mphSensitivity !== null ? mphSensitivity * deltaET : null;
  }

  // ── Row: Barometer ─────────────────────────────────────────────────────────
  const hpcBaro = computeRsaHpc(
    { ...baseWeather, barometerInHg: baro + config.barometerChangeInHg },
    fuelType
  );
  const dET_baro = etDelta(hpcBaro);

  // ── Row: Temperature ───────────────────────────────────────────────────────
  const hpcTemp = computeRsaHpc(
    { ...baseWeather, temperatureF: temp + config.temperatureChangeF },
    fuelType
  );
  const dET_temp = etDelta(hpcTemp);

  // ── Row: Humidity ──────────────────────────────────────────────────────────
  const hpcHum = computeRsaHpc(
    { ...baseWeather, humidityPct: Math.min(100, hum + config.humidityChangePct) },
    fuelType
  );
  const dET_hum = etDelta(hpcHum);

  // ── Row: HP Correction Factor ──────────────────────────────────────────────
  // Treat hpc as a direct independent variable.
  const hpcNew = hpcBase + config.hpCorrectionFactorChange;
  const dET_hpc = baseET * (Math.pow(hpcNew / hpcBase, 1 / 3) - 1);

  // ── Row: Vehicle Weight ────────────────────────────────────────────────────
  // Uses ΔET = (ET - A) × ((1 + ΔW/W)^(1/3) - 1)  from the Hale ET formula.
  let dET_weight: number | null = null;
  if (baseWeightLb !== undefined && baseWeightLb > 0 && etOverIntercept > 0) {
    const wRatio = 1 + config.weightChangeLb / baseWeightLb;
    dET_weight = etOverIntercept * (Math.pow(wRatio, 1 / 3) - 1);
  }

  // ── Assemble rows ─────────────────────────────────────────────────────────
  const rows: SensitivityRow[] = [
    {
      variable: 'Barometer',
      unit: 'inHg',
      baseValue: round3(baro),
      change: config.barometerChangeInHg,
      predictedETChange: round3(dET_baro),
      predictedMPHChange: mphDelta(dET_baro) !== null ? round2(mphDelta(dET_baro)!) : null,
    },
    {
      variable: 'Temperature',
      unit: '°F',
      baseValue: round1(temp),
      change: config.temperatureChangeF,
      predictedETChange: round3(dET_temp),
      predictedMPHChange: mphDelta(dET_temp) !== null ? round2(mphDelta(dET_temp)!) : null,
    },
    {
      variable: 'Humidity',
      unit: '%',
      baseValue: round1(hum),
      change: config.humidityChangePct,
      predictedETChange: round3(dET_hum),
      predictedMPHChange: mphDelta(dET_hum) !== null ? round2(mphDelta(dET_hum)!) : null,
    },
    {
      variable: 'HP Correction Factor',
      unit: '',
      baseValue: round4(hpcBase),
      change: config.hpCorrectionFactorChange,
      predictedETChange: round3(dET_hpc),
      predictedMPHChange: mphDelta(dET_hpc) !== null ? round2(mphDelta(dET_hpc)!) : null,
    },
    {
      variable: 'Vehicle Weight',
      unit: 'lb',
      baseValue: baseWeightLb ?? 0,
      change: config.weightChangeLb,
      predictedETChange: dET_weight !== null ? round3(dET_weight) : 0,
      predictedMPHChange: (dET_weight !== null && mphDelta(dET_weight) !== null)
        ? round2(mphDelta(dET_weight)!)
        : null,
    },
  ];

  return {
    baseHpc: round4(hpcBase),
    config,
    rows,
    hasWeightRow: baseWeightLb !== undefined,
    hasMPH: baseMPH !== undefined,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function round1(n: number): number { return Math.round(n * 10) / 10; }
function round2(n: number): number { return Math.round(n * 100) / 100; }
function round3(n: number): number { return Math.round(n * 1000) / 1000; }
function round4(n: number): number { return Math.round(n * 10000) / 10000; }

/** Elevation-aware helper re-exported so UI can reference standard constants. */
export { type WeatherInput };
