/**
 * Drivetrain model for RSACLASSIC physics engine.
 * Handles gear ratios, final drive, and force/RPM calculations.
 */

import { F, f32 } from '../vb6/exactMath';

/**
 * Tolerant accessor for gear ratios.
 * Accepts both `ratios` (Drivetrain interface) and `gearRatios` (VB6 format).
 * Returns empty array if neither is present.
 * 
 * @param d - Drivetrain-like object with ratios or gearRatios
 * @returns Array of gear ratios (never undefined)
 */
export function getGearRatios(d: any): number[] {
  if (Array.isArray(d?.ratios) && d.ratios.length > 0) {
    return d.ratios;
  }
  if (Array.isArray(d?.gearRatios) && d.gearRatios.length > 0) {
    return d.gearRatios;
  }
  return [];
}

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
  d: Drivetrain | any,
  slip = 0
): number {
  // Convert tire diameter to feet
  const tireDia_ft = (d.tireDiaIn ?? 28) / 12;
  
  // Wheel circumference in feet
  const wheelCirc_ft = Math.PI * tireDia_ft;
  
  // Wheel rotations per second
  const wheelRPS = v_fps / wheelCirc_ft;
  
  // Wheel rotations per minute
  const wheelRPM = wheelRPS * 60;
  
  // Get gear ratios using tolerant accessor
  const ratios = getGearRatios(d);
  const gearRatio = ratios.length > 0 
    ? (ratios[Math.min(gearIdx, ratios.length - 1)] ?? 1.0)
    : 1.0;
  
  // Engine RPM accounting for gear ratio, final drive, and slip
  const rpm = wheelRPM * gearRatio * (d.finalDrive ?? 3.73) * (1 + slip);
  
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
  d: Drivetrain | any
): number {
  // Convert tire diameter to radius in feet
  const tireRadius_ft = ((d.tireDiaIn ?? 28) / 12) / 2;
  
  // Get gear ratios using tolerant accessor
  const ratios = getGearRatios(d);
  const gearRatio = ratios.length > 0 
    ? (ratios[Math.min(gearIdx, ratios.length - 1)] ?? 1.0)
    : 1.0;
  
  // Torque at wheels (after gear multiplication and transmission losses)
  const wheelTorque_lbft = tq_lbft * gearRatio * (d.finalDrive ?? 3.73) * (d.transEff ?? 0.9);
  
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
  d: Drivetrain | any,
  slip = 0
): number {
  // Get gear ratios using tolerant accessor
  const ratios = getGearRatios(d);
  const gearRatio = ratios.length > 0 
    ? (ratios[Math.min(gearIdx, ratios.length - 1)] ?? 1.0)
    : 1.0;
  
  // Wheel RPM
  const wheelRPM = rpm / (gearRatio * (d.finalDrive ?? 3.73) * (1 + slip));
  
  // Wheel rotations per second
  const wheelRPS = wheelRPM / 60;
  
  // Tire diameter in feet
  const tireDia_ft = (d.tireDiaIn ?? 28) / 12;
  
  // Wheel circumference
  const wheelCirc_ft = Math.PI * tireDia_ft;
  
  // Vehicle speed
  const v_fps = wheelRPS * wheelCirc_ft;
  
  return v_fps;
}

// ============================================================================
// VB6-STRICT Float32 versions
// ============================================================================

/**
 * VB6-STRICT: Calculate engine RPM from vehicle speed using Float32.
 * Matches VB6's exact calculation order and precision.
 */
export function rpmFromSpeed_f32(
  v_fps: number,
  gearIdx: number,
  d: Drivetrain | any,
  slip = 0
): number {
  const tireDia_ft = F.div(f32(d.tireDiaIn ?? 28), f32(12));
  const wheelCirc_ft = F.mul(f32(Math.PI), tireDia_ft);
  const wheelRPS = F.div(f32(v_fps), wheelCirc_ft);
  const wheelRPM = F.mul(wheelRPS, f32(60));
  
  const ratios = getGearRatios(d);
  const gearRatio = f32(ratios.length > 0 
    ? (ratios[Math.min(gearIdx, ratios.length - 1)] ?? 1.0)
    : 1.0);
  
  const finalDrive = f32(d.finalDrive ?? 3.73);
  const slipFactor = F.add(f32(1), f32(slip));
  
  // rpm = wheelRPM * gearRatio * finalDrive * (1 + slip)
  return F.mul(F.mul(F.mul(wheelRPM, gearRatio), finalDrive), slipFactor);
}

/**
 * VB6-STRICT: Calculate wheel force from engine torque using Float32.
 * VB6 order: torque * torqueMultEff * gearRatio * finalDrive * perGearEff * overallEff / tireRadius
 * 
 * @param tq_lbft - Engine torque in lb-ft
 * @param gearIdx - Current gear index (0-based)
 * @param d - Drivetrain configuration
 * @param perGearEff - Per-gear efficiency array
 * @param overallEff - Overall driveline efficiency
 * @param torqueMultEff - Converter torque multiplication (Work factor), 1.0 for clutch
 */
export function wheelForce_f32(
  tq_lbft: number,
  gearIdx: number,
  d: Drivetrain | any,
  perGearEff?: number[],
  overallEff?: number,
  torqueMultEff?: number  // STRICT converter torque ratio (Work factor)
): number {
  const tireRadius_ft = F.div(F.div(f32(d.tireDiaIn ?? 28), f32(12)), f32(2));
  
  const ratios = getGearRatios(d);
  const gearRatio = f32(ratios.length > 0 
    ? (ratios[Math.min(gearIdx, ratios.length - 1)] ?? 1.0)
    : 1.0);
  
  const finalDrive = f32(d.finalDrive ?? 3.73);
  
  // Apply converter torque multiplication FIRST (before gearing)
  // This is the key fix: converter Work boosts torque at trans input
  const T_boosted = f32(tq_lbft * (torqueMultEff ?? 1.0));
  
  // VB6 order: T * gearRatio * finalDrive first
  let T_wheel = F.mul(F.mul(T_boosted, gearRatio), finalDrive);
  
  // Then apply per-gear efficiency
  const gearEff = f32(perGearEff?.[gearIdx] ?? d.transEff ?? 0.97);
  T_wheel = F.mul(T_wheel, gearEff);
  
  // Then apply overall efficiency
  const eff = f32(overallEff ?? d.transEff ?? 0.97);
  T_wheel = F.mul(T_wheel, eff);
  
  // Force = torque / radius
  return F.div(T_wheel, tireRadius_ft);
}
