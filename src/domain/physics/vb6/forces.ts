/**
 * VB6-ported force calculations.
 * Source: TIMESLIP.FRM lines 1016-1020, 1192-1193
 * 
 * VB6 uses a complex drag model with:
 * - Rolling resistance (CMU coefficient)
 * - Speed-dependent rolling resistance (0.0001 * weight * speed)
 * - Aerodynamic drag (0.5 * rho * cd * area * v²)
 * - Distance-dependent CMU reduction (CMUK)
 */

import { gc } from './constants';
// Z5 is documented in comments but not used in simplified implementation

/**
 * Calculate VB6 rolling resistance force.
 * 
 * VB6 Source: TIMESLIP.FRM lines 1019, 1192-1193
 * 
 * VB6 Formula (initial):
 *   DragForce = CMU * gc_Weight.Value + gc_DragCoef.Value * gc_RefArea.Value * q
 * 
 * VB6 Formula (during run):
 *   cmu1 = CMU - (Dist0 / 1320) * CMUK
 *   DragForce = cmu1 * DownForce + 0.0001 * DownForce * (Z5 * Vel(L)) + gc_DragCoef.Value * RefArea2 * q
 * 
 * Where:
 * - CMU = rolling resistance coefficient (TIMESLIP.FRM:552, typically 0.025 for QJr/QPro)
 * - CMUK = distance-dependent reduction (TIMESLIP.FRM:553, typically 0.01 for QJr/QPro)
 * - 0.0001 * weight * speed = speed-dependent rolling resistance
 * - DownForce = weight + lift effects
 * 
 * For simplicity, we use the constant CMU model without distance reduction.
 * 
 * @param weightLb - Vehicle weight (lb)
 * @param cmu - Rolling resistance coefficient (dimensionless, typically 0.025)
 * @returns Rolling resistance force (lb)
 */
export function vb6RollingResistanceForce(
  weightLb: number,
  cmu: number
): number {
  // VB6: TIMESLIP.FRM:1019 (initial)
  // DragForce = CMU * gc_Weight.Value + ...
  // Note: This is the constant component only
  const F_rr = cmu * weightLb;
  return F_rr;
}

/**
 * Calculate VB6 rolling resistance torque.
 * 
 * @param weightLb - Vehicle weight (lb)
 * @param cmu - Rolling resistance coefficient (dimensionless, typically 0.025)
 * @param tireRadiusFt - Tire radius (ft)
 * @returns Rolling resistance torque (lb-ft)
 */
export function vb6RollingResistanceTorque(
  weightLb: number,
  cmu: number,
  tireRadiusFt: number
): number {
  const F_rr = vb6RollingResistanceForce(weightLb, cmu);
  const T_rr = F_rr * tireRadiusFt;
  return T_rr;
}

/**
 * Calculate VB6 aerodynamic drag force.
 * 
 * VB6 Source: TIMESLIP.FRM lines 1016-1019, 1193
 * 
 * VB6 Formula:
 *   WindFPS = Sqr(Vel(L)^2 + 2*Vel(L)*(WindSpeed/Z5)*Cos(PI*WindAngle/180) + (WindSpeed/Z5)^2)
 *   q = Sgn(WindFPS) * rho * Abs(WindFPS)^2 / (2 * gc)
 *   DragForce = ... + gc_DragCoef.Value * gc_RefArea.Value * q
 * 
 * Where:
 * - q = dynamic pressure (psf)
 * - gc = gravitational constant (32.174 ft/s²)
 * - Z5 = 3600/5280 (conversion factor)
 * 
 * For no wind: WindFPS = Vel(L), so q = rho * Vel(L)^2 / (2 * gc)
 * 
 * Standard aero drag: F_d = 0.5 * rho * cd * area * v²
 * VB6 aero drag: F_d = cd * area * (rho * v² / (2 * gc))
 * 
 * These are equivalent since gc = 32.174 and rho is in slugs/ft³.
 * 
 * @param rho - Air density (slugs/ft³)
 * @param cd - Drag coefficient (dimensionless)
 * @param areaFt2 - Frontal area (ft²)
 * @param vFps - Velocity (ft/s)
 * @returns Aerodynamic drag force (lb)
 */
export function vb6AeroDragForce(
  rho: number,
  cd: number,
  areaFt2: number,
  vFps: number
): number {
  // VB6: TIMESLIP.FRM:1017, 1019
  // q = rho * vFps^2 / (2 * gc)
  // DragForce = cd * area * q
  const q = rho * vFps * vFps / (2 * gc);
  const F_d = cd * areaFt2 * q;
  return F_d;
}

/**
 * Calculate VB6 aerodynamic drag torque.
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
  const F_d = vb6AeroDragForce(rho, cd, areaFt2, vFps);
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
