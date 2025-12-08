/**
 * Torque Converter Physics Model
 * 
 * Based on industry-standard characteristic curve approach using:
 * - Speed Ratio (SR) = ω_turbine / ω_pump
 * - Torque Ratio (TR) curve vs SR
 * - Capacity Factor (K-factor) curve vs SR
 * 
 * References:
 * - K-factor formula: N_stall = K * sqrt(T_engine)
 * - Efficiency: η = TR * SR
 * - Pump torque capacity: T_p = (ω_p / K)²
 */

// ============================================================================
// INTERFACES
// ============================================================================

/**
 * Converter characteristic curves
 * These define the hydrodynamic behavior of the converter
 */
export interface ConverterCurves {
  /** Speed ratio points (0 to 1, ascending) */
  speedRatioPoints: number[];
  /** Torque ratio at each SR point (starts high ~2-3, ends at ~1) */
  torqueRatioPoints: number[];
  /** K-factor at each SR point */
  capacityFactorPoints: number[];
}

/**
 * Full converter configuration
 */
export interface ConverterConfig {
  name: string;
  diameterIn: number;
  
  // Core hydrodynamic characteristics
  curves: ConverterCurves;
  
  // Lockup clutch (optional)
  hasLockup: boolean;
  lockupSROn: number;      // SR threshold to engage (e.g., 0.9)
  lockupSROff: number;     // SR threshold to disengage (e.g., 0.85)
  lockupMinRPM: number;    // Minimum pump RPM for lockup
  
  // Inertia and damping
  pumpInertia: number;     // lb-ft-s² (J_p)
  turbineInertia: number;  // lb-ft-s² (J_t)
  pumpDamping: number;     // lb-ft/(rad/s) (b_p)
  turbineDamping: number;  // lb-ft/(rad/s) (b_t)
  
  // Fluid torque lag time constant (seconds)
  fluidLagTimeConstant: number;
}

/**
 * Converter operating state
 */
export interface ConverterState {
  omegaP: number;          // Pump/impeller angular speed (rad/s)
  omegaT: number;          // Turbine angular speed (rad/s)
  torqueP: number;         // Pump torque (ft-lb)
  torqueT: number;         // Turbine torque (ft-lb)
  torquePLagged: number;   // Lagged pump torque for fluid dynamics
  mode: 'drive' | 'coast' | 'locked';
  lockupEngaged: boolean;
}

/**
 * Inputs to converter step function
 */
export interface ConverterInputs {
  torqueEngine: number;    // Engine torque available (ft-lb)
  torqueLoad: number;      // Load torque from driveline (ft-lb)
  dt: number;              // Time step (seconds)
}

/**
 * Computed converter values at a given operating point
 */
export interface ConverterComputed {
  speedRatio: number;      // SR = ω_t / ω_p
  torqueRatio: number;     // TR from curve
  kFactor: number;         // K from curve
  efficiency: number;      // η = TR * SR
  slip: number;            // 1 - SR (percentage)
  powerIn: number;         // P_in = T_p * ω_p (HP)
  powerOut: number;        // P_out = T_t * ω_t (HP)
  powerLoss: number;       // P_loss = P_in - P_out (HP)
  pumpRPM: number;
  turbineRPM: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const RAD_PER_RPM = Math.PI / 30;  // Convert RPM to rad/s
const RPM_PER_RAD = 30 / Math.PI;  // Convert rad/s to RPM
const HP_PER_FTLB_RADPS = 1 / 550; // Convert ft-lb * rad/s to HP

// ============================================================================
// DEFAULT CONVERTER CURVES
// ============================================================================

/**
 * Typical street/strip torque converter curves
 * Based on common 10" converter characteristics
 */
export const DEFAULT_STREET_STRIP_CURVES: ConverterCurves = {
  speedRatioPoints:    [0.00, 0.10, 0.20, 0.30, 0.40, 0.50, 0.60, 0.70, 0.80, 0.85, 0.90, 0.95, 1.00],
  torqueRatioPoints:   [2.20, 2.10, 2.00, 1.88, 1.75, 1.60, 1.45, 1.28, 1.12, 1.06, 1.02, 1.00, 1.00],
  capacityFactorPoints:[165,  168,  172,  178,  185,  195,  210,  230,  260,  290,  340,  420,  600],
};

/**
 * High-stall race converter curves
 * More aggressive torque multiplication, looser coupling
 */
export const HIGH_STALL_RACE_CURVES: ConverterCurves = {
  speedRatioPoints:    [0.00, 0.10, 0.20, 0.30, 0.40, 0.50, 0.60, 0.70, 0.80, 0.85, 0.90, 0.95, 1.00],
  torqueRatioPoints:   [2.50, 2.38, 2.25, 2.10, 1.92, 1.72, 1.50, 1.30, 1.12, 1.06, 1.02, 1.00, 1.00],
  capacityFactorPoints:[145,  148,  152,  158,  166,  178,  195,  220,  255,  290,  350,  450,  650],
};

/**
 * Tight/efficient converter curves
 * Lower stall, better efficiency at cruise
 */
export const TIGHT_EFFICIENT_CURVES: ConverterCurves = {
  speedRatioPoints:    [0.00, 0.10, 0.20, 0.30, 0.40, 0.50, 0.60, 0.70, 0.80, 0.85, 0.90, 0.95, 1.00],
  torqueRatioPoints:   [1.90, 1.82, 1.75, 1.66, 1.55, 1.42, 1.30, 1.18, 1.08, 1.04, 1.01, 1.00, 1.00],
  capacityFactorPoints:[195,  198,  202,  208,  218,  232,  252,  280,  320,  360,  420,  520,  750],
};

/**
 * Create a default converter config
 */
export function createDefaultConverter(name: string = 'Street/Strip 10"'): ConverterConfig {
  return {
    name,
    diameterIn: 10,
    curves: DEFAULT_STREET_STRIP_CURVES,
    hasLockup: false,
    lockupSROn: 0.90,
    lockupSROff: 0.85,
    lockupMinRPM: 1500,
    pumpInertia: 0.015,      // Typical for 10" converter
    turbineInertia: 0.008,
    pumpDamping: 0.001,
    turbineDamping: 0.001,
    fluidLagTimeConstant: 0.05,
  };
}

// ============================================================================
// INTERPOLATION
// ============================================================================

/**
 * Linear interpolation in a curve
 */
function interpolate(x: number, xPoints: number[], yPoints: number[]): number {
  if (x <= xPoints[0]) return yPoints[0];
  if (x >= xPoints[xPoints.length - 1]) return yPoints[yPoints.length - 1];
  
  for (let i = 1; i < xPoints.length; i++) {
    if (x <= xPoints[i]) {
      const t = (x - xPoints[i - 1]) / (xPoints[i] - xPoints[i - 1]);
      return yPoints[i - 1] + t * (yPoints[i] - yPoints[i - 1]);
    }
  }
  
  return yPoints[yPoints.length - 1];
}

/**
 * Get torque ratio from curves at given speed ratio
 */
export function getTorqueRatio(sr: number, curves: ConverterCurves): number {
  return interpolate(sr, curves.speedRatioPoints, curves.torqueRatioPoints);
}

/**
 * Get K-factor from curves at given speed ratio
 */
export function getKFactor(sr: number, curves: ConverterCurves): number {
  return interpolate(sr, curves.speedRatioPoints, curves.capacityFactorPoints);
}

// ============================================================================
// CORE PHYSICS CALCULATIONS
// ============================================================================

/**
 * Calculate speed ratio (SR = ω_t / ω_p)
 */
export function calcSpeedRatio(omegaP: number, omegaT: number): number {
  if (omegaP < 0.1) return 0;  // Avoid division by zero
  const sr = omegaT / omegaP;
  return Math.max(0, Math.min(1, sr));  // Clamp to [0, 1]
}

/**
 * Calculate pump torque capacity at given speed and K-factor
 * T_p = (ω_p / K)²
 */
export function calcPumpTorqueCapacity(omegaP_radps: number, kFactor: number): number {
  // K-factor is typically defined with RPM, so convert
  const omegaP_rpm = omegaP_radps * RPM_PER_RAD;
  return Math.pow(omegaP_rpm / kFactor, 2);
}

/**
 * Calculate efficiency: η = TR * SR
 */
export function calcEfficiency(torqueRatio: number, speedRatio: number): number {
  return torqueRatio * speedRatio;
}

/**
 * Calculate stall speed using K-factor formula
 * N_stall = K * sqrt(T_engine)
 */
export function calcStallSpeed(kFactorAtStall: number, engineTorque: number): number {
  if (engineTorque <= 0) return 0;
  return kFactorAtStall * Math.sqrt(engineTorque);
}

/**
 * Back-calculate K-factor from known stall speed and torque
 * K = N_stall / sqrt(T_engine)
 */
export function calcKFactorFromStall(stallRPM: number, engineTorque: number): number {
  if (engineTorque <= 0) return 0;
  return stallRPM / Math.sqrt(engineTorque);
}

// ============================================================================
// CONVERTER STATE COMPUTATION
// ============================================================================

/**
 * Compute all converter values at current operating point
 */
export function computeConverterState(
  omegaP: number,
  omegaT: number,
  torqueP: number,
  curves: ConverterCurves
): ConverterComputed {
  const sr = calcSpeedRatio(omegaP, omegaT);
  const tr = getTorqueRatio(sr, curves);
  const k = getKFactor(sr, curves);
  const efficiency = calcEfficiency(tr, sr);
  const slip = 1 - sr;
  
  const torqueT = tr * torqueP;
  const powerIn = torqueP * omegaP * HP_PER_FTLB_RADPS;
  const powerOut = torqueT * omegaT * HP_PER_FTLB_RADPS;
  const powerLoss = powerIn - powerOut;
  
  return {
    speedRatio: sr,
    torqueRatio: tr,
    kFactor: k,
    efficiency,
    slip: slip * 100,  // As percentage
    powerIn,
    powerOut,
    powerLoss,
    pumpRPM: omegaP * RPM_PER_RAD,
    turbineRPM: omegaT * RPM_PER_RAD,
  };
}

// ============================================================================
// DYNAMIC SIMULATION STEP
// ============================================================================

/**
 * Initialize converter state
 */
export function initConverterState(pumpRPM: number = 0, turbineRPM: number = 0): ConverterState {
  return {
    omegaP: pumpRPM * RAD_PER_RPM,
    omegaT: turbineRPM * RAD_PER_RPM,
    torqueP: 0,
    torqueT: 0,
    torquePLagged: 0,
    mode: 'drive',
    lockupEngaged: false,
  };
}

/**
 * Step the converter simulation forward by dt seconds
 * 
 * Implements the dynamic equations:
 * J_p * dω_p/dt = T_eng - T_p - b_p * ω_p
 * J_t * dω_t/dt = T_t - T_load - b_t * ω_t
 */
export function stepConverter(
  config: ConverterConfig,
  state: ConverterState,
  inputs: ConverterInputs
): ConverterState {
  const { torqueEngine, torqueLoad, dt } = inputs;
  const { curves, pumpInertia, turbineInertia, pumpDamping, turbineDamping, fluidLagTimeConstant } = config;
  
  // Current state
  let { omegaP, omegaT, torquePLagged, lockupEngaged } = state;
  
  // Compute speed ratio
  const sr = calcSpeedRatio(omegaP, omegaT);
  
  // Check lockup clutch logic
  if (config.hasLockup) {
    const pumpRPM = omegaP * RPM_PER_RAD;
    if (!lockupEngaged && sr >= config.lockupSROn && pumpRPM >= config.lockupMinRPM) {
      lockupEngaged = true;
    } else if (lockupEngaged && sr < config.lockupSROff) {
      lockupEngaged = false;
    }
  }
  
  let newOmegaP: number;
  let newOmegaT: number;
  let torqueP: number;
  let torqueT: number;
  let mode: 'drive' | 'coast' | 'locked';
  
  if (lockupEngaged) {
    // LOCKED MODE: Impeller and turbine rotate together
    mode = 'locked';
    const combinedInertia = pumpInertia + turbineInertia;
    const combinedDamping = pumpDamping + turbineDamping;
    
    // Combined equation: J_c * dω/dt = T_eng - T_load - b_c * ω
    const omegaC = (omegaP + omegaT) / 2;  // Average (should be nearly equal)
    const accel = (torqueEngine - torqueLoad - combinedDamping * omegaC) / combinedInertia;
    
    newOmegaP = omegaC + accel * dt;
    newOmegaT = newOmegaP;  // Locked together
    torqueP = torqueEngine;
    torqueT = torqueEngine;  // 1:1 through lockup
    
  } else {
    // DRIVE/COAST MODE: Hydrodynamic coupling
    
    // Get converter characteristics at current SR
    const tr = getTorqueRatio(sr, curves);
    const k = getKFactor(sr, curves);
    
    // Calculate steady-state pump torque capacity
    const torquePCapacity = calcPumpTorqueCapacity(omegaP, k);
    
    // Pump torque is limited by engine torque and capacity
    const torquePSteadyState = Math.min(torquePCapacity, Math.max(0, torqueEngine));
    
    // Apply fluid torque lag (first-order filter)
    // τ * dT_p/dt + T_p = T_p_ss
    const alpha = dt / (fluidLagTimeConstant + dt);
    torquePLagged = torquePLagged + alpha * (torquePSteadyState - torquePLagged);
    
    torqueP = torquePLagged;
    torqueT = tr * torqueP;
    
    // Determine mode
    mode = torqueEngine >= 0 ? 'drive' : 'coast';
    
    // Dynamic equations
    // J_p * dω_p/dt = T_eng - T_p - b_p * ω_p
    const accelP = (torqueEngine - torqueP - pumpDamping * omegaP) / pumpInertia;
    
    // J_t * dω_t/dt = T_t - T_load - b_t * ω_t
    const accelT = (torqueT - torqueLoad - turbineDamping * omegaT) / turbineInertia;
    
    // Integrate (simple Euler)
    newOmegaP = Math.max(0, omegaP + accelP * dt);
    newOmegaT = Math.max(0, omegaT + accelT * dt);
  }
  
  return {
    omegaP: newOmegaP,
    omegaT: newOmegaT,
    torqueP,
    torqueT,
    torquePLagged,
    mode,
    lockupEngaged,
  };
}

// ============================================================================
// STALL TEST SIMULATION
// ============================================================================

/**
 * Simulate a stall test (turbine held stationary)
 * Returns the equilibrium pump RPM for given engine torque
 */
export function simulateStallTest(
  config: ConverterConfig,
  engineTorqueCurve: (rpm: number) => number,
  maxIterations: number = 1000,
  tolerance: number = 1  // RPM
): { stallRPM: number; stallTorque: number; iterations: number } {
  const { curves } = config;
  const kAtStall = getKFactor(0, curves);
  
  // Initial guess using K-factor formula
  let pumpRPM = calcStallSpeed(kAtStall, engineTorqueCurve(3000));
  
  for (let i = 0; i < maxIterations; i++) {
    const engineTorque = engineTorqueCurve(pumpRPM);
    const predictedStall = calcStallSpeed(kAtStall, engineTorque);
    
    const error = predictedStall - pumpRPM;
    if (Math.abs(error) < tolerance) {
      return { stallRPM: pumpRPM, stallTorque: engineTorque, iterations: i };
    }
    
    // Relaxation update
    pumpRPM = pumpRPM + 0.3 * error;
    pumpRPM = Math.max(500, Math.min(10000, pumpRPM));  // Clamp to reasonable range
  }
  
  return { stallRPM: pumpRPM, stallTorque: engineTorqueCurve(pumpRPM), iterations: maxIterations };
}

// ============================================================================
// CHARACTERISTIC CURVE GENERATION
// ============================================================================

/**
 * Generate efficiency curve data for plotting
 */
export function generateEfficiencyCurve(curves: ConverterCurves): Array<{
  sr: number;
  tr: number;
  efficiency: number;
  slip: number;
}> {
  const data = [];
  for (let sr = 0; sr <= 1; sr += 0.02) {
    const tr = getTorqueRatio(sr, curves);
    const efficiency = calcEfficiency(tr, sr) * 100;  // As percentage
    const slip = (1 - sr) * 100;
    data.push({ sr, tr, efficiency, slip });
  }
  return data;
}

/**
 * Generate K-factor curve data for plotting
 */
export function generateKFactorCurve(curves: ConverterCurves): Array<{
  sr: number;
  kFactor: number;
}> {
  const data = [];
  for (let sr = 0; sr <= 1; sr += 0.02) {
    const kFactor = getKFactor(sr, curves);
    data.push({ sr, kFactor });
  }
  return data;
}

/**
 * Generate stall speed vs engine torque curve
 */
export function generateStallCurve(
  curves: ConverterCurves,
  minTorque: number = 200,
  maxTorque: number = 800
): Array<{ torque: number; stallRPM: number }> {
  const kAtStall = getKFactor(0, curves);
  const data = [];
  
  for (let torque = minTorque; torque <= maxTorque; torque += 25) {
    const stallRPM = calcStallSpeed(kAtStall, torque);
    data.push({ torque, stallRPM });
  }
  
  return data;
}
