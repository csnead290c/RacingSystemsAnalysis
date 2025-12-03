/**
 * VB6 EXACT Integrator Functions
 * 
 * EXACT port from TIMESLIP.FRM lines 1040-1360
 * 
 * VB6 uses a sophisticated integrator with:
 * - Adaptive timestep selection
 * - PMI iteration convergence (up to 12 iterations)
 * - Jerk limiting (±2 g/s)
 * - AMin/AMax clamping with PQWT rescaling
 * - Distance integration: Dist(L) = ((2*PQWT*(t-t0) + v0²)^1.5 - v0³) / (3*PQWT) + Dist0
 * 
 * Key formulas:
 * - time(L) = VelSqrd / (2 * PQWT) + Time0
 * - AGS(L) = PQWT / (Vel(L) * gc)
 * - Jerk = (AGS(L) - Ags0) / dt
 * - Dist(L) = ((2*PQWT*dt + v0²)^1.5 - v0³) / (3*PQWT) + Dist0
 */

import { gc, JMin, JMax, K6, K61 } from './constants';

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

// ===== EXACT VB6 INTEGRATOR FUNCTIONS =====

/**
 * EXACT VB6 Distance Integration
 * 
 * VB6: TIMESLIP.FRM:1280
 * Dist(L) = ((2 * PQWT * (time(L) - Time0) + Vel0 ^ 2) ^ 1.5 - Vel0 ^ 3) / (3 * PQWT) + Dist0
 * 
 * This is the exact VB6 distance formula derived from constant acceleration:
 * - Assumes PQWT (power-to-weight-time) is constant over the timestep
 * - Integrates velocity: v = sqrt(v0² + 2*a*s) where a = PQWT/v
 * - Result: distance as function of time under power constraint
 * 
 * @param Vel0_ftps Previous velocity (ft/s)
 * @param Dist0_ft Previous distance (ft)
 * @param dt_s Time step (s)
 * @param PQWT_ftps2 Power-to-weight-time parameter (ft/s²)
 * @returns Updated velocity and distance
 */
export function vb6StepDistance(
  Vel0_ftps: number,
  Dist0_ft: number,
  dt_s: number,
  PQWT_ftps2: number
): { Vel_ftps: number; Dist_ft: number } {
  // VB6: TIMESLIP.FRM:1139
  // VelSqrd = Vel(L) ^ 2 - Vel0 ^ 2
  // But we need to compute Vel(L) first from time
  
  // VB6: TIMESLIP.FRM:1268 (or 1229 first pass)
  // time(L) = VelSqrd / (2 * PQWT) + Time0
  // Rearranging: VelSqrd = 2 * PQWT * dt
  // Therefore: Vel(L) = sqrt(Vel0² + 2 * PQWT * dt)
  const VelSqrd = 2 * PQWT_ftps2 * dt_s;
  const Vel_ftps = Math.sqrt(Vel0_ftps * Vel0_ftps + VelSqrd);
  
  // VB6: TIMESLIP.FRM:1280
  // Dist(L) = ((2 * PQWT * (time(L) - Time0) + Vel0 ^ 2) ^ 1.5 - Vel0 ^ 3) / (3 * PQWT) + Dist0
  const term1 = 2 * PQWT_ftps2 * dt_s + Vel0_ftps * Vel0_ftps;
  const term2 = Math.pow(term1, 1.5);
  const term3 = Math.pow(Vel0_ftps, 3);
  const Dist_ft = (term2 - term3) / (3 * PQWT_ftps2) + Dist0_ft;
  
  return { Vel_ftps, Dist_ft };
}

/**
 * EXACT VB6 Timestep Selection
 * 
 * VB6: TIMESLIP.FRM:1082, 1112-1120
 * 
 * Adaptive timestep based on acceleration:
 * TimeStep = TSMax * (AgsMax / Ags0) ^ 4
 * 
 * With bounds:
 * - Min: 0.005s (TIMESLIP.FRM:1064)
 * - Max: 0.05s (TIMESLIP.FRM:1120)
 * - Also limited by K7 steps per print interval
 * - Also limited by 4.5 steps to distance print
 * 
 * @param proposed_dt_s Proposed timestep (s)
 * @returns Clamped timestep (s)
 */
export function vb6SelectTimeStep(
  proposed_dt_s: number
): number {
  // VB6: TIMESLIP.FRM:1120
  // If TimeStep > 0.05 Then TimeStep = 0.05
  let dt = proposed_dt_s;
  if (dt > 0.05) {
    dt = 0.05;
  }
  
  // VB6: TIMESLIP.FRM:1064
  // TSMax = TSMax / 15: If TSMax < 0.005 Then TSMax = 0.005
  if (dt < 0.005) {
    dt = 0.005;
  }
  
  return dt;
}

/**
 * EXACT VB6 Acceleration Clamp with PQWT Rescaling
 * 
 * VB6: TIMESLIP.FRM:1224-1228, 1262-1266
 * 
 * VB6 applies AMin/AMax clamps AND rescales PQWT to maintain consistency:
 * 
 * If AGS > AMAX:
 *   SLIP = 1
 *   PQWT = PQWT * (AMAX - (AGS - AMAX)) / AGS
 *   AGS = AMAX - (AGS - AMAX)
 * 
 * If AGS < AMin:
 *   PQWT = PQWT * AMin / AGS
 *   AGS = AMin
 * 
 * Note: The AMAX formula is unusual - it's not just AGS = AMAX, but includes
 * a correction term that accounts for how far over AMAX we went.
 * 
 * @param AGS_candidate_ftps2 Candidate acceleration (ft/s²)
 * @param AMin_ftps2 Minimum acceleration (ft/s²)
 * @param AMax_ftps2 Maximum acceleration (ft/s²)
 * @returns Clamped acceleration and slip flag
 */
export function vb6ApplyAccelClamp(
  AGS_candidate_ftps2: number,
  AMin_ftps2: number,
  AMax_ftps2: number
): { AGS_ftps2: number; PQWT_scale: number; slip: 0 | 1 } {
  let AGS = AGS_candidate_ftps2;
  let PQWT_scale = 1.0;
  let slip: 0 | 1 = 0;
  
  // VB6: TIMESLIP.FRM:1224-1227 (or 1262-1264)
  // If AGS(L) > AMAX Then
  //     SLIP(L) = 1
  //     PQWT = PQWT * (AMAX - (AGS(L) - AMAX)) / AGS(L):    AGS(L) = AMAX - (AGS(L) - AMAX)
  // End If
  if (AGS > AMax_ftps2) {
    slip = 1;
    const overshoot = AGS - AMax_ftps2;
    const corrected_AMAX = AMax_ftps2 - overshoot;
    PQWT_scale = corrected_AMAX / AGS;
    AGS = corrected_AMAX;
  }
  
  // VB6: TIMESLIP.FRM:1228 (or 1266)
  // If AGS(L) < AMin Then PQWT = PQWT * AMin / AGS(L):          AGS(L) = AMin
  if (AGS < AMin_ftps2) {
    PQWT_scale = AMin_ftps2 / AGS;
    AGS = AMin_ftps2;
  }
  
  return { AGS_ftps2: AGS, PQWT_scale, slip };
}

/**
 * EXACT VB6 AGS from PQWT
 * 
 * VB6: TIMESLIP.FRM:1221, 1253
 * AGS(L) = PQWT / (Vel(L) * gc)
 * 
 * @param PQWT_ftps2 Power-to-weight-time parameter (ft/s²)
 * @param Vel_ftps Velocity (ft/s)
 * @returns Acceleration (ft/s²)
 */
export function vb6AGSFromPQWT(
  PQWT_ftps2: number,
  Vel_ftps: number
): number {
  // VB6: TIMESLIP.FRM:1221, 1253
  // AGS(L) = PQWT / (Vel(L) * gc)
  return PQWT_ftps2 / (Vel_ftps * gc);
}

/**
 * EXACT VB6 PQWT from HP
 * 
 * VB6: TIMESLIP.FRM:1221, 1252
 * PQWT = 550 * gc * HP / gc_Weight.Value
 * 
 * @param HP Horsepower
 * @param Weight_lbf Vehicle weight (lbf)
 * @returns PQWT (ft/s²)
 */
export function vb6PQWTFromHP(
  HP: number,
  Weight_lbf: number
): number {
  // VB6: TIMESLIP.FRM:1221, 1252
  // PQWT = 550 * gc * HP / gc_Weight.Value
  return 550 * gc * HP / Weight_lbf;
}

/**
 * EXACT VB6 Jerk Calculation
 * 
 * VB6: TIMESLIP.FRM:1256
 * Jerk = (AGS(L) - Ags0) / dtk1
 * 
 * Units: g/s (where g = 32.174 ft/s²)
 * 
 * @param AGS_current_ftps2 Current acceleration (ft/s²)
 * @param AGS_prev_ftps2 Previous acceleration (ft/s²)
 * @param dt_s Time step (s)
 * @returns Jerk (g/s)
 */
export function vb6Jerk(
  AGS_current_ftps2: number,
  AGS_prev_ftps2: number,
  dt_s: number
): number {
  // VB6: TIMESLIP.FRM:1256
  // Jerk = 0:   If dtk1 <> 0 Then Jerk = (AGS(L) - Ags0) / dtk1
  if (dt_s === 0) {
    return 0;
  }
  
  // Jerk in g/s
  return (AGS_current_ftps2 - AGS_prev_ftps2) / (dt_s * gc);
}

/**
 * VB6 Adaptive Timestep Calculation
 * 
 * VB6: TIMESLIP.FRM:1082
 * TimeStep = TSMax * (AgsMax / Ags0) ^ 4
 * 
 * With bounds (TIMESLIP.FRM:1064, 1120):
 * - Min: 0.005s
 * - Max: 0.05s
 * 
 * @param TSMax Base timestep (from rollout calculation)
 * @param AgsMax Maximum acceleration seen (g's)
 * @param Ags0 Current acceleration (g's)
 * @returns Adaptive timestep (s)
 */
export function vb6AdaptiveTimestep(
  TSMax: number,
  AgsMax_g: number,
  Ags0_g: number
): number {
  // VB6: TimeStep = TSMax * (AgsMax / Ags0) ^ 4
  // Guard against division by zero or negative
  if (Ags0_g <= 0) {
    return Math.max(0.005, Math.min(0.05, TSMax));
  }
  
  let TimeStep = TSMax * Math.pow(AgsMax_g / Ags0_g, 4);
  
  // VB6: TIMESLIP.FRM:1120
  // If TimeStep > 0.05 Then TimeStep = 0.05
  if (TimeStep > 0.05) {
    TimeStep = 0.05;
  }
  
  // VB6: TIMESLIP.FRM:1064
  // If TSMax < 0.005 Then TSMax = 0.005
  if (TimeStep < 0.005) {
    TimeStep = 0.005;
  }
  
  return TimeStep;
}

/**
 * VB6 Initial TSMax Calculation
 * 
 * VB6: TIMESLIP.FRM:1063-1064
 * TSMax = DistToPrint(1) * 0.11 * (HP * gc_TorqueMult.Value / gc_Weight.Value) ^ (-1 / 3)
 * TSMax = TSMax / 15: If TSMax < 0.005 Then TSMax = 0.005
 * 
 * @param rollout_ft Rollout distance (ft)
 * @param HP Engine HP
 * @param torqueMult Torque multiplier (1.0 for clutch, 1.5-2.5 for converter)
 * @param weight_lbf Vehicle weight (lbf)
 * @returns TSMax (s)
 */
export function vb6CalcTSMax(
  rollout_ft: number,
  HP: number,
  torqueMult: number,
  weight_lbf: number
): number {
  // VB6: TSMax = DistToPrint(1) * 0.11 * (HP * gc_TorqueMult.Value / gc_Weight.Value) ^ (-1 / 3)
  const powerToWeight = HP * torqueMult / weight_lbf;
  let TSMax = rollout_ft * 0.11 * Math.pow(powerToWeight, -1/3);
  
  // VB6: TSMax = TSMax / 15
  TSMax = TSMax / 15;
  
  // VB6: If TSMax < 0.005 Then TSMax = 0.005
  if (TSMax < 0.005) {
    TSMax = 0.005;
  }
  
  return TSMax;
}

/**
 * VB6 Iterative Convergence Loop
 * 
 * VB6: TIMESLIP.FRM:1244-1276 (label 280)
 * 
 * This is the core VB6 iteration that converges PMI and time calculations.
 * It iterates up to 12 times or until time converges within 0.01%.
 * 
 * @param params Iteration parameters
 * @returns Converged values
 */
export interface VB6IterationParams {
  // Previous step values
  Vel0_ftps: number;      // Previous velocity (ft/s)
  Ags0_g: number;         // Previous acceleration (g's)
  Time0_s: number;        // Previous time (s)
  
  // Current step values
  Vel_ftps: number;       // Current velocity (ft/s)
  VelSqrd: number;        // Vel² - Vel0² (ft²/s²)
  
  // Engine/PMI values (pre-computed, don't change during iteration)
  HPSave: number;         // Engine HP before PMI
  ClutchSlip: number;     // Clutch/converter coupling
  TGEff: number;          // Transmission efficiency
  Efficiency: number;     // Overall driveline efficiency
  TireSlip: number;       // Tire slip factor
  DragHP: number;         // Drag HP
  EngAccHP: number;       // Engine acceleration HP (before Work factor)
  ChasAccHP: number;      // Chassis acceleration HP (before Work factor)
  
  // Limits
  AMin_g: number;         // Minimum acceleration (g's)
  AMax_g: number;         // Maximum acceleration (g's)
  
  // Vehicle
  Weight_lbf: number;     // Vehicle weight (lbf)
}

export interface VB6IterationResult {
  HP: number;             // Final HP after losses
  PQWT_ftps2: number;     // Power-to-weight-time (ft/s²)
  AGS_g: number;          // Acceleration (g's)
  time_s: number;         // Converged time (s)
  dt_s: number;           // Converged timestep (s)
  HPEngPMI: number;       // Engine PMI HP loss
  HPChasPMI: number;      // Chassis PMI HP loss
  slip: boolean;          // True if traction limited
  iterations: number;     // Number of iterations used
}

export function vb6IterateConvergence(params: VB6IterationParams): VB6IterationResult {
  const {
    Ags0_g, Time0_s,
    Vel_ftps, VelSqrd,
    HPSave, ClutchSlip, TGEff, Efficiency, TireSlip, DragHP,
    EngAccHP, ChasAccHP,
    AMin_g, AMax_g,
    Weight_lbf
  } = params;
  // Note: Vel0_ftps is in params but not used directly - VelSqrd already computed
  
  const PI = Math.PI;
  
  // Initial time estimate (from velocity step)
  // VB6: time(L) = VelSqrd / (2 * PQWT) + Time0
  // But we need initial PQWT estimate - use simple forward Euler
  let time_s = Time0_s + 0.002; // Initial guess
  let dtk1 = time_s - Time0_s;
  
  let HP = 0;
  let PQWT = 0;
  let AGS_g = Ags0_g;
  let HPEngPMI = 0;
  let HPChasPMI = 0;
  let slip = false;
  let k = 0;
  
  // VB6: TIMESLIP.FRM:1244-1276 (iteration loop)
  for (k = 1; k <= 12; k++) {
    // VB6: TIMESLIP.FRM:1247
    // Work = (2 * PI / 60) ^ 2 / (12 * 550 * dtk1)
    const Work = Math.pow(2 * PI / 60, 2) / (12 * 550 * dtk1);
    
    // VB6: TIMESLIP.FRM:1248
    // HPEngPMI = EngAccHP * Work:    HPChasPMI = ChasAccHP * Work
    HPEngPMI = EngAccHP * Work;
    HPChasPMI = ChasAccHP * Work;
    
    // VB6: TIMESLIP.FRM:1250-1251
    // HP = (HPSave - HPEngPMI) * ClutchSlip
    // HP = ((HP * TGEff(iGear) * gc_Efficiency.Value - HPChasPMI) / TireSlip) - DragHP
    HP = (HPSave - HPEngPMI) * ClutchSlip;
    HP = ((HP * TGEff * Efficiency - HPChasPMI) / TireSlip) - DragHP;
    
    // VB6: TIMESLIP.FRM:1252-1253
    // PQWT = 550 * gc * HP / gc_Weight.Value
    // AGS(L) = PQWT / (Vel(L) * gc)
    PQWT = 550 * gc * HP / Weight_lbf;
    AGS_g = PQWT / (Vel_ftps * gc);
    
    // VB6: TIMESLIP.FRM:1255-1258
    // Apply jerk limits
    let Jerk = 0;
    if (dtk1 !== 0) {
      Jerk = (AGS_g - Ags0_g) / dtk1;
    }
    if (Jerk < JMin) {
      Jerk = JMin;
      AGS_g = Ags0_g + Jerk * dtk1;
      PQWT = AGS_g * gc * Vel_ftps;
    }
    if (Jerk > JMax) {
      Jerk = JMax;
      AGS_g = Ags0_g + Jerk * dtk1;
      PQWT = AGS_g * gc * Vel_ftps;
    }
    
    // VB6: TIMESLIP.FRM:1260-1266
    // Apply AMin/AMax clamps
    slip = false;
    if (AGS_g > AMax_g) {
      slip = true;
      PQWT = PQWT * (AMax_g - (AGS_g - AMax_g)) / AGS_g;
      AGS_g = AMax_g - (AGS_g - AMax_g);
    }
    if (AGS_g < AMin_g) {
      PQWT = PQWT * AMin_g / AGS_g;
      AGS_g = AMin_g;
    }
    
    // VB6: TIMESLIP.FRM:1268-1270
    // time(L) = VelSqrd / (2 * PQWT) + Time0
    // dtk2 = time(L) - Time0
    // If k = 12 Or Abs(100 * (dtk2 - dtk1) / dtk2) <= 0.01 Then GoTo 300
    const newTime = VelSqrd / (2 * PQWT) + Time0_s;
    const dtk2 = newTime - Time0_s;
    
    // Check convergence
    if (k === 12 || Math.abs(100 * (dtk2 - dtk1) / dtk2) <= 0.01) {
      time_s = newTime;
      break;
    }
    
    // VB6: TIMESLIP.FRM:1272-1275
    // z = HP / HPSave
    // If z < K6 Then z = K6
    // If z > K61 Then z = K61
    // time(L) = Time0 + dtk1 + z * (dtk2 - dtk1)
    let z = HP / HPSave;
    if (z < K6) z = K6;
    if (z > K61) z = K61;
    time_s = Time0_s + dtk1 + z * (dtk2 - dtk1);
    dtk1 = time_s - Time0_s;
  }
  
  return {
    HP,
    PQWT_ftps2: PQWT,
    AGS_g,
    time_s,
    dt_s: time_s - Time0_s,
    HPEngPMI,
    HPChasPMI,
    slip,
    iterations: k
  };
}
