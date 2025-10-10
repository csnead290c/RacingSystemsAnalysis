/**
 * Rolling resistance model for RSACLASSIC physics engine.
 * Simple coefficient-based model for tire rolling resistance.
 */

/**
 * Calculate rolling resistance force.
 * 
 * Rolling resistance is the force required to keep the tires rolling.
 * It's caused by tire deformation, friction in bearings, and other factors.
 * 
 * Simplified model: F_rr = Crr * N
 * Where:
 * - Crr = rolling resistance coefficient (dimensionless)
 * - N = normal force (weight on wheels, in pounds)
 * 
 * This is an approximation that works well for constant speed.
 * More complex models account for speed dependency, but for drag racing
 * the simple model is sufficient.
 * 
 * @param weight_lb - Weight on wheels in pounds
 * @param rrCoeff - Rolling resistance coefficient
 * @returns Rolling resistance force in pounds
 */
export function rolling_lb(weight_lb: number, rrCoeff: number): number {
  return rrCoeff * weight_lb;
}

/**
 * Typical rolling resistance coefficients for reference.
 */
export const TYPICAL_RR_COEFF = {
  /** Low rolling resistance tires (eco tires) */
  LOW_RR: 0.006,
  
  /** Standard passenger car tires on asphalt */
  PASSENGER: 0.010,
  
  /** Performance street tires */
  PERFORMANCE: 0.012,
  
  /** Drag radials (slightly higher due to softer compound) */
  DRAG_RADIAL: 0.015,
  
  /** Slicks (soft compound, high deformation) */
  SLICK: 0.018,
  
  /** Off-road or mud terrain */
  OFF_ROAD: 0.025,
} as const;

/**
 * Calculate rolling resistance coefficient from known force.
 * Useful for calibration or reverse engineering.
 * 
 * @param force_lb - Known rolling resistance force in pounds
 * @param weight_lb - Weight on wheels in pounds
 * @returns Rolling resistance coefficient
 */
export function rrCoeffFromForce(force_lb: number, weight_lb: number): number {
  // Avoid division by zero
  if (weight_lb === 0) {
    return 0;
  }
  
  return force_lb / weight_lb;
}

/**
 * Estimate total rolling resistance for a vehicle.
 * 
 * @param totalWeight_lb - Total vehicle weight in pounds
 * @param rrCoeff - Rolling resistance coefficient
 * @returns Total rolling resistance force in pounds
 */
export function totalRolling_lb(totalWeight_lb: number, rrCoeff: number): number {
  return rolling_lb(totalWeight_lb, rrCoeff);
}

/**
 * Calculate power loss due to rolling resistance.
 * 
 * Power = Force * Velocity
 * 
 * @param force_lb - Rolling resistance force in pounds
 * @param v_fps - Velocity in feet per second
 * @returns Power loss in horsepower
 */
export function rollingPowerLoss_hp(force_lb: number, v_fps: number): number {
  // Power in ft·lb/s
  const power_ftlb_s = force_lb * v_fps;
  
  // Convert to horsepower: 1 HP = 550 ft·lb/s
  const power_hp = power_ftlb_s / 550;
  
  return power_hp;
}
