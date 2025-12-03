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
 * - CMU = 0.025 (Quarter Jr/Pro), 0.03 (Bonneville)
 * - CMUK = 0.01 (Quarter Jr/Pro), 0 (Bonneville)
 * - DownForce = Weight + LiftCoef * RefArea * q (includes lift/downforce)
 * - Z5 = 3600/5280 = 0.6818... (fps to mph conversion)
 * 
 * @param downForce_lbf - Downforce on tires (weight + aero lift/downforce)
 * @param v_fps - Vehicle velocity (ft/s)
 * @param distance_ft - Distance traveled (ft) - affects cmu1
 * @param cmu - Base rolling resistance coefficient (0.025 for Quarter)
 * @param cmuk - Distance decay coefficient (0.01 for Quarter)
 * @returns Rolling resistance force (lb)
 */
export function vb6RollingResistanceForce(
  downForce_lbf: number,
  v_fps: number,
  distance_ft: number,
  cmu: number = 0.025,
  cmuk: number = 0.01
): number {
  // VB6: cmu1 = CMU - (Dist0 / 1320) * CMUK
  const cmu1 = cmu - (distance_ft / 1320) * cmuk;
  
  // VB6: Z5 = 3600 / 5280 (fps to mph conversion)
  const Z5 = 3600 / 5280;
  
  // VB6: RollingForce = cmu1 * DownForce + 0.0001 * DownForce * (Z5 * Vel(L))
  const F_rr_constant = cmu1 * downForce_lbf;
  const F_rr_speed = 0.0001 * downForce_lbf * (Z5 * v_fps);
  const F_rr = F_rr_constant + F_rr_speed;
  
  return F_rr;
}

/**
 * Calculate VB6 rolling resistance torque.
 * 
 * @param downForce_lbf - Downforce on tires (weight + aero lift/downforce)
 * @param v_fps - Vehicle velocity (ft/s)
 * @param distance_ft - Distance traveled (ft) - affects cmu1
 * @param tireRadiusFt - Tire radius (ft)
 * @param cmu - Base rolling resistance coefficient (0.025 for Quarter)
 * @param cmuk - Distance decay coefficient (0.01 for Quarter)
 * @returns Rolling resistance torque (lb-ft)
 */
export function vb6RollingResistanceTorque(
  downForce_lbf: number,
  v_fps: number,
  distance_ft: number,
  tireRadiusFt: number,
  cmu: number = 0.025,
  cmuk: number = 0.01
): number {
  const F_rr = vb6RollingResistanceForce(downForce_lbf, v_fps, distance_ft, cmu, cmuk);
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
 * VB6 Source: TIMESLIP.FRM:1191
 * DownForce = gc_Weight.Value + gc_LiftCoef.Value * RefArea2 * q
 * 
 * Where q = rho * v² / (2 * gc) (dynamic pressure)
 * 
 * So lift force = cl * area * q = cl * area * rho * v² / (2 * gc)
 * 
 * Note: VB6 uses positive lift coefficient for upward lift (reduces downforce).
 * The result is added to weight to get DownForce.
 * 
 * @param rho - Air density (slugs/ft³)
 * @param cl - Lift coefficient (dimensionless, positive = upward lift)
 * @param areaFt2 - Reference area (ft²)
 * @param vFps - Velocity (ft/s)
 * @returns Lift force (lb, positive = upward lift)
 */
export function vb6AeroLift(
  rho: number,
  cl: number,
  areaFt2: number,
  vFps: number
): number {
  // VB6: q = rho * v² / (2 * gc)
  // VB6: LiftForce = cl * area * q
  const q = rho * vFps * vFps / (2 * gc);
  const F_lift = cl * areaFt2 * q;
  return F_lift;
}
