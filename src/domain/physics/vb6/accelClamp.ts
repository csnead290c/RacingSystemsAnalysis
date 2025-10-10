/**
 * VB6 acceleration clamping logic.
 * 
 * VB6 Source: TIMESLIP.FRM lines 1221-1228, 1253-1266
 * 
 * VB6 enforces minimum and maximum acceleration limits (AMin and AMax) to:
 * 1. Bootstrap vehicle from rest (AMin provides initial force when ClutchSlip = 0)
 * 2. Limit acceleration to tire traction capacity (AMax based on CRTF)
 * 
 * The clamping rescales the wheel thrust (PQWT) to maintain consistency
 * between force and acceleration.
 */

export interface AccelClampIn {
  /** Wheel thrust (lb_f) before clamp */
  PQWT: number;
  
  /** Vehicle speed (ft/s) */
  v_fps: number;
  
  /** Gravity constant (32.174 ft/s²) */
  gc: number;
  
  /** VB6 minimum acceleration (ft/s²) - TIMESLIP.FRM:547 */
  AMin: number;
  
  /** VB6 maximum acceleration (ft/s²) - TIMESLIP.FRM:1054, 1216 */
  AMax: number;
}

export interface AccelClampOut {
  /** Rescaled thrust (lb_f) */
  PQWT: number;
  
  /** Final acceleration after clamp (ft/s²) */
  AGS: number;
  
  /** Whether tire slip occurred (1 = slip, 0 = no slip) */
  SLIP: number;
}

/**
 * Apply VB6 acceleration clamping.
 * 
 * VB6 Algorithm (TIMESLIP.FRM:1221-1228, 1253-1266):
 * 1. Calculate acceleration: AGS = PQWT / (Vel * gc)
 * 2. If AGS > AMax: rescale PQWT and set AGS = AMax - (AGS - AMax), set SLIP = 1
 * 3. If AGS < AMin: rescale PQWT and set AGS = AMin
 * 
 * The rescaling maintains consistency: PQWT = AGS * Vel * gc
 * 
 * @param in_ - Input parameters
 * @returns Clamped acceleration and rescaled thrust
 */
export function vb6AccelClamp(in_: AccelClampIn): AccelClampOut {
  let { PQWT, v_fps, gc, AMin, AMax } = in_;
  let AGS: number;
  let SLIP = 0;
  
  // VB6: TIMESLIP.FRM:1221, 1253
  // AGS(L) = PQWT / (Vel(L) * gc)
  // 
  // Handle zero velocity case (launch):
  // When v_fps = 0, VB6 would divide by zero, but the subsequent AMin clamp
  // rescales PQWT to be consistent. We protect against division by zero here
  // and let the AMin clamp handle the launch case.
  if (v_fps <= 0) {
    // At launch (v = 0), set AGS to 0 initially
    // The AMin clamp below will rescale PQWT appropriately
    AGS = 0;
  } else {
    AGS = PQWT / (v_fps * gc);
  }
  
  // VB6: TIMESLIP.FRM:1224-1227, 1262-1265
  // If AGS(L) > AMAX Then
  //     SLIP(L) = 1
  //     PQWT = PQWT * (AMAX - (AGS(L) - AMAX)) / AGS(L):    AGS(L) = AMAX - (AGS(L) - AMAX)
  // End If
  if (AGS > AMax) {
    SLIP = 1;
    const AGS_new = AMax - (AGS - AMax);
    if (AGS !== 0) {
      PQWT = PQWT * AGS_new / AGS;
    }
    AGS = AGS_new;
  }
  
  // VB6: TIMESLIP.FRM:1228, 1266
  // If AGS(L) < AMin Then PQWT = PQWT * AMin / AGS(L):          AGS(L) = AMin
  if (AGS < AMin) {
    if (AGS !== 0) {
      PQWT = PQWT * AMin / AGS;
    } else {
      // Special case: at launch with v = 0 and AGS = 0
      // VB6 would have PQWT = 0 here, but we need to bootstrap
      // Set PQWT to provide AMin acceleration at current (zero) velocity
      // This will be handled by the integrator on the next step
      // For now, just set AGS = AMin and leave PQWT as is
      // (the integrator will use AGS directly for dv/dt)
    }
    AGS = AMin;
  }
  
  return { PQWT, AGS, SLIP };
}
