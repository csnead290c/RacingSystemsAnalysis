/**
 * VB6 Dyno Curve Generation
 * 
 * Ports the exact VB6 curve generation algorithm from Cgraph.CLS
 * Uses empirical lookup tables to generate curve shapes based on HP/CID
 * Uses VB6 LAGRANGIAN INTERPOLATION from RSALIB.BAS
 */

import { CONSTANTS } from './engineConstants';
import { TABY as TABY_VB6, DTABY as DTABY_VB6 } from './vb6Interpolation';

// VB6 lookup tables from Cgraph.CLS Class_Initialize
// SX = RPM ratio points (RPM / RPM@PeakHP)
const SX = [
  0, // dummy for 1-based indexing
  0.25, 0.5, 0.6, 0.65, 0.7, 0.75, 0.8, 0.85, 0.9,
  0.95, 1.0, 1.02, 1.05, 1.1, 1.15, 1.2, 1.25
];

// sz = HP/CID breakpoints
const sz = [
  0, // dummy for 1-based indexing
  0.7, 1.2, 1.7, 2.5, 3.4
];

// sy = TQ ratio values (TQ / TQ@PeakHP) for each SX and sz combination
// sy[i + (j-1)*17] where i=1-17 (SX index), j=1-5 (sz index)
const sy = [
  0, // dummy for 1-based indexing
  // sz=0.7 (low HP/CID)
  0.53, 0.975, 1.098, 1.13, 1.152, 1.16, 1.153, 1.122, 1.086,
  1.045, 1.0, 0.978, 0.938, 0.865, 0.795, 0.72, 0.63,
  // sz=1.2
  0.365, 0.87, 1.018, 1.066, 1.11, 1.129, 1.132, 1.11, 1.079,
  1.042, 1.0, 0.977, 0.935, 0.855, 0.762, 0.66, 0.54,
  // sz=1.7
  0.24, 0.79, 0.96, 1.023, 1.08, 1.106, 1.117, 1.102, 1.074,
  1.04, 1.0, 0.976, 0.932, 0.845, 0.736, 0.612, 0.474,
  // sz=2.5
  0.1, 0.7, 0.894, 0.972, 1.04, 1.08, 1.096, 1.09, 1.069,
  1.037, 1.0, 0.974, 0.928, 0.83, 0.698, 0.55, 0.39,
  // sz=3.4 (high HP/CID)
  0, 0.63, 0.84, 0.924, 1.0, 1.055, 1.079, 1.082, 1.064,
  1.035, 1.0, 0.973, 0.923, 0.815, 0.662, 0.49, 0.31
];


/**
 * VB6 ENGINE function - Generate 29-point curve from lookup tables
 * From Cgraph.CLS lines 293-319
 */
function generateEngineCurve(
  peakHP: number,
  rpmAtPeakHP: number,
  CID: number
): { rpm: number[]; tq: number[] } {
  const rpm = new Array(30).fill(0);  // 1-based, 29 points
  const tq = new Array(30).fill(0);   // 1-based, 29 points
  
  const TQPHP = CONSTANTS.Z6 * peakHP / rpmAtPeakHP;
  let HPCID = peakHP / CID;
  
  // Clamp HP/CID to table range
  if (HPCID < sz[1]) HPCID = sz[1];
  if (HPCID > sz[5]) HPCID = sz[5];
  
  // Generate odd points (1, 3, 5, ..., 29)
  for (let n = 1; n <= 29; n += 2) {
    const idx = (n + 3) / 2;
    const RPMR = SX[idx];
    rpm[n] = RPMR * rpmAtPeakHP;
    const TQR = DTABY_VB6(SX, sz, sy, 17, 5, 3, 2, RPMR, HPCID);
    tq[n] = TQR * TQPHP;
  }
  
  // Generate even points (2, 4, 6, ..., 28) - midpoints
  for (let n = 2; n <= 28; n += 2) {
    const idx1 = (n + 2) / 2;
    const idx2 = (n + 4) / 2;
    const RPMR = (SX[idx1] + SX[idx2]) / 2;
    rpm[n] = RPMR * rpmAtPeakHP;
    const TQR = DTABY_VB6(SX, sz, sy, 17, 5, 3, 2, RPMR, HPCID);
    tq[n] = TQR * TQPHP;
  }
  
  return { rpm, tq };
}

/**
 * Generate VB6-accurate dyno curve
 * From Cgraph.CLS CalcGraph function
 */
export function generateVB6DynoCurve(
  peakHP: number,
  rpmAtPeakHP: number,
  peakTQ: number,
  rpmAtPeakTQ: number,
  redlineRPM: number,
  CID: number
): { rpm: number; hp: number; torque_lbft: number }[] {
  const NHP = 29;
  
  // Generate initial 29-point curve from lookup tables
  const { rpm: xxrpm, tq: yytq } = generateEngineCurve(peakHP, rpmAtPeakHP, CID);
  
  // Find peak TQ point on the generated curve
  let TQMax = 0;
  let TQRPM = 0;
  for (let k = 1; k <= NHP; k++) {
    if (yytq[k] > TQMax) {
      TQMax = yytq[k];
      TQRPM = xxrpm[k];
    }
  }
  
  // Adjust curve to match calculated peak values
  // VB6 lines 184-208
  const DRPM = rpmAtPeakTQ - TQRPM;
  const DTQ = peakTQ / TQMax - 1;
  
  const yyhp = new Array(30).fill(0);
  
  for (let k = 1; k <= NHP; k++) {
    // Adjust TQ values (VB6 lines 187-193)
    if (xxrpm[k] <= TQRPM) {
      yytq[k] = yytq[k] + (peakTQ - TQMax);
    } else if (xxrpm[k] > TQRPM && xxrpm[k] < rpmAtPeakHP) {
      yytq[k] = yytq[k] * (1 + DTQ * Math.pow((rpmAtPeakHP - xxrpm[k]) / (rpmAtPeakHP - TQRPM), 2));
    } else if (xxrpm[k] >= rpmAtPeakHP) {
      yytq[k] = yytq[k] * (1 + 0.8 * DTQ * Math.pow((rpmAtPeakHP - xxrpm[k]) / (rpmAtPeakHP - TQRPM), 2));
    }
    
    // Adjust RPM values (VB6 lines 195-201)
    if (xxrpm[k] <= TQRPM) {
      xxrpm[k] = xxrpm[k] + DRPM;
    } else if (xxrpm[k] > TQRPM && xxrpm[k] < rpmAtPeakHP) {
      xxrpm[k] = xxrpm[k] + DRPM * (rpmAtPeakHP - xxrpm[k]) / (rpmAtPeakHP - TQRPM);
    } else if (xxrpm[k] >= rpmAtPeakHP) {
      xxrpm[k] = xxrpm[k] + 0.8 * DRPM * (rpmAtPeakHP - xxrpm[k]) / (rpmAtPeakHP - TQRPM);
    }
    
    // Calculate HP from adjusted TQ
    yyhp[k] = yytq[k] * xxrpm[k] / CONSTANTS.Z6;
    if (yyhp[k] > peakHP) {
      yyhp[k] = peakHP;
      yytq[k] = yyhp[k] * CONSTANTS.Z6 / xxrpm[k];
    }
  }
  
  // Determine graph X-axis range
  // VB6 lines 211-222
  let XMin = Math.floor(0.9 * rpmAtPeakTQ / 500) * 500;
  if (XMin < 0) XMin = 0;
  
  let XMax = Math.ceil(redlineRPM / 500) * 500;
  if (XMax > Math.ceil((rpmAtPeakHP + 500) / 500) * 500) {
    XMax = Math.ceil((rpmAtPeakHP + 500) / 500) * 500;
  }
  if (XMax < rpmAtPeakHP + 1000) {
    XMax = Math.ceil((rpmAtPeakHP + 500) / 500) * 500;
  }
  
  // Generate final curve points by interpolating
  // VB6 uses 125 RPM increments, up to 33 points (VB6 lines 218-222)
  const DRPM_final = 125;
  let NX = Math.floor((XMax - XMin) / DRPM_final) + 1;
  if (NX > 33) {
    XMin = XMin + (NX - 33) * DRPM_final;
    NX = 33;
  }
  
  const curve: { rpm: number; hp: number; torque_lbft: number }[] = [];
  
  for (let k = 0; k < NX; k++) {
    const rpm = XMin + k * DRPM_final;
    let tq = TABY_VB6(xxrpm, yytq, NHP, 2, rpm);
    if (tq > peakTQ) tq = peakTQ;
    
    let hp = tq * rpm / CONSTANTS.Z6;
    if (hp > peakHP) {
      hp = peakHP;
      tq = hp * CONSTANTS.Z6 / rpm;
    }
    
    curve.push({
      rpm,
      hp: Math.round(hp),
      torque_lbft: Math.round(tq)
    });
  }
  
  return curve;
}
