/**
 * Launch and rollout logic for RSACLASSIC physics engine.
 * Handles tire rollout distance before ET clock starts.
 */

/**
 * Launch parameters.
 */
export interface LaunchParams {
  /**
   * Tire rollout distance in inches.
   * 
   * Rollout is the distance the vehicle travels before breaking the timing beam.
   * This is due to the tire compressing and rolling forward before the beam is broken.
   * 
   * Typical values: 6-12 inches depending on tire size and pressure.
   */
  rolloutIn: number;
}

/**
 * Apply rollout to distance calculation.
 * 
 * The ET clock doesn't start until the vehicle has traveled the rollout distance.
 * This function returns the effective distance for ET timing purposes.
 * 
 * Physical distance vs. Timed distance:
 * - Before rollout: Physical motion, but ET clock hasn't started
 * - After rollout: Both physical distance and ET distance accumulate
 * 
 * @param s_ft - Physical distance traveled in feet
 * @param rolloutIn - Rollout distance in inches
 * @returns Effective distance for ET timing in feet
 */
export function applyRollout(s_ft: number, rolloutIn: number): number {
  // Convert rollout to feet
  const rollout_ft = rolloutIn / 12;
  
  // If we haven't traveled the rollout distance yet, ET distance is 0
  if (s_ft < rollout_ft) {
    return 0;
  }
  
  // After rollout, ET distance = physical distance - rollout
  return s_ft - rollout_ft;
}

/**
 * Check if vehicle has completed rollout.
 * 
 * @param s_ft - Physical distance traveled in feet
 * @param rolloutIn - Rollout distance in inches
 * @returns True if rollout is complete (timing has started)
 */
export function hasCompletedRollout(s_ft: number, rolloutIn: number): boolean {
  const rollout_ft = rolloutIn / 12;
  return s_ft >= rollout_ft;
}

/**
 * Calculate the time offset due to rollout.
 * 
 * This is the time spent traveling the rollout distance before the ET clock starts.
 * This time is "lost" from the ET but represents real physical motion.
 * 
 * @param rolloutIn - Rollout distance in inches
 * @param avgSpeed_fps - Average speed during rollout in ft/s
 * @returns Time offset in seconds
 */
export function rolloutTimeOffset_s(
  rolloutIn: number,
  avgSpeed_fps: number
): number {
  const rollout_ft = rolloutIn / 12;
  
  // Avoid division by zero
  if (avgSpeed_fps <= 0) {
    return 0;
  }
  
  // Time = distance / speed
  return rollout_ft / avgSpeed_fps;
}

/**
 * Calculate effective ET accounting for rollout.
 * 
 * The measured ET is less than the actual time from launch because
 * the clock doesn't start until after rollout.
 * 
 * @param actualTime_s - Actual time from launch
 * @param rolloutTime_s - Time spent in rollout
 * @returns Measured ET in seconds
 */
export function effectiveET_s(
  actualTime_s: number,
  rolloutTime_s: number
): number {
  return Math.max(0, actualTime_s - rolloutTime_s);
}

/**
 * Calculate staging position for deep staging.
 * 
 * Deep staging is when the vehicle rolls forward past the staging beam,
 * reducing the rollout distance and improving reaction time.
 * 
 * @param normalRolloutIn - Normal rollout distance
 * @param deepStageIn - Additional distance rolled forward
 * @returns Effective rollout distance in inches
 */
export function deepStageRollout(
  normalRolloutIn: number,
  deepStageIn: number
): number {
  // Deep staging reduces effective rollout
  return Math.max(0, normalRolloutIn - deepStageIn);
}
