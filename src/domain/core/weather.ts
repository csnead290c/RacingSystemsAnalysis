/**
 * Weather and atmospheric calculations for racing performance.
 * All formulas use imperial units and are deterministic approximations.
 */

import type { Env } from '../schemas/env.schema';

/**
 * Calculate density altitude in feet.
 * 
 * Density altitude represents the altitude at which the air density would be
 * equal to the current conditions in standard atmosphere. Higher density altitude
 * means thinner air and reduced engine performance.
 * 
 * Formula uses standard atmospheric approximations:
 * 1. Pressure altitude from barometer reading
 * 2. Temperature correction for non-standard conditions
 * 
 * Standard conditions: 29.92 inHg, 59°F (15°C) at sea level
 * 
 * @param env - Environment conditions
 * @returns Density altitude in feet (can be negative at low elevations with cold, high pressure)
 */
export function densityAltitudeFt(env: Env): number {
  // Standard sea level pressure in inHg
  const stdPressure = 29.92;
  
  // Pressure altitude: altitude correction for non-standard pressure
  // ~1000 ft per 1 inHg difference from standard
  const pressureAlt = env.elevation + (stdPressure - env.barometerInHg) * 1000;
  
  // Standard temperature at pressure altitude (°F)
  // Standard lapse rate: ~3.5°F per 1000 ft
  const stdTemp = 59 - (pressureAlt / 1000) * 3.5;
  
  // Temperature correction: ~120 ft per 1°F difference
  // Higher temp = higher density altitude (thinner air)
  const tempCorrection = (env.temperatureF - stdTemp) * 120;
  
  // Humidity correction (simplified): higher humidity = slightly higher DA
  // Water vapor is less dense than dry air
  // Approximate: +50 ft per 10% humidity at 80°F
  const humidityCorrection = (env.humidityPct / 10) * 50 * (env.temperatureF / 80);
  
  return pressureAlt + tempCorrection + humidityCorrection;
}

/**
 * Calculate grains of water vapor per pound of dry air.
 * 
 * This represents the absolute humidity in the air. One grain = 1/7000 pound.
 * Higher values indicate more moisture, which affects air density and combustion.
 * 
 * Uses simplified psychrometric approximation for racing conditions.
 * Typical range: 20-200 grains/lb for racing conditions.
 * 
 * @param env - Environment conditions
 * @returns Grains of water per pound of dry air
 */
export function grainsOfWater(env: Env): number {
  // Saturation vapor pressure approximation (Tetens formula simplified)
  // Units: inHg
  const satVaporPressure = 0.0061 * Math.exp((17.27 * (env.temperatureF - 32) / 1.8) / 
                                              (237.3 + (env.temperatureF - 32) / 1.8));
  
  // Actual vapor pressure from relative humidity
  const vaporPressure = satVaporPressure * (env.humidityPct / 100);
  
  // Grains of water per pound of dry air
  // Formula: 7000 * 0.622 * (e / (P - e))
  // where e = vapor pressure, P = total pressure
  const grains = 7000 * 0.622 * (vaporPressure / (env.barometerInHg - vaporPressure));
  
  // Ensure finite result
  return Math.max(0, Math.min(grains, 500)); // Cap at reasonable maximum
}

/**
 * Calculate horsepower correction factor for atmospheric conditions.
 * 
 * Returns a multiplier for engine power based on air density.
 * - 1.0 = standard conditions (sea level, 59°F, 29.92 inHg, 0% humidity)
 * - >1.0 = more power (denser air)
 * - <1.0 = less power (thinner air)
 * 
 * This is a simplified correction factor. More sophisticated models would
 * account for forced induction, fuel type, and engine-specific characteristics.
 * 
 * Typical range: 0.85-1.05 for most racing conditions
 * 
 * @param env - Environment conditions
 * @returns Power correction multiplier (dimensionless)
 */
export function hpCorrectionV1(env: Env): number {
  // Standard conditions
  const stdPressure = 29.92; // inHg
  const stdTemp = 59; // °F
  const stdTempRankine = stdTemp + 459.67; // Convert to absolute temperature
  
  // Current conditions in absolute temperature
  const currentTempRankine = env.temperatureF + 459.67;
  
  // Air density ratio approximation
  // ρ/ρ₀ = (P/P₀) * (T₀/T)
  const pressureRatio = env.barometerInHg / stdPressure;
  const tempRatio = stdTempRankine / currentTempRankine;
  
  // Base correction from pressure and temperature
  let correction = pressureRatio * tempRatio;
  
  // Humidity correction: water vapor reduces air density slightly
  // Approximate: -1% power per 50 grains of water
  const grains = grainsOfWater(env);
  const humidityFactor = 1 - (grains / 5000);
  
  correction *= humidityFactor;
  
  // Clamp to reasonable range to avoid extreme values
  return Math.max(0.7, Math.min(correction, 1.15));
}
