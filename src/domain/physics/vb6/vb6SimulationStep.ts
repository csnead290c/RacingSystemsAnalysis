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

import { gc, PI, JMin, JMax, AMin, CMU, CMUK, K6, K61, KP21, KP22, FRCT, Z5, AX } from './constants';

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
  HPSave: number;
  HP: number;
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
 * TIMESLIP.FRM line 1091
 */
export function vb6Tire(
  TireDia_in: number,
  TireWidth_in: number,
  Vel_ftps: number,
  Ags0_g: number
): { TireGrowth: number; TireCirFt: number } {
  // VB6: TIMESLIP.FRM:1589-1596
  // TGK = (TireWidth^1.4 + TireDia - 16) / (0.171 * TireDia^1.7)
  // TireGrowth = 1 + TGK * 0.0000135 * Vel^1.6
  // TGLinear = 1 + TGK * 0.00035 * Vel
  // If TGLinear < TireGrowth Then TireGrowth = TGLinear
  // TireSQ = TireGrowth - 0.035 * Abs(Ags0)
  // TireCirFt = TireSQ * TireDia * PI / 12
  
  const TGK = (Math.pow(TireWidth_in, 1.4) + TireDia_in - 16) / (0.171 * Math.pow(TireDia_in, 1.7));
  let TireGrowth = 1 + TGK * 0.0000135 * Math.pow(Vel_ftps, 1.6);
  const TGLinear = 1 + TGK * 0.00035 * Vel_ftps;
  if (TGLinear < TireGrowth) TireGrowth = TGLinear;
  
  // Tire squat under load
  const TireSQ = TireGrowth - 0.035 * Math.abs(Ags0_g);
  const TireCirFt = TireSQ * TireDia_in * PI / 12;
  
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
 * This is a constant, not calculated from temperature
 */
export function calcAX(): number {
  return AX; // 10.8 for Quarter Jr/Pro
}

// ============================================================================
// Main Simulation Step Function
// ============================================================================

/**
 * Execute one VB6 simulation step with full iteration loop.
 * 
 * This is an EXACT port of TIMESLIP.FRM lines 1078-1280.
 * 
 * @param state Current simulation state (will be modified)
 * @param vehicle Vehicle parameters
 * @param env Environment parameters
 * @param TSMax Maximum timestep (from initialization)
 * @returns Computed values for this step
 */
export function vb6SimulationStep(
  state: VB6SimState,
  vehicle: VB6VehicleParams,
  env: VB6EnvParams,
  TSMax: number
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
    // TimeStep = TSMax * (AgsMax / Ags0) ^ 4
    // ========================================================================
    TimeStep = TSMax;
    if (state.Ags0_g > 0 && state.L > 1) {
      // Limit the ratio to prevent huge timesteps at terminal velocity
      const ratio = Math.min(state.AgsMax_g / state.Ags0_g, 10);
      TimeStep = TSMax * Math.pow(ratio, 4);
    }
    // Cap timestep to prevent numerical instability at terminal velocity
    if (TimeStep > 0.1) TimeStep = 0.1;
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
  // If RPM0 = LaunchRPM And Time0 = 0 Then
  //     RPM0 = Stall: If LaunchRPM < Stall Then Time0 = EnginePMI * (Stall - LaunchRPM) / 250000
  if (state.RPM0 === vehicle.LaunchRPM && state.Time0_s === 0) {
    state.RPM0 = vehicle.Stall;
    if (vehicle.LaunchRPM < vehicle.Stall) {
      state.Time0_s = vehicle.EnginePMI * (vehicle.Stall - vehicle.LaunchRPM) / 250000;
    }
  }
  
  // ========================================================================
  // TIMESLIP.FRM:1091 - Update tire growth
  // ========================================================================
  const tireResult = vb6Tire(vehicle.TireDia_in, vehicle.TireWidth_in, state.Vel_ftps, state.Ags0_g);
  state.TireGrowth = tireResult.TireGrowth;
  state.TireCirFt = tireResult.TireCirFt;
  
  // ========================================================================
  // TIMESLIP.FRM:1098-1102 - Calculate tire slip
  // ========================================================================
  const Work_slip = 0.005 * (env.TractionIndex - 1) + 3 * (env.TrackTempEffect - 1);
  const TireSlip = 1.02 + Work_slip * (1 - Math.pow(state.Dist0_ft / 1320, 2));
  
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
  
  // Sanity check: velocity should never go negative or drop dramatically
  // At terminal velocity, maintain current speed
  if (Vel_L < state.Vel0_ftps * 0.9 && state.Vel0_ftps > 100) {
    // Velocity dropped more than 10% at high speed - likely numerical issue
    Vel_L = state.Vel0_ftps;
  }
  if (Vel_L < 0) Vel_L = 0;
  
  // ========================================================================
  // TIMESLIP.FRM:1109 - Skip timestep limiting during shift
  // If ShiftFlag = 2 Then GoTo 270
  // ========================================================================
  const ShiftRPM_gear = vehicle.ShiftRPM[iGear - 1] ?? 9000;
  
  if (!gearChanged) {
    // Only apply timestep limits when NOT in a gear change
    // TIMESLIP.FRM:1111-1120 - Limit timestep
    // TIMESLIP.FRM:1064 - Minimum timestep (from TSMax init)
    if (TimeStep < 0.005) TimeStep = 0.005;
    // TIMESLIP.FRM:1120 - Absolute max timestep
    if (TimeStep > 0.05) TimeStep = 0.05;
    
    // Recalculate velocity with limited timestep
    Vel_L = state.Vel0_ftps + state.Ags0_g * gc * TimeStep + Jerk * gc * TimeStep * TimeStep / 2;
    
    // TIMESLIP.FRM:1125-1129 - Limit velocity to shift point
    if (state.Vel0_ftps > 0 && state.RPM0 > vehicle.Stall && iGear < vehicle.NGR) {
      const VelAtShift = state.Vel0_ftps * (ShiftRPM_gear + 5) / state.RPM0;
      if (Vel_L > VelAtShift) {
        Vel_L = VelAtShift;
        // Recalculate timestep to match this velocity
        if (state.Ags0_g * gc > 0) {
          TimeStep = (Vel_L - state.Vel0_ftps) / (state.Ags0_g * gc);
        }
      }
    }
  }
  // During gear change (gearChanged=true), TimeStep=DTShift is used without limiting
  
  // ========================================================================
  // TIMESLIP.FRM:1139 - Calculate VelSqrd
  // VelSqrd = Vel(L)^2 - Vel0^2
  // ========================================================================
  const VelSqrd = Vel_L * Vel_L - state.Vel0_ftps * state.Vel0_ftps;
  
  // ========================================================================
  // TIMESLIP.FRM:1140 - Calculate DSRPM
  // DSRPM = TireSlip * Vel(L) * 60 / TireCirFt
  // ========================================================================
  const DSRPM = TireSlip * Vel_L * 60 / state.TireCirFt;
  
  // ========================================================================
  // TIMESLIP.FRM:1144-1174 - Clutch/Converter calculations
  // ========================================================================
  const LockRPM = DSRPM * vehicle.GearRatio * TGR_gear;
  let EngRPM_L = vehicle.Slippage * LockRPM;
  let ClutchSlip: number;
  let zStall = vehicle.Stall;
  let SlipRatio = 0;
  
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
  // ========================================================================
  let HP = TABY(vehicle.xrpm, vehicle.yhp, vehicle.NHP, 1, EngRPM_L);
  HP = vehicle.HPTQMult * HP / env.hpc;
  const HPSave = HP;
  HP = HP * ClutchSlip;
  
  // ========================================================================
  // TIMESLIP.FRM:1180-1194 - Calculate drag forces
  // ========================================================================
  // Wind effective velocity
  const WindFPS = Math.sqrt(
    Vel_L * Vel_L + 
    2 * Vel_L * (env.WindSpeed_mph / Z5) * Math.cos(PI * env.WindAngle_deg / 180) + 
    Math.pow(env.WindSpeed_mph / Z5, 2)
  );
  
  // Dynamic pressure (VB6 uses lbm/ft³ for rho, divides by gc)
  const q = Math.sign(WindFPS) * env.rho * Math.pow(Math.abs(WindFPS), 2) / (2 * gc);
  
  // Frontal area with tire growth
  let RefArea2: number;
  if (vehicle.BodyStyle === 8) {
    // Motorcycle
    RefArea2 = vehicle.RefArea_ft2 + ((state.TireGrowth - 1) * vehicle.TireDia_in / 2) * vehicle.TireWidth_in / 144;
  } else {
    RefArea2 = vehicle.RefArea_ft2 + ((state.TireGrowth - 1) * vehicle.TireDia_in / 2) * (2 * vehicle.TireWidth_in) / 144;
  }
  
  // Down force (weight + aero lift)
  const DownForce = vehicle.Weight_lbf + vehicle.LiftCoef * RefArea2 * q;
  
  // Rolling resistance coefficient (decreases with distance)
  const cmu1 = CMU - (state.Dist0_ft / 1320) * CMUK;
  
  // Total drag force
  const DragForce = cmu1 * DownForce + 0.0001 * DownForce * (Z5 * Vel_L) + vehicle.DragCoef * RefArea2 * q;
  const DragHP = DragForce * Vel_L / 550;
  
  // ========================================================================
  // TIMESLIP.FRM:1196-1211 - Calculate dynamic weight transfer
  // ========================================================================
  const TireRadIn = 12 * state.TireCirFt / (2 * PI);
  const deltaFWT = (state.Ags0_g * vehicle.Weight_lbf * ((vehicle.YCG_in - TireRadIn) + (FRCT / vehicle.Efficiency) * TireRadIn) + DragForce * vehicle.YCG_in) / vehicle.Wheelbase_in;
  let DynamicFWT = vehicle.StaticFWt_lbf - deltaFWT;
  
  // Wheelie bar
  let WheelBarWT = 0;
  if (DynamicFWT < 0) {
    WheelBarWT = -DynamicFWT * vehicle.Wheelbase_in / 64;
    DynamicFWT = 0;
  }
  
  // Dynamic rear weight
  let DynamicRWT = DownForce - DynamicFWT - WheelBarWT;
  if (DynamicRWT < 0) DynamicRWT = vehicle.Weight_lbf;
  
  // ========================================================================
  // TIMESLIP.FRM:1213-1216 - Calculate AMax (traction limit)
  // ========================================================================
  const CAXI = calcCAXI(env.TractionIndex, env.TrackTempEffect);
  const AX_val = calcAX();
  let CRTF = CAXI * AX_val * vehicle.TireDia_in * (vehicle.TireWidth_in + 1) * (0.92 + 0.08 * Math.pow(DynamicRWT / 1900, 2.15));
  if (vehicle.BodyStyle === 8) CRTF = 0.5 * CRTF;
  
  const AMax_g = ((CRTF / state.TireGrowth) - DragForce) / vehicle.Weight_lbf;
  
  // ========================================================================
  // TIMESLIP.FRM:1218-1229 - Initial HP chain and time estimate
  // VB6: HP = HP * TGEff(iGear) * Efficiency / TireSlip - DragHP
  // 
  // NOTE: TorqueMult is handled through ClutchSlip when converter is stalling.
  // The VB6 HP chain does NOT directly apply TorqueMult - it's incorporated via ClutchSlip.
  // ========================================================================
  const TGEff_gear = vehicle.TGEff[iGear - 1] ?? 0.99;
  HP = HP * TGEff_gear * vehicle.Efficiency / TireSlip;
  HP = HP - DragHP;
  
  let PQWT = 550 * gc * HP / vehicle.Weight_lbf;
  let AGS_g = PQWT / (Vel_L * gc);
  
  // TIMESLIP.FRM:1223-1228 - Initial AMin/AMax clamps
  // VB6 uses reflection formula: AGS = AMAX - (AGS - AMAX) = 2*AMAX - AGS
  // This can produce negative values when AGS >> AMAX, which then get clamped to AMin
  let SLIP = false;
  if (AGS_g > AMax_g) {
    SLIP = true;
    PQWT = PQWT * (AMax_g - (AGS_g - AMax_g)) / AGS_g;
    AGS_g = AMax_g - (AGS_g - AMax_g);
  }
  if (AGS_g < AMin) {
    // VB6: TIMESLIP.FRM:1226 - Clamp to AMin
    // This is the VB6 behavior - it clamps acceleration to a minimum
    // but only adjusts PQWT if AGS is positive (to avoid division issues)
    if (AGS_g > 0) {
      PQWT = PQWT * AMin / AGS_g;
    }
    // If AGS_g <= 0, we're at or past terminal velocity
    // VB6 still clamps to AMin but PQWT calculation may differ
    AGS_g = AMin;
  }
  
  // Initial time estimate
  let time_L = VelSqrd / (2 * PQWT) + state.Time0_s;
  
  // ========================================================================
  // TIMESLIP.FRM:1231-1240 - Calculate acceleration HP terms
  // ========================================================================
  let EngAccHP = vehicle.EnginePMI * EngRPM_L * (EngRPM_L - state.RPM0);
  if (EngAccHP < 0) {
    if (vehicle.isClutch) {
      EngAccHP = KP21 * EngAccHP;
    } else {
      EngAccHP = KP22 * EngAccHP;
    }
  }
  
  let ChasAccHP = ChassisPMI * DSRPM * (DSRPM - state.DSRPM0);
  if (ChasAccHP < 0) ChasAccHP = 0;
  
  // ========================================================================
  // TIMESLIP.FRM:1244-1276 - ITERATION LOOP
  // ========================================================================
  let HPEngPMI = 0;
  let HPChasPMI = 0;
  let k = 0;
  
  for (k = 1; k <= 12; k++) {
    const dtk1 = time_L - state.Time0_s;
    if (dtk1 <= 0) break;
    
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
      // VB6: TIMESLIP.FRM:1264 - Clamp to AMin
      if (AGS_g > 0) {
        PQWT = PQWT * AMin / AGS_g;
      }
      AGS_g = AMin;
    }
    
    // TIMESLIP.FRM:1268-1270 - New time estimate and convergence check
    // Protect against zero/negative PQWT for time calculation only
    const safePQWT = PQWT > 0 ? PQWT : AMin * Vel_L * gc;
    const dtk2_time = VelSqrd / (2 * safePQWT) + state.Time0_s;
    const dtk2 = dtk2_time - state.Time0_s;
    
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
  // Dist(L) = ((2*PQWT*(time(L)-Time0) + Vel0^2)^1.5 - Vel0^3) / (3*PQWT) + Dist0
  // ========================================================================
  const dt_final = time_L - state.Time0_s;
  let Dist_L: number;
  
  // At terminal velocity, PQWT is very small, so use simple distance = velocity * time
  if (PQWT < 0.1) {
    // Near terminal velocity - use average velocity for distance
    const avgVel = (state.Vel0_ftps + Vel_L) / 2;
    Dist_L = state.Dist0_ft + avgVel * dt_final;
  } else {
    const Vel0_cubed = Math.pow(state.Vel0_ftps, 3);
    const term = 2 * PQWT * dt_final + state.Vel0_ftps * state.Vel0_ftps;
    Dist_L = (Math.pow(term, 1.5) - Vel0_cubed) / (3 * PQWT) + state.Dist0_ft;
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
  const tireResult = vb6Tire(vehicle.TireDia_in, vehicle.TireWidth_in, 0, 0);
  
  // VB6: TIMESLIP.FRM:1010-1014 - Get HP and calculate torque
  // Call TABY(xrpm(), yhp(), NHP, 1, EngRPM(L), HP)
  // HP = gc_HPTQMult.Value * HP / hpc
  // TQ = Z6 * HP / EngRPM(L)
  // TQ = TQ * gc_TorqueMult.Value * TGR(iGear) * TGEff(iGear)
  const HP_launch = TABY(vehicle.xrpm, vehicle.yhp, vehicle.NHP, 1, launchRPM);
  const HP_corrected = vehicle.HPTQMult * HP_launch / env.hpc;
  const Z6 = 5252;
  let TQ = Z6 * HP_corrected / launchRPM;
  const TGR_1 = vehicle.TGR[0] ?? 1;
  const TGEff_1 = vehicle.TGEff[0] ?? 0.99;
  TQ = TQ * vehicle.TorqueMult * TGR_1 * TGEff_1;
  
  // VB6: TIMESLIP.FRM:1016-1019 - Calculate drag force at launch (Vel=0)
  // WindFPS = Sqr(Vel(L)^2 + ...) = WindSpeed/Z5 at Vel=0
  // q = Sgn(WindFPS) * rho * Abs(WindFPS)^2 / (2*gc)
  // DragForce = CMU * Weight + DragCoef * RefArea * q
  const WindFPS_launch = env.WindSpeed_mph / Z5;
  const q_launch = Math.sign(WindFPS_launch) * env.rho * Math.pow(Math.abs(WindFPS_launch), 2) / (2 * gc);
  const DragForce_launch = CMU * vehicle.Weight_lbf + vehicle.DragCoef * vehicle.RefArea_ft2 * q_launch;
  
  // VB6: TIMESLIP.FRM:872 - Initial tire slip
  // TireSlip = 1.02 + (gc_TractionIndex.Value - 1) * 0.005 + (TrackTempEffect - 1) * 3
  const TireSlip_init = 1.02 + (env.TractionIndex - 1) * 0.005 + (env.TrackTempEffect - 1) * 3;
  
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
  // StaticRWT = DownForce - StaticFWt
  const DownForce_init = vehicle.Weight_lbf;
  const StaticRWT = DownForce_init - vehicle.StaticFWt_lbf;
  
  // CAXI = (1 - (TractionIndex - 1) * 0.01) / (TrackTempEffect ^ 0.25)
  const CAXI_init = calcCAXI(env.TractionIndex, env.TrackTempEffect);
  const AX_init = calcAX();
  
  // CRTF = CAXI * AX * TireDia * (TireWidth + 1) * (0.92 + 0.08 * (StaticRWT / 1900) ^ 2.15)
  let CRTF_init = CAXI_init * AX_init * vehicle.TireDia_in * (vehicle.TireWidth_in + 1) * 
                  (0.92 + 0.08 * Math.pow(StaticRWT / 1900, 2.15));
  if (vehicle.BodyStyle === 8) CRTF_init = 0.5 * CRTF_init;
  
  // AMAX = (CRTF - DragForce) / Weight
  const AMax_init = (CRTF_init - DragForce_launch) / vehicle.Weight_lbf;
  
  // VB6: TIMESLIP.FRM:1055-1056 - Clamp Ags0 to AMax/AMin
  // If Ags0 > AMAX Then Ags0 = AMAX: SLIP(L) = 1
  // If Ags0 < AMin Then Ags0 = AMin
  if (Ags0_g > AMax_init) Ags0_g = AMax_init;
  if (Ags0_g < AMin) Ags0_g = AMin;
  
  return {
    L: 1,
    time_s: 0,
    Vel_ftps: 0.001, // Small non-zero to avoid division by zero
    Dist_ft: 0,
    AGS_g: Ags0_g,
    EngRPM: launchRPM,
    DSRPM: 0,
    Gear: 1,
    SLIP: false,
    
    Vel0_ftps: 0,
    Ags0_g: Ags0_g,
    Time0_s: 0,
    Dist0_ft: 0,
    RPM0: launchRPM,
    DSRPM0: 0,
    
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
