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
  gc, PI, JMin, JMax, AMin, K6, K61, Z5,
  // Quarter Pro constants
  CMU, CMUK, KP21, KP22, FRCT, AX, KV,
  // Bonneville Pro constants
  CMU_BV, CMUK_BV, KP21_BV, KP22_BV, FRCT_BV, AX_BV, KV_BV
} from './constants';

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
  TimePrint?: number;       // VB6 TIMESLIP.FRM:918 - Next time print point
  iDist?: number;           // VB6 iDist - current distance print index (1-based like VB6)
  shiftRPMs?: number[];     // VB6 ShiftRPM array for VelShiftMatch calculation
  Shift2PrintTime?: number; // VB6 TIMESLIP.FRM:1071 - Target time for shift completion
  iMPH?: number;            // VB6 iMPH - current MPH print index (1-based, 1 or 2)
  MPHtoPrint?: number[];    // VB6 MPHtoPrint array [60/Z5, 100/Z5] in ft/s for VelMPHMatch
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

/**
 * VB6 TABY function - linear interpolation in HP curve
 * TIMESLIP.FRM uses 1st order (linear) interpolation
 */
export function TABY(xrpm: number[], yhp: number[], NHP: number, _order: number, rpm: number): number {
  // Find bracketing points
  let i = 0;
  for (i = 0; i < NHP - 1; i++) {
    if (rpm <= xrpm[i + 1]) break;
  }
  
  // Clamp to range
  if (i >= NHP - 1) i = NHP - 2;
  if (i < 0) i = 0;
  
  // Linear interpolation
  const x0 = xrpm[i];
  const x1 = xrpm[i + 1];
  const y0 = yhp[i];
  const y1 = yhp[i + 1];
  
  if (x1 === x0) return y0;
  
  const t = (rpm - x0) / (x1 - x0);
  return y0 + t * (y1 - y0);
}

/**
 * VB6 Tire subroutine - calculates tire growth and circumference
 * TIMESLIP.FRM line 1585-1606
 * 
 * Note: Bonneville Pro uses a completely different formula than Quarter Pro!
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
    TireGrowth = 1 + 0.00004 * Vel_ftps;
    TireCirFt = TireGrowth * TireDia_in * PI / 12;
  } else {
    // VB6: TIMESLIP.FRM:1589-1596 - Quarter Pro
    // TGK = (TireWidth^1.4 + TireDia - 16) / (0.171 * TireDia^1.7)
    // TireGrowth = 1 + TGK * 0.0000135 * Vel^1.6
    // TGLinear = 1 + TGK * 0.00035 * Vel
    // If TGLinear < TireGrowth Then TireGrowth = TGLinear
    // TireSQ = TireGrowth - 0.035 * Abs(Ags0)
    // TireCirFt = TireSQ * TireDia * PI / 12
    const TGK = (Math.pow(TireWidth_in, 1.4) + TireDia_in - 16) / (0.171 * Math.pow(TireDia_in, 1.7));
    TireGrowth = 1 + TGK * 0.0000135 * Math.pow(Vel_ftps, 1.6);
    const TGLinear = 1 + TGK * 0.00035 * Vel_ftps;
    if (TGLinear < TireGrowth) TireGrowth = TGLinear;
    
    // Tire squat under load
    const TireSQ = TireGrowth - 0.035 * Math.abs(Ags0_g);
    TireCirFt = TireSQ * TireDia_in * PI / 12;
  }
  
  return { TireGrowth, TireCirFt };
}

/**
 * Calculate CAXI (traction coefficient base)
 * VB6: TIMESLIP.FRM:1050
 * CAXI = (1 - (TractionIndex - 1) * 0.01) / (TrackTempEffect ^ 0.25)
 */
export function calcCAXI(TractionIndex: number, TrackTempEffect: number): number {
  return (1 - (TractionIndex - 1) * 0.01) / Math.pow(TrackTempEffect, 0.25);
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
  TimePrint: number;
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
  const time = ctx.TimePrint;
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
  if (ctx.ASV.time >= ctx.TimePrint + ctx.TimeTol) {
    opt2 = 1;
    factor2 = (ctx.TimePrint - ctx.Time0) / (ctx.ASV.time - ctx.Time0);
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

// NOTE: Throttle stop functionality removed from VB6-exact mode to match original VB6 code.
// The ThrottleStopParams interface is kept for API compatibility but not used in physics.

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
  _throttleStop?: ThrottleStopParams  // RSA extension - not used in VB6-exact mode
): VB6StepComputed {
  const iGear = state.Gear;
  
  // ========================================================================
  // TIMESLIP.FRM:1070-1076 - Check for gear change
  // At top of gear change loop, TimeStep = DTShift
  // ========================================================================
  let TimeStep: number;
  const gearChanged = state.Gear !== state.PrevGear;
  
  if (gearChanged) {
    // VB6: TIMESLIP.FRM:1072 - TimeStep = DTShift at gear change
    TimeStep = vehicle.DTShift;
    state.PrevGear = state.Gear;
  } else {
    // ========================================================================
    // TIMESLIP.FRM:1082 - Calculate adaptive timestep
    // VB6: TimeStep = TSMax * (AgsMax / Ags0) ^ 4
    // ========================================================================
    TimeStep = TSMax;
    if (state.Ags0_g > 0 && state.L > 1) {
      TimeStep = TSMax * Math.pow(state.AgsMax_g / state.Ags0_g, 4);
    }
  }
  
  // ========================================================================
  // TIMESLIP.FRM:1084-1088 - Calculate jerk from previous step
  // ========================================================================
  let Jerk = 0;
  const Work_time = state.time_s - state.Time0_s;
  if (Work_time > 0) {
    Jerk = (state.AGS_g - state.Ags0_g) / Work_time;
  }
  if (Jerk < JMin) Jerk = JMin;
  if (Jerk > JMax) Jerk = JMax;
  
  // ========================================================================
  // TIMESLIP.FRM:1090-1096 - Save previous values
  // ========================================================================
  state.Vel0_ftps = state.Vel_ftps;
  state.Ags0_g = state.AGS_g;
  state.Time0_s = state.time_s;
  state.Dist0_ft = state.Dist_ft;
  state.RPM0 = state.EngRPM;
  state.DSRPM0 = state.DSRPM;
  
  // TIMESLIP.FRM:1093-1094 - Special handling for first step at launch
  // VB6: If RPM0 = LaunchRPM And Time0 = 0 Then
  //     RPM0 = Stall: Time0 = EnginePMI * (Stall - LaunchRPM) / 250000
  // This happens BEFORE the iteration loop, so Time0 = spinUpTime is used in time calculation
  // Use tolerance for floating point comparison
  const isFirstStep = Math.abs(state.RPM0 - vehicle.LaunchRPM) < 1 && state.Time0_s === 0;
  if (isFirstStep) {
    state.RPM0 = vehicle.Stall;
    if (vehicle.LaunchRPM < vehicle.Stall) {
      state.Time0_s = vehicle.EnginePMI * (vehicle.Stall - vehicle.LaunchRPM) / 250000;
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
  // VB6: Different formulas for Quarter Pro vs Bonneville Pro
  // ========================================================================
  let TireSlip: number;
  if (env.isLandSpeed) {
    // Bonneville Pro: TIMESLIP.FRM:875
    // TireSlip = 1.01 + (gc_TractionIndex.Value - 1) * 0.01
    // Note: No distance-based reduction for BVPro
    TireSlip = 1.01 + (env.TractionIndex - 1) * 0.01;
  } else {
    // Quarter Pro: TIMESLIP.FRM:1098-1101
    // Work = 0.005 * (TractionIndex - 1) + 3 * (TrackTempEffect - 1)
    // TireSlip = 1.02 + Work * (1 - (Dist0 / 1320) ^ 2)
    const Work_slip = 0.005 * (env.TractionIndex - 1) + 3 * (env.TrackTempEffect - 1);
    TireSlip = 1.02 + Work_slip * (1 - Math.pow(state.Dist0_ft / 1320, 2));
  }
  
  // ========================================================================
  // TIMESLIP.FRM:1074-1075 - Calculate chassis PMI for this gear
  // ChassisPMI = TiresPMI + TransPMI * GearRatio^2 * TGR(iGear)^2
  // ========================================================================
  const TGR_gear = vehicle.TGR[iGear - 1] ?? 1; // Convert to 0-indexed
  const ChassisPMI = vehicle.TiresPMI + vehicle.TransPMI * Math.pow(vehicle.GearRatio, 2) * Math.pow(TGR_gear, 2);
  
  // ========================================================================
  // TIMESLIP.FRM:1107 - Estimate next velocity (first pass)
  // Vel(L) = Vel0 + Ags0 * gc * TimeStep + Jerk * gc * TimeStep^2 / 2
  // ========================================================================
  let Vel_L = state.Vel0_ftps + state.Ags0_g * gc * TimeStep + Jerk * gc * TimeStep * TimeStep / 2;
  
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
    
    // TIMESLIP.FRM:1113-1114 - Don't let TimeStep exceed TimePrint
    // VB6: If TimeStep > (TimePrint - Time0) Then TimeStep = TimePrint - Time0
    if (env.TimePrint !== undefined) {
      const timeToNextPrint = env.TimePrint - state.Time0_s;
      if (timeToNextPrint > 0 && TimeStep > timeToNextPrint) {
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
    
    // TIMESLIP.FRM:1122 - Recalculate velocity with limited timestep
    // VB6: Vel(L) = Vel0 + Ags0 * gc * TimeStep + Jerk * gc * TimeStep * TimeStep / 2
    Vel_L = state.Vel0_ftps + state.Ags0_g * gc * TimeStep + Jerk * gc * TimeStep * TimeStep / 2;
    
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
    
    if (env.nextDistPrint !== undefined && DistStep_est >= (env.nextDistPrint - DistTol)) {
      const targetDist = env.nextDistPrint;
      const distToTarget = targetDist - state.Dist0_ft;
      if (distToTarget > 0) {
        // VB6 unconditionally sets velocity - no sanity check
        const Vel_L_old = Vel_L;
        Vel_L = Math.sqrt(state.Vel0_ftps * state.Vel0_ftps + 2 * state.Ags0_g * gc * distToTarget);
        // Debug: Log when distance targeting triggers
        if (env.nextDistPrint > 300 && env.nextDistPrint < 350) {
          console.log(`[vb6Step] L=${state.L} 330ft TARGET ADJUSTED: distToTarget=${distToTarget.toFixed(2)}, Vel_L ${Vel_L_old.toFixed(2)} -> ${Vel_L.toFixed(2)}`);
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
  const Vel0_cubed = Math.pow(state.Vel0_ftps, 3);
  
  // VB6 velocity revision loop - equivalent to GoTo 270
  const MAX_VEL_REVISIONS = 10;
  for (let velRevision = 0; velRevision < MAX_VEL_REVISIONS; velRevision++) {
    
    // ========================================================================
    // TIMESLIP.FRM:1139 - Calculate VelSqrd
    // VelSqrd = Vel(L)^2 - Vel0^2
    // ========================================================================
    VelSqrd = Vel_L * Vel_L - state.Vel0_ftps * state.Vel0_ftps;
  
    // ========================================================================
    // TIMESLIP.FRM:1140 - Calculate DSRPM
    // DSRPM = TireSlip * Vel(L) * 60 / TireCirFt
    // ========================================================================
    DSRPM = TireSlip * Vel_L * 60 / state.TireCirFt;
    
    // ========================================================================
    // TIMESLIP.FRM:1144-1174 - Clutch/Converter calculations
    // ========================================================================
    LockRPM = DSRPM * vehicle.GearRatio * TGR_gear;
    EngRPM_L = vehicle.Slippage * LockRPM;
    zStall = vehicle.Stall;
    SlipRatio = 0;
  
    if (vehicle.isClutch) {
      // TIMESLIP.FRM:1148-1152 - Clutch
      if (EngRPM_L < vehicle.Stall) {
        if (iGear === 1 || !vehicle.LockUp) {
          EngRPM_L = vehicle.Stall;
        }
      }
      ClutchSlip = LockRPM / EngRPM_L;
    } else {
      // TIMESLIP.FRM:1154-1172 - Converter
      if (iGear === 1 || !vehicle.LockUp) {
        // Non lock-up converter
        zStall = vehicle.Stall;
        SlipRatio = vehicle.Slippage * LockRPM / zStall;
        
        if (state.L > 2) {
          if (SlipRatio > 0.6) {
            zStall = zStall * (1 + (vehicle.Slippage - 1) * (SlipRatio - 0.6) / ((1 / vehicle.Slippage) - 0.6));
          }
          SlipRatio = vehicle.Slippage * LockRPM / zStall;
        }
        ClutchSlip = 1 / vehicle.Slippage;
        
        if (EngRPM_L < zStall) {
          EngRPM_L = zStall;
          const Work_conv = vehicle.TorqueMult - (vehicle.TorqueMult - 1) * SlipRatio;
          ClutchSlip = Work_conv * LockRPM / zStall;
        }
      } else {
        // Lock-up converter
        EngRPM_L = 1.005 * LockRPM; // 0.5% slippage
        ClutchSlip = LockRPM / EngRPM_L;
      }
    }
    if (ClutchSlip > 1) ClutchSlip = 1;
  
    // ========================================================================
    // TIMESLIP.FRM:1176-1178 - Get HP from curve
    // VB6: Call TABY(xrpm(), yhp(), NHP, 1, EngRPM(L), HP)
    //      HP = gc_HPTQMult.Value * HP / hpc
    //      HPSave = HP:    HP = HP * ClutchSlip
    // ========================================================================
    HP = TABY(vehicle.xrpm, vehicle.yhp, vehicle.NHP, 1, EngRPM_L);
    HP = vehicle.HPTQMult * HP / env.hpc;
    HPSave = HP;  // VB6: HPSave = HP (BEFORE ClutchSlip, BEFORE any RSA additions)
    HP = HP * ClutchSlip;
    
    // ========================================================================
    // TIMESLIP.FRM:1180-1194 - Calculate drag forces
    // ========================================================================
    // Wind effective velocity
    WindFPS = Math.sqrt(
      Vel_L * Vel_L + 
      2 * Vel_L * (env.WindSpeed_mph / Z5) * Math.cos(PI * env.WindAngle_deg / 180) + 
      Math.pow(env.WindSpeed_mph / Z5, 2)
    );
    
    // Dynamic pressure (VB6 uses lbm/ft³ for rho, divides by gc)
    q = Math.sign(WindFPS) * env.rho * Math.pow(Math.abs(WindFPS), 2) / (2 * gc);
    
    // Frontal area with tire growth
    if (vehicle.BodyStyle === 8) {
      // Motorcycle
      RefArea2 = vehicle.RefArea_ft2 + ((state.TireGrowth - 1) * vehicle.TireDia_in / 2) * vehicle.TireWidth_in / 144;
    } else {
      RefArea2 = vehicle.RefArea_ft2 + ((state.TireGrowth - 1) * vehicle.TireDia_in / 2) * (2 * vehicle.TireWidth_in) / 144;
    }
    
    // Down force (weight + aero lift)
    DownForce = vehicle.Weight_lbf + vehicle.LiftCoef * RefArea2 * q;
    
    // Select constants based on land speed mode
    // VB6: TIMESLIP.FRM:550-570 - different constants for ISBVPRO
    const cmu_const = env.isLandSpeed ? CMU_BV : CMU;
    const cmuk_const = env.isLandSpeed ? CMUK_BV : CMUK;
    const frct_const = env.isLandSpeed ? FRCT_BV : FRCT;
    
    // Rolling resistance coefficient (decreases with distance for QPro, constant for BVPro)
    const cmu1 = cmu_const - (state.Dist0_ft / 1320) * cmuk_const;
    
    // Total drag force
    DragForce = cmu1 * DownForce + 0.0001 * DownForce * (Z5 * Vel_L) + vehicle.DragCoef * RefArea2 * q;
    DragHP = DragForce * Vel_L / 550;
  
    // ========================================================================
    // TIMESLIP.FRM:1196-1211 - Calculate dynamic weight transfer
    // ========================================================================
    const TireRadIn = 12 * state.TireCirFt / (2 * PI);
    const deltaFWT = (state.Ags0_g * vehicle.Weight_lbf * ((vehicle.YCG_in - TireRadIn) + (frct_const / vehicle.Efficiency) * TireRadIn) + DragForce * vehicle.YCG_in) / vehicle.Wheelbase_in;
    DynamicFWT = vehicle.StaticFWt_lbf - deltaFWT;
    
    // Wheelie bar
    WheelBarWT = 0;
    if (DynamicFWT < 0) {
      WheelBarWT = -DynamicFWT * vehicle.Wheelbase_in / 64;
      DynamicFWT = 0;
    }
    
    // Dynamic rear weight
    DynamicRWT = DownForce - DynamicFWT - WheelBarWT;
    if (DynamicRWT < 0) DynamicRWT = vehicle.Weight_lbf;
    
    // ========================================================================
    // TIMESLIP.FRM:1213-1216 - Calculate AMax (traction limit)
    // ========================================================================
    const CAXI = calcCAXI(env.TractionIndex, env.TrackTempEffect);
    const AX_val = calcAX(env.isLandSpeed);
    CRTF = CAXI * AX_val * vehicle.TireDia_in * (vehicle.TireWidth_in + 1) * (0.92 + 0.08 * Math.pow(DynamicRWT / 1900, 2.15));
    if (vehicle.BodyStyle === 8) CRTF = 0.5 * CRTF;
    
    AMax_g = ((CRTF / state.TireGrowth) - DragForce) / vehicle.Weight_lbf;
  
    // ========================================================================
    // TIMESLIP.FRM:1218-1229 - Initial HP chain and time estimate
    // VB6: HP = HP * TGEff(iGear) * Efficiency / TireSlip - DragHP
    // 
    // NOTE: TorqueMult is handled through ClutchSlip when converter is stalling.
    // The VB6 HP chain does NOT directly apply TorqueMult - it's incorporated via ClutchSlip.
    // ========================================================================
    const TGEff_gear = vehicle.TGEff[iGear - 1] ?? 0.99;
    HP = HP * TGEff_gear * vehicle.Efficiency / TireSlip;
    HPAtWheels = HP;  // HP at wheels BEFORE subtracting drag (for plotting)
    HP = HP - DragHP;
    
    PQWT = 550 * gc * HP / vehicle.Weight_lbf;
    AGS_g = PQWT / (Vel_L * gc);
    
    // TIMESLIP.FRM:1223-1228 - Initial AMin/AMax clamps
    // VB6 uses reflection formula: AGS = AMAX - (AGS - AMAX) = 2*AMAX - AGS
    // This can produce negative values when AGS >> AMAX, which then get clamped to AMin
    SLIP = false;
    if (AGS_g > AMax_g) {
      SLIP = true;
      PQWT = PQWT * (AMax_g - (AGS_g - AMax_g)) / AGS_g;
      AGS_g = AMax_g - (AGS_g - AMax_g);
    }
    if (AGS_g < AMin) {
      // VB6: TIMESLIP.FRM:1228 - Scale PQWT proportionally, then clamp AGS
      // VB6: PQWT = PQWT * AMin / AGS(L): AGS(L) = AMin
      PQWT = PQWT * AMin / AGS_g;
      AGS_g = AMin;
    }
    
    // Initial time estimate
    // VB6: time(L) = VelSqrd / (2 * PQWT) + Time0
    time_L = VelSqrd / (2 * PQWT) + state.Time0_s;
  
    // Debug: Log first step physics values with full HP chain
    if (state.L <= 2) {
      console.log(`[vb6Step] L=${state.L} HP chain: HPSave=${HPSave.toFixed(1)}, ClutchSlip=${ClutchSlip.toFixed(4)}, HP_afterClutch=${(HPSave*ClutchSlip).toFixed(1)}, TGEff=${TGEff_gear.toFixed(3)}, Eff=${vehicle.Efficiency.toFixed(3)}, TireSlip=${TireSlip.toFixed(4)}, DragHP=${DragHP.toFixed(2)}, HP_final=${HP.toFixed(1)}`);
      console.log(`[vb6Step] L=${state.L} PQWT: Vel_L=${Vel_L.toFixed(4)}, Vel0=${state.Vel0_ftps.toFixed(4)}, VelSqrd=${VelSqrd.toFixed(4)}, PQWT=${PQWT.toFixed(2)}, AGS_g=${AGS_g.toFixed(3)}, AMax_g=${AMax_g.toFixed(3)}, Time0=${state.Time0_s.toFixed(5)}, TimeStep=${TimeStep.toFixed(5)}`);
    }
    
    // ========================================================================
    // TIMESLIP.FRM:1231-1240 - Calculate acceleration HP terms
    // ========================================================================
    // Select KP21/KP22 based on land speed mode
    // VB6: TIMESLIP.FRM:557-558 (QPro) vs 567-568 (BVPro)
    const kp21_const = env.isLandSpeed ? KP21_BV : KP21;
    const kp22_const = env.isLandSpeed ? KP22_BV : KP22;
    
    EngAccHP = vehicle.EnginePMI * EngRPM_L * (EngRPM_L - state.RPM0);
    
    // Debug: Show EngAccHP calculation on first step
    if (state.L <= 2) {
      console.log(`[vb6Step] L=${state.L} EngAccHP: EnginePMI=${vehicle.EnginePMI.toFixed(2)}, EngRPM_L=${EngRPM_L.toFixed(0)}, RPM0=${state.RPM0.toFixed(0)}, EngAccHP=${EngAccHP.toFixed(0)}`);
    }
    
    if (EngAccHP < 0) {
      if (vehicle.isClutch) {
        EngAccHP = kp21_const * EngAccHP;
      } else {
        EngAccHP = kp22_const * EngAccHP;
      }
    }
    
    ChasAccHP = ChassisPMI * DSRPM * (DSRPM - state.DSRPM0);
    if (ChasAccHP < 0) ChasAccHP = 0;
    
    // ========================================================================
    // TIMESLIP.FRM:1244-1276 - ITERATION LOOP
    // ========================================================================
    HPEngPMI = 0;
    HPChasPMI = 0;
    k = 0;
  
    for (k = 1; k <= 12; k++) {
      const dtk1 = time_L - state.Time0_s;
      // VB6 doesn't have a dtk1 <= 0 check - it proceeds with the calculation
      
      // TIMESLIP.FRM:1247-1248
      const Work = Math.pow(2 * PI / 60, 2) / (12 * 550 * dtk1);
      HPEngPMI = EngAccHP * Work;
      HPChasPMI = ChasAccHP * Work;
      
      // TIMESLIP.FRM:1250-1253
      // VB6: HP = (HPSave - HPEngPMI) * ClutchSlip
      // VB6: HP = ((HP * TGEff(iGear) * Efficiency - HPChasPMI) / TireSlip) - DragHP
      HP = (HPSave - HPEngPMI) * ClutchSlip;
      HP = ((HP * TGEff_gear * vehicle.Efficiency - HPChasPMI) / TireSlip) - DragHP;
      PQWT = 550 * gc * HP / vehicle.Weight_lbf;
      AGS_g = PQWT / (Vel_L * gc);
      
      // TIMESLIP.FRM:1255-1258 - Jerk limits
      let Jerk_iter = 0;
      if (dtk1 !== 0) {
        Jerk_iter = (AGS_g - state.Ags0_g) / dtk1;
      }
      if (Jerk_iter < JMin) {
        Jerk_iter = JMin;
        AGS_g = state.Ags0_g + Jerk_iter * dtk1;
        PQWT = AGS_g * gc * Vel_L;
      }
      if (Jerk_iter > JMax) {
        Jerk_iter = JMax;
        AGS_g = state.Ags0_g + Jerk_iter * dtk1;
        PQWT = AGS_g * gc * Vel_L;
      }
      
      // TIMESLIP.FRM:1260-1266 - AMin/AMax clamps
      // VB6 uses reflection formula: AGS = AMAX - (AGS - AMAX) = 2*AMAX - AGS
      // This can produce negative values when AGS >> AMAX, which then get clamped to AMin
      SLIP = false;
      if (AGS_g > AMax_g) {
        SLIP = true;
        PQWT = PQWT * (AMax_g - (AGS_g - AMax_g)) / AGS_g;
        AGS_g = AMax_g - (AGS_g - AMax_g);
      }
      if (AGS_g < AMin) {
        // VB6: TIMESLIP.FRM:1266 - Scale PQWT proportionally, then clamp AGS
        // VB6: PQWT = PQWT * AMin / AGS(L): AGS(L) = AMin
        PQWT = PQWT * AMin / AGS_g;
        AGS_g = AMin;
      }
      
      // TIMESLIP.FRM:1268-1270 - New time estimate and convergence check
      // VB6: time(L) = VelSqrd / (2 * PQWT) + Time0
      const dtk2_time = VelSqrd / (2 * PQWT) + state.Time0_s;
      const dtk2 = dtk2_time - state.Time0_s;
      
      // Debug: Log iteration values
      if (state.L <= 2 && k <= 3) {
        console.log(`[vb6Step] L=${state.L} iter k=${k}: HP=${HP.toFixed(1)}, PQWT=${PQWT.toFixed(2)}, AGS_g=${AGS_g.toFixed(3)}, dtk1=${dtk1.toFixed(5)}, dtk2=${dtk2.toFixed(5)}`);
      }
      
      if (k === 12 || Math.abs(100 * (dtk2 - dtk1) / dtk2) <= 0.01) {
        time_L = dtk2_time;
        break;
      }
      
      // TIMESLIP.FRM:1272-1275 - Relaxation for next iteration
      let z = HP / HPSave;
      if (z < K6) z = K6;
      if (z > K61) z = K61;
      time_L = state.Time0_s + dtk1 + z * (dtk2 - dtk1);
    }
    
    // ========================================================================
    // TIMESLIP.FRM:1280 - Calculate distance after convergence
    // VB6: Dist(L) = ((2*PQWT*(time(L)-Time0) + Vel0^2)^1.5 - Vel0^3) / (3*PQWT) + Dist0
    // ========================================================================
    dt_final = time_L - state.Time0_s;
    let term = 2 * PQWT * dt_final + state.Vel0_ftps * state.Vel0_ftps;
    Dist_L = (Math.pow(term, 1.5) - Vel0_cubed) / (3 * PQWT) + state.Dist0_ft;
    
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
    let VelTimeMatch = 0;
    if (env.TimePrint !== undefined) {
      if (Math.abs(env.TimePrint - time_L) >= TimeTol_rev) {
        if (time_L > env.TimePrint) {
          // VB6 line 1318: Work = 2 * PQWT * (TimePrint - time(L)) + Vel(L) ^ 2
          const Work_time = 2 * PQWT * (env.TimePrint - time_L) + Vel_L * Vel_L;
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
    // VB6 TIMESLIP.FRM:860 - ShiftRPMTol = 10: If ShiftRPM(1) > 8000 Then ShiftRPMTol = 20
    let VelShiftMatch = 0;
    const ShiftRPMTol = (vehicle.ShiftRPM[0] ?? 7000) > 8000 ? 20 : 10;
    if (iGear < vehicle.NGR && env.shiftRPMs !== undefined) {
      const targetShiftRPM = env.shiftRPMs[iGear - 1];
      if (targetShiftRPM !== undefined) {
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
  // Update state
  // ========================================================================
  state.L += 1;
  state.time_s = time_L;
  state.Vel_ftps = Vel_L;
  state.Dist_ft = Dist_L;
  state.AGS_g = AGS_g;
  state.EngRPM = EngRPM_L;
  state.DSRPM = DSRPM;
  state.SLIP = SLIP;
  
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
 */
export function vb6InitState(
  vehicle: VB6VehicleParams,
  env: VB6EnvParams,
  launchRPM: number
): VB6SimState {
  // VB6: TIMESLIP.FRM:1003-1057 - Initialize launch conditions
  // L = 1: Time0 = 0: time(L) = 0: Vel(L) = 0: Dist(L) = 0: DSRPM = 0
  
  // Initial tire calculations (at zero velocity)
  const tireResult = vb6Tire(vehicle.TireDia_in, vehicle.TireWidth_in, 0, 0, env.isLandSpeed);
  
  // VB6: TIMESLIP.FRM:1010-1014 - Get HP and calculate torque
  // Call TABY(xrpm(), yhp(), NHP, 1, EngRPM(L), HP)
  // HP = gc_HPTQMult.Value * HP / hpc
  // TQ = Z6 * HP / EngRPM(L)
  // TQ = TQ * gc_TorqueMult.Value * TGR(iGear) * TGEff(iGear)
  // NOTE: Z6 = (60 / (2 * PI)) * 550 = 5252.113... (imported from constants.ts)
  const HP_launch = TABY(vehicle.xrpm, vehicle.yhp, vehicle.NHP, 1, launchRPM);
  const HP_corrected = vehicle.HPTQMult * HP_launch / env.hpc;
  const Z6_local = (60 / (2 * PI)) * 550;  // VB6 exact formula: DECLARES.BAS:12
  let TQ = Z6_local * HP_corrected / launchRPM;
  const TGR_1 = vehicle.TGR[0] ?? 1;
  const TGEff_1 = vehicle.TGEff[0] ?? 0.99;
  TQ = TQ * vehicle.TorqueMult * TGR_1 * TGEff_1;
  
  // VB6: TIMESLIP.FRM:1016-1019 - Calculate drag force at launch (Vel=0)
  // WindFPS = Sqr(Vel(L)^2 + ...) = WindSpeed/Z5 at Vel=0
  // q = Sgn(WindFPS) * rho * Abs(WindFPS)^2 / (2*gc)
  // DragForce = CMU * Weight + DragCoef * RefArea * q
  const cmu_launch = env.isLandSpeed ? CMU_BV : CMU;
  const WindFPS_launch = env.WindSpeed_mph / Z5;
  const q_launch = Math.sign(WindFPS_launch) * env.rho * Math.pow(Math.abs(WindFPS_launch), 2) / (2 * gc);
  const DragForce_launch = cmu_launch * vehicle.Weight_lbf + vehicle.DragCoef * vehicle.RefArea_ft2 * q_launch;
  
  // VB6: TIMESLIP.FRM:872-875 - Initial tire slip
  // Different formulas for Quarter Pro vs Bonneville Pro
  let TireSlip_init: number;
  if (env.isLandSpeed) {
    // Bonneville Pro: TIMESLIP.FRM:875
    // TireSlip = 1.01 + (gc_TractionIndex.Value - 1) * 0.01
    TireSlip_init = 1.01 + (env.TractionIndex - 1) * 0.01;
  } else {
    // Quarter Pro: TIMESLIP.FRM:872
    // TireSlip = 1.02 + (gc_TractionIndex.Value - 1) * 0.005 + (TrackTempEffect - 1) * 3
    TireSlip_init = 1.02 + (env.TractionIndex - 1) * 0.005 + (env.TrackTempEffect - 1) * 3;
  }
  
  // VB6: TIMESLIP.FRM:1020 - Calculate wheel force
  // force = TQ * GearRatio * Efficiency / (TireSlip * TireDia / 24) - DragForce
  const force = TQ * vehicle.GearRatio * vehicle.Efficiency / (TireSlip_init * vehicle.TireDia_in / 24) - DragForce_launch;
  
  // VB6: TIMESLIP.FRM:1022-1027 - Estimate initial acceleration
  // If gc_TransType.Value Then (converter)
  //     Ags0 = 0.96 * force / Weight  '4% misc losses
  // Else (clutch)
  //     Ags0 = 0.88 * force / Weight  '12% misc losses
  const lossFactor = vehicle.isClutch ? 0.88 : 0.96;
  let Ags0_g = lossFactor * force / vehicle.Weight_lbf;
  
  // VB6: TIMESLIP.FRM:1046-1054 - Calculate AMAX and clamp Ags0
  // StaticRWT = DownForce - StaticFWt: If StaticRWT < 0 Then StaticRWT = Weight
  const DownForce_init = vehicle.Weight_lbf;
  let StaticRWT = DownForce_init - vehicle.StaticFWt_lbf;
  if (StaticRWT < 0) StaticRWT = vehicle.Weight_lbf;
  
  // CAXI = (1 - (TractionIndex - 1) * 0.01) / (TrackTempEffect ^ 0.25)
  const CAXI_init = calcCAXI(env.TractionIndex, env.TrackTempEffect);
  const AX_init = calcAX(env.isLandSpeed);
  
  // CRTF = CAXI * AX * TireDia * (TireWidth + 1) * (0.92 + 0.08 * (StaticRWT / 1900) ^ 2.15)
  let CRTF_init = CAXI_init * AX_init * vehicle.TireDia_in * (vehicle.TireWidth_in + 1) * 
                  (0.92 + 0.08 * Math.pow(StaticRWT / 1900, 2.15));
  if (vehicle.BodyStyle === 8) CRTF_init = 0.5 * CRTF_init;
  
  // AMAX = (CRTF - DragForce) / Weight
  const AMax_init = (CRTF_init - DragForce_launch) / vehicle.Weight_lbf;
  
  // VB6: TIMESLIP.FRM:1055-1056 - Clamp Ags0 to AMax/AMin
  // If Ags0 > AMAX Then Ags0 = AMAX: SLIP(L) = 1
  // If Ags0 < AMin Then Ags0 = AMin
  const Ags0_unclamped = Ags0_g;
  if (Ags0_g > AMax_init) Ags0_g = AMax_init;
  if (Ags0_g < AMin) Ags0_g = AMin;
  
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
  
  return {
    L: 1,
    time_s: 0,
    Vel_ftps: 0, // VB6: TIMESLIP.FRM:1003 - Vel(L) = 0
    Dist_ft: 0,
    AGS_g: Ags0_g,
    EngRPM: launchRPM,
    DSRPM: 0,
    Gear: 1,
    SLIP: false,
    
    Vel0_ftps: 0,
    Ags0_g: Ags0_g,
    Dist0_ft: 0,
    DSRPM0: 0,
    
    // VB6: TIMESLIP.FRM:1003 - Initial values before first step
    // RPM0 and Time0 are set DURING the step (lines 1092-1095), not at init
    // Initialize to values that will trigger the first-step special handling
    RPM0: launchRPM,
    Time0_s: 0,
    
    AgsMax_g: Ags0_g,
    TireGrowth: tireResult.TireGrowth,
    TireCirFt: tireResult.TireCirFt,
    
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
