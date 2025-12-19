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
  vb6DoOpt,
  type VB6VehicleParams,
  type VB6EnvParams,
  type ThrottleStopParams,
  type VB6DoOptContext,
  type VB6ASV,
} from '../vb6/vb6SimulationStep';
import { airDensityVB6, type FuelSystemType } from '../vb6/air';
import { gc, FPS_TO_MPH } from '../vb6/constants';
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
function getFuelSystemType(fuel: string | undefined): FuelSystemType {
  if (!fuel) return 1;
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
  
  // If we have a valid HP curve, use it (QuarterPro mode)
  if (xrpm.length >= 2) {
    return { xrpm, yhp, NHP: xrpm.length, isQuarterJr: false };
  }
  
  // QuarterJr mode: Generate synthetic curve using ENGINE() function
  const peakHP = Number(vehicle.powerHP ?? (vehicle as any).peakHP);
  const rpmAtPeakHP = Number((vehicle as any).rpmAtPeakHP ?? (vehicle as any).peakRPM ?? 6500);
  const displacement_cid = Number((vehicle as any).displacement_cid ?? (vehicle as any).displacementCID ?? 350);
  const fuelSystem = ((input as any).fuelSystem ?? (vehicle as any).fuelSystem ?? 1) as FuelSystemValue;
  
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
  // VB6: calc track temperature effect using modified original GoldMind logic
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
  const rolloutIn = (vehicle as any).rolloutIn ?? 9;  // Staging beam rollout (inches)
  const overhangIn = (vehicle as any).overhangIn ?? 0; // Front overhang (inches)
  
  // VB6 TIMESLIP.FRM lines 809-815: Calculate overhang adjustment
  // ftd = front tire diameter = 2 * rollout (minimum 24")
  // ovradj = (overhang + 0.25 * ftd) / 12 (minimum 0.5 * ftd / 12)
  let ftd = 2 * rolloutIn;
  if (ftd < 24) ftd = 24;
  let ovradj = (overhangIn + 0.25 * ftd) / 12;
  const minOvradj = 0.5 * ftd / 12;
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
  const trackTempF = env.trackTempF ?? (env.temperatureF + 30);
  
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
  const tire = (vehicle as any).tire;
  const tireDiaIn = tire?.diameter_in ?? vehicle.tireDiaIn ?? 32;
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
  
  if (isQuarterJr && quarterJrParams) {
    // ====================================================================
    // QuarterJr Mode: Calculate all derived parameters
    // VB6: TIMESLIP.FRM lines 714-806 (#Else branch)
    // ====================================================================
    const { displacement_cid, fuelSystem } = quarterJrParams;
    
    // Calculate transmission efficiencies (VB6: TIMESLIP.FRM lines 721-737)
    TGEff = calcTransEfficiencies(NGR, !isClutch);
    
    // Single shift RPM for all gears (VB6: TIMESLIP.FRM lines 726, 736)
    const singleShiftRPM = (vehicle as any).shiftRPM ?? drivetrain?.shiftRPM ?? 7000;
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
          const B = (ztq[k] - ztq[k1]) / (hpc * (xrpm[k] - xrpm[k1]));
          // VB6: c = gc_HPTQMult.Value * ztq(k) / hpc - xrpm(k) * B
          const c = ztq[k] / hpc - xrpm[k] * B;
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
        
        // VB6: Stall = Round(Stall, 20) - round to nearest 20
        calculatedStall = Math.round(calculatedStall / 20) * 20;
        
        // VB6: Check calculated stall RPM against limits
        if (calculatedStall < xrpm[0]) {
          calculatedStall = xrpm[0];
        }
        
        stallRPM = calculatedStall > 0 ? calculatedStall : xrpm[0];
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
    const rawShiftRPMs = drivetrain?.shiftRPMs ?? drivetrain?.shiftsRPM ?? 
                (vehicle as any).shiftRPMs ?? (vehicle as any).shiftsRPM ?? 
                (vehicle as any).shiftRPM ?? gearRatios.map(() => 7000);
    
    // Validate and trim shift RPMs to correct length (NGR - 1)
    const expectedShiftCount = gearRatios.length - 1;
    if (Array.isArray(rawShiftRPMs) && rawShiftRPMs.length > expectedShiftCount) {
      // Trim extra values (e.g., [9200, 9400, 100] → [9200, 9400] for 3 gears)
      shiftRPMs = rawShiftRPMs.slice(0, expectedShiftCount);
      warnings.push(`Shift RPMs trimmed from ${rawShiftRPMs.length} to ${expectedShiftCount} values`);
    } else {
      shiftRPMs = rawShiftRPMs;
    }
    
    // Get stall/slip RPM
    const clutchSlipRPM = clutch?.slipRPM ?? (vehicle as any).clutchSlipRPM ?? 7200;
    const converterStallRPM = converter?.stallRPM ?? (vehicle as any).converterStallRPM ?? 5500;
    stallRPM = isClutch ? clutchSlipRPM : converterStallRPM;
    
    // Get slippage factor (VB6's gc_Slippage.Value)
    // slipRatio from clutch config IS the slippage factor
    const clutchSlippage = clutch?.slippageFactor ?? clutch?.slippage ?? clutch?.slipRatio ?? (vehicle as any).clutchSlippage ?? 1.0025;
    const converterSlippage = converter?.slippageFactor ?? converter?.slippage ?? (vehicle as any).converterSlippage ?? 1.06;
    slippage = isClutch ? clutchSlippage : converterSlippage;
    
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
    overallEfficiency = drivetrain?.overallEfficiency ?? (vehicle as any).transEfficiency ?? 0.97;
    
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
  const HP_launch_calc = TABY(xrpm, yhp, NHP, 1, launchRPM_calc);
  const hpTqMult = (vehicle as any).hpTorqueMultiplier ?? engine?.hpTqMult ?? 1.0;
  const HP_corrected = hpTqMult * HP_launch_calc / hpc;
  
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
  // Clutch: 0.88 (12% losses), Converter: 0.96 (4% losses)
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
    
    GearRatio: finalDrive,
    TGR: gearRatios,
    TGEff,
    Efficiency: overallEfficiency,
    DTShift: isClutch ? 0.2 : 0.25, // VB6 TIMESLIP.FRM:702-703, 722, 732
    Slippage: slippage,
    TorqueMult: torqueMult,
    Stall: stallRPM,
    LockUp: converter?.lockup ?? false,
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
    HPTQMult: (vehicle as any).hpTorqueMultiplier ?? engine?.hpTqMult ?? 1.0,
    
    ShiftRPM: shiftRPMs,
    NGR,
    // VB6 TIMESLIP.FRM:1006 - EngRPM(L) = gc_LaunchRPM.Value
    // Both clutch and converter have separate Launch RPM from Stall/Slip RPM
    // Check flat vehicle properties FIRST since that's what the UI sets
    LaunchRPM: isClutch 
      ? ((vehicle as any).clutchLaunchRPM ?? clutch?.launchRPM ?? stallRPM) 
      : ((vehicle as any).converterLaunchRPM ?? converter?.launchRPM ?? stallRPM),
    
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
  // These are used for distance targeting to hit exact print points
  const distPrintPoints = isLandSpeed 
    ? [rolloutFt, 660, 1320, 1980, 2640, 3300, 3960, 4620, 5280] // Bonneville
    : [rolloutFt, 30, 60, 330, 594, 660, 1000, 1254, 1320];      // Quarter mile
  let distPrintIdx = 0;
  
  // VB6 TIMESLIP.FRM:878-918 - Calculate TimePrintInc based on estimated ET
  // VB6 uses a physics-based ET estimate and specific kd values
  
  // VB6 line 879: hpmax calculation for ET estimate
  const TGEff1 = TGEff[0] ?? 0.99;
  const peakHP_et = Math.max(...yhp);
  const hpmax_et = (peakHP_et * hpTqMult / hpc) * TGEff1 * overallEfficiency / (slippage * tireSlipAtLaunch);
  
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
  
  // VB6 lines 890-900: kd values (much smaller than I was using!)
  // ISQUARTERPRO && !ISBVPRO: kd = 33 (line 894)
  // ISQUARTERPRO && ISBVPRO: kd = 29 (line 892)
  // else (Quarter Jr): kd = 28 (line 898)
  let kd: number;
  if (isLandSpeed) {
    kd = 29;  // Bonneville Pro
  } else {
    kd = 33;  // Quarter Pro (assuming ISQUARTERPRO since we're in Quarter Pro mode)
  }
  if (bodyStyle === 8) kd = kd - 1;  // VB6 line 896 for Quarter Pro, line 899 uses -7 for Jr
  
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
  let TimePrint = TimePrintInc;  // VB6: TimePrint = TimePrintInc (line 918)
  let Shift2PrintTime: number | undefined = undefined;  // VB6 line 1071 - set ONCE when ShiftFlag transitions 1→2
  
  // VB6 TIMESLIP.FRM:818 - MPHtoPrint array for VelMPHMatch velocity revision
  // Quarter Pro: MPHtoPrint(1) = 60/Z5, MPHtoPrint(2) = 100/Z5 (in ft/s)
  // Z5 = 3600/5280 = 0.681818 (already defined above)
  const MPHtoPrint = isLandSpeed 
    ? [100 / Z5, 200 / Z5]  // Bonneville: 100 and 200 MPH
    : [60 / Z5, 100 / Z5];  // Quarter Pro: 60 and 100 MPH
  let iMPH = 1;  // VB6 TIMESLIP.FRM:1002 - iMPH starts at 1
  
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
    TimePrint,
    shiftRPMs,  // VB6 ShiftRPM array for VelShiftMatch calculation
    iMPH,       // VB6 iMPH for VelMPHMatch velocity revision
    MPHtoPrint, // VB6 MPHtoPrint array [60/Z5, 100/Z5] in ft/s
  };
  
  // ========================================================================
  // Initialize simulation
  // ========================================================================
  // Use the same LaunchRPM that was set in vb6Vehicle to ensure consistency
  const launchRPM = vb6Vehicle.LaunchRPM;
  
  const state = vb6InitState(vb6Vehicle, vb6Env, launchRPM);
  
  // Capture initial Ags0 (clamped) before simulation loop modifies state
  const initialAgs0 = state.AGS_g;
  
  // Calculate TSMax
  // VB6 TIMESLIP.FRM:815: DistToPrint(1) = gc_Rollout.Value / 12
  // VB6 TIMESLIP.FRM:1063: TSMax = DistToPrint(1) * 0.11 * (HP * gc_TorqueMult.Value / gc_Weight.Value) ^ (-1/3)
  // Note: At this point in VB6, HP has already been corrected by HPTQMult/hpc (line 1011)
  const rolloutFt_tsmax = (vehicle.rolloutIn ?? 12) / 12;
  const DistToPrint1 = rolloutFt_tsmax > 0 ? rolloutFt_tsmax : 1; // VB6: If DistToPrint(1) = 0 Then DistToPrint(1) = 1
  const HP_launch_raw = TABY(xrpm, yhp, NHP, 1, launchRPM);
  const HP_launch_corrected = hpTqMult * HP_launch_raw / hpc;  // Apply same correction as VB6 line 1011
  const TSMax = vb6CalcTSMaxInit(
    DistToPrint1,
    HP_launch_corrected,
    torqueMult,
    vehicle.weightLb
  );
  
  
  // ========================================================================
  // Run simulation
  // ========================================================================
  // For land speed runs, allow more steps and time
  const MAX_STEPS = isLandSpeed ? 50000 : 5000;
  const MAX_TIME_S = isLandSpeed ? 300 : 30;  // 5 minutes for land speed
  
  const convergenceHistory: VB6ExactResult['vb6Diagnostics'] = {
    iterations: [],
    convergenceHistory: [],
  };
  
  // Timeslip results (array format per SimResult)
  // TIMESLIP recording is now integrated with distPrintIdx (VB6's iDist)
  const timeslip: { d_ft: number; t_s: number; v_mph: number }[] = [];
  
  // Track when the timer starts (when car has moved rolloutFt distance)
  let timerStartTime_s: number | null = null;
  
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
    slip: false,
    tireSlip: 1,
    hp: 0,
    dragHp: 0,
    netHp: 0,
    wheelSpeed_mph: 0,
    throttleStopActive: false,
  });
  
  // Debug: Log initial state for timing analysis
  console.log('[vb6Exact] Initial state:', JSON.stringify({
    launchRPM,
    stallRPM,
    enginePMI,
    spinUpTime: enginePMI * (stallRPM - launchRPM) / 250000,
    rolloutFt,
    ovradj,
    TSMax,
    slippage,
    torqueMult,
    isClutch,
    weight: vehicle.weightLb,
    tireDia: tireDiaIn,
    tireWidth: tireWidthIn,
    finalDrive,
    gearRatios,
    TGEff,
    shiftRPMs: vb6Vehicle.ShiftRPM,
    // Launch calculation debug
    tireSlipAtLaunch,
    trackTempEffect: trackTempEffect_early,
    tractionIndex: tractionIndex_early,
    Ags0,
    HP_launch: HP_corrected,
    TQ_launch: 5252 * HP_corrected / launchRPM * torqueMult * gearRatios[0] * TGEff[0],
    force_launch: force,
  }, null, 2));
  
  for (let step = 0; step < MAX_STEPS; step++) {
    // Check termination conditions (track distance has passed finish line)
    const currentTrackDist = state.Dist_ft - rolloutFt + ovradj;
    if (currentTrackDist >= raceLengthFt + 50) break; // Stop shortly after finish line
    if (state.time_s >= MAX_TIME_S) break;
    
    // Debug: Log first 10 steps to compare with VB6
    if (step < 10) {
      console.log(`[vb6Exact] Step ${step}: t=${state.time_s.toFixed(4)}, d=${state.Dist_ft.toFixed(3)}, v=${(state.Vel_ftps * FPS_TO_MPH).toFixed(2)}mph (${state.Vel_ftps.toFixed(3)}fps), a=${state.AGS_g.toFixed(3)}g, rpm=${Math.round(state.EngRPM)}, gear=${state.Gear}`);
    }
    
    // Debug: Check for NaN before step
    if (!Number.isFinite(state.Vel_ftps) || !Number.isFinite(state.Dist_ft) || !Number.isFinite(state.AGS_g)) {
      warnings.push(`NaN detected at step ${step}: Vel=${state.Vel_ftps}, Dist=${state.Dist_ft}, AGS=${state.AGS_g}`);
      break;
    }
    
    // Set nextDistPrint, prevDistPrint, and iDist for this step (VB6: iDist tracks current target)
    // VB6 iDist is 1-based, so iDist = distPrintIdx + 1
    vb6Env.nextDistPrint = distPrintPoints[distPrintIdx];
    vb6Env.prevDistPrint = distPrintIdx > 0 ? distPrintPoints[distPrintIdx - 1] : 0;
    vb6Env.iDist = distPrintIdx + 1;  // Convert 0-based to 1-based like VB6
    vb6Env.TimePrint = TimePrint;
    
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
    const stepResult = vb6SimulationStep(state, vb6Vehicle, vb6Env, TSMax, throttleStopParams);
    
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
          TimePrint: TimePrint,
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
          console.log(`[vb6Exact] doOpt interpolation at step ${step}: dist=${doOptResult.dist.toFixed(2)}, time=${doOptResult.time.toFixed(4)}, vel=${doOptResult.vel.toFixed(2)}`);
        }
      }
    }
    
    // VB6 TIMESLIP.FRM:1355 - Check for shift TRIGGER (before distance check!)
    // This sets ShiftFlag = 1 when at shift point, BEFORE the distance check
    // The distance check then uses this updated ShiftFlag
    if (state.ShiftFlag === 0 && state.Gear < vb6Vehicle.NGR) {
      const shiftMode = vb6Vehicle.ShiftMode ?? 'rpm';
      
      if (shiftMode === 'time') {
        const shiftTime = vb6Vehicle.ShiftTimes?.[state.Gear - 1];
        if (shiftTime !== undefined && state.time_s >= shiftTime) {
          state.ShiftFlag = 1;
        }
      } else {
        // VB6 TIMESLIP.FRM:860 - ShiftRPMTol = 10: If ShiftRPM(1) > 8000 Then ShiftRPMTol = 20
        // VB6 TIMESLIP.FRM:1355 - If iGear < NGR And Abs(ShiftRPM(iGear) - EngRPM(L)) < ShiftRPMTol Then ShiftFlag = 1
        const shiftRPM = vb6Vehicle.ShiftRPM[state.Gear - 1] ?? 7000;
        const shiftRPMTol = (vb6Vehicle.ShiftRPM[0] ?? 7000) > 8000 ? 20 : 10;
        if (Math.abs(shiftRPM - state.EngRPM) < shiftRPMTol) {
          state.ShiftFlag = 1;
        }
      }
    }
    
    // VB6: TIMESLIP.FRM:1373-1418 and doOpt/sub310 - Distance print detection
    // VB6 has TWO mechanisms:
    // 1. Line 1375: (DistStep < DistTol And (DistStep / Vel(L)) < TimeTol) - within tolerance
    // 2. doOpt/sub310: When Dist(L) >= DistToPrint(iDist) + DistTol - overshoot, then interpolate back
    // Both mechanisms trigger distance recording and iDist advancement.
    const currentTarget = distPrintPoints[distPrintIdx];
    const DistStep = Math.abs(currentTarget - state.Dist_ft);
    // VB6 DistTol is dynamic, updated AFTER each distance target is reached:
    // - Initial (iDist=1): 0.005 (TIMESLIP.FRM:997)
    // - After rollout Case 1 (iDist=2,3,4): 0.1 (TIMESLIP.FRM:1379)
    // - After 330ft Case 4 (iDist>=5): 0.008 (TIMESLIP.FRM:1387)
    const vb6iDist_check = distPrintIdx + 1;
    let DistTol: number;
    if (vb6iDist_check <= 1) {
      DistTol = 0.005;  // Initial value for rollout
    } else if (vb6iDist_check <= 4) {
      DistTol = 0.1;    // After rollout, before 330ft
    } else {
      DistTol = 0.008;  // After 330ft
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
      // TIMESLIP indices:                     1       2   3    4    5    6     7     8     9
      // Note: distPrintIdx is 0-based, VB6 iDist is 1-based
      const vb6iDist = distPrintIdx + 1;  // Convert to VB6's 1-based index
      
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
            let speed_mph = recordVel_ftps * FPS_TO_MPH;  // fallback using interpolated velocity
            if (saveTime_594ft !== null && interpolatedTrackTime > saveTime_594ft) {
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
            let speed_mph = recordVel_ftps * FPS_TO_MPH;  // fallback using interpolated velocity
            if (saveTime_1254ft !== null && interpolatedTrackTime > saveTime_1254ft) {
              speed_mph = FPS_TO_MPH * 66 / (interpolatedTrackTime - saveTime_1254ft);
            }
            timeslip.push({ d_ft: 1320, t_s: interpolatedTrackTime, v_mph: speed_mph });
            saveTime_1254ft = null;  // VB6: SaveTime = 0
          }
        }
      }
      
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
        timerStartTime_s = state.time_s;
        
        // VB6 line 1381: Dist(L) = Dist(L) + ovradj - PERMANENTLY adjust distance for front overhang
        // This is critical - after this point, all distances include ovradj
        state.Dist_ft = state.Dist_ft + ovradj;
        // vb6SimulationStep already set Dist0_ft = Dist_ft (before adjustment)
        // We need to update Dist0_ft to the adjusted value so next step starts correctly
        state.Dist0_ft = state.Dist_ft;
        
        // Debug: Log rollout timing
        console.log(`[vb6Exact] ROLLOUT: t=${timerStartTime_s.toFixed(4)}s, d=${state.Dist_ft.toFixed(4)}ft (after ovradj=${ovradj.toFixed(3)}), v=${(state.Vel_ftps * FPS_TO_MPH).toFixed(2)}mph, step=${step}`);
      }
    }
    
    // Debug: Log at key distance points to find where discrepancy accumulates
    // VB6 TA Dragster times: 60ft=0.89s, 330ft=2.38s, 660ft=3.55s, 1000ft=4.58s, 1320ft=5.52s
    // After rollout, state.Dist_ft already includes ovradj (VB6 line 1381)
    // So trackDist = state.Dist_ft - rolloutFt (ovradj is already in Dist_ft)
    const trackDist = timerStartTime_s !== null 
      ? state.Dist_ft - rolloutFt  // After rollout: Dist_ft includes ovradj
      : 0;
    const trackTime = timerStartTime_s !== null ? state.time_s - timerStartTime_s : 0;
    if (trackDist >= 60 && trackDist < 62) {
      console.log(`[vb6Exact] 60ft: t=${trackTime.toFixed(3)}s, v=${(state.Vel_ftps * FPS_TO_MPH).toFixed(1)}mph, a=${state.AGS_g.toFixed(2)}g, rpm=${Math.round(state.EngRPM)}, gear=${state.Gear}`);
    }
    if (trackDist >= 330 && trackDist < 335) {
      console.log(`[vb6Exact] 330ft: t=${trackTime.toFixed(3)}s, v=${(state.Vel_ftps * FPS_TO_MPH).toFixed(1)}mph, a=${state.AGS_g.toFixed(2)}g, rpm=${Math.round(state.EngRPM)}, gear=${state.Gear}`);
    }
    if (trackDist >= 660 && trackDist < 665) {
      console.log(`[vb6Exact] 660ft: t=${trackTime.toFixed(3)}s, v=${(state.Vel_ftps * FPS_TO_MPH).toFixed(1)}mph, a=${state.AGS_g.toFixed(2)}g, rpm=${Math.round(state.EngRPM)}, gear=${state.Gear}`);
    }
    if (trackDist >= 1000 && trackDist < 1005) {
      console.log(`[vb6Exact] 1000ft: t=${trackTime.toFixed(3)}s, v=${(state.Vel_ftps * FPS_TO_MPH).toFixed(1)}mph, a=${state.AGS_g.toFixed(2)}g, rpm=${Math.round(state.EngRPM)}, gear=${state.Gear}`);
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
    
    // VB6 TIMESLIP.FRM:1433-1434 - Execute shift AFTER distance check
    // Line 1433: If ShiftFlag = 1, set ShiftFlag = 2, increment gear, GoTo 230
    // Line 1434: If ShiftFlag = 2, reset ShiftFlag = 0
    // Note: Shift TRIGGER (0→1) is done BEFORE distance check (see above)
    if (state.ShiftFlag === 1) {
      // ShiftFlag was set this step or earlier - now execute shift
      state.ShiftFlag = 2;
      state.Gear++;
      // VB6 TIMESLIP.FRM:1071 - Set Shift2PrintTime ONCE when entering gear change loop (section 230)
      // Shift2PrintTime = time(L) + DTShift
      Shift2PrintTime = state.time_s + vb6Vehicle.DTShift;
    } else if (state.ShiftFlag === 2) {
      // Shift complete, reset flag and clear Shift2PrintTime
      state.ShiftFlag = 0;
      Shift2PrintTime = undefined;
    }
    
    // VB6 TIMESLIP.FRM:1421-1422 - Check for time print update (AFTER step completes)
    // If (Abs(TimePrint - time(L)) < TimeTol) Or (ShiftFlag = 2 And time(L) >= TimePrint) Then
    //     TimePrint = TimePrint + TimePrintInc
    const TimeTolForPrint = 0.002;
    if (Math.abs(TimePrint - state.time_s) < TimeTolForPrint || 
        (state.ShiftFlag === 2 && state.time_s >= TimePrint)) {
      TimePrint = TimePrint + TimePrintInc;
    }
    
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
  const et_s = finalResult?.t_s ?? state.time_s;
  const mph = finalResult?.v_mph ?? (state.Vel_ftps * FPS_TO_MPH);
  
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
      slippageSource: clutch?.slippageFactor !== undefined ? 'clutch.slippageFactor' :
                      clutch?.slippage !== undefined ? 'clutch.slippage' :
                      (vehicle as any).clutchSlippage !== undefined ? 'vehicle.clutchSlippage' : 'default',
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
    // VB6-style run trace printout
    runTrace: generateRunTrace(trace, rolloutIn, timerStartTime_s ?? 0),
  };
  
  return {
    et_s,
    mph,
    timeslip,
    traces,
    meta: {
      model: 'VB6Exact' as const,
      steps: trace.length,
      warnings,
    },
    vb6Diagnostics: convergenceHistory,
    debugData,
  };
}

/**
 * VB6 Exact Model class for compatibility with existing infrastructure
 */
export const VB6ExactModel = {
  name: 'VB6Exact',
  simulate: simulateVB6Exact,
};
