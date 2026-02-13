/**
 * VB6 ENGINE Subroutine - Builds synthetic HP curve from peak HP/RPM
 * 
 * This is the QuarterJr method for generating an HP curve when only
 * peak HP and peak RPM are known. It uses lookup tables based on
 * HP/CID ratio to create a realistic curve shape.
 * 
 * ============================================================================
 * VB6↔TS CROSSWALK (authoritative)
 * ============================================================================
 * Source: TIMESLIP.FRM lines 1758-1828
 * 
 * VB6 ENGINE subroutine:
 * ```vb
 * Private Sub ENGINE()
 * Dim N As Integer
 * Dim SX(16) As Single, sY(80) As Single, sz(5) As Single, sYS(16) As Single
 * Dim TQPHP As Single, TQ As Single, TQR As Single, HPCID As Single
 *     ' ... lookup table initialization ...
 *     TQPHP = Z6 * gc_PeakHP.Value / gc_RPMPeakHP.Value
 *     HPCID = (gc_PeakHP.Value / gc_Displacement.Value) / CalcWork
 *     ' ... clamp HPCID ...
 *     NHP = 16
 *     For N = 1 To NHP
 *         xrpm(N) = SX(N) * gc_RPMPeakHP.Value
 *         If gc_FuelSystem.Value = 8 Then
 *             TQ = sYS(N) * TQPHP
 *         Else
 *             Call DTABY(SX(), sz(), sY(), NHP, 5, 1, 1, SX(N), HPCID, TQR)
 *             TQ = TQR * TQPHP
 *         End If
 *         yhp(N) = xrpm(N) * TQ / Z6
 *         ztq(N) = TQ
 *     Next
 * End Sub
 * ```
 * 
 * VB6 Variable Types:
 *   SX(), sY(), sz(), sYS() - Single arrays (local)
 *   TQPHP, TQ, TQR, HPCID   - Single (local)
 *   xrpm(), yhp(), ztq()    - Single arrays (module-level, TIMESLIP.FRM:536-538)
 *   Z6                      - Double constant (DECLARES.BAS:12, no suffix)
 *   gc_*.Value              - Variant→Double (CValue returns Variant)
 * 
 * VB6 Coercion Rules:
 *   1. TQPHP = Z6 * ... → computed in Double (Z6 is Double), truncated to Single
 *   2. HPCID = ... → computed in Double, truncated to Single
 *   3. xrpm(N) = SX(N) * peakRPM → Single * Double → Double, truncated to Single
 *   4. TQ = TQR * TQPHP → Single * Single → Single (no promotion)
 *   5. yhp(N) = xrpm(N) * TQ / Z6 → Single * Single / Double → Double, truncated to Single
 * 
 * TS Implementation:
 *   - Uses vb6AssignSingle() at assignment boundaries to match VB6 truncation
 *   - Computes in Double precision (JS default)
 *   - Returns 1-indexed arrays to match VB6 module-level arrays
 * ============================================================================
 */

import { Z6 } from './constants';
import { dtaby } from './dtaby';
import { calcWork, type FuelSystemValue } from './calcWork';
import { vb6AssignSingle } from './exactMath';

// Normalized RPM points (fraction of peak RPM) - 0-indexed for DTABY
const SX_0 = [
  0.25, 0.5, 0.6, 0.65, 0.7, 0.75, 0.8, 0.85, 0.9, 0.95, 1.0, 1.05, 1.1, 1.15, 1.2, 1.25
];

// HP/CID ratio breakpoints - 0-indexed for DTABY
const SZ_0 = [0.7, 1.2, 1.7, 2.5, 3.4];

// Torque ratio lookup table flattened for DTABY (column-major order)
// 16 rows (RPM points) x 5 columns (HP/CID ratios)
// VB6: sY(row + (col-1)*16) where row=1..16, col=1..5
const SY_FLAT = [
  // Column 1: HP/CID = 0.7
  0.53, 0.975, 1.098, 1.13, 1.152, 1.16, 1.153, 1.122, 1.086, 1.045, 1.0, 0.938, 0.865, 0.795, 0.72, 0.63,
  // Column 2: HP/CID = 1.2
  0.365, 0.87, 1.018, 1.066, 1.11, 1.129, 1.132, 1.11, 1.079, 1.042, 1.0, 0.935, 0.855, 0.762, 0.66, 0.54,
  // Column 3: HP/CID = 1.7
  0.24, 0.79, 0.96, 1.023, 1.08, 1.106, 1.117, 1.102, 1.074, 1.04, 1.0, 0.932, 0.845, 0.736, 0.612, 0.474,
  // Column 4: HP/CID = 2.5
  0.1, 0.7, 0.894, 0.972, 1.04, 1.08, 1.096, 1.09, 1.069, 1.037, 1.0, 0.928, 0.83, 0.698, 0.55, 0.39,
  // Column 5: HP/CID = 3.4
  0, 0.63, 0.84, 0.924, 1.0, 1.055, 1.079, 1.082, 1.064, 1.035, 1.0, 0.923, 0.815, 0.662, 0.49, 0.31,
];

// Legacy 1-indexed arrays for backward compatibility
const SX = [
  0,      // placeholder for 1-indexing
  0.25, 0.5, 0.6, 0.65, 0.7, 0.75, 0.8, 0.85, 0.9, 0.95, 1.0, 1.05, 1.1, 1.15, 1.2, 1.25
];

const SZ = [0, 0.7, 1.2, 1.7, 2.5, 3.4]; // 1-indexed

// Supercharged nitro torque ratios (special case)
const SYS = [
  0,      // placeholder for 1-indexing
  0, 0.61, 0.8, 0.9, 0.98, 1.035, 1.055, 1.06, 1.05, 1.03, 1.0, 0.93, 0.85, 0.765, 0.67, 0.58
];

/**
 * 2D interpolation for torque ratio lookup using DTABY
 * VB6: Call DTABY(SX(), sz(), sY(), NHP, 5, 1, 1, SX(N), HPCID, TQR)
 */
function interpolateTorqueRatio(rpmRatio: number, hpCidRatio: number): number {
  // Use proper DTABY 2D Lagrangian interpolation
  // LX=1, LZ=1 means linear interpolation in both dimensions
  return dtaby(
    SX_0,      // X values (RPM ratios)
    SZ_0,      // Z values (HP/CID ratios)
    SY_FLAT,   // Y values (torque ratios, flattened column-major)
    16,        // NX = 16 RPM points
    5,         // NZ = 5 HP/CID points
    1,         // LX = 1 (linear in X)
    1,         // LZ = 1 (linear in Z)
    rpmRatio,  // XVAL
    hpCidRatio // ZVAL
  );
}

export interface EngineCurveInputs {
  peakHP: number;
  peakRPM: number;
  displacement_cid: number;
  fuelSystem: number;  // 1-5 = naturally aspirated, 6+ = supercharged, 8 = nitro
}

export interface EngineCurveResult {
  xrpm: number[];  // RPM points (1-indexed, 16 points)
  yhp: number[];   // HP at each RPM point
  ztq: number[];   // Torque at each RPM point
  NHP: number;     // Number of points (16)
}

/**
 * Build synthetic HP curve from peak HP/RPM (QuarterJr method)
 * 
 * This replicates the VB6 ENGINE subroutine from TIMESLIP.FRM
 * with correct Single truncation at assignment boundaries.
 */
export function buildEngineCurve(inputs: EngineCurveInputs): EngineCurveResult {
  const { peakHP, peakRPM, displacement_cid, fuelSystem } = inputs;
  
  // VB6 1804: TQPHP = Z6 * gc_PeakHP.Value / gc_RPMPeakHP.Value
  // Z6 is Double, gc_*.Value is Variant→Double, TQPHP is Single
  // Computed in Double, truncated to Single on assignment
  const TQPHP = vb6AssignSingle(Z6 * peakHP / peakRPM);
  
  // VB6 1806: HPCID = (gc_PeakHP.Value / gc_Displacement.Value) / CalcWork
  // Computed in Double, truncated to Single on assignment
  const workMultiplier = calcWork(fuelSystem as FuelSystemValue);
  let HPCID = vb6AssignSingle((peakHP / displacement_cid) / workMultiplier);
  
  // VB6 1807-1812: Clamp HP/CID ratio to valid range
  if (fuelSystem <= 5) {
    // Naturally aspirated
    if (HPCID < SZ[1]) HPCID = vb6AssignSingle(SZ[1]); // 0.7
  } else {
    // Supercharged
    if (HPCID < SZ[2]) HPCID = vb6AssignSingle(SZ[2]); // 1.2
  }
  if (HPCID > SZ[5]) HPCID = vb6AssignSingle(SZ[5]); // 3.4
  
  const xrpm: number[] = [0]; // 1-indexed
  const yhp: number[] = [0];
  const ztq: number[] = [0];
  
  const NHP = 16;
  
  // VB6 1815-1827: Build curve points
  for (let n = 1; n <= NHP; n++) {
    // VB6 1816: xrpm(N) = SX(N) * gc_RPMPeakHP.Value
    // SX is Single, peakRPM is Double → computed in Double, truncated to Single
    xrpm[n] = vb6AssignSingle(SX[n] * peakRPM);
    
    let TQ: number;
    if (fuelSystem === 8) {
      // VB6 1819: TQ = sYS(N) * TQPHP (supercharged nitro)
      // Both Single → stays Single
      TQ = vb6AssignSingle(SYS[n] * TQPHP);
    } else {
      // VB6 1821-1822: Call DTABY(..., TQR): TQ = TQR * TQPHP
      // TQR is Single (ByRef output), TQPHP is Single → stays Single
      const TQR = vb6AssignSingle(interpolateTorqueRatio(SX[n], HPCID));
      TQ = vb6AssignSingle(TQR * TQPHP);
    }
    
    // VB6 1825: yhp(N) = xrpm(N) * TQ / Z6
    // xrpm and TQ are Single, Z6 is Double → computed in Double, truncated to Single
    yhp[n] = vb6AssignSingle(xrpm[n] * TQ / Z6);
    // VB6 1826: ztq(N) = TQ (Single to Single, no change)
    ztq[n] = TQ;
  }
  
  return { xrpm, yhp, ztq, NHP };
}

/**
 * Convert 1-indexed arrays to 0-indexed for use in simulation
 */
export function convertToZeroIndexed(curve: EngineCurveResult): { rpm: number[]; hp: number[] } {
  const rpm: number[] = [];
  const hp: number[] = [];
  
  for (let i = 1; i <= curve.NHP; i++) {
    rpm.push(curve.xrpm[i]);
    hp.push(curve.yhp[i]);
  }
  
  return { rpm, hp };
}
