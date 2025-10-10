/**
 * Drivetrain model for RSACLASSIC physics engine.
 * Handles gear ratios, final drive, and force/RPM calculations.
 */

/**
 * Drivetrain configuration.
 */
export interface Drivetrain {
  /**
   * Gear ratios (1st gear, 2nd gear, etc.)
   * Higher ratio = more torque multiplication, lower top speed
   */
  ratios: number[];
  
  /**
   * Final drive ratio (rear gear)
   */
  finalDrive: number;
  
  /**
   * Transmission efficiency (0 to 1)
   * Typical: 0.85-0.95
   */
  transEff: number;
  
  /**
   * Tire diameter in inches
   */
  tireDiaIn: number;
  
  /**
   * Upshift RPM thresholds per gear
   * Length should match ratios.length
   */
  shiftRPM: number[];
}

/**
 * Calculate engine RPM from vehicle speed.
 * 
 * Formula:
 * rpm = (v_fps / (π * tire_dia_ft)) * 60 * gear_ratio * final_drive * (1 + slip)
 * 
 * Where:
 * - v_fps / (π * tire_dia_ft) = wheel rotations per second
 * - * 60 = wheel rotations per minute
 * - * gear_ratio * final_drive = engine rotations per wheel rotation
 * - * (1 + slip) = slip factor (0 = no slip, >0 = wheel slip)
 * 
 * @param v_fps - Vehicle speed in feet per second
 * @param gearIdx - Current gear index (0-based)
 * @param d - Drivetrain configuration
 * @param slip - Tire slip factor (0 = no slip, 0.1 = 10% slip)
 * @returns Engine RPM
 */
export function rpmFromSpeed(
  v_fps: number,
  gearIdx: number,
  d: Drivetrain,
  slip = 0
): number {
  // Convert tire diameter to feet
  const tireDia_ft = d.tireDiaIn / 12;
  
  // Wheel circumference in feet
  const wheelCirc_ft = Math.PI * tireDia_ft;
  
  // Wheel rotations per second
  const wheelRPS = v_fps / wheelCirc_ft;
  
  // Wheel rotations per minute
  const wheelRPM = wheelRPS * 60;
  
  // Get gear ratio (clamp to valid range)
  const gearRatio = d.ratios[Math.min(gearIdx, d.ratios.length - 1)] || 1.0;
  
  // Engine RPM accounting for gear ratio, final drive, and slip
  const rpm = wheelRPM * gearRatio * d.finalDrive * (1 + slip);
  
  return rpm;
}

/**
 * Calculate wheel force from engine torque.
 * 
 * Formula:
 * F = (tq * gear_ratio * final_drive * trans_eff) / tire_radius_ft
 * 
 * Where:
 * - tq * gear_ratio * final_drive = torque at wheels (before losses)
 * - * trans_eff = torque at wheels (after transmission losses)
 * - / tire_radius_ft = force at contact patch
 * 
 * @param tq_lbft - Engine torque in lb-ft
 * @param gearIdx - Current gear index (0-based)
 * @param d - Drivetrain configuration
 * @returns Wheel force in pounds
 */
export function wheelForce_lb(
  tq_lbft: number,
  gearIdx: number,
  d: Drivetrain
): number {
  // Convert tire diameter to radius in feet
  const tireRadius_ft = (d.tireDiaIn / 12) / 2;
  
  // Get gear ratio (clamp to valid range)
  const gearRatio = d.ratios[Math.min(gearIdx, d.ratios.length - 1)] || 1.0;
  
  // Torque at wheels (after gear multiplication and transmission losses)
  const wheelTorque_lbft = tq_lbft * gearRatio * d.finalDrive * d.transEff;
  
  // Force at contact patch: F = torque / radius
  const force_lb = wheelTorque_lbft / tireRadius_ft;
  
  return force_lb;
}

/**
 * Calculate vehicle speed from engine RPM.
 * Inverse of rpmFromSpeed.
 * 
 * @param rpm - Engine RPM
 * @param gearIdx - Current gear index (0-based)
 * @param d - Drivetrain configuration
 * @param slip - Tire slip factor
 * @returns Vehicle speed in feet per second
 */
export function speedFromRPM(
  rpm: number,
  gearIdx: number,
  d: Drivetrain,
  slip = 0
): number {
  // Get gear ratio
  const gearRatio = d.ratios[Math.min(gearIdx, d.ratios.length - 1)] || 1.0;
  
  // Wheel RPM
  const wheelRPM = rpm / (gearRatio * d.finalDrive * (1 + slip));
  
  // Wheel rotations per second
  const wheelRPS = wheelRPM / 60;
  
  // Tire diameter in feet
  const tireDia_ft = d.tireDiaIn / 12;
  
  // Wheel circumference
  const wheelCirc_ft = Math.PI * tireDia_ft;
  
  // Vehicle speed
  const v_fps = wheelRPS * wheelCirc_ft;
  
  return v_fps;
}
