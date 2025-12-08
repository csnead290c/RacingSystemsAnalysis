/**
 * RSACLASSIC physics model implementation.
 * Fixed-step forward integration with traction cap, shifts, and timeslip outputs.
 */

import type { PhysicsModel, PhysicsModelId, SimInputs, SimResult } from '../index';
import { wheelTorque_lbft, power_hp_atRPM } from '../engine/engine';
import { rpmFromSpeed } from '../drivetrain/drivetrain';
// import { drag_lb } from '../aero/drag'; // Replaced with direct calculation
// import { rolling_lb } from '../aero/rolling'; // Replaced with direct calculation
// import { maxTractive_lb, type TireParams } from '../tire/traction'; // Replaced with VB6 traction
import { createInitialState } from '../core/integrator';
import { lbToSlug } from '../core/units';
import { g, FPS_TO_MPH, CMU, gc, AMin, JMin, JMax } from '../vb6/constants';
import { computeAgs0 } from '../vb6/bootstrap';
// import { hpToTorqueLbFt } from '../vb6/convert'; // No longer needed - using hpPts directly
import { airDensityVB6, type FuelSystemType } from '../vb6/air';
import { vb6RollingResistanceTorque } from '../vb6/forces';
import { vb6DirectDrive, vb6ConverterCoupling } from '../vb6/driveline';
import { computeAMaxVB6, computeAMinVB6, computeCAXI, clampAGSVB6, computeCRTF } from '../vb6/traction';
import { hpEngPMI, hpChasPMI, computeChassisPMI, computeDSRPM } from '../vb6/pmi';
import { computeTireGrowth, computeRefAreaWithTireGrowth } from '../vb6/tire';
import { shouldShift, shouldShift_f32, updateShiftState, ShiftState, vb6ShiftDwell_s } from '../vb6/shift';
import { tireSlipFactor } from '../vb6/tireslip';
import { vb6RearWeightDynamic } from '../vb6/weight_transfer';
import { 
  vb6StepDistance, 
  vb6ApplyAccelClamp, 
  vb6AGSFromPQWT,
  vb6AdaptiveTimestep,
  vb6CalcTSMax
} from '../vb6/integrator';
// VB6-STRICT: Float32 math helpers for exact parity
import { F, f32, vb6Round, tableLookupF32 } from '../vb6/exactMath';

// === Engine params normalization (resolve once) ===
type PowerPt = { rpm: number; hp: number };

/**
 * Map fuel string to VB6 fuel system type.
 * VB6 gc_FuelSystem.Value: 1-9
 */
function getFuelSystemType(fuel: string | undefined): FuelSystemType {
  if (!fuel) return 1; // Default: Gas + Carb
  
  const f = fuel.toUpperCase();
  
  // Check for supercharger first
  if (f.includes('SUPERCHARG') || f.includes('BLOWN')) {
    if (f.includes('NITRO')) return 8;      // Nitro + Supercharger
    if (f.includes('METHANOL') || f.includes('ALCOHOL')) return 7; // Methanol + Supercharger
    return 6; // Gas + Supercharger
  }
  
  // Check for injector
  if (f.includes('INJECT') || f.includes('EFI') || f.includes('FUEL INJECT')) {
    if (f.includes('NITRO')) return 5;      // Nitro + Injector
    if (f.includes('METHANOL') || f.includes('ALCOHOL')) return 4; // Methanol + Injector
    return 2; // Gas + Injector
  }
  
  // Carbureted (default)
  if (f.includes('NITRO')) return 5;        // Nitro + Injector (nitro usually injected)
  if (f.includes('METHANOL') || f.includes('ALCOHOL')) return 3; // Methanol + Carb
  
  // Electric
  if (f.includes('ELECTRIC')) return 9;
  
  return 1; // Gas + Carb (default)
}

/**
 * Convert torque curve point to HP.
 * If point has hp, use it directly. If point has torque, compute hp = torque * rpm / 5252.
 */
function torquePtToHP(pt: any, mult: number): PowerPt | null {
  const rpm = Number(pt?.rpm);
  if (!Number.isFinite(rpm)) return null;
  
  // If hp is present, use it directly
  if (Number.isFinite(pt?.hp)) {
    return { rpm, hp: Number(pt.hp) * mult };
  }
  // If torque is present, convert: hp = torque * rpm / 5252
  if (Number.isFinite(pt?.torque)) {
    const hp = (Number(pt.torque) * rpm / 5252) * mult;
    return { rpm, hp };
  }
  // Also check tq_lbft alias
  if (Number.isFinite(pt?.tq_lbft)) {
    const hp = (Number(pt.tq_lbft) * rpm / 5252) * mult;
    return { rpm, hp };
  }
  return null;
}

function asPowerPtsFromTuple(arr: any[], mult = 1): PowerPt[] {
  return arr
    .map((pt) => {
      if (Array.isArray(pt)) {
        // [rpm, hp] tuple format
        return { rpm: Number(pt[0]), hp: Number(pt[1]) * mult };
      }
      // Object format - try hp first, then torque conversion
      return torquePtToHP(pt, mult);
    })
    .filter((p): p is PowerPt => p !== null && Number.isFinite(p.rpm) && Number.isFinite(p.hp))
    .sort((a, b) => a.rpm - b.rpm);
}

function resolveEngineParams(input: any): { powerHP: PowerPt[] } {
  // Fuel multiplier applies to all sources
  const mult = input?.fuel?.hpTorqueMultiplier ?? 1;
  
  // Track what we found for error message
  const sources: string[] = [];
  
  // 1) Already normalized in engineParams.powerHP?
  const hpA = input?.engineParams?.powerHP;
  if (Array.isArray(hpA)) {
    sources.push(`engineParams.powerHP(${hpA.length})`);
    if (hpA.length >= 2) {
      const powerHP = asPowerPtsFromTuple(hpA, mult);
      if (powerHP.length >= 2) return { powerHP };
    }
  }
  
  // 2) VB6 tuple/object source (engineHP)?
  const vb6 = input?.engineHP;
  if (Array.isArray(vb6)) {
    sources.push(`engineHP(${vb6.length})`);
    if (vb6.length >= 2) {
      const powerHP = asPowerPtsFromTuple(vb6, mult);
      if (powerHP.length >= 2) return { powerHP };
    }
  }
  
  // 3) engineParams.torqueCurve (hp or torque points)?
  const epTc = input?.engineParams?.torqueCurve;
  if (Array.isArray(epTc)) {
    sources.push(`engineParams.torqueCurve(${epTc.length})`);
    if (epTc.length >= 2) {
      const powerHP = asPowerPtsFromTuple(epTc, mult);
      if (powerHP.length >= 2) return { powerHP };
    }
  }
  
  // 4) vehicle.torqueCurve (hp or torque points)?
  const tc = input?.vehicle?.torqueCurve;
  if (Array.isArray(tc)) {
    sources.push(`vehicle.torqueCurve(${tc.length})`);
    if (tc.length >= 2) {
      const powerHP = asPowerPtsFromTuple(tc, mult);
      if (powerHP.length >= 2) return { powerHP };
    }
  }
  
  // Fail with context showing all sources found
  throw new Error(
    `RSACLASSIC: missing power curve. Sources found: [${sources.join(', ') || 'none'}]. ` +
    `Keys(engineParams)=${JSON.stringify(Object.keys(input?.engineParams || {}))} ` +
    `Keys(vehicle)=${JSON.stringify(Object.keys(input?.vehicle || {}))}`
  );
}

/**
 * Guard against NaN: return fallback if x is not finite.
 */
function finite(x: any, fallback = 0): number {
  return Number.isFinite(x) ? Number(x) : fallback;
}

/**
 * VB6-STRICT HP interpolation using Float32.
 * Converts PowerPt[] to [rpm, hp][] table and uses tableLookupF32.
 */
function hpAtRPM_f32(rpm: number, hpPts: PowerPt[]): number {
  const table: [number, number][] = hpPts.map(p => [p.rpm, p.hp]);
  return tableLookupF32(rpm, table);
}

/**
 * VB6-STRICT wheel torque using Float32.
 * torque = hp * 5252 / rpm, then apply gear efficiency
 */
function wheelTorque_f32(rpm: number, hpPts: PowerPt[], gearEff: number): number {
  const hp = hpAtRPM_f32(rpm, hpPts);
  if (rpm <= 0) return f32(0);
  // VB6: TQ = Z6 * HP / EngRPM where Z6 = 5252
  const tq = F.div(F.mul(f32(5252), hp), f32(rpm));
  return F.mul(tq, f32(gearEff));
}

/**
 * Clamp value to range [lo, hi], return fallback if not finite.
 */
function clampFinite(x: any, lo: number, hi: number, fallback = lo): number {
  const v = Number(x);
  if (!Number.isFinite(v)) return fallback;
  return Math.min(hi, Math.max(lo, v));
}

/**
 * Clamp efficiency to valid range [0.85, 1.0].
 */
function clamp01(x: number): number {
  return Math.max(0.85, Math.min(1.0, x));
}

/**
 * Optional tuning parameters for parity adjustment.
 */
type Tuning = {
  aeroCdScale?: number;         // multiplies effective Cd (default 1)
  drivelineEffOffset?: number;  // additive to overallEff before clamping [0.85, 1.0]
};

/**
 * RSACLASSIC physics model.
 * Advanced physics simulation for Quarter Jr/Pro parity.
 */
class RSACLASSICModel implements PhysicsModel {
  id: PhysicsModelId = 'RSACLASSIC';

  simulate(input: SimInputs): SimResult {
    // === VB6-STRICT MODE ===
    // When enabled, use Float32 precision and VB6-identical math path
    // for bit-for-bit parity with Quarter Pro VB6 outputs
    const STRICT = !!((input as any)?.flags?.vb6Strict);
    if (STRICT) {
      console.log('[RSACLASSIC] VB6-STRICT mode enabled - using Float32 math');
    }
    
    // --- watchdogs & helpers (DEV safety) ---
    const WATCH_START_MS = Date.now();
    const WATCH_WALL_MS  = 90_000;         // 90s wall limit
    const WATCH_STEP_CAP = 2_000_000;      // absolute step cap
    const WATCH_HEARTBEAT = 50_000;        // log heartbeat
    let watchLastDist = 0;

    function watchdog(step: number, dist_ft: number) {
      const now = Date.now();
      if ((now - WATCH_START_MS) > WATCH_WALL_MS) throw new Error('simulation wall-time exceeded');
      if (step >= WATCH_STEP_CAP) throw new Error('simulation step cap hit');
      if (step % WATCH_HEARTBEAT === 0) {
        const gained = dist_ft - watchLastDist;
        console.log('[RSACLASSIC] heartbeat', { step, dist_ft, gained_ft: gained });
        if (step > 0 && gained < 1e-3) throw new Error('simulation stalled');
        watchLastDist = dist_ft;
      }
    }

    const raceLenFt = Number((input as any)?.raceLengthFt ?? 1320);
    if (!Number.isFinite(raceLenFt) || raceLenFt <= 0) {
      throw new Error(`invalid raceLengthFt: ${(input as any)?.raceLengthFt}`);
    }
    const dt = Number((input as any)?.timeStep ?? 0.002);
    if (!Number.isFinite(dt) || dt <= 0) {
      throw new Error(`invalid timeStep ${dt}`);
    }
    
    // Resolve once and reuse
    const engineResolved = resolveEngineParams(input);
    const hpPts: PowerPt[] = engineResolved.powerHP;
    console.log('[RSACLASSIC] start', { raceLenFt, hpPts: hpPts.length });

    // Guard: minimum 2 points
    if (!Array.isArray(hpPts) || hpPts.length < 2) {
      throw new Error(`RSACLASSIC: powerHP invalid (len=${hpPts?.length ?? 0})`);
    }
    
    // === Drivetrain: resolve clutch / converter once ===
    // Tolerate multiple locations: drivetrain.clutch, input.clutch, vehicle.clutch
    const drivetrain = (input as any)?.drivetrain ?? {};
    const vehicleBlock = (input as any)?.vehicle ?? {};
    const clutch = drivetrain.clutch ?? (input as any)?.clutch ?? vehicleBlock.clutch;
    const converter = drivetrain.converter ?? (input as any)?.converter ?? vehicleBlock.converter;

    const isClutch = !!clutch;
    const isConverter = !!converter;

    // Pull slip/launch/stall RPMs with tolerant casing
    const slipRPM = isClutch ? Number((clutch as any).slipRPM ?? (clutch as any).slipRpm) : NaN;
    const launchRPM = isClutch ? Number((clutch as any).launchRPM ?? (clutch as any).launchRpm) : NaN;
    const stallRPM = isConverter ? Number((converter as any).stallRPM ?? (converter as any).stallRpm) : NaN;
    
    // VB6 slippage factor (gc_Slippage.Value) - multiplier for LockRPM to get EngRPM
    // Clutch default: 1.0025, Converter default: 1.05
    const clutchSlippage = isClutch 
      ? Number((clutch as any).slippageFactor ?? (clutch as any).slipRatio ?? 1.0025) 
      : 1.0;
    const converterSlippage = isConverter 
      ? Number((converter as any).slippageFactor ?? (converter as any).slipRatio ?? 1.05) 
      : 1.0;

    // Validate: one and only one device must be present
    if (!isClutch && !isConverter) {
      throw new Error('RSACLASSIC: drivetrain must specify clutch or converter');
    }
    if (isClutch && !Number.isFinite(slipRPM)) {
      throw new Error('RSACLASSIC: clutch.slipRPM missing/invalid');
    }
    if (isConverter && !Number.isFinite(stallRPM)) {
      throw new Error('RSACLASSIC: converter.stallRPM missing/invalid');
    }

    // Canonical launch/lock RPM to use in bootstrap
    const rpmPin = isClutch ? (Number.isFinite(launchRPM) ? launchRPM : slipRPM)
                            : stallRPM;

    // Debug
    console.log('[RPM-RESOLVED]', {
      isClutch, isConverter, slipRPM, launchRPM, stallRPM, rpmPin
    });
    
    // === Optional tuning parameters ===
    const tuning: Tuning = (input as any)?.tuning ?? {};
    const cdScale = Number.isFinite(tuning.aeroCdScale) ? tuning.aeroCdScale! : 1;
    const effOffset = Number.isFinite(tuning.drivelineEffOffset) ? tuning.drivelineEffOffset! : 0;
    
    const { vehicle, env, raceLength } = input;
    
    // Initialize warnings array early
    const warnings: string[] = [];
    
    // Determine finish distance
    const finishDistance_ft = raceLength === 'EIGHTH' ? 660 : 1320;
    
    // Resolve parameters (VB6 parity mode: NO DEFAULTS for critical parameters)
    const cd = vehicle.cd;
    const frontalArea_ft2 = vehicle.frontalArea_ft2;
    const transEff = vehicle.transEff;
    const finalDrive = vehicle.finalDrive ?? vehicle.rearGear;
    const gearRatios = vehicle.gearRatios;
    const gearEff = vehicle.gearEff; // Per-gear efficiency, optional
    const shiftRPM = vehicle.shiftRPM;
    
    // Validate required vehicle parameters
    if (!cd) {
      warnings.push('Missing vehicle.cd (drag coefficient) - required for VB6 parity');
    }
    if (!frontalArea_ft2) {
      warnings.push('Missing vehicle.frontalArea_ft2 - required for VB6 parity');
    }
    if (!gearRatios || gearRatios.length === 0) {
      warnings.push('Missing vehicle.gearRatios[] - required for VB6 parity');
    }
    if (!shiftRPM || shiftRPM.length === 0) {
      warnings.push('Missing vehicle.shiftRPM[] - required for VB6 parity');
    }
    if (!finalDrive) {
      warnings.push('Missing vehicle.finalDrive or vehicle.rearGear - required for VB6 parity');
    }
    
    // Validate required environment parameters
    if (env.barometerInHg === undefined) {
      warnings.push('Missing env.barometerInHg - required for VB6 air density');
    }
    if (env.temperatureF === undefined) {
      warnings.push('Missing env.temperatureF - required for VB6 air density');
    }
    if (env.humidityPct === undefined) {
      warnings.push('Missing env.humidityPct - required for VB6 air density');
    }
    if (env.elevation === undefined) {
      warnings.push('Missing env.elevation - required for VB6 air density');
    }
    
    // --- Tire geometry normalization (single source of truth) ---
    // VB6 uses either tire diameter or rollout (circumference)
    // TIMESLIP.FRM:683-687, 1036, 1197
    const tireRolloutIn = vehicle.tireRolloutIn ?? null;
    const tireDiaInRaw = vehicle.tireDiaIn ?? null;
    
    // If rollout is present, derive diameter from circumference.
    // Diameter = Rollout / π
    const PI = Math.PI;
    const tireDiaFromRollout =
      (typeof tireRolloutIn === 'number' && tireRolloutIn > 0)
        ? (tireRolloutIn / PI)
        : null;
    
    // Use rollout-derived diameter if available, otherwise use raw diameter
    let tireDiaIn = (tireDiaFromRollout ?? tireDiaInRaw) ?? 0;
    if (!tireDiaIn || tireDiaIn <= 0) {
      warnings.push('Tire diameter is undefined/invalid. Provide tireRolloutIn or tireDiaIn.');
      tireDiaIn = 28; // Emergency fallback (inches)
    }
    
    // Static tire radius (will be replaced by effective radius with growth in loop)
    // const tireRadius_ft = (tireDiaIn / 12) / 2;
    
    const rolloutIn = vehicle.rolloutIn;
    if (!rolloutIn) {
      warnings.push('Missing vehicle.rolloutIn - required for VB6 parity');
    }
    
    // Precompute atmospheric conditions
    // VB6 exact air density and HP correction (constant for entire run)
    // Determine fuel system type from fuel string (use input directly since fuel var defined later)
    const fuelString = (input as any).fuel as string | undefined;
    const fuelSystemType = getFuelSystemType(fuelString);
    const airResult = airDensityVB6({
      barometer_inHg: env.barometerInHg ?? 29.92,
      temperature_F: env.temperatureF ?? 59,
      relHumidity_pct: env.humidityPct ?? 50,
      elevation_ft: env.elevation ?? 0, // Note: env uses 'elevation' not 'elevationFt'
      fuelSystem: fuelSystemType,
    });
    const rho_slug_ft3 = airResult.rho_slug_per_ft3;
    // hpc is available but not applied - see note in HP chain section
    void airResult.hpc;
    
    // Precompute mass
    const mass_slugs = lbToSlug(vehicle.weightLb);
    
    // Rollout distance
    const rolloutFt = (rolloutIn ?? 12) / 12;
    
    // Note: drivetrain, clutch, converter already resolved at top of function
    // Note: hpPts is now used directly in wheelTorque_lbft calls
    
    // Tire parameters (replaced with VB6 traction)
    // const tireParams: TireParams = {
    //   weightLb: vehicle.weightLb,
    //   tireWidthIn: vehicle.tireWidthIn,
    //   tractionIndex: env.tractionIndex,
    // };
    
    // Termination tracking
    type TerminationReason = 'DISTANCE' | 'TIME_CAP' | 'STEP_CAP' | 'SAFETY';
    let terminationReason: TerminationReason | null = null;
    let stepCount = 0;
    
    // Integration parameters
    // VB6 uses adaptive timestep (TIMESLIP.FRM:1082): TimeStep = TSMax * (AgsMax / Ags0)^4
    // Min: 0.005s (TIMESLIP.FRM:1064), Max: 0.05s (TIMESLIP.FRM:1120)
    const MAX_TIME_S = 30; // Generous cap to avoid false stops while diagnosing
    const traceInterval_s = 0.01; // Collect traces every 10ms
    
    // VB6 adaptive timestep parameters (TIMESLIP.FRM:1063-1064, 1082)
    // Get peak HP for TSMax calculation
    const peakHP = hpPts.reduce((max, pt) => Math.max(max, pt.hp), 0);
    const torqueMult = converter ? ((converter as any).torqueMult ?? 1.7) : 1.0;
    const rollout_ft = (vehicle.rolloutIn ?? 12) / 12; // Convert inches to feet
    const TSMax = vb6CalcTSMax(rollout_ft > 0 ? rollout_ft : 1, peakHP, torqueMult, vehicle.weightLb);
    let AgsMax_g = 0; // Track maximum acceleration seen (in g's)
    let dt_s = TSMax; // Start with TSMax, will adapt
    
    // Initialize state
    let state = createInitialState();
    let nextTraceTime = 0;
    
    // Storage for traces and timeslip
    const traces: Array<{
      t_s: number;
      v_mph: number;
      a_g: number;
      s_ft: number;
      rpm: number;
      gear: number;
      hp?: number;      // Wheel HP (after all losses)
      engineHp?: number; // Engine HP (before losses)
      dragHp?: number;   // Drag HP loss
    }> = [];
    
    // Track HP values for trace collection
    let lastHPSave = 0;      // Engine HP
    let lastHP_wheel = 0;    // Wheel HP (after losses)
    let lastDragHP = 0;      // Drag HP
    
    const timeslip: Array<{ d_ft: number; t_s: number; v_mph: number }> = [];
    
    // VB6 rollout and timing (TIMESLIP.FRM:815-817, 1380)
    // DistToPrint(1) = gc_Rollout.Value / 12
    // If gc_Rollout.Value > 0 Then time(L) = 0  (reset clock at rollout)
    let rolloutCompleted = false;
    let t_at_rollout = 0;
    
    // VB6 timeslip points (TIMESLIP.FRM:816-817)
    // DistToPrint(2) = 30, (3) = 60, (4) = 330, (5) = 594, (6) = 660, (7) = 1000, (8) = 1254, (9) = 1320
    const timeslipPoints = [60, 330, 660, 1000, finishDistance_ft];
    let nextTimeslipIdx = 0;
    
    // VB6 trap speed windows (TIMESLIP.FRM:1619-1627)
    // Eighth:  594-660 ft (66 ft window)
    // Quarter: 1254-1320 ft (66 ft window)
    // TIMESLIP(4) = Z5 * 66 / (TIMESLIP(3) - SaveTime)  [time-averaged speed]
    let t_at_594 = 0;
    let t_at_1254 = 0;
    
    // Previous state for acceleration calculation
    let prevV_fps = 0;
    
    // Converter tracking (converter already resolved at top)
    let sumTR = 0;
    let sumETA = 0;
    let sumSR = 0;
    let converterSteps = 0;
    
    // Clutch tracking (clutch already resolved at top)
    let minC = 1.0;
    let lockupAt_ft: number | undefined = undefined;
    
    // VB6 launch conditions (TIMESLIP.FRM:1006)
    // VB6: EngRPM(L) = gc_LaunchRPM.Value
    // Initialize engine RPM to launch RPM before first timestep (use resolved rpmPin)
    state.rpm = rpmPin;
    
    // Fuel tracking
    const fuel = (input as any).fuel as 'GAS' | 'METHANOL' | 'NITRO' | undefined;
    let minFuelScale = 1.0;
    let maxFuelScale = 1.0;
    
    // Energy accounting (DEV only - for debugging VB6 parity)
    let E_engine_total = 0;      // Total energy from engine (ft-lb)
    let E_drag_total = 0;         // Total energy lost to aero drag (ft-lb)
    let E_rr_total = 0;           // Total energy lost to rolling resistance (ft-lb)
    let E_driveline_loss = 0;     // Total driveline losses (ft-lb)
    let E_pmi_engine = 0;         // Total energy lost to engine PMI (ft-lb)
    let E_pmi_chassis = 0;        // Total energy lost to chassis PMI (ft-lb)
    let E_kinetic_trans = 0;      // Final translational kinetic energy (ft-lb)
    let E_kinetic_rot = 0;        // Final rotational kinetic energy (ft-lb) - if VB6 used it
    
    // VB6 integration state (TIMESLIP.FRM:1090)
    // Ags0 = previous acceleration (ft/s²), used for velocity integration
    // 
    // VB6 calculates initial Ags0 from TORQUE-based force (TIMESLIP.FRM:1020-1027)
    
    // Track AGS in g's for weight transfer calculation
    let prevAGS_g_stored = 0;
    // This provides initial acceleration without relying on ClutchSlip
    let Ags0 = 0;
    
    // Calculate initial Ags0 at t=0 (VB6: TIMESLIP.FRM:1010-1027)
    if (clutch || converter) {
      // Use resolved rpmPin for launch
      // Get HP at launch RPM
      const launchTorque = wheelTorque_lbft(rpmPin, hpPts, transEff ?? 0.9);
      const launchHP = rpmPin > 0 ? (launchTorque * rpmPin) / 5252 : 0;
      
      // VB6: TQ = Z6 * HP / EngRPM
      // Z6 = 5252 (HP to torque conversion)
      const TQ = launchHP > 0 && rpmPin > 0 ? (5252 * launchHP) / rpmPin : 0;
      
      // VB6: TQ = TQ * gc_TorqueMult.Value * TGR(iGear) * TGEff(iGear)
      const gearRatio = (gearRatios ?? [1.0])[0] ?? 1.0; // First gear
      const TQ_geared = TQ * gearRatio * (transEff ?? 0.9);
      
      // VB6: force = TQ * gc_GearRatio.Value * gc_Efficiency.Value / (TireSlip * TireDia / 24) - DragForce
      const tireSlip = 1.02; // VB6 default
      const force = (TQ_geared * (finalDrive ?? 3.73) * (transEff ?? 0.9)) / (tireSlip * tireDiaIn / 24);
      
      // VB6: Ags0 = 0.88 * force / gc_Weight.Value (12% losses for clutch)
      // VB6: Ags0 = 0.96 * force / gc_Weight.Value (4% losses for converter)
      const lossMultiplier = converter ? 0.96 : 0.88;
      Ags0 = lossMultiplier * force / vehicle.weightLb;
      
      // VB6: If Ags0 < AMin Then Ags0 = AMin
      if (Ags0 < AMin) {
        Ags0 = AMin;
      }
      
      // Note: VB6 also calculates AMAX and clamps here, but we'll do that in the loop
    }
    
    // Bootstrap thresholds (for torque-based launch before HP path)
    const BOOT_MAX_STEPS = 6;        // up to ~12ms with dt=0.002
    const LOCKRPM_MIN = 5;           // rpm threshold at which clutchSlip becomes meaningful
    
    // PMI state tracking (VB6: TIMESLIP.FRM:1092, 1104, 1231, 1240)
    // Initialize RPM0 to launch/stall RPM to avoid massive PMI spike on first step
    // VB6 starts with engine already at stall/slip RPM, not from 0
    let RPM0 = rpmPin;      // Previous engine RPM (start at launch/stall RPM)
    let DSRPM0 = 0;    // Previous driveshaft RPM
    
    // Shift state tracking (VB6: TIMESLIP.FRM:1355, 1433, 1071-1072)
    let shiftState = ShiftState.NORMAL;
    let shiftDwellRemaining_s = 0; // Time remaining in shift dwell (no power window)
    let totalShiftDwell_s = 0; // Total dwell time accumulated
    
    // Shared loss calculation helpers (single source of truth for both bootstrap and HP paths)
    const getTransEff = (gearIdx: number): number => {
      return gearEff && gearEff[gearIdx] !== undefined
        ? Math.max(0.9, Math.min(1.0, gearEff[gearIdx]))
        : (transEff ?? 0.9);
    };
    
    const getDrivelineEff = (): number => {
      // Base efficiency from drivetrain or vehicle config
      const baseEff = drivetrain.overallEff ?? drivetrain.overallEfficiency ?? transEff ?? 0.97;
      // Apply tuning offset and clamp to valid range [0.85, 1.0]
      return clamp01(baseEff + effOffset);
    };
    
    const getTireSlip = (distance_ft: number): number => {
      // VB6: TIMESLIP.FRM:1100-1102
      // Work = 0.005 * (gc_TractionIndex.Value - 1) + 3 * (TrackTempEffect - 1)
      // TireSlip = 1.02 + Work * (1 - (Dist0 / 1320)^2)
      const tractionIndex = env.tractionIndex ?? 3;
      const trackTempEffect = 1.0; // TODO: Calculate from track temp
      return tireSlipFactor(distance_ft, tractionIndex, trackTempEffect);
    };
    
    // Integration loop
    while (true) {
      stepCount++;
      watchdog(stepCount, state.s_ft);
      
      // VB6 tire growth (TIMESLIP.FRM:1091, 1585-1607)
      // Compute effective tire dimensions with growth and squat
      const tireGrowthResult = computeTireGrowth(
        tireDiaIn,
        vehicle.tireWidthIn ?? 17.0,
        state.v_fps,
        Ags0 // Previous acceleration for squat calculation
      );
      const tireRadius_ft = tireGrowthResult.radius_eff_ft;
      const tireCircumference_ft = tireGrowthResult.circumference_eff_ft;
      const tireDia_eff_in = tireGrowthResult.dia_eff_in;
      
      // Calculate RPM from current speed (using effective tire radius)
      let rpm = rpmFromSpeed(state.v_fps, state.gearIdx, drivetrain);
      
      // VB6 driveline: converter, clutch, or direct drive
      let drivelineTorqueLbFt = 0;
      let effectiveRPM = rpm;
      let clutchCoupling = 1.0;
      let converterWork = 0;
      let converterSlipRatio = 0;
      let converterZStall = 0;
      
      // Calculate engine torque first (needed for driveline)
      const currentGearEff = getTransEff(state.gearIdx);
      // VB6-STRICT: Use Float32 torque calculation
      let tq_lbft = STRICT
        ? wheelTorque_f32(rpm, hpPts, currentGearEff)
        : wheelTorque_lbft(rpm, hpPts, currentGearEff);
      
      // Apply fuel delivery factor
      let M_fuel = 1.0;
      if (fuel === 'METHANOL') {
        const trackTempF = env.trackTempF;
        if (trackTempF !== undefined && trackTempF < 80) {
          if (state.t_s < 0.8) {
            M_fuel = 1.025 - (0.025 * state.t_s / 0.8);
          }
        }
      } else if (fuel === 'NITRO') {
        if (state.t_s < 0.4) {
          M_fuel = 0.90;
        } else if (state.t_s < 1.0) {
          const rampProgress = (state.t_s - 0.4) / (1.0 - 0.4);
          M_fuel = 0.90 + (1.0 - 0.90) * rampProgress;
        }
      }
      minFuelScale = Math.min(minFuelScale, M_fuel);
      maxFuelScale = Math.max(maxFuelScale, M_fuel);
      tq_lbft = tq_lbft * M_fuel;
      
      // VB6 driveline: converter, clutch, or direct drive
      const gearRatio = (gearRatios ?? [1.0])[state.gearIdx] ?? 1.0;
      
      // VB6: TIMESLIP.FRM:1140
      // DSRPM = TireSlip * Vel(L) * 60 / TireCirFt
      // Note: VB6 uses DSRPM (driveshaft RPM) which includes tire slip factor
      const currentTireSlip = getTireSlip(state.s_ft);
      const wheelRPM = currentTireSlip * state.v_fps * 60 / tireCircumference_ft;
      
      // --- VB6 RPM hold logic (clutch/converter) ---
      // VB6 holds EngRPM at slip/stall RPM until wheels catch up
      // Use resolved values from top of function
      
      // DEBUG: Check what we're getting
      if (stepCount === 1 && typeof console !== 'undefined' && console.debug) {
        console.debug('[RPM-DEBUG]', {
          isClutch,
          isConverter,
          slipRPM,
          launchRPM,
          stallRPM,
          calculated_slipRPM: slipRPM,
          rpm_from_speed: rpm,
        });
      }
      
      // VB6: TIMESLIP.FRM:1145-1146
      // LockRPM = DSRPM * gc_GearRatio.Value * TGR(iGear)
      // EngRPM(L) = gc_Slippage.Value * LockRPM
      const LockRPM = wheelRPM * gearRatio * (finalDrive ?? 3.73);
      
      // VB6: TIMESLIP.FRM:1149-1151 (clutch) or 1164-1165 (converter)
      // If EngRPM(L) < Stall Then
      //     If iGear = 1 Or gc_LockUp.Value = 0 Then EngRPM(L) = Stall
      // End If
      // Use slippage factor from config (clutchSlippage or converterSlippage)
      const slippage = isClutch ? clutchSlippage : converterSlippage;
      let EngRPM = slippage * LockRPM; // gc_Slippage.Value * LockRPM
      
      // Hold engine RPM at slip/stall in 1st gear or no lockup
      // VB6: TIMESLIP.FRM:1149-1151 (clutch uses slipRPM) or 1164-1165 (converter uses stallRPM)
      const inFirstGear = state.gearIdx === 0;
      const noLockup = true; // Most configs don't have lockup
      const deviceStallRPM = isClutch ? slipRPM : stallRPM; // Use appropriate stall/slip RPM
      if ((isClutch || isConverter) && (inFirstGear || noLockup)) {
        if (EngRPM < deviceStallRPM) {
          EngRPM = deviceStallRPM;
        }
      }
      
      // Track if engine is pinned at slip/stall RPM
      const rpmIsPinned = EngRPM === deviceStallRPM && LockRPM < deviceStallRPM;
      const lockThreshold = deviceStallRPM; // For diagnostics
      
      // Update effectiveRPM to use the calculated value
      effectiveRPM = EngRPM;
      
      // Recalculate torque at the correct EngRPM
      // VB6-STRICT: Use Float32 torque calculation
      tq_lbft = STRICT
        ? wheelTorque_f32(EngRPM, hpPts, currentGearEff)
        : wheelTorque_lbft(EngRPM, hpPts, currentGearEff);
      tq_lbft = STRICT ? F.mul(f32(tq_lbft), f32(M_fuel)) : tq_lbft * M_fuel; // Reapply fuel factor
      
      if (clutch) {
        // VB6 clutch model: ClutchSlip = LockRPM / EngRPM
        // Guard divide-by-zero and clamp to [0, 1]
        clutchCoupling = EngRPM > 1 ? Math.max(0, Math.min(1, LockRPM / EngRPM)) : 0;
        
        // When rpmIsPinned=true and LockRPM is still low, clutchSlip may be ~0
        // Bootstrap Ags0 already carries motion, HP slice will gradually pick up as LockRPM rises
        
        minC = Math.min(minC, clutchCoupling);
        
      } else if (converter) {
        // VB6 converter model (TIMESLIP.FRM:1154-1172)
        // Use resolved stallRPM from top
        const torqueMult = (converter as any).torqueMult ?? 2.0;
        // Use converterSlippage extracted at top (from slippageFactor or slipRatio)
        
        // Use VB6 converter coupling for HP path
        const converterResult = vb6ConverterCoupling(
          LockRPM,
          stallRPM,
          torqueMult,
          converterSlippage,  // Use the extracted value, not local lookup
          stepCount
        );
        
        clutchCoupling = converterResult.coupling;
        converterWork = converterResult.work;
        converterSlipRatio = converterResult.slipRatio;
        converterZStall = converterResult.zStall;
        
        // Track converter usage for diagnostics
        sumTR += converterResult.work;
        sumETA += converterResult.coupling;
        sumSR += converterResult.slipRatio;
        converterSteps++;
        
        minC = Math.min(minC, clutchCoupling);
      } else {
        // Direct drive (no converter/clutch, or converter in higher gears)
        drivelineTorqueLbFt = vb6DirectDrive(tq_lbft, gearRatio, finalDrive ?? 3.73);
        effectiveRPM = rpm;
      }
      
      // Note: drivelineTorqueLbFt calculated but not currently used (was for F_wheel)
      void drivelineTorqueLbFt;
      
      state.rpm = effectiveRPM;
      
      // === VB6 ATMOSPHERE PIPELINE (EXACT PORT) ===
      // Guard all inputs against NaN propagation
      const v = finite(state.v_fps, 0);
      
      // VB6: TIMESLIP.FRM:1181
      // WindFPS = Sqr(Vel(L)^2 + 2*Vel(L)*(WindSpeed/Z5)*Cos(WindAngle*PI/180) + (WindSpeed/Z5)^2)
      // Z5 = 3600/5280 (fps to mph conversion, so WindSpeed/Z5 converts mph to fps)
      const windMph = env.windMph ?? 0;
      const windAngleDeg = env.windAngleDeg ?? 0; // 0 = headwind, 180 = tailwind
      const windFps = windMph / FPS_TO_MPH; // Convert mph to fps
      const windAngleRad = (windAngleDeg * Math.PI) / 180;
      // Law of cosines: combine vehicle velocity with wind velocity
      const windEffectiveFps = Math.sqrt(
        v * v + 
        2 * v * windFps * Math.cos(windAngleRad) + 
        windFps * windFps
      );
      
      // VB6: TIMESLIP.FRM:1185-1189
      // Increase frontal area based on tire growth
      // RefArea2 = gc_RefArea.Value + ((TireGrowth - 1) * TireDia / 2) * (2 * gc_TireWidth.Value) / 144
      const isMotorcycle = (vehicle as any).bodyStyle === 8;
      const effectiveFrontalArea_ft2 = computeRefAreaWithTireGrowth(
        frontalArea_ft2 ?? 0,
        tireGrowthResult.growth,
        tireDiaIn,
        vehicle.tireWidthIn ?? 17.0,
        isMotorcycle
      );
      
      // VB6-STRICT: Use Float32 for aero calculations
      // VB6: TIMESLIP.FRM:1182
      // q = Sgn(WindFPS) * rho * Abs(WindFPS) ^ 2 / (2 * gc)
      // Note: VB6 uses rho in lbm/ft³, we use slugs/ft³, so we don't divide by gc
      let v2: number;
      let q_psf: number;
      let F_drag_lbf: number;
      let F_lift_up_lbf: number;
      
      // Use wind-effective velocity for aero calculations
      const v_aero = windMph !== 0 ? windEffectiveFps : v;
      
      if (STRICT) {
        const v_f32 = f32(v_aero);
        v2 = F.mul(v_f32, v_f32);
        q_psf = F.mul(F.mul(f32(0.5), f32(rho_slug_ft3)), v2);
        // F_drag = q * Cd * cdScale * A (using effective area with tire growth)
        F_drag_lbf = F.mul(F.mul(F.mul(q_psf, f32(cd ?? 0)), f32(cdScale)), f32(effectiveFrontalArea_ft2));
        F_lift_up_lbf = F.mul(F.mul(q_psf, f32(vehicle.liftCoeff ?? 0)), f32(effectiveFrontalArea_ft2));
      } else {
        v2 = v_aero * v_aero; // Use wind-effective velocity
        q_psf = finite(0.5 * rho_slug_ft3 * v2, 0);
        // All forces must be finite numbers
        // Apply cdScale tuning to effective drag coefficient (using effective area with tire growth)
        F_drag_lbf = finite(q_psf * (cd ?? 0) * cdScale * effectiveFrontalArea_ft2, 0);
        F_lift_up_lbf = finite(q_psf * (vehicle.liftCoeff ?? 0) * effectiveFrontalArea_ft2, 0);
      }
      
      // Normal force for rolling/traction (VB6 applies lift by reducing normal load)
      const normal_lbf = finite(vehicle.weightLb - F_lift_up_lbf, vehicle.weightLb);
      
      // Aliases for compatibility with existing code
      const F_drag = F_drag_lbf;
      const normalForce_lbf = normal_lbf;
      
      // VB6 rolling resistance torque (TIMESLIP.FRM:1019, 1192-1193)
      // Uses CMU coefficient (0.025 for Quarter Jr/Pro) with distance and speed dependence
      const cmu = vehicle.rrCoeff ?? CMU; // Allow override, default to VB6 CMU
      const cmuk = 0.01; // VB6 CMUK constant for Quarter Jr/Pro
      const T_rr = vb6RollingResistanceTorque(normalForce_lbf, v, state.s_ft, tireRadius_ft, cmu, cmuk);
      
      // Convert rolling resistance torque to force at contact patch
      const F_roll = finite(T_rr / tireRadius_ft, 0);
      
      // VB6 maximum traction (TIMESLIP.FRM:1054, 1216)
      // AMAX = ((CRTF / TireGrowth) - DragForce) / Weight
      // Calculate CAXI (traction index adjustment)
      const trackTempEffect = 1.0; // TODO: Calculate from track temp
      const tractionIndex = env.tractionIndex ?? 3;
      const CAXI = computeCAXI(tractionIndex, trackTempEffect);
      
      // VB6 weight transfer (TIMESLIP.FRM:1037-1043, 1196-1211)
      // Calculate dynamic rear weight based on acceleration
      // Use previous step's AGS for weight transfer (VB6 iterates this way)
      // Track AGS from previous step (stored outside the loop)
      const prevAGS_g = stepCount === 1 ? 0 : prevAGS_g_stored;
      
      // VB6 vehicle parameters
      const wheelbase_in = vehicle.wheelbaseIn ?? 108; // Default 108" (typical drag car)
      // VB6: TIMESLIP.FRM:1032 - gc_YCG.Value = (TireDia / 2) + 3.75
      // CG height is tire radius + 3.75" (assumes CG is 3.75" above rear axle centerline)
      const cg_height_in = (tireDiaIn / 2) + 3.75;
      const static_front_weight_lbf = (vehicle as any).staticFrontWeightLb ?? (vehicle.weightLb * 0.38); // Default 38% front
      // VB6: TIMESLIP.FRM:559 - FRCT = 1.03 (not 0.04!)
      const frct = 1.03; // VB6 driveline friction coefficient
      
      // Calculate dynamic rear weight with weight transfer
      // VB6 uses normal force (weight - lift) for downforce calculation
      const weightTransfer = vb6RearWeightDynamic(
        vehicle.weightLb,
        static_front_weight_lbf,
        prevAGS_g,
        cg_height_in,
        tireRadius_ft * 12, // Convert to inches
        wheelbase_in,
        F_drag + F_roll,
        normal_lbf,  // VB6: downforce = weight - lift
        frct,
        getDrivelineEff()
      );
      
      const dynamicRWT_lbf = weightTransfer.rear_weight_lbf;
      
      // VB6: TIMESLIP.FRM:1213-1216
      // CRTF = CAXI * AX * TireDia * (TireWidth + 1) * (0.92 + 0.08 * (DynamicRWT / 1900) ^ 2.15)
      // AMAX = ((CRTF / TireGrowth) - DragForce) / Weight
      const AMax = computeAMaxVB6({
        weight_lbf: vehicle.weightLb,
        tireDia_in: tireDiaIn,
        tireWidth_in: vehicle.tireWidthIn ?? 17.0,
        dynamicRWT_lbf,
        tractionIndexAdj: CAXI,
        tireGrowth: tireGrowthResult.growth, // VB6 tire growth factor
        dragForce_lbf: F_drag + F_roll,
        bodyStyle: undefined, // Not a motorcycle
      });
      
      const AMin = computeAMinVB6();
      
      // DEV: Traction diagnostics for first 12 steps
      if (stepCount <= 12 && typeof console !== 'undefined' && console.log) {
        // Compute CRTF for logging
        const CRTF = computeCRTF({
          weight_lbf: vehicle.weightLb,
          tireDia_in: tireDiaIn,
          tireWidth_in: vehicle.tireWidthIn ?? 17.0,
          dynamicRWT_lbf,
          tractionIndexAdj: CAXI,
          tireGrowth: tireGrowthResult.growth,
          dragForce_lbf: F_drag + F_roll,
          bodyStyle: undefined,
        });
        
        console.log('[TRACTION]', {
          step: stepCount,
          CAXI: +CAXI.toFixed(4),
          AX: 10.8,
          tireDia_in: +tireDiaIn.toFixed(2),
          tireWidth_in: +(vehicle.tireWidthIn ?? 17.0).toFixed(1),
          dynamicRWT_lbf: +dynamicRWT_lbf.toFixed(1),
          weightFactor: +(0.92 + 0.08 * Math.pow(dynamicRWT_lbf / 1900, 2.15)).toFixed(4),
          CRTF: +CRTF.toFixed(1),
          tireGrowth: +tireGrowthResult.growth.toFixed(4),
          dragForce_lbf: +(F_drag + F_roll).toFixed(2),
          AMin_ftps2: +AMin.toFixed(3),
          AMax_ftps2: +AMax.toFixed(3),
          AMin_g: +(AMin / gc).toFixed(4),
          AMax_g: +(AMax / gc).toFixed(4),
        });
      }
      
      // BOOTSTRAP PATH: Use torque-based Ags0 for first few steps when LockRPM is tiny
      // (LockRPM already calculated above in RPM hold logic)
      // This avoids ClutchSlip = 0 problem at launch
      let AGS: number;
      let PQWT_ftps2: number; // VB6: Power-to-weight-time parameter for integration
      
      if (stepCount <= BOOT_MAX_STEPS && LockRPM < LOCKRPM_MIN) {
        // Torque-based bootstrap (VB6 lines 1020-1027)
        // Get engine torque at rpmPin (resolved at top)
        const tq_at_slip = wheelTorque_lbft(rpmPin, hpPts, currentGearEff);
        
        // Get torque multiplier for converter (1.0 for clutch)
        const bootTorqueMult = isConverter ? ((converter as any).torqueMult ?? 2.0) : 1.0;
        
        const bootstrapResult = computeAgs0({
          engineTorque_lbft_atSlip: tq_at_slip,
          gearRatio,
          transEff: currentGearEff,
          drivelineEff: getDrivelineEff(),
          finalDrive: finalDrive ?? 3.73,
          tireDia_in: tireDiaIn, // Use calculated value, not vehicle.tireDiaIn
          tireSlip: getTireSlip(state.s_ft),
          dragForce_lbf: F_drag + F_roll,
          vehicleWeight_lbf: vehicle.weightLb,
          isAutoTrans: !!converter,
          torqueMult: bootTorqueMult,  // Apply converter torque multiplication
        });
        
        // Apply VB6 AMin/AMax clamps with PQWT rescaling
        // For bootstrap, PQWT = thrust / weight * gc (approximation)
        PQWT_ftps2 = bootstrapResult.netThrust_lbf / vehicle.weightLb * gc;
        const clamped = clampAGSVB6(bootstrapResult.Ags0_ftps2, PQWT_ftps2, AMin, AMax);
        AGS = clamped.AGS;
        PQWT_ftps2 = clamped.PQWT; // Use rescaled PQWT
        
        // DEV: Bootstrap diagnostics
        if (stepCount <= 10 && typeof console !== 'undefined' && console.debug) {
          const AGS_g = bootstrapResult.Ags0_ftps2 / gc;
          const overallRatio = gearRatio * (finalDrive ?? 3.73);
          const phase = rpmIsPinned ? 'PINNED' : 'BOOTSTRAP';
          console.debug('[STEP]', {
            step: stepCount,
            phase,
            v_fps: state.v_fps.toFixed(6),
            EngRPM: effectiveRPM.toFixed(0),
            LockRPM: LockRPM.toFixed(2),
            slipRPM: slipRPM.toFixed(0),
            lockThreshold: lockThreshold.toFixed(0),
            rpmIsPinned,
            clutchSlip: clutchCoupling.toFixed(6),
            gear: state.gearIdx + 1,
            GRxFD: overallRatio.toFixed(3),
            tireDia_eff_in: tireDia_eff_in.toFixed(2),
            tireGrowth: tireGrowthResult.growth.toFixed(4),
            tireSlip: getTireSlip(state.s_ft).toFixed(4),
            RWTdyn_lbf: dynamicRWT_lbf.toFixed(1),
            RWTfront_lbf: weightTransfer.front_weight_lbf.toFixed(1),
            wheelieBar_lbf: weightTransfer.wheelie_bar_weight_lbf.toFixed(1),
            AGS_g: AGS_g.toFixed(4),
            AGS_ftps2: AGS.toFixed(4),
            AMin_ftps2: AMin.toFixed(4),
            AMax_ftps2: AMax.toFixed(4),
            SLIP: clamped.SLIP,
          });
        }
      } else {
        // HP-BASED PATH: Use VB6 launch slice (TIMESLIP.FRM:1218-1228, 1250-1266)
        
        // VB6 Shift Dwell: During shift, vehicle coasts with zero engine power
        // VB6: TIMESLIP.FRM:1071-1072, 1283-1287
        // During DTShift period, only drag and rolling resistance act on vehicle
        // Get HP directly from power curve at EngRPM
        // VB6-STRICT: Use Float32 HP interpolation
        let hp_at_EngRPM = STRICT
          ? hpAtRPM_f32(EngRPM, hpPts)
          : power_hp_atRPM(EngRPM, hpPts);
        
        // Check if in shift dwell (no power window)
        if (shiftDwellRemaining_s > 0) {
          // Zero engine power during shift
          hp_at_EngRPM = 0;
          
          // Decrement dwell timer
          shiftDwellRemaining_s = Math.max(0, shiftDwellRemaining_s - dt_s);
          
          // Log dwell end
          if (shiftDwellRemaining_s === 0 && typeof console !== 'undefined' && console.debug) {
            console.debug('[SHIFT_DWELL_END]', {
              step: stepCount,
              t_s: state.t_s.toFixed(4),
              v_fps: state.v_fps.toFixed(2),
            });
          }
        }
        
        // === VB6 EXACT HP CHAIN (TIMESLIP.FRM:1176-1178, 1231-1253) ===
        
        // VB6: TIMESLIP.FRM:1176-1178
        // Call TABY(xrpm(), yhp(), NHP, 1, EngRPM(L), HP)
        // HP = gc_HPTQMult.Value * HP / hpc
        // HPSave = HP:    HP = HP * ClutchSlip
        // Note: gc_HPTQMult.Value is already applied in hpPts normalization
        // Note: hpc correction is NOT applied here because our fixture HP curves
        // are the same values VB6 uses, and VB6's target ETs already include hpc.
        // The hpc value is available in airResult.hpc if needed for display.
        const HPSave = hp_at_EngRPM; // Engine HP before PMI losses
        
        // VB6: TIMESLIP.FRM:1180-1194
        // DragHP = DragForce * Vel(L) / 550
        // VB6-STRICT: Use Float32 arithmetic
        const dragHP = STRICT
          ? F.div(F.mul(F.add(f32(F_drag), f32(F_roll)), f32(state.v_fps)), f32(550))
          : (F_drag + F_roll) * state.v_fps / 550;
        
        // DEV: Pre-HP-chain diagnostics for first 12 steps
        if (stepCount <= 12 && typeof console !== 'undefined' && console.log) {
          console.log('[PRE_HP_CHAIN]', {
            step: stepCount,
            EngRPM_out: +EngRPM.toFixed(0),
            wheelRPM: +wheelRPM.toFixed(2),
            ClutchSlip: +clutchCoupling.toFixed(4),
            ...(converter ? {
              converterWork: +converterWork.toFixed(4),
            } : {}),
            HPSave: +HPSave.toFixed(1),
            DragHP: +dragHP.toFixed(2),
            F_drag_lbf: +F_drag_lbf.toFixed(2),
            F_roll_lbf: +F_roll.toFixed(2),
            v_fps: +state.v_fps.toFixed(2),
            tireSlip: +getTireSlip(state.s_ft).toFixed(4),
            currentGearEff: +currentGearEff.toFixed(4),
            drivelineEff: +getDrivelineEff().toFixed(4),
            dt_s: +dt_s.toFixed(4),
            RPM0: +RPM0.toFixed(0),
            DSRPM0: +DSRPM0.toFixed(2),
          });
        }
        
        // VB6: TIMESLIP.FRM:1231-1248
        // Compute driveshaft RPM (using effective tire circumference with growth)
        const DSRPM = computeDSRPM(getTireSlip(state.s_ft), state.v_fps, tireCircumference_ft);
        
        // Compute chassis PMI
        // VB6 PMI values (TIMESLIP.FRM:788-805)
        let enginePMI: number;
        let transPMI: number;
        let tiresPMI: number;
        
        if (vehicle.pmi?.engine_flywheel_clutch !== undefined) {
          // Use exact VB6 printout values
          enginePMI = vehicle.pmi.engine_flywheel_clutch;
          transPMI = vehicle.pmi.transmission_driveshaft ?? 0;
          tiresPMI = vehicle.pmi.tires_wheels_ringgear ?? 0;
        } else {
          // Estimate from vehicle parameters (VB6 defaults)
          const engineCID = 500; // Estimate - should come from vehicle config
          enginePMI = engineCID / 120; // Naturally aspirated default
          const numGears = gearRatios?.length ?? 5;
          transPMI = isClutch ? numGears * enginePMI / 50 : (numGears - 1) * enginePMI / 10;
          tiresPMI = 2 * (1.15 * 0.8 * (0.08 * tireDiaIn * (vehicle.tireWidthIn ?? 17.0)) * Math.pow(tireDiaIn / 2, 2) / 386);
        }
        
        const chassisPMI = computeChassisPMI(tiresPMI, transPMI, finalDrive ?? 3.73, gearRatio);
        
        // VB6: TIMESLIP.FRM:1231-1240, 1247-1248
        // EngAccHP = gc_EnginePMI.Value * EngRPM(L) * (EngRPM(L) - RPM0)
        // ChasAccHP = ChassisPMI * DSRPM * (DSRPM - DSRPM0)
        // Work = (2 * PI / 60) ^ 2 / (12 * 550 * dtk1)
        // HPEngPMI = EngAccHP * Work
        // HPChasPMI = ChasAccHP * Work
        const HPEngPMI = hpEngPMI(RPM0, EngRPM, dt_s, enginePMI, isClutch);
        const HPChasPMI = hpChasPMI(DSRPM0, DSRPM, dt_s, chassisPMI);
        
        // DEV: PMI diagnostics for first 12 steps
        if (stepCount <= 12 && typeof console !== 'undefined' && console.log) {
          console.log('[PMI_CALC]', {
            step: stepCount,
            EngRPM: +EngRPM.toFixed(0),
            RPM0: +RPM0.toFixed(0),
            RPM_delta: +(EngRPM - RPM0).toFixed(0),
            DSRPM: +DSRPM.toFixed(2),
            DSRPM0: +DSRPM0.toFixed(2),
            DSRPM_delta: +(DSRPM - DSRPM0).toFixed(2),
            enginePMI: +enginePMI.toFixed(3),
            chassisPMI: +chassisPMI.toFixed(3),
            HPEngPMI: +HPEngPMI.toFixed(1),
            HPChasPMI: +HPChasPMI.toFixed(1),
          });
        }
        
        // Update previous RPM values for next step
        RPM0 = EngRPM;
        DSRPM0 = DSRPM;
        
        // Track PMI energy losses
        E_pmi_engine += HPEngPMI * 550 * dt_s; // Convert HP to ft-lb
        E_pmi_chassis += HPChasPMI * 550 * dt_s;
        
        // VB6: TIMESLIP.FRM:1178, 1219-1220
        // HPSave = HP:    HP = HP * ClutchSlip
        // HP = HP * TGEff(iGear) * gc_Efficiency.Value / TireSlip
        // HP = HP - DragHP
        //
        // Note: VB6's ClutchSlip for converters is:
        // - Default: 1 / gc_Slippage.Value (~0.94 for slippage=1.06)
        // - When EngRPM < zStall: Work * LockRPM / zStall
        // The vb6ConverterCoupling function now correctly implements this logic.
        
        let HP_afterLine1: number;
        let HP: number;
        const tireSlip = getTireSlip(state.s_ft);
        
        if (STRICT) {
          // VB6-STRICT: Float32 HP chain (TIMESLIP.FRM:1250-1251)
          // VB6: HP = (HPSave - HPEngPMI) * ClutchSlip
          HP_afterLine1 = F.mul(F.sub(f32(HPSave), f32(HPEngPMI)), f32(clutchCoupling));
          HP = HP_afterLine1;
          // VB6: HP = ((HP * TGEff(iGear) * gc_Efficiency.Value - HPChasPMI) / TireSlip) - DragHP
          const hp_times_eff = F.mul(F.mul(f32(HP), f32(currentGearEff)), f32(getDrivelineEff()));
          const hp_minus_pmi = F.sub(hp_times_eff, f32(HPChasPMI));
          const hp_div_slip = F.div(hp_minus_pmi, f32(tireSlip));
          HP = F.sub(hp_div_slip, f32(dragHP));
        } else {
          // VB6: HP = (HPSave - HPEngPMI) * ClutchSlip
          HP_afterLine1 = (HPSave - HPEngPMI) * clutchCoupling;
          HP = HP_afterLine1;
          // VB6: HP = ((HP * TGEff(iGear) * gc_Efficiency.Value - HPChasPMI) / TireSlip) - DragHP
          HP = ((HP * currentGearEff * getDrivelineEff() - HPChasPMI) / tireSlip) - dragHP;
        }
        const HP_afterLine2 = HP;
        
        // Store HP values for trace collection
        lastHPSave = HPSave;
        lastHP_wheel = HP_afterLine2;
        lastDragHP = dragHP;
        
        // VB6: TIMESLIP.FRM:1252-1253
        // PQWT = 550 * gc * HP / Weight
        PQWT_ftps2 = STRICT
          ? F.div(F.mul(F.mul(f32(550), f32(gc)), f32(HP)), f32(vehicle.weightLb))
          : 550 * gc * HP / vehicle.weightLb;
        
        // VB6: TIMESLIP.FRM:1253
        // AGS(L) = PQWT / (Vel(L) * gc)
        let AGS_candidate_ftps2 = vb6AGSFromPQWT(PQWT_ftps2, state.v_fps);
        
        // VB6: TIMESLIP.FRM:1255-1258
        // Apply jerk limits BEFORE AMin/AMax clamps
        // Jerk = (AGS(L) - Ags0) / dtk1
        // If Jerk < JMin Then Jerk = JMin: AGS(L) = Ags0 + Jerk * dtk1: PQWT = AGS(L) * gc * Vel(L)
        // If Jerk > JMax Then Jerk = JMax: AGS(L) = Ags0 + Jerk * dtk1: PQWT = AGS(L) * gc * Vel(L)
        // Note: VB6's AGS is in g's, Jerk is in g/s
        // Note: VB6 uses jerk limiting as part of an iterative convergence loop.
        // With adaptive timestep, we only apply jerk limiting when dt is small enough
        // that jerk would otherwise be unreasonably high.
        if (dt_s > 0 && dt_s <= 0.01 && stepCount > 1) {
          const AGS_g = AGS_candidate_ftps2 / gc;
          const Ags0_g_local = Ags0 / gc;
          let Jerk = (AGS_g - Ags0_g_local) / dt_s; // g/s
          
          if (Jerk < JMin) {
            Jerk = JMin;
            const newAGS_g = Ags0_g_local + Jerk * dt_s;
            AGS_candidate_ftps2 = newAGS_g * gc;
            PQWT_ftps2 = newAGS_g * gc * state.v_fps; // VB6: PQWT = AGS(L) * gc * Vel(L)
          }
          if (Jerk > JMax) {
            Jerk = JMax;
            const newAGS_g = Ags0_g_local + Jerk * dt_s;
            AGS_candidate_ftps2 = newAGS_g * gc;
            PQWT_ftps2 = newAGS_g * gc * state.v_fps;
          }
        }
        
        // VB6: TIMESLIP.FRM:1260-1266
        // Apply AMin/AMax clamps with PQWT rescaling
        const clampResult = vb6ApplyAccelClamp(AGS_candidate_ftps2, AMin, AMax);
        AGS = clampResult.AGS_ftps2;
        PQWT_ftps2 = PQWT_ftps2 * clampResult.PQWT_scale; // Rescale PQWT per VB6
        const slip = clampResult.slip;
        
        // Final guard: ensure AGS is finite and clamped
        AGS = clampFinite(AGS, AMin, AMax, AMin);
        
        // VB6: Track maximum acceleration for adaptive timestep (TIMESLIP.FRM:1082)
        const AGS_g = AGS / gc;
        if (AGS_g > AgsMax_g) {
          AgsMax_g = AGS_g;
        }
        
        // VB6: Adaptive timestep (TIMESLIP.FRM:1082)
        // TimeStep = TSMax * (AgsMax / Ags0) ^ 4
        const Ags0_g = Ags0 / gc;
        if (Ags0_g > 0 && stepCount > 1) {
          dt_s = vb6AdaptiveTimestep(TSMax, AgsMax_g, Ags0_g);
        }
        
        // DEV: Consolidated table for first 12 steps (before integration)
        if (stepCount <= 12 && typeof console !== 'undefined' && console.log) {
          console.log('[CONSOLIDATED_ROW]', {
            step: stepCount,
            v_ftps: +state.v_fps.toFixed(3),
            EngRPM: +EngRPM.toFixed(0),
            wheelRPM: +wheelRPM.toFixed(2),
            ClutchSlip: +clutchCoupling.toFixed(4),
            HPSave: +HPSave.toFixed(1),
            HPEngPMI: +HPEngPMI.toFixed(1),
            HPChasPMI: +HPChasPMI.toFixed(1),
            DragHP: +dragHP.toFixed(2),
            HP_afterL1: +HP_afterLine1.toFixed(1),
            HP_afterL2: +HP_afterLine2.toFixed(1),
            PQWT: +PQWT_ftps2.toFixed(1),
            AMin: +AMin.toFixed(3),
            AMax: +AMax.toFixed(3),
            AGS_applied: +AGS.toFixed(3),
          });
        }
        
        // DEV: Aero/traction trace for first 20 steps
        if (stepCount <= 20 && typeof console !== 'undefined' && console.log) {
          console.log('[AERO_TRACE]', {
            step: stepCount,
            v_fps: +v.toFixed(6),
            rho_slug_per_ft3: +rho_slug_ft3.toFixed(6),
            q_psf: +q_psf.toFixed(3),
            F_drag_lbf: +F_drag_lbf.toFixed(2),
            F_lift_up_lbf: +F_lift_up_lbf.toFixed(2),
            normal_lbf: +normal_lbf.toFixed(2),
            F_roll_lbf: +F_roll.toFixed(2),
            AMin_ftps2: +AMin.toFixed(3),
            AMax_ftps2: +AMax.toFixed(3),
            AGS_ftps2: +AGS.toFixed(3),
          });
        }
        
        // DEV: HP-based diagnostics for first 10 steps
        if (stepCount <= 10 && typeof console !== 'undefined' && console.debug) {
          const AGS_g = AGS / gc;
          const overallRatio = gearRatio * (finalDrive ?? 3.73);
          const phase = rpmIsPinned ? 'PINNED' : 'HP';
          console.debug('[STEP]', {
            step: stepCount,
            phase,
            v_fps: state.v_fps.toFixed(6),
            EngRPM: effectiveRPM.toFixed(0),
            LockRPM: LockRPM.toFixed(2),
            slipRPM: slipRPM.toFixed(0),
            lockThreshold: lockThreshold.toFixed(0),
            rpmIsPinned,
            clutchSlip: clutchCoupling.toFixed(6),
            gear: state.gearIdx + 1,
            GRxFD: overallRatio.toFixed(3),
            tireDia_eff_in: tireDia_eff_in.toFixed(2),
            tireGrowth: tireGrowthResult.growth.toFixed(4),
            tireSlip: getTireSlip(state.s_ft).toFixed(4),
            RWTdyn_lbf: dynamicRWT_lbf.toFixed(1),
            RWTfront_lbf: weightTransfer.front_weight_lbf.toFixed(1),
            wheelieBar_lbf: weightTransfer.wheelie_bar_weight_lbf.toFixed(1),
            rho_slug_ft3: rho_slug_ft3.toFixed(6),
            dragHP: dragHP.toFixed(2),
            ...(converter ? {
              converterWork: converterWork.toFixed(4),
              converterSlipRatio: converterSlipRatio.toFixed(4),
              converterZStall: converterZStall.toFixed(0),
            } : {}),
            HP_engine: HPSave.toFixed(1),
            HPEngPMI: HPEngPMI.toFixed(1),
            HPChasPMI: HPChasPMI.toFixed(1),
            HP_afterLine1: HP_afterLine1.toFixed(1),
            HP_afterLine2: HP_afterLine2.toFixed(1),
            AGS_g: AGS_g.toFixed(4),
            AGS_ftps2: AGS.toFixed(4),
            AMin_ftps2: AMin.toFixed(4),
            AMax_ftps2: AMax.toFixed(4),
            SLIP: slip,
          });
        }
      }
      
      // Update Ags0 for next step (VB6: TIMESLIP.FRM:1090)
      Ags0 = AGS;
      
      // Energy accounting (DEV only)
      // Engine energy = HP × time × 550 (convert HP to ft-lb/s)
      // Get HP directly from power curve at EngRPM
      const hp_at_EngRPM = power_hp_atRPM(EngRPM, hpPts);
      E_engine_total += hp_at_EngRPM * 550 * dt_s; // ft-lb
      
      // Losses = Force × Distance
      const distance_step = state.v_fps * dt_s; // ft
      E_drag_total += F_drag * distance_step;
      E_rr_total += F_roll * distance_step;
      
      // Driveline loss = efficiency losses only (gear friction, etc.)
      // Loss = engine_power × (1 - efficiency)
      const gearEffLoss = 1 - currentGearEff; // Typically ~0.01 (1%)
      const overallEffLoss = 1 - getDrivelineEff(); // Typically ~0.03 (3%)
      const totalEffLoss = gearEffLoss + overallEffLoss; // Combined ~4%
      E_driveline_loss += hp_at_EngRPM * 550 * dt_s * totalEffLoss;
      
      // VB6 EXACT integration (TIMESLIP.FRM:1280)
      // Dist(L) = ((2*PQWT*dt + v0²)^1.5 - v0³) / (3*PQWT) + Dist0
      // Vel(L) = sqrt(v0² + 2*PQWT*dt)
      
      // Guard inputs before integration
      const v_now = finite(state.v_fps, 0);
      const dist_now = finite(state.s_ft, 0);
      const a_now = finite(AGS, AMin);
      const pqwt_now = finite(PQWT_ftps2, 0);
      
      const stepResult = vb6StepDistance(v_now, dist_now, dt_s, pqwt_now);
      
      // DEV: Log integrated values for first 12 steps
      if (stepCount <= 12 && typeof console !== 'undefined' && console.log) {
        console.log('[INTEGRATED]', {
          step: stepCount,
          Vel_next: +stepResult.Vel_ftps.toFixed(3),
          Dist_next: +stepResult.Dist_ft.toFixed(6),
        });
      }
      
      // Check for NaN before updating state
      if (!Number.isFinite(stepResult.Vel_ftps) || !Number.isFinite(stepResult.Dist_ft)) {
        throw new Error(
          `NaN in state @ step=${stepCount} v=${stepResult.Vel_ftps} dist=${stepResult.Dist_ft} AGS=${a_now} PQWT=${pqwt_now}`
        );
      }
      
      state.v_fps = stepResult.Vel_ftps;
      state.s_ft = stepResult.Dist_ft;
      state.t_s = state.t_s + dt_s;
      
      // Final NaN guard after state update
      if (!Number.isFinite(state.v_fps) || !Number.isFinite(state.s_ft) || !Number.isFinite(AGS)) {
        throw new Error(`NaN in state @ step=${stepCount} v=${state.v_fps} dist=${state.s_ft} AGS=${AGS}`);
      }
      
      // Store AGS in g's for next step's weight transfer calculation
      prevAGS_g_stored = AGS / gc;
      
      // Check termination conditions AFTER updating kinematics
      // 1. FIRST: Check if we reached the finish line
      if (state.s_ft >= finishDistance_ft) {
        terminationReason = 'DISTANCE';
        break;
      }
      
      // 2. Safety caps (only if we haven't reached finish)
      if (state.t_s >= MAX_TIME_S) {
        terminationReason = 'TIME_CAP';
        break;
      }
      
      // VB6 shift logic (TIMESLIP.FRM:1355, 1433)
      // Check if shift conditions are met
      const numGears = gearRatios?.length ?? 1;
      const currentShiftRPM = (shiftRPM ?? [])[state.gearIdx] ?? 0;
      
      // VB6-STRICT: Use >= operator directly, no tolerance
      // Non-strict: Use tolerance-based check with state machine
      const shiftTriggered = STRICT
        ? shouldShift_f32(EngRPM, currentShiftRPM, state.gearIdx, numGears - 1)
        : shouldShift(state.gearIdx, numGears, EngRPM, shiftRPM ?? []);
      
      // Update shift state machine (non-STRICT uses 2-step process)
      // STRICT: Execute shift immediately when triggered
      let executeShift = false;
      if (STRICT) {
        executeShift = shiftTriggered;
      } else {
        const shiftUpdate = updateShiftState(shiftState, shiftTriggered);
        shiftState = shiftUpdate.newState;
        executeShift = shiftUpdate.executeShift;
      }
      
      // Execute shift
      if (executeShift) {
        const oldGear = state.gearIdx;
        const oldEngRPM = EngRPM;
        
        // Increment gear
        state.gearIdx++;
        
        // VB6: TIMESLIP.FRM:1071-1072
        // Shift2PrintTime = time(L) + DTShift
        // TimeStep = DTShift
        // Start shift dwell (no power window)
        const dwellTime = vb6ShiftDwell_s(isClutch);
        shiftDwellRemaining_s = dwellTime;
        totalShiftDwell_s += dwellTime;
        
        // Log shift event
        if (typeof console !== 'undefined' && console.debug) {
          console.debug('[SHIFT]', {
            step: stepCount,
            t_s: state.t_s.toFixed(4),
            v_fps: state.v_fps.toFixed(2),
            from_gear: oldGear + 1,
            to_gear: state.gearIdx + 1,
            EngRPM_before: oldEngRPM.toFixed(0),
            LockRPM: LockRPM.toFixed(0),
            dwell_s: dwellTime.toFixed(3),
          });
        }
      }
      
      // VB6 rollout completion (TIMESLIP.FRM:1380)
      // If gc_Rollout.Value > 0 Then time(L) = 0
      if (!rolloutCompleted && state.s_ft >= rolloutFt) {
        rolloutCompleted = true;
        t_at_rollout = state.t_s;
      }
      
      // VB6 trap speed window tracking (TIMESLIP.FRM:1619-1627)
      // Case 5: SaveTime = time(L)  '594 ft
      // Case 8: SaveTime = time(L)  '1254 ft
      if (t_at_594 === 0 && state.s_ft >= 594) {
        t_at_594 = state.t_s;
      }
      if (t_at_1254 === 0 && state.s_ft >= 1254) {
        t_at_1254 = state.t_s;
      }
      
      // VB6 timeslip points (TIMESLIP.FRM:1617-1626)
      // Case 3: TIMESLIP(1) = time(L)  '60 ft
      // Case 4: TIMESLIP(2) = time(L)  '330 ft
      // Case 6: TIMESLIP(3) = time(L)  '660 ft
      // Case 7: TIMESLIP(5) = time(L)  '1000 ft
      // Case 9: TIMESLIP(6) = time(L)  '1320 ft
      while (nextTimeslipIdx < timeslipPoints.length && 
             state.s_ft >= timeslipPoints[nextTimeslipIdx]) {
        const distance = timeslipPoints[nextTimeslipIdx];
        const measuredTime = rolloutCompleted ? state.t_s - t_at_rollout : 0;
        const v_mph = state.v_fps * FPS_TO_MPH;
        
        timeslip.push({
          d_ft: distance,
          t_s: measuredTime,
          v_mph: v_mph,
        });
        
        nextTimeslipIdx++;
      }
      
      // Collect traces at intervals
      if (state.t_s >= nextTraceTime) {
        const a_fps2 = (state.v_fps - prevV_fps) / dt_s;
        const a_g = a_fps2 / g;
        
        traces.push({
          t_s: state.t_s,
          v_mph: state.v_fps * FPS_TO_MPH,
          a_g: a_g,
          s_ft: state.s_ft,
          rpm: state.rpm,
          gear: state.gearIdx + 1, // 1-based for display
          hp: lastHP_wheel > 0 ? lastHP_wheel : undefined,         // Wheel HP (after losses)
          engineHp: lastHPSave > 0 ? lastHPSave : undefined,       // Engine HP (before losses)
          dragHp: lastDragHP > 0 ? lastDragHP : undefined,         // Drag HP loss
        });
        
        nextTraceTime += traceInterval_s;
        prevV_fps = state.v_fps;
      }
    }
    
    // Safety check
    if (state.t_s >= MAX_TIME_S) {
      warnings.push('max_time_exceeded');
    }
    
    // VB6 final ET and trap speed calculation (TIMESLIP.FRM:1621, 1626-1627)
    // TIMESLIP(4) = Z5 * 66 / (TIMESLIP(3) - SaveTime)  [eighth mile trap]
    // TIMESLIP(7) = Z5 * 66 / (TIMESLIP(6) - SaveTime)  [quarter mile trap]
    // Z5 = FPS_TO_MPH = 3600 / 5280 (converts fps to mph)
    const measuredET = rolloutCompleted ? state.t_s - t_at_rollout : state.t_s;
    const finalMPH = state.v_fps * FPS_TO_MPH;
    
    // VB6 trap speeds: time-averaged over 66 ft windows
    let eighthMileTrapMPH: number | undefined;
    let quarterMileTrapMPH: number | undefined;
    
    if (t_at_594 > 0 && state.t_s > t_at_594) {
      // Eighth mile trap: 594-660 ft (66 ft window)
      const t_at_660 = state.t_s; // Current time (should be at or past 660)
      const deltaT = t_at_660 - t_at_594;
      if (deltaT > 0) {
        eighthMileTrapMPH = FPS_TO_MPH * 66 / deltaT;
      }
    }
    
    if (t_at_1254 > 0 && state.t_s > t_at_1254) {
      // Quarter mile trap: 1254-1320 ft (66 ft window)
      const t_at_1320 = state.t_s; // Current time (should be at or past 1320)
      const deltaT = t_at_1320 - t_at_1254;
      if (deltaT > 0) {
        quarterMileTrapMPH = FPS_TO_MPH * 66 / deltaT;
      }
    }
    
    // Final kinetic energy (DEV only)
    // Translational: KE = 0.5 × m × v²
    E_kinetic_trans = 0.5 * mass_slugs * state.v_fps * state.v_fps;
    
    // Rotational: KE_rot = 0.5 × I × ω²
    // I = moment of inertia (slug-ft²), ω = angular velocity (rad/s)
    // For wheels: I ≈ m_wheel × r², ω = v / r
    // If no explicit reason was set, mark as SAFETY
    if (!terminationReason) {
      terminationReason = 'SAFETY';
    }
    
    // DEV: Log termination info
    if (typeof console !== 'undefined' && console.debug) {
      console.debug('[RSACLASSIC END]', {
        reason: terminationReason,
        t_s: state.t_s,
        steps: stepCount,
        d_ft: state.s_ft,
        target_ft: finishDistance_ft,
        totalShiftDwell_s: totalShiftDwell_s.toFixed(3),
      });
    }
    
    // DEV: Warn if we didn't reach the finish line
    if (typeof console !== 'undefined' && console.warn && terminationReason !== 'DISTANCE') {
      console.warn('Terminated without crossing finish:', {
        reason: terminationReason,
        t_s: state.t_s,
        d_ft: state.s_ft,
        target_ft: finishDistance_ft,
      });
    }
    
    // Ensure we have a timeslip entry at finish
    if (timeslip.length === 0 || timeslip[timeslip.length - 1].d_ft !== finishDistance_ft) {
      timeslip.push({
        d_ft: finishDistance_ft,
        t_s: measuredET,
        v_mph: finalMPH,
      });
    }
    
    // VB6 trap speeds: time-averaged over 66 ft windows (TIMESLIP.FRM:1621, 1626-1627)
    // TIMESLIP(4) = Z5 * 66 / (TIMESLIP(3) - SaveTime)  [eighth mile trap]
    // TIMESLIP(7) = Z5 * 66 / (TIMESLIP(6) - SaveTime)  [quarter mile trap]
    // Z5 = 3600 / 5280 (converts to mph)
    const windowMPH: { e660_mph?: number; q1320_mph?: number } = {};
    
    if (eighthMileTrapMPH !== undefined) {
      windowMPH.e660_mph = eighthMileTrapMPH;
    }
    
    if (quarterMileTrapMPH !== undefined) {
      windowMPH.q1320_mph = quarterMileTrapMPH;
    }
    
    // Energy summary logging (DEV only)
    // @ts-ignore - import.meta.env.DEV is available in Vite
    const isDev = (typeof import.meta !== 'undefined' && import.meta.env?.DEV) || true; // Temporarily always on
    if (isDev) {
      const E_total_in = E_engine_total;
      const E_total_out = E_drag_total + E_rr_total + E_driveline_loss + E_pmi_engine + E_pmi_chassis;
      const E_total_kinetic = E_kinetic_trans + E_kinetic_rot;
      const E_balance = E_total_in - E_total_out - E_total_kinetic;
      
      console.log(`\n=== ENERGY SUMMARY: ${vehicle.name ?? 'Unknown'} ===`);
      console.log(`ET: ${measuredET.toFixed(3)}s, Trap MPH: ${finalMPH.toFixed(1)}`);
      console.log(`\nEnergy In:`);
      console.log(`  Engine:           ${(E_engine_total / 1000).toFixed(1)} k-ft-lb`);
      console.log(`\nEnergy Out:`);
      console.log(`  Aero Drag:        ${(E_drag_total / 1000).toFixed(1)} k-ft-lb (${(100 * E_drag_total / E_total_in).toFixed(1)}%)`);
      console.log(`  Rolling Resist:   ${(E_rr_total / 1000).toFixed(1)} k-ft-lb (${(100 * E_rr_total / E_total_in).toFixed(1)}%)`);
      console.log(`  Driveline Loss:   ${(E_driveline_loss / 1000).toFixed(1)} k-ft-lb (${(100 * E_driveline_loss / E_total_in).toFixed(1)}%)`);
      console.log(`  Engine PMI:       ${(E_pmi_engine / 1000).toFixed(1)} k-ft-lb (${(100 * E_pmi_engine / E_total_in).toFixed(1)}%)`);
      console.log(`  Chassis PMI:      ${(E_pmi_chassis / 1000).toFixed(1)} k-ft-lb (${(100 * E_pmi_chassis / E_total_in).toFixed(1)}%)`);
      console.log(`  Total Losses:     ${(E_total_out / 1000).toFixed(1)} k-ft-lb (${(100 * E_total_out / E_total_in).toFixed(1)}%)`);
      console.log(`\nFinal Kinetic Energy:`);
      console.log(`  Translational:    ${(E_kinetic_trans / 1000).toFixed(1)} k-ft-lb (${(100 * E_kinetic_trans / E_total_in).toFixed(1)}%)`);
      console.log(`  Rotational:       ${(E_kinetic_rot / 1000).toFixed(1)} k-ft-lb (${(100 * E_kinetic_rot / E_total_in).toFixed(1)}%)`);
      console.log(`  Total Kinetic:    ${(E_total_kinetic / 1000).toFixed(1)} k-ft-lb (${(100 * E_total_kinetic / E_total_in).toFixed(1)}%)`);
      console.log(`\nEnergy Balance:     ${(E_balance / 1000).toFixed(1)} k-ft-lb (${(100 * E_balance / E_total_in).toFixed(1)}% error)`);
      console.log(`===\n`);
    }
    
    // Build result
    // VB6-STRICT: Apply banker's rounding to final outputs (VB6 UI behavior)
    const result: SimResult = {
      et_s: STRICT ? vb6Round(measuredET, 3) : measuredET,
      mph: STRICT ? vb6Round(finalMPH, 2) : finalMPH,
      timeslip: timeslip,
      traces: traces.length > 0 ? traces : undefined,
      meta: {
        model: 'RSACLASSIC',
        steps: Math.floor(state.t_s / dt_s),
        warnings: warnings,
        windowMPH: Object.keys(windowMPH).length > 0 ? windowMPH : undefined,
        converter: converter && !clutch ? {
          used: true,
          avgTR: converterSteps > 0 ? sumTR / converterSteps : 1.0,
          avgETA: converterSteps > 0 ? sumETA / converterSteps : 1.0,
          avgSR: converterSteps > 0 ? sumSR / converterSteps : 1.0,
          deRateMax: 0.30,
          parasiticConst: 0.05,
          parasiticQuad: 1e-6,
        } : undefined,
        clutch: clutch ? {
          used: true,
          minC: minC,
          lockupAt_ft: lockupAt_ft,
        } : undefined,
        rollout: {
          rolloutIn: rolloutIn ?? 12,
          t_roll_s: t_at_rollout,
        },
        fuel: fuel ? {
          type: fuel,
          minScale: minFuelScale,
          maxScale: maxFuelScale,
        } : undefined,
        vb6: {
          dt_s: dt_s,
          trapMode: 'time' as const,
          windowsFt: {
            eighth: { start: 594, end: 660, distance: 66 },
            quarter: { start: 1254, end: 1320, distance: 66 },
          },
          timeslipPoints: [60, 330, 660, 1000, 1320],
          rolloutBehavior: 'ET clock starts after rollout distance (TIMESLIP.FRM:1380)',
        },
        termination: {
          reason: terminationReason,
          steps: stepCount,
          t_s: state.t_s,
          target_ft: finishDistance_ft,
        },
      },
    };
    
    console.log('[RSACLASSIC] done', {
      et_s: +(result?.et_s?.toFixed?.(4) ?? result?.et_s),
      mph: +(result?.mph?.toFixed?.(1) ?? result?.mph),
      steps: result?.meta?.termination?.steps ?? stepCount,
      wallMs: Date.now() - WATCH_START_MS,
    });
    
    return result;
  }
}

/**
 * RSACLASSIC model instance.
 */
export const RSACLASSIC: PhysicsModel = new RSACLASSICModel();
