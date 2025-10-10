/**
 * VB6-ported conversion utilities.
 * 
 * These functions mirror the exact conversions used in VB6
 * to ensure identical physics calculations.
 */

import { FPS_TO_MPH, INCH_TO_FT } from './constants';

/**
 * Convert horsepower to torque (lb-ft).
 * Formula: T = 5252 * HP / RPM
 */
export function hpToTorqueLbFt(hp: number, rpm: number): number {
  if (rpm <= 0) return 0;
  return (5252 * hp) / rpm;
}

/**
 * Convert miles per hour to feet per second.
 */
export function mphToFps(mph: number): number {
  return mph / FPS_TO_MPH;
}

/**
 * Convert inches to feet.
 */
export function inchToFt(inch: number): number {
  return inch * INCH_TO_FT;
}

/**
 * Convert degrees to radians.
 */
export function degToRad(deg: number): number {
  return (deg * Math.PI) / 180;
}
