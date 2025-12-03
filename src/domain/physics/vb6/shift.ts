/**
 * VB6 Gear Shift Logic
 * 
 * VB6 Source: TIMESLIP.FRM:1355, 1433, 702-703, 722, 732, 1071-1072
 * 
 * VB6 uses a two-step shift process:
 * 1. ShiftFlag = 1: Shift is triggered when EngRPM is within tolerance of ShiftRPM
 * 2. ShiftFlag = 2: Shift is executed on next iteration, then cleared
 * 
 * During the shift, VB6 applies a "dwell" period (DTShift) where the vehicle coasts
 * with zero power. This simulates the time it takes to change gears.
 * 
 * VB6 Shift Dwell Times (TIMESLIP.FRM:702-703, 722, 732):
 * - Clutch: DTShift = 0.2 seconds (200 ms)
 * - Converter: DTShift = 0.25 seconds (250 ms)
 */

import { F, f32 } from './exactMath';

/**
 * Check if vehicle should shift to next gear
 * 
 * VB6: TIMESLIP.FRM:860, 1355
 * ShiftRPMTol = 10: If ShiftRPM(1) > 8000 Then ShiftRPMTol = 20
 * If iGear < NGR And Abs(ShiftRPM(iGear) - EngRPM(L)) < ShiftRPMTol Then ShiftFlag = 1
 * 
 * @param currentGear Current gear index (0-based, 0 = first gear)
 * @param numGears Total number of gears
 * @param engRPM Current engine RPM
 * @param shiftRPM Array of shift RPM thresholds (0-based, shiftRPM[0] = shift from 1st to 2nd)
 * @returns True if should shift to next gear
 */
export function shouldShift(
  currentGear: number,
  numGears: number,
  engRPM: number,
  shiftRPM: number[]
): boolean {
  // VB6: If iGear < NGR (can't shift from highest gear)
  if (currentGear >= numGears - 1) {
    return false;
  }
  
  // Get shift RPM for current gear (0-based indexing)
  const targetShiftRPM = shiftRPM[currentGear];
  
  // If no shift RPM defined for this gear, don't shift
  if (!targetShiftRPM || targetShiftRPM <= 0) {
    return false;
  }
  
  // VB6: ShiftRPMTol = 10: If ShiftRPM(1) > 8000 Then ShiftRPMTol = 20
  // Use first gear's shift RPM to determine tolerance
  const firstGearShiftRPM = shiftRPM[0] ?? 0;
  const shiftRPMTol = firstGearShiftRPM > 8000 ? 20 : 10;
  
  // VB6: Abs(ShiftRPM(iGear) - EngRPM(L)) < ShiftRPMTol
  const rpmDiff = Math.abs(targetShiftRPM - engRPM);
  
  return rpmDiff < shiftRPMTol;
}

/**
 * VB6 shift state machine
 * 
 * VB6 uses ShiftFlag to manage shift timing:
 * - ShiftFlag = 0: Normal operation
 * - ShiftFlag = 1: Shift triggered, will execute next step
 * - ShiftFlag = 2: Shift executing, will clear next step
 * 
 * This ensures shifts happen at step boundaries.
 */
export enum ShiftState {
  NORMAL = 0,
  TRIGGERED = 1,
  EXECUTING = 2,
}

/**
 * Update shift state machine
 * 
 * VB6: TIMESLIP.FRM:1433-1434
 * If ShiftFlag = 1 Then ShiftFlag = 2: iGear = iGear + 1: LAdd = 1: GoTo 230
 * If ShiftFlag = 2 Then ShiftFlag = 0: LAdd = 1
 * 
 * @param currentState Current shift state
 * @param shouldTrigger True if shift conditions are met
 * @returns New shift state and whether to execute shift
 */
export function updateShiftState(
  currentState: ShiftState,
  shouldTrigger: boolean
): { newState: ShiftState; executeShift: boolean } {
  switch (currentState) {
    case ShiftState.NORMAL:
      // If shift conditions met, trigger shift
      if (shouldTrigger) {
        return { newState: ShiftState.TRIGGERED, executeShift: false };
      }
      return { newState: ShiftState.NORMAL, executeShift: false };
      
    case ShiftState.TRIGGERED:
      // Execute shift and move to executing state
      return { newState: ShiftState.EXECUTING, executeShift: true };
      
    case ShiftState.EXECUTING:
      // Clear shift state
      return { newState: ShiftState.NORMAL, executeShift: false };
      
    default:
      return { newState: ShiftState.NORMAL, executeShift: false };
  }
}

/**
 * Get VB6 shift dwell time (no power window)
 * 
 * VB6: TIMESLIP.FRM:702-703, 722, 732
 * DTShift = 0.2                                'Clutch shift time
 * If gc_TransType.Value Then DTShift = 0.25    'Converter shift time
 * 
 * During this time, the vehicle coasts with zero engine power.
 * Only drag and rolling resistance act on the vehicle.
 * 
 * @param isClutch True for clutch transmission, false for converter
 * @returns Shift dwell time in seconds
 */
export function vb6ShiftDwell_s(isClutch: boolean): number {
  // VB6: DTShift = 0.2 for clutch, 0.25 for converter
  return isClutch ? 0.2 : 0.25;
}

/**
 * VB6-STRICT: Check if should shift using >= operator.
 * 
 * VB6 typically uses >= for the actual shift trigger:
 * If EngRPM >= ShiftRPM(iGear) Then shift
 * 
 * This is different from the tolerance-based check which uses Abs().
 * For STRICT mode, we use the simpler >= check.
 * 
 * @param engRPM Current engine RPM (Float32)
 * @param shiftRPM Shift RPM threshold for current gear
 * @param currentGear Current gear index (0-based)
 * @param maxGear Maximum gear index (numGears - 1)
 * @returns True if should shift
 */
export function shouldShift_f32(
  engRPM: number,
  shiftRPM: number,
  currentGear: number,
  maxGear: number
): boolean {
  // Can't shift from highest gear
  if (currentGear >= maxGear) return false;
  
  // No shift point defined
  if (!shiftRPM || shiftRPM <= 0) return false;
  
  // VB6-STRICT: Use >= operator (not tolerance-based)
  // F.sub returns Float32, compare to 0
  return F.sub(f32(engRPM), f32(shiftRPM)) >= 0;
}
