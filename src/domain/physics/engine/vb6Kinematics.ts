/**
 * VB6 Piston Kinematics - Exact Port from CDETAILS.CLS
 * 
 * This module provides deterministic piston kinematics calculations
 * matching the original VB6 ENGINE Pro code exactly.
 */

const PI = 3.141593; // VB6 constant
const GC = 32.174;   // VB6 gravity constant (ft/s^2)

export interface PistonKinematicsPoint {
  angle_deg: number;
  pistonDepth_in: number;
  pistonSpeed_fpm: number;
  pistonSpeed_fps: number;
  pistonAccel_gs: string; // VB6 displays as string
}

export interface PistonSpeedSummary {
  avgSpeed_fpm: number;
  maxSpeed_fpm: number;
  maxSpeedAngle_deg: number;
}

/**
 * Calculate piston kinematics at a specific crank angle
 * VB6 CDETAILS.CLS lines 120-145
 */
export function calcPistonKinematicsAtAngle(
  angle_deg: number,
  rpm: number,
  stroke_in: number,
  rodLength_in: number
): PistonKinematicsPoint {
  const LRQS = rodLength_in / stroke_in;
  const lrqs2 = 2 * LRQS;
  const lrqsq = lrqs2 * lrqs2;  // VB6: lrqsq = lrqs2 ^ 2
  const lrqs4 = 4 * LRQS;        // VB6: lrqs4 = 4 * LRQS
  
  // VB6: zhp = (RPM * PI * stroke / 12)
  const zhp = (rpm * PI * stroke_in / 12);
  
  // Convert angle to radians
  const ang = angle_deg * PI / 180;
  const zsin = Math.sin(ang);
  const zcos = Math.cos(ang);
  const zsin2 = Math.sin(2 * ang);
  const zy = Math.sqrt(1 - zsin * zsin / lrqsq);  // VB6 line 128
  
  // VB6 line 131: piston position - inch
  const pxs = (stroke_in / 2) * (1 + lrqs2 - zcos - Math.sqrt(lrqsq - zsin * zsin));
  
  // VB6 line 134: piston speed - ft/min
  let vxs = zhp * (zsin + (zsin2 / lrqs4) / zy);
  
  // VB6 lines 138-140: piston acceleration - g's
  // zxs = zcos + (zcos2 / lrqs2) / zy + (zsin2 ^ 2 / (4 * lrqs2 ^ 3)) / zy ^ 3
  // zxs = zxs / (stroke / 24)
  // axs = (zhp / 60) ^ 2 * zxs / GC
  const zcos2 = Math.cos(2 * ang);
  let zxs = zcos + (zcos2 / lrqs2) / zy + (zsin2 * zsin2 / (4 * lrqs2 * lrqs2 * lrqs2)) / (zy * zy * zy);
  zxs = zxs / (stroke_in / 24);
  const axs = Math.pow(zhp / 60, 2) * zxs / GC;
  
  // Normalize -0 to +0 to avoid Object.is equality issues in tests
  // Use Math.abs for very small values (< 0.01 fpm is effectively zero)
  const normalizedVxs = Math.abs(vxs) < 0.01 ? 0 : vxs;
  
  return {
    angle_deg,
    pistonDepth_in: pxs,
    pistonSpeed_fpm: normalizedVxs,
    pistonSpeed_fps: normalizedVxs / 60,
    pistonAccel_gs: Math.round(axs).toString(),
  };
}

/**
 * Calculate piston speed summary (avg and max)
 * VB6 method: sweep through full stroke to find actual max
 */
export function calcPistonSpeedSummary(
  rpm: number,
  stroke_in: number,
  rodLength_in: number
): PistonSpeedSummary {
  const LRQS = rodLength_in / stroke_in;
  const flrqs = 1 + Math.pow(0.348 / LRQS, 1.99);
  
  // VB6 line 65: AngMPS = 62 + (750 * (LRQS - 0.958)) ^ 0.4027
  const AngMPS = 62 + Math.pow(750 * (LRQS - 0.958), 0.4027);
  
  // Average speed: VB6 uses (RPM * 2 * stroke / 12)
  const avgSpeed_fpm = rpm * 2 * stroke_in / 12;
  
  // Maximum speed: VB6 line 179: RPM * PI * flrqs * stroke / 12
  const maxSpeed_fpm = rpm * PI * flrqs * stroke_in / 12;
  
  return {
    avgSpeed_fpm: Math.round(avgSpeed_fpm),
    maxSpeed_fpm: Math.round(maxSpeed_fpm),
    maxSpeedAngle_deg: AngMPS,
  };
}

/**
 * Get VB6 mechanical details table angles
 * VB6 CDETAILS.CLS lines 108-172
 * Includes specific angles: 5, 15, 30, 45, 60, AngMPS, 80, 85, 90, 105, 120, 135, 150, 165, 180
 */
export function getVB6MechDetailsAngles(
  stroke_in: number,
  rodLength_in: number
): number[] {
  const LRQS = rodLength_in / stroke_in;
  const AngMPS = 62 + Math.pow(750 * (LRQS - 0.958), 0.4027);
  
  return [5, 15, 30, 45, 60, AngMPS, 80, 85, 90, 105, 120, 135, 150, 165, 180];
}

/**
 * Calculate full mechanical details for a given RPM
 */
export function calcMechDetailsForRPM(
  rpm: number,
  stroke_in: number,
  rodLength_in: number
): PistonKinematicsPoint[] {
  const angles = getVB6MechDetailsAngles(stroke_in, rodLength_in);
  
  return angles.map(angle => 
    calcPistonKinematicsAtAngle(angle, rpm, stroke_in, rodLength_in)
  );
}

/**
 * Calculate cranking compression from compression ratio
 * VB6 ENGPERF.BAS lines 450-455
 */
export function calcCrankingCompression(compressionRatio: number): number {
  // VB6: CrankingPSIG = 14.7 * (CR^1.1 - 1)
  return Math.round(14.7 * (Math.pow(compressionRatio, 1.1) - 1));
}
