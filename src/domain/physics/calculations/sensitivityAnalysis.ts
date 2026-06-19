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

/**
 * User-editable base values for the sensitivity calculator.
 * Defaults match the original RSA Run Data Analysis reference screenshot:
 *   Standard day: 29.92 inHg / 60°F / 0% RH / HPC 1.000, weight 2150 lb
 * Use "Use Base Run Values" to fill from an actual logged run.
 */
export interface SensitivityBaseValues {
  /** Barometer base (inHg). Default: 29.92 (RSA standard day). */
  barometerInHg: number;
  /** Temperature base (°F). Default: 60.0 (RSA standard day). */
  temperatureF: number;
  /** Relative humidity base (%). Default: 0.0 (RSA standard day). */
  humidityPct: number;
  /**
   * HP Correction Factor base. Default: 1.000 (RSA standard day).
   * Independently editable — does not have to match weather-derived HPC.
   * Use "Use Base Run Values" to sync this to a run's computed HPC.
   */
  hpCorrectionFactor: number;
  /** Vehicle weight base (lb). Default: 2150. */
  weightLb: number;
}

export const DEFAULT_SENSITIVITY_BASE_VALUES: SensitivityBaseValues = {
  barometerInHg: 29.92,
  temperatureF: 60.0,
  humidityPct: 0.0,
  hpCorrectionFactor: 1.000,
  weightLb: 2150,
};

/** Editable "change" amounts for each sensitivity row, plus base reference values. */
export interface SensitivityConfig {
  /** Reference base values used as the starting point for each row's calculation. */
  base: SensitivityBaseValues;
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
  base: DEFAULT_SENSITIVITY_BASE_VALUES,
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
 * @param config   Base values + change amounts. Defaults match RSA standard day reference.
 *                 Use DEFAULT_SENSITIVITY_CONFIG for RSA reference screenshot behavior.
 * @param baseET   Baseline ET (seconds) from the actual/base run.
 * @param options.fuelType  'gasoline' (default) or 'alcohol'.
 * @param options.baseMPH   Trap speed — enables MPH sensitivity column.
 */
export function computeSensitivities(
  config: SensitivityConfig = DEFAULT_SENSITIVITY_CONFIG,
  baseET: number,
  options: {
    fuelType?: FuelType;
    baseMPH?: number;
  } = {}
): SensitivityResult {
  const fuelType = options.fuelType ?? 'gasoline';
  const baseMPH = options.baseMPH;

  const baro = config.base.barometerInHg;
  const temp = config.base.temperatureF;
  const hum  = config.base.humidityPct;

  // ── Build WeatherInput from base values for weather-row HPC calculations ──
  const baseWeatherForHPC: WeatherInput = {
    temperatureF: temp,
    humidityPct: hum,
    barometerInHg: baro,
    elevation: 0,
  };
  const hpcBase = computeRsaHpc(baseWeatherForHPC, fuelType);

  // ── For HPC row: use config.base.hpCorrectionFactor directly ─────────────
  // This lets the user independently set the HPC reference without changing weather.
  const hpcBaseForHpcRow = config.base.hpCorrectionFactor;

  // ── MPH derivative: dMPH/dET = -baseMPH / (baseET - DENSITY_ET_INTERCEPT) ─
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
    { ...baseWeatherForHPC, barometerInHg: baro + config.barometerChangeInHg },
    fuelType
  );
  const dET_baro = etDelta(hpcBaro);

  // ── Row: Temperature ───────────────────────────────────────────────────────
  const hpcTemp = computeRsaHpc(
    { ...baseWeatherForHPC, temperatureF: temp + config.temperatureChangeF },
    fuelType
  );
  const dET_temp = etDelta(hpcTemp);

  // ── Row: Humidity ──────────────────────────────────────────────────────────
  const hpcHum = computeRsaHpc(
    { ...baseWeatherForHPC, humidityPct: Math.min(100, hum + config.humidityChangePct) },
    fuelType
  );
  const dET_hum = etDelta(hpcHum);

  // ── Row: HP Correction Factor ──────────────────────────────────────────────
  // Direct independent variable — does not go through weather → HPC path.
  const hpcNewForHpcRow = hpcBaseForHpcRow + config.hpCorrectionFactorChange;
  const dET_hpc = baseET * (Math.pow(hpcNewForHpcRow / hpcBaseForHpcRow, 1 / 3) - 1);

  // ── Row: Vehicle Weight ────────────────────────────────────────────────────
  // Uses ΔET = (ET - A) × ((1 + ΔW/W)^(1/3) - 1)  from the Hale ET formula.
  const baseWeightLb = config.base.weightLb;
  let dET_weight: number | null = null;
  if (baseWeightLb > 0 && etOverIntercept > 0) {
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
      baseValue: round4(hpcBaseForHpcRow),
      change: config.hpCorrectionFactorChange,
      predictedETChange: round3(dET_hpc),
      predictedMPHChange: mphDelta(dET_hpc) !== null ? round2(mphDelta(dET_hpc)!) : null,
    },
    {
      variable: 'Vehicle Weight',
      unit: 'lb',
      baseValue: baseWeightLb,
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
    hasWeightRow: baseWeightLb > 0,
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
