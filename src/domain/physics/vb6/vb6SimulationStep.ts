/**
 * VB6 Exact Simulation Step Implementation
 * 
 * This file implements the EXACT VB6 TIMESLIP.FRM simulation loop logic.
 * 
 * VB6 Flow (TIMESLIP.FRM lines 1078-1280):
 * 1. Calculate adaptive timestep: TimeStep = TSMax * (AgsMax / Ags0)^4
 * 2. Estimate next velocity: Vel(L) = Vel0 + Ags0*gc*TimeStep + Jerk*gc*TimeStep^2/2
 * 3. Calculate VelSqrd = Vel(L)^2 - Vel0^2
 * 4. Calculate clutch/converter slip and engine RPM
 * 5. Get HP from curve, apply hpc correction
 * 6. Calculate drag forces and AMax
 * 7. Initial HP chain and time estimate
 * 8. ITERATE (up to 12 times) to converge PMI and time:
 *    - Calculate Work = (2*PI/60)^2 / (12*550*dtk1)
 *    - HPEngPMI = EngAccHP * Work
 *    - HPChasPMI = ChasAccHP * Work
 *    - HP = (HPSave - HPEngPMI) * ClutchSlip
 *    - HP = ((HP * TGEff * Efficiency - HPChasPMI) / TireSlip) - DragHP
 *    - PQWT = 550 * gc * HP / Weight
 *    - AGS(L) = PQWT / (Vel(L) * gc)
 *    - Apply jerk limits
 *    - Apply AMin/AMax clamps
 *    - time(L) = VelSqrd / (2*PQWT) + Time0
 *    - Check convergence: |100*(dtk2-dtk1)/dtk2| <= 0.01
 * 9. After convergence: Dist(L) = ((2*PQWT*dt + Vel0^2)^1.5 - Vel0^3) / (3*PQWT) + Dist0
 */

import { 
  VB6_TRACE_ENABLED, recordTracePoint,
} from './vb6TraceHook';
import {
  isInitTraceEnabled, recordInitStep, clearInitTrace,
} from './vb6InitTrace';
import { 
  gc, PI, Z6, JMin, JMax, AMin, K6, K61, Z5,
  // Quarter Pro constants
  CMU, CMUK, KP21, KP22, FRCT, AX, KV,
  // Bonneville Pro constants
  CMU_BV, CMUK_BV, KP21_BV, KP22_BV, FRCT_BV, AX_BV, KV_BV
} from './constants';
import { vb6AssignSingle } from './exactMath';
import { taby as tabyLagrange } from './dtaby';

// ============================================================================
// VB6 Type Semantics (from actual VB6 source inspection)
// ============================================================================
//
// VB6 DECLARES.BAS/TIMESLIP.FRM constants are DOUBLE (no type suffix).
// VB6 Dim'd variables (HP, TQ, force, Ags0, etc.) are Single.
// VB6 computes expressions in DOUBLE, truncates to Single on ASSIGNMENT.
//
// CORRECT pattern:
//   const TQ = asSingle(Z6 * HP / rpm);  // Double expr, Single assignment
//
// WRONG pattern (what we had before):
//   const TQ = M.div(M.mul(f(Z6), f(HP)), f(rpm));  // Truncates each op!
//
// ============================================================================

/** 
 * DEPRECATED: Float32 mode flag - NO LONGER AFFECTS NUMERICAL BEHAVIOR
 * 
 * This flag was previously used to toggle per-operation Float32 truncation via
 * the M.* and f() helpers. Those helpers have been removed because they violated
 * VB6 semantics (VB6 computes in Double, truncates only at assignment to Single).
 * 
 * The correct VB6 semantics are now implemented via vb6AssignSingle() at all
 * assignment boundaries, which is ALWAYS active regardless of this flag.
 * 
 * This export is kept for API compatibility with vb6Exact.ts but is a NO-OP.
 * DO NOT rely on this flag to change numerical behavior.
 * 
 * @deprecated No longer affects numerical behavior. Kept for API compatibility only.
 * 
 * TODO: Remove this flag and setFloat32Mode() once the vb6Strict input flag is
 * retired from SimInputs. Track removal in vb6Exact.ts where it's called.
 */
let _useFloat32_deprecated = false;

/** 
 * DEPRECATED: Enable/disable Float32 precision mode
 * 
 * WARNING: This function is a NO-OP. It does not change numerical behavior.
 * VB6 semantics (Double computation, Single assignment truncation) are now
 * always active via vb6AssignSingle() at assignment boundaries.
 * 
 * Kept for API compatibility with vb6Exact.ts. Do not rely on this function.
 * 
 * @deprecated No longer affects numerical behavior. Kept for API compatibility only.
 * 
 * TODO: Remove this function once the vb6Strict input flag is retired from SimInputs.
 * See vb6Exact.ts for the call site that needs to be removed.
 */
export function setFloat32Mode(enabled: boolean): void {
  _useFloat32_deprecated = enabled;
  if (enabled) {
    console.warn(
      '[vb6SimulationStep] setFloat32Mode() is DEPRECATED and has no effect. ' +
      'VB6 semantics (vb6AssignSingle at assignment boundaries) are always active.'
    );
  }
}

// Suppress unused variable warning
void _useFloat32_deprecated;

// ============================================================================
// LEGACY PER-OP TRUNCATION REMOVED
// ============================================================================
// The M.* and f() helpers that performed per-operation truncation have been
// removed. VB6 computes expressions in Double precision and truncates only
// at assignment to Single variables. Use vb6AssignSingle() at assignment
// boundaries instead.
//
// DO NOT reintroduce M.* or f() patterns in physics code!
// ============================================================================

// ============================================================================
// Types
// ============================================================================

/**
 * State variables that persist across simulation steps
 */
export interface VB6SimState {
  L: number;              // Step index
  time_s: number;         // Current time (seconds)
  Vel_ftps: number;       // Current velocity (ft/s)
  Dist_ft: number;        // Current distance (ft)
  AGS_g: number;          // Current acceleration (g's)
  EngRPM: number;         // Current engine RPM
  DSRPM: number;          // Current driveshaft RPM
  Gear: number;           // Current gear (1-indexed)
  SLIP: boolean;          // True if traction limited
  
  // Previous step values (for iteration)
  Vel0_ftps: number;      // Previous velocity
  Ags0_g: number;         // Previous acceleration
  Time0_s: number;        // Previous time
  Dist0_ft: number;       // Previous distance
  RPM0: number;           // Previous engine RPM
  DSRPM0: number;         // Previous driveshaft RPM
  
  // Tracking
  AgsMax_g: number;       // Maximum acceleration seen (for adaptive timestep)
  TireGrowth: number;     // Current tire growth factor
  TireCirFt: number;      // Current tire circumference (ft)
  
  // Shift tracking (VB6 TIMESLIP.FRM:1070-1072)
  ShiftFlag: number;      // 0=normal, 1=shift initiated, 2=shift in progress
  PrevGear: number;       // Previous gear (to detect shifts)
}

/**
 * Vehicle parameters (constant for a run)
 */
export interface VB6VehicleParams {
  Weight_lbf: number;
  Wheelbase_in: number;
  YCG_in: number;           // CG height (inches)
  StaticFWt_lbf: number;    // Static front weight
  TireDia_in: number;
  TireWidth_in: number;
  Rollout_in: number;
  Overhang_in?: number;       // Overhang distance (inches) for distance adjustment
  
  // Drivetrain
  GearRatio: number;        // Final drive ratio
  TGR: number[];            // Transmission gear ratios (1-indexed in VB6)
  TGEff: number[];          // Gear efficiencies
  Efficiency: number;       // Overall driveline efficiency
  DTShift: number;          // Shift time (0.2s clutch, 0.25s converter) - VB6 TIMESLIP.FRM:702-703
  Slippage: number;         // Clutch/converter slippage factor
  TorqueMult: number;       // Converter torque multiplier
  Stall: number;            // Stall/slip RPM
  LockUp: boolean;          // Converter lockup enabled
  isClutch: boolean;        // True for clutch, false for converter
  
  // Aero
  RefArea_ft2: number;
  DragCoef: number;
  LiftCoef: number;
  BodyStyle: number;        // 8 = motorcycle
  
  // PMI
  EnginePMI: number;
  TiresPMI: number;
  TransPMI: number;
  
  // HP curve (arrays for TABY interpolation)
  xrpm: number[];
  yhp: number[];
  NHP: number;              // Number of HP points
  HPTQMult: number;         // HP/TQ multiplier
  
  // Shift points
  ShiftRPM: number[];       // Shift RPMs per gear
  NGR: number;              // Number of gears
  LaunchRPM: number;        // Launch RPM (for first step handling)
  
  // Shift by Time (alternative to shift by RPM)
  ShiftMode: 'rpm' | 'time'; // 'rpm' = shift at RPM, 'time' = shift at elapsed time
  ShiftTimes: number[];      // Shift at these elapsed times (seconds)
  
  // Rev Limiter
  RevLimiterRPM: number;     // High-side RPM limit (0 = disabled)
}

/**
 * Environment parameters
 */
export interface VB6EnvParams {
  rho: number;              // Air density (lbm/ft³) - VB6 uses lbm not slugs!
  hpc: number;              // HP correction factor
  TractionIndex: number;
  TrackTempEffect: number;
  WindSpeed_mph: number;
  WindAngle_deg: number;
  isLandSpeed?: boolean;    // True for Bonneville Pro mode (different constants)
  nextDistPrint?: number;   // Next distance print point (ft) for VB6 distance targeting
  prevDistPrint?: number;   // Previous distance print point (ft) for VB6 timestep limiting
  TimePrintInc?: number;    // VB6 TIMESLIP.FRM:902-918 - Time print increment
  absTimePrint_s?: number;  // ABSOLUTE time for next time print (not ET). Use Infinity pre-rollout.
  iDist?: number;           // VB6 iDist - current distance print index (1-based like VB6)
  shiftRPMs?: number[];     // VB6 ShiftRPM array for VelShiftMatch calculation
  Shift2PrintTime?: number; // VB6 TIMESLIP.FRM:1071 - Target time for shift completion
  iMPH?: number;            // VB6 iMPH - current MPH print index (1-based, 1 or 2)
  MPHtoPrint?: number[];    // VB6 MPHtoPrint array [60/Z5, 100/Z5] in ft/s for VelMPHMatch
  ovradj?: number;          // VB6 TIMESLIP.FRM:812-813,1381 - Overhang adjustment (ft)
}

/**
 * Computed values for current step
 */
export interface VB6StepComputed {
  TimeStep_s: number;
  VelSqrd: number;
  LockRPM: number;
  ClutchSlip: number;
  zStall: number;
  SlipRatio: number;
  TireSlip: number;
  WindFPS: number;
  q: number;
  RefArea2_ft2: number;
  DownForce_lbf: number;
  DragForce_lbf: number;
  DragHP: number;
  DynamicFWT_lbf: number;
  DynamicRWT_lbf: number;
  WheelBarWT_lbf: number;
  CRTF: number;
  AMax_g: number;
  ChassisPMI: number;
  EngAccHP: number;
  ChasAccHP: number;
  HPSave: number;       // Engine HP from curve (before clutch slip and drivetrain losses)
  HPAtWheels: number;   // HP at wheels (after drivetrain losses, before drag subtraction)
  HP: number;           // Net HP (HPAtWheels - DragHP)
  PQWT: number;
  iterations: number;
}

// ============================================================================
// Helper Functions
// ============================================================================

// TABY wrapper removed - use taby() from dtaby.ts directly
// See docs/audit/parity_taby_bisc_engine.md for consolidation rationale

/**
 * VB6 Tire subroutine - calculates tire growth and circumference
 * 
 * ============================================================================
 * VB6↔TS CROSSWALK (authoritative)
 * ============================================================================
 * Source: TIMESLIP.FRM lines 1585-1606
 * 
 * VB6 Declaration:
 *   Private Sub Tire(TireGrowth As Single, TireCirFt As Single)
 *   Dim TGK As Single, TGLinear As Single, TireSQ As Single
 * 
 * VB6 Variable Types:
 *   TireGrowth, TireCirFt - Single (ByRef parameters)
 *   TGK, TGLinear, TireSQ - Single (local)
 *   gc_TireWidth.Value    - Variant→Double (CValue)
 *   TireDia               - Single (module-level, line 534)
 *   Vel(L)                - Single (module-level array)
 *   Ags0                  - Single (module-level, line 527)
 *   PI                    - Double (DECLARES.BAS, no suffix)
 * 
 * VB6 Coercion Rules:
 *   1. Expressions with Double operand (PI, gc_*.Value) compute in Double
 *   2. Truncation to Single occurs ONLY at assignment to Single variable
 *   3. NO per-operation truncation in intermediate calculations
 * ============================================================================
 */
export function vb6Tire(
  TireDia_in: number,
  TireWidth_in: number,
  Vel_ftps: number,
  Ags0_g: number,
  isLandSpeed?: boolean
): { TireGrowth: number; TireCirFt: number } {
  let TireGrowth: number;
  let TireCirFt: number;
  
  if (isLandSpeed) {
    // VB6: TIMESLIP.FRM:1603-1605 - Bonneville Pro
    // TireGrowth = 1 + 0.00004 * Vel(L)
    // TireCirFt = TireGrowth * TireDia * PI / 12
    // Note: No tire squat for BVPro!
    // All literals are Double, Vel is Single → computed in Double, assigned to Single
    TireGrowth = vb6AssignSingle(1 + 0.00004 * Vel_ftps);
    TireCirFt = vb6AssignSingle(TireGrowth * TireDia_in * PI / 12);
  } else {
    // VB6: TIMESLIP.FRM:1589-1596 - Quarter Pro
    // TGK = (gc_TireWidth.Value^1.4 + TireDia - 16) / (0.171 * TireDia^1.7)
    // gc_TireWidth is CValue (Double), TireDia is Single, literals are Double
    // Expression computed in Double, assigned to TGK (Single)
    const TGK = vb6AssignSingle(
      (Math.pow(TireWidth_in, 1.4) + TireDia_in - 16) / (0.171 * Math.pow(TireDia_in, 1.7))
    );
    
    // TireGrowth = 1 + TGK * 0.0000135 * Vel^1.6
    // TGK is Single, literals are Double, Vel is Single → computed in Double
    TireGrowth = vb6AssignSingle(1 + TGK * 0.0000135 * Math.pow(Vel_ftps, 1.6));
    
    // TGLinear = 1 + TGK * 0.00035 * Vel
    const TGLinear = vb6AssignSingle(1 + TGK * 0.00035 * Vel_ftps);
    
    // If TGLinear < TireGrowth Then TireGrowth = TGLinear
    if (TGLinear < TireGrowth) TireGrowth = TGLinear;
    
    // TireSQ = TireGrowth - 0.035 * Abs(Ags0)
    // TireGrowth is Single, literal is Double, Ags0 is Single → computed in Double
    const TireSQ = vb6AssignSingle(TireGrowth - 0.035 * Math.abs(Ags0_g));
    
    // TireCirFt = TireSQ * TireDia * PI / 12
    // TireSQ/TireDia are Single, PI is Double → computed in Double
    TireCirFt = vb6AssignSingle(TireSQ * TireDia_in * PI / 12);
  }
  
  return { TireGrowth, TireCirFt };
}

/**
 * Calculate CAXI (traction coefficient base)
 * 
 * ============================================================================
 * VB6↔TS CROSSWALK (authoritative)
 * ============================================================================
 * Source: TIMESLIP.FRM line 1050
 * 
 * VB6 Statement:
 *   CAXI = (1 - (gc_TractionIndex.Value - 1) * 0.01) / (TrackTempEffect ^ 0.25)
 * 
 * VB6 Variable Types:
 *   CAXI             - Single (line 508)
 *   TractionIndex    - Variant→Double (CValue)
 *   TrackTempEffect  - Single (line 672)
 *   Literals (1, 0.01, 0.25) - Double (no suffix)
 * 
 * VB6 Coercion:
 *   Expression computed in Double (CValue promotes), truncated to Single on assignment
 * ============================================================================
 */
export function calcCAXI(TractionIndex: number, TrackTempEffect: number): number {
  // Compute in Double, truncate to Single on assignment
  return vb6AssignSingle((1 - (TractionIndex - 1) * 0.01) / Math.pow(TrackTempEffect, 0.25));
}

/**
 * Get AX (traction coefficient multiplier)
 * VB6: TIMESLIP.FRM:551 - Const AX = 10.8 for Quarter Jr/Pro
 * VB6: TIMESLIP.FRM:561 - Const AX = 9.7 for Bonneville Pro
 * This is a constant, not calculated from temperature
 */
export function calcAX(isLandSpeed?: boolean): number {
  return isLandSpeed ? AX_BV : AX;
}

// ============================================================================
// VB6 doOpt Subroutine and Related Functions
// TIMESLIP.FRM:1609-1756
// ============================================================================

/**
 * VB6 ASV array - saved values for interpolation during doOpt
 */
export interface VB6ASV {
  time: number;    // ASV(1)
  dist: number;    // ASV(2)
  vel: number;     // ASV(3)
  ags: number;     // ASV(4)
  slip: number;    // ASV(5)
  engRPM: number;  // ASV(6)
  gear: number;    // ASV(7)
}

/**
 * VB6 doOpt context - all variables needed for doOpt interpolation
 */
export interface VB6DoOptContext {
  ASV: VB6ASV;
  Time0: number;
  Dist0: number;
  Vel0: number;
  Ags0: number;
  RPM0: number;
  DistToPrint: number;
  absTimePrint_s: number;  // ABSOLUTE time for next time print (not ET)
  MPHtoPrint: number;
  iDist: number;
  iMPH: number;
  DistTol: number;
  TimeTol: number;
  KV: number;
  ShiftFlag: number;
  isLandSpeed: boolean;
  Z5: number;
  SaveTime: number;
}

/**
 * VB6 doOpt result - interpolated values
 */
export interface VB6DoOptResult {
  time: number;
  dist: number;
  vel: number;
  ags: number;
  slip: number;
  engRPM: number;
  gear: number;
  TIMESLIP: number[];  // Updated TIMESLIP array
  SaveTime: number;    // Updated SaveTime
  didInterpolate: boolean;
}

/**
 * VB6 sub310 - DISTANCE INTERPOLATION
 * TIMESLIP.FRM:1609-1640
 */
function vb6Sub310(ctx: VB6DoOptContext, factor1: number, TIMESLIP: number[], SaveTime: number): { 
  time: number; dist: number; vel: number; TIMESLIP: number[]; SaveTime: number 
} {
  const factor = factor1;
  const time = ctx.Time0 + factor * (ctx.ASV.time - ctx.Time0);
  const dist = ctx.DistToPrint;
  const vel = ctx.Vel0 + factor * (ctx.ASV.vel - ctx.Vel0);
  
  const Z5 = ctx.Z5;
  const newTIMESLIP = [...TIMESLIP];
  let newSaveTime = SaveTime;
  
  if (!ctx.isLandSpeed) {
    // Quarter Jr and Quarter Pro
    switch (ctx.iDist) {
      case 3: newTIMESLIP[1] = time; break;  // 60 ft
      case 4: newTIMESLIP[2] = time; break;  // 330 ft
      case 5: newSaveTime = time; break;      // 594 ft
      case 6:
        newTIMESLIP[3] = time;  // 660 ft
        newTIMESLIP[4] = Z5 * 66 / (newTIMESLIP[3] - newSaveTime);
        newSaveTime = 0;
        break;
      case 7: newTIMESLIP[5] = time; break;  // 1000 ft
      case 8: newSaveTime = time; break;      // 1254 ft
      case 9:
        newTIMESLIP[6] = time;  // 1320 ft
        newTIMESLIP[7] = Z5 * 66 / (newTIMESLIP[6] - newSaveTime);
        newSaveTime = 0;
        break;
    }
  } else {
    // Bonneville Pro
    switch (ctx.iDist) {
      case 3: newTIMESLIP[1] = vel * Z5; break;
      case 4: newTIMESLIP[2] = vel * Z5; break;
      case 5: newTIMESLIP[3] = vel * Z5; break;
      case 6: newTIMESLIP[4] = vel * Z5; break;
      case 7: newTIMESLIP[5] = vel * Z5; break;
      case 8: newTIMESLIP[6] = vel * Z5; break;
      case 9: newTIMESLIP[7] = vel * Z5; break;
    }
  }
  
  return { time, dist, vel, TIMESLIP: newTIMESLIP, SaveTime: newSaveTime };
}

/**
 * VB6 sub315 - TIME INTERPOLATION
 * TIMESLIP.FRM:1642-1648
 */
function vb6Sub315(ctx: VB6DoOptContext, factor2: number): { time: number; dist: number; vel: number } {
  const factor = factor2;
  const time = ctx.absTimePrint_s;
  const dist = ctx.Dist0 + factor * (ctx.ASV.dist - ctx.Dist0);
  const vel = ctx.Vel0 + factor * (ctx.ASV.vel - ctx.Vel0);
  return { time, dist, vel };
}

/**
 * VB6 sub320 - VELOCITY INTERPOLATION
 * TIMESLIP.FRM:1650-1656
 */
function vb6Sub320(ctx: VB6DoOptContext, factor3: number): { time: number; dist: number; vel: number } {
  const factor = factor3;
  const time = ctx.Time0 + factor * (ctx.ASV.time - ctx.Time0);
  const dist = ctx.Dist0 + factor * (ctx.ASV.dist - ctx.Dist0);
  const vel = ctx.MPHtoPrint;
  return { time, dist, vel };
}

/**
 * VB6 sub325 - COMMON INTERPOLATION
 * TIMESLIP.FRM:1658-1681
 */
function vb6Sub325(
  ctx: VB6DoOptContext, 
  factor: number, 
  _interpolated: { time: number; dist: number; vel: number },
  prevSlip: number
): { ags: number; slip: number; engRPM: number; gear: number } {
  // VB6: factor = factor ^ 0.7
  const factorAdj = Math.pow(factor, 0.7);
  const ags = ctx.Ags0 + factorAdj * (ctx.ASV.ags - ctx.Ags0);
  
  // VB6: SLIP(L) = 0: If SLIP(L - 1) = 1 And ASV(5) = 1 Then SLIP(L) = 1
  let slip = 0;
  if (prevSlip === 1 && ctx.ASV.slip === 1) slip = 1;
  
  const engRPM = ctx.RPM0 + factorAdj * (ctx.ASV.engRPM - ctx.RPM0);
  const gear = ctx.ASV.gear;
  
  return { ags, slip, engRPM, gear };
}

/**
 * VB6 doOpt - Optimized interpolation during gear shifts
 * TIMESLIP.FRM:1683-1756
 * 
 * Called when ShiftFlag >= 2 AND time is within TimeTol of Shift2PrintTime.
 * Handles three overshoot conditions: distance, time, and velocity.
 */
export function vb6DoOpt(ctx: VB6DoOptContext, prevSlip: number, TIMESLIP: number[], SaveTime: number): VB6DoOptResult {
  let opt1 = 0, opt2 = 0, opt3 = 0;
  let factor1 = 0, factor2 = 0, factor3 = 0;
  
  // Check distance overshoot (opt1)
  // VB6: If Dist(L) >= DistToPrint(iDist) + DistTol Then
  if (ctx.ASV.dist >= ctx.DistToPrint + ctx.DistTol) {
    opt1 = 1;
    factor1 = (ctx.DistToPrint - ctx.Dist0) / (ctx.ASV.dist - ctx.Dist0);
    if (factor1 <= 0 || factor1 >= 1) { factor1 = 0; opt1 = 0; }
  }
  
  // Check time overshoot (opt2)
  // VB6: If time(L) >= TimePrint + TimeTol Then
  // CRITICAL: Only check if absTimePrint_s is finite (not Infinity pre-rollout)
  if (Number.isFinite(ctx.absTimePrint_s) && ctx.ASV.time >= ctx.absTimePrint_s + ctx.TimeTol) {
    opt2 = 1;
    factor2 = (ctx.absTimePrint_s - ctx.Time0) / (ctx.ASV.time - ctx.Time0);
    if (factor2 <= 0 || factor2 >= 1) { factor2 = 0; opt2 = 0; }
  }
  
  // Check velocity overshoot (opt3)
  // VB6: If iMPH <= 2 Then If Vel(L) >= MPHtoPrint(iMPH) + KV Then
  if (ctx.iMPH <= 2) {
    if (ctx.ASV.vel >= ctx.MPHtoPrint + ctx.KV) {
      opt3 = 1;
      factor3 = (ctx.MPHtoPrint - ctx.Vel0) / (ctx.ASV.vel - ctx.Vel0);
      if (factor3 <= 0 || factor3 >= 1) { factor3 = 0; opt3 = 0; }
    }
  }
  
  const opt = opt1 + opt2 + opt3;
  
  // If no interpolation needed, return original values
  if (opt === 0) {
    return {
      time: ctx.ASV.time,
      dist: ctx.ASV.dist,
      vel: ctx.ASV.vel,
      ags: ctx.ASV.ags,
      slip: ctx.ASV.slip,
      engRPM: ctx.ASV.engRPM,
      gear: ctx.ASV.gear,
      TIMESLIP,
      SaveTime,
      didInterpolate: false,
    };
  }
  
  let result: { time: number; dist: number; vel: number } = { 
    time: ctx.ASV.time, dist: ctx.ASV.dist, vel: ctx.ASV.vel 
  };
  let usedFactor = 0;
  let newTIMESLIP = [...TIMESLIP];
  let newSaveTime = SaveTime;
  
  // VB6 Select Case opt
  switch (opt) {
    case 1:
      if (opt1 === 1) {
        const sub310Result = vb6Sub310(ctx, factor1, newTIMESLIP, newSaveTime);
        result = { time: sub310Result.time, dist: sub310Result.dist, vel: sub310Result.vel };
        newTIMESLIP = sub310Result.TIMESLIP;
        newSaveTime = sub310Result.SaveTime;
        usedFactor = factor1;
      } else if (opt2 === 1) {
        result = vb6Sub315(ctx, factor2);
        usedFactor = factor2;
      } else if (opt3 === 1) {
        result = vb6Sub320(ctx, factor3);
        usedFactor = factor3;
      }
      break;
      
    case 2:
      if (opt1 === 0) {
        // Time and velocity only
        if (factor2 === factor3) {
          result = vb6Sub315(ctx, factor2);
          usedFactor = factor2;
        } else if (factor2 < factor3) {
          result = vb6Sub315(ctx, factor2);
          usedFactor = factor2;
          // VB6 would call sub320 after sub315, but we take the first
        } else {
          result = vb6Sub320(ctx, factor3);
          usedFactor = factor3;
        }
      } else if (opt2 === 0) {
        // Distance and velocity only
        if (factor1 === factor3) {
          const sub310Result = vb6Sub310(ctx, factor1, newTIMESLIP, newSaveTime);
          result = { time: sub310Result.time, dist: sub310Result.dist, vel: sub310Result.vel };
          newTIMESLIP = sub310Result.TIMESLIP;
          newSaveTime = sub310Result.SaveTime;
          usedFactor = factor1;
        } else if (factor1 < factor3) {
          const sub310Result = vb6Sub310(ctx, factor1, newTIMESLIP, newSaveTime);
          result = { time: sub310Result.time, dist: sub310Result.dist, vel: sub310Result.vel };
          newTIMESLIP = sub310Result.TIMESLIP;
          newSaveTime = sub310Result.SaveTime;
          usedFactor = factor1;
        } else {
          result = vb6Sub320(ctx, factor3);
          usedFactor = factor3;
        }
      } else if (opt3 === 0) {
        // Distance and time only
        if (factor1 === factor2) {
          const sub310Result = vb6Sub310(ctx, factor1, newTIMESLIP, newSaveTime);
          result = { time: sub310Result.time, dist: sub310Result.dist, vel: sub310Result.vel };
          newTIMESLIP = sub310Result.TIMESLIP;
          newSaveTime = sub310Result.SaveTime;
          usedFactor = factor1;
        } else if (factor1 < factor2) {
          const sub310Result = vb6Sub310(ctx, factor1, newTIMESLIP, newSaveTime);
          result = { time: sub310Result.time, dist: sub310Result.dist, vel: sub310Result.vel };
          newTIMESLIP = sub310Result.TIMESLIP;
          newSaveTime = sub310Result.SaveTime;
          usedFactor = factor1;
        } else {
          result = vb6Sub315(ctx, factor2);
          usedFactor = factor2;
        }
      }
      break;
      
    case 3:
      // All three overshoot - pick smallest factor first
      if (factor1 === factor2 && factor2 === factor3) {
        const sub310Result = vb6Sub310(ctx, factor1, newTIMESLIP, newSaveTime);
        result = { time: sub310Result.time, dist: sub310Result.dist, vel: sub310Result.vel };
        newTIMESLIP = sub310Result.TIMESLIP;
        newSaveTime = sub310Result.SaveTime;
        usedFactor = factor1;
      } else if (factor1 < factor2 && factor1 < factor3) {
        const sub310Result = vb6Sub310(ctx, factor1, newTIMESLIP, newSaveTime);
        result = { time: sub310Result.time, dist: sub310Result.dist, vel: sub310Result.vel };
        newTIMESLIP = sub310Result.TIMESLIP;
        newSaveTime = sub310Result.SaveTime;
        usedFactor = factor1;
      } else if (factor2 < factor1 && factor2 < factor3) {
        result = vb6Sub315(ctx, factor2);
        usedFactor = factor2;
      } else if (factor3 < factor1 && factor3 < factor2) {
        result = vb6Sub320(ctx, factor3);
        usedFactor = factor3;
      } else if (factor1 === factor2) {
        if (factor1 < factor3) {
          const sub310Result = vb6Sub310(ctx, factor1, newTIMESLIP, newSaveTime);
          result = { time: sub310Result.time, dist: sub310Result.dist, vel: sub310Result.vel };
          newTIMESLIP = sub310Result.TIMESLIP;
          newSaveTime = sub310Result.SaveTime;
          usedFactor = factor1;
        } else {
          result = vb6Sub320(ctx, factor3);
          usedFactor = factor3;
        }
      } else {
        // factor1 === factor3 or factor2 === factor3
        if (factor1 < factor2) {
          const sub310Result = vb6Sub310(ctx, factor1, newTIMESLIP, newSaveTime);
          result = { time: sub310Result.time, dist: sub310Result.dist, vel: sub310Result.vel };
          newTIMESLIP = sub310Result.TIMESLIP;
          newSaveTime = sub310Result.SaveTime;
          usedFactor = factor1;
        } else {
          result = vb6Sub315(ctx, factor2);
          usedFactor = factor2;
        }
      }
      break;
  }
  
  // Apply sub325 common interpolation
  const sub325Result = vb6Sub325(ctx, usedFactor, result, prevSlip);
  
  return {
    time: result.time,
    dist: result.dist,
    vel: result.vel,
    ags: sub325Result.ags,
    slip: sub325Result.slip,
    engRPM: sub325Result.engRPM,
    gear: sub325Result.gear,
    TIMESLIP: newTIMESLIP,
    SaveTime: newSaveTime,
    didInterpolate: true,
  };
}

// ============================================================================
// Main Simulation Step Function
// ============================================================================

/**
 * Throttle stop configuration for bracket racing.
 * Applied during simulation to reduce HP during specified time window.
 */
export interface ThrottleStopParams {
  enabled: boolean;
  activateTime_s: number;    // When stop activates (seconds after rollout)
  duration_s: number;        // How long stop is active
  throttlePct: number;       // Throttle percentage when active (0-100)
  rampTime_s?: number;       // Time to ramp (default: instant)
}

// RSA Extension: Throttle stop reduces HP during the specified time window.
// This is NOT part of original VB6 code - it's an RSA addition for bracket racing.

/**
 * Execute one VB6 simulation step with full iteration loop.
 * 
 * This is an EXACT port of TIMESLIP.FRM lines 1078-1280.
 * 
 * @param state Current simulation state (will be modified)
 * @param vehicle Vehicle parameters
 * @param env Environment parameters
 * @param TSMax Maximum timestep (from initialization)
 * @param throttleStop Optional throttle stop configuration
 * @returns Computed values for this step
 */
export function vb6SimulationStep(
  state: VB6SimState,
  vehicle: VB6VehicleParams,
  env: VB6EnvParams,
  TSMax: number,
  throttleStop?: ThrottleStopParams  // RSA extension for bracket racing
): VB6StepComputed {
  const iGear = state.Gear;
  
  // ========================================================================
  // TIMESLIP.FRM:1070-1082 - Timestep Selection
  // ============================================================================
  // VB6↔TS CROSSWALK (authoritative)
  // ============================================================================
  // Source: TIMESLIP.FRM lines 1070-1082
  //
  // VB6 Variable Types (from TIMESLIP.FRM Dim statements):
  //   TimeStep - Single (line 526)
  //   TSMax    - Single (line 513)
  //   AgsMax   - Single (line 507)
  //   Ags0     - Single (line 527)
  //   DTShift  - Single (line 513)
  //   Literal 4 in exponent - Double (no suffix)
  //
  // VB6 Coercion Rules:
  //   1. All operands are Single, but literal 4 is Double
  //   2. Expression (AgsMax / Ags0) ^ 4 computed in Double (due to literal 4)
  //   3. TSMax * (...) computed in Double
  //   4. Truncation to Single occurs ONLY at assignment to TimeStep
  // ============================================================================
  let TimeStep: number;
  const gearChanged = state.Gear !== state.PrevGear;
  
  // VB6 TIMESLIP.FRM order:
  // - Line 1082: TimeStep = TSMax * (AgsMax / Ags0) ^ 4  (uses Ags0 from PREVIOUS iteration's line 1090)
  // - Line 1090: Ags0 = AGS(L)  (updates Ags0 for use in velocity calc and next iteration)
  // 
  // At line 1082, Ags0 has the value set at line 1090 of the PREVIOUS iteration.
  // So at line 1082, Ags0 = AGS from TWO iterations ago.
  // This matches VB6! state.Ags0_g IS the correct value for timestep.
  const Ags0_for_timestep = state.Ags0_g;  // Use AGS from TWO steps ago (matches VB6)
  
  if (gearChanged) {
    // VB6: TIMESLIP.FRM:1072 - TimeStep = DTShift at gear change
    // DTShift is Single, assigned to TimeStep (Single)
    TimeStep = vb6AssignSingle(vehicle.DTShift);
    state.PrevGear = state.Gear;
  } else {
    // VB6 line 1082: TimeStep = TSMax * (AgsMax / Ags0) ^ 4
    // TSMax/AgsMax/Ags0 are Single, literal 4 is Double → computed in Double
    // TimeStep is Single → truncated on assignment
    if (Ags0_for_timestep > 0) {
      TimeStep = vb6AssignSingle(TSMax * Math.pow(state.AgsMax_g / Ags0_for_timestep, 4));
    } else {
      TimeStep = vb6AssignSingle(TSMax);
    }
    // For land speed runs, enforce minimum timestep to prevent excessive iterations
    // VB6 Bonneville Pro uses larger timesteps at high speed
    if (env.isLandSpeed && TimeStep < 0.001) {
      TimeStep = vb6AssignSingle(0.001);  // 1ms minimum for land speed
    }
  }
  
  // ========================================================================
  // TIMESLIP.FRM:1084-1088 - Jerk Calculation
  // ============================================================================
  // VB6↔TS CROSSWALK (authoritative)
  // ============================================================================
  // Source: TIMESLIP.FRM lines 1084-1088
  //
  // VB6 Code:
  //   250 Jerk = 0    'jerk has units of g's per second
  //       Work = time(L) - Time0
  //       If Work > 0 Then Jerk = (AGS(L) - Ags0) / Work
  //       If Jerk < JMin Then Jerk = JMin
  //       If Jerk > JMax Then Jerk = JMax
  //
  // VB6 Variable Types:
  //   Jerk     - Single (line 513)
  //   Work     - Single (line 539)
  //   time(L)  - Single (line 536, array element)
  //   Time0    - Single (line 519)
  //   AGS(L)   - Single (line 536, array element)
  //   Ags0     - Single (line 527)
  //   JMin     - Const = -4 (Double, no suffix, line 543)
  //   JMax     - Const = 2 (Double, no suffix, line 544)
  //
  // VB6 Coercion Rules:
  //   1. Work = time(L) - Time0: Single - Single → Single (no Double operand)
  //   2. Jerk = (AGS(L) - Ags0) / Work: Single / Single → Single
  //   3. Jerk < JMin: Single compared to Double constant (promotes to Double for comparison)
  //   4. Jerk = JMin: Double constant assigned to Single → truncated
  // ============================================================================
  
  // VB6 line 1084: Jerk = 0
  let Jerk = vb6AssignSingle(0);
  
  // VB6 line 1085: Work = time(L) - Time0
  // time(L) and Time0 are both Single → expression is Single, assigned to Work (Single)
  const Work_time = vb6AssignSingle(state.time_s - state.Time0_s);
  
  if (Work_time > 0) {
    // VB6 line 1086: Jerk = (AGS(L) - Ags0) / Work
    // AGS(L), Ags0, Work are all Single → expression is Single, assigned to Jerk (Single)
    // Note: In VB6, AGS(L) = value from PREVIOUS iteration's line 1221
    // Ags0 = value from PREVIOUS iteration's line 1090 = AGS(L) from TWO iterations ago
    // So VB6 jerk = (AGS_{N-1} - AGS_{N-2}) / Work
    Jerk = vb6AssignSingle((state.AGS_g - state.Ags0_g) / Work_time);
  }
  
  // VB6 lines 1087-1088: Clamp Jerk to [JMin, JMax]
  // JMin/JMax are Double constants, Jerk is Single
  // Comparison promotes Jerk to Double, then result assigned back to Single
  if (Jerk < JMin) Jerk = vb6AssignSingle(JMin);
  if (Jerk > JMax) Jerk = vb6AssignSingle(JMax);
  
  // ========================================================================
  // TIMESLIP.FRM:1090-1096 - Save previous values
  // ============================================================================
  // VB6↔TS CROSSWALK (authoritative)
  // ============================================================================
  // Source: TIMESLIP.FRM lines 1090-1096
  //
  // VB6 Code:
  //   Vel0 = Vel(L):      Ags0 = AGS(L)
  //   Tire TireGrowth, TireCirFt
  //   RPM0 = EngRPM(L):   Time0 = time(L)
  //   If RPM0 = gc_LaunchRPM.Value And Time0 = 0 Then
  //       RPM0 = Stall:   If gc_LaunchRPM.Value < Stall Then Time0 = gc_EnginePMI.Value * (Stall - gc_LaunchRPM.Value) / 250000
  //   End If
  //   Dist0 = Dist(L)
  //
  // VB6 Variable Types:
  //   Vel0, Ags0, RPM0, Time0, Dist0, DSRPM0 - Single (lines 522, 527, 515, 519, 526, 537)
  //   Vel(L), AGS(L), EngRPM(L), time(L), Dist(L), DSRPM - Single (line 536, 537)
  //   gc_LaunchRPM.Value, gc_EnginePMI.Value - Variant→Double (CValue)
  //   Stall - Single (line 517)
  //   Literal 250000 - Double (no suffix)
  // ============================================================================
  
  // VB6 line 1090: Vel0 = Vel(L): Ags0 = AGS(L)
  // Single = Single assignments
  state.Vel0_ftps = vb6AssignSingle(state.Vel_ftps);
  state.Ags0_g = vb6AssignSingle(state.AGS_g);
  
  // VB6 line 1092: Time0 = time(L)
  state.Time0_s = vb6AssignSingle(state.time_s);
  state.Dist0_ft = vb6AssignSingle(state.Dist_ft);
  
  // VB6 line 1092: RPM0 = EngRPM(L)
  state.RPM0 = vb6AssignSingle(state.EngRPM);
  state.DSRPM0 = vb6AssignSingle(state.DSRPM);
  
  // TIMESLIP.FRM:1093-1094 - Special handling for first step at launch
  // VB6: If RPM0 = gc_LaunchRPM.Value And Time0 = 0 Then
  //     RPM0 = Stall: Time0 = EnginePMI * (Stall - LaunchRPM) / 250000
  // RPM0 is Single, gc_LaunchRPM.Value is CValue (Double) → comparison in Double
  // Use tolerance for floating point comparison
  const isFirstStep = Math.abs(state.RPM0 - vehicle.LaunchRPM) < 1 && state.Time0_s === 0;
  if (isFirstStep) {
    // VB6: RPM0 = Stall (Single = Single)
    state.RPM0 = vb6AssignSingle(vehicle.Stall);
    if (vehicle.LaunchRPM < vehicle.Stall) {
      // VB6: Time0 = gc_EnginePMI.Value * (Stall - gc_LaunchRPM.Value) / 250000
      // EnginePMI is CValue (Double), Stall is Single, LaunchRPM is CValue (Double), 250000 is Double
      // Expression computed in Double, assigned to Time0 (Single)
      state.Time0_s = vb6AssignSingle(vehicle.EnginePMI * (vehicle.Stall - vehicle.LaunchRPM) / 250000);
    }
  }
  
  // ========================================================================
  // TIMESLIP.FRM:1091 - Update tire growth
  // ========================================================================
  const tireResult = vb6Tire(vehicle.TireDia_in, vehicle.TireWidth_in, state.Vel_ftps, state.Ags0_g, env.isLandSpeed);
  state.TireGrowth = tireResult.TireGrowth;
  state.TireCirFt = tireResult.TireCirFt;
  
  // ========================================================================
  // TIMESLIP.FRM:1098-1102 - Calculate tire slip
  // ============================================================================
  // VB6↔TS CROSSWALK (authoritative)
  // ============================================================================
  // Source: TIMESLIP.FRM lines 1098-1102 (Quarter Pro), line 875 (Bonneville Pro)
  //
  // VB6 Variable Types (from TIMESLIP.FRM Dim statements):
  //   TireSlip        - Single (line 519)
  //   Work            - Single (line 539)
  //   Dist0           - Single (line 526)
  //   TractionIndex   - Variant→Double (gc_TractionIndex.Value is CValue)
  //   TrackTempEffect - Single (line 672)
  //   Literals (1.02, 0.005, 3, 1320, etc.) - Double (no suffix)
  //
  // VB6 Coercion Rules:
  //   1. gc_TractionIndex.Value (CValue) returns Variant, promotes to Double
  //   2. Expression with Double operand computes in Double
  //   3. Truncation to Single occurs ONLY at assignment to Single variable
  //   4. Work is assigned (Single), then used in TireSlip expression
  // ============================================================================
  let TireSlip: number;
  if (env.isLandSpeed) {
    // Bonneville Pro: TIMESLIP.FRM:875
    // VB6: TireSlip = 1.01 + (gc_TractionIndex.Value - 1) * 0.01
    // TractionIndex is CValue (Double), literals are Double → computed in Double
    // TireSlip is Single → truncated on assignment
    TireSlip = vb6AssignSingle(1.01 + (env.TractionIndex - 1) * 0.01);
  } else {
    // Quarter Pro: TIMESLIP.FRM:1100-1101
    // VB6 line 1100: Work = 0.005 * (gc_TractionIndex.Value - 1) + 3 * (TrackTempEffect - 1)
    // TractionIndex is CValue (Double), TrackTempEffect is Single, literals are Double
    // Expression computed in Double, assigned to Work (Single)
    const Work_slip = vb6AssignSingle(
      0.005 * (env.TractionIndex - 1) + 3 * (env.TrackTempEffect - 1)
    );
    
    // VB6 line 1101: TireSlip = 1.02 + Work * (1 - (Dist0 / 1320) ^ 2)
    // Work is Single, Dist0 is Single, literals are Double → computed in Double
    // TireSlip is Single → truncated on assignment
    TireSlip = vb6AssignSingle(
      1.02 + Work_slip * (1 - Math.pow(state.Dist0_ft / 1320, 2))
    );
  }
  
  // ========================================================================
  // TIMESLIP.FRM:1074-1075 - Calculate chassis PMI for this gear
  // ============================================================================
  // VB6↔TS CROSSWALK (authoritative)
  // ============================================================================
  // Source: TIMESLIP.FRM lines 1074-1075
  //
  // VB6 Code:
  //   Rem**  CALCULATE THE TOTAL CHASSIS INERTIA FOR THIS GEAR
  //   ChassisPMI = gc_TiresPMI.Value + gc_TransPMI.Value * gc_GearRatio.Value ^ 2 * TGR(iGear) ^ 2
  //
  // VB6 Variable Types (from TIMESLIP.FRM Dim statements):
  //   ChassisPMI           - Single (line 507)
  //   gc_TiresPMI.Value    - Variant→Double (CValue control)
  //   gc_TransPMI.Value    - Variant→Double (CValue control)
  //   gc_GearRatio.Value   - Variant→Double (CValue control)
  //   TGR(iGear)           - Single (line 533, array element)
  //   iGear                - Integer (line 529)
  //   Literal 2 in exponent - Double (no suffix)
  //
  // VB6 Coercion Rules:
  //   1. gc_*.Value are CValue (Variant→Double)
  //   2. TGR(iGear) is Single, but ^ 2 promotes to Double
  //   3. Entire expression computed in Double
  //   4. Truncation to Single occurs ONLY at assignment to ChassisPMI
  // ============================================================================
  const TGR_gear = vehicle.TGR[iGear - 1] ?? 1; // Convert to 0-indexed
  // VB6: ChassisPMI = gc_TiresPMI.Value + gc_TransPMI.Value * gc_GearRatio.Value ^ 2 * TGR(iGear) ^ 2
  // All CValue (Double), TGR is Single but ^ 2 promotes to Double → computed in Double
  // ChassisPMI is Single → truncated on assignment
  const ChassisPMI = vb6AssignSingle(
    vehicle.TiresPMI + vehicle.TransPMI * Math.pow(vehicle.GearRatio, 2) * Math.pow(TGR_gear, 2)
  );
  
  // ========================================================================
  // TIMESLIP.FRM:1107 - Estimate next velocity (first pass)
  // ============================================================================
  // VB6↔TS CROSSWALK (authoritative)
  // ============================================================================
  // Source: TIMESLIP.FRM line 1107
  //
  // VB6 Code:
  //   Vel(L) = Vel0 + Ags0 * gc * TimeStep + Jerk * gc * TimeStep ^ 2 / 2
  //
  // VB6 Variable Types:
  //   Vel(L)    - Single (line 536, array element)
  //   Vel0      - Single (line 522)
  //   Ags0      - Single (line 527)
  //   gc        - Public Const = 32.174 (Double, DECLARES.BAS line 11)
  //   TimeStep  - Single (line 526)
  //   Jerk      - Single (line 513)
  //   Literal 2 - Double (no suffix)
  //
  // VB6 Coercion Rules:
  //   1. gc is a Double constant (32.174)
  //   2. Ags0 * gc promotes to Double (Single * Double = Double)
  //   3. TimeStep ^ 2 promotes to Double (Single ^ Double = Double)
  //   4. Entire expression computed in Double
  //   5. Truncation to Single occurs ONLY at assignment to Vel(L)
  // ============================================================================
  // VB6: Vel(L) = Vel0 + Ags0 * gc * TimeStep + Jerk * gc * TimeStep ^ 2 / 2
  // Vel0/Ags0/TimeStep/Jerk are Single, gc is Double constant → computed in Double
  // Vel(L) is Single → truncated on assignment
  let Vel_L = vb6AssignSingle(
    state.Vel0_ftps + state.Ags0_g * gc * TimeStep + Jerk * gc * Math.pow(TimeStep, 2) / 2
  );
  
  // ========================================================================
  // TIMESLIP.FRM:1109 - Skip timestep limiting during shift
  // If ShiftFlag = 2 Then GoTo 270
  // ========================================================================
  const ShiftRPM_gear = vehicle.ShiftRPM[iGear - 1] ?? 9000;
  
  // VB6: If ShiftFlag = 2 Then GoTo 270 (skip timestep limiting during shift)
  // CRITICAL FIX: Use ShiftFlag === 2, NOT gearChanged (which is only true for 1 iteration)
  if (state.ShiftFlag !== 2) {
    // Only apply timestep limits when NOT in a gear shift (ShiftFlag < 2)
    // TIMESLIP.FRM:1111-1120 - Limit timestep (in VB6 ORDER)
    
    // VB6 constant K7 = 9.5 for Quarter Pro, 5.5 for Bonneville Pro
    const K7 = env.isLandSpeed ? 5.5 : 9.5;
    
    // TIMESLIP.FRM:1111-1112 - Don't let TimeStep exceed K7 steps per TimePrintInc
    // VB6: If TimeStep > (TimePrintInc / K7) Then TimeStep = TimePrintInc / K7
    if (env.TimePrintInc !== undefined) {
      const maxTimeStepByInc = env.TimePrintInc / K7;
      if (TimeStep > maxTimeStepByInc) TimeStep = maxTimeStepByInc;
    }
    
    // TIMESLIP.FRM:1113-1114 - Don't let TimeStep exceed time to next print
    // VB6: If TimeStep > (TimePrint - Time0) Then TimeStep = TimePrint - Time0
    // CRITICAL: absTimePrint_s is in ABSOLUTE time (not ET). Use Infinity pre-rollout.
    const absTimePrint = env.absTimePrint_s ?? Infinity;
    if (Number.isFinite(absTimePrint)) {
      const timeToNextPrint = absTimePrint - state.Time0_s;
      // Only limit if timeToNextPrint is positive and finite
      if (Number.isFinite(timeToNextPrint) && timeToNextPrint > 0 && TimeStep > timeToNextPrint) {
        TimeStep = timeToNextPrint;
      }
    }
    
    // TIMESLIP.FRM:1116-1119 - Don't let TimeStep exceed 4.5 steps to distance print
    // VB6: If iDist > 1 Then
    //        Work = ((DistToPrint(iDist) - DistToPrint(iDist - 1)) / Vel0) / 4.5
    //        If TimeStep > Work Then TimeStep = Work
    // CRITICAL: VB6 condition is iDist > 1 (past rollout), NOT distance > 1ft
    if (env.iDist !== undefined && env.iDist > 1 &&
        env.nextDistPrint !== undefined && env.prevDistPrint !== undefined && 
        state.Vel0_ftps > 0) {
      const distSpan = env.nextDistPrint - env.prevDistPrint;
      if (distSpan > 0) {
        const Work_dist = (distSpan / state.Vel0_ftps) / 4.5;
        if (TimeStep > Work_dist) TimeStep = Work_dist;
      }
    }
    
    // TIMESLIP.FRM:1120 - Absolute max timestep (LAST in VB6 order)
    // VB6: If TimeStep > 0.05 Then TimeStep = 0.05
    if (TimeStep > 0.05) TimeStep = 0.05;
    
    // For land speed runs, enforce minimum timestep AFTER all limiting
    // This prevents excessive iterations at high speed when acceleration is low
    if (env.isLandSpeed && TimeStep < 0.0005) {
      TimeStep = vb6AssignSingle(0.0005);  // 0.5ms minimum for land speed
    }
    
    // HARD ASSERTION: TimeStep must be finite and positive
    if (!Number.isFinite(TimeStep) || TimeStep <= 0) {
      throw new Error(`[vb6SimulationStep] FATAL: Invalid TimeStep=${TimeStep} at L=${state.L}. ` +
        `Diagnostics: Time0=${state.Time0_s}, absTimePrint_s=${env.absTimePrint_s}, ` +
        `Dist0=${state.Dist0_ft}, Vel0=${state.Vel0_ftps}, Ags0=${state.Ags0_g}, ` +
        `nextDistPrint=${env.nextDistPrint}, prevDistPrint=${env.prevDistPrint}`);
    }
    
    // ========================================================================
    // TIMESLIP.FRM:1122 - Recalculate Velocity with Limited Timestep
    // ============================================================================
    // VB6↔TS CROSSWALK (authoritative)
    // ============================================================================
    // Source: TIMESLIP.FRM line 1122
    //
    // VB6 Code:
    //   Vel(L) = Vel0 + Ags0 * gc * TimeStep + Jerk * gc * TimeStep * TimeStep / 2
    //
    // VB6 Variable Types (from TIMESLIP.FRM Dim statements):
    //   Vel(L)    - Single (line 536, array element)
    //   Vel0      - Single (line 522)
    //   Ags0      - Single (line 527)
    //   TimeStep  - Single (line 526)
    //   Jerk      - Single (line 513)
    //   gc        - Public Const = 32.174 (Double, DECLARES.BAS)
    //   Literal 2 - Double (no suffix)
    //
    // VB6 Coercion: Vel0/Ags0/TimeStep/Jerk are Single, gc and literal 2 are Double
    // → computed in Double, Vel(L) is Single → truncated on assignment
    // ============================================================================
    Vel_L = vb6AssignSingle(
      state.Vel0_ftps + state.Ags0_g * gc * TimeStep + Jerk * gc * TimeStep * TimeStep / 2
    );
    
    // TIMESLIP.FRM:1125-1129 - Limit velocity to shift point
    // VB6: If Vel0 > 0 And RPM0 > Stall And iGear < NGR Then
    //        Work = Vel0 * (ShiftRPM(iGear) + 5) / RPM0
    //        If Vel(L) > Work Then Vel(L) = Work: TimeStep = (Vel(L) - Vel0) / (Ags0 * gc)
    if (state.Vel0_ftps > 0 && state.RPM0 > vehicle.Stall && iGear < vehicle.NGR) {
      const VelAtShift = state.Vel0_ftps * (ShiftRPM_gear + 5) / state.RPM0;
      if (Vel_L > VelAtShift) {
        Vel_L = VelAtShift;
        TimeStep = (Vel_L - state.Vel0_ftps) / (state.Ags0_g * gc);
      }
    }
    
    // TIMESLIP.FRM:1132-1136 - Adjust velocity to hit exact distance print points
    // VB6: DistStep = Dist0 + Vel0 * TimeStep + Ags0 * gc * TimeStep ^ 2 / 2
    //      If DistStep >= (DistToPrint(iDist) - DistTol) Then
    //          Vel(L) = Sqr(Vel0 ^ 2 + 2 * Ags0 * gc * (DistToPrint(iDist) - Dist0))
    // VB6 DistTol is dynamic: 0.005 initial, 0.1 after rollout (case 1), 0.008 after 330ft (case 4)
    // Quarter Pro: initial=0.005, after case 1=0.1, after case 4=0.008
    let DistTol: number;
    if (env.iDist === undefined || env.iDist <= 1) {
      DistTol = 0.005;  // Initial value before/at rollout
    } else if (env.iDist <= 4) {
      DistTol = 0.1;    // After rollout (case 1) through 330ft
    } else {
      DistTol = 0.008;  // After 330ft (case 4)
    }
    const DistStep_est = state.Dist0_ft + state.Vel0_ftps * TimeStep + state.Ags0_g * gc * TimeStep * TimeStep / 2;
    
    // Debug: Log distance targeting for 330ft (target ~330 when Dist0 is 280-340)
    if (env.nextDistPrint !== undefined && env.nextDistPrint > 300 && env.nextDistPrint < 350 && state.Dist0_ft > 280 && state.Dist0_ft < 340) {
      console.log(`[vb6Step] L=${state.L} 330ft CHECK: Dist0=${state.Dist0_ft.toFixed(2)}, DistStep_est=${DistStep_est.toFixed(2)}, target=${env.nextDistPrint.toFixed(1)}, threshold=${(env.nextDistPrint - DistTol).toFixed(2)}, triggered=${DistStep_est >= (env.nextDistPrint - DistTol)}, TimeStep=${TimeStep.toFixed(5)}`);
    }
    
    // ========================================================================
    // TIMESLIP.FRM:1133-1136 - Distance Print Targeting
    // ============================================================================
    // VB6↔TS CROSSWALK (authoritative)
    // ============================================================================
    // Source: TIMESLIP.FRM lines 1133-1136
    //
    // VB6 Code:
    //   DistStep = Dist0 + Vel0 * TimeStep + Ags0 * gc * TimeStep ^ 2 / 2
    //   If DistStep >= (DistToPrint(iDist) - DistTol) Then
    //       Vel(L) = Sqr(Vel0 ^ 2 + 2 * Ags0 * gc * (DistToPrint(iDist) - Dist0))
    //   End If
    //
    // VB6 Variable Types:
    //   DistStep      - Single (line 526)
    //   Dist0         - Single (line 526)
    //   Vel0          - Single (line 522)
    //   TimeStep      - Single (line 526)
    //   Ags0          - Single (line 527)
    //   DistToPrint() - Single (line 508, array element)
    //   DistTol       - Single (line 530)
    //   Vel(L)        - Single (line 536, array element)
    //   gc            - Public Const = 32.174 (Double, DECLARES.BAS)
    //   Literal 2     - Double (no suffix)
    //
    // VB6 Coercion: All variables are Single, gc and literals are Double
    // → expressions computed in Double, assignments truncated to Single
    //
    // CRITICAL: The branch condition (DistStep >= threshold) uses Single values.
    // We must evaluate using Single precision to match VB6 branch behavior.
    // ============================================================================
    if (env.nextDistPrint !== undefined) {
      // VB6 line 1133: DistStep = Dist0 + Vel0 * TimeStep + Ags0 * gc * TimeStep ^ 2 / 2
      // (Already computed above as DistStep_est in Double, but branch uses Single comparison)
      const DistStep_f32 = vb6AssignSingle(DistStep_est);
      
      // VB6 line 1134: If DistStep >= (DistToPrint(iDist) - DistTol) Then
      // threshold = DistToPrint - DistTol (Single - Single → Single)
      const threshold_f32 = vb6AssignSingle(env.nextDistPrint - DistTol);
      const branchTriggered = DistStep_f32 >= threshold_f32;
      
      // ========================================================================
      // VB6 SINGLE-QUANTIZATION HARNESS FOR ROLLOUT TARGETING
      // Compare Float64 path vs VB6 Single emulation at EVERY assignment
      // VB6 types from TIMESLIP.FRM Dim statements (lines 507-540):
      //   Dist0 As Single, Vel0 As Single, Ags0 As Single, TimeStep As Single
      //   DistStep As Single, DistTol As Single, DistToPrint() As Single
      //   Vel() As Single, Work As Single
      //   Const Z5 = 3600 / 5280 (computed as Single)
      // ========================================================================
      if (env.nextDistPrint < 1) {
        // VB6 print formatting functions (imported at top of file)
        // Using inline implementations to avoid circular dependencies
        const vb6_sng = (x: number) => Math.fround(x);
        const vb6_Z5 = vb6_sng(3600 / 5280);
        const vb6_Int = (x: number) => Math.floor(x);
        const vb6_Round_01 = (value: number) => {
          const val = vb6_sng((vb6_sng(value) + vb6_sng(0.05)) / vb6_sng(0.1));
          return vb6_sng(vb6_Int(val) / 10);
        };
        const vb6FormatMph = (velFps: number) => {
          const Work = vb6_sng(vb6_sng(velFps) * vb6_Z5);
          return vb6_Round_01(Work).toFixed(1);
        };
        const vb6RoundedMph = (velFps: number) => {
          const Work = vb6_sng(vb6_sng(velFps) * vb6_Z5);
          return vb6_Round_01(Work);
        };
        
        // PATH 1: Float64 (normal TS math)
        const f64_Dist0 = state.Dist0_ft;
        const f64_Vel0 = state.Vel0_ftps;
        const f64_Ags0 = state.Ags0_g;
        const f64_TimeStep = TimeStep;
        const f64_DistTol = DistTol;
        const f64_DistToPrint = env.nextDistPrint;
        const f64_DistStep_est = f64_Dist0 + f64_Vel0 * f64_TimeStep + f64_Ags0 * gc * f64_TimeStep * f64_TimeStep / 2;
        const f64_threshold = f64_DistToPrint - f64_DistTol;
        const f64_branchTriggered = f64_DistStep_est >= f64_threshold;
        
        // PATH 2: VB6 Single emulation - apply vb6_sng() at EVERY assignment
        // NOTE: This debug harness intentionally uses per-op truncation to compare
        // against Float64. This is NOT how production physics code should work!
        const sng_Dist0 = vb6_sng(state.Dist0_ft);
        const sng_Vel0 = vb6_sng(state.Vel0_ftps);
        const sng_Ags0 = vb6_sng(state.Ags0_g);
        const sng_TimeStep = vb6_sng(TimeStep);
        const sng_DistTol = vb6_sng(DistTol);
        const sng_DistToPrint = vb6_sng(env.nextDistPrint);
        const sng_gc = vb6_sng(gc);
        // VB6 line 1133: DistStep = Dist0 + Vel0 * TimeStep + Ags0 * gc * TimeStep ^ 2 / 2
        const sng_term1 = vb6_sng(sng_Vel0 * sng_TimeStep);
        const sng_term2_a = vb6_sng(sng_Ags0 * sng_gc);
        const sng_term2_b = vb6_sng(sng_TimeStep * sng_TimeStep);
        const sng_term2_c = vb6_sng(sng_term2_a * sng_term2_b);
        const sng_term2 = vb6_sng(sng_term2_c / vb6_sng(2));
        const sng_DistStep_est = vb6_sng(vb6_sng(sng_Dist0 + sng_term1) + sng_term2);
        // VB6 line 1134: If DistStep >= (DistToPrint(iDist) - DistTol) Then
        const sng_threshold = vb6_sng(sng_DistToPrint - sng_DistTol);
        const sng_branchTriggered = sng_DistStep_est >= sng_threshold;
        
        // Calculate targeted velocity for both paths
        let f64_Vel_targeted = f64_Vel0;
        let sng_Vel_targeted = sng_Vel0;
        
        if (f64_branchTriggered) {
          // VB6 line 1135: Vel(L) = Sqr(Vel0 ^ 2 + 2 * Ags0 * gc * (DistToPrint(iDist) - Dist0))
          const f64_distToTarget = f64_DistToPrint - f64_Dist0;
          f64_Vel_targeted = Math.sqrt(f64_Vel0 * f64_Vel0 + 2 * f64_Ags0 * gc * f64_distToTarget);
        }
        
        if (sng_branchTriggered) {
          const sng_distToTarget = vb6_sng(sng_DistToPrint - sng_Dist0);
          const sng_Vel0_sq = vb6_sng(sng_Vel0 * sng_Vel0);
          const sng_accel_term = vb6_sng(vb6_sng(vb6_sng(2) * vb6_sng(sng_Ags0 * sng_gc)) * sng_distToTarget);
          const sng_sum = vb6_sng(sng_Vel0_sq + sng_accel_term);
          sng_Vel_targeted = vb6_sng(Math.sqrt(sng_sum));
        }
        
        // Calculate mph for both paths
        const Z5_f64 = 3600 / 5280;
        const Z5_sng = vb6_sng(3600 / 5280);
        const f64_Work_mph = f64_Vel_targeted * Z5_f64;
        const sng_Work_mph = vb6_sng(sng_Vel_targeted * Z5_sng);
        
        // Use VB6 RightAlign/Round for printed output
        const f64_printed_mph = vb6FormatMph(f64_Vel_targeted);
        const sng_printed_mph = vb6FormatMph(sng_Vel_targeted);
        const f64_rounded_mph = vb6RoundedMph(f64_Vel_targeted);
        const sng_rounded_mph = vb6RoundedMph(sng_Vel_targeted);
        
        console.log(`[vb6Step] L=${state.L} ROLLOUT VB6-SINGLE HARNESS:
  === PATH 1: Float64 (normal TS) ===
  Dist0=${f64_Dist0.toFixed(8)}, Vel0=${f64_Vel0.toFixed(8)}, Ags0=${f64_Ags0.toFixed(8)}, TimeStep=${f64_TimeStep.toFixed(8)}
  DistTol=${f64_DistTol.toFixed(8)}, DistToPrint=${f64_DistToPrint.toFixed(8)}
  DistStep_est=${f64_DistStep_est.toFixed(8)}, threshold=${f64_threshold.toFixed(8)}
  Condition: ${f64_DistStep_est.toFixed(8)} >= ${f64_threshold.toFixed(8)} => ${f64_branchTriggered}
  Vel_targeted=${f64_Vel_targeted.toFixed(8)} fps
  Work_mph=${f64_Work_mph.toFixed(8)}, rounded_mph=${f64_rounded_mph}, printed="${f64_printed_mph.trim()}"
  
  === PATH 2: VB6 Single Emulation ===
  Dist0=${sng_Dist0.toFixed(8)}, Vel0=${sng_Vel0.toFixed(8)}, Ags0=${sng_Ags0.toFixed(8)}, TimeStep=${sng_TimeStep.toFixed(8)}
  DistTol=${sng_DistTol.toFixed(8)}, DistToPrint=${sng_DistToPrint.toFixed(8)}
  DistStep_est=${sng_DistStep_est.toFixed(8)}, threshold=${sng_threshold.toFixed(8)}
  Condition: ${sng_DistStep_est.toFixed(8)} >= ${sng_threshold.toFixed(8)} => ${sng_branchTriggered}
  Vel_targeted=${sng_Vel_targeted.toFixed(8)} fps
  Work_mph=${sng_Work_mph.toFixed(8)}, rounded_mph=${sng_rounded_mph}, printed="${sng_printed_mph.trim()}"
  
  === COMPARISON ===
  Branch differs: ${f64_branchTriggered !== sng_branchTriggered}
  Vel_targeted differs: ${Math.abs(f64_Vel_targeted - sng_Vel_targeted) > 1e-6}
  Printed mph differs: ${f64_printed_mph.trim() !== sng_printed_mph.trim()}
`);
      }
      
      // ========================================================================
      // TIMESLIP.FRM:1135 - Velocity Targeting (Sqr Formula)
      // ============================================================================
      // VB6↔TS CROSSWALK (authoritative)
      // ============================================================================
      // Source: TIMESLIP.FRM line 1135
      //
      // VB6 Code:
      //   Vel(L) = Sqr(Vel0 ^ 2 + 2 * Ags0 * gc * (DistToPrint(iDist) - Dist0))
      //
      // VB6 Variable Types:
      //   Vel(L)        - Single (line 536, array element)
      //   Vel0          - Single (line 522)
      //   Ags0          - Single (line 527)
      //   DistToPrint() - Single (line 508, array element)
      //   Dist0         - Single (line 526)
      //   gc            - Public Const = 32.174 (Double, DECLARES.BAS)
      //   Literal 2     - Double (no suffix)
      //
      // VB6 Coercion: Vel0/Ags0/DistToPrint/Dist0 are Single, gc and literal 2 are Double
      // → Sqr argument computed in Double, Sqr returns Double, Vel(L) is Single → truncated
      // ============================================================================
      if (branchTriggered) {
        const targetDist = env.nextDistPrint;
        const distToTarget = targetDist - state.Dist0_ft;
        if (distToTarget > 0) {
          const Vel_L_old = Vel_L;
          
          // VB6 line 1135: Vel(L) = Sqr(Vel0 ^ 2 + 2 * Ags0 * gc * (DistToPrint(iDist) - Dist0))
          // Compute entire expression in Double, truncate only at assignment
          Vel_L = vb6AssignSingle(
            Math.sqrt(
              state.Vel0_ftps * state.Vel0_ftps + 
              2 * state.Ags0_g * gc * distToTarget
            )
          );
          
          // Debug: Log when velocity targeting triggers for rollout
          if (env.nextDistPrint < 1) {
            const mph_old = Vel_L_old * (3600/5280);
            const mph_new = Vel_L * (3600/5280);
            console.log(`[vb6Step] L=${state.L} ROLLOUT VEL TARGET (VB6 line 1135): distToTarget=${distToTarget.toFixed(6)}, Vel_L ${Vel_L_old.toFixed(4)} (${mph_old.toFixed(4)}mph) -> ${Vel_L.toFixed(4)} (${mph_new.toFixed(4)}mph)`);
          }
        }
      }
    }
  }
  // During gear change (gearChanged=true), TimeStep=DTShift is used without limiting
  
  // ========================================================================
  // VB6 SECTION 270-330 LOOP: Main physics with velocity revision
  // VB6 uses GoTo 270 to loop back when velocity needs revision
  // We implement this as an outer loop around the main calculation
  // ========================================================================
  
  // Variables that need to persist across velocity revision iterations
  let VelSqrd = 0;
  let DSRPM = 0;
  let LockRPM = 0;
  let EngRPM_L = 0;
  let ClutchSlip = 0;
  let zStall = vehicle.Stall;
  let SlipRatio = 0;
  let HP = 0;
  let HPSave = 0;
  let WindFPS = 0;
  let q = 0;
  let RefArea2 = 0;
  let DownForce = 0;
  let DragForce = 0;
  let DragHP = 0;
  let DynamicFWT = 0;
  let DynamicRWT = 0;
  let WheelBarWT = 0;
  let CRTF = 0;
  let AMax_g = 0;
  let HPAtWheels = 0;
  let PQWT = 0;
  let AGS_g = 0;
  let SLIP = false;
  let time_L = 0;
  let EngAccHP = 0;
  let ChasAccHP = 0;
  let HPEngPMI = 0;
  let HPChasPMI = 0;
  let k = 0;
  let dt_final = 0;
  let Dist_L = 0;
  // Vel0_cubed now calculated inline with Float32 precision in distance calculation
  
  // VB6 velocity revision loop - equivalent to GoTo 270
  const MAX_VEL_REVISIONS = 10;
  for (let velRevision = 0; velRevision < MAX_VEL_REVISIONS; velRevision++) {
    
    // ========================================================================
    // TIMESLIP.FRM:1139-1140 - VelSqrd and DSRPM Calculation
    // ============================================================================
    // VB6↔TS CROSSWALK (authoritative)
    // ============================================================================
    // Source: TIMESLIP.FRM lines 1139-1140
    //
    // VB6 Code:
    //   270 Rem**  ENTRY POINT FOR VELOCITY REVISION TO MATCH DISTANCE, TIME, OR SHIFT POINT PRINTS
    //       VelSqrd = Vel(L) ^ 2 - Vel0 ^ 2
    //       DSRPM = TireSlip * Vel(L) * 60 / TireCirFt
    //
    // VB6 Variable Types (from TIMESLIP.FRM Dim statements):
    //   VelSqrd   - Single (line 522)
    //   Vel(L)    - Single (line 536, array element)
    //   Vel0      - Single (line 522)
    //   DSRPM     - Single (line 537)
    //   TireSlip  - Single (line 519)
    //   TireCirFt - Single (line 518)
    //   Literal 2 - Double (no suffix)
    //   Literal 60 - Double (no suffix)
    //
    // VB6 Coercion Rules:
    //   1. Vel(L) ^ 2: Single ^ Double → computed in Double
    //   2. Vel0 ^ 2: Single ^ Double → computed in Double
    //   3. VelSqrd = ...: Double expression assigned to Single → truncated
    //   4. TireSlip * Vel(L) * 60 / TireCirFt: Single * Single * Double / Single
    //      → promotes to Double due to literal 60
    //   5. DSRPM = ...: Double expression assigned to Single → truncated
    // ============================================================================
    
    // VB6 line 1139: VelSqrd = Vel(L) ^ 2 - Vel0 ^ 2
    // Vel(L) and Vel0 are Single, literal 2 is Double → computed in Double
    // VelSqrd is Single → truncated on assignment
    VelSqrd = vb6AssignSingle(Math.pow(Vel_L, 2) - Math.pow(state.Vel0_ftps, 2));
  
    // VB6 line 1140: DSRPM = TireSlip * Vel(L) * 60 / TireCirFt
    // TireSlip/Vel(L)/TireCirFt are Single, literal 60 is Double → computed in Double
    // DSRPM is Single → truncated on assignment
    DSRPM = vb6AssignSingle(TireSlip * Vel_L * 60 / state.TireCirFt);
    
    // ========================================================================
    // TIMESLIP.FRM:1144-1174 - Clutch/Converter Calculations
    // ============================================================================
    // VB6↔TS CROSSWALK (authoritative)
    // ============================================================================
    // Source: TIMESLIP.FRM lines 1144-1174
    //
    // VB6 Code:
    //   Rem**  PERFORM CLUTCH AND CONVERTER CALCULATIONS
    //   LockRPM = DSRPM * gc_GearRatio.Value * TGR(iGear)
    //   EngRPM(L) = gc_Slippage.Value * LockRPM
    //   
    //   If Not gc_TransType.Value Then                      'clutch
    //       If EngRPM(L) < Stall Then
    //           If iGear = 1 Or gc_LockUp.Value = 0 Then EngRPM(L) = Stall
    //       End If
    //       ClutchSlip = LockRPM / EngRPM(L)
    //   Else
    //       If iGear = 1 Or gc_LockUp.Value = 0 Then        'non lock-up converter
    //           zStall = Stall
    //           SlipRatio = gc_Slippage.Value * LockRPM / zStall
    //           
    //           If L > 2 Then
    //               If SlipRatio > 0.6 Then zStall = zStall * (1 + (gc_Slippage.Value - 1) * (SlipRatio - 0.6) / ((1 / gc_Slippage.Value) - 0.6))
    //               SlipRatio = gc_Slippage.Value * LockRPM / zStall
    //           End If
    //           ClutchSlip = 1 / gc_Slippage.Value
    //             
    //           If EngRPM(L) < zStall Then
    //               EngRPM(L) = zStall
    //               Work = gc_TorqueMult.Value - (gc_TorqueMult.Value - 1) * SlipRatio
    //               ClutchSlip = Work * LockRPM / zStall
    //           End If
    //       Else                                            'lock-up converter
    //           EngRPM(L) = 1.005 * LockRPM                 'assume 0.5% slippage
    //           ClutchSlip = LockRPM / EngRPM(L)
    //       End If
    //   End If
    //   If ClutchSlip > 1 Then ClutchSlip = 1
    //
    // VB6 Variable Types (from TIMESLIP.FRM Dim statements):
    //   LockRPM    - Single (line 510)
    //   EngRPM(L)  - Single (line 536, array element)
    //   ClutchSlip - Single (line 511)
    //   SlipRatio  - Single (line 516)
    //   Stall      - Single (line 517)
    //   zStall     - Single (line 517)
    //   Work       - Single (line 539)
    //   DSRPM      - Single (line 537)
    //   TGR(iGear) - Single (line 533, array element)
    //   iGear      - Integer (line 529)
    //   L          - Integer (line 531)
    //   gc_GearRatio.Value   - Variant→Double (CValue)
    //   gc_Slippage.Value    - Variant→Double (CValue)
    //   gc_TransType.Value   - Variant→Boolean (CValue)
    //   gc_LockUp.Value      - Variant→Integer (CValue, 0 or 1)
    //   gc_TorqueMult.Value  - Variant→Double (CValue)
    //   Literal 1, 0.6, 1.005 - Double (no suffix)
    //
    // VB6 Coercion Rules:
    //   1. gc_*.Value are CValue (Variant→Double for numeric)
    //   2. DSRPM * gc_GearRatio.Value: Single * Double → Double
    //   3. All expressions with Double operands compute in Double
    //   4. Truncation to Single occurs ONLY at assignment to Single variable
    // ============================================================================
    
    // VB6 line 1145: LockRPM = DSRPM * gc_GearRatio.Value * TGR(iGear)
    // DSRPM/TGR are Single, gc_GearRatio.Value is CValue (Double) → computed in Double
    // LockRPM is Single → truncated on assignment
    LockRPM = vb6AssignSingle(DSRPM * vehicle.GearRatio * TGR_gear);
    
    // VB6 line 1146: EngRPM(L) = gc_Slippage.Value * LockRPM
    // gc_Slippage.Value is CValue (Double), LockRPM is Single → computed in Double
    // EngRPM(L) is Single → truncated on assignment
    EngRPM_L = vb6AssignSingle(vehicle.Slippage * LockRPM);
    
    zStall = vehicle.Stall;
    SlipRatio = 0;
  
    if (vehicle.isClutch) {
      // VB6 lines 1148-1152 - Clutch type transmission
      // VB6: If Not gc_TransType.Value Then 'clutch
      if (EngRPM_L < vehicle.Stall) {
        // VB6 line 1150: If iGear = 1 Or gc_LockUp.Value = 0 Then EngRPM(L) = Stall
        if (iGear === 1 || !vehicle.LockUp) {
          // Stall is Single, assigned to EngRPM(L) (Single)
          EngRPM_L = vb6AssignSingle(vehicle.Stall);
        }
      }
      // VB6 line 1152: ClutchSlip = LockRPM / EngRPM(L)
      // LockRPM/EngRPM(L) are Single → Single / Single = Single (no Double operand)
      // ClutchSlip is Single → truncated on assignment
      ClutchSlip = vb6AssignSingle(LockRPM / EngRPM_L);
    } else {
      // VB6 lines 1154-1172 - Converter type transmission
      if (iGear === 1 || !vehicle.LockUp) {
        // VB6 lines 1154-1168 - Non lock-up converter
        // VB6 line 1155: zStall = Stall
        // Stall is Single, assigned to zStall (Single)
        zStall = vb6AssignSingle(vehicle.Stall);
        
        // VB6 line 1156: SlipRatio = gc_Slippage.Value * LockRPM / zStall
        // gc_Slippage.Value is CValue (Double), LockRPM/zStall are Single → computed in Double
        // SlipRatio is Single → truncated on assignment
        SlipRatio = vb6AssignSingle(vehicle.Slippage * LockRPM / zStall);
        
        if (state.L > 2) {
          // VB6 line 1159: If SlipRatio > 0.6 Then zStall = zStall * (1 + (gc_Slippage.Value - 1) * (SlipRatio - 0.6) / ((1 / gc_Slippage.Value) - 0.6))
          if (SlipRatio > 0.6) {
            // gc_Slippage.Value is CValue (Double), literals are Double → computed in Double
            // zStall is Single → truncated on assignment
            zStall = vb6AssignSingle(
              zStall * (1 + (vehicle.Slippage - 1) * (SlipRatio - 0.6) / ((1 / vehicle.Slippage) - 0.6))
            );
          }
          // VB6 line 1160: SlipRatio = gc_Slippage.Value * LockRPM / zStall
          SlipRatio = vb6AssignSingle(vehicle.Slippage * LockRPM / zStall);
        }
        
        // VB6 line 1162: ClutchSlip = 1 / gc_Slippage.Value
        // Literal 1 is Double, gc_Slippage.Value is CValue (Double) → computed in Double
        // ClutchSlip is Single → truncated on assignment
        ClutchSlip = vb6AssignSingle(1 / vehicle.Slippage);
        
        if (EngRPM_L < zStall) {
          // VB6 line 1165: EngRPM(L) = zStall
          // zStall is Single, assigned to EngRPM(L) (Single)
          EngRPM_L = vb6AssignSingle(zStall);
          
          // VB6 line 1166: Work = gc_TorqueMult.Value - (gc_TorqueMult.Value - 1) * SlipRatio
          // gc_TorqueMult.Value is CValue (Double), SlipRatio is Single, literals are Double
          // → computed in Double, Work is Single → truncated on assignment
          const Work_conv = vb6AssignSingle(
            vehicle.TorqueMult - (vehicle.TorqueMult - 1) * SlipRatio
          );
          
          // VB6 line 1167: ClutchSlip = Work * LockRPM / zStall
          // Work/LockRPM/zStall are all Single → Single expression
          // ClutchSlip is Single → truncated on assignment
          ClutchSlip = vb6AssignSingle(Work_conv * LockRPM / zStall);
        }
      } else {
        // VB6 lines 1169-1171 - Lock-up converter
        // VB6 line 1170: EngRPM(L) = 1.005 * LockRPM  'assume 0.5% slippage
        // Literal 1.005 is Double, LockRPM is Single → computed in Double
        // EngRPM(L) is Single → truncated on assignment
        EngRPM_L = vb6AssignSingle(1.005 * LockRPM);
        
        // VB6 line 1171: ClutchSlip = LockRPM / EngRPM(L)
        // LockRPM/EngRPM(L) are Single → Single expression
        // ClutchSlip is Single → truncated on assignment
        ClutchSlip = vb6AssignSingle(LockRPM / EngRPM_L);
      }
    }
    
    // VB6 line 1174: If ClutchSlip > 1 Then ClutchSlip = 1
    // Literal 1 is Double, ClutchSlip is Single → comparison promotes to Double
    // Assignment of Double 1 to Single ClutchSlip → truncated
    if (ClutchSlip > 1) ClutchSlip = vb6AssignSingle(1);
  
    // ========================================================================
    // TIMESLIP.FRM:1176-1178 - HP Lookup from Engine Curve
    // ============================================================================
    // VB6↔TS CROSSWALK (authoritative)
    // ============================================================================
    // Source: TIMESLIP.FRM lines 1176-1178
    //
    // VB6 Code:
    //   Call TABY(xrpm(), yhp(), NHP, 1, EngRPM(L), HP) 'Patrick - 2nd order in QProRx
    //   HP = gc_HPTQMult.Value * HP / hpc
    //   HPSave = HP:    HP = HP * ClutchSlip
    //
    // VB6 Variable Types (from TIMESLIP.FRM Dim statements):
    //   HP              - Single (line 510)
    //   HPSave          - Single (line 511)
    //   hpc             - Single (line 511)
    //   ClutchSlip      - Single (line 511)
    //   EngRPM(L)       - Single (line 536, array element)
    //   xrpm(0 To 16)   - Single (line 538, array)
    //   yhp(0 To 16)    - Single (line 538, array)
    //   NHP             - Integer (line 514)
    //   gc_HPTQMult.Value - Variant→Double (CValue)
    //
    // VB6 Coercion Rules:
    //   1. TABY returns result in HP (Single) - output parameter
    //   2. gc_HPTQMult.Value is CValue (Variant→Double)
    //   3. gc_HPTQMult.Value * HP: Double * Single → computed in Double
    //   4. HP = ...: Double expression assigned to Single → truncated
    //   5. HPSave = HP: Single assigned to Single → no truncation
    //   6. HP * ClutchSlip: Single * Single → Single expression
    //   7. HP = ...: Single expression assigned to Single → truncated
    // ============================================================================
    
    // VB6 line 1176: Call TABY(xrpm(), yhp(), NHP, 1, EngRPM(L), HP)
    // TABY performs Lagrange interpolation, returns HP as Single
    // tabyLagrange returns Double, we truncate to Single at assignment
    HP = vb6AssignSingle(tabyLagrange(vehicle.xrpm, vehicle.yhp, vehicle.NHP, 1, EngRPM_L));
    
    // VB6 line 1177: HP = gc_HPTQMult.Value * HP / hpc
    // gc_HPTQMult.Value is CValue (Double), HP/hpc are Single → computed in Double
    // HP is Single → truncated on assignment
    HP = vb6AssignSingle(vehicle.HPTQMult * HP / env.hpc);
    
    // RSA Extension: Apply throttle stop HP reduction
    // throttlePct is the throttle opening percentage (0-100)
    // 0% = idle (no power), 100% = full throttle (no reduction)
    // NOTE: This is an RSA extension, not in original VB6
    if (throttleStop?.enabled) {
      const currentTime = state.time_s;
      const stopStart = throttleStop.activateTime_s;
      const stopEnd = stopStart + throttleStop.duration_s;
      
      if (currentTime >= stopStart && currentTime < stopEnd) {
        // Apply throttle reduction: HP * (throttlePct / 100)
        // Treat as Single assignment for consistency
        HP = vb6AssignSingle(HP * (throttleStop.throttlePct / 100));
      }
    }
    
    // VB6 line 1178: HPSave = HP:    HP = HP * ClutchSlip
    // HPSave = HP: Single assigned to Single → truncated (already Single)
    // HP = HP * ClutchSlip: Single * Single → Single expression
    // HP is Single → truncated on assignment
    HPSave = vb6AssignSingle(HP);
    HP = vb6AssignSingle(HP * ClutchSlip);
    
    // ========================================================================
    // TIMESLIP.FRM:1180-1194 - Calculate Drag Forces
    // ============================================================================
    // VB6↔TS CROSSWALK (authoritative)
    // ============================================================================
    // Source: TIMESLIP.FRM lines 1180-1194
    //
    // VB6 Code:
    //   Rem**  CALCULATE DRAG FORCES (FRICTION, VISCOUS AND AERODYNAMIC)
    //   WindFPS = Sqr(Vel(L) ^ 2 + 2 * Vel(L) * (gc_WindSpeed.Value / Z5) * Cos(PI * gc_WindAngle.Value / 180) + (gc_WindSpeed.Value / Z5) ^ 2)
    //   q = Sgn(WindFPS) * rho * Abs(WindFPS) ^ 2 / (2 * gc)
    //   
    //   Rem **  increase frontal area based on tire growth
    //   If gc_BodyStyle.Value = 8 Then
    //       RefArea2 = gc_RefArea.Value + ((TireGrowth - 1) * TireDia / 2) * gc_TireWidth.Value / 144
    //   Else
    //       RefArea2 = gc_RefArea.Value + ((TireGrowth - 1) * TireDia / 2) * (2 * gc_TireWidth.Value) / 144
    //   End If
    //   
    //   DownForce = gc_Weight.Value + gc_LiftCoef.Value * RefArea2 * q
    //   cmu1 = CMU - (Dist0 / 1320) * CMUK
    //   DragForce = cmu1 * DownForce + 0.0001 * DownForce * (Z5 * Vel(L)) + gc_DragCoef.Value * RefArea2 * q
    //   DragHP = DragForce * Vel(L) / 550
    //
    // VB6 Variable Types (from TIMESLIP.FRM Dim statements):
    //   WindFPS    - Single (line 672)
    //   q          - Single (line 515)
    //   rho        - Single (line 515)
    //   RefArea2   - Single (line 672)
    //   DownForce  - Single (line 508)
    //   cmu1       - Single (line 507)
    //   DragForce  - Single (line 509)
    //   DragHP     - Single (line 509)
    //   Vel(L)     - Single (line 536, array element)
    //   TireGrowth - Single (line 518)
    //   TireDia    - Single (line 518)
    //   Dist0      - Single (line 526)
    //   gc_WindSpeed.Value  - Variant→Double (CValue)
    //   gc_WindAngle.Value  - Variant→Double (CValue)
    //   gc_BodyStyle.Value  - Variant→Integer (CValue)
    //   gc_RefArea.Value    - Variant→Double (CValue)
    //   gc_TireWidth.Value  - Variant→Double (CValue)
    //   gc_Weight.Value     - Variant→Double (CValue)
    //   gc_LiftCoef.Value   - Variant→Double (CValue)
    //   gc_DragCoef.Value   - Variant→Double (CValue)
    //   Z5         - Const = 3600/5280 (Double, line 542)
    //   PI         - Public Const = 3.141593 (Double, DECLARES.BAS)
    //   gc         - Public Const = 32.174 (Double, DECLARES.BAS)
    //   CMU        - Const = 0.025 (Double, line 552) or 0.03 for BVPro
    //   CMUK       - Const = 0.01 (Double, line 553) or 0 for BVPro
    //   Literal 2, 180, 144, 1320, 0.0001, 550 - Double (no suffix)
    //
    // VB6 Coercion Rules:
    //   1. gc_*.Value are CValue (Variant→Double)
    //   2. Sqr(), Cos(), Sgn(), Abs() return Double
    //   3. ^ operator with Double exponent computes in Double
    //   4. All expressions with Double operands compute in Double
    //   5. Truncation to Single occurs ONLY at assignment to Single variable
    // ============================================================================
    
    // VB6 line 1181: WindFPS = Sqr(Vel(L) ^ 2 + 2 * Vel(L) * (gc_WindSpeed.Value / Z5) * Cos(PI * gc_WindAngle.Value / 180) + (gc_WindSpeed.Value / Z5) ^ 2)
    // gc_WindSpeed.Value/gc_WindAngle.Value are CValue (Double), Z5/PI are Double constants
    // Vel(L) is Single but ^ 2 promotes to Double → entire expression in Double
    // WindFPS is Single → truncated on assignment
    const windSpeedFPS = env.WindSpeed_mph / Z5;  // gc_WindSpeed.Value / Z5 (Double)
    const windAngleRad = PI * env.WindAngle_deg / 180;  // PI * gc_WindAngle.Value / 180 (Double)
    WindFPS = vb6AssignSingle(
      Math.sqrt(
        Math.pow(Vel_L, 2) + 
        2 * Vel_L * windSpeedFPS * Math.cos(windAngleRad) + 
        Math.pow(windSpeedFPS, 2)
      )
    );
    
    // VB6 line 1182: q = Sgn(WindFPS) * rho * Abs(WindFPS) ^ 2 / (2 * gc)
    // Sgn() and Abs() return Double, rho is Single, gc is Double constant
    // → computed in Double, q is Single → truncated on assignment
    q = vb6AssignSingle(
      Math.sign(WindFPS) * env.rho * Math.pow(Math.abs(WindFPS), 2) / (2 * gc)
    );
    
    // VB6 lines 1185-1189: RefArea2 calculation based on BodyStyle
    // gc_RefArea.Value/gc_TireWidth.Value are CValue (Double), TireGrowth/TireDia are Single
    // Literals 1, 2, 144 are Double → computed in Double
    // RefArea2 is Single → truncated on assignment
    if (vehicle.BodyStyle === 8) {
      // VB6 line 1186: RefArea2 = gc_RefArea.Value + ((TireGrowth - 1) * TireDia / 2) * gc_TireWidth.Value / 144
      RefArea2 = vb6AssignSingle(
        vehicle.RefArea_ft2 + ((state.TireGrowth - 1) * vehicle.TireDia_in / 2) * vehicle.TireWidth_in / 144
      );
    } else {
      // VB6 line 1188: RefArea2 = gc_RefArea.Value + ((TireGrowth - 1) * TireDia / 2) * (2 * gc_TireWidth.Value) / 144
      RefArea2 = vb6AssignSingle(
        vehicle.RefArea_ft2 + ((state.TireGrowth - 1) * vehicle.TireDia_in / 2) * (2 * vehicle.TireWidth_in) / 144
      );
    }
    
    // VB6 line 1191: DownForce = gc_Weight.Value + gc_LiftCoef.Value * RefArea2 * q
    // gc_Weight.Value/gc_LiftCoef.Value are CValue (Double), RefArea2/q are Single
    // → computed in Double, DownForce is Single → truncated on assignment
    DownForce = vb6AssignSingle(
      vehicle.Weight_lbf + vehicle.LiftCoef * RefArea2 * q
    );
    
    // Select constants based on land speed mode
    // VB6: TIMESLIP.FRM:550-570 - different constants for ISBVPRO
    const cmu_const = env.isLandSpeed ? CMU_BV : CMU;
    const cmuk_const = env.isLandSpeed ? CMUK_BV : CMUK;
    const frct_const = env.isLandSpeed ? FRCT_BV : FRCT;
    
    // VB6 line 1192: cmu1 = CMU - (Dist0 / 1320) * CMUK
    // CMU/CMUK are Double constants, Dist0 is Single, literal 1320 is Double
    // → computed in Double, cmu1 is Single → truncated on assignment
    const cmu1 = vb6AssignSingle(cmu_const - (state.Dist0_ft / 1320) * cmuk_const);
    
    // VB6 line 1193: DragForce = cmu1 * DownForce + 0.0001 * DownForce * (Z5 * Vel(L)) + gc_DragCoef.Value * RefArea2 * q
    // cmu1/DownForce/RefArea2/q/Vel(L) are Single, Z5/gc_DragCoef.Value/0.0001 are Double
    // → computed in Double, DragForce is Single → truncated on assignment
    DragForce = vb6AssignSingle(
      cmu1 * DownForce + 0.0001 * DownForce * (Z5 * Vel_L) + vehicle.DragCoef * RefArea2 * q
    );
    
    // VB6 line 1194: DragHP = DragForce * Vel(L) / 550
    // DragForce/Vel(L) are Single, literal 550 is Double → computed in Double
    // DragHP is Single → truncated on assignment
    DragHP = vb6AssignSingle(DragForce * Vel_L / 550);
  
    // ========================================================================
    // TIMESLIP.FRM:1196-1211 - Calculate Dynamic Weight Transfer
    // ============================================================================
    // VB6↔TS CROSSWALK (authoritative)
    // ============================================================================
    // Source: TIMESLIP.FRM lines 1196-1211
    //
    // VB6 Code:
    //   'calculate dynamic weight on front tires
    //   TireRadIn = 12 * TireCirFt / (2 * PI)
    //   'FRCT should really be variable at this point, getting closer to 1 downtrack
    //   deltaFWT = (Ags0 * gc_Weight.Value * ((gc_YCG.Value - TireRadIn) + (FRCT / gc_Efficiency.Value) * TireRadIn) + DragForce * gc_YCG.Value) / gc_Wheelbase.Value
    //   DynamicFWT = gc_StaticFWt.Value - deltaFWT
    //   
    //   'calculate wheelie bar weight
    //   WheelBarWT = 0
    //   If DynamicFWT < 0 Then
    //       'assume 64" wheelie bar as required to keep dynamic front weight = 0
    //       WheelBarWT = -DynamicFWT * gc_Wheelbase.Value / 64
    //       DynamicFWT = 0
    //   End If
    //   
    //   'calculate dynamic force on rear tires
    //   DynamicRWT = DownForce - DynamicFWT - WheelBarWT:   If DynamicRWT < 0 Then DynamicRWT = gc_Weight.Value
    //
    // VB6 Variable Types (from TIMESLIP.FRM Dim statements):
    //   TireRadIn   - Single (line 518)
    //   TireCirFt   - Single (line 518)
    //   deltaFWT    - Single (line 524)
    //   DynamicFWT  - Single (line 524)
    //   WheelBarWT  - Single (line 524)
    //   DynamicRWT  - Single (line 524)
    //   DownForce   - Single (line 508)
    //   DragForce   - Single (line 509)
    //   Ags0        - Single (line 527)
    //   gc_Weight.Value     - Variant→Double (CValue)
    //   gc_YCG.Value        - Variant→Double (CValue)
    //   gc_Efficiency.Value - Variant→Double (CValue)
    //   gc_Wheelbase.Value  - Variant→Double (CValue)
    //   gc_StaticFWt.Value  - Variant→Double (CValue)
    //   PI          - Public Const = 3.141593 (Double, DECLARES.BAS)
    //   FRCT        - Const = 1.03 (Double, line 559) or 1.01 for BVPro
    //   Literals 12, 2, 0, 64 - Double (no suffix)
    //
    // VB6 Coercion Rules:
    //   1. gc_*.Value are CValue (Variant→Double)
    //   2. All expressions with Double operands compute in Double
    //   3. Truncation to Single occurs ONLY at assignment to Single variable
    // ============================================================================
    
    // VB6 line 1197: TireRadIn = 12 * TireCirFt / (2 * PI)
    // TireCirFt is Single, literals 12/2 and PI are Double → computed in Double
    // TireRadIn is Single → truncated on assignment
    const TireRadIn = vb6AssignSingle(12 * state.TireCirFt / (2 * PI));
    
    // VB6 line 1199: deltaFWT = (Ags0 * gc_Weight.Value * ((gc_YCG.Value - TireRadIn) + (FRCT / gc_Efficiency.Value) * TireRadIn) + DragForce * gc_YCG.Value) / gc_Wheelbase.Value
    // Ags0/TireRadIn/DragForce are Single, gc_*.Value are CValue (Double), FRCT is Double constant
    // → computed in Double, deltaFWT is Single → truncated on assignment
    const deltaFWT = vb6AssignSingle(
      (state.Ags0_g * vehicle.Weight_lbf * ((vehicle.YCG_in - TireRadIn) + (frct_const / vehicle.Efficiency) * TireRadIn) + DragForce * vehicle.YCG_in) / vehicle.Wheelbase_in
    );
    
    // VB6 line 1200: DynamicFWT = gc_StaticFWt.Value - deltaFWT
    // gc_StaticFWt.Value is CValue (Double), deltaFWT is Single → computed in Double
    // DynamicFWT is Single → truncated on assignment
    DynamicFWT = vb6AssignSingle(vehicle.StaticFWt_lbf - deltaFWT);
    
    // VB6 lines 1203-1208: Wheelie bar calculation
    // VB6 line 1203: WheelBarWT = 0
    WheelBarWT = vb6AssignSingle(0);
    if (DynamicFWT < 0) {
      // VB6 line 1206: WheelBarWT = -DynamicFWT * gc_Wheelbase.Value / 64
      // DynamicFWT is Single, gc_Wheelbase.Value is CValue (Double), literal 64 is Double
      // → computed in Double, WheelBarWT is Single → truncated on assignment
      WheelBarWT = vb6AssignSingle(-DynamicFWT * vehicle.Wheelbase_in / 64);
      // VB6 line 1207: DynamicFWT = 0
      DynamicFWT = vb6AssignSingle(0);
    }
    
    // VB6 line 1211: DynamicRWT = DownForce - DynamicFWT - WheelBarWT
    // All are Single → Single expression, DynamicRWT is Single → truncated on assignment
    DynamicRWT = vb6AssignSingle(DownForce - DynamicFWT - WheelBarWT);
    // VB6 line 1211: If DynamicRWT < 0 Then DynamicRWT = gc_Weight.Value
    // gc_Weight.Value is CValue (Double) → truncated to Single on assignment
    if (DynamicRWT < 0) DynamicRWT = vb6AssignSingle(vehicle.Weight_lbf);
    
    // ========================================================================
    // TIMESLIP.FRM:1213-1216 - Calculate Traction Limit (CRTF and AMax)
    // ============================================================================
    // VB6↔TS CROSSWALK (authoritative)
    // ============================================================================
    // Source: TIMESLIP.FRM lines 1213-1216
    //
    // VB6 Code:
    //   CRTF = CAXI * AX * TireDia * (gc_TireWidth.Value + 1) * (0.92 + 0.08 * (DynamicRWT / 1900) ^ 2.15)
    //   If gc_BodyStyle.Value = 8 Then CRTF = 0.5 * CRTF
    //   AMAX = ((CRTF / TireGrowth) - DragForce) / gc_Weight.Value
    //
    // VB6 Variable Types:
    //   CRTF        - Single (line 508)
    //   CAXI        - Single (line 508)
    //   AMAX        - Single (line 513)
    //   TireDia     - Single (line 518)
    //   TireGrowth  - Single (line 518)
    //   DynamicRWT  - Single (line 524)
    //   DragForce   - Single (line 509)
    //   gc_TireWidth.Value  - Variant→Double (CValue)
    //   gc_BodyStyle.Value  - Variant→Integer (CValue)
    //   gc_Weight.Value     - Variant→Double (CValue)
    //   AX          - Const = 10.8 (Double, line 551) or 9.7 for BVPro
    //   Literals 0.92, 0.08, 1900, 2.15, 0.5 - Double (no suffix)
    // ============================================================================
    
    // VB6 line 1213: CRTF = CAXI * AX * TireDia * (gc_TireWidth.Value + 1) * (0.92 + 0.08 * (DynamicRWT / 1900) ^ 2.15)
    // CAXI/TireDia/DynamicRWT are Single, AX/gc_TireWidth.Value/literals are Double
    // ^ operator with Double exponent computes in Double → entire expression in Double
    // CRTF is Single → truncated on assignment
    const CAXI = calcCAXI(env.TractionIndex, env.TrackTempEffect);
    const AX_val = calcAX(env.isLandSpeed);
    CRTF = vb6AssignSingle(
      CAXI * AX_val * vehicle.TireDia_in * (vehicle.TireWidth_in + 1) * (0.92 + 0.08 * Math.pow(DynamicRWT / 1900, 2.15))
    );
    
    // VB6 line 1214: If gc_BodyStyle.Value = 8 Then CRTF = 0.5 * CRTF
    // Literal 0.5 is Double, CRTF is Single → computed in Double
    // CRTF is Single → truncated on assignment
    if (vehicle.BodyStyle === 8) CRTF = vb6AssignSingle(0.5 * CRTF);
    
    // VB6 line 1216: AMAX = ((CRTF / TireGrowth) - DragForce) / gc_Weight.Value
    // CRTF/TireGrowth/DragForce are Single, gc_Weight.Value is CValue (Double)
    // → computed in Double, AMAX is Single → truncated on assignment
    AMax_g = vb6AssignSingle(((CRTF / state.TireGrowth) - DragForce) / vehicle.Weight_lbf);
  
    // ========================================================================
    // TIMESLIP.FRM:1218-1228 - Calculate PQWT and Apply Traction Limits
    // ============================================================================
    // VB6↔TS CROSSWALK (authoritative)
    // ============================================================================
    // Source: TIMESLIP.FRM lines 1218-1228
    //
    // VB6 Code:
    //   'CALCULATE RESIDUAL HORSEPOWER AVAILABLE (limit to AMax)
    //   HP = HP * TGEff(iGear) * gc_Efficiency.Value / TireSlip
    //   HP = HP - DragHP
    //   PQWT = 550 * gc * HP / gc_Weight.Value:     AGS(L) = PQWT / (Vel(L) * gc)
    //   
    //   SLIP(L) = 0
    //   If AGS(L) > AMAX Then
    //       SLIP(L) = 1
    //       PQWT = PQWT * (AMAX - (AGS(L) - AMAX)) / AGS(L):    AGS(L) = AMAX - (AGS(L) - AMAX)
    //   End If
    //   If AGS(L) < AMin Then PQWT = PQWT * AMin / AGS(L):          AGS(L) = AMin
    //
    // VB6 Variable Types:
    //   HP          - Single (line 510)
    //   DragHP      - Single (line 509)
    //   PQWT        - Single (line 515)
    //   AGS(L)      - Single (line 536, array element)
    //   AMAX        - Single (line 513)
    //   TireSlip    - Single (line 519)
    //   TGEff(iGear)- Single (line 533, array element)
    //   Vel(L)      - Single (line 536, array element)
    //   SLIP(L)     - Integer (line 532, array element)
    //   gc_Efficiency.Value - Variant→Double (CValue)
    //   gc_Weight.Value     - Variant→Double (CValue)
    //   gc          - Public Const = 32.174 (Double, DECLARES.BAS)
    //   AMin        - Const = 0.004 (Double, line 547)
    //   Literal 550 - Double (no suffix)
    // ============================================================================
    
    // VB6 line 1219: HP = HP * TGEff(iGear) * gc_Efficiency.Value / TireSlip
    // HP/TGEff/TireSlip are Single, gc_Efficiency.Value is CValue (Double)
    // → computed in Double, HP is Single → truncated on assignment
    const TGEff_gear = vehicle.TGEff[iGear - 1] ?? 0.99;
    HP = vb6AssignSingle(HP * TGEff_gear * vehicle.Efficiency / TireSlip);
    HPAtWheels = HP;  // HP at wheels BEFORE subtracting drag (for plotting)
    
    // VB6 line 1220: HP = HP - DragHP
    // HP/DragHP are Single → Single expression, HP is Single → truncated on assignment
    HP = vb6AssignSingle(HP - DragHP);
    
    // VB6 line 1221: PQWT = 550 * gc * HP / gc_Weight.Value
    // HP is Single, gc/gc_Weight.Value/550 are Double → computed in Double
    // PQWT is Single → truncated on assignment
    PQWT = vb6AssignSingle(550 * gc * HP / vehicle.Weight_lbf);
    
    // VB6 line 1221: AGS(L) = PQWT / (Vel(L) * gc)
    // PQWT/Vel(L) are Single, gc is Double → computed in Double
    // AGS(L) is Single → truncated on assignment
    AGS_g = vb6AssignSingle(PQWT / (Vel_L * gc));
    
    // VB6 lines 1223-1227: Traction limit clamp (AMax)
    // VB6 uses reflection formula: AGS = AMAX - (AGS - AMAX) = 2*AMAX - AGS
    SLIP = false;
    if (AGS_g > AMax_g) {
      // VB6 line 1225: SLIP(L) = 1
      SLIP = true;
      // VB6 line 1226: PQWT = PQWT * (AMAX - (AGS(L) - AMAX)) / AGS(L)
      // All are Single → Single expression, PQWT is Single → truncated on assignment
      PQWT = vb6AssignSingle(PQWT * (AMax_g - (AGS_g - AMax_g)) / AGS_g);
      // VB6 line 1226: AGS(L) = AMAX - (AGS(L) - AMAX)
      AGS_g = vb6AssignSingle(AMax_g - (AGS_g - AMax_g));
    }
    
    // VB6 line 1228: If AGS(L) < AMin Then PQWT = PQWT * AMin / AGS(L): AGS(L) = AMin
    if (AGS_g < AMin) {
      // Guard against division by zero
      if (Math.abs(AGS_g) > 1e-10) {
        PQWT = vb6AssignSingle(PQWT * AMin / AGS_g);
      }
      AGS_g = vb6AssignSingle(AMin);
    }
    
    // ========================================================================
    // TIMESLIP.FRM:1229 - Initial Time Estimate
    // ============================================================================
    // VB6↔TS CROSSWALK (authoritative)
    // ============================================================================
    // Source: TIMESLIP.FRM line 1229
    //
    // VB6 Code:
    //   time(L) = VelSqrd / (2 * PQWT) + Time0
    //
    // VB6 Variable Types:
    //   time(L)  - Single (line 536, array element)
    //   VelSqrd  - Single (line 522)
    //   PQWT     - Single (line 515)
    //   Time0    - Single (line 519)
    //   Literal 2 - Double (no suffix)
    //
    // VB6 Coercion: VelSqrd/PQWT/Time0 are Single, literal 2 is Double
    // → computed in Double, time(L) is Single → truncated on assignment
    // ============================================================================
    
    // Guard against division by zero - if PQWT is too small, use a large time estimate
    if (Math.abs(PQWT) < 1e-10) {
      time_L = vb6AssignSingle(state.Time0_s + 1000);  // Large time estimate to trigger iteration
    } else {
      time_L = vb6AssignSingle(VelSqrd / (2 * PQWT) + state.Time0_s);
    }
  
    // Debug: Log first step physics values with full HP chain
    if (state.L <= 2) {
      console.log(`[vb6Step] L=${state.L} HP chain: HPSave=${HPSave.toFixed(1)}, ClutchSlip=${ClutchSlip.toFixed(4)}, HP_afterClutch=${(HPSave*ClutchSlip).toFixed(1)}, TGEff=${TGEff_gear.toFixed(3)}, Eff=${vehicle.Efficiency.toFixed(3)}, TireSlip=${TireSlip.toFixed(4)}, DragHP=${DragHP.toFixed(2)}, HP_final=${HP.toFixed(1)}`);
      console.log(`[vb6Step] L=${state.L} PQWT: Vel_L=${Vel_L.toFixed(4)}, Vel0=${state.Vel0_ftps.toFixed(4)}, VelSqrd=${VelSqrd.toFixed(4)}, PQWT=${PQWT.toFixed(2)}, AGS_g=${AGS_g.toFixed(3)}, AMax_g=${AMax_g.toFixed(3)}, Time0=${state.Time0_s.toFixed(5)}, TimeStep=${TimeStep.toFixed(5)}`);
    }
    
    // ========================================================================
    // TIMESLIP.FRM:1231-1240 - Calculate Acceleration HP Terms
    // ============================================================================
    // VB6↔TS CROSSWALK (authoritative)
    // ============================================================================
    // Source: TIMESLIP.FRM lines 1231-1240
    //
    // VB6 Code:
    //   EngAccHP = gc_EnginePMI.Value * EngRPM(L) * (EngRPM(L) - RPM0)
    //   If EngAccHP < 0 Then
    //       If Not gc_TransType.Value Then
    //           EngAccHP = KP21 * EngAccHP
    //       Else
    //           EngAccHP = KP22 * EngAccHP
    //       End If
    //   End If
    //   ChasAccHP = ChassisPMI * DSRPM * (DSRPM - DSRPM0): If ChasAccHP < 0 Then ChasAccHP = 0
    //
    // VB6 Variable Types:
    //   EngAccHP    - Single (line 515)
    //   ChasAccHP   - Single (line 515)
    //   ChassisPMI  - Single (line 507)
    //   EngRPM(L)   - Single (line 536, array element)
    //   RPM0        - Single (line 515)
    //   DSRPM       - Single (line 537)
    //   DSRPM0      - Single (line 526)
    //   gc_EnginePMI.Value - Variant→Double (CValue)
    //   gc_TransType.Value - Variant→Boolean (CValue)
    //   KP21        - Const = 0.15 (Double, line 557) or 0 for BVPro
    //   KP22        - Const = 0.25 (Double, line 558) or 0 for BVPro
    //   Literal 0   - Double (no suffix)
    // ============================================================================
    
    // Select KP21/KP22 based on land speed mode
    // VB6: TIMESLIP.FRM:557-558 (QPro) vs 567-568 (BVPro)
    const kp21_const = env.isLandSpeed ? KP21_BV : KP21;
    const kp22_const = env.isLandSpeed ? KP22_BV : KP22;
    
    // VB6 line 1231: EngAccHP = gc_EnginePMI.Value * EngRPM(L) * (EngRPM(L) - RPM0)
    // gc_EnginePMI.Value is CValue (Double), EngRPM(L)/RPM0 are Single
    // → computed in Double, EngAccHP is Single → truncated on assignment
    EngAccHP = vb6AssignSingle(vehicle.EnginePMI * EngRPM_L * (EngRPM_L - state.RPM0));
    
    // Debug: Show EngAccHP calculation on first step
    if (state.L <= 2) {
      console.log(`[vb6Step] L=${state.L} EngAccHP: EnginePMI=${vehicle.EnginePMI.toFixed(2)}, EngRPM_L=${EngRPM_L.toFixed(0)}, RPM0=${state.RPM0.toFixed(0)}, EngAccHP=${EngAccHP.toFixed(0)}`);
    }
    
    // VB6 lines 1232-1238: If EngAccHP < 0 Then EngAccHP = KP21/KP22 * EngAccHP
    // KP21/KP22 are Double constants, EngAccHP is Single → computed in Double
    // EngAccHP is Single → truncated on assignment
    if (EngAccHP < 0) {
      if (vehicle.isClutch) {
        EngAccHP = vb6AssignSingle(kp21_const * EngAccHP);
      } else {
        EngAccHP = vb6AssignSingle(kp22_const * EngAccHP);
      }
    }
    
    // VB6 line 1240: ChasAccHP = ChassisPMI * DSRPM * (DSRPM - DSRPM0)
    // All are Single → Single expression, ChasAccHP is Single → truncated on assignment
    ChasAccHP = vb6AssignSingle(ChassisPMI * DSRPM * (DSRPM - state.DSRPM0));
    // VB6 line 1240: If ChasAccHP < 0 Then ChasAccHP = 0
    if (ChasAccHP < 0) ChasAccHP = vb6AssignSingle(0);
    
    // ========================================================================
    // TIMESLIP.FRM:1244-1276 - ITERATION LOOP
    // ============================================================================
    // VB6↔TS CROSSWALK (authoritative)
    // ============================================================================
    // Source: TIMESLIP.FRM lines 1244-1276
    //
    // VB6 Code:
    //   280 Rem**  ITERATION TO CONVERGE INERTIA TRANSIENT
    //   k = k + 1
    //   dtk1 = time(L) - Time0
    //   Work = (2 * PI / 60) ^ 2 / (12 * 550 * dtk1)
    //   HPEngPMI = EngAccHP * Work:    HPChasPMI = ChasAccHP * Work
    //   
    //   HP = (HPSave - HPEngPMI) * ClutchSlip
    //   HP = ((HP * TGEff(iGear) * gc_Efficiency.Value - HPChasPMI) / TireSlip) - DragHP
    //   PQWT = 550 * gc * HP / gc_Weight.Value
    //   AGS(L) = PQWT / (Vel(L) * gc)
    //   
    //   'steady iteration progress by using jerk limits
    //   Jerk = 0:   If dtk1 <> 0 Then Jerk = (AGS(L) - Ags0) / dtk1
    //   If Jerk < JMin Then Jerk = JMin: AGS(L) = Ags0 + Jerk * dtk1: PQWT = AGS(L) * gc * Vel(L)
    //   If Jerk > JMax Then Jerk = JMax: AGS(L) = Ags0 + Jerk * dtk1: PQWT = AGS(L) * gc * Vel(L)
    //   
    //   'and observe min/max Ags limits
    //   SLIP(L) = 0
    //   If AGS(L) > AMAX Then
    //       SLIP(L) = 1
    //       PQWT = PQWT * (AMAX - (AGS(L) - AMAX)) / AGS(L): AGS(L) = AMAX - (AGS(L) - AMAX)
    //   End If
    //   If AGS(L) < AMin Then PQWT = PQWT * AMin / AGS(L): AGS(L) = AMin
    //   
    //   time(L) = VelSqrd / (2 * PQWT) + Time0
    //   dtk2 = time(L) - Time0
    //   If k = 12 Or Abs(100 * (dtk2 - dtk1) / dtk2) <= 0.01 Then GoTo 300
    //   
    //   z = HP / HPSave
    //   If z < K6 Then z = K6
    //   If z > K61 Then z = K61
    //   time(L) = Time0 + dtk1 + z * (dtk2 - dtk1)
    //   GoTo 280
    //
    // VB6 Variable Types:
    //   k           - Integer (line 512)
    //   dtk1, dtk2  - Single (lines 526-527)
    //   Work        - Single (line 539)
    //   HPEngPMI    - Single (line 510)
    //   HPChasPMI   - Single (line 510)
    //   HP          - Single (line 510)
    //   HPSave      - Single (line 511)
    //   ClutchSlip  - Single (line 511)
    //   TGEff(iGear)- Single (line 533, array element)
    //   TireSlip    - Single (line 519)
    //   DragHP      - Single (line 509)
    //   PQWT        - Single (line 515)
    //   AGS(L)      - Single (line 536, array element)
    //   Vel(L)      - Single (line 536, array element)
    //   Jerk        - Single (line 513)
    //   Ags0        - Single (line 527)
    //   AMAX        - Single (line 513)
    //   SLIP(L)     - Integer (line 532, array element)
    //   VelSqrd     - Single (line 522)
    //   Time0       - Single (line 519)
    //   time(L)     - Single (line 536, array element)
    //   z           - Single (line 526)
    //   gc_Efficiency.Value - Variant→Double (CValue)
    //   gc_Weight.Value     - Variant→Double (CValue)
    //   gc          - Public Const = 32.174 (Double)
    //   PI          - Public Const = 3.141593 (Double)
    //   JMin        - Const = -4 (Double, line 543)
    //   JMax        - Const = 2 (Double, line 544)
    //   AMin        - Const = 0.004 (Double, line 547)
    //   K6          - Const = 0.92 (Double, line 545)
    //   K61         - Const = 1.08 (Double, line 546)
    //   Literals 2, 60, 12, 550, 0, 100, 0.01 - Double (no suffix)
    // ============================================================================
    HPEngPMI = 0;
    HPChasPMI = 0;
    k = 0;
  
    for (k = 1; k <= 12; k++) {
      // VB6 line 1246: dtk1 = time(L) - Time0
      // time(L)/Time0 are Single → Single expression, dtk1 is Single → truncated on assignment
      const dtk1 = vb6AssignSingle(time_L - state.Time0_s);
      // VB6 doesn't have a dtk1 <= 0 check - it proceeds with the calculation
      
      // VB6 line 1247: Work = (2 * PI / 60) ^ 2 / (12 * 550 * dtk1)
      // PI is Double constant, literals are Double, dtk1 is Single → computed in Double
      // Work is Single → truncated on assignment
      const Work = vb6AssignSingle(Math.pow(2 * PI / 60, 2) / (12 * 550 * dtk1));
      
      // VB6 line 1248: HPEngPMI = EngAccHP * Work: HPChasPMI = ChasAccHP * Work
      // EngAccHP/ChasAccHP/Work are Single → Single expression
      // HPEngPMI/HPChasPMI are Single → truncated on assignment
      HPEngPMI = vb6AssignSingle(EngAccHP * Work);
      HPChasPMI = vb6AssignSingle(ChasAccHP * Work);
      
      // VB6 line 1250: HP = (HPSave - HPEngPMI) * ClutchSlip
      // All are Single → Single expression, HP is Single → truncated on assignment
      HP = vb6AssignSingle((HPSave - HPEngPMI) * ClutchSlip);
      
      // VB6 line 1251: HP = ((HP * TGEff(iGear) * gc_Efficiency.Value - HPChasPMI) / TireSlip) - DragHP
      // HP/TGEff/HPChasPMI/TireSlip/DragHP are Single, gc_Efficiency.Value is CValue (Double)
      // → computed in Double, HP is Single → truncated on assignment
      HP = vb6AssignSingle(((HP * TGEff_gear * vehicle.Efficiency - HPChasPMI) / TireSlip) - DragHP);
      
      // VB6 line 1252: PQWT = 550 * gc * HP / gc_Weight.Value
      // HP is Single, gc/gc_Weight.Value/550 are Double → computed in Double
      // PQWT is Single → truncated on assignment
      PQWT = vb6AssignSingle(550 * gc * HP / vehicle.Weight_lbf);
      
      // VB6 line 1253: AGS(L) = PQWT / (Vel(L) * gc)
      // PQWT/Vel(L) are Single, gc is Double → computed in Double
      // AGS(L) is Single → truncated on assignment
      AGS_g = vb6AssignSingle(PQWT / (Vel_L * gc));
      
      // VB6 lines 1256-1258: Jerk limits
      // VB6 line 1256: Jerk = 0: If dtk1 <> 0 Then Jerk = (AGS(L) - Ags0) / dtk1
      let Jerk_iter = vb6AssignSingle(0);
      if (dtk1 !== 0) {
        // AGS(L)/Ags0/dtk1 are Single → Single expression, Jerk is Single → truncated on assignment
        Jerk_iter = vb6AssignSingle((AGS_g - state.Ags0_g) / dtk1);
      }
      
      // VB6 line 1257: If Jerk < JMin Then Jerk = JMin: AGS(L) = Ags0 + Jerk * dtk1: PQWT = AGS(L) * gc * Vel(L)
      if (Jerk_iter < JMin) {
        Jerk_iter = vb6AssignSingle(JMin);
        AGS_g = vb6AssignSingle(state.Ags0_g + Jerk_iter * dtk1);
        PQWT = vb6AssignSingle(AGS_g * gc * Vel_L);
      }
      
      // VB6 line 1258: If Jerk > JMax Then Jerk = JMax: AGS(L) = Ags0 + Jerk * dtk1: PQWT = AGS(L) * gc * Vel(L)
      if (Jerk_iter > JMax) {
        Jerk_iter = vb6AssignSingle(JMax);
        AGS_g = vb6AssignSingle(state.Ags0_g + Jerk_iter * dtk1);
        PQWT = vb6AssignSingle(AGS_g * gc * Vel_L);
      }
      
      // VB6 lines 1261-1266: AMin/AMax clamps
      // VB6 uses reflection formula: AGS = AMAX - (AGS - AMAX) = 2*AMAX - AGS
      SLIP = false;
      if (AGS_g > AMax_g) {
        // VB6 line 1263: SLIP(L) = 1
        SLIP = true;
        // VB6 line 1264: PQWT = PQWT * (AMAX - (AGS(L) - AMAX)) / AGS(L)
        // All are Single → Single expression, PQWT is Single → truncated on assignment
        PQWT = vb6AssignSingle(PQWT * (AMax_g - (AGS_g - AMax_g)) / AGS_g);
        // VB6 line 1264: AGS(L) = AMAX - (AGS(L) - AMAX)
        AGS_g = vb6AssignSingle(AMax_g - (AGS_g - AMax_g));
      }
      
      // VB6 line 1266: If AGS(L) < AMin Then PQWT = PQWT * AMin / AGS(L): AGS(L) = AMin
      if (AGS_g < AMin) {
        // Guard against division by zero
        if (Math.abs(AGS_g) > 1e-10) {
          PQWT = vb6AssignSingle(PQWT * AMin / AGS_g);
        }
        AGS_g = vb6AssignSingle(AMin);
      }
      
      // VB6 lines 1268-1270: New time estimate and convergence check
      // VB6 line 1268: time(L) = VelSqrd / (2 * PQWT) + Time0
      // VelSqrd/PQWT/Time0 are Single, literal 2 is Double → computed in Double
      // time(L) is Single → truncated on assignment
      let dtk2_time: number;
      let dtk2: number;
      if (Math.abs(PQWT) < 1e-10) {
        dtk2_time = vb6AssignSingle(state.Time0_s + 1000);  // Large time estimate
        dtk2 = vb6AssignSingle(1000);
      } else {
        dtk2_time = vb6AssignSingle(VelSqrd / (2 * PQWT) + state.Time0_s);
        // VB6 line 1269: dtk2 = time(L) - Time0
        dtk2 = vb6AssignSingle(dtk2_time - state.Time0_s);
      }
      
      // Debug: Log iteration values
      if (state.L <= 2 && k <= 3) {
        console.log(`[vb6Step] L=${state.L} iter k=${k}: HP=${HP.toFixed(1)}, PQWT=${PQWT.toFixed(2)}, AGS_g=${AGS_g.toFixed(3)}, dtk1=${dtk1.toFixed(5)}, dtk2=${dtk2.toFixed(5)}`);
      }
      
      // VB6 line 1270: If k = 12 Or Abs(100 * (dtk2 - dtk1) / dtk2) <= 0.01 Then GoTo 300
      // Convergence check: compute in Double (literals are Double)
      if (k === 12 || Math.abs(100 * (dtk2 - dtk1) / dtk2) <= 0.01) {
        time_L = dtk2_time;
        break;
      }
      
      // VB6 lines 1272-1275: Relaxation for next iteration
      // VB6 line 1272: z = HP / HPSave
      // HP/HPSave are Single → Single expression, z is Single → truncated on assignment
      let z = vb6AssignSingle(HP / HPSave);
      // VB6 line 1273: If z < K6 Then z = K6
      if (z < K6) z = vb6AssignSingle(K6);
      // VB6 line 1274: If z > K61 Then z = K61
      if (z > K61) z = vb6AssignSingle(K61);
      
      // VB6 line 1275: time(L) = Time0 + dtk1 + z * (dtk2 - dtk1)
      // Time0/dtk1/z/dtk2 are Single → Single expression, time(L) is Single → truncated on assignment
      // Guard against NaN propagation
      if (!Number.isFinite(dtk1) || !Number.isFinite(dtk2)) {
        time_L = vb6AssignSingle(state.Time0_s + TimeStep);  // Fallback to simple time advance
      } else {
        time_L = vb6AssignSingle(state.Time0_s + dtk1 + z * (dtk2 - dtk1));
      }
    }
    
    // ========================================================================
    // TIMESLIP.FRM:1280 - Calculate Distance After Convergence
    // ============================================================================
    // VB6↔TS CROSSWALK (authoritative)
    // ============================================================================
    // Source: TIMESLIP.FRM line 1280
    //
    // VB6 Code:
    //   Dist(L) = ((2 * PQWT * (time(L) - Time0) + Vel0 ^ 2) ^ 1.5 - Vel0 ^ 3) / (3 * PQWT) + Dist0
    //
    // VB6 Variable Types:
    //   Dist(L)  - Single (line 536, array element)
    //   PQWT     - Single (line 515)
    //   time(L)  - Single (line 536, array element)
    //   Time0    - Single (line 519)
    //   Vel0     - Single (line 522)
    //   Dist0    - Single (line 526)
    //   Literals 2, 1.5, 3 - Double (no suffix)
    //
    // VB6 Coercion: All variables are Single, literals are Double
    // → computed in Double, Dist(L) is Single → truncated on assignment
    // ============================================================================
    
    // dt_final = time(L) - Time0
    dt_final = vb6AssignSingle(time_L - state.Time0_s);
    
    // Calculate distance using VB6 formula
    // Guard against PQWT being zero or very small (would cause NaN)
    // term = 2 * PQWT * dt_final + Vel0^2
    const term = 2 * PQWT * dt_final + state.Vel0_ftps * state.Vel0_ftps;
    // Vel0_cubed = Vel0^3
    const Vel0_cubed = state.Vel0_ftps * state.Vel0_ftps * state.Vel0_ftps;
    
    if (Math.abs(PQWT) < 1e-10) {
      // PQWT too small - use linear distance estimate
      Dist_L = vb6AssignSingle(state.Dist0_ft + Vel_L * dt_final);
    } else {
      // Dist(L) = (term^1.5 - Vel0^3) / (3 * PQWT) + Dist0
      Dist_L = vb6AssignSingle((Math.pow(term, 1.5) - Vel0_cubed) / (3 * PQWT) + state.Dist0_ft);
    }
    
    
    // ========================================================================
    // TIMESLIP.FRM:1282-1287 - Shift2PrintTime velocity revision (during gear shift)
    // VB6: If ShiftFlag < 2 Then GoTo 330
    //      If Abs(Shift2PrintTime - time(L)) >= TimeTol Then
    //          Work = 2 * PQWT * (Shift2PrintTime - time(L)) + Vel(L) ^ 2
    //          If Work > 0 Then Vel(L) = Sqr(Work): GoTo 270
    // CRITICAL FIX: VB6 uses ShiftFlag >= 2, NOT gearChanged!
    // ShiftFlag = 2 persists through the velocity revision loop because line 1434
    // (ShiftFlag = 0) is only reached AFTER the loop exits via GoTo 340.
    // Using gearChanged would only check on first iteration since PrevGear is updated.
    // ========================================================================
    const TimeTol = 0.002;
    // VB6: If ShiftFlag < 2 Then GoTo 330 (skip this check if ShiftFlag is 0 or 1)
    // Only do Shift2PrintTime revision when ShiftFlag = 2 (shift in progress)
    let skipSection330 = false;  // VB6: After doOpt, GoTo 340 skips Section 330
    if (state.ShiftFlag === 2 && env.Shift2PrintTime !== undefined) {
      if (Math.abs(env.Shift2PrintTime - time_L) >= TimeTol) {
        // Time NOT within tolerance - revise velocity and loop back
        const Work_shift = 2 * PQWT * (env.Shift2PrintTime - time_L) + Vel_L * Vel_L;
        if (Work_shift > 0) {
          Vel_L = Math.sqrt(Work_shift);
          continue;  // GoTo 270 - re-run full physics
        }
      } else {
        // Time IS within tolerance - VB6 calls doOpt then GoTo 340, SKIPPING Section 330
        // VB6 line 1293: PrintFlag = 1: GoTo 340
        skipSection330 = true;
      }
    }
    
    // ========================================================================
    // TIMESLIP.FRM:1295-1352 - Velocity revision checks (ALL FOUR)
    // VB6: When ShiftFlag = 2 AND time is within TimeTol of Shift2PrintTime,
    // Section 330 is SKIPPED via GoTo 340 after doOpt call
    // VB6 checks multiple conditions and loops back (GoTo 270) with revised velocity
    // This is now a proper loop - we use 'continue' to re-run full physics
    // ========================================================================
    const TimeTol_rev = 0.002;
    // VB6 DistTol is updated AFTER distance targets are reached:
    // - Initial (iDist=1): 0.005 (TIMESLIP.FRM:997)
    // - After rollout Case 1 (iDist=2,3,4): 0.1 (TIMESLIP.FRM:1379)
    // - After 330ft Case 4 (iDist>=5): 0.008 (TIMESLIP.FRM:1387)
    let DistTol_rev: number;
    if (env.iDist === undefined || env.iDist <= 1) {
      DistTol_rev = 0.005;  // Initial value before rollout
    } else if (env.iDist <= 4) {
      DistTol_rev = 0.1;    // After rollout, before 330ft
    } else {
      DistTol_rev = 0.008;  // After 330ft
    }
    
    // VB6: Skip Section 330 when doOpt was called (ShiftFlag=2 and time within tolerance)
    // VB6 line 1293: PrintFlag = 1: GoTo 340 (skips all velocity revision checks)
    if (skipSection330) {
      break;  // Exit velocity revision loop - VB6 goes directly to Section 340
    }
    
    // VB6 lines 1296-1310: Check for DISTANCE overshoot (VelDistMatch)
    let VelDistMatch = 0;
    if (env.nextDistPrint !== undefined) {
      const targetDist = env.nextDistPrint;
      const DistStep_rev = Math.abs(targetDist - Dist_L);
      
      // Debug: Log VelDistMatch calculation for rollout
      if (env.nextDistPrint < 1) {
        console.log(`[vb6Step] L=${state.L} ROLLOUT VelDistMatch CHECK (VB6 line 1296-1310):
  Dist_L=${Dist_L.toFixed(6)}, targetDist=${targetDist.toFixed(6)}, DistStep_rev=${DistStep_rev.toFixed(6)}
  DistTol_rev=${DistTol_rev.toFixed(6)}, TimeTol_rev=${TimeTol_rev.toFixed(6)}
  Within tolerance: DistStep_rev < DistTol_rev = ${DistStep_rev < DistTol_rev}
  Time check: (DistStep_rev / Vel_L) < TimeTol_rev = ${(DistStep_rev / Vel_L) < TimeTol_rev}
  Dist_L > targetDist: ${Dist_L > targetDist}`);
      }
      
      if (!(DistStep_rev < DistTol_rev && (DistStep_rev / Vel_L) < TimeTol_rev)) {
        if (Dist_L > targetDist) {
          // VB6 line 1306: Work = 3 * PQWT * (DistToPrint(iDist) - Dist(L)) + Vel(L) ^ 3
          const Work_dist = 3 * PQWT * (targetDist - Dist_L) + Math.pow(Vel_L, 3);
          if (Work_dist > 0) {
            VelDistMatch = Math.pow(Work_dist, 1/3);
          }
        }
      }
    }
    
    // VB6 lines 1312-1321: Check for TIME overshoot (VelTimeMatch)
    // CRITICAL: absTimePrint_s is in ABSOLUTE time. Only apply if finite.
    let VelTimeMatch = 0;
    const absTimePrint_rev = env.absTimePrint_s ?? Infinity;
    if (Number.isFinite(absTimePrint_rev)) {
      if (Math.abs(absTimePrint_rev - time_L) >= TimeTol_rev) {
        if (time_L > absTimePrint_rev) {
          // VB6 line 1318: Work = 2 * PQWT * (TimePrint - time(L)) + Vel(L) ^ 2
          const Work_time = 2 * PQWT * (absTimePrint_rev - time_L) + Vel_L * Vel_L;
          if (Work_time > 0) {
            VelTimeMatch = Math.sqrt(Work_time);
          }
        }
      }
    }
    
    // VB6 lines 1323-1331: Check for MPH overshoot (VelMPHMatch)
    // VB6 uses MPHtoPrint array for speed matching at 60 and 100 MPH
    // KV = 0.02 / Z5 for Quarter Pro (velocity tolerance in ft/s)
    let VelMPHMatch = 0;
    const KV_ftps = env.isLandSpeed ? KV_BV : KV;
    if (env.iMPH !== undefined && env.iMPH <= 2 && env.MPHtoPrint !== undefined) {
      const targetMPH_ftps = env.MPHtoPrint[env.iMPH - 1];  // 0-based array
      if (targetMPH_ftps !== undefined) {
        if (Math.abs(targetMPH_ftps - Vel_L) >= KV_ftps) {
          if (Vel_L > targetMPH_ftps) {
            // VB6 line 1329: VelMPHMatch = MPHtoPrint(iMPH)
            VelMPHMatch = targetMPH_ftps;
          }
        }
      }
    }
    
    // VB6 lines 1333-1341: Check for SHIFT RPM overshoot (VelShiftMatch)
    // VB6 EXACT CODE:
    //   If Abs(ShiftRPM(iGear) - EngRPM(L)) < ShiftRPMTol Then
    //       PrintFlag = 1
    //   Else
    //       If EngRPM(L) > ShiftRPM(iGear) Then VelShiftMatch = Vel(L) * ShiftRPM(iGear) / EngRPM(L)
    //   End If
    // VelShiftMatch only activates in the ELSE branch (when diff >= tolerance)
    let VelShiftMatch = 0;
    const ShiftRPMTol = (vehicle.ShiftRPM[0] ?? 7000) > 8000 ? 20 : 10;
    if (iGear < vehicle.NGR && env.shiftRPMs !== undefined) {
      const targetShiftRPM = env.shiftRPMs[iGear - 1];
      if (targetShiftRPM !== undefined) {
        // VB6 EXACT: Only set VelShiftMatch in ELSE branch (diff >= tolerance)
        if (Math.abs(targetShiftRPM - EngRPM_L) >= ShiftRPMTol) {
          if (EngRPM_L > targetShiftRPM) {
            // VB6 line 1339: VelShiftMatch = Vel(L) * ShiftRPM(iGear) / EngRPM(L)
            VelShiftMatch = Vel_L * targetShiftRPM / EngRPM_L;
          }
        }
      }
    }
    
    // VB6 lines 1344-1348: Find minimum valid NextVel from all four checks
    let NextVel = Vel_L;
    if (VelDistMatch > 0 && VelDistMatch < NextVel) NextVel = VelDistMatch;
    if (VelTimeMatch > 0 && VelTimeMatch < NextVel) NextVel = VelTimeMatch;
    if (VelMPHMatch > 0 && VelMPHMatch < NextVel) NextVel = VelMPHMatch;
    if (VelShiftMatch > 0 && VelShiftMatch < NextVel) NextVel = VelShiftMatch;
    
    // Debug: Log velocity revision for rollout
    if (env.nextDistPrint !== undefined && env.nextDistPrint < 1) {
      const Z5 = 3600 / 5280;
      console.log(`[vb6Step] L=${state.L} ROLLOUT VEL REVISION (VB6 line 1344-1352):
  Vel0=${state.Vel0_ftps.toFixed(4)} (${(state.Vel0_ftps * Z5).toFixed(4)}mph)
  Vel_L=${Vel_L.toFixed(4)} (${(Vel_L * Z5).toFixed(4)}mph)
  VelDistMatch=${VelDistMatch.toFixed(4)} (${(VelDistMatch * Z5).toFixed(4)}mph)
  VelTimeMatch=${VelTimeMatch.toFixed(4)}, VelMPHMatch=${VelMPHMatch.toFixed(4)}, VelShiftMatch=${VelShiftMatch.toFixed(4)}
  NextVel=${NextVel.toFixed(4)} (${(NextVel * Z5).toFixed(4)}mph)
  Revision check: NextVel > Vel0 = ${NextVel > state.Vel0_ftps}, NextVel < Vel_L = ${NextVel < Vel_L}
  Will revise: ${NextVel > state.Vel0_ftps && NextVel < Vel_L}`);
    }
    
    // VB6 line 1352: If NextVel > Vel0 And NextVel < Vel(L) Then Vel(L) = NextVel: GoTo 270
    if (NextVel > state.Vel0_ftps && NextVel < Vel_L) {
      // Revise velocity and LOOP BACK to re-run full physics (GoTo 270)
      Vel_L = NextVel;
      continue;  // This loops back to recalculate DSRPM, EngRPM, HP, PQWT, etc.
    }
    
    // No velocity revision needed - break out of the outer loop
    break;
  } // End of velocity revision loop
  
  // Debug: Log distance calculation near rollout
  if (env.nextDistPrint !== undefined && env.nextDistPrint <= 2 && state.L >= 19 && state.L <= 21) {
    const distTraveled = Dist_L - state.Dist0_ft;
    console.log(`[vb6Step] L=${state.L} DistCalc: dt=${dt_final.toFixed(5)}, PQWT=${PQWT.toFixed(2)}, Vel0=${state.Vel0_ftps.toFixed(3)}, Vel_L=${Vel_L.toFixed(3)}, Dist0=${state.Dist0_ft.toFixed(4)}, Dist_L=${Dist_L.toFixed(4)}, traveled=${distTraveled.toFixed(4)}`);
  }
  
  // ========================================================================
  // Update state - truncate all values to Float32 if in strict mode
  // ========================================================================
  // VB6 TIMESLIP.FRM:1104 - L = L + LAdd
  // In VB6, LAdd is normally 0 (L doesn't change), and is set to 1 during shifts/prints.
  // When GoTo 230 (shift recalculation) happens, it skips line 1104, so L doesn't increment.
  // In RSA, gearChanged=true indicates this is a shift recalculation step - DON'T increment L.
  if (!gearChanged) {
    state.L += 1;
  }
  // VB6 state variables are Single - truncate at assignment boundary
  state.time_s = vb6AssignSingle(time_L);
  state.Vel_ftps = vb6AssignSingle(Vel_L);
  state.Dist_ft = vb6AssignSingle(Dist_L);
  state.AGS_g = vb6AssignSingle(AGS_g);
  state.EngRPM = vb6AssignSingle(EngRPM_L);
  state.DSRPM = vb6AssignSingle(DSRPM);
  state.SLIP = SLIP;
  
  // HARD ASSERTION: State values must be finite after step
  if (!Number.isFinite(state.time_s) || !Number.isFinite(state.Dist_ft) || !Number.isFinite(state.AGS_g)) {
    throw new Error(`[vb6SimulationStep] FATAL: NaN in state after step at L=${state.L}. ` +
      `time_s=${state.time_s}, Dist_ft=${state.Dist_ft}, AGS_g=${state.AGS_g}, Vel_ftps=${state.Vel_ftps}. ` +
      `TimeStep=${TimeStep}, time_L=${time_L}, Dist_L=${Dist_L}, AGS_g_local=${AGS_g}`);
  }
  
  // VB6: AgsMax is set ONCE at launch (line 1028) and never updated
  // It's the initial launch acceleration, NOT the maximum seen during the run
  // Do NOT update AgsMax_g here - it should remain at the initial value
  
  return {
    TimeStep_s: TimeStep,
    VelSqrd,
    LockRPM,
    ClutchSlip,
    zStall,
    SlipRatio,
    TireSlip,
    WindFPS,
    q,
    RefArea2_ft2: RefArea2,
    DownForce_lbf: DownForce,
    DragForce_lbf: DragForce,
    DragHP,
    DynamicFWT_lbf: DynamicFWT,
    DynamicRWT_lbf: DynamicRWT,
    WheelBarWT_lbf: WheelBarWT,
    CRTF,
    AMax_g,
    ChassisPMI,
    EngAccHP,
    ChasAccHP,
    HPSave,
    HPAtWheels,
    HP,
    PQWT,
    iterations: k,
  };
}

/**
 * Initialize VB6 simulation state
 * 
 * ============================================================================
 * VB6 INIT SOURCE + TYPES (authoritative)
 * ============================================================================
 * Source: TIMESLIP.FRM lines 1003-1057, DECLARES.BAS lines 10-12
 * 
 * VB6 INIT CODE (lines 1003-1057):
 * ```vb
 * 1003  L = 1: Time0 = 0: time(L) = 0: Vel(L) = 0: Dist(L) = 0: DSRPM = 0
 * 1006  EngRPM(L) = gc_LaunchRPM.Value
 * 1007  Gear(L) = iGear
 * 1008  DownForce = gc_Weight.Value
 * 1010  Call TABY(xrpm(), yhp(), NHP, 1, EngRPM(L), HP)
 * 1011  HP = gc_HPTQMult.Value * HP / hpc
 * 1012  HPSave = HP
 * 1013  TQ = Z6 * HP / EngRPM(L)
 * 1014  TQ = TQ * gc_TorqueMult.Value * TGR(iGear) * TGEff(iGear)
 * 1016  WindFPS = Sqr(Vel(L)^2 + 2*Vel(L)*(gc_WindSpeed.Value/Z5)*Cos(PI*gc_WindAngle.Value/180) + (gc_WindSpeed.Value/Z5)^2)
 * 1017  q = Sgn(WindFPS) * rho * Abs(WindFPS)^2 / (2*gc)
 * 1019  DragForce = CMU * gc_Weight.Value + gc_DragCoef.Value * gc_RefArea.Value * q
 * 1020  force = TQ * gc_GearRatio.Value * gc_Efficiency.Value / (TireSlip * TireDia / 24) - DragForce
 * 1023  If gc_TransType.Value Then
 * 1024      Ags0 = 0.96 * force / gc_Weight.Value
 * 1025  Else
 * 1026      Ags0 = 0.88 * force / gc_Weight.Value
 * 1027  End If
 * 1028  AgsMax = Ags0
 * 1035  Tire TireGrowth, TireCirFt
 * 1036  TireRadIn = 12 * TireCirFt / (2 * PI)
 * 1037  deltaFWT = (Ags0*gc_Weight.Value*((gc_YCG.Value-TireRadIn)+(FRCT/gc_Efficiency.Value)*TireRadIn)+DragForce*gc_YCG.Value)/gc_Wheelbase.Value
 * 1041  DynamicFWT = 0
 * 1043  gc_StaticFWt.Value = deltaFWT + DynamicFWT
 * 1047  StaticRWT = DownForce - gc_StaticFWt.Value: If StaticRWT < 0 Then StaticRWT = gc_Weight.Value
 * 1050  CAXI = (1 - (gc_TractionIndex.Value - 1) * 0.01) / (TrackTempEffect ^ 0.25)
 * 1051  CRTF = CAXI * AX * TireDia * (gc_TireWidth.Value + 1) * (0.92 + 0.08 * (StaticRWT / 1900) ^ 2.15)
 * 1052  If gc_BodyStyle.Value = 8 Then CRTF = 0.5 * CRTF
 * 1054  AMAX = (CRTF - DragForce) / gc_Weight.Value
 * 1055  SLIP(L) = 0: If Ags0 > AMAX Then Ags0 = AMAX: SLIP(L) = 1
 * 1056  If Ags0 < AMin Then Ags0 = AMin
 * 1057  AGS(L) = Ags0
 * ```
 * 
 * VARIABLE TYPES (from Dim statements, TIMESLIP.FRM lines 507-538, 672):
 * | Variable        | VB6 Type | Line |
 * |-----------------|----------|------|
 * | HP              | Single   | 510  |
 * | TQ              | Single   | 519  |
 * | force           | Single   | 510  |
 * | Ags0            | Single   | 527  |
 * | DragForce       | Single   | 509  |
 * | q               | Single   | 515  |
 * | rho             | Single   | 515  |
 * | hpc             | Single   | 511  |
 * | CRTF            | Single   | 508  |
 * | CAXI            | Single   | 508  |
 * | AMAX            | Single   | 513  |
 * | StaticRWT       | Single   | 524  |
 * | TireSlip        | Single   | 519  |
 * | WindFPS         | Single   | 672  |
 * | TrackTempEffect | Single   | 672  |
 * | DownForce       | Single   | 508  |
 * | TireRadIn       | Single   | 518  |
 * | TireCirFt       | Single   | 518  |
 * | deltaFWT        | Single   | 524  |
 * | AgsMax          | Single   | 507  |
 * | EngRPM()        | Single   | 536  |
 * | Vel()           | Single   | 536  |
 * | AGS()           | Single   | 536  |
 * | TGR()           | Single   | 533  |
 * | TGEff()         | Single   | 533  |
 * | L               | Integer  | 531  |
 * | SLIP()          | Integer  | 532  |
 * 
 * CONSTANT TYPES (no suffix = Double):
 * | Constant | VB6 Type | Source              |
 * |----------|----------|---------------------|
 * | PI       | Double   | DECLARES.BAS:10     |
 * | gc       | Double   | DECLARES.BAS:11     |
 * | Z6       | Double   | DECLARES.BAS:12     |
 * | Z5       | Double   | TIMESLIP.FRM:542    |
 * | AX       | Double   | TIMESLIP.FRM:551    |
 * | CMU      | Double   | TIMESLIP.FRM:552    |
 * | AMin     | Double   | TIMESLIP.FRM:547    |
 * | FRCT     | Double   | TIMESLIP.FRM:559    |
 * 
 * VB6 COERCION RULES:
 * 1. If ANY operand is Double, expression evaluates in Double precision
 * 2. Truncation to Single occurs ONLY at assignment to Single variable
 * 3. gc_*.Value (CValue) returns Variant → promotes to Double in expressions
 * 4. Numeric literals without suffix (0.96, 0.88, etc.) are Double
 * ============================================================================
 */
export function vb6InitState(
  vehicle: VB6VehicleParams,
  env: VB6EnvParams,
  launchRPM: number
): VB6SimState {
  // Clear INIT trace buffer at start
  if (isInitTraceEnabled()) {
    clearInitTrace();
  }
  
  // Initial tire calculations (at zero velocity)
  const tireResult = vb6Tire(vehicle.TireDia_in, vehicle.TireWidth_in, 0, 0, env.isLandSpeed);
  
  // INIT TRACE: Record launch RPM
  if (isInitTraceEnabled()) recordInitStep('LAUNCH_RPM', launchRPM, '1003');
  
  // VB6 1010: Call TABY(xrpm(), yhp(), NHP, 1, EngRPM(L), HP)
  // TABY returns into HP (Single), so result is truncated on assignment
  const HP_launch = vb6AssignSingle(tabyLagrange(vehicle.xrpm, vehicle.yhp, vehicle.NHP, 1, launchRPM));
  if (isInitTraceEnabled()) recordInitStep('HP_LAUNCH_RAW', HP_launch, '1010');
  
  // VB6 1011: HP = gc_HPTQMult.Value * HP / hpc
  // HPTQMult is CValue (Double), HP is Single, hpc is Single
  // Expression computed in Double, result assigned to HP (Single)
  const HP_corrected = vb6AssignSingle(vehicle.HPTQMult * HP_launch / env.hpc);
  if (isInitTraceEnabled()) recordInitStep('HP_CORRECTED', HP_corrected, '1011');
  
  // Z6 is Double constant from DECLARES.BAS (no type suffix = Double)
  if (isInitTraceEnabled()) recordInitStep('Z6_COMPUTED', Z6, 'DECLARES:12');
  
  // VB6 1013: TQ = Z6 * HP / EngRPM(L)
  // Z6 is Double, HP is Single, EngRPM is Single → computed in Double, assigned to TQ (Single)
  let TQ = vb6AssignSingle(Z6 * HP_corrected / launchRPM);
  if (isInitTraceEnabled()) recordInitStep('TQ_PRE_MULT', TQ, '1013');
  
  // VB6 1014: TQ = TQ * gc_TorqueMult.Value * TGR(iGear) * TGEff(iGear)
  // TorqueMult is CValue (Double), TGR/TGEff are Single arrays
  const TGR_1 = vehicle.TGR[0] ?? 1;
  const TGEff_1 = vehicle.TGEff[0] ?? 0.99;
  TQ = vb6AssignSingle(TQ * vehicle.TorqueMult * TGR_1 * TGEff_1);
  if (isInitTraceEnabled()) recordInitStep('TQ_POST_MULT', TQ, '1014');
  
  // VB6 1016: WindFPS = Sqr(Vel(L)^2 + 2*Vel(L)*(WindSpeed/Z5)*Cos(...) + (WindSpeed/Z5)^2)
  // At Vel=0, simplifies to WindSpeed/Z5. Z5 is Double constant, WindSpeed is CValue (Double)
  // WindFPS is Single (line 672)
  const cmu_launch = env.isLandSpeed ? CMU_BV : CMU;  // Double constants
  const WindFPS_launch = vb6AssignSingle(env.WindSpeed_mph / Z5);
  if (isInitTraceEnabled()) recordInitStep('WIND_FPS', WindFPS_launch, '1016');
  
  // VB6 1017: q = Sgn(WindFPS) * rho * Abs(WindFPS)^2 / (2*gc)
  // gc is Double constant, rho is Single, WindFPS is Single. q is Single (line 515)
  const q_launch = vb6AssignSingle(Math.sign(WindFPS_launch) * env.rho * Math.abs(WindFPS_launch) ** 2 / (2 * gc));
  if (isInitTraceEnabled()) recordInitStep('Q_LAUNCH', q_launch, '1017');
  
  // VB6 1019: DragForce = CMU * gc_Weight.Value + gc_DragCoef.Value * gc_RefArea.Value * q
  // CMU is Double constant, Weight/DragCoef/RefArea are CValue (Double), q is Single
  // DragForce is Single (line 509)
  const DragForce_launch = vb6AssignSingle(cmu_launch * vehicle.Weight_lbf + vehicle.DragCoef * vehicle.RefArea_ft2 * q_launch);
  if (isInitTraceEnabled()) recordInitStep('DRAG_FORCE', DragForce_launch, '1019');
  
  // VB6 872: TireSlip = 1.02 + (gc_TractionIndex.Value - 1) * 0.005 + (TrackTempEffect - 1) * 3
  // All numeric literals (1.02, 0.005, 3, etc.) are Double in VB6
  // TireSlip is Single (line 519), TrackTempEffect is Single (line 672)
  let TireSlip_init: number;
  if (env.isLandSpeed) {
    // VB6 875: TireSlip = 1.01 + (gc_TractionIndex.Value - 1) * 0.01
    TireSlip_init = vb6AssignSingle(1.01 + (env.TractionIndex - 1) * 0.01);
  } else {
    // VB6 872: TireSlip = 1.02 + (gc_TractionIndex.Value - 1) * 0.005 + (TrackTempEffect - 1) * 3
    TireSlip_init = vb6AssignSingle(1.02 + (env.TractionIndex - 1) * 0.005 + (env.TrackTempEffect - 1) * 3);
  }
  if (isInitTraceEnabled()) recordInitStep('TIRE_SLIP_INIT', TireSlip_init, '872');
  
  // VB6 1020: force = TQ * gc_GearRatio.Value * gc_Efficiency.Value / (TireSlip * TireDia / 24) - DragForce
  // GearRatio/Efficiency are CValue (Double), TQ/TireSlip/TireDia/DragForce are Single
  // force is Single (line 510)
  const force = vb6AssignSingle(TQ * vehicle.GearRatio * vehicle.Efficiency / (TireSlip_init * vehicle.TireDia_in / 24) - DragForce_launch);
  if (isInitTraceEnabled()) recordInitStep('FORCE', force, '1020');
  
  // VB6 1023-1027: If gc_TransType.Value Then Ags0 = 0.96 * force / gc_Weight.Value
  //                Else Ags0 = 0.88 * force / gc_Weight.Value
  // 0.96/0.88 are Double literals, force is Single, Weight is CValue (Double)
  // Ags0 is Single (line 527)
  const lossFactor = vehicle.isClutch ? 0.88 : 0.96;  // Double literal
  if (isInitTraceEnabled()) recordInitStep('LOSS_FACTOR', vb6AssignSingle(lossFactor), '1023');
  
  let Ags0_g = vb6AssignSingle(lossFactor * force / vehicle.Weight_lbf);
  if (isInitTraceEnabled()) recordInitStep('AGS0_UNCLAMPED', Ags0_g, '1024');
  
  // VB6 1047: StaticRWT = DownForce - gc_StaticFWt.Value: If StaticRWT < 0 Then StaticRWT = gc_Weight.Value
  // DownForce is Single (line 508), StaticFWt is CValue (Double)
  // StaticRWT is Single (line 524)
  const DownForce_init = vehicle.Weight_lbf;
  let StaticRWT = vb6AssignSingle(DownForce_init - vehicle.StaticFWt_lbf);
  if (StaticRWT < 0) StaticRWT = vb6AssignSingle(vehicle.Weight_lbf);
  if (isInitTraceEnabled()) recordInitStep('STATIC_RWT', StaticRWT, '1047');
  
  // VB6 1050: CAXI = (1 - (gc_TractionIndex.Value - 1) * 0.01) / (TrackTempEffect ^ 0.25)
  // All literals are Double, TractionIndex is CValue (Double), TrackTempEffect is Single
  // CAXI is Single (line 508)
  const CAXI_init = vb6AssignSingle((1 - (env.TractionIndex - 1) * 0.01) / Math.pow(env.TrackTempEffect, 0.25));
  if (isInitTraceEnabled()) recordInitStep('CAXI', CAXI_init, '1050');
  
  // AX is Double constant from TIMESLIP.FRM line 551
  const AX_init = AX;  // Double, no truncation needed for constant
  if (isInitTraceEnabled()) recordInitStep('AX', vb6AssignSingle(AX_init), '551');
  
  // VB6 1051: CRTF = CAXI * AX * TireDia * (gc_TireWidth.Value + 1) * (0.92 + 0.08 * (StaticRWT / 1900) ^ 2.15)
  // CAXI/StaticRWT are Single, AX is Double, TireDia/TireWidth are CValue (Double), literals are Double
  // CRTF is Single (line 508)
  let CRTF_init = vb6AssignSingle(CAXI_init * AX_init * vehicle.TireDia_in * (vehicle.TireWidth_in + 1) * (0.92 + 0.08 * Math.pow(StaticRWT / 1900, 2.15)));
  // VB6 1052: If gc_BodyStyle.Value = 8 Then CRTF = 0.5 * CRTF
  if (vehicle.BodyStyle === 8) CRTF_init = vb6AssignSingle(0.5 * CRTF_init);
  if (isInitTraceEnabled()) recordInitStep('CRTF', CRTF_init, '1051');
  
  // VB6 1054: AMAX = (CRTF - DragForce) / gc_Weight.Value
  // CRTF/DragForce are Single, Weight is CValue (Double)
  // AMAX is Single (line 513)
  const AMax_init = vb6AssignSingle((CRTF_init - DragForce_launch) / vehicle.Weight_lbf);
  if (isInitTraceEnabled()) recordInitStep('AMAX', AMax_init, '1054');
  
  // VB6: TIMESLIP.FRM:1055-1056 - Clamp Ags0 to AMax/AMin
  // If Ags0 > AMAX Then Ags0 = AMAX: SLIP(L) = 1
  // If Ags0 < AMin Then Ags0 = AMin
  const Ags0_unclamped = Ags0_g;
  let SLIP_init = false;
  if (Ags0_g > AMax_init) {
    SLIP_init = true;  // Traction limited - set slip flag
    Ags0_g = AMax_init;
  }
  if (Ags0_g < AMin) Ags0_g = AMin;
  if (isInitTraceEnabled()) {
    recordInitStep('AGS0_FINAL', Ags0_g, '1055-1056');
    recordInitStep('SLIP_FLAG', SLIP_init ? 1 : 0, '1055');
  }
  
  // Debug: Log traction limit calculation
  console.log('[vb6InitState] Traction limit:', JSON.stringify({
    Ags0_unclamped,
    AMax_init,
    Ags0_clamped: Ags0_g,
    CAXI_init,
    AX_init,
    CRTF_init,
    StaticRWT,
    StaticFWt: vehicle.StaticFWt_lbf,
    TireSlip_init,
    force,
    DragForce_launch,
  }));
  
  // TRACE HOOK: Record INIT_DONE with all intermediate variables
  if (VB6_TRACE_ENABLED) {
    recordTracePoint(
      0,  // stepIndex = 0 for init
      'INIT_DONE',
      {
        time_s: 0,
        dist_ft: 0,
        vel_ftps: 0,
        rpm: launchRPM,
        AGS_g: Ags0_g,
        gear: 1,
      },
      {
        HP_launch,
        HP_corrected,
        TQ,
        force,
        Ags0_unclamped,
        CAXI: CAXI_init,
        AX: AX_init,
        CRTF: CRTF_init,
        AMax: AMax_init,
        StaticRWT,
        DragForce: DragForce_launch,
        TireSlip: TireSlip_init,
        lossFactor,
      }
    );
  }
  
  // Return initial state with all values truncated to Single (VB6 semantics)
  return {
    L: 1,
    time_s: vb6AssignSingle(0),
    Vel_ftps: vb6AssignSingle(0), // VB6: TIMESLIP.FRM:1003 - Vel(L) = 0
    Dist_ft: vb6AssignSingle(0),
    AGS_g: vb6AssignSingle(Ags0_g),
    EngRPM: vb6AssignSingle(launchRPM),
    DSRPM: vb6AssignSingle(0),
    Gear: 1,
    SLIP: SLIP_init,  // True if traction limited (Ags0 > AMAX)
    
    Vel0_ftps: vb6AssignSingle(0),
    Ags0_g: vb6AssignSingle(Ags0_g),
    Dist0_ft: vb6AssignSingle(0),
    DSRPM0: vb6AssignSingle(0),
    
    // VB6: TIMESLIP.FRM:1003 - Initial values before first step
    // RPM0 and Time0 are set DURING the step (lines 1092-1095), not at init
    // Initialize to values that will trigger the first-step special handling
    RPM0: vb6AssignSingle(launchRPM),
    Time0_s: vb6AssignSingle(0),
    
    AgsMax_g: vb6AssignSingle(Ags0_g),
    TireGrowth: vb6AssignSingle(tireResult.TireGrowth),
    TireCirFt: vb6AssignSingle(tireResult.TireCirFt),
    
    // Shift tracking
    ShiftFlag: 0,
    PrevGear: 1,
  };
}

/**
 * Calculate TSMax (maximum timestep) per VB6 initialization
 * TIMESLIP.FRM:1062-1064
 */
export function vb6CalcTSMaxInit(
  DistToPrint1_ft: number,
  HP: number,
  TorqueMult: number,
  Weight_lbf: number
): number {
  // TSMax = DistToPrint(1) * 0.11 * (HP * TorqueMult / Weight)^(-1/3)
  // TSMax = TSMax / 15
  let TSMax = DistToPrint1_ft * 0.11 * Math.pow(HP * TorqueMult / Weight_lbf, -1/3);
  TSMax = TSMax / 15;
  if (TSMax < 0.005) TSMax = 0.005;
  return TSMax;
}
