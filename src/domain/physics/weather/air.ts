/**
 * Air density and atmospheric corrections for RSACLASSIC physics engine.
 * Uses simplified ISA (International Standard Atmosphere) with water vapor correction.
 */

import type { Env } from '../../schemas/env.schema';
import { inHgToPsi } from '../core/units';

/**
 * Air density at standard conditions (slugs/ft³).
 * 59°F, 29.92 inHg, dry air at sea level.
 */
const STANDARD_AIR_DENSITY = 0.002377;

/**
 * Gas constant for dry air (ft·lbf / (slug·°R))
 */
const R_DRY_AIR = 1716.0;

/**
 * Gas constant for water vapor (ft·lbf / (slug·°R))
 */
const R_WATER_VAPOR = 2760.0;

/**
 * Calculate air density in slugs/ft³ based on environmental conditions.
 * Uses ideal gas law with water vapor correction.
 * 
 * @param env - Environmental conditions
 * @returns Air density in slugs/ft³
 */
export function airDensity_slug_ft3(env: Env): number {
  // Convert temperature to Rankine (°R = °F + 459.67)
  const temp_R = env.temperatureF + 459.67;
  
  // Convert barometric pressure to psf (pounds per square foot)
  const pressure_psi = inHgToPsi(env.barometerInHg);
  const pressure_psf = pressure_psi * 144; // 1 psi = 144 psf
  
  // Calculate saturation vapor pressure (simplified Magnus formula)
  // e_s = 0.61078 * exp(17.27 * T / (T + 237.3)) in kPa
  // Convert to psf for consistency
  const temp_C = (env.temperatureF - 32) * 5 / 9;
  const e_sat_kPa = 0.61078 * Math.exp(17.27 * temp_C / (temp_C + 237.3));
  const e_sat_psf = e_sat_kPa * 20.885; // 1 kPa ≈ 20.885 psf
  
  // Actual vapor pressure based on relative humidity
  const humidity_fraction = env.humidityPct / 100;
  const vapor_pressure_psf = e_sat_psf * humidity_fraction;
  
  // Partial pressure of dry air
  const dry_air_pressure_psf = pressure_psf - vapor_pressure_psf;
  
  // Air density using ideal gas law with mixture
  // ρ = (P_dry / (R_dry * T)) + (P_vapor / (R_vapor * T))
  const rho_dry = dry_air_pressure_psf / (R_DRY_AIR * temp_R);
  const rho_vapor = vapor_pressure_psf / (R_WATER_VAPOR * temp_R);
  
  const total_density = rho_dry + rho_vapor;
  
  return total_density;
}

/**
 * Calculate air density ratio relative to standard conditions.
 * 
 * @param env - Environmental conditions
 * @returns Density ratio (ρ / ρ₀)
 */
export function rhoRatio(env: Env): number {
  const current_density = airDensity_slug_ft3(env);
  return current_density / STANDARD_AIR_DENSITY;
}

/**
 * Calculate horsepower correction factor based on air density.
 * 
 * Naturally aspirated engines lose power proportionally to air density.
 * HP_corrected = HP_rated * hpCorrection(env)
 * 
 * Uses alpha ≈ 1.0 for naturally aspirated engines.
 * (Turbocharged engines would use lower alpha, but we start simple)
 * 
 * @param env - Environmental conditions
 * @returns HP correction factor (typically 0.85 to 1.15)
 */
export function hpCorrection(env: Env): number {
  const ratio = rhoRatio(env);
  
  // Power correction: HP_actual = HP_rated * (ρ/ρ₀)^α
  // For naturally aspirated: α ≈ 1.0
  const alpha = 1.0;
  
  return Math.pow(ratio, alpha);
}

/**
 * Calculate density altitude in feet.
 * This is the altitude in standard atmosphere that has the same density.
 * 
 * @param env - Environmental conditions
 * @returns Density altitude in feet
 */
export function densityAltitude_ft(env: Env): number {
  const ratio = rhoRatio(env);
  
  // Simplified density altitude formula
  // Standard atmosphere: ρ = ρ₀ * (1 - 6.8756e-6 * h)^4.2561
  // Solving for h: h = (1 - (ρ/ρ₀)^(1/4.2561)) / 6.8756e-6
  
  const exponent = 1 / 4.2561;
  const altitude_from_ratio = (1 - Math.pow(ratio, exponent)) / 6.8756e-6;
  
  // Density altitude is the altitude in standard atmosphere with this density
  // Not relative to current elevation
  return altitude_from_ratio;
}
