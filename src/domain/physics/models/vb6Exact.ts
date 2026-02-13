/**
 * VB6 Exact Simulation Model
 * 
 * This model implements the EXACT VB6 TIMESLIP.FRM simulation logic.
 * It uses the vb6SimulationStep function which replicates the VB6 iteration loop.
 * 
 */

import type { SimInputs, SimResult } from '../index';
import { 
  vb6SimulationStep, 
  vb6InitState, 
  vb6CalcTSMaxInit,
  vb6DoOpt,
  type VB6VehicleParams,
  type VB6EnvParams,
  type ThrottleStopParams,
  type VB6DoOptContext,
  type VB6ASV,
} from '../vb6/vb6SimulationStep';
import { airDensityVB6, type FuelSystemType } from '../vb6/air';
import { gc, FPS_TO_MPH, roundET, roundMPH, PI } from '../vb6/constants';
import { setFloat32Mode } from '../vb6/vb6SimulationStep';
import { buildEngineCurve, convertToZeroIndexed } from '../vb6/engineCurve';
import { 
  calcBodyStyle, 
  getAeroByBodyStyle, 
  calcTransEfficiencies, 
  calcPMI, 
  calcEfficiency,
  calcClutchSlippage,
} from '../vb6/quarterJr';
import { type FuelSystemValue } from '../vb6/calcWork';
import { taby } from '../vb6/dtaby';
import { Z6 } from '../vb6/constants';
import { RACE_LENGTH_INFO, type RaceLength } from '../../config/raceLengths';
import { formatVB6PrintedRow, type VB6PrintedRow } from '../vb6/vb6PrintedRow';
import { VB6_TRACE_ENABLED, recordTracePoint, clearTrace } from '../vb6/vb6TraceHook';

/**
 * Get race length in feet from race length key
 */
function getRaceLengthFt(raceLength: RaceLength | string): number {
  const info = RACE_LENGTH_INFO[raceLength as RaceLength];
  if (info) return info.lengthFt;
  
  // Fallback for legacy values
  if (raceLength === 'EIGHTH') return 660;
  if (raceLength === 'QUARTER') return 1320;
  return 1320; // Default to quarter mile
}

/**
 * Trace point for simulation output
 */
interface TracePoint {
  t_s: number;
  s_ft: number;
  v_fps: number;
  v_mph: number;
  a_g: number;
  rpm: number;           // Engine RPM
  dsrpm: number;         // Driveshaft RPM (engine side: EngRPM / TransGearRatio)
  lockRpm: number;       // Lock-up RPM (clutch/converter output)
  gear: number;
  slip: boolean;
  tireSlip: number;      // Tire slip factor (>1 means wheel spin)
  hp: number;            // Engine HP at wheels (after drivetrain losses)
  dragHp: number;        // Drag HP (power consumed by aerodynamic drag)
  netHp: number;         // Net HP = hp - dragHp (can be negative at terminal velocity)
  wheelSpeed_mph: number; // Wheel surface speed (car speed × tire slip)
  throttleStopActive?: boolean; // True when throttle stop is reducing power
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Map fuel string to VB6 fuel system type
 * 
 * VB6 Fuel System Types:
 * 1 = Gas + Carb
 * 2 = Gas + Inject
 * 3 = Methanol + Carb
 * 4 = Methanol + Inject
 * 5 = Nitro + Inject
 * 6 = Gas + Supercharged
 * 7 = Methanol + Supercharged
 * 8 = Nitro + Supercharged
 * 9 = Electric
 */
function getFuelSystemType(fuel: string | number | undefined): FuelSystemType {
  if (fuel === undefined || fuel === null) return 1;
  // If already a valid numeric fuel system type, return it directly
  if (typeof fuel === 'number') {
    return (Number.isFinite(fuel) && fuel >= 1 && fuel <= 9) ? fuel as FuelSystemType : 1;
  }
  const f = fuel.toUpperCase();
  
  // Handle unified fuel type values (new format)
  if (f === 'GASOLINE') return 1;
  if (f === 'GASOLINE EFI') return 2;
  if (f === 'METHANOL') return 3;
  if (f === 'METHANOL EFI') return 4;
  if (f === 'NITROMETHANE') return 5;
  if (f === 'SUPERCHARGED GASOLINE') return 6;
  if (f === 'SUPERCHARGED METHANOL') return 7;
  if (f === 'SUPERCHARGED NITRO') return 8;
  if (f === 'E85' || f === 'DIESEL') return 1; // Treat as gasoline for now
  
  // Handle VB6-style fuel system strings (e.g., "Gas+Carb", "Methanol+Inject")
  if (f === 'GAS+CARB' || f === 'GASOLINE+CARBURETOR') return 1;
  if (f === 'GAS+INJECT' || f === 'GASOLINE+FUEL INJECTION') return 2;
  if (f === 'METHANOL+CARB' || f === 'METHANOL+CARBURETOR') return 3;
  if (f === 'METHANOL+INJECT' || f === 'METHANOL+FUEL INJECTION') return 4;
  if (f === 'NITRO+INJECT' || f === 'NITROMETHANE+FUEL INJECTION') return 5;
  if (f === 'GAS+SUPERCHARGED' || f === 'GASOLINE+SUPERCHARGED') return 6;
  if (f === 'METHANOL+SUPERCHARGED') return 7;
  if (f === 'NITRO+SUPERCHARGED' || f === 'NITROMETHANE+SUPERCHARGED') return 8;
  if (f === 'ELECTRIC') return 9;
  
  // Handle legacy/descriptive strings (fallback)
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
 * Robustly resolve a fuelSystem value that may be a string, number, or undefined
 * to a numeric FuelSystemValue for use in buildEngineCurve / calcWork.
 */
function resolveFuelSystem(raw: unknown): FuelSystemValue {
  if (typeof raw === 'number' && Number.isFinite(raw) && raw >= 1 && raw <= 9) {
    return raw as FuelSystemValue;
  }
  if (typeof raw === 'string') {
    return getFuelSystemType(raw) as FuelSystemValue;
  }
  return 1 as FuelSystemValue;
}

/**
 * Extract HP curve arrays from input
 * 
 * Supports both QuarterPro mode (full HP curve) and QuarterJr mode (synthetic curve)
 */
function extractHPCurve(input: SimInputs): { 
  xrpm: number[]; 
  yhp: number[]; 
  NHP: number;
  isQuarterJr: boolean;
  quarterJrParams?: {
    peakHP: number;
    rpmAtPeakHP: number;
    displacement_cid: number;
    fuelSystem: FuelSystemValue;
  };
} {
  const vehicle = input.vehicle;
  const engine = (input as any).engine ?? (vehicle as any).engine;
  
  // VB6 CRITICAL: Check for explicit mode override
  // VB6 QuarterJr vs QuarterPro is a COMPILE-TIME decision, not runtime.
  // If mode is explicitly specified, respect it. Otherwise auto-detect.
  // VB6: #If ISQUARTERJR Or ISBVPRO Then gc_LaunchRPM.Value = Stall #End If
  const explicitMode = (input as any).mode ?? (input as any).simMode ?? 
                       (vehicle as any).mode ?? (vehicle as any).simMode;
  const forceQuarterJr = explicitMode === 'quarterJr' || explicitMode === 'jr';
  // Note: forceQuarterPro reserved for future explicit QuarterPro override
  
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
  
  // If we have a valid HP curve AND not forcing QuarterJr, use QuarterPro mode
  // VB6: QuarterPro uses full HP curve and user-specified LaunchRPM
  // VB6: QuarterJr forces LaunchRPM = Stall regardless of user input
  if (xrpm.length >= 2 && !forceQuarterJr) {
    return { xrpm, yhp, NHP: xrpm.length, isQuarterJr: false };
  }
  
  // If we have HP curve BUT forcing QuarterJr mode, use the curve with QuarterJr rules
  // This allows using a detailed HP curve while still applying QuarterJr behavior
  // (LaunchRPM = Stall, calculated efficiencies, etc.)
  if (xrpm.length >= 2 && forceQuarterJr) {
    const peakHP = Math.max(...yhp);
    const peakIdx = yhp.indexOf(peakHP);
    const rpmAtPeakHP = xrpm[peakIdx] ?? 6500;
    const displacement_cid = Number((vehicle as any).displacement_cid ?? (vehicle as any).displacementCID ?? 350);
    const fuelSystem = resolveFuelSystem((input as any).fuelSystem ?? (vehicle as any).fuelSystem);
    
    return { 
      xrpm, yhp, NHP: xrpm.length, 
      isQuarterJr: true,
      quarterJrParams: {
        peakHP,
        rpmAtPeakHP,
        displacement_cid,
        fuelSystem,
      }
    };
  }
  
  // QuarterJr mode without HP curve: Generate synthetic curve using ENGINE() function
  const peakHP = Number(vehicle.powerHP ?? (vehicle as any).peakHP);
  const rpmAtPeakHP = Number((vehicle as any).rpmAtPeakHP ?? (vehicle as any).peakRPM ?? 6500);
  const displacement_cid = Number((vehicle as any).displacement_cid ?? (vehicle as any).displacementCID ?? 350);
  const fuelSystem = resolveFuelSystem((input as any).fuelSystem ?? (vehicle as any).fuelSystem);
  
  if (Number.isFinite(peakHP) && peakHP > 0) {
    // Use VB6's ENGINE() function to generate synthetic curve
    const curve = buildEngineCurve({
      peakHP,
      peakRPM: rpmAtPeakHP,
      displacement_cid,
      fuelSystem,
    });
    
    // Convert to 0-indexed arrays
    const { rpm, hp } = convertToZeroIndexed(curve);
    
    return { 
      xrpm: rpm, 
      yhp: hp, 
      NHP: curve.NHP,
      isQuarterJr: true,
      quarterJrParams: {
        peakHP,
        rpmAtPeakHP,
        displacement_cid,
        fuelSystem,
      },
    };
  }
  
  // Last resort fallback (shouldn't happen with valid inputs)
  return { xrpm: [4000, 6500], yhp: [100, 150], NHP: 2, isQuarterJr: false };
}

/**
 * Calculate track temperature effect
 * VB6 TIMESLIP.FRM:863-870
 */
function calcTrackTempEffect(trackTempF: number): number {
  // VB6:
  // If gc_TrackTemp.Value > 100 Then
  //     TrackTempEffect = 1 + 0.0000025 * Abs(100 - gc_TrackTemp.Value) ^ 2.5
  // Else
  //     TrackTempEffect = 1 + 0.000002 * Abs(100 - gc_TrackTemp.Value) ^ 2.5
  // End If
  // If TrackTempEffect > 1.04 Then TrackTempEffect = 1.04
  
  const deviation = Math.abs(100 - trackTempF);
  let effect: number;
  
  if (trackTempF > 100) {
    effect = 1 + 0.0000025 * Math.pow(deviation, 2.5);
  } else {
    effect = 1 + 0.000002 * Math.pow(deviation, 2.5);
  }
  
  if (effect > 1.04) effect = 1.04;
  
  return effect;
}

/**
 * Generate VB6-style run trace printout
 * Matches the format from Quarter Pro's detailed results
 */
function generateRunTrace(trace: TracePoint[], rolloutIn: number, rolloutTime_s: number): string {
  const lines: string[] = [];
  
  // Header matching VB6 format
  lines.push('  Time     Distance    MPH  Accel   Gear    RPM');
  
  const rolloutFt = rolloutIn / 12;
  let rolloutFound = false;
  let lastPrintedTime = -0.25;
  
  for (let i = 0; i < trace.length; i++) {
    const pt = trace[i];
    const time = pt.t_s;
    const dist = pt.s_ft;
    const mph = pt.v_mph;
    const accel = pt.a_g;
    const gear = pt.gear;
    const rpm = pt.rpm;
    
    // Find rollout point
    if (!rolloutFound && dist >= rolloutFt) {
      rolloutFound = true;
      // Print rollout line (VB6 format: "0.146/0.00 Rollout")
      // First time is simulation time when rollout crossed, second is track time (0.00)
      const slipIndicator = pt.slip ? '(s)' : '';
      lines.push(
        `${rolloutTime_s.toFixed(2).padStart(5)}/0.00 Rollout  ${mph.toFixed(1).padStart(6)}  ${accel.toFixed(2)}${slipIndicator.padEnd(4)}    ${gear}  ${rpm.toFixed(0).padStart(6)}`
      );
      lastPrintedTime = time;
      continue;
    }
    
    // Print at regular intervals (~0.25s) or on gear changes
    const isFirst = i === 0;
    const isQuarterSecond = time - lastPrintedTime >= 0.24;
    const isGearChange = i > 0 && gear !== trace[i-1].gear;
    const isLast = i === trace.length - 1;
    
    if (isFirst || isQuarterSecond || isGearChange || isLast) {
      const slipIndicator = pt.slip ? '(s)' : '';
      const distStr = dist.toFixed(0).padStart(7);
      
      lines.push(
        `${time.toFixed(2).padStart(6)}  ${distStr}  ${mph.toFixed(1).padStart(6)}  ${accel.toFixed(2)}${slipIndicator.padEnd(4)}    ${gear}  ${rpm.toFixed(0).padStart(6)}`
      );
      lastPrintedTime = time;
    }
  }
  
  return lines.join('\n');
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
  debugData?: {
    fuelType: {
      resolved: string;
      fuelSystemType: number;
      vehicleFuelType?: string;
      vehicleFuelSystem?: string;
    };
    hpCurve: {
      length: number;
      peakHP: number;
      rpmRange: string;
    };
    airCalc: {
      rho_lbm_ft3: number;
      hpc: number;
    };
    simParams: {
      weight: number;
      tireDia: number;
      wheelbase: number;
      finalDrive: number;
      NGR: number;
      peakHP: number;
      stallRPM: number;
      slippage: number;
      isClutch: boolean;
      tractionIndex: number;
      trackTempEffect: number;
      pmi: { engine: number; trans: number; tires: number };
    };
    result: {
      et: number;
      mph: number;
    };
  };
  // VB6 Printed Row Stream - authoritative output for strict equivalence testing
  printedRows?: VB6PrintedRow[];
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
  
  // DEPRECATED: vb6Strict flag no longer affects numerical behavior
  // VB6 semantics (Double computation, Single assignment truncation via vb6AssignSingle)
  // are now ALWAYS active. The setFloat32Mode() call is kept for API compatibility only.
  // See vb6SimulationStep.ts for details on the refactoring.
  //
  // TODO: Remove this entire block once vb6Strict is retired from SimInputs.
  // Steps to remove:
  // 1. Remove vb6Strict from SimInputs type (if defined there)
  // 2. Remove this const and setFloat32Mode() call
  // 3. Remove setFloat32Mode import from this file
  // 4. Remove setFloat32Mode export from vb6SimulationStep.ts
  const vb6Strict = (input as any).vb6Strict ?? false;
  setFloat32Mode(vb6Strict);  // No-op, kept for API compatibility
  
  // Race length - default to quarter mile (1320 ft)
  // Support all track types from raceLengths.ts
  const raceLength = (input as any).raceLength ?? 'QUARTER';
  const raceLengthFt = (input as any).raceLengthFt ?? getRaceLengthFt(raceLength);
  
  // Determine if this is a land speed run (uses different constants)
  // VB6: TIMESLIP.FRM:550-570 - different constants for ISBVPRO
  const isLandSpeed = RACE_LENGTH_INFO[raceLength as RaceLength]?.category === 'landspeed';
  
  // VB6 Rollout/Overhang timing geometry:
  // 
  // STAGING: Front tire sits on stage beam, nose is ahead by overhang distance
  // 
  // TIMER START: When front tire rolls through "rollout" distance (back of tire clears beam)
  //   - At this moment, the ENTIRE CAR has moved "rollout" inches forward
  //   - The nose has moved "rollout" inches from its staged position
  // 
  // TIMER STOP: When the NOSE crosses the finish line (60ft, 330ft, etc.)
  //   - The nose is "overhang" inches ahead of the front wheel centerline
  //   - So when nose is at 60ft, front wheel is at (60ft - overhang)
  // 
  // Since we simulate from the rear tires, we need to account for:
  //   - rollout: distance car travels before timer starts
  //   - overhang: nose is ahead of front wheel (gives us a "head start" at finish)
  //
  // VB6: The simulation tracks rear tire position. When reporting times:
  //   - Timer starts when car has moved "rollout" distance
  //   - Distance is measured to where the NOSE would be (rear + wheelbase + overhang)
  //
  // VB6 Bonneville Pro has no staging beam — rollout/overhang are drag-only concepts.
  // VB6 BonnevillePro: timer starts at t=0, d=0 (no rollout offset).
  // Confirmed by fixture normalizer: "BonnevillePro: rolloutIn does NOT exist (no staging)"
  const rolloutIn = isLandSpeed ? 0 : ((vehicle as any).rolloutIn ?? 9);  // Staging beam rollout (inches)
  const overhangIn = isLandSpeed ? 0 : ((vehicle as any).overhangIn ?? 0); // Front overhang (inches)
  
  // VB6 TIMESLIP.FRM lines 809-815: Calculate overhang adjustment
  // ftd = front tire diameter = 2 * rollout (minimum 24")
  // ovradj = (overhang + 0.25 * ftd) / 12 (minimum 0.5 * ftd / 12)
  // Land speed: no overhang adjustment (no staging beam geometry)
  let ftd = 2 * rolloutIn;
  if (ftd < 24) ftd = isLandSpeed ? 0 : 24;
  let ovradj = isLandSpeed ? 0 : (overhangIn + 0.25 * ftd) / 12;
  const minOvradj = isLandSpeed ? 0 : 0.5 * ftd / 12;
  if (ovradj < minOvradj) ovradj = minOvradj;
  
  // First distance checkpoint is at rollout/12 feet
  const rolloutFt = rolloutIn / 12;
  
  // Extract drivetrain components - check both input level and vehicle level
  const drivetrain = (input as any).drivetrain ?? (vehicle as any).drivetrain;
  const clutch = drivetrain?.clutch ?? (input as any).clutch ?? (vehicle as any).clutch;
  const converter = drivetrain?.converter ?? (input as any).converter ?? (vehicle as any).converter;
  const engine = (input as any).engine ?? (vehicle as any).engine;
  const pmi = (input as any).pmi ?? (vehicle as any).pmi;
  
  // Extract throttle stop configuration (for bracket racing)
  const throttleStopConfig = input.throttleStop;
  const throttleStopParams: ThrottleStopParams | undefined = throttleStopConfig?.enabled ? {
    enabled: true,
    activateTime_s: throttleStopConfig.activateTime_s,
    duration_s: throttleStopConfig.duration_s,
    throttlePct: throttleStopConfig.throttlePct,
    rampTime_s: throttleStopConfig.rampTime_s,
  } : undefined;
  
  // Determine transmission type
  // Check transmissionType field first (set by fixtureToSimInputs), then fall back to object detection
  const txType = (vehicle as any).transmissionType ?? (input as any).transmissionType;
  const isClutch = txType === 'clutch' ? true : 
                   txType === 'converter' ? false :
                   !converter || (clutch && !converter);
  
  // ========================================================================
  // Calculate air density and hpc
  // ========================================================================
  // Extract fuel type - could be a string or an object with fuelType/fuelSystem property
  // Priority: fuelType (modern) > fuelSystem (legacy VB6 format)
  const rawFuel = (input as any).fuel;
  const fuelString: string | undefined = typeof rawFuel === 'string' 
    ? rawFuel 
    : (rawFuel?.fuelType ?? rawFuel?.fuelSystem ?? rawFuel?.type ?? (input as any).fuelType ?? (vehicle as any).fuelType ?? (input as any).fuelSystem ?? (vehicle as any).fuelSystem);
  const fuelSystemType = getFuelSystemType(fuelString);
  
  // Extract temperature first - needed for trackTemp default
  const temperatureF = env.temperatureF ?? 59;
  
  const airResult = airDensityVB6({
    barometer_inHg: env.barometerInHg ?? 29.92,
    temperature_F: temperatureF,
    relHumidity_pct: env.humidityPct ?? 50,
    elevation_ft: env.elevation ?? 0,
    fuelSystem: fuelSystemType,
  });
  
  // VB6 Quarter Jr: trackTemp = temperature + 30 when not specified
  // See MDI.FRM lines 883-885: gc_TrackTemp.Value = degf + 30
  const trackTempF = env.trackTempF ?? (temperatureF + 30);
  
  // VB6 uses rho in lbm/ft³ (multiply slugs by gc)
  const rho_lbm_ft3 = airResult.rho_slug_per_ft3 * gc;
  const hpc = airResult.hpc;
  
  // ========================================================================
  // Build VB6 vehicle params
  // ========================================================================
  const hpCurveResult = extractHPCurve(input);
  const { xrpm, yhp, NHP, isQuarterJr, quarterJrParams } = hpCurveResult;
  
  if (NHP < 2) {
    warnings.push('HP curve has fewer than 2 points');
  }
  
  if (isQuarterJr) {
    warnings.push('Using QuarterJr mode (synthetic HP curve from peak HP)');
  }
  
  // Get gear ratios - check both drivetrain and vehicle level
  const gearRatios = drivetrain?.gearRatios ?? (vehicle as any).gearRatios ?? [2.5, 1.8, 1.4, 1.1, 1.0];
  const finalDrive = drivetrain?.finalDriveRatio ?? (vehicle as any).finalDrive ?? vehicle.rearGear ?? 3.73;
  const NGR = gearRatios.length;
  
  // Tire dimensions - check nested tire object (fixture format) and flat properties
  // VB6 TIMESLIP.FRM:683-687 - If tire is specified as circumference (rollout), divide by PI
  // If gc_TireDia.UOM = UOM_NORMAL Then TireDia = gc_TireDia.Value
  // Else TireDia = gc_TireDia.Value / PI
  const tire = (vehicle as any).tire;
  const tireRolloutIn = (vehicle as any).tireRolloutIn ?? tire?.rollout_in;
  const tireDiaIn = tire?.diameter_in ?? vehicle.tireDiaIn ?? (vehicle as any).tireDiameterIn ??
    (tireRolloutIn ? tireRolloutIn / PI : 32);  // VB6: TireDia = TireRollout / PI
  const tireWidthIn = tire?.width_in ?? vehicle.tireWidthIn ?? 17;
  
  // Body style - calculate from weight if not provided (VB6: QTRPERF.BAS CalcBodyStyle)
  const bodyStyle = (vehicle as any).bodyStyle ?? calcBodyStyle(vehicle.weightLb);
  
  // ========================================================================
  // QuarterJr vs QuarterPro mode handling
  // VB6: TIMESLIP.FRM lines 699-806
  // ========================================================================
  let TGEff: number[];
  let shiftRPMs: number[];
  let stallRPM: number;
  let slippage: number;
  let torqueMult: number;
  let enginePMI: number;
  let transPMI: number;
  let tiresPMI: number;
  let overallEfficiency: number;
  let dragCoef: number;
  let liftCoef: number;
  let overhangInCalc: number;
  
  // Extract HPTQMult early - needed for stall calculation
  // VB6: gc_HPTQMult.Value is used in stall index calculation (lines 928-929)
  const hpTqMult_early = (vehicle as any).hpTorqueMultiplier ?? (input as any).engine?.hpTqMult ?? 1.0;
  
  if (isQuarterJr && quarterJrParams) {
    // ====================================================================
    // QuarterJr Mode: Calculate all derived parameters
    // VB6: TIMESLIP.FRM lines 714-806 (#Else branch)
    // ====================================================================
    const { displacement_cid, fuelSystem } = quarterJrParams;
    
    // Calculate transmission efficiencies (VB6: TIMESLIP.FRM lines 721-737)
    TGEff = calcTransEfficiencies(NGR, !isClutch);
    
    // Single shift RPM for all gears (VB6: TIMESLIP.FRM lines 726, 736)
    // VB6 ShiftRPM is declared as Integer, so values are truncated
    const singleShiftRPM = Math.trunc((vehicle as any).shiftRPM ?? drivetrain?.shiftRPM ?? 7000);
    shiftRPMs = gearRatios.map(() => singleShiftRPM);
    
    // Calculate slippage and torque multiplier (VB6: TIMESLIP.FRM lines 729-754)
    const inputSlipStall = clutch?.slipRPM ?? converter?.stallRPM ?? 
                           (vehicle as any).slipStallRPM ?? 5000;
    
    if (isClutch) {
      // Clutch: gc_Slippage.Value = 1.0025 + gc_SlipStallRPM.Value / 1000000
      slippage = calcClutchSlippage(inputSlipStall);
      torqueMult = 1;
      stallRPM = inputSlipStall;
    } else {
      // Converter: Calculate from stall RPM or index
      const converterDia = converter?.diameter_in ?? converter?.diameter ?? (vehicle as any).converterDiameterIn ?? (vehicle as any).converterDia_in ?? 10;
      let work: number;
      
      if (inputSlipStall > 220) {
        // Direct RPM input - VB6: TIMESLIP.FRM line 921-922
        stallRPM = inputSlipStall;
        const shp = taby(xrpm, yhp, NHP, 1, stallRPM);
        const stq = shp * (Z6 / stallRPM) / hpc;
        work = (stallRPM / 1000) * (stallRPM / stq);
      } else {
        // Stall index input - VB6: TIMESLIP.FRM lines 923-946
        // Calculate stall RPM from index using torque curve intersection
        work = inputSlipStall;
        
        // Build torque array from HP curve: ztq(i) = yhp(i) * (Z6 / xrpm(i))
        const ztq: number[] = [];
        for (let i = 0; i < NHP; i++) {
          ztq.push(yhp[i] * (Z6 / xrpm[i]));
        }
        
        // VB6: atf = 1 / (1000 * gc_SlipStallRPM.Value)
        const atf = 1 / (1000 * inputSlipStall);
        let calculatedStall = 0;
        
        // VB6: TIMESLIP.FRM lines 926-945 - Find torque curve intersection
        for (let k = 1; k < NHP; k++) {
          const k1 = k - 1;
          
          // VB6: B = gc_HPTQMult.Value * (ztq(k) - ztq(k1)) / (hpc * (xrpm(k) - xrpm(k1)))
          const B = hpTqMult_early * (ztq[k] - ztq[k1]) / (hpc * (xrpm[k] - xrpm[k1]));
          // VB6: c = gc_HPTQMult.Value * ztq(k) / hpc - xrpm(k) * B
          const c = hpTqMult_early * ztq[k] / hpc - xrpm[k] * B;
          // VB6: z = B ^ 2 + 4 * atf * c
          const z = B * B + 4 * atf * c;
          
          let r1 = 0;
          let r2 = 0;
          
          if (z > 0) {
            const sqrtZ = Math.sqrt(z);
            r1 = (B + sqrtZ) / (2 * atf);
            r2 = (B - sqrtZ) / (2 * atf);
          }
          
          // VB6: Check if roots are within this segment
          if (r1 < xrpm[k1] && k > 1) r1 = 0;
          if (r2 < xrpm[k1] && k > 1) r2 = 0;
          if (r1 > xrpm[k] && k < NHP - 1) r1 = 0;
          if (r2 > xrpm[k] && k < NHP - 1) r2 = 0;
          
          if (r1 > 0) calculatedStall = r1;
          if (r2 > 0) calculatedStall = r2;
        }
        
        // VB6: Stall = Round(Stall, 20) - round to 20 decimal places
        // Note: VB6 Round(x, n) rounds to n decimal places, NOT to nearest n
        // For 100% fidelity, we round to 20 decimal places (essentially a no-op but exact match)
        calculatedStall = Math.round(calculatedStall * 1e20) / 1e20;
        
        // VB6: Check calculated stall RPM against limits (lines 948-971)
        // Line 949-958: If Stall < xrpm(1), clamp to xrpm(1)
        if (calculatedStall < xrpm[0]) {
          calculatedStall = xrpm[0];
        }
        
        stallRPM = calculatedStall > 0 ? calculatedStall : xrpm[0];
        
        // VB6 lines 961-971: If Stall >= ShiftRPM(1), clamp to ShiftRPM(1) - 100
        const shiftRPM1 = shiftRPMs[0] ?? 0;
        if (shiftRPM1 > 0 && stallRPM >= shiftRPM1) {
          stallRPM = shiftRPM1 - 100;
        }
      }
      
      // VB6: lrat = Work / (200 * (7 / gc_ConvDia.Value) ^ 4)
      const lrat = work / (200 * Math.pow(7 / converterDia, 4));
      
      // VB6: gc_Slippage.Value = 1.01 + lrat / 20 + Work / 8000
      slippage = 1.01 + lrat / 20 + work / 8000;
      
      // VB6: TQMult = 2.633 - lrat ^ 0.3 - Work / 1500
      torqueMult = 2.633 - Math.pow(lrat, 0.3) - work / 1500;
      if (torqueMult < 1) torqueMult = 1;
      if (torqueMult > 2) torqueMult = 2;
    }
    
    // VB6 TIMESLIP.FRM:984-988 - Recalculate slippage for QuarterJr clutch
    // CRITICAL: After stall RPM is calculated, slippage must be recalculated
    // using the CALCULATED stallRPM, not the input slipStallRPM!
    // VB6: #If ISQUARTERJR Then
    //        If Not gc_TransType.Value Then gc_Slippage.Value = 1.0025 + Stall / 1000000
    //      #End If
    if (isClutch) {
      slippage = 1.0025 + stallRPM / 1000000;
    }
    
    // Calculate efficiency (VB6: TIMESLIP.FRM lines 760-765)
    overallEfficiency = calcEfficiency(bodyStyle);
    
    // Get aero coefficients from body style (VB6: TIMESLIP.FRM lines 767-777)
    const aero = getAeroByBodyStyle(bodyStyle);
    dragCoef = aero.dragCoef;
    liftCoef = aero.liftCoef;
    overhangInCalc = aero.overhang_in;
    
    // Calculate PMI values (VB6: TIMESLIP.FRM lines 780-805)
    const pmi = calcPMI(
      displacement_cid,
      fuelSystem,
      !isClutch,
      NGR,
      tireDiaIn,
      tireWidthIn,
      bodyStyle
    );
    enginePMI = pmi.enginePMI;
    transPMI = pmi.transPMI;
    tiresPMI = pmi.tiresPMI;
    
  } else {
    // ====================================================================
    // QuarterPro Mode: Use user-provided values
    // VB6: TIMESLIP.FRM lines 699-713 (#If ISQUARTERPRO branch)
    // ====================================================================
    
    // Gear efficiencies - use from fixture/vehicle (check multiple property names)
    const gearEfficiencies = drivetrain?.perGearEff ?? 
                             (vehicle as any).gearEfficiencies ?? 
                             (vehicle as any).gearEff ?? 
                             null;
    TGEff = gearEfficiencies ?? gearRatios.map(() => 0.99);
    
    // Per-gear shift RPMs (check all common property names)
    // For N gears, we need N-1 shift points (1→2, 2→3, etc.)
    // VB6 ShiftRPM is declared as Integer, so values are truncated
    const rawShiftRPMs = drivetrain?.shiftRPMs ?? drivetrain?.shiftsRPM ?? 
                (vehicle as any).shiftRPMs ?? (vehicle as any).shiftsRPM ?? 
                (vehicle as any).shiftRPM ?? gearRatios.map(() => 7000);
    
    // Validate and trim shift RPMs to correct length (NGR - 1)
    const expectedShiftCount = gearRatios.length - 1;
    if (Array.isArray(rawShiftRPMs) && rawShiftRPMs.length > expectedShiftCount) {
      // Trim extra values (e.g., [9200, 9400, 100] → [9200, 9400] for 3 gears)
      // Also truncate to integer to match VB6 Integer type
      shiftRPMs = rawShiftRPMs.slice(0, expectedShiftCount).map((rpm: number) => Math.trunc(rpm));
      warnings.push(`Shift RPMs trimmed from ${rawShiftRPMs.length} to ${expectedShiftCount} values`);
    } else {
      // Truncate to integer to match VB6 Integer type
      shiftRPMs = Array.isArray(rawShiftRPMs) 
        ? rawShiftRPMs.map((rpm: number) => Math.trunc(rpm))
        : [Math.trunc(rawShiftRPMs)];
    }
    
    // Get stall/slip RPM
    const clutchSlipRPM = clutch?.slipRPM ?? (vehicle as any).clutchSlipRPM ?? 7200;
    const converterStallRPM = converter?.stallRPM ?? (vehicle as any).converterStallRPM ?? 5500;
    stallRPM = isClutch ? clutchSlipRPM : converterStallRPM;
    
    // VB6 TIMESLIP.FRM:973-981 - QuarterPro converter stall validation
    // If LaunchRPM > Stall for converters, clamp Stall = LaunchRPM
    // Note: This is QuarterPro only (QuarterJr sets LaunchRPM = Stall anyway)
    if (!isClutch) {
      const converterLaunchRPM = (vehicle as any).converterLaunchRPM ?? converter?.launchRPM ?? stallRPM;
      if (converterLaunchRPM > stallRPM) {
        stallRPM = converterLaunchRPM;
      }
    }
    
    // VB6 TIMESLIP.FRM:699-713 - QuarterPro does NOT calculate slippage!
    // In QuarterPro mode, slippage comes from user input, NOT calculated
    // The gc_Slippage.IsCalc = True line is ONLY in QuarterJr mode (line 719)
    if (isClutch) {
      // QuarterPro clutch: Use user-provided slippage value
      // Check multiple property names for compatibility
      slippage = clutch?.slippage ?? clutch?.slipRatio ?? 
                 (vehicle as any).clutchSlippage ?? (vehicle as any).slippage ?? 1.004;
    } else {
      // QuarterPro converter: Use user-provided slippage value
      slippage = converter?.slippageFactor ?? converter?.slippage ?? 
                 (vehicle as any).converterSlippage ?? 1.06;
    }
    
    // Get torque multiplier
    torqueMult = isClutch 
      ? 1.0 
      : (converter?.torqueMult ?? converter?.torqueMultiplier ?? (vehicle as any).converterTorqueMult ?? 2.2);
    
    // PMI values from user input - check pmi object first, then flat vehicle properties
    enginePMI = pmi?.engine_flywheel_clutch ?? (vehicle as any).enginePMI ?? engine?.enginePMI ?? 4.0;
    tiresPMI = pmi?.tires_wheels_ringgear ?? (vehicle as any).tiresPMI ?? engine?.tiresPMI ?? 0.5;
    transPMI = pmi?.transmission_driveshaft ?? (vehicle as any).transPMI ?? engine?.transPMI ?? 0.2;
    
    // Overall drivetrain efficiency
    // VB6 applies BOTH TGEff (per-gear) AND gc_Efficiency (overall) separately:
    // - TGEff is applied in the HP chain: HP * TGEff * Efficiency
    // - gc_Efficiency is applied in force calculation: force = TQ * FinalDrive * Efficiency / ...
    // PRIORITY: Check vehicle-level properties FIRST (explicit user values)
    // Only use drivetrain efficiency if it's NOT the default 0.97
    // FALLBACK: Use VB6-calculated efficiency by body style (0.985 for motorcycle, 0.97 for car)
    const vehicleLevelEff = (vehicle as any).transEff ?? (vehicle as any).transEfficiency ?? 
                        (vehicle as any).finalDriveEfficiency ?? vehicle.finalDriveEfficiency ??
                        (input as any).vehicle?.transEff ?? (input as any).transEff;
    const drivetrainEff = drivetrain?.overallEfficiency ?? drivetrain?.overallEff;
    // Use drivetrain efficiency ONLY if it's an explicit value (not the 0.97 default)
    const explicitDrivetrainEff = (drivetrainEff !== undefined && drivetrainEff !== 0.97) ? drivetrainEff : undefined;
    // Final priority: vehicle > explicit drivetrain > VB6 calculated
    overallEfficiency = vehicleLevelEff ?? explicitDrivetrainEff ?? calcEfficiency(bodyStyle);
    
    // Aero coefficients from user input - check aero object first
    const aero = (input as any).aero ?? (vehicle as any).aero;
    dragCoef = aero?.Cd ?? aero?.cd ?? vehicle.cd ?? 0.35;
    liftCoef = aero?.Cl ?? aero?.cl ?? vehicle.liftCoeff ?? 0;
    overhangInCalc = overhangIn;
  }
  
  // ========================================================================
  // VB6 TIMESLIP.FRM lines 1005-1043: Calculate launch conditions
  // YCG and StaticFWt are CALCULATED by VB6, not user inputs
  // ========================================================================
  
  // VB6 TIMESLIP.FRM:1032 - YCG = (TireDia / 2) + 3.75
  const YCG_in = (tireDiaIn / 2) + 3.75;
  
  // Calculate TireSlip at launch (VB6 TIMESLIP.FRM:872)
  // TireSlip = 1.02 + (TractionIndex - 1) * 0.005 + (TrackTempEffect - 1) * 3
  // trackTempF already calculated earlier with VB6 default (temp + 30)
  const trackTempEffect_early = isLandSpeed ? 1 : calcTrackTempEffect(trackTempF);
  const tractionIndex_early = env.tractionIndex ?? 5;
  const tireSlipAtLaunch = 1.02 + (tractionIndex_early - 1) * 0.005 + (trackTempEffect_early - 1) * 3;
  
  // Constants from VB6 TIMESLIP.FRM:551-559
  const FRCT = 1.03;
  const CMU = 0.025;  // VB6 TIMESLIP.FRM:552
  
  const wheelbaseIn = vehicle.wheelbaseIn ?? 100;
  const weight = vehicle.weightLb;
  
  // VB6 TIMESLIP.FRM:1010-1011 - Get HP at launch RPM, apply weather correction
  // VB6: HP = gc_HPTQMult.Value * HP / hpc
  const launchRPM_calc = isClutch 
    ? (clutch?.launchRPM ?? (vehicle as any).clutchLaunchRPM ?? stallRPM) 
    : stallRPM;
  const HP_launch_calc = taby(xrpm, yhp, NHP, 1, launchRPM_calc);
  // Use hpTqMult_early (defined earlier for stall calculation)
  const HP_corrected = hpTqMult_early * HP_launch_calc / hpc;
  
  // VB6 TIMESLIP.FRM:1013-1014 - Calculate torque at wheels
  // TQ = Z6 * HP / RPM * TorqueMult * GearRatio * GearEff
  const TQ = 5252 * HP_corrected / launchRPM_calc * torqueMult * gearRatios[0] * TGEff[0];
  
  // VB6 TIMESLIP.FRM:1016-1019 - Calculate DragForce at launch
  // At Vel=0, wind still creates dynamic pressure
  // WindFPS = Sqr(Vel^2 + 2*Vel*WindSpeed*Cos(angle) + WindSpeed^2) = WindSpeed at Vel=0
  const windMph = env.windMph ?? 0;
  // Note: windAngle doesn't matter at Vel=0 since the velocity term is 0
  const Z5 = 0.681818; // mph to fps conversion factor (3600/5280)
  const windFPS = windMph / Z5;
  const q_launch = windFPS > 0 ? rho_lbm_ft3 * windFPS * windFPS / (2 * gc) : 0;
  const frontalArea = (input as any).aero?.frontalArea_ft2 ?? vehicle.frontalArea_ft2 ?? (vehicle as any).frontalAreaFt2 ?? 20;
  const dragForceAtLaunch = CMU * weight + dragCoef * frontalArea * q_launch;
  
  // VB6 TIMESLIP.FRM:1020 - Calculate force at tire
  // force = TQ * FinalDrive * Efficiency / (TireSlip * TireDia / 24) - DragForce
  const force = TQ * finalDrive * overallEfficiency / (tireSlipAtLaunch * tireDiaIn / 24) - dragForceAtLaunch;
  
  // VB6 TIMESLIP.FRM:1023-1027 - Estimate Ags0
  // VB6: If gc_TransType.Value Then Ags0 = 0.96 * force / Weight (converter = 4% losses)
  //      Else Ags0 = 0.88 * force / Weight (clutch = 12% losses)
  // gc_TransType.Value = True means CONVERTER, False means CLUTCH (see line 703, 721-722)
  const launchEfficiency = isClutch ? 0.88 : 0.96;
  const Ags0 = launchEfficiency * force / weight;
  
  // VB6 TIMESLIP.FRM:1035-1036 - Call Tire() to get TireCirFt, then TireRadIn
  // At launch (Vel=0): TireGrowth = 1, TireSQ = 1 - 0.035 * Abs(Ags0)
  // TireCirFt = TireSQ * TireDia * PI / 12
  // TireRadIn = 12 * TireCirFt / (2 * PI) = TireSQ * TireDia / 2
  const tireSQ = 1 - 0.035 * Math.abs(Ags0);
  const tireRadIn = tireSQ * tireDiaIn / 2;
  
  // VB6 TIMESLIP.FRM:1037 - Calculate deltaFWT
  // deltaFWT = (Ags0 * Weight * ((YCG - TireRadIn) + (FRCT / Efficiency) * TireRadIn) + DragForce * YCG) / Wheelbase
  const deltaFWT = (Ags0 * weight * ((YCG_in - tireRadIn) + (FRCT / overallEfficiency) * tireRadIn) + dragForceAtLaunch * YCG_in) / wheelbaseIn;
  
  // VB6 TIMESLIP.FRM:1043 - StaticFWt = deltaFWT (since DynamicFWT = 0 at launch)
  const staticFWt = deltaFWT;
  
  // Use calculated overhang for QuarterJr mode, user input for QuarterPro
  const finalOverhang = isQuarterJr ? overhangInCalc : overhangIn;
  
  const vb6Vehicle: VB6VehicleParams = {
    Weight_lbf: vehicle.weightLb,
    Wheelbase_in: vehicle.wheelbaseIn ?? 100,
    YCG_in,
    StaticFWt_lbf: staticFWt,
    TireDia_in: tireDiaIn,
    TireWidth_in: tireWidthIn,
    Rollout_in: vehicle.rolloutIn ?? 12,
    Overhang_in: finalOverhang,
    
    GearRatio: finalDrive,
    TGR: gearRatios,
    TGEff,
    Efficiency: overallEfficiency,
    DTShift: isClutch ? 0.2 : 0.25, // VB6 TIMESLIP.FRM:702-703, 722, 732
    Slippage: slippage,
    TorqueMult: torqueMult,
    Stall: stallRPM,
    LockUp: isClutch ? (clutch?.lockup ?? false) : (converter?.lockup ?? false),
    isClutch,
    
    // Use calculated aero for QuarterJr, user input for QuarterPro
    // Check aero object first (fixture format), then flat vehicle properties
    RefArea_ft2: (input as any).aero?.frontalArea_ft2 ?? vehicle.frontalArea_ft2 ?? (vehicle as any).frontalAreaFt2 ?? 20,
    DragCoef: dragCoef,
    LiftCoef: liftCoef,
    BodyStyle: bodyStyle,
    
    EnginePMI: enginePMI,
    TiresPMI: tiresPMI,
    TransPMI: transPMI,
    
    xrpm,
    yhp,
    NHP,
    HPTQMult: hpTqMult_early,
    
    ShiftRPM: shiftRPMs,
    NGR,
    // VB6 TIMESLIP.FRM:991-993 - LaunchRPM handling
    // CRITICAL: For QuarterJr AND BonnevillePro, LaunchRPM is ALWAYS set to Stall!
    // Only QuarterPro uses user-provided LaunchRPM values.
    // VB6: #If ISQUARTERJR Or ISBVPRO Then gc_LaunchRPM.Value = Stall #End If
    LaunchRPM: (isQuarterJr || isLandSpeed) 
      ? stallRPM  // QuarterJr/BVPro: LaunchRPM = Stall (VB6 line 992)
      : (isClutch 
          ? ((vehicle as any).clutchLaunchRPM ?? clutch?.launchRPM ?? stallRPM) 
          : ((vehicle as any).converterLaunchRPM ?? converter?.launchRPM ?? stallRPM)),
    
    // Shift by Time (alternative to shift by RPM)
    ShiftMode: (vehicle as any).shiftMode ?? 'rpm',
    ShiftTimes: (vehicle as any).shiftTimes ?? [],
    
    // Rev Limiter
    RevLimiterRPM: (vehicle as any).revLimiterRPM ?? 0,
  };
  
  // Update overhang adjustment if using QuarterJr calculated value
  if (isQuarterJr && finalOverhang !== overhangIn) {
    let ftdCalc = 2 * rolloutIn;
    if (ftdCalc < 24) ftdCalc = 24;
    ovradj = (finalOverhang + 0.25 * ftdCalc) / 12;
    const minOvradjCalc = 0.5 * ftdCalc / 12;
    if (ovradj < minOvradjCalc) ovradj = minOvradjCalc;
  }
  
  // ========================================================================
  // Build VB6 environment params
  // ========================================================================
  // trackTempF already calculated earlier with VB6 default (temp + 30)
  // VB6: TIMESLIP.FRM:874 - Bonneville Pro forces TrackTempEffect = 1
  const trackTempEffect = isLandSpeed ? 1 : calcTrackTempEffect(trackTempF);
  
  // VB6 distance print points (in feet, from rear tire position)
  // VB6: TIMESLIP.FRM:815-817 - DistToPrint array
  // VB6: If DistToPrint(1) = 0 Then DistToPrint(1) = 1 (lines 815, 822, etc.)
  // These are used for distance targeting to hit exact print points
  const rolloutTarget = rolloutFt > 0 ? rolloutFt : 1;  // VB6: If rollout = 0, use 1ft
  // VB6 TIMESLIP.FRM distance print points:
  // Quarter mile: rollout, 30ft, 60ft, 330ft, 594ft, 660ft, 1000ft, 1254ft, 1320ft
  //   594 and 1254 are internal trap-speed save-time distances (not printed)
  // Bonneville: rollout, then 1.0, 2.0, 2.5, 3.0, 3.5, 4.0, 4.5, 5.0 miles (converted to feet)
  const distPrintPoints = isLandSpeed 
    ? [rolloutTarget, 5280, 10560, 13200, 15840, 18480, 21120, 23760, 26400] // Bonneville (miles * 5280)
    : [rolloutTarget, 30, 60, 330, 594, 660, 1000, 1254, 1320];              // Quarter mile
  let distPrintIdx = 0;
  
  // VB6 TIMESLIP.FRM:878-918 - Calculate TimePrintInc based on estimated ET
  // VB6 uses a physics-based ET estimate and specific kd values
  
  // VB6 line 879: hpmax calculation for ET estimate
  const TGEff1 = TGEff[0] ?? 0.99;
  const peakHP_et = Math.max(...yhp);
  const hpmax_et = (peakHP_et * hpTqMult_early / hpc) * TGEff1 * overallEfficiency / (slippage * tireSlipAtLaunch);
  
  // VB6 line 882 (Quarter Pro): ET = (TrackTempEffect ^ 0.25) * (1.8 + 4.2 * (hpmax / Weight) ^ (-1/3))
  // VB6 line 884-886 (Bonneville Pro): vmax formula
  let estimatedET: number;
  if (isLandSpeed) {
    // Bonneville Pro formula
    const vmax1 = 0.95 * Math.pow(2 * 32.174 * 550 * hpmax_et / (rho_lbm_ft3 * dragCoef * frontalArea), 1/3);
    const vmax2 = vmax1 * Math.pow(hpmax_et / vehicle.weightLb, 0.2);
    estimatedET = distPrintPoints[8] / (vmax2 * 0.72);
  } else {
    // Quarter Pro formula (line 882)
    estimatedET = Math.pow(trackTempEffect, 0.25) * (1.8 + 4.2 * Math.pow(hpmax_et / vehicle.weightLb, -1/3));
  }
  // VB6 line 888: motorcycle adjustment
  if (bodyStyle === 8) estimatedET = 1.04 * estimatedET;
  
  // VB6 lines 890-900: kd values
  // ISQUARTERPRO && ISBVPRO: kd = 29 (line 892)
  // ISQUARTERPRO && !ISBVPRO: kd = 33 (line 894)
  // !ISQUARTERPRO (Quarter Jr): kd = 28 (line 898)
  let kd: number;
  if (isLandSpeed) {
    kd = 29;  // Bonneville Pro
  } else if (isQuarterJr) {
    kd = 28;  // Quarter Jr
  } else {
    kd = 33;  // Quarter Pro
  }
  // VB6 line 896: Quarter Pro motorcycle: kd = kd - 1
  // VB6 line 899: Quarter Jr motorcycle: kd = kd - 7
  if (bodyStyle === 8) {
    kd = isQuarterJr ? kd - 7 : kd - 1;
  }
  
  // VB6 lines 902-917: Find smallest TimePrintInc where z < kd
  let TimePrintInc = 0.25;
  const timePrintOptions = [0.25, 0.5, 1, 2, 3, 4, 5, 10, 15, 20, 25, 30, 35, 40, 50, 100];
  for (const inc of timePrintOptions) {
    const z = estimatedET / inc + 2 * (NGR - 1);
    if (z < kd) {
      TimePrintInc = inc;
      break;
    }
  }
  
  // Override for Bonneville Pro: VB6 uses 10s time print intervals for land speed runs
  // This matches the VB6 BonnevillePro output format
  if (isLandSpeed) {
    TimePrintInc = 10.0;
  }
  
  // Assertion: Verify TimePrintInc matches expected values for each mode
  // QuarterPro = 0.5s, QuarterJr = 1.0s, Bonneville = 10.0s
  const expectedTimePrintInc = isLandSpeed ? 10.0 : (isQuarterJr ? 1.0 : 0.5);
  if (TimePrintInc !== expectedTimePrintInc) {
    console.warn(`[vb6Exact] TimePrintInc mismatch: got ${TimePrintInc}, expected ${expectedTimePrintInc} for ${isLandSpeed ? 'Bonneville' : isQuarterJr ? 'QuarterJr' : 'QuarterPro'}`);
  }
  
  // nextEtPrint_s is the NEXT time print target in ET space (elapsed time from rollout)
  // absTimePrint_s is computed each loop as timerStartTime_s + nextEtPrint_s
  let nextEtPrint_s = TimePrintInc;  // VB6: TimePrint = TimePrintInc (line 918)
  let Shift2PrintTime: number | undefined = undefined;  // VB6 line 1071 - set ONCE when ShiftFlag transitions 1→2
  
  // VB6 TIMESLIP.FRM:818 - MPHtoPrint array for VelMPHMatch velocity revision
  // Quarter Pro: Only 60 MPH print (based on fixture analysis)
  // Bonneville: 100 MPH and 200 MPH prints
  // Z5 = 3600/5280 = 0.681818 (already defined above)
  const MPHtoPrint = isLandSpeed 
    ? [100 / Z5, 200 / Z5]  // Bonneville: 100 and 200 MPH
    : [60 / Z5];            // Quarter Pro: 60 MPH only
  let iMPH = 1;  // VB6 TIMESLIP.FRM:1002 - iMPH starts at 1
  const maxMPHPrints = isLandSpeed ? 2 : 1;  // Quarter Pro only prints 60 MPH
  
  // ovradj is already calculated above (line ~418) using VB6 TIMESLIP.FRM:811-813
  
  const vb6Env: VB6EnvParams = {
    rho: rho_lbm_ft3,
    hpc,
    TractionIndex: env.tractionIndex ?? 5,
    TrackTempEffect: trackTempEffect,
    WindSpeed_mph: env.windMph ?? 0,
    WindAngle_deg: env.windAngleDeg ?? 0,
    isLandSpeed,  // Use Bonneville Pro constants for land speed runs
    nextDistPrint: distPrintPoints[distPrintIdx], // First target is rollout
    prevDistPrint: 0,  // Previous distance target (0 for first target)
    TimePrintInc,
    // absTimePrint_s is computed each loop iteration based on timerStartTime_s + nextEtPrint_s
    absTimePrint_s: Infinity,  // Start with Infinity (no time limiting pre-rollout)
    shiftRPMs,  // VB6 ShiftRPM array for VelShiftMatch calculation
    iMPH,       // VB6 iMPH for VelMPHMatch velocity revision
    MPHtoPrint, // VB6 MPHtoPrint array [60/Z5, 100/Z5] in ft/s
    ovradj,     // VB6 TIMESLIP.FRM:812-813,1381 - Overhang adjustment (ft)
  };
  
  // ========================================================================
  // Initialize simulation
  // ========================================================================
  // Use the same LaunchRPM that was set in vb6Vehicle to ensure consistency
  const launchRPM = vb6Vehicle.LaunchRPM;
  
  // Clear trace buffer at start of simulation
  if (VB6_TRACE_ENABLED) {
    clearTrace();
  }
  
  const state = vb6InitState(vb6Vehicle, vb6Env, launchRPM);
  
  // Capture initial Ags0 (clamped) before simulation loop modifies state
  const initialAgs0 = state.AGS_g;
  
  // Calculate TSMax
  // VB6 TIMESLIP.FRM:1062-1067
  // Bonneville: TSMax = 0.1 (fixed)
  // Quarter: TSMax = DistToPrint(1) * 0.11 * (HP * TorqueMult / Weight)^(-1/3) / 15
  let TSMax: number;
  if (isLandSpeed) {
    // VB6 line 1066: Bonneville Pro uses fixed 0.1s timestep
    TSMax = 0.1;
  } else {
    // VB6 lines 1063-1064: Quarter mile uses dynamic calculation
    const rolloutFt_tsmax = (vehicle.rolloutIn ?? 12) / 12;
    const DistToPrint1 = rolloutFt_tsmax > 0 ? rolloutFt_tsmax : 1;
    const HP_launch_raw = taby(xrpm, yhp, NHP, 1, launchRPM);
    const HP_launch_corrected = hpTqMult_early * HP_launch_raw / hpc;
    TSMax = vb6CalcTSMaxInit(
      DistToPrint1,
      HP_launch_corrected,
      torqueMult,
      vehicle.weightLb
    );
  }
  
  
  // ========================================================================
  // Run simulation
  // ========================================================================
  // For land speed runs, allow more steps and time
  const MAX_STEPS = isLandSpeed ? 200000 : 10000;  // 200k steps for 5-mile run, 10k for quarter
  const MAX_TIME_S = isLandSpeed ? 300 : 30;  // 5 minutes for land speed
  
  const convergenceHistory: VB6ExactResult['vb6Diagnostics'] = {
    iterations: [],
    convergenceHistory: [],
  };
  
  // Timeslip results (array format per SimResult)
  // TIMESLIP recording is now integrated with distPrintIdx (VB6's iDist)
  const timeslip: { d_ft: number; t_s: number; v_mph: number }[] = [];
  
  // VB6 Printed Row Stream - records rows at exact VB6 AddListLine moments
  // This is the authoritative output for strict equivalence testing
  const printedRows: VB6PrintedRow[] = [];
  
  // Track when the timer starts (when car has moved rolloutFt distance)
  let timerStartTime_s: number | null = rolloutIn === 0 ? 0 : null;
  let rolloutVel_mph: number | null = null;  // Velocity at rollout moment (for VB6 print parity)
  let rolloutAccel_g: number | null = null;  // Accel at rollout moment
  let rolloutRPM: number | null = null;      // RPM at rollout moment
  let rolloutGear: number | null = null;     // Gear at rollout moment
  let prevET_s: number = 0;  // Previous elapsed time (for time print interpolation)
  
  // VB6 trap speed calculation: average speed over last 66ft
  // TIMESLIP.FRM:1388,1396,1619,1624 - SaveTime is set at 594ft (for 660) and 1254ft (for 1320)
  // TIMESLIP.FRM:1392,1400,1621,1626 - MPH = Z5 * 66 / (time_at_finish - SaveTime)
  let saveTime_594ft: number | null = null;  // Time at 594ft (66ft before 660ft)
  let saveTime_1254ft: number | null = null; // Time at 1254ft (66ft before 1320ft)
  
  // VB6 doOpt SaveTime - used for interpolation during gear shifts
  // TIMESLIP.FRM:1619,1624 - SaveTime is used in sub310 for trap speed calculation
  let doOptSaveTime = 0;
  
  // Add initial trace entry at t=0 with Launch RPM (before first simulation step)
  // VB6 shows this as the first line: 0.00 0 0.0 Ags0 1 LaunchRPM
  // SLIP flag is set by vb6InitState when Ags0 > AMAX (traction limited)
  trace.push({
    t_s: 0,
    s_ft: 0,
    v_fps: state.Vel_ftps,
    v_mph: state.Vel_ftps * FPS_TO_MPH,
    a_g: state.AGS_g,
    rpm: launchRPM,  // Show Launch RPM at t=0, not Stall RPM
    dsrpm: 0,
    lockRpm: 0,
    gear: 1,
    slip: state.SLIP,  // Use SLIP flag from vb6InitState (true if traction limited)
    tireSlip: 1,
    hp: 0,
    dragHp: 0,
    netHp: 0,
    wheelSpeed_mph: 0,
    throttleStopActive: false,
  });
  
  // VB6 TIMESLIP.FRM:1059 - AddListLine for staged row (L=1)
  // This is the first printed row showing initial state at the starting line
  printedRows.push(formatVB6PrintedRow(
    'staged',
    1,  // L=1
    0,  // iDist=0 (before first distance target)
    {
      time_s: 0,
      dist_ft: 0,
      vel_fps: 0,
      ags_g: state.AGS_g,  // Initial clamped Ags0
      engRPM: launchRPM,
      gear: 1,
      slip: state.SLIP,
    },
    NGR,
    isLandSpeed
  ));
  
  for (let step = 0; step < MAX_STEPS; step++) {
    // Check termination conditions (track distance has passed finish line)
    const currentTrackDist = state.Dist_ft - rolloutFt + ovradj;
    if (currentTrackDist >= raceLengthFt + 50) {
      break; // Stop shortly after finish line
    }
    if (state.time_s >= MAX_TIME_S) {
      break;
    }
    
    
    // Check for NaN before step
    if (!Number.isFinite(state.Vel_ftps) || !Number.isFinite(state.Dist_ft) || !Number.isFinite(state.AGS_g) || !Number.isFinite(state.time_s)) {
      warnings.push(`NaN detected at step ${step}: Vel=${state.Vel_ftps}, Dist=${state.Dist_ft}, AGS=${state.AGS_g}`);
      break;
    }
    
    // Set nextDistPrint, prevDistPrint, and iDist for this step (VB6: iDist tracks current target)
    // VB6 iDist is 1-based, so iDist = distPrintIdx + 1
    vb6Env.nextDistPrint = distPrintPoints[distPrintIdx];
    vb6Env.prevDistPrint = distPrintIdx > 0 ? distPrintPoints[distPrintIdx - 1] : 0;
    vb6Env.iDist = distPrintIdx + 1;  // Convert 0-based to 1-based like VB6
    
    // ========================================================================
    // TIME PRINT BOUNDARY HANDLING (Part C)
    // Single advancement rule: nextEtPrint_s advances ONLY when a time print row is emitted
    // EPS = 1e-6 for floating-point tolerance
    // ========================================================================
    const EPS = 5e-6;  // Single-precision safe: ~7 sig digits at t≈12s → ulp ≈ 1e-6
    
    // PRE-STEP: If at boundary, emit time row using current state (no interpolation needed)
    if (timerStartTime_s !== null) {
      const currentET = state.time_s - timerStartTime_s;
      // If we're at or past the time print target (within EPS), emit and advance
      while ((nextEtPrint_s - currentET) <= EPS && nextEtPrint_s < 1000) {
        // Emit time row at boundary using current state
        printedRows.push(formatVB6PrintedRow(
          'time',
          state.L,
          0,
          {
            time_s: nextEtPrint_s,
            dist_ft: state.Dist_ft - rolloutFt,
            vel_fps: state.Vel_ftps,
            ags_g: state.AGS_g,
            engRPM: state.EngRPM,
            gear: state.Gear,
            slip: state.SLIP,
          },
          NGR,
          isLandSpeed
        ));
        // Advance to next time print target
        nextEtPrint_s = nextEtPrint_s + TimePrintInc;
      }
    }
    
    // Compute absTimePrint_s for dt limiter
    // Pre-rollout: Infinity (no time limiting)
    // Post-rollout: timerStartTime_s + nextEtPrint_s
    vb6Env.absTimePrint_s = timerStartTime_s !== null 
      ? timerStartTime_s + nextEtPrint_s 
      : Infinity;
    
    // VB6 TIMESLIP.FRM:1071 - Shift2PrintTime is set by the simulation loop
    // It's set ONCE when ShiftFlag transitions 1→2 (see below after step)
    // Pass the current value to the step function
    vb6Env.Shift2PrintTime = Shift2PrintTime;
    
    // Run one VB6 step (pass throttle stop params for bracket racing)
    // Track previous state for interpolation when shift fallback occurs
    const prevDist_ft = state.Dist0_ft;
    const prevTime_s = state.Time0_s;
    const prevVel_ftps = state.Vel0_ftps;
    const prevAgs_g = state.Ags0_g;
    const prevRPM = state.RPM0;
    const prevSlip = state.SLIP ? 1 : 0;
    
    // Save ShiftFlag and Gear BEFORE step for shift detection
    // VB6 GoTo 230 does NOT restore state - it uses current shift point values
    const savedShiftFlag = state.ShiftFlag;
    const savedGear = state.Gear;
    
    let stepResult = vb6SimulationStep(state, vb6Vehicle, vb6Env, TSMax, throttleStopParams);
    
    // VB6 TIMESLIP.FRM:1355, 1433 - Shift recalculation (GoTo 230)
    // If shift triggers during step (EngRPM near ShiftRPM), VB6 recalculates with new gear
    if (savedShiftFlag === 0 && savedGear < vb6Vehicle.NGR) {
      const targetShiftRPM = vb6Vehicle.ShiftRPM[savedGear - 1];
      // VB6 TIMESLIP.FRM:1355 - VB6 EXACT CODE: Abs(ShiftRPM(iGear) - EngRPM(L)) < ShiftRPMTol
      // ShiftRPMTol = 20 if ShiftRPM(1) > 8000, else 10 (line 860)
      const shiftRPMTol = (vb6Vehicle.ShiftRPM[0] ?? 7000) > 8000 ? 20 : 10;
      if (targetShiftRPM !== undefined && Math.abs(targetShiftRPM - state.EngRPM) < shiftRPMTol) {
        // Shift triggered! VB6 would GoTo 230 and recalculate with new gear.
        // VB6 line 1433: ShiftFlag = 2, iGear++, LAdd = 1, GoTo 230
        //
        // CRITICAL FIX: VB6's GoTo 230 does NOT restore state!
        // It uses the CURRENT step's values (shift point) as the starting point.
        // At line 1090, VB6 does: Vel0 = Vel(L), Ags0 = AGS(L)
        // This means the shift point velocity/acceleration become the base for the next calculation.
        //
        // DO NOT RESTORE STATE - use current shift point values!
        
        // VB6 line 1337: PrintFlag = 1 - emit shift trigger print row (with CURRENT gear, before increment)
        // This happens BEFORE the gear is incremented
        if (timerStartTime_s !== null) {
          const et = state.time_s - timerStartTime_s;
          printedRows.push(formatVB6PrintedRow(
            'shift',
            state.L,
            0,
            {
              time_s: et,
              dist_ft: state.Dist_ft - rolloutFt,
              vel_fps: state.Vel_ftps,
              ags_g: state.AGS_g,
              engRPM: state.EngRPM,
              gear: savedGear,  // OLD gear before increment
              slip: state.SLIP,
            },
            NGR,
            isLandSpeed
          ));
          
          // TRACE HOOK: Record SHIFT_TRIGGER
          if (VB6_TRACE_ENABLED) {
            recordTracePoint(step, 'SHIFT_TRIGGER', {
              time_s: et,
              dist_ft: state.Dist_ft - rolloutFt,
              vel_ftps: state.Vel_ftps,
              rpm: state.EngRPM,
              AGS_g: state.AGS_g,
              gear: savedGear,
            });
          }
        }
        
        // VB6 line 1071: Shift2PrintTime = time(L) + DTShift
        Shift2PrintTime = state.time_s + vb6Vehicle.DTShift;
        vb6Env.Shift2PrintTime = Shift2PrintTime;
        
        
        // Execute shift (VB6 line 1433: ShiftFlag = 2, iGear++)
        // DO NOT restore state - VB6 uses current (shift point) values
        state.ShiftFlag = 2;
        state.Gear++;
        
        // NOTE: VB6 line 1433 sets LAdd = 1 and does GoTo 230, which loops back to AddListLine.
        // However, the fixture shows that the "shift start" row (with new gear) is NOT emitted
        // at the same time as the trigger row. Instead, VB6 continues the simulation loop
        // and emits the next row when another print condition is met (time, distance, or shift complete).
        // So we only emit the trigger row here, not the start row.
        
        // Recalculate with new gear (VB6 GoTo 230)
        // vb6SimulationStep will use TimeStep = DTShift because gear changed
        // and will start from current shift point values (Vel_ftps, AGS_g, etc.)
        stepResult = vb6SimulationStep(state, vb6Vehicle, vb6Env, TSMax, throttleStopParams);
      }
    }
    
    // VB6 TIMESLIP.FRM:1283-1291 - doOpt during gear shift completion
    // When ShiftFlag >= 2 AND time is within TimeTol of Shift2PrintTime, call doOpt
    const TimeTol_doOpt = 0.002;
    if (state.ShiftFlag === 2 && Shift2PrintTime !== undefined) {
      if (Math.abs(Shift2PrintTime - state.time_s) < TimeTol_doOpt) {
        // VB6 lines 1289-1291: Save ASV and call doOpt
        const ASV: VB6ASV = {
          time: state.time_s,
          dist: state.Dist_ft,
          vel: state.Vel_ftps,
          ags: state.AGS_g,
          slip: state.SLIP ? 1 : 0,
          engRPM: state.EngRPM,
          gear: state.Gear,
        };
        
        // Get current distance print target and tolerances
        const currentDistTarget = distPrintPoints[distPrintIdx] ?? 1320;
        const vb6iDist_doOpt = distPrintIdx + 1;
        let DistTol_doOpt: number;
        if (vb6iDist_doOpt <= 1) DistTol_doOpt = 0.005;
        else if (vb6iDist_doOpt <= 4) DistTol_doOpt = 0.1;
        else DistTol_doOpt = 0.008;
        
        const KV_doOpt = isLandSpeed ? (0.05 / Z5) : (0.02 / Z5);
        const MPHtoPrint_current = iMPH <= 2 ? MPHtoPrint[iMPH - 1] : 0;
        
        const doOptCtx: VB6DoOptContext = {
          ASV,
          Time0: prevTime_s,
          Dist0: prevDist_ft,
          Vel0: prevVel_ftps,
          Ags0: prevAgs_g,
          RPM0: prevRPM,
          DistToPrint: currentDistTarget,
          absTimePrint_s: vb6Env.absTimePrint_s ?? Infinity,
          MPHtoPrint: MPHtoPrint_current,
          iDist: vb6iDist_doOpt,
          iMPH: iMPH,
          DistTol: DistTol_doOpt,
          TimeTol: TimeTol_doOpt,
          KV: KV_doOpt,
          ShiftFlag: state.ShiftFlag,
          isLandSpeed,
          Z5,
          SaveTime: doOptSaveTime,
        };
        
        // Create TIMESLIP array for doOpt (8 elements, 0-indexed but VB6 uses 1-7)
        const TIMESLIP_arr = [0, 0, 0, 0, 0, 0, 0, 0];
        
        const doOptResult = vb6DoOpt(doOptCtx, prevSlip, TIMESLIP_arr, doOptSaveTime);
        
        if (doOptResult.didInterpolate) {
          // Update SaveTime from doOpt result
          doOptSaveTime = doOptResult.SaveTime;
          
          // doOpt may have recorded TIMESLIP values - we handle this in the distance print section
        }
      }
    }
    
    // NOTE: Shift trigger detection and handling is done in the block above (lines 1281-1339)
    // which sets ShiftFlag = 2, increments gear, and calls vb6SimulationStep again.
    // The shift trigger print row is emitted there with the OLD gear before increment.
    
    // VB6: TIMESLIP.FRM:1373-1418 and doOpt/sub310 - Distance print detection
    // VB6 has TWO mechanisms:
    // 1. Line 1375: (DistStep < DistTol And (DistStep / Vel(L)) < TimeTol) - within tolerance
    // 2. doOpt/sub310: When Dist(L) >= DistToPrint(iDist) + DistTol - overshoot, then interpolate back
    // Both mechanisms trigger distance recording and iDist advancement.
    const currentTarget = distPrintIdx < distPrintPoints.length ? distPrintPoints[distPrintIdx] : raceLengthFt;
    const DistStep = Math.abs(currentTarget - state.Dist_ft);
    // VB6 DistTol is dynamic, updated AFTER each distance target is reached:
    // - Bonneville: DistTol = 1 (TIMESLIP.FRM:999)
    // - Quarter: Initial (iDist=1): 0.005 (TIMESLIP.FRM:997)
    // - Quarter: After rollout Case 1 (iDist=2,3,4): 0.1 (TIMESLIP.FRM:1379)
    // - Quarter: After 330ft Case 4 (iDist>=5): 0.008 (TIMESLIP.FRM:1387)
    const vb6iDist_check = distPrintIdx + 1;
    let DistTol: number;
    if (isLandSpeed) {
      DistTol = 1;  // Bonneville: constant 1 ft tolerance
    } else if (vb6iDist_check <= 1) {
      DistTol = 0.005;  // Quarter: Initial value for rollout
    } else if (vb6iDist_check <= 4) {
      DistTol = 0.1;    // Quarter: After rollout, before 330ft
    } else {
      DistTol = 0.008;  // Quarter: After 330ft
    }
    const TimeTol = 0.002;
    
    // VB6's conditions for recording distance print:
    // 1. Within tolerance: DistStep < DistTol AND (DistStep / Vel) < TimeTol
    const withinTolerance = DistStep < DistTol && 
        (state.Vel_ftps > 0 ? (DistStep / state.Vel_ftps) < TimeTol : true);
    // 2. Overshoot (doOpt/sub310): Dist >= target + DistTol - triggers interpolation back to exact target
    const overshoot = state.Dist_ft >= currentTarget + DistTol;
    // 3. Shift fallback: during gear shift (ShiftFlag=2) AND we've passed the target
    const shiftFallback = state.ShiftFlag === 2 && state.Dist_ft >= currentTarget;
    
    const toleranceMet = distPrintIdx < distPrintPoints.length && 
        (withinTolerance || overshoot || shiftFallback);
    
    if (toleranceMet) {
      // VB6 records TIMESLIP values when hitting specific distance print points
      // For Quarter mile: distPrintPoints = [rollout, 30, 60, 330, 594, 660, 1000, 1254, 1320]
      // vb6iDist (1-based):                    1       2   3    4    5    6     7     8     9
      // Note: distPrintIdx is 0-based, vb6iDist = distPrintIdx + 1
      const vb6iDist = distPrintIdx + 1;  // Convert to VB6's 1-based index
      
      // VB6 line 1299: If iDist = 1 And gc_Rollout.Value = 0 Then PrintFlag = -1
      // For Bonneville with zero rollout, skip the first checkpoint (1ft)
      const skipFirstCheckpoint = vb6iDist === 1 && rolloutIn === 0;
      if (skipFirstCheckpoint) {
        // VB6 line 1299: PrintFlag = -1 (suppress print, but iDist still advances once at line 1417)
        // Don't record anything for this checkpoint — distPrintIdx++ at end of block handles advancement
      } else {
      
      // VB6 sub310 DISTANCE INTERPOLATION (TIMESLIP.FRM:1609-1640)
      // When we overshoot a distance target, VB6 interpolates back to exact distance.
      // VB6 calculates: factor1 = (DistToPrint(iDist) - Dist0) / (ASV(2) - Dist0)
      // Then: time(L) = Time0 + factor * (ASV(1) - Time0)
      //       Vel(L) = Vel0 + factor * (ASV(3) - Vel0)
      //       Dist(L) = DistToPrint(iDist)  -- exact target!
      let recordTime_s: number;
      let recordVel_ftps: number;
      
      // Check if we need to interpolate (overshoot or shift fallback)
      const needsInterpolation = (overshoot || shiftFallback) && 
          prevDist_ft < currentTarget && state.Dist_ft > prevDist_ft;
      
      if (needsInterpolation) {
        // VB6 sub310: factor1 = (DistToPrint(iDist) - Dist0) / (Dist(L) - Dist0)
        const factor1 = (currentTarget - prevDist_ft) / (state.Dist_ft - prevDist_ft);
        // Validate factor (VB6: If factor1 <= 0 Or factor1 >= 1 Then factor1 = 0)
        if (factor1 > 0 && factor1 < 1) {
          // VB6 sub310: time(L) = Time0 + factor * (ASV(1) - Time0)
          recordTime_s = prevTime_s + factor1 * (state.time_s - prevTime_s);
          // VB6 sub310: Vel(L) = Vel0 + factor * (ASV(3) - Vel0)
          recordVel_ftps = state.Vel0_ftps + factor1 * (state.Vel_ftps - state.Vel0_ftps);
        } else {
          recordTime_s = state.time_s;
          recordVel_ftps = state.Vel_ftps;
        }
      } else {
        recordTime_s = state.time_s;
        recordVel_ftps = state.Vel_ftps;
      }
      
      // Track time relative to timer start (rollout)
      // VB6 sub310 uses interpolated time for all distance recordings
      const interpolatedTrackTime = timerStartTime_s !== null 
        ? recordTime_s - timerStartTime_s 
        : 0;
      
      // VB6 TIMESLIP.FRM:1383-1402 - Match EXACTLY
      // VB6 only records TIMESLIP when ShiftFlag < 2 (not during shift)
      // VB6 uses instantaneous speed Vel(L) * Z5 for non-trap-speed points
      
      // Record printed row for distance checkpoint (VB6 AddListLine)
      // Skip rollout (vb6iDist=1) as it's handled separately when timer starts
      // Skip 594ft (vb6iDist=5) and 1254ft (vb6iDist=8) - internal trap speed distances, not printed
      const isInternalTrapDist = !isLandSpeed && (vb6iDist === 5 || vb6iDist === 8);
      if (vb6iDist > 1 && !isInternalTrapDist && timerStartTime_s !== null) {
        printedRows.push(formatVB6PrintedRow(
          'distance',
          state.L,
          vb6iDist,
          {
            time_s: interpolatedTrackTime,
            dist_ft: currentTarget,
            vel_fps: recordVel_ftps,
            ags_g: state.AGS_g,
            engRPM: state.EngRPM,
            gear: state.Gear,
            slip: state.SLIP,
          },
          NGR,
          isLandSpeed
        ));
        
        // TRACE HOOK: Record PRINT_DIST
        if (VB6_TRACE_ENABLED) {
          recordTracePoint(step, 'PRINT_DIST', {
            time_s: interpolatedTrackTime,
            dist_ft: currentTarget,
            vel_ftps: recordVel_ftps,
            rpm: state.EngRPM,
            AGS_g: state.AGS_g,
            gear: state.Gear,
          });
        }
      }
      
      // Case 3 (60ft): VB6 line 1383-1385 and sub310
      if (vb6iDist === 3 && timerStartTime_s !== null) {
        // VB6: If ShiftFlag < 2 Then TIMESLIP(1) = time(L)
        //      If ShiftFlag = 2 And TIMESLIP(1) = 0 Then TIMESLIP(1) = time(L)
        // Use interpolatedTrackTime for sub310 precision
        if (state.ShiftFlag < 2 || !timeslip.find(t => t.d_ft === 60)) {
          if (!timeslip.find(t => t.d_ft === 60)) {
            timeslip.push({ d_ft: 60, t_s: interpolatedTrackTime, v_mph: recordVel_ftps * FPS_TO_MPH });
          }
        }
      }
      // Case 4 (330ft): VB6 line 1386
      // VB6's velocity revision loop (lines 1305-1352) ensures 330ft is hit precisely.
      // RSA uses sub310 interpolation to approximate this behavior.
      else if (vb6iDist === 4 && timerStartTime_s !== null) {
        if (!timeslip.find(t => t.d_ft === 330)) {
          // Record with interpolated time (sub310 style)
          if (state.ShiftFlag < 2 || shiftFallback || overshoot) {
            timeslip.push({ d_ft: 330, t_s: interpolatedTrackTime, v_mph: recordVel_ftps * FPS_TO_MPH });
          }
        }
      }
      // Case 5 (594ft): VB6 line 1388
      else if (vb6iDist === 5 && timerStartTime_s !== null) {
        // VB6: If ShiftFlag < 2 Or SaveTime = 0 Then SaveTime = time(L)
        // VB6 interpolates to exact 594ft (sub310), so use interpolatedTrackTime
        if (state.ShiftFlag < 2 || saveTime_594ft === null) {
          saveTime_594ft = interpolatedTrackTime;
        }
      }
      // Case 6 (660ft): VB6 lines 1390-1394 and sub310
      // VB6 sub310 interpolates to exact 660ft for trap speed calculation
      else if (vb6iDist === 6 && timerStartTime_s !== null) {
        // VB6: If ShiftFlag < 2 Then record, also handle overshoot via sub310
        if (!timeslip.find(t => t.d_ft === 660)) {
          if (state.ShiftFlag < 2 || shiftFallback || overshoot) {
            // VB6 interpolates to exact 660ft (sub310), so use interpolatedTrackTime for trap speed
            let speed_mph = recordVel_ftps * FPS_TO_MPH;  // Default: instantaneous velocity
            // QUARTER MILE ONLY: Use trap speed formula (66ft average)
            // Bonneville uses instantaneous velocity (VB6 line 1406)
            if (!isLandSpeed && saveTime_594ft !== null && interpolatedTrackTime > saveTime_594ft) {
              speed_mph = FPS_TO_MPH * 66 / (interpolatedTrackTime - saveTime_594ft);
            }
            timeslip.push({ d_ft: 660, t_s: interpolatedTrackTime, v_mph: speed_mph });
            saveTime_594ft = null;  // VB6: SaveTime = 0
          }
        }
      }
      // Case 7 (1000ft): VB6 line 1395 and sub310
      else if (vb6iDist === 7 && timerStartTime_s !== null) {
        // VB6: If ShiftFlag < 2 Then TIMESLIP(5) = time(L)
        // Use interpolatedTrackTime for sub310 precision
        if ((state.ShiftFlag < 2 || overshoot) && !timeslip.find(t => t.d_ft === 1000)) {
          timeslip.push({ d_ft: 1000, t_s: interpolatedTrackTime, v_mph: recordVel_ftps * FPS_TO_MPH });
        }
      }
      // Case 8 (1254ft): VB6 line 1396
      else if (vb6iDist === 8 && timerStartTime_s !== null) {
        // VB6: If ShiftFlag < 2 Or SaveTime = 0 Then SaveTime = time(L)
        // VB6 interpolates to exact 1254ft (sub310), so use interpolatedTrackTime
        if (state.ShiftFlag < 2 || saveTime_1254ft === null) {
          saveTime_1254ft = interpolatedTrackTime;
        }
      }
      // Case 9 (1320ft): VB6 lines 1398-1402 and sub310
      // VB6 sub310 interpolates to exact 1320ft for trap speed calculation
      else if (vb6iDist === 9 && timerStartTime_s !== null) {
        // VB6: If ShiftFlag < 2 Then record, also handle overshoot via sub310
        if (!timeslip.find(t => t.d_ft === 1320)) {
          if (state.ShiftFlag < 2 || shiftFallback || overshoot) {
            // VB6 interpolates to exact 1320ft (sub310), so use interpolatedTrackTime for trap speed
            let speed_mph = recordVel_ftps * FPS_TO_MPH;  // Default: instantaneous velocity
            // QUARTER MILE ONLY: Use trap speed formula (66ft average)
            // Bonneville uses instantaneous velocity (VB6 line 1411)
            if (!isLandSpeed && saveTime_1254ft !== null && interpolatedTrackTime > saveTime_1254ft) {
              speed_mph = FPS_TO_MPH * 66 / (interpolatedTrackTime - saveTime_1254ft);
            }
            timeslip.push({ d_ft: 1320, t_s: interpolatedTrackTime, v_mph: speed_mph });
            saveTime_1254ft = null;  // VB6: SaveTime = 0
          }
        }
      }
      }  // End of else block for skipFirstCheckpoint
      
      distPrintIdx++;
    }
    
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
    
    // Check if timer has started (car has moved past rollout distance)
    // VB6: TIMESLIP.FRM:1373-1381 - Check distance print with tolerance
    // VB6 uses TWO conditions (both must be true):
    //   1. DistStep < DistTol (distance error < 0.1 ft for rollout)
    //   2. (DistStep / Vel(L)) < TimeTol (time to cover error < 0.002s)
    // OR during shift: ShiftFlag = 2 And Dist(L) >= DistToPrint(iDist)
    if (timerStartTime_s === null) {
      const DistStep = Math.abs(rolloutFt - state.Dist_ft);
      const DistTol = 0.005;  // VB6 line 997: DistTol = 0.005 BEFORE rollout, changes to 0.1 AFTER rollout (line 1379)
      const TimeTol = 0.002;  // VB6 constant
      
      // VB6 tolerance check - triggers when CLOSE to target, not just past it
      if (DistStep < DistTol && (DistStep / state.Vel_ftps) < TimeTol) {
        // VB6 line 1380: If gc_Rollout.Value > 0 Then time(L) = 0
        // Timer starts at current simulation time
        timerStartTime_s = state.time_s;
        
        // VB6 TIMESLIP.FRM:1373-1381 - Rollout row print
        // VB6 prints the rollout row with ET=0 (time resets at rollout)
        // The printed values use Vel(L), AGS(L), EngRPM(L), iGear at this moment
        // NOTE: Land speed runs don't have a rollout row in the fixture
        if (!isLandSpeed) {
          printedRows.push(formatVB6PrintedRow(
            'rollout',
            state.L,
            1,  // iDist=1 for rollout
            {
              time_s: 0,  // ET = 0 at rollout (VB6 line 1380: time(L) = 0)
              dist_ft: 0,  // VB6 shows "Rollout" not a distance
              vel_fps: state.Vel_ftps,
              ags_g: state.AGS_g,
              engRPM: state.EngRPM,
              gear: state.Gear,
              slip: state.SLIP,
            },
            NGR,
            isLandSpeed
          ));
        }
        
        // Capture rollout state for legacy compatibility
        const Z5_f32 = Math.fround(3600 / 5280);
        rolloutVel_mph = Math.fround(Math.fround(state.Vel_ftps) * Z5_f32);
        rolloutAccel_g = state.AGS_g;
        rolloutRPM = state.EngRPM;
        rolloutGear = state.Gear;
        
        // VB6 line 1381: Dist(L) = Dist(L) + ovradj - PERMANENTLY adjust distance for front overhang
        // This is critical - after this point, all distances include ovradj
        state.Dist_ft = state.Dist_ft + ovradj;
        state.Dist0_ft = state.Dist_ft;
        
        // TRACE HOOK: Record ROLLOUT_CROSSED
        if (VB6_TRACE_ENABLED) {
          recordTracePoint(step, 'ROLLOUT_CROSSED', {
            time_s: state.time_s,
            dist_ft: state.Dist_ft,
            vel_ftps: state.Vel_ftps,
            rpm: state.EngRPM,
            AGS_g: state.AGS_g,
            gear: state.Gear,
          });
        }
      }
    }
    
    // ========================================================================
    // POST-STEP TIME PRINT EMISSION (Part C)
    // Emit any time prints that were crossed during this step with interpolation
    // nextEtPrint_s advances ONLY when a time print row is emitted
    // ========================================================================
    if (timerStartTime_s !== null) {
      const etAfterStep = state.time_s - timerStartTime_s;
      const EPS_post = 1e-6;
      
      // Emit all time prints that were crossed during this step
      while (nextEtPrint_s <= etAfterStep + EPS_post && nextEtPrint_s < 1000) {
        // Interpolate state at the exact time print moment
        // Guard against division by zero when etAfterStep === prevET_s
        const etDiff = etAfterStep - prevET_s;
        const factor = (prevET_s < nextEtPrint_s && etDiff > 0.0001) 
          ? (nextEtPrint_s - prevET_s) / etDiff 
          : 1;
        
        const interpVel = prevVel_ftps + factor * (state.Vel_ftps - prevVel_ftps);
        const interpDist = prevDist_ft + factor * (state.Dist_ft - prevDist_ft);
        const interpAgs = prevAgs_g + factor * (state.AGS_g - prevAgs_g);
        const interpRPM = prevRPM + factor * (state.EngRPM - prevRPM);
        
        // Emit time-based print row with interpolated values
        printedRows.push(formatVB6PrintedRow(
          'time',
          state.L,
          0,
          {
            time_s: nextEtPrint_s,
            dist_ft: interpDist - rolloutFt,
            vel_fps: interpVel,
            ags_g: interpAgs,
            engRPM: interpRPM,
            gear: state.Gear,
            slip: state.SLIP,
          },
          NGR,
          isLandSpeed
        ));
        
        // TRACE HOOK: Record PRINT_TIME
        if (VB6_TRACE_ENABLED) {
          recordTracePoint(step, 'PRINT_TIME', {
            time_s: nextEtPrint_s,
            dist_ft: interpDist - rolloutFt,
            vel_ftps: interpVel,
            rpm: interpRPM,
            AGS_g: interpAgs,
            gear: state.Gear,
          });
        }
        
        // Advance to next time print target (single advancement rule)
        nextEtPrint_s = nextEtPrint_s + TimePrintInc;
      }
      
      // Update previous ET for next iteration
      prevET_s = etAfterStep;
    }
    
    // VB6 TIMESLIP.FRM:1425-1430 - Check for speed match
    // Quarter Pro: 60 MPH only
    // Bonneville: 100 MPH and 200 MPH prints
    if (timerStartTime_s !== null && iMPH <= maxMPHPrints) {
      // VB6 line 1001: KV = 0.05 / Z5 for Bonneville, 0.02 / Z5 for Quarter Pro
      const KV = Math.fround((isLandSpeed ? 0.05 : 0.02) / Z5);
      const targetSpeed_fps = MPHtoPrint[iMPH - 1];
      
      if (Math.abs(targetSpeed_fps - state.Vel_ftps) < KV || (state.ShiftFlag === 2 && state.Vel_ftps >= targetSpeed_fps)) {
        // Emit speed-based print row
        const et = state.time_s - timerStartTime_s;
        printedRows.push(formatVB6PrintedRow(
          'speed',
          state.L,
          0,
          {
            time_s: et,
            dist_ft: state.Dist_ft - rolloutFt,
            vel_fps: state.Vel_ftps,
            ags_g: state.AGS_g,
            engRPM: state.EngRPM,
            gear: state.Gear,
            slip: state.SLIP,
          },
          NGR,
          isLandSpeed
        ));
        
        // TRACE HOOK: Record PRINT_SPEED
        if (VB6_TRACE_ENABLED) {
          recordTracePoint(step, 'PRINT_SPEED', {
            time_s: et,
            dist_ft: state.Dist_ft - rolloutFt,
            vel_ftps: state.Vel_ftps,
            rpm: state.EngRPM,
            AGS_g: state.AGS_g,
            gear: state.Gear,
          });
        }
        
        iMPH++;
      }
    }
    
    // Calculate track distance (what the timer measures)
    // VB6 TIMESLIP.FRM line 1381: After rollout, Dist(L) already includes ovradj
    // So track distance = Dist_ft - rolloutFt (no need to add ovradj again)
    let trackDist_ft: number;
    let trackTime_s: number;
    if (timerStartTime_s !== null) {
      // Timer has started - Dist_ft already includes ovradj from line 1381
      trackDist_ft = state.Dist_ft - rolloutFt;
      trackTime_s = state.time_s - timerStartTime_s;
    } else {
      // Before rollout - track distance is 0
      trackDist_ft = 0;
      trackTime_s = 0;
    }
    
    // Calculate driveshaft RPM (transmission output, accounting for clutch/converter slip)
    // Driveline: Engine → Clutch/Converter → Trans → Driveshaft → Final Drive → Wheels
    // LockRPM is the clutch/converter output (accounts for slip)
    // Driveshaft RPM = LockRPM / Trans Gear Ratio
    const transGearRatio = vb6Vehicle.TGR[state.Gear - 1] ?? 1;
    const driveshaftRPM = (stepResult.LockRPM ?? state.EngRPM) / transGearRatio;
    
    // Calculate wheel surface speed (what the tire tread is doing)
    // This differs from car speed when there's tire slip
    // Wheel surface speed = Vel * TireSlip (tire spins faster than car moves)
    const tireSlipFactor = stepResult.TireSlip;
    const wheelSpeed_mph = state.Vel_ftps * tireSlipFactor * FPS_TO_MPH;
    
    // Check if throttle stop is active at this time
    const throttleStopActive = throttleStopParams?.enabled && 
      trackTime_s >= throttleStopParams.activateTime_s && 
      trackTime_s < (throttleStopParams.activateTime_s + throttleStopParams.duration_s);
    
    trace.push({
      t_s: trackTime_s,
      s_ft: trackDist_ft,
      v_fps: state.Vel_ftps,
      v_mph: state.Vel_ftps * FPS_TO_MPH,
      a_g: state.AGS_g,
      rpm: state.EngRPM,
      dsrpm: driveshaftRPM,  // Driveshaft RPM (accounts for clutch/converter slip)
      lockRpm: stepResult.LockRPM,
      gear: state.Gear,
      slip: state.SLIP,
      tireSlip: tireSlipFactor,
      // HPAtWheels is HP at the wheels (after drivetrain losses, before drag subtraction)
      // HP is net HP (HPAtWheels - DragHP) - can be negative at terminal velocity
      // For plotting, we want to show Engine HP and Drag HP separately
      hp: stepResult.HPAtWheels,  // Engine HP at wheels (positive)
      dragHp: stepResult.DragHP,  // Drag HP (positive)
      netHp: stepResult.HP,       // Net HP = HPAtWheels - DragHP (can be negative)
      wheelSpeed_mph,
      throttleStopActive,
    });
    
    // saveTime_594ft and saveTime_1254ft are recorded inside tolerance block (matching VB6 exactly)
    
    // VB6 TIMESLIP.FRM:1434 - Shift completion
    // Line 1434: If ShiftFlag = 2, reset ShiftFlag = 0
    // Note: Shift TRIGGER and START (0→1→2) are now handled at the trigger point (lines 1265-1315)
    // This block only handles shift COMPLETION (2→0)
    if (state.ShiftFlag === 2) {
      // Shift complete, reset flag and clear Shift2PrintTime
      state.ShiftFlag = 0;
      
      // VB6 line 1434: LAdd = 1 - emit shift complete print row
      if (timerStartTime_s !== null) {
        const et = state.time_s - timerStartTime_s;
        printedRows.push(formatVB6PrintedRow(
          'shift',
          state.L,
          0,
          {
            time_s: et,
            dist_ft: state.Dist_ft - rolloutFt,
            vel_fps: state.Vel_ftps,
            ags_g: state.AGS_g,
            engRPM: state.EngRPM,
            gear: state.Gear,
            slip: state.SLIP,
          },
          NGR,
          isLandSpeed
        ));
        
        // TRACE HOOK: Record SHIFT_COMPLETE
        if (VB6_TRACE_ENABLED) {
          recordTracePoint(step, 'SHIFT_COMPLETE', {
            time_s: et,
            dist_ft: state.Dist_ft - rolloutFt,
            vel_ftps: state.Vel_ftps,
            rpm: state.EngRPM,
            AGS_g: state.AGS_g,
            gear: state.Gear,
          });
        }
      }
      
      Shift2PrintTime = undefined;
    }
    
    // NOTE: Time print advancement is now handled in the time print emission block above (lines 1645-1686)
    // The old duplicate check here was advancing TimePrint without emitting rows, causing missed prints.
    
    // VB6 TIMESLIP.FRM:1426-1429 - Check for speed match (iMPH update)
    // If iMPH <= 2 Then
    //     If (Abs(MPHtoPrint(iMPH) - Vel(L)) < KV) Or (ShiftFlag = 2 And Vel(L) >= MPHtoPrint(iMPH)) Then
    //         iMPH = iMPH + 1
    const KV_ftps = isLandSpeed ? (0.05 / Z5) : (0.02 / Z5);
    if (iMPH <= 2) {
      const targetMPH_ftps = MPHtoPrint[iMPH - 1];
      if ((Math.abs(targetMPH_ftps - state.Vel_ftps) < KV_ftps) ||
          (state.ShiftFlag === 2 && state.Vel_ftps >= targetMPH_ftps)) {
        iMPH++;
      }
    }
    // Update vb6Env.iMPH for next step
    vb6Env.iMPH = iMPH;
  }
  
  // ========================================================================
  // Build result
  // ========================================================================
  
  // Get final ET and MPH from target distance (or last point)
  const finalResult = timeslip.find(t => t.d_ft === raceLengthFt);
  const applyRounding = (input as any).applyVB6Rounding ?? false;
  const etDecimals = (input as any).etDecimals ?? 2;   // VB6 default: 2 decimals
  const mphDecimals = (input as any).mphDecimals ?? 1; // VB6 default: 1 decimal
  
  // Raw values before rounding
  // For land speed: timeslip is empty, so interpolate from trace at exact finish distance
  // to avoid using overshoot time (state.time_s is past the finish line)
  let et_s_raw = finalResult?.t_s ?? state.time_s;
  let mph_raw = finalResult?.v_mph ?? (state.Vel_ftps * FPS_TO_MPH);
  if (!finalResult && isLandSpeed && trace.length >= 2) {
    for (let i = 0; i < trace.length - 1; i++) {
      const a = trace[i];
      const b = trace[i + 1];
      if (a.s_ft <= raceLengthFt && b.s_ft >= raceLengthFt) {
        const span = b.s_ft - a.s_ft;
        const frac = span > 0 ? (raceLengthFt - a.s_ft) / span : 0;
        et_s_raw = a.t_s + frac * (b.t_s - a.t_s);
        mph_raw = a.v_mph + frac * (b.v_mph - a.v_mph);
        break;
      }
    }
  }
  
  // Apply VB6-style rounding if enabled
  // VB6 uses "round half up": Int((Value + increment/2) / increment) * increment
  const et_s = applyRounding ? roundET(et_s_raw, etDecimals) : et_s_raw;
  const mph = applyRounding ? roundMPH(mph_raw, mphDecimals) : mph_raw;
  
  // Convert trace to SimResult format (include all data logger fields)
  const traces = trace.map(t => ({
    t_s: t.t_s,
    s_ft: t.s_ft,
    v_mph: t.v_mph,
    v_fps: t.v_fps,
    a_g: t.a_g,
    rpm: t.rpm,
    dsrpm: t.dsrpm,
    lockRpm: t.lockRpm,
    gear: t.gear,
    slip: t.slip,
    tireSlip: t.tireSlip,
    hp: t.hp,
    dragHp: t.dragHp,
    wheelSpeed_mph: t.wheelSpeed_mph,
  }));
  
  // Build debug data for UI display
  const debugData = {
    fuelType: {
      resolved: fuelString ?? 'unknown',
      fuelSystemType,
      vehicleFuelType: (vehicle as any).fuelType,
      vehicleFuelSystem: (vehicle as any).fuelSystem,
    },
    hpCurve: {
      length: NHP,
      peakHP: Math.max(...yhp),
      rpmRange: `${Math.min(...xrpm)} - ${Math.max(...xrpm)}`,
    },
    airCalc: {
      rho_lbm_ft3,
      hpc,
    },
    simParams: {
      weight: vehicle.weightLb,
      tireDia: tireDiaIn,
      wheelbase: vehicle.wheelbaseIn ?? 100,
      finalDrive,
      NGR,
      shiftRPMs: vb6Vehicle.ShiftRPM,
      peakHP: Math.max(...yhp),
      stallRPM,
      slippage,
      slippageSource: isClutch ? 'calculated (VB6 formula)' : 
                      (converter?.slippageFactor !== undefined ? 'converter.slippageFactor' :
                       converter?.slippage !== undefined ? 'converter.slippage' : 'default'),
      vehicleClutchSlippage: (vehicle as any).clutchSlippage,
      isClutch,
      tractionIndex: vb6Env.TractionIndex,
      trackTempEffect,
      pmi: { engine: enginePMI, trans: transPMI, tires: tiresPMI },
      aero: { 
        frontalArea: vb6Vehicle.RefArea_ft2, 
        cd: vb6Vehicle.DragCoef, 
        cl: vb6Vehicle.LiftCoef 
      },
      launchRPM: vb6Vehicle.LaunchRPM,
      ycg: YCG_in,
      staticFWt: staticFWt,
      ags0: initialAgs0,  // Use initial clamped value captured before simulation loop
      ags0Unclamped: Ags0,  // Keep unclamped for reference
      tireSlipAtLaunch: tireSlipAtLaunch,
      rolloutTime_s: timerStartTime_s ?? 0,
      rolloutIn,
      gearEfficiencies: vb6Vehicle.TGEff,
      overallEfficiency: vb6Vehicle.Efficiency,
      overhangIn: (vehicle as any).overhangIn ?? overhangIn,
    },
    result: {
      et: et_s,
      mph,
      rolloutTime_s: timerStartTime_s ?? 0,
    },
    // Rollout row values for VB6 print parity
    rollout: {
      time_s: timerStartTime_s ?? 0,
      vel_mph: rolloutVel_mph ?? 0,
      accel_g: rolloutAccel_g ?? 0,
      rpm: rolloutRPM ?? 0,
      gear: rolloutGear ?? 1,
    },
    // VB6-style run trace printout
    runTrace: generateRunTrace(trace, rolloutIn, timerStartTime_s ?? 0),
  };
  
  // Apply rounding to timeslip entries if enabled
  const roundedTimeslip = applyRounding 
    ? timeslip.map(t => ({
        d_ft: t.d_ft,
        t_s: roundET(t.t_s, etDecimals),
        v_mph: roundMPH(t.v_mph, mphDecimals),
      }))
    : timeslip;
  
  // Sort printed rows by timestamp to match VB6's chronological ordering
  // VB6 emits rows in order of when events occur during simulation
  // Staged row (t=0) comes first, then rollout (t=0 ET), then all others by time
  printedRows.sort((a, b) => {
    // Staged always first
    if (a.type === 'staged') return -1;
    if (b.type === 'staged') return 1;
    // Rollout second (ET=0)
    if (a.type === 'rollout') return -1;
    if (b.type === 'rollout') return 1;
    // Then sort by time
    return a.raw.time_s - b.raw.time_s;
  });
  
  
  return {
    et_s,
    mph,
    timeslip: roundedTimeslip,
    traces,
    meta: {
      model: 'VB6Exact' as const,
      steps: trace.length,
      warnings,
    },
    vb6Diagnostics: convergenceHistory,
    debugData,
    // VB6 Printed Row Stream - authoritative output for strict equivalence testing
    printedRows,
  };
}

/**
 * VB6 Exact Model class for compatibility with existing infrastructure
 */
export const VB6ExactModel = {
  name: 'VB6Exact',
  simulate: simulateVB6Exact,
};
