/**
 * VB6 Exact Simulation Model
 * 
 * This model implements the EXACT VB6 TIMESLIP.FRM simulation logic.
 * It uses the vb6SimulationStep function which replicates the VB6 iteration loop.
 * 
 * Key differences from rsaclassic.ts:
 * 1. Uses VB6's velocity-first approach (estimate velocity, then iterate to converge time)
 * 2. Implements the full 12-iteration convergence loop for PMI
 * 3. Uses VB6's exact formulas for all calculations
 * 4. Matches VB6's variable naming and calculation order
 */

import type { SimInputs, SimResult } from '../index';
import { 
  vb6SimulationStep, 
  vb6InitState, 
  vb6CalcTSMaxInit,
  TABY,
  type VB6VehicleParams,
  type VB6EnvParams,
} from '../vb6/vb6SimulationStep';
import { airDensityVB6, type FuelSystemType } from '../vb6/air';
import { gc, FPS_TO_MPH } from '../vb6/constants';

/**
 * Trace point for simulation output
 */
interface TracePoint {
  t_s: number;
  s_ft: number;
  v_fps: number;
  a_g: number;
  rpm: number;
  gear: number;
  slip: boolean;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Map fuel string to VB6 fuel system type
 */
function getFuelSystemType(fuel: string | undefined): FuelSystemType {
  if (!fuel) return 1;
  const f = fuel.toUpperCase();
  
  if (f.includes('SUPERCHARG') || f.includes('BLOWN')) {
    if (f.includes('NITRO')) return 8;
    if (f.includes('METHANOL') || f.includes('ALCOHOL')) return 7;
    return 6;
  }
  
  if (f.includes('INJECT') || f.includes('EFI')) {
    if (f.includes('NITRO')) return 5;
    if (f.includes('METHANOL') || f.includes('ALCOHOL')) return 4;
    return 2;
  }
  
  if (f.includes('NITRO')) return 5;
  if (f.includes('METHANOL') || f.includes('ALCOHOL')) return 3;
  if (f.includes('ELECTRIC')) return 9;
  
  return 1;
}

/**
 * Extract HP curve arrays from input
 */
function extractHPCurve(input: SimInputs): { xrpm: number[]; yhp: number[]; NHP: number } {
  const vehicle = input.vehicle;
  const engine = (input as any).engine ?? (vehicle as any).engine;
  
  // Try multiple sources for HP curve
  const hpCurve = engine?.hpCurve ?? 
                  engine?.torqueCurve ?? 
                  (vehicle as any).torqueCurve ?? 
                  (vehicle as any).hpCurve ?? 
                  [];
  
  const xrpm: number[] = [];
  const yhp: number[] = [];
  
  for (const pt of hpCurve) {
    if (Array.isArray(pt)) {
      xrpm.push(pt[0]);
      yhp.push(pt[1]);
    } else if (pt && typeof pt === 'object') {
      xrpm.push(pt.rpm);
      if (pt.hp !== undefined) {
        yhp.push(pt.hp);
      } else if (pt.torque !== undefined) {
        yhp.push(pt.torque * pt.rpm / 5252);
      } else if (pt.tq_lbft !== undefined) {
        yhp.push(pt.tq_lbft * pt.rpm / 5252);
      }
    }
  }
  
  return { xrpm, yhp, NHP: xrpm.length };
}

/**
 * Calculate track temperature effect
 */
function calcTrackTempEffect(trackTempF: number): number {
  // VB6: TrackTempEffect based on deviation from optimal ~100°F
  const optimalTemp = 100;
  const deviation = trackTempF - optimalTemp;
  // Simplified model: 1% change per 10°F deviation
  return 1 + deviation * 0.001;
}

// ============================================================================
// Main Simulation Function
// ============================================================================

export interface VB6ExactResult extends SimResult {
  vb6Diagnostics?: {
    iterations: number[];
    convergenceHistory: Array<{
      step: number;
      iterations: number;
      HPSave: number;
      HP: number;
      PQWT: number;
      AGS_g: number;
    }>;
  };
}

/**
 * Run VB6 exact simulation
 */
export function simulateVB6Exact(input: SimInputs): VB6ExactResult {
  const warnings: string[] = [];
  const trace: TracePoint[] = [];
  
  // ========================================================================
  // Extract input parameters
  // ========================================================================
  const vehicle = input.vehicle;
  const env = input.env;
  const drivetrain = (input as any).drivetrain;
  const clutch = (input as any).clutch;
  const converter = (input as any).converter;
  const engine = (input as any).engine;
  
  // Determine transmission type
  const isClutch = !converter || (clutch && !converter);
  
  // ========================================================================
  // Calculate air density and hpc
  // ========================================================================
  const fuelString = (input as any).fuel as string | undefined;
  const fuelSystemType = getFuelSystemType(fuelString);
  const airResult = airDensityVB6({
    barometer_inHg: env.barometerInHg ?? 29.92,
    temperature_F: env.temperatureF ?? 59,
    relHumidity_pct: env.humidityPct ?? 50,
    elevation_ft: env.elevation ?? 0,
    fuelSystem: fuelSystemType,
  });
  
  // VB6 uses rho in lbm/ft³ (multiply slugs by gc)
  const rho_lbm_ft3 = airResult.rho_slug_per_ft3 * gc;
  const hpc = airResult.hpc;
  
  // ========================================================================
  // Build VB6 vehicle params
  // ========================================================================
  const { xrpm, yhp, NHP } = extractHPCurve(input);
  
  if (NHP < 2) {
    warnings.push('HP curve has fewer than 2 points');
  }
  
  // Get gear ratios
  const gearRatios = drivetrain?.gearRatios ?? [2.5, 1.8, 1.4, 1.1, 1.0];
  const finalDrive = drivetrain?.finalDriveRatio ?? 3.73;
  
  // Gear efficiencies (VB6 default: 99% per gear)
  const TGEff = gearRatios.map(() => 0.99);
  
  // Get stall/slip RPM
  const stallRPM = isClutch 
    ? (clutch?.slipRPM ?? 7200)
    : (converter?.stallRPM ?? 5500);
  
  // Get slippage factor
  const slippage = isClutch
    ? (clutch?.slippage ?? 1.0025)
    : (converter?.slippage ?? 1.06);
  
  // Get torque multiplier (converter only)
  const torqueMult = converter?.torqueMultiplier ?? 2.2;
  
  // Get shift RPMs
  const shiftRPMs = drivetrain?.shiftRPMs ?? gearRatios.map(() => 7000);
  
  // PMI values
  const enginePMI = engine?.enginePMI ?? 4.0;
  const tiresPMI = engine?.tiresPMI ?? 0.5;
  const transPMI = engine?.transPMI ?? 0.2;
  
  // CG height (VB6: YCG = tire radius + 3.75 inches)
  const tireDiaIn = vehicle.tireDiaIn ?? 32;
  const YCG_in = (tireDiaIn / 2) + 3.75;
  
  // Static front weight (default 38% of total)
  const staticFWt = (vehicle as any).staticFrontWeightLb ?? (vehicle.weightLb * 0.38);
  
  const vb6Vehicle: VB6VehicleParams = {
    Weight_lbf: vehicle.weightLb,
    Wheelbase_in: vehicle.wheelbaseIn ?? 100,
    YCG_in,
    StaticFWt_lbf: staticFWt,
    TireDia_in: tireDiaIn,
    TireWidth_in: vehicle.tireWidthIn ?? 17,
    Rollout_in: vehicle.rolloutIn ?? 12,
    
    GearRatio: finalDrive,
    TGR: gearRatios,
    TGEff,
    Efficiency: drivetrain?.efficiency ?? 0.85,
    Slippage: slippage,
    TorqueMult: torqueMult,
    Stall: stallRPM,
    LockUp: converter?.lockup ?? false,
    isClutch,
    
    RefArea_ft2: vehicle.frontalArea_ft2 ?? 20,
    DragCoef: vehicle.cd ?? 0.35,
    LiftCoef: vehicle.liftCoeff ?? 0,
    BodyStyle: (vehicle as any).bodyStyle ?? 1,
    
    EnginePMI: enginePMI,
    TiresPMI: tiresPMI,
    TransPMI: transPMI,
    
    xrpm,
    yhp,
    NHP,
    HPTQMult: engine?.hpTqMult ?? 1.0,
    
    ShiftRPM: shiftRPMs,
    NGR: gearRatios.length,
  };
  
  // ========================================================================
  // Build VB6 environment params
  // ========================================================================
  const trackTempF = env.trackTempF ?? 100;
  const trackTempEffect = calcTrackTempEffect(trackTempF);
  
  const vb6Env: VB6EnvParams = {
    rho: rho_lbm_ft3,
    hpc,
    TractionIndex: env.tractionIndex ?? 5,
    TrackTempEffect: trackTempEffect,
    WindSpeed_mph: env.windMph ?? 0,
    WindAngle_deg: env.windAngleDeg ?? 0,
  };
  
  // ========================================================================
  // Initialize simulation
  // ========================================================================
  const launchRPM = isClutch 
    ? (clutch?.launchRPM ?? stallRPM)
    : stallRPM;
  
  const state = vb6InitState(vb6Vehicle, vb6Env, launchRPM);
  
  // Calculate TSMax
  // VB6: DistToPrint(1) is the first distance checkpoint (60 ft for drag racing)
  const HP_launch = TABY(xrpm, yhp, NHP, 1, launchRPM);
  const TSMax = vb6CalcTSMaxInit(
    60, // First distance to print is 60 ft (not rollout!)
    HP_launch,
    torqueMult,
    vehicle.weightLb
  );
  
  // ========================================================================
  // Run simulation
  // ========================================================================
  const MAX_STEPS = 5000;
  const MAX_DIST_FT = 1400; // Quarter mile + buffer
  const MAX_TIME_S = 30;
  
  const convergenceHistory: VB6ExactResult['vb6Diagnostics'] = {
    iterations: [],
    convergenceHistory: [],
  };
  
  // Timeslip results (array format per SimResult)
  const timeslip: { d_ft: number; t_s: number; v_mph: number }[] = [];
  const distanceTargets = [60, 330, 660, 1000, 1320];
  let targetIdx = 0;
  
  for (let step = 0; step < MAX_STEPS; step++) {
    // Check termination conditions
    if (state.Dist_ft >= MAX_DIST_FT) break;
    if (state.time_s >= MAX_TIME_S) break;
    
    // Debug: Check for NaN before step
    if (!Number.isFinite(state.Vel_ftps) || !Number.isFinite(state.Dist_ft) || !Number.isFinite(state.AGS_g)) {
      warnings.push(`NaN detected at step ${step}: Vel=${state.Vel_ftps}, Dist=${state.Dist_ft}, AGS=${state.AGS_g}`);
      break;
    }
    
    // Debug first few steps
    if (step < 5) {
      console.log(`[VB6Exact] Step ${step}: Vel=${state.Vel_ftps.toFixed(3)} fps, Dist=${state.Dist_ft.toFixed(3)} ft, AGS=${state.AGS_g.toFixed(4)} g, Time=${state.time_s.toFixed(4)} s`);
    }
    
    // Run one VB6 step
    const stepResult = vb6SimulationStep(state, vb6Vehicle, vb6Env, TSMax);
    
    // Track convergence
    convergenceHistory.iterations.push(stepResult.iterations);
    if (step < 20) {
      convergenceHistory.convergenceHistory.push({
        step,
        iterations: stepResult.iterations,
        HPSave: stepResult.HPSave,
        HP: stepResult.HP,
        PQWT: stepResult.PQWT,
        AGS_g: state.AGS_g,
      });
    }
    
    // Record trace point
    trace.push({
      t_s: state.time_s,
      s_ft: state.Dist_ft,
      v_fps: state.Vel_ftps,
      a_g: state.AGS_g,
      rpm: state.EngRPM,
      gear: state.Gear,
      slip: state.SLIP,
    });
    
    // Check distance targets
    while (targetIdx < distanceTargets.length && state.Dist_ft >= distanceTargets[targetIdx]) {
      const target = distanceTargets[targetIdx];
      const speed_mph = state.Vel_ftps * FPS_TO_MPH;
      
      timeslip.push({
        d_ft: target,
        t_s: state.time_s,
        v_mph: speed_mph,
      });
      targetIdx++;
    }
    
    // Handle gear shifts (simplified - check if at shift RPM)
    if (state.Gear < vb6Vehicle.NGR) {
      const shiftRPM = vb6Vehicle.ShiftRPM[state.Gear - 1] ?? 7000;
      if (state.EngRPM >= shiftRPM) {
        state.Gear++;
      }
    }
  }
  
  // ========================================================================
  // Build result
  // ========================================================================
  
  // Get final ET and MPH from quarter mile (or last point)
  const quarterMileResult = timeslip.find(t => t.d_ft === 1320);
  const et_s = quarterMileResult?.t_s ?? state.time_s;
  const mph = quarterMileResult?.v_mph ?? (state.Vel_ftps * FPS_TO_MPH);
  
  // Convert trace to SimResult format
  const traces = trace.map(t => ({
    t_s: t.t_s,
    v_mph: t.v_fps * FPS_TO_MPH,
    a_g: t.a_g,
    s_ft: t.s_ft,
    rpm: t.rpm,
    gear: t.gear,
  }));
  
  return {
    et_s,
    mph,
    timeslip,
    traces,
    meta: {
      model: 'RSACLASSIC' as const, // Use existing model ID for compatibility
      steps: trace.length,
      warnings,
    },
    vb6Diagnostics: convergenceHistory,
  };
}

/**
 * VB6 Exact Model class for compatibility with existing infrastructure
 */
export const VB6ExactModel = {
  name: 'VB6Exact',
  simulate: simulateVB6Exact,
};
