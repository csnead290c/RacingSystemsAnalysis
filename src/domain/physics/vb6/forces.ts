/**
 * VB6-ported force calculations.
 * 
 * TODO: Verify these formulas against VB6 source once we locate
 * the exact force calculation routines.
 */

import { g } from './constants';

/**
 * Calculate rolling resistance torque.
 * 
 * Formula: T_rr = (rrCoeff * weight * g) * tireRadius
 * 
 * @param weightLb - Vehicle weight (lb)
 * @param rrCoeff - Rolling resistance coefficient (dimensionless)
 * @param tireRadiusFt - Tire radius (ft)
 * @returns Rolling resistance torque (lb-ft)
 */
export function vb6RollingResistanceTorque(
  weightLb: number,
  rrCoeff: number,
  tireRadiusFt: number
): number {
  // F_rr = rrCoeff * weight * g
  // T_rr = F_rr * tireRadius
  const F_rr = rrCoeff * weightLb * g;
  const T_rr = F_rr * tireRadiusFt;
  return T_rr;
}

/**
 * Calculate aerodynamic drag torque.
 * 
 * Formula: 
 *   F_d = 0.5 * rho * cd * area * v²
 *   T_d = F_d * tireRadius
 * 
 * @param rho - Air density (slugs/ft³)
 * @param cd - Drag coefficient (dimensionless)
 * @param areaFt2 - Frontal area (ft²)
 * @param vFps - Velocity (ft/s)
 * @param tireRadiusFt - Tire radius (ft)
 * @returns Aerodynamic drag torque (lb-ft)
 */
export function vb6AeroTorque(
  rho: number,
  cd: number,
  areaFt2: number,
  vFps: number,
  tireRadiusFt: number
): number {
  // Standard aerodynamic drag equation
  const F_d = 0.5 * rho * cd * areaFt2 * vFps * vFps;
  const T_d = F_d * tireRadiusFt;
  return T_d;
}

/**
 * Calculate aerodynamic lift force.
 * 
 * Formula: F_lift = 0.5 * rho * cl * area * v²
 * 
 * TODO: Port VB6 lift calculation and verify if it affects weight transfer.
 * 
 * @param rho - Air density (slugs/ft³)
 * @param cl - Lift coefficient (dimensionless, negative for downforce)
 * @param areaFt2 - Reference area (ft²)
 * @param vFps - Velocity (ft/s)
 * @returns Lift force (lb, positive = lift, negative = downforce)
 */
export function vb6AeroLift(
  rho: number,
  cl: number,
  areaFt2: number,
  vFps: number
): number {
  // Standard aerodynamic lift equation
  const F_lift = 0.5 * rho * cl * areaFt2 * vFps * vFps;
  return F_lift;
}
