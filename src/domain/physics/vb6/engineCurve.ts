/**
 * VB6 ENGINE Subroutine - Builds synthetic HP curve from peak HP/RPM
 * 
 * This is the QuarterJr method for generating an HP curve when only
 * peak HP and peak RPM are known. It uses lookup tables based on
 * HP/CID ratio to create a realistic curve shape.
 * 
 * From TIMESLIP.FRM lines 1758-1828
 */

import { Z6 } from './constants';
import { dtaby } from './dtaby';
import { calcWork, type FuelSystemValue } from './calcWork';

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
 */
export function buildEngineCurve(inputs: EngineCurveInputs): EngineCurveResult {
  const { peakHP, peakRPM, displacement_cid, fuelSystem } = inputs;
  
  // Calculate torque at peak HP
  // TQPHP = Z6 * gc_PeakHP.Value / gc_RPMPeakHP.Value
  const TQPHP = Z6 * peakHP / peakRPM;
  
  // Calculate HP/CID ratio (normalized by CalcWork based on fuel system)
  // HPCID = (gc_PeakHP.Value / gc_Displacement.Value) / CalcWork
  const workMultiplier = calcWork(fuelSystem as FuelSystemValue);
  let HPCID = (peakHP / displacement_cid) / workMultiplier;
  
  // Clamp HP/CID ratio to valid range
  if (fuelSystem <= 5) {
    // Naturally aspirated
    if (HPCID < SZ[1]) HPCID = SZ[1]; // 0.7
  } else {
    // Supercharged
    if (HPCID < SZ[2]) HPCID = SZ[2]; // 1.2
  }
  if (HPCID > SZ[5]) HPCID = SZ[5]; // 3.4
  
  const xrpm: number[] = [0]; // 1-indexed
  const yhp: number[] = [0];
  const ztq: number[] = [0];
  
  const NHP = 16;
  
  for (let n = 1; n <= NHP; n++) {
    // RPM at this point
    xrpm[n] = SX[n] * peakRPM;
    
    let TQ: number;
    if (fuelSystem === 8) {
      // Supercharged nitro - use special curve
      TQ = SYS[n] * TQPHP;
    } else {
      // Everything else - interpolate from lookup table
      const TQR = interpolateTorqueRatio(SX[n], HPCID);
      TQ = TQR * TQPHP;
    }
    
    // HP = RPM * TQ / Z6
    yhp[n] = xrpm[n] * TQ / Z6;
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
