/**
 * VB6 Cam Profile Lookup Tables and Interpolation
 * Exact port from CDETAILS.CLS lines 291-354, 382-399
 * 
 * Source: c:\Racing Systems Analysis\RSA\Reference Files\OtherRefFiles\EPro Family 12_24_2025\EPro3w\CDETAILS.CLS
 */

import { DTABY } from './vb6Interpolation';

/**
 * VB6 Cam Type Constants (CDETAILS.CLS lines 346-354)
 */
export enum VB6CamType {
  OverheadCam = 0,           // z50 = 69
  RollerCamLifter = 1,       // z50 = 67.1
  MushroomTappet = 2,        // z50 = 66.7
  HighRateFlatTappet = 3,    // z50 = 66.5
  NormalFlatTappet = 4,      // z50 = 66 (base case)
  HydraulicRoller = 5,       // z50 = 64
  NormalHydraulic = 6,       // z50 = 62.75
}

/**
 * VB6 Generic Cam Lift Profile Data (half profile - symmetric cam lobe)
 * CDETAILS.CLS lines 327-343
 * 
 * This is a 16x6 lookup table:
 * - xangle: 16 angle points from 0 to 114.3 degrees (% of half duration)
 * - z50: 6 columns for different cam aggressiveness (69, 67.75, 66.5, 65.25, 64, 62.75)
 * - ylift: 16x6 = 96 values, normalized lift percentages
 */

// VB6: z50(1 To 6) As Single
const VB6_Z50: number[] = [
  0,      // 0-index unused (VB6 is 1-based)
  69,     // 1: Overhead Cam
  67.75,  // 2
  66.5,   // 3: High Rate Flat Tappet
  65.25,  // 4
  64,     // 5: Hydraulic Roller
  62.75   // 6: Normal Hydraulic
];

// VB6: xangle(1 To 16) As Single
// Angle as % of half duration (0 = lobe centerline, 100 = valve closing @ .050)
const VB6_XANGLE: number[] = [
  0,      // 0-index unused
  0,      // 1: At lobe centerline
  8,      // 2
  15,     // 3
  23,     // 4
  31,     // 5
  40,     // 6
  50,     // 7: Half duration point
  58,     // 8
  66,     // 9
  73,     // 10
  80,     // 11
  87,     // 12
  94,     // 13
  100,    // 14: At valve closing @ .050
  106,    // 15: Beyond closing (negative lift)
  114.3   // 16: Valve seat contact
];

// VB6: ylift(1 To 96) As Single
// Flattened 16x6 array: ylift[row + (col-1)*16]
// Each column represents a different z50 value (cam aggressiveness)
const VB6_YLIFT: number[] = [
  0,      // 0-index unused
  // Column 1 (z50=69):
  100, 99.14, 97.38, 93.81, 88.59, 80.59, 69, 57.97, 45.47, 34.02, 22.96, 13.21, 5.32, 0, -3.97, -7.2,
  // Column 2 (z50=67.75):
  100, 99.05, 97.15, 93.37, 87.9, 79.61, 67.75, 56.61, 44.22, 33.06, 22.45, 13.12, 5.39, 0, -4.12, -7.2,
  // Column 3 (z50=66.5):
  100, 99.02, 97.04, 93.06, 87.33, 78.68, 66.5, 55.29, 43.1, 32.27, 22.02, 12.97, 5.38, 0, -4.19, -7.2,
  // Column 4 (z50=65.25):
  100, 99, 96.94, 92.76, 86.7, 77.64, 65.25, 54.15, 42.38, 32.03, 22.15, 13.2, 5.51, 0, -4.28, -7.2,
  // Column 5 (z50=64):
  100, 98.94, 96.76, 92.37, 86.04, 76.65, 64, 52.87, 41.28, 31.2, 21.6, 12.88, 5.38, 0, -4.2, -7.2,
  // Column 6 (z50=62.75):
  100, 98.91, 96.69, 92.2, 85.66, 75.9, 62.75, 51.29, 39.6, 29.69, 20.53, 12.36, 5.25, 0, -4.2, -7.2
];

/**
 * Get z50 value for cam type
 * VB6 CDETAILS.CLS lines 346-354
 */
function getZ50ForCamType(camType: VB6CamType): number {
  switch (camType) {
    case VB6CamType.OverheadCam:        return 69;
    case VB6CamType.RollerCamLifter:    return 67.1;
    case VB6CamType.MushroomTappet:     return 66.7;
    case VB6CamType.HighRateFlatTappet: return 66.5;
    case VB6CamType.NormalFlatTappet:   return 66;
    case VB6CamType.HydraulicRoller:    return 64;
    case VB6CamType.NormalHydraulic:    return 62.75;
    default:                            return 62.75;
  }
}

/**
 * Calculate valve lift at a given crank angle using VB6's exact interpolation
 * VB6 CDETAILS.CLS lines 382-399
 * 
 * @param angleDegATDC - Crank angle in degrees After Top Dead Center (0-720)
 * @param camType - VB6 cam type enum
 * @param duration050_deg - Cam duration at 0.050" lift
 * @param lobeCenterline_deg - Intake lobe centerline (degrees ATDC)
 * @param maxLift_in - Maximum valve lift in inches
 * @returns Valve lift in inches at the given crank angle
 */
export function vb6ValveLiftAtAngle(
  angleDegATDC: number,
  camType: VB6CamType,
  duration050_deg: number,
  lobeCenterline_deg: number,
  maxLift_in: number
): number {
  // VB6 line 346-354: Select z50 based on cam type
  const zz50 = getZ50ForCamType(camType);
  
  // VB6 lines 382-399: Determine valve lift
  // The logic uses different cases based on angle position relative to IVO/IVC
  
  const IVO = lobeCenterline_deg - duration050_deg / 2;  // Intake Valve Opening @ .050
  const IVC = lobeCenterline_deg + duration050_deg / 2;  // Intake Valve Closing @ .050
  
  // Check if valve is closed
  if (angleDegATDC < IVO || angleDegATDC > IVC) {
    return 0;
  }
  
  // VB6 Case 1 (line 383-384): At IVO @ .050
  if (angleDegATDC === IVO) {
    return 0.05;
  }
  
  // VB6 Case 7 (line 391): At lobe centerline (max lift)
  if (angleDegATDC === lobeCenterline_deg) {
    return maxLift_in;
  }
  
  // VB6 Case 12 (line 398): At IVC @ .050
  if (angleDegATDC === IVC) {
    return 0.05;
  }
  
  // VB6 Cases 2-6 (lines 386-389): Before lobe centerline
  if (angleDegATDC < lobeCenterline_deg) {
    // zang = 100 * (ILC - angle) / (duration/2)
    // This converts the angle to a percentage of half duration (0-100)
    const zang = 100 * (lobeCenterline_deg - angleDegATDC) / (duration050_deg / 2);
    
    // Call DTABY for 2D interpolation
    // VB6 line 388: Call DTABY(xangle(), z50(), ylift(), 16, 6, 2, 1, zang, zz50, work)
    const work = DTABY(VB6_XANGLE, VB6_Z50, VB6_YLIFT, 16, 6, 2, 1, zang, zz50);
    
    // VB6 line 389: vl = 0.05 + (maxLift - 0.05) * work / 100
    return 0.05 + (maxLift_in - 0.05) * work / 100;
  }
  
  // VB6 Cases 8-11 (lines 393-396): After lobe centerline
  if (angleDegATDC > lobeCenterline_deg) {
    // zang = 100 * (angle - ILC) / (duration/2)
    const zang = 100 * (angleDegATDC - lobeCenterline_deg) / (duration050_deg / 2);
    
    // Call DTABY for 2D interpolation
    // VB6 line 395: Call DTABY(xangle(), z50(), ylift(), 16, 6, 2, 1, zang, zz50, work)
    const work = DTABY(VB6_XANGLE, VB6_Z50, VB6_YLIFT, 16, 6, 2, 1, zang, zz50);
    
    // VB6 line 396: vl = 0.05 + (maxLift - 0.05) * work / 100
    return 0.05 + (maxLift_in - 0.05) * work / 100;
  }
  
  // Should never reach here
  return 0;
}

/**
 * VB6_TRACE: Debug logging for cam profile calculations
 * Enable by setting VB6_TRACE_ENABLED = true
 */
export const VB6_TRACE_ENABLED = false;

export function vb6TraceCamLift(
  label: string,
  angleDegATDC: number,
  zang: number,
  normalizedLift: number,
  finalLift_in: number
): void {
  if (VB6_TRACE_ENABLED) {
    console.log(`[VB6_TRACE CAM] ${label}:`);
    console.log(`  Angle ATDC: ${angleDegATDC.toFixed(1)}°`);
    console.log(`  Lookup angle (zang): ${zang.toFixed(2)}%`);
    console.log(`  Normalized lift: ${normalizedLift.toFixed(2)}%`);
    console.log(`  Final lift: ${finalLift_in.toFixed(3)}"`);
  }
}
