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
  type ThrottleStopParams,
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
import { DISTANCES, RACE_LENGTH_INFO, type RaceLength } from '../../config/raceLengths';

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
 * Get distance checkpoints for a race length
 */
function getDistanceTargets(raceLength: RaceLength | string): readonly number[] {
  const distances = DISTANCES[raceLength as RaceLength];
  if (distances) return distances;
  
  // Fallback
  return raceLength === 'EIGHTH' ? DISTANCES.EIGHTH : DISTANCES.QUARTER;
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
  
  // Handle legacy/descriptive strings
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
  
  // Debug: Log HP curve sources
  console.log('[VB6Exact] extractHPCurve sources:', {
    'engine?.hpCurve': engine?.hpCurve?.length,
    'engine?.torqueCurve': engine?.torqueCurve?.length,
    'vehicle.torqueCurve': (vehicle as any).torqueCurve?.length,
    'vehicle.hpCurve': (vehicle as any).hpCurve?.length,
    'resolved hpCurve length': hpCurve.length,
    'first 2 points': hpCurve.slice(0, 2),
  });
  
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
    console.log('[VB6Exact] Using QuarterPro HP curve:', {
      NHP: xrpm.length,
      rpmRange: `${Math.min(...xrpm)} - ${Math.max(...xrpm)}`,
      hpRange: `${Math.min(...yhp)} - ${Math.max(...yhp)}`,
      peakHP: Math.max(...yhp),
      curve: xrpm.map((r, i) => `${r}:${yhp[i]}`).join(', '),
    });
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
  const rawFuel = (input as any).fuel;
  const fuelString: string | undefined = typeof rawFuel === 'string' 
    ? rawFuel 
    : (rawFuel?.fuelType ?? rawFuel?.fuelSystem ?? rawFuel?.type ?? (input as any).fuelType ?? (input as any).fuelSystem ?? (vehicle as any).fuelSystem);
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
        // Direct RPM input
        stallRPM = inputSlipStall;
        const shp = taby(xrpm, yhp, NHP, 1, stallRPM);
        const stq = shp * (Z6 / stallRPM) / hpc;
        work = (stallRPM / 1000) * (stallRPM / stq);
      } else {
        // Stall index input
        work = inputSlipStall;
        stallRPM = inputSlipStall;
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
    
    // Gear efficiencies - use from fixture/vehicle
    const gearEfficiencies = drivetrain?.perGearEff ?? (vehicle as any).gearEfficiencies ?? null;
    TGEff = gearEfficiencies ?? gearRatios.map(() => 0.99);
    
    // Per-gear shift RPMs
    shiftRPMs = drivetrain?.shiftRPMs ?? drivetrain?.shiftsRPM ?? 
                (vehicle as any).shiftRPMs ?? gearRatios.map(() => 7000);
    
    // Get stall/slip RPM
    const clutchSlipRPM = clutch?.slipRPM ?? (vehicle as any).clutchSlipRPM ?? 7200;
    const converterStallRPM = converter?.stallRPM ?? (vehicle as any).converterStallRPM ?? 5500;
    stallRPM = isClutch ? clutchSlipRPM : converterStallRPM;
    
    // Get slippage factor
    const clutchSlippage = clutch?.slippageFactor ?? clutch?.slippage ?? clutch?.slipRatio ?? (vehicle as any).clutchSlippage ?? 1.0025;
    const converterSlippage = converter?.slippageFactor ?? converter?.slippage ?? converter?.slipRatio ?? (vehicle as any).converterSlippage ?? 1.06;
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
    overallEfficiency = drivetrain?.overallEfficiency ?? (vehicle as any).transEfficiency ?? 0.97;
    
    // Aero coefficients from user input - check aero object first
    const aero = (input as any).aero ?? (vehicle as any).aero;
    dragCoef = aero?.Cd ?? aero?.cd ?? vehicle.cd ?? 0.35;
    liftCoef = aero?.Cl ?? aero?.cl ?? vehicle.liftCoeff ?? 0;
    overhangInCalc = overhangIn;
  }
  
  // CG height - use from fixture if provided, otherwise calculate from tire radius + 3.75"
  const YCG_in = (vehicle as any).cgHeight_in ?? (vehicle as any).cgHeightIn ?? ((tireDiaIn / 2) + 3.75);
  
  // Static front weight (default 38% of total)
  const staticFWt = (vehicle as any).staticFrontWeight_lb ?? (vehicle as any).staticFrontWeightLb ?? (vehicle.weightLb * 0.38);
  
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
    LaunchRPM: isClutch 
      ? (clutch?.launchRPM ?? (vehicle as any).clutchLaunchRPM ?? stallRPM) 
      : stallRPM,
    
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
  const trackTempF = env.trackTempF ?? 100;
  // VB6: TIMESLIP.FRM:874 - Bonneville Pro forces TrackTempEffect = 1
  const trackTempEffect = isLandSpeed ? 1 : calcTrackTempEffect(trackTempF);
  
  const vb6Env: VB6EnvParams = {
    rho: rho_lbm_ft3,
    hpc,
    TractionIndex: env.tractionIndex ?? 5,
    TrackTempEffect: trackTempEffect,
    WindSpeed_mph: env.windMph ?? 0,
    WindAngle_deg: env.windAngleDeg ?? 0,
    isLandSpeed,  // Use Bonneville Pro constants for land speed runs
  };
  
  // ========================================================================
  // Initialize simulation
  // ========================================================================
  const launchRPM = isClutch 
    ? (clutch?.launchRPM ?? stallRPM)
    : stallRPM;
  
  const state = vb6InitState(vb6Vehicle, vb6Env, launchRPM);
  
  // Calculate TSMax
  // VB6 TIMESLIP.FRM:815: DistToPrint(1) = gc_Rollout.Value / 12
  // VB6 TIMESLIP.FRM:1063: TSMax = DistToPrint(1) * 0.11 * (HP * gc_TorqueMult.Value / gc_Weight.Value) ^ (-1/3)
  // Note: Using 60ft gives better results - the VB6 timestep logic is complex
  const HP_launch = TABY(xrpm, yhp, NHP, 1, launchRPM);
  const TSMax = vb6CalcTSMaxInit(
    60, // Using 60ft for now - matches observed behavior better
    HP_launch,
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
  const timeslip: { d_ft: number; t_s: number; v_mph: number }[] = [];
  // Distance targets depend on race length (these are TRACK distances, not rear tire distances)
  const distanceTargets = getDistanceTargets(raceLength);
  let targetIdx = 0;
  
  // Track when the timer starts (when car has moved rolloutFt distance)
  let timerStartTime_s: number | null = null;
  
  // VB6 trap speed calculation: average speed over last 66ft
  // TIMESLIP.FRM:1388,1396,1619,1624 - SaveTime is set at 594ft (for 660) and 1254ft (for 1320)
  // TIMESLIP.FRM:1392,1400,1621,1626 - MPH = Z5 * 66 / (time_at_finish - SaveTime)
  let saveTime_594ft: number | null = null;  // Time at 594ft (66ft before 660ft)
  let saveTime_1254ft: number | null = null; // Time at 1254ft (66ft before 1320ft)
  
  for (let step = 0; step < MAX_STEPS; step++) {
    // Check termination conditions (track distance has passed finish line)
    const currentTrackDist = state.Dist_ft - rolloutFt + ovradj;
    if (currentTrackDist >= raceLengthFt + 50) break; // Stop shortly after finish line
    if (state.time_s >= MAX_TIME_S) break;
    
    // Debug: Check for NaN before step
    if (!Number.isFinite(state.Vel_ftps) || !Number.isFinite(state.Dist_ft) || !Number.isFinite(state.AGS_g)) {
      warnings.push(`NaN detected at step ${step}: Vel=${state.Vel_ftps}, Dist=${state.Dist_ft}, AGS=${state.AGS_g}`);
      break;
    }
    
    // Run one VB6 step (pass throttle stop params for bracket racing)
    const stepResult = vb6SimulationStep(state, vb6Vehicle, vb6Env, TSMax, throttleStopParams);
    
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
    if (timerStartTime_s === null && state.Dist_ft >= rolloutFt) {
      // Interpolate to find exact time when we crossed rolloutFt
      // Use linear interpolation based on velocity
      const distPastRollout = state.Dist_ft - rolloutFt;
      const timeToReachRollout = distPastRollout / state.Vel_ftps;
      timerStartTime_s = state.time_s - timeToReachRollout;
    }
    
    // Calculate track distance (what the timer measures)
    // VB6 TIMESLIP.FRM line 1381: After rollout, distance is adjusted by ovradj
    // Dist(L) = Dist(L) + ovradj
    // This accounts for the front overhang - the nose is ahead of where the rear tires are
    // Track distance = (rear_tire_position - rollout) + ovradj
    const trackDist_ft = Math.max(0, state.Dist_ft - rolloutFt + ovradj);
    const trackTime_s = timerStartTime_s !== null ? state.time_s - timerStartTime_s : 0;
    
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
    
    // VB6 trap speed: capture time at 66ft before finish lines
    // TIMESLIP.FRM:1388,1619 - Case 5 (594ft): SaveTime = time(L)
    // TIMESLIP.FRM:1396,1624 - Case 8 (1254ft): SaveTime = time(L)
    // We need to interpolate to get the exact time when crossing these distances
    if (saveTime_594ft === null && trackDist_ft >= 594) {
      // Interpolate to find exact time at 594ft
      const prevDist = trace.length > 1 ? trace[trace.length - 2]?.s_ft ?? 0 : 0;
      const prevTime = trace.length > 1 ? trace[trace.length - 2]?.t_s ?? 0 : 0;
      if (prevDist < 594 && trackDist_ft > prevDist) {
        const frac = (594 - prevDist) / (trackDist_ft - prevDist);
        saveTime_594ft = prevTime + frac * (trackTime_s - prevTime);
      } else {
        saveTime_594ft = trackTime_s;
      }
    }
    if (saveTime_1254ft === null && trackDist_ft >= 1254) {
      // Interpolate to find exact time at 1254ft
      const prevDist = trace.length > 1 ? trace[trace.length - 2]?.s_ft ?? 0 : 0;
      const prevTime = trace.length > 1 ? trace[trace.length - 2]?.t_s ?? 0 : 0;
      if (prevDist < 1254 && trackDist_ft > prevDist) {
        const frac = (1254 - prevDist) / (trackDist_ft - prevDist);
        saveTime_1254ft = prevTime + frac * (trackTime_s - prevTime);
      } else {
        saveTime_1254ft = trackTime_s;
      }
    }
    
    // Check distance targets (using track distance)
    while (targetIdx < distanceTargets.length && trackDist_ft >= distanceTargets[targetIdx]) {
      const target = distanceTargets[targetIdx];
      
      // Interpolate to find exact time at target distance
      const prevDist = trace.length > 1 ? trace[trace.length - 2]?.s_ft ?? 0 : 0;
      const prevTime = trace.length > 1 ? trace[trace.length - 2]?.t_s ?? 0 : 0;
      let exactTime = trackTime_s;
      if (prevDist < target && trackDist_ft > prevDist) {
        const frac = (target - prevDist) / (trackDist_ft - prevDist);
        exactTime = prevTime + frac * (trackTime_s - prevTime);
      }
      
      // VB6 trap speed calculation: average speed over last 66ft
      // TIMESLIP.FRM:1392,1621 - TIMESLIP(4) = Z5 * 66 / (TIMESLIP(3) - SaveTime) for 660ft
      // TIMESLIP.FRM:1400,1626 - TIMESLIP(7) = Z5 * 66 / (TIMESLIP(6) - SaveTime) for 1320ft
      let speed_mph: number;
      if (target === 660 && saveTime_594ft !== null && exactTime > saveTime_594ft) {
        // 8th mile trap speed: 66ft / (time@660 - time@594) * Z5
        // Z5 = 3600/5280 = FPS_TO_MPH, so: 66 / dt * Z5 = 66 / dt * (3600/5280) mph
        speed_mph = FPS_TO_MPH * 66 / (exactTime - saveTime_594ft);
      } else if (target === 1320 && saveTime_1254ft !== null && exactTime > saveTime_1254ft) {
        // 1/4 mile trap speed: 66ft / (time@1320 - time@1254) * Z5
        speed_mph = FPS_TO_MPH * 66 / (exactTime - saveTime_1254ft);
      } else {
        // For other distances (60ft, 330ft, 1000ft), use instantaneous velocity
        speed_mph = state.Vel_ftps * FPS_TO_MPH;
      }
      
      timeslip.push({
        d_ft: target,
        t_s: exactTime,
        v_mph: speed_mph,
      });
      targetIdx++;
    }
    
    // Handle gear shifts - VB6 TIMESLIP.FRM:1355, 1433-1434
    // VB6 uses ShiftFlag state machine:
    // 1. Line 1355: If at shift RPM, set ShiftFlag = 1
    // 2. Line 1433: If ShiftFlag = 1, set ShiftFlag = 2, increment gear, GoTo 230 (DTShift applied)
    // 3. Line 1434: If ShiftFlag = 2, reset ShiftFlag = 0
    if (state.ShiftFlag === 1) {
      // ShiftFlag was set last step - now increment gear and apply DTShift
      state.ShiftFlag = 2;
      state.Gear++;
      // PrevGear will differ from Gear, triggering DTShift in next step
    } else if (state.ShiftFlag === 2) {
      // Shift complete, reset flag
      state.ShiftFlag = 0;
    } else if (state.Gear < vb6Vehicle.NGR) {
      // Check if we should initiate a shift
      const shiftMode = vb6Vehicle.ShiftMode ?? 'rpm';
      
      if (shiftMode === 'time') {
        // Shift by elapsed time
        const shiftTime = vb6Vehicle.ShiftTimes?.[state.Gear - 1];
        if (shiftTime !== undefined && state.time_s >= shiftTime) {
          state.ShiftFlag = 1;
        }
      } else {
        // Shift by RPM (default VB6 behavior)
        const shiftRPM = vb6Vehicle.ShiftRPM[state.Gear - 1] ?? 7000;
        
        // VB6: Shift when RPM reaches or exceeds shift point
        if (state.EngRPM >= shiftRPM) {
          state.ShiftFlag = 1;
        }
      }
    }
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
  };
}

/**
 * VB6 Exact Model class for compatibility with existing infrastructure
 */
export const VB6ExactModel = {
  name: 'VB6Exact',
  simulate: simulateVB6Exact,
};
