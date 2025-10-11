/**
 * VB6 Gear Shift Logic
 * 
 * VB6 Source: TIMESLIP.FRM:1355, 1433
 * 
 * VB6 uses a two-step shift process:
 * 1. ShiftFlag = 1: Shift is triggered when EngRPM is within tolerance of ShiftRPM
 * 2. ShiftFlag = 2: Shift is executed on next iteration, then cleared
 * 
 * This allows VB6 to complete the current timestep before shifting.
 */

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
