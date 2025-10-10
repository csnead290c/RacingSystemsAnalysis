/**
 * Unit conversion utilities for racing calculations.
 * All functions are pure and deterministic.
 */

/**
 * Convert miles per hour to feet per second.
 * @param mph - Speed in miles per hour
 * @returns Speed in feet per second
 */
export function mphToFps(mph: number): number {
  return mph * 1.466667; // 1 mph = 1.466667 fps (5280 ft/mile ÷ 3600 s/hour)
}

/**
 * Convert feet per second to miles per hour.
 * @param fps - Speed in feet per second
 * @returns Speed in miles per hour
 */
export function fpsToMph(fps: number): number {
  return fps / 1.466667; // Inverse of mphToFps
}

/**
 * Convert pounds (mass) to slugs.
 * In imperial units, 1 slug = 32.174 lb (standard gravity acceleration).
 * @param lb - Mass in pounds
 * @returns Mass in slugs
 */
export function lbToSlug(lb: number): number {
  return lb / 32.174;
}

/**
 * Convert inches of mercury to pounds per square inch.
 * Standard conversion: 1 inHg ≈ 0.491097 psi
 * @param inHg - Pressure in inches of mercury
 * @returns Pressure in pounds per square inch
 */
export function inHgToPsi(inHg: number): number {
  return inHg * 0.491097;
}

/**
 * Clamp a number between minimum and maximum values.
 * @param n - Number to clamp
 * @param min - Minimum value
 * @param max - Maximum value
 * @returns Clamped value
 */
export function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

/**
 * Round a number to a specified number of decimal places.
 * @param n - Number to round
 * @param decimals - Number of decimal places
 * @returns Rounded number
 */
export function round(n: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(n * factor) / factor;
}
