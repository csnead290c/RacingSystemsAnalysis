/**
 * Unit Conversion Constants and Functions
 * 
 * SINGLE SOURCE OF TRUTH for all unit conversions in the physics simulation.
 * 
 * VB6 uses these exact conversion factors:
 * - 1 mph = 1.4666666667 fps (feet per second)
 * - 1 fps = 0.681818... mph
 * 
 * CRITICAL: Always use these functions. Never do ad-hoc conversions.
 */

/**
 * Conversion factor: feet per second per mile per hour
 * 1 mph = 5280 ft/mile ÷ 3600 sec/hour = 1.4666666667 fps
 */
export const FPS_PER_MPH = 1.4666666667;

/**
 * Conversion factor: miles per hour per foot per second
 * 1 fps = 3600 sec/hour ÷ 5280 ft/mile = 0.6818181818 mph
 */
export const MPH_PER_FPS = 1 / FPS_PER_MPH;

/**
 * Conversion factor: feet per second squared to g-force
 * 1 g = 32.174 ft/s²
 */
export const G_ACCEL = 32.174;

/**
 * Convert miles per hour to feet per second
 * @param mph Speed in miles per hour
 * @returns Speed in feet per second
 */
export function mphToFps(mph: number): number {
  return mph * FPS_PER_MPH;
}

/**
 * Convert feet per second to miles per hour
 * @param fps Speed in feet per second
 * @returns Speed in miles per hour
 */
export function fpsToMph(fps: number): number {
  return fps / FPS_PER_MPH;
}

/**
 * Convert acceleration in ft/s² to g-force
 * @param accel_ftps2 Acceleration in ft/s²
 * @returns Acceleration in g
 */
export function ftps2ToG(accel_ftps2: number): number {
  return accel_ftps2 / G_ACCEL;
}

/**
 * Convert g-force to acceleration in ft/s²
 * @param accel_g Acceleration in g
 * @returns Acceleration in ft/s²
 */
export function gToFtps2(accel_g: number): number {
  return accel_g * G_ACCEL;
}

/**
 * Validate that a reported mph value matches the fps value it was derived from
 * Used for unit conversion sanity checks
 * @param fps Speed in feet per second
 * @param mph Reported speed in miles per hour
 * @param tolerance Maximum allowed difference in mph
 * @returns true if values match within tolerance
 */
export function validateMphConversion(fps: number, mph: number, tolerance = 0.05): boolean {
  const expectedMph = fpsToMph(fps);
  return Math.abs(mph - expectedMph) < tolerance;
}
