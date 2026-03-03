/**
 * NHRA Parity Weather Correction + HPC Pipeline
 *
 * Pure TypeScript implementation matching the official spreadsheet formulas exactly.
 * All intermediate values (SVP, VP, DAP, DP, AD, DA, WG, CF, Theta, Delta) are
 * exposed for transparency / debugging.
 *
 * Inputs:
 *   T  — temperature in °F
 *   H  — relative humidity as fraction 0.00–1.00
 *   BP — uncorrected barometric pressure in inHg
 *
 * Engine combo lookup provides tPower, dPower, FF for HPC calculation.
 * Driver combo lookup resolves a run's timestamp to an engine combo.
 */

// ── Unit Converters ─────────────────────────────────────────────────────

export function hPa_to_inHg(p_hPa: number): number {
  return p_hPa * 0.02953;
}

export function pct_to_frac(h_pct: number): number {
  return h_pct / 100;
}

// ── Core Weather Derived Values ─────────────────────────────────────────

export function saturatedVaporPressure(T: number): number {
  return 29.98 / Math.exp(35.83 * (212 - T) / Math.pow(T + 459.67, 1.152));
}

export function vaporPressure(T: number, H: number): number {
  return H * saturatedVaporPressure(T);
}

export function dryAirPressure(BP: number, T: number, H: number): number {
  return BP - vaporPressure(T, H);
}

export function dewPoint(T: number, H: number): number {
  const vp = vaporPressure(T, H);
  return 77.33 + 31.3 * Math.log(vp) + 1.668 / (vp + 0.019);
}

export function airDensity(BP: number, T: number, H: number): number {
  const vp = vaporPressure(T, H);
  return 1736.86 * (BP - vp) / (T + 459.67);
}

export function densityAltitude(BP: number, T: number, H: number): number {
  const ad = airDensity(BP, T, H);
  return 145723 * (1 - Math.pow(ad / 100, 0.234944));
}

export function waterGrains(BP: number, T: number, H: number): number {
  const vp = vaporPressure(T, H);
  return (vp / (BP - vp)) * 7000 / 1.60791;
}

export function correctionFactor(BP: number, T: number, H: number): number {
  const dap = dryAirPressure(BP, T, H);
  const tempC = (T - 32) * (5 / 9);
  const tempK = tempC + 273.15;
  return 1.176 * (1013.20690822892 / (dap / 0.02953)) * Math.pow(tempK / 288.705555555556, 0.5) - 0.176;
}

export function theta(T: number): number {
  return (T + 459.67) / 519.67;
}

export function delta(BP: number, T: number, H: number): number {
  return dryAirPressure(BP, T, H) / 29.92;
}

// ── Full Weather Result ─────────────────────────────────────────────────

export interface WeatherResult {
  svp: number;
  vp: number;
  dap: number;
  dewPoint: number;
  airDensity: number;
  densityAltitude: number;
  waterGrains: number;
  correctionFactor: number;
  theta: number;
  delta: number;
}

export function computeWeather(T: number, H: number, BP: number): WeatherResult {
  return {
    svp: saturatedVaporPressure(T),
    vp: vaporPressure(T, H),
    dap: dryAirPressure(BP, T, H),
    dewPoint: dewPoint(T, H),
    airDensity: airDensity(BP, T, H),
    densityAltitude: densityAltitude(BP, T, H),
    waterGrains: waterGrains(BP, T, H),
    correctionFactor: correctionFactor(BP, T, H),
    theta: theta(T),
    delta: delta(BP, T, H),
  };
}

// ── Engine Combo Lookup ─────────────────────────────────────────────────

export interface EngineCombo {
  name: string;
  tPower: number;
  dPower: number;
  FF: number;
}

// ── Driver Combo Time-Effective Resolver ────────────────────────────────

export interface DriverComboRow {
  driverName: string;
  classIndex: string;
  engineCombo: string;
  effectiveFromUtc: string; // ISO 8601
  effectiveToUtc?: string | null; // ISO 8601
}

export function resolveEngineComboForRun(params: {
  driverName: string;
  classIndex: string;
  runUtcTimestamp: string;
  driverComboRows: DriverComboRow[];
}): string | 0 {
  const { driverName, classIndex, runUtcTimestamp, driverComboRows } = params;
  const ts = new Date(runUtcTimestamp).getTime();

  const matches = driverComboRows.filter(row => {
    if (row.driverName !== driverName) return false;
    if (row.classIndex !== classIndex) return false;
    const from = new Date(row.effectiveFromUtc).getTime();
    if (ts < from) return false;
    if (row.effectiveToUtc != null) {
      const to = new Date(row.effectiveToUtc).getTime();
      if (ts >= to) return false;
    }
    return true;
  });

  if (matches.length === 0) return 0;

  // If multiple match, choose the one with the latest effectiveFromUtc
  matches.sort((a, b) =>
    new Date(b.effectiveFromUtc).getTime() - new Date(a.effectiveFromUtc).getTime()
  );

  return matches[0].engineCombo;
}

// ── Enhanced Resolver with Class Default Fallback ────────────────────────
//
// Accepts snake_case field names matching the API response types from parityApi.ts
// so callers can pass data directly without field-name transformation.

export interface ApiDriverComboRow {
  driver_name: string;
  class_index: string;
  engine_combo_id: number;
  engine_combo_name: string;
  effective_from_utc: string;
  effective_to_utc: string | null;
}

export interface ClassDefaultComboRow {
  class_index: string;
  engine_combo_name: string;
  engine_combo_id: number;
  effective_from_utc: string | null;
  effective_to_utc: string | null;
}

export type ComboSource = 'driver' | 'classDefault' | 'none';

export interface ResolvedCombo {
  engineComboName: string | null;
  engineComboId: number | null;
  source: ComboSource;
  detail: string;
}

export function resolveEngineCombo(params: {
  driverName: string;
  classIndex: string;
  runTimestampUtc: string;
  driverCombos: ApiDriverComboRow[];
  classDefaults: ClassDefaultComboRow[];
}): ResolvedCombo {
  const { driverName, classIndex, runTimestampUtc, driverCombos, classDefaults } = params;
  const dn = driverName.toUpperCase();
  const ci = classIndex.toUpperCase();
  const ts = new Date(runTimestampUtc).getTime();

  // 1) Try driver+class assignment
  const driverMatches = driverCombos.filter(row => {
    if (row.driver_name.toUpperCase() !== dn) return false;
    if (row.class_index.toUpperCase() !== ci) return false;
    const from = new Date(row.effective_from_utc).getTime();
    if (ts < from) return false;
    if (row.effective_to_utc != null) {
      const to = new Date(row.effective_to_utc).getTime();
      if (ts >= to) return false;
    }
    return true;
  });

  if (driverMatches.length > 0) {
    driverMatches.sort((a, b) =>
      new Date(b.effective_from_utc).getTime() - new Date(a.effective_from_utc).getTime()
    );
    const m = driverMatches[0];
    return {
      engineComboName: m.engine_combo_name,
      engineComboId: m.engine_combo_id,
      source: 'driver',
      detail: `Driver assignment from ${m.effective_from_utc.slice(0, 10)}`,
    };
  }

  // 2) Try class default
  const classMatches = classDefaults.filter(row => {
    if (row.class_index.toUpperCase() !== ci) return false;
    if (row.effective_from_utc != null) {
      const from = new Date(row.effective_from_utc).getTime();
      if (ts < from) return false;
    }
    if (row.effective_to_utc != null) {
      const to = new Date(row.effective_to_utc).getTime();
      if (ts >= to) return false;
    }
    return true;
  });

  if (classMatches.length > 0) {
    classMatches.sort((a, b) => {
      const aFrom = a.effective_from_utc ? new Date(a.effective_from_utc).getTime() : 0;
      const bFrom = b.effective_from_utc ? new Date(b.effective_from_utc).getTime() : 0;
      return bFrom - aFrom;
    });
    const m = classMatches[0];
    return {
      engineComboName: m.engine_combo_name,
      engineComboId: m.engine_combo_id,
      source: 'classDefault',
      detail: `Class default${m.effective_from_utc ? ` from ${m.effective_from_utc.slice(0, 10)}` : ''}`,
    };
  }

  // 3) None
  return {
    engineComboName: null,
    engineComboId: null,
    source: 'none',
    detail: 'No driver assignment; no class default',
  };
}

// ── Horsepower Correction (HPC) ─────────────────────────────────────────

export function computeHPC(params: {
  engineCombo: string | 0;
  tPower: number;
  dPower: number;
  FF: number;
  theta: number;
  delta: number;
}): number {
  const { engineCombo, tPower, dPower, FF, theta: th, delta: dl } = params;
  if (engineCombo === 0) return 0;
  return (1 + FF / 100) * (Math.pow(th, tPower) / Math.pow(dl, dPower)) - FF / 100;
}

// ── Run Correction ──────────────────────────────────────────────────────

export function correctET(actualET: number, hpc: number): number | null {
  if (hpc === 0 || !isFinite(hpc)) return null;
  return actualET * Math.pow(hpc, -0.33);
}

export function correctMPH(actualMPH: number, hpc: number): number | null {
  if (hpc === 0 || !isFinite(hpc)) return null;
  return actualMPH * Math.pow(hpc, 0.33);
}

// Strict-mode variants that throw on invalid HPC (for tests)
export function correctET_strict(actualET: number, hpc: number): number {
  if (hpc === 0 || !isFinite(hpc)) throw new Error(`Invalid HPC: ${hpc}`);
  return actualET * Math.pow(hpc, -0.33);
}

export function correctMPH_strict(actualMPH: number, hpc: number): number {
  if (hpc === 0 || !isFinite(hpc)) throw new Error(`Invalid HPC: ${hpc}`);
  return actualMPH * Math.pow(hpc, 0.33);
}

// ── Simple (CF-based) Correction ─────────────────────────────────────────
// Matches PHP parity_correctionFactor() + parity_correctET() exactly.
// Used when engine-combo HPC data is unavailable (e.g. Driver History).
// corrected_et = actual_et × CF   where CF = correctionFactor(BP, T, H)

export interface SimpleCorrectionInput {
  temp_f: number | null;
  pressure_inhg: number | null;
  rh_pct: number | null;
}

export interface SimpleCorrectionResult {
  correctionFactor: number | null;
  corrected_ft1320: number | null;
  corrected_ft660: number | null;
  corrected_ft60: number | null;
}

/**
 * Compute simple CF-based corrected ET values from weather data.
 * Pure function — no engine combo needed. Matches PHP backend exactly.
 */
export function applySimpleCorrection(
  weather: SimpleCorrectionInput,
  run: { ft1320?: number | null; ft660?: number | null; ft60?: number | null },
): SimpleCorrectionResult {
  const { temp_f, pressure_inhg, rh_pct } = weather;
  if (temp_f == null || pressure_inhg == null) {
    return { correctionFactor: null, corrected_ft1320: null, corrected_ft660: null, corrected_ft60: null };
  }
  const H = (rh_pct != null ? rh_pct : 0) / 100;
  const cf = correctionFactor(pressure_inhg, temp_f, H);

  const correct = (et: number | null | undefined): number | null => {
    if (et == null) return null;
    return Math.round(et * cf * 10000) / 10000; // round to 4 decimal places, matching PHP round($et * $factor, 4)
  };

  return {
    correctionFactor: Math.round(cf * 1000000) / 1000000, // 6 decimal places, matching PHP
    corrected_ft1320: correct(run.ft1320),
    corrected_ft660: correct(run.ft660),
    corrected_ft60: correct(run.ft60),
  };
}

// ── Full Run Correction Pipeline ────────────────────────────────────────

export interface RunCorrectionInput {
  T: number;
  H: number;
  BP: number;
  engineComboName: string | 0;
  tPower: number;
  dPower: number;
  FF: number;
  actualET?: number | null;
  actualMPH?: number | null;
}

export interface RunCorrectionResult {
  weather: WeatherResult;
  hpc: number;
  correctedET: number | null;
  correctedMPH: number | null;
}

export function correctRun(input: RunCorrectionInput): RunCorrectionResult {
  const weather = computeWeather(input.T, input.H, input.BP);
  const hpc = computeHPC({
    engineCombo: input.engineComboName,
    tPower: input.tPower,
    dPower: input.dPower,
    FF: input.FF,
    theta: weather.theta,
    delta: weather.delta,
  });
  return {
    weather,
    hpc,
    correctedET: input.actualET != null ? correctET(input.actualET, hpc) : null,
    correctedMPH: input.actualMPH != null ? correctMPH(input.actualMPH, hpc) : null,
  };
}
