/**
 * VB6 Printed Row Stream
 * 
 * This module implements the VB6 AddListLine print trigger semantics.
 * VB6 prints rows at specific trigger points, NOT at every simulation step.
 * 
 * VB6 Print Triggers (TIMESLIP.FRM):
 * 1. Line 1059: Staged row (L=1, initial state)
 * 2. Line 1363: Time-based print when PrintFlag=1 and L=1
 * 3. Line 1368: Time-based print when PrintFlag=1 and time/dist differ from previous
 * 4. Line 1670: Distance-based print via sub325 when Dist(L) = DistToPrint(iDist)
 * 
 * VB6 Rollout Row (TIMESLIP.FRM lines 1373-1381):
 * - Printed when distance is within tolerance of rollout target
 * - AFTER printing, time is reset and distance is adjusted (lines 1379-1381)
 * 
 * VB6 AddListLine Format (TIMESLIP.FRM lines 1481-1536):
 * - Work = Vel(L) * Z5  (mph calculation)
 * - RightAlign(4, 1, Work) for mph column
 * - RightAlign(3, 2, AGS(L)) for accel column
 */

import { sng, vb6Round, vb6RightAlign } from './vb6PrintFormat';

/**
 * VB6 Printed Row - matches the format of AddListLine output
 */
export interface VB6PrintedRow {
  /** Row type: 'staged', 'rollout', 'distance', 'time', 'shift', 'speed' */
  type: 'staged' | 'rollout' | 'distance' | 'time' | 'shift' | 'speed';
  
  /** VB6 step number L */
  L: number;
  
  /** Distance print index iDist (1-9) */
  iDist: number;
  
  /** Raw values BEFORE formatting */
  raw: {
    time_s: number;      // time(L)
    dist_ft: number;     // Dist(L)
    vel_fps: number;     // Vel(L)
    ags_g: number;       // AGS(L)
    engRPM: number;      // EngRPM(L)
    gear: number;        // Gear(L)
    slip: boolean;       // SLIP(L)
  };
  
  /** Formatted values as VB6 would print them */
  formatted: {
    time: string;        // RightAlign(5, 2, time(L)) or rollout format
    dist: string;        // RightAlign(5, 0, Dist(L))
    mph: string;         // RightAlign(4, 1, Work) where Work = Vel(L) * Z5
    accel: string;       // RightAlign(3, 2, AGS(L))
    rpm: string;         // Format(Round(EngRPM(L), 10), "#,000")
    gear: string;        // RightAlign(1, 0, iGear)
    slip: string;        // "(s)" if SLIP(L) and iGear < NGR
  };
  
  /** Quantized values for comparison (using VB6 Round) */
  quantized: {
    time_s: number;      // Rounded to 0.01
    dist_ft: number;     // Rounded to 1
    mph: number;         // Rounded to 0.1
    accel_g: number;     // Rounded to 0.01
    rpm: number;         // Rounded to 10
    gear: number;
  };
  
  /** Reason tag for debugging (e.g., "STAGED", "ROLLOUT", "TIME@1.50", "DIST@60", "SHIFT_MATCH@1", "SHIFT_COMPLETE@2") */
  reason: string;
}

/**
 * Format a VB6 printed row from raw simulation values
 * 
 * VB6 AddListLine (TIMESLIP.FRM lines 1481-1536):
 * - Work = Vel(L) * Z5
 * - Mid(prtline, 22, 5) = RightAlign(4, 1, Work)  // mph
 * - Mid(prtline, 32, 4) = RightAlign(3, 2, AGS(L)) // accel
 * 
 * @param type - Row type
 * @param L - VB6 step number
 * @param iDist - Distance print index
 * @param raw - Raw simulation values
 * @param NGR - Number of gears (for slip formatting)
 * @param isLandSpeed - If true, output distance in miles instead of feet
 */
export function formatVB6PrintedRow(
  type: VB6PrintedRow['type'],
  L: number,
  iDist: number,
  raw: VB6PrintedRow['raw'],
  NGR: number,
  isLandSpeed: boolean = false
): VB6PrintedRow {
  const Z5 = sng(3600 / 5280);
  
  // VB6: Work = Vel(L) * Z5
  const Work_mph = sng(sng(raw.vel_fps) * Z5);
  
  // Format time based on row type
  let formatted_time: string;
  if (type === 'rollout') {
    // VB6 line 1494: RightAlign(4, 3, time(L)) & "/0.00 Rollout"
    formatted_time = vb6RightAlign(4, 3, raw.time_s) + '/0.00 Rollout';
  } else {
    // VB6 line 1496: RightAlign(5, 2, time(L))
    formatted_time = vb6RightAlign(5, 2, raw.time_s);
  }
  
  // Format distance
  // VB6 line 1499: RightAlign(5, 0, Dist(L))
  // For land speed runs, output distance in miles (fixture uses miles in distance_ft field)
  const dist_output = isLandSpeed ? raw.dist_ft / 5280 : raw.dist_ft;
  const formatted_dist = isLandSpeed 
    ? vb6RightAlign(5, 2, dist_output)  // 2 decimal places for miles
    : vb6RightAlign(5, 0, dist_output); // 0 decimal places for feet
  
  // Format mph
  // VB6 line 1508: RightAlign(4, 1, Work)
  const formatted_mph = vb6RightAlign(4, 1, Work_mph);
  
  // Format accel
  // VB6 line 1509: RightAlign(3, 2, AGS(L))
  const formatted_accel = vb6RightAlign(3, 2, raw.ags_g);
  
  // Format RPM
  // VB6 line 1491: zr = Round(EngRPM(L), 10)
  // VB6 line 1518: RSet zrRPM = Format(zr, "#,000")
  const rounded_rpm = vb6Round(raw.engRPM, 10);
  const formatted_rpm = Math.round(rounded_rpm).toLocaleString('en-US');
  
  // Format gear
  // VB6 line 1516: RightAlign(1, 0, zigr)
  const formatted_gear = vb6RightAlign(1, 0, raw.gear);
  
  // Format slip
  // VB6 lines 1511-1513: If SLIP(L) <> 0 Then If iGear < NGR Then Mid(prtline, 36, 3) = "(s)"
  const formatted_slip = (raw.slip && raw.gear < NGR) ? '(s)' : '';
  
  // Quantized values for comparison
  // For land speed runs, distance is in miles (fixture uses miles in distance_ft field)
  const quantized = {
    time_s: vb6Round(raw.time_s, 0.01),
    dist_ft: isLandSpeed ? vb6Round(dist_output, 0.01) : vb6Round(raw.dist_ft, 1),
    mph: vb6Round(Work_mph, 0.1),
    accel_g: vb6Round(raw.ags_g, 0.01),
    rpm: vb6Round(raw.engRPM, 10),
    gear: raw.gear,
  };
  
  // Generate reason tag based on type and values
  let reason: string;
  switch (type) {
    case 'staged':
      reason = 'STAGED';
      break;
    case 'rollout':
      reason = 'ROLLOUT';
      break;
    case 'time':
      reason = `TIME@${raw.time_s.toFixed(2)}`;
      break;
    case 'distance':
      reason = isLandSpeed ? `DIST@${dist_output.toFixed(2)}mi` : `DIST@${Math.round(raw.dist_ft)}`;
      break;
    case 'shift':
      reason = `SHIFT@${raw.gear}`;
      break;
    case 'speed':
      reason = `SPEED@${Math.round(Work_mph)}`;
      break;
  }
  
  return {
    type,
    L,
    iDist,
    raw,
    formatted: {
      time: formatted_time,
      dist: formatted_dist,
      mph: formatted_mph,
      accel: formatted_accel,
      rpm: formatted_rpm,
      gear: formatted_gear,
      slip: formatted_slip,
    },
    quantized,
    reason,
  };
}

/**
 * VB6 Print Trigger Checker
 * 
 * Determines when VB6 would call AddListLine based on the current state.
 * 
 * VB6 Print Triggers (TIMESLIP.FRM):
 * 1. PrintFlag = 1 at line 1360-1370 (time-based or distance tolerance met)
 * 2. Distance print via sub325 at line 1668-1670 (interpolation)
 */
export interface VB6PrintTrigger {
  shouldPrint: boolean;
  reason: 'staged' | 'rollout' | 'distance' | 'time' | 'shift' | 'none';
  iDist: number;
}

/**
 * Check if VB6 would print a row at this point
 * 
 * @param L - VB6 step number
 * @param iDist - Current distance print index
 * @param dist_ft - Current distance
 * @param distToPrint - Target distance for iDist
 * @param distTol - Distance tolerance
 * @param vel_fps - Current velocity
 * @param timeTol - Time tolerance (0.002)
 * @param printFlag - Current print flag
 */
export function checkVB6PrintTrigger(
  L: number,
  iDist: number,
  dist_ft: number,
  distToPrint: number,
  distTol: number,
  vel_fps: number,
  timeTol: number,
  printFlag: number
): VB6PrintTrigger {
  // VB6 line 1059: Staged row (L=1)
  if (L === 1) {
    return { shouldPrint: true, reason: 'staged', iDist };
  }
  
  // VB6 line 1373-1375: Distance print check
  const distStep = Math.abs(distToPrint - dist_ft);
  if (distStep < distTol && (distStep / vel_fps) < timeTol) {
    if (iDist === 1) {
      return { shouldPrint: true, reason: 'rollout', iDist };
    } else {
      return { shouldPrint: true, reason: 'distance', iDist };
    }
  }
  
  // VB6 line 1360-1370: Time-based print
  if (printFlag === 1) {
    return { shouldPrint: true, reason: 'time', iDist };
  }
  
  return { shouldPrint: false, reason: 'none', iDist };
}
