/**
 * VB6-ported integration loop structure.
 * 
 * TODO: Replace with exact VB6 math once QTRPERF.BAS integration loop is ported.
 * This is a placeholder that matches the expected structure.
 */

// import { g } from './constants'; // TODO: Use for rotational inertia calculations

/**
 * VB6 simulation state.
 */
export interface VB6State {
  /** Time (seconds) */
  t_s: number;
  /** Distance (feet) */
  s_ft: number;
  /** Velocity (feet/second) */
  v_fps: number;
  /** Engine RPM */
  engineRPM: number;
  /** Current gear index (0-based) */
  gearIndex: number;
  /** Alias for engineRPM (for compatibility) */
  rpm: number;
  /** Alias for gearIndex (for compatibility) */
  gearIdx: number;
}

/**
 * VB6 simulation parameters.
 */
export interface VB6Params {
  /** 
   * Time step (seconds) - VB6 uses adaptive timestep
   * Initial: TSMax = rollout * 0.11 * (HP * TorqueMult / Weight)^(-1/3) / 15
   * Min: 0.005s (TIMESLIP.FRM:1064)
   * Max: 0.05s (TIMESLIP.FRM:1120)
   * Adaptive: TimeStep = TSMax * (AgsMax / Ags0)^4 (TIMESLIP.FRM:1082)
   * 
   * For our fixed-timestep implementation, use 0.002s as a reasonable compromise
   * that matches VB6's TimeTol = 0.002 (TIMESLIP.FRM:554)
   */
  dt_s: number;
  /** Rollout distance (feet) */
  rolloutFt: number;
  /** Tire radius (feet) */
  tireRadiusFt: number;
  /** Final drive ratio */
  finalDrive: number;
  /** Gear ratios (array, 0-based) */
  gearRatios: number[];
  /** Transmission efficiency per gear (optional, default 0.92-0.96) */
  transEffPerGear?: number[];
  /** Shift RPM for each gear (array, 0-based) */
  shiftRpm: number[];
  /** Shift delay (seconds, optional, default 0) */
  shiftDelay_s?: number;
  /** Traction cap (lbf, optional, undefined = no cap) */
  tractionCapLbf?: number;
  /** Vehicle mass (slugs) */
  massSlug: number;
}

/**
 * VB6 integration step (forward Euler).
 * 
 * TODO: Replace with exact VB6 integration method once QTRPERF.BAS is ported.
 * Current implementation uses simple forward Euler: dv = a*dt, ds = v*dt
 * 
 * @param state - Current simulation state
 * @param params - Simulation parameters
 * @param wheelTorqueLbFt - Wheel torque (lb-ft)
 * @param dragTorqueLbFt - Drag torque (lb-ft)
 * @param rrTorqueLbFt - Rolling resistance torque (lb-ft)
 * @returns Updated state
 */
export function vb6Step(
  state: VB6State,
  params: VB6Params,
  wheelTorqueLbFt: number,
  dragTorqueLbFt: number,
  rrTorqueLbFt: number
): VB6State {
  const { dt_s, tireRadiusFt, massSlug, tractionCapLbf } = params;

  // Net torque at wheel
  const T_net = wheelTorqueLbFt - dragTorqueLbFt - rrTorqueLbFt;

  // Convert torque to force at wheel
  const F_wheel = T_net / tireRadiusFt;

  // Apply traction cap if specified
  const F_trac = tractionCapLbf !== undefined 
    ? Math.min(Math.max(0, F_wheel), tractionCapLbf)
    : Math.max(0, F_wheel);

  // TODO: Verify VB6 uses F = ma or includes rotational inertia
  // Acceleration: a = F / m
  const a_fps2 = F_trac / massSlug;

  // TODO: Verify VB6 integration method (Euler vs RK2 vs RK4)
  // Forward Euler integration
  const v_new = state.v_fps + a_fps2 * dt_s;
  
  // TODO: Check if VB6 uses ds = v*dt or ds = v*dt + 0.5*a*dt^2
  // Position update (simple Euler)
  const s_new = state.s_ft + state.v_fps * dt_s;
  
  // Time update
  const t_new = state.t_s + dt_s;

  // TODO: Verify VB6 RPM calculation from wheel speed
  // Calculate engine RPM from wheel speed
  const gearRatio = params.gearRatios[state.gearIndex];
  const wheelRPM = (v_new * 60) / (2 * Math.PI * tireRadiusFt);
  const engineRPM = wheelRPM * gearRatio * params.finalDrive;

  return {
    t_s: t_new,
    s_ft: s_new,
    v_fps: v_new,
    engineRPM: engineRPM,
    gearIndex: state.gearIndex, // Gear shifts handled externally
    rpm: engineRPM, // Alias
    gearIdx: state.gearIndex, // Alias
  };
}

/**
 * Check if gear shift should occur.
 * 
 * VB6 Source: TIMESLIP.FRM lines 1336-1340, 1355, 1433
 * 
 * VB6 Algorithm:
 * 1. Check if within tolerance of shift RPM: Abs(ShiftRPM - EngRPM) < ShiftRPMTol
 * 2. ShiftRPMTol = 10 (or 20 if ShiftRPM > 8000)
 * 3. Set ShiftFlag = 1 when within tolerance
 * 4. Execute shift: iGear = iGear + 1
 * 
 * @param state - Current simulation state
 * @param params - Simulation parameters
 * @returns New gear index (same if no shift)
 */
export function vb6CheckShift(
  state: VB6State,
  params: VB6Params
): number {
  const { gearIndex, engineRPM } = state;
  const { shiftRpm, gearRatios } = params;

  // Don't shift if already in top gear
  if (gearIndex >= gearRatios.length - 1) {
    return gearIndex;
  }

  // VB6: TIMESLIP.FRM:860
  // ShiftRPMTol = 10: If ShiftRPM(1) > 8000 Then ShiftRPMTol = 20
  const ShiftRPMTol = shiftRpm[0] > 8000 ? 20 : 10;

  // VB6: TIMESLIP.FRM:1336-1340, 1355
  // If Abs(ShiftRPM(iGear) - EngRPM(L)) < ShiftRPMTol Then ShiftFlag = 1
  const targetShiftRPM = shiftRpm[gearIndex];
  if (targetShiftRPM !== undefined && Math.abs(targetShiftRPM - engineRPM) < ShiftRPMTol) {
    // VB6: TIMESLIP.FRM:1433
    // If ShiftFlag = 1 Then ShiftFlag = 2: iGear = iGear + 1
    return gearIndex + 1;
  }

  return gearIndex;
}

/**
 * Create initial VB6 state.
 * 
 * @param initialRPM - Initial engine RPM (e.g., launch RPM)
 * @returns Initial state
 */
export function vb6InitialState(initialRPM: number = 0): VB6State {
  return {
    t_s: 0,
    s_ft: 0,
    v_fps: 0,
    engineRPM: initialRPM,
    gearIndex: 0,
    rpm: initialRPM, // Alias
    gearIdx: 0, // Alias
  };
}
