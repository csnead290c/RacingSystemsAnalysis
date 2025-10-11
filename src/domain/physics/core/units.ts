/**
 * Unit conversion utilities for RSACLASSIC physics engine.
 */

/**
 * Conversion factor: mph per fps (VB6: Z5 = 3600 / 5280)
 */
export const MPH_PER_FPS = 3600 / 5280; // 0.681818...

/**
 * Conversion factor: fps per mph
 */
export const FPS_PER_MPH = 5280 / 3600; // 1.466667...

/**
 * Convert feet per second to miles per hour.
 */
export function fpsToMph(fps: number): number {
  return fps * MPH_PER_FPS;
}

/**
 * Convert miles per hour to feet per second.
 */
export function mphToFps(mph: number): number {
  return mph * FPS_PER_MPH;
}

/**
 * Convert RPM to radians per second.
 */
export function rpmToRadS(rpm: number): number {
  return rpm * (2 * Math.PI / 60);
}

/**
 * Convert radians per second to RPM.
 */
export function radSToRpm(radS: number): number {
  return radS * (60 / (2 * Math.PI));
}

/**
 * Convert pounds (force) to slugs (mass).
 * Uses standard gravity: 32.174 ft/s²
 */
export function lbToSlug(lb: number): number {
  return lb / 32.174;
}

/**
 * Convert slugs (mass) to pounds (force).
 * Uses standard gravity: 32.174 ft/s²
 */
export function slugToLb(slug: number): number {
  return slug * 32.174;
}

/**
 * Convert inches of mercury to pounds per square inch.
 */
export function inHgToPsi(inHg: number): number {
  return inHg * 0.491154;
}

/**
 * Convert pounds per square inch to inches of mercury.
 */
export function psiToInHg(psi: number): number {
  return psi / 0.491154;
}

/**
 * Clamp a value between min and max.
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Linear interpolation between a and b.
 * @param a - Start value
 * @param b - End value
 * @param t - Interpolation factor (0 to 1)
 */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Safe cube root that preserves sign.
 * Math.cbrt handles negative numbers correctly, but this is explicit.
 */
export function cbrtSafe(n: number): number {
  if (n >= 0) {
    return Math.cbrt(n);
  } else {
    return -Math.cbrt(-n);
  }
}

/**
 * Standard gravity in ft/s²
 */
export const GRAVITY_FT_S2 = 32.174;

/**
 * Air density at sea level, standard conditions (slugs/ft³)
 */
export const AIR_DENSITY_SEA_LEVEL = 0.002377;
