/**
 * VB6-style air model (Quarter Jr/Pro).
 * - Density from barometer, temperature, humidity (simplified, matches VB6 approach).
 * - Dynamic pressure for drag/lift: q = 0.5 * rho * v^2.
 */

export type AirInputs = {
  barometer_inHg: number;   // e.g. 29.92
  temperature_F: number;    // dry-bulb, e.g. 75
  relHumidity_pct: number;  // 0..100
  elevation_ft: number;     // used for consistency with VB6 (can be 0 if already corrected)
};

const INHG_TO_PA = 3386.389; // Pa / inHg
const FT_TO_M = 0.3048;
const F_TO_K = (f: number) => (f - 32) * 5/9 + 273.15;

/** Saturation vapor pressure over water (Tetens, ok for VB6-level fidelity) */
function pSat_Pa(T_K: number): number {
  const T_C = T_K - 273.15;
  return 610.94 * Math.exp((17.625 * T_C) / (T_C + 243.04));
}

/** Air density ρ [kg/m^3] (mixture of dry air + water vapor) */
export function airDensity(air: AirInputs): number {
  const T_K = F_TO_K(air.temperature_F);
  // Total pressure (approx: barometer at site)
  const p_tot = air.barometer_inHg * INHG_TO_PA;

  // Water vapor partial pressure
  const phi = Math.max(0, Math.min(air.relHumidity_pct, 100)) / 100;
  const p_ws = pSat_Pa(T_K);
  const p_v = Math.min(p_ws, phi * p_ws);

  const p_d = Math.max(0, p_tot - p_v);

  const R_d = 287.058; // J/(kg·K) dry air
  const R_v = 461.495; // J/(kg·K) water vapor

  const rho = p_d / (R_d * T_K) + p_v / (R_v * T_K);
  return rho; // kg/m^3
}

/** Dynamic pressure q [lbf/ft^2] from speed v_fps and density ρ */
export function q_dyn_lbf_per_ft2(v_fps: number, rho_kg_m3: number): number {
  // v [m/s], q [Pa] = 0.5 * rho * v^2, then convert Pa -> lbf/ft^2
  const v_ms = v_fps * FT_TO_M;
  const q_Pa = 0.5 * rho_kg_m3 * v_ms * v_ms;
  const PA_TO_LBF_PER_FT2 = 0.020885434233; // 1 Pa = 0.020885... lbf/ft^2
  return q_Pa * PA_TO_LBF_PER_FT2;
}
