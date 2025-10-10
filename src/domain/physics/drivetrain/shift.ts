/**
 * Shift logic for RSACLASSIC physics engine.
 * Determines when to upshift based on RPM thresholds.
 */

import type { Drivetrain } from './drivetrain';

/**
 * Determine if a shift should occur and return new gear index.
 * 
 * Upshifts when:
 * - Not in top gear (gearIdx < last gear)
 * - RPM >= shift threshold for current gear
 * 
 * @param rpm - Current engine RPM
 * @param gearIdx - Current gear index (0-based)
 * @param d - Drivetrain configuration
 * @returns New gear index (same if no shift, +1 if upshift)
 */
export function maybeShift(
  rpm: number,
  gearIdx: number,
  d: Drivetrain
): number {
  // Check if we're already in top gear
  const topGearIdx = d.ratios.length - 1;
  if (gearIdx >= topGearIdx) {
    return gearIdx; // Already in top gear, can't shift higher
  }
  
  // Check if shift RPM threshold exists for current gear
  if (gearIdx >= d.shiftRPM.length) {
    return gearIdx; // No shift threshold defined
  }
  
  // Get shift threshold for current gear
  const shiftThreshold = d.shiftRPM[gearIdx];
  
  // Shift if RPM meets or exceeds threshold
  if (rpm >= shiftThreshold) {
    return gearIdx + 1;
  }
  
  // No shift needed
  return gearIdx;
}

/**
 * Calculate RPM drop after upshift.
 * 
 * When shifting from gear N to gear N+1, the RPM drops proportionally
 * to the ratio of the gear ratios.
 * 
 * @param currentRPM - RPM before shift
 * @param fromGearIdx - Current gear index
 * @param toGearIdx - Target gear index
 * @param d - Drivetrain configuration
 * @returns RPM after shift
 */
export function rpmAfterShift(
  currentRPM: number,
  fromGearIdx: number,
  toGearIdx: number,
  d: Drivetrain
): number {
  // Get gear ratios
  const fromRatio = d.ratios[fromGearIdx] || 1.0;
  const toRatio = d.ratios[toGearIdx] || 1.0;
  
  // RPM drops proportionally to ratio change
  // new_rpm = current_rpm * (to_ratio / from_ratio)
  const newRPM = currentRPM * (toRatio / fromRatio);
  
  return newRPM;
}

/**
 * Check if downshift should occur (for future use).
 * 
 * Downshifts when:
 * - Not in first gear
 * - RPM < minimum threshold (to prevent lugging)
 * 
 * @param rpm - Current engine RPM
 * @param gearIdx - Current gear index (0-based)
 * @param minRPM - Minimum RPM threshold (e.g., 2000)
 * @returns New gear index (same if no shift, -1 if downshift)
 */
export function maybeDownshift(
  rpm: number,
  gearIdx: number,
  minRPM: number
): number {
  // Check if we're already in first gear
  if (gearIdx <= 0) {
    return gearIdx; // Already in first gear, can't shift lower
  }
  
  // Downshift if RPM is too low
  if (rpm < minRPM) {
    return gearIdx - 1;
  }
  
  // No downshift needed
  return gearIdx;
}
