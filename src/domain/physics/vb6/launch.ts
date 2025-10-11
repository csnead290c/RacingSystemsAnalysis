/**
 * VB6 Launch Slice - Exact port of TIMESLIP.FRM launch math.
 * 
 * VB6 Source: TIMESLIP.FRM lines 1218-1228, 1250-1266
 * 
 * CRITICAL: VB6 does NOT use AGS = PQWT / (Vel * gc) for integration!
 * VB6 integrates using Ags0 (previous acceleration):
 *   Vel(L) = Vel0 + Ags0 * gc * TimeStep + Jerk * gc * TimeStep^2 / 2
 * 
 * The formula AGS(L) = PQWT / (Vel(L) * gc) is ONLY for convergence checking
 * in the iteration loop, NOT for integration.
 * 
 * At launch, VB6 calculates Ags0 from TORQUE-BASED FORCE:
 *   force = TQ * gearRatio * efficiency / tireDia - DragForce
 *   Ags0 = 0.88 * force / weight  (12% losses for clutch)
 *   Then clamps: If Ags0 < AMin Then Ags0 = AMin
 */

export interface LaunchInputs {
  /** Engine HP at EngRPM (before slip scaling) */
  hpEngine: number;
  
  /** Clutch slip factor: LockRPM / EngRPM (already clamped) */
  clutchSlip: number;
  
  /** Gear efficiency (TGEff) */
  gearEff: number;
  
  /** Overall efficiency (gc_Efficiency.Value) */
  overallEff: number;
  
  /** Tire slip factor (TireSlip) */
  tireSlip: number;
  
  /** Drag HP (DragHP) */
  dragHP: number;
  
  /** Current vehicle speed (ft/s) */
  v_fps: number;
  
  /** Vehicle weight (lbf) */
  weight_lbf: number;
  
  /** Gravitational constant (32.174 ft/s²) */
  gc: number;
  
  /** Minimum acceleration (ft/s²) - TIMESLIP.FRM:547 */
  AMin: number;
  
  /** Maximum acceleration (ft/s²) - from CRTF calculation */
  AMax: number;
  
  /** Previous acceleration (ft/s²) for jerk calculation */
  Ags0: number;
  
  /** Time step (s) */
  dt: number;
  
  /** Jerk limits (g/s) */
  JMin: number;
  JMax: number;
}

export interface LaunchOutputs {
  /** Wheel thrust (lb_f) after clamps and rescaling */
  PQWT: number;
  
  /** Final acceleration (ft/s²) after clamps */
  AGS: number;
  
  /** Tire slip flag (1 = slip, 0 = no slip) */
  SLIP: number;
  
  /** Diagnostics for DEV logging */
  diag?: {
    HP_engine: number;
    HP_afterSlip: number;
    HP_afterEff: number;
    HP_final: number;
    P_eff_ftlbps: number;
  };
}

/**
 * VB6 launch slice - exact port of TIMESLIP.FRM:1218-1228, 1250-1266.
 * 
 * Order of operations (matching VB6 exactly):
 * 1. Scale HP by clutchSlip: HP = HP * ClutchSlip
 * 2. Apply efficiencies: HP = HP * TGEff * Efficiency / TireSlip
 * 3. Subtract drag: HP = HP - DragHP
 * 4. Convert to PQWT: PQWT = 550 * gc * HP / Weight
 * 5. Calculate AGS from PQWT (for convergence check only)
 * 6. Apply jerk limits (may recalculate PQWT from AGS)
 * 7. Apply AMax clamp (rescale PQWT)
 * 8. Apply AMin clamp (rescale PQWT)
 * 
 * @param in_ - Launch inputs
 * @returns PQWT and AGS after clamps
 */
export function vb6LaunchSlice(in_: LaunchInputs): LaunchOutputs {
  const {
    hpEngine,
    clutchSlip,
    gearEff,
    overallEff,
    tireSlip,
    dragHP,
    v_fps,
    weight_lbf,
    gc,
    AMin,
    AMax,
    Ags0,
    dt,
    JMin,
    JMax,
  } = in_;
  
  // VB6: TIMESLIP.FRM:1250
  // HP = (HPSave - HPEngPMI) * ClutchSlip
  // (We don't have inertia terms yet, so just use HP * ClutchSlip)
  let HP = hpEngine * clutchSlip;
  const HP_afterSlip = HP;
  
  // VB6: TIMESLIP.FRM:1251
  // HP = ((HP * TGEff(iGear) * gc_Efficiency.Value - HPChasPMI) / TireSlip) - DragHP
  // (We don't have chassis inertia yet, so skip HPChasPMI)
  HP = (HP * gearEff * overallEff) / tireSlip;
  const HP_afterEff = HP;
  HP = HP - dragHP;
  const HP_final = HP;
  
  // VB6: TIMESLIP.FRM:1252
  // PQWT = 550 * gc * HP / gc_Weight.Value
  const P_eff_ftlbps = 550 * HP; // Power in ft·lbf/s
  let PQWT = (P_eff_ftlbps * gc) / weight_lbf;
  
  // VB6: TIMESLIP.FRM:1253
  // AGS(L) = PQWT / (Vel(L) * gc)
  // 
  // CRITICAL: This is for convergence checking, NOT integration!
  // VB6 integrates using Ags0 (previous acceleration).
  // 
  // However, we still need to calculate AGS for the clamps.
  // VB6 updates velocity BEFORE computing AGS, so Vel(L) is never exactly zero
  // when this formula is used. We use a small velocity floor to avoid division by zero.
  let AGS: number;
  const Z5 = 3600 / 5280; // VB6 constant (fps to mph conversion)
  const v_use = Math.max(v_fps, Z5); // Use Z5 as velocity floor (ft/s)
  
  // DEV: Verify v_use is in ft/s and not extremely small
  if (typeof console !== 'undefined') {
    if (v_fps < Z5 && console.debug) {
      console.debug('[VB6 v-floor] using Z5=', Z5, 'fps instead of v=', v_fps, 'fps');
    }
    if (v_use > 0 && v_use < 1e-6 && console.warn) {
      console.warn('v_use extremely small (fps):', v_use);
    }
  }
  
  // VB6 formula: AGS = PQWT / (Vel * gc)
  // Vel is in ft/s, gc is dimensionless, PQWT is in ft/s²
  // Result: AGS in ft/s²
  AGS = PQWT / (v_use * gc);
  
  // VB6: TIMESLIP.FRM:1255-1258
  // 'steady iteration progress by using jerk limits
  // Jerk = 0:   If dtk1 <> 0 Then Jerk = (AGS(L) - Ags0) / dtk1
  // If Jerk < JMin Then Jerk = JMin:    AGS(L) = Ags0 + Jerk * dtk1:    PQWT = AGS(L) * gc * Vel(L)
  // If Jerk > JMax Then Jerk = JMax:    AGS(L) = Ags0 + Jerk * dtk1:    PQWT = AGS(L) * gc * Vel(L)
  let Jerk = 0;
  if (dt > 0) {
    Jerk = (AGS - Ags0) / dt;
  }
  
  if (Jerk < JMin) {
    Jerk = JMin;
    AGS = Ags0 + Jerk * dt;
    PQWT = AGS * gc * v_use; // Use v_use (with floor) to avoid division issues
  } else if (Jerk > JMax) {
    Jerk = JMax;
    AGS = Ags0 + Jerk * dt;
    PQWT = AGS * gc * v_use; // Use v_use (with floor) to avoid division issues
  }
  
  // VB6: TIMESLIP.FRM:1260-1266
  // 'and observe min/max Ags limits
  let SLIP = 0;
  
  // VB6: TIMESLIP.FRM:1262-1265
  // If AGS(L) > AMAX Then
  //     SLIP(L) = 1
  //     PQWT = PQWT * (AMAX - (AGS(L) - AMAX)) / AGS(L):    AGS(L) = AMAX - (AGS(L) - AMAX)
  // End If
  if (AGS > AMax) {
    SLIP = 1;
    const AGS_new = AMax - (AGS - AMax); // = 2*AMax - AGS
    if (AGS !== 0) {
      PQWT = PQWT * AGS_new / AGS;
    }
    AGS = AGS_new;
  }
  
  // VB6: TIMESLIP.FRM:1266
  // If AGS(L) < AMin Then PQWT = PQWT * AMin / AGS(L):          AGS(L) = AMin
  if (AGS < AMin) {
    if (AGS !== 0) {
      PQWT = PQWT * AMin / AGS;
    }
    AGS = AMin;
  }
  
  return {
    PQWT,
    AGS,
    SLIP,
    diag: {
      HP_engine: hpEngine,
      HP_afterSlip,
      HP_afterEff,
      HP_final,
      P_eff_ftlbps,
    },
  };
}
