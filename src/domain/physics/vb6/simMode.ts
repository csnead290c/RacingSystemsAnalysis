/**
 * VB6 Simulation Mode Handler
 * 
 * This module handles the differences between QuarterJr and QuarterPro modes.
 * 
 * QuarterJr Mode (simplified inputs):
 * - Peak HP, RPM at Peak HP, Displacement
 * - Single Shift RPM for all gears
 * - Body Style determines aero coefficients
 * - PMI values are calculated from displacement
 * - Transmission efficiencies are calculated
 * - ENGINE() generates synthetic HP curve
 * 
 * QuarterPro Mode (full inputs):
 * - Full HP/Torque curve (up to 11 points)
 * - Per-gear Shift RPM
 * - Per-gear Transmission Efficiency
 * - User-specified aero coefficients
 * - User-specified PMI values
 * - Launch RPM separate from Stall RPM
 * 
 * Source: TIMESLIP.FRM lines 699-806 (conditional compilation blocks)
 */

import { Z6 } from './constants';
import { buildEngineCurve, convertToZeroIndexed } from './engineCurve';
import { taby } from './dtaby';
import { 
  calcBodyStyle, 
  getAeroByBodyStyle, 
  calcTransEfficiencies,
  calcPMI,
  calcEfficiency,
} from './quarterJr';
import { type FuelSystemValue } from './calcWork';

/**
 * Simulation mode
 */
export type SimMode = 'quarterJr' | 'quarterPro';

/**
 * QuarterJr-specific inputs (simplified)
 */
export interface QuarterJrModeInputs {
  mode: 'quarterJr';
  
  // Engine (required)
  peakHP: number;
  rpmAtPeakHP: number;
  displacement_cid: number;
  fuelSystem: FuelSystemValue;
  
  // Vehicle (required)
  weight_lbf: number;
  wheelbase_in: number;
  tireDia_in: number;
  tireWidth_in: number;
  rollout_in: number;
  
  // Transmission (required)
  isConverter: boolean;
  gearRatios: number[];  // Just the ratios, efficiencies are calculated
  finalDrive: number;
  shiftRPM: number;      // Single value for all gears
  
  // Converter-specific
  converterDia_in?: number;
  slipStallRPM?: number;  // Can be RPM (>220) or Stall Index (<=220)
  
  // Optional overrides (normally calculated)
  bodyStyle?: number;
  
  // Environment
  hpc?: number;
}

/**
 * QuarterPro-specific inputs (full control)
 */
export interface QuarterProModeInputs {
  mode: 'quarterPro';
  
  // Engine (full curve)
  hpCurve: { rpm: number; hp: number; tq?: number }[];
  hpTqMult?: number;
  fuelSystem?: FuelSystemValue;
  
  // Vehicle
  weight_lbf: number;
  wheelbase_in: number;
  tireDia_in: number;
  tireWidth_in: number;
  rollout_in: number;
  overhang_in?: number;
  
  // Transmission (per-gear control)
  isConverter: boolean;
  gearRatios: number[];
  gearEfficiencies: number[];  // Per-gear efficiency
  finalDrive: number;
  shiftRPMs: number[];         // Per-gear shift RPM
  
  // Converter/Clutch
  launchRPM: number;
  slipStallRPM: number;
  slippage?: number;
  torqueMult?: number;
  lockup?: boolean;
  
  // Aero (user-specified)
  dragCoef: number;
  liftCoef: number;
  frontalArea_ft2: number;
  
  // PMI (user-specified)
  enginePMI: number;
  transPMI: number;
  tiresPMI: number;
  
  // CG
  staticFrontWeight_lbf?: number;
  cgHeight_in?: number;
  
  // Environment
  hpc?: number;
}

/**
 * Union type for all mode inputs
 */
export type SimModeInputs = QuarterJrModeInputs | QuarterProModeInputs;

/**
 * Normalized simulation parameters (output from mode processing)
 */
export interface NormalizedSimParams {
  // Engine curve (always 0-indexed arrays)
  xrpm: number[];
  yhp: number[];
  NHP: number;
  hpTqMult: number;
  
  // Vehicle
  weight_lbf: number;
  wheelbase_in: number;
  tireDia_in: number;
  tireWidth_in: number;
  rollout_in: number;
  overhang_in: number;
  bodyStyle: number;
  
  // Transmission
  isConverter: boolean;
  gearRatios: number[];
  gearEfficiencies: number[];
  finalDrive: number;
  shiftRPMs: number[];
  dtShift: number;
  
  // Converter/Clutch
  launchRPM: number;
  stallRPM: number;
  slippage: number;
  torqueMult: number;
  lockup: boolean;
  
  // Aero
  dragCoef: number;
  liftCoef: number;
  frontalArea_ft2: number;
  efficiency: number;
  
  // PMI
  enginePMI: number;
  transPMI: number;
  tiresPMI: number;
  
  // CG
  staticFrontWeight_lbf: number;
  cgHeight_in: number;
  
  // Mode info
  mode: SimMode;
  calculatedFields: string[];  // List of fields that were auto-calculated
}

/**
 * Process QuarterJr mode inputs
 * 
 * VB6: TIMESLIP.FRM lines 714-806 (#Else branch for QUARTER jr)
 */
function processQuarterJrInputs(
  inputs: QuarterJrModeInputs,
  hpc: number
): NormalizedSimParams {
  const calculatedFields: string[] = [];
  
  const {
    peakHP,
    rpmAtPeakHP,
    displacement_cid,
    fuelSystem,
    weight_lbf,
    wheelbase_in,
    tireDia_in,
    tireWidth_in,
    rollout_in,
    isConverter,
    gearRatios,
    finalDrive,
    shiftRPM,
    converterDia_in = 10,
    slipStallRPM: inputSlipStall = 5000,
  } = inputs;
  
  const NGR = gearRatios.length;
  
  // 1. Calculate body style from weight (VB6: QTRPERF.BAS CalcBodyStyle)
  const bodyStyle = inputs.bodyStyle ?? calcBodyStyle(weight_lbf);
  if (!inputs.bodyStyle) calculatedFields.push('bodyStyle');
  
  // 2. Build synthetic HP curve using ENGINE() (VB6: TIMESLIP.FRM line 715)
  const curve = buildEngineCurve({
    peakHP,
    peakRPM: rpmAtPeakHP,
    displacement_cid,
    fuelSystem,
  });
  const { rpm: xrpm, hp: yhp } = convertToZeroIndexed(curve);
  calculatedFields.push('hpCurve');
  
  // 3. Calculate transmission efficiencies (VB6: TIMESLIP.FRM lines 721-737)
  const gearEfficiencies = calcTransEfficiencies(NGR, isConverter);
  calculatedFields.push('gearEfficiencies');
  
  // 4. Set shift RPMs (same for all gears in QuarterJr)
  const shiftRPMs = gearRatios.map(() => shiftRPM);
  
  // 5. Calculate DTShift (VB6: TIMESLIP.FRM lines 722, 732)
  const dtShift = isConverter ? 0.25 : 0.2;
  
  // 6. Calculate slippage and torque multiplier (VB6: TIMESLIP.FRM lines 729-754)
  let slippage: number;
  let torqueMult: number;
  let stallRPM: number;
  
  if (!isConverter) {
    // Clutch: gc_Slippage.Value = 1.0025 + gc_SlipStallRPM.Value / 1000000
    slippage = 1.0025 + inputSlipStall / 1000000;
    torqueMult = 1;
    stallRPM = inputSlipStall;
    calculatedFields.push('slippage', 'torqueMult');
  } else {
    // Converter: Calculate from stall index or RPM
    let work: number;
    
    if (inputSlipStall > 220) {
      // Direct RPM input
      stallRPM = inputSlipStall;
      const shp = taby(xrpm, yhp, curve.NHP, 1, stallRPM);
      const stq = shp * (Z6 / stallRPM) / hpc;
      work = (stallRPM / 1000) * (stallRPM / stq);
    } else {
      // Stall index input
      work = inputSlipStall;
      stallRPM = inputSlipStall;  // Will be refined during simulation
    }
    
    // VB6: lrat = Work / (200 * (7 / gc_ConvDia.Value) ^ 4)
    const lrat = work / (200 * Math.pow(7 / converterDia_in, 4));
    
    // VB6: gc_Slippage.Value = 1.01 + lrat / 20 + Work / 8000
    slippage = 1.01 + lrat / 20 + work / 8000;
    
    // VB6: TQMult = 2.633 - lrat ^ 0.3 - Work / 1500
    torqueMult = 2.633 - Math.pow(lrat, 0.3) - work / 1500;
    if (torqueMult < 1) torqueMult = 1;
    if (torqueMult > 2) torqueMult = 2;
    
    calculatedFields.push('slippage', 'torqueMult');
  }
  
  // 7. Calculate efficiency (VB6: TIMESLIP.FRM lines 760-765)
  const efficiency = calcEfficiency(bodyStyle);
  calculatedFields.push('efficiency');
  
  // 8. Get aero coefficients from body style (VB6: TIMESLIP.FRM lines 767-777)
  const aero = getAeroByBodyStyle(bodyStyle);
  calculatedFields.push('dragCoef', 'liftCoef', 'overhang');
  
  // 9. Calculate PMI values (VB6: TIMESLIP.FRM lines 780-805)
  const pmi = calcPMI(
    displacement_cid,
    fuelSystem,
    isConverter,
    NGR,
    tireDia_in,
    tireWidth_in,
    bodyStyle
  );
  calculatedFields.push('enginePMI', 'transPMI', 'tiresPMI');
  
  // 10. Calculate frontal area (estimate from body style)
  // VB6 uses user input, but we can estimate for QuarterJr
  let frontalArea_ft2: number;
  switch (bodyStyle) {
    case 8: frontalArea_ft2 = 6; break;   // Motorcycle
    case 1: frontalArea_ft2 = 18; break;  // Dragster with wing
    case 2: frontalArea_ft2 = 14; break;  // Dragster
    case 5: frontalArea_ft2 = 20; break;  // Fastback
    default: frontalArea_ft2 = 22; break; // Others
  }
  calculatedFields.push('frontalArea');
  
  // 11. Calculate static front weight (VB6: TIMESLIP.FRM lines 1041-1044)
  // Default to 38% front weight bias
  const staticFrontWeight_lbf = weight_lbf * 0.38;
  calculatedFields.push('staticFrontWeight');
  
  // 12. Calculate CG height (VB6: TIMESLIP.FRM lines 1031-1032)
  // YCG = (TireDia / 2) + 3.75
  const cgHeight_in = (tireDia_in / 2) + 3.75;
  calculatedFields.push('cgHeight');
  
  // Launch RPM = Stall RPM for QuarterJr (VB6: TIMESLIP.FRM line 992)
  const launchRPM = stallRPM;
  calculatedFields.push('launchRPM');
  
  return {
    xrpm,
    yhp,
    NHP: curve.NHP,
    hpTqMult: 1.0,
    
    weight_lbf,
    wheelbase_in,
    tireDia_in,
    tireWidth_in,
    rollout_in,
    overhang_in: aero.overhang_in,
    bodyStyle,
    
    isConverter,
    gearRatios,
    gearEfficiencies,
    finalDrive,
    shiftRPMs,
    dtShift,
    
    launchRPM,
    stallRPM,
    slippage,
    torqueMult,
    lockup: false,
    
    dragCoef: aero.dragCoef,
    liftCoef: aero.liftCoef,
    frontalArea_ft2,
    efficiency,
    
    enginePMI: pmi.enginePMI,
    transPMI: pmi.transPMI,
    tiresPMI: pmi.tiresPMI,
    
    staticFrontWeight_lbf,
    cgHeight_in,
    
    mode: 'quarterJr',
    calculatedFields,
  };
}

/**
 * Process QuarterPro mode inputs
 * 
 * VB6: TIMESLIP.FRM lines 699-713 (#If ISQUARTERPRO branch)
 */
function processQuarterProInputs(
  inputs: QuarterProModeInputs,
  _hpc: number
): NormalizedSimParams {
  const {
    hpCurve,
    hpTqMult = 1.0,
    weight_lbf,
    wheelbase_in,
    tireDia_in,
    tireWidth_in,
    rollout_in,
    overhang_in = 30,
    isConverter,
    gearRatios,
    gearEfficiencies,
    finalDrive,
    shiftRPMs,
    launchRPM,
    slipStallRPM,
    slippage = isConverter ? 1.06 : 1.0025,
    torqueMult = isConverter ? 2.0 : 1.0,
    lockup = false,
    dragCoef,
    liftCoef,
    frontalArea_ft2,
    enginePMI,
    transPMI,
    tiresPMI,
    staticFrontWeight_lbf = weight_lbf * 0.38,
    cgHeight_in = (tireDia_in / 2) + 3.75,
  } = inputs;
  
  // Convert HP curve to arrays
  const xrpm = hpCurve.map(p => p.rpm);
  const yhp = hpCurve.map(p => p.hp);
  
  // DTShift based on transmission type
  const dtShift = isConverter ? 0.25 : 0.2;
  
  // Determine body style from weight
  const bodyStyle = weight_lbf > 800 ? 1 : 8;
  
  // Calculate efficiency
  const efficiency = bodyStyle === 8 ? 0.985 : 0.97;
  
  return {
    xrpm,
    yhp,
    NHP: hpCurve.length,
    hpTqMult,
    
    weight_lbf,
    wheelbase_in,
    tireDia_in,
    tireWidth_in,
    rollout_in,
    overhang_in,
    bodyStyle,
    
    isConverter,
    gearRatios,
    gearEfficiencies,
    finalDrive,
    shiftRPMs,
    dtShift,
    
    launchRPM,
    stallRPM: slipStallRPM,
    slippage,
    torqueMult,
    lockup,
    
    dragCoef,
    liftCoef,
    frontalArea_ft2,
    efficiency,
    
    enginePMI,
    transPMI,
    tiresPMI,
    
    staticFrontWeight_lbf,
    cgHeight_in,
    
    mode: 'quarterPro',
    calculatedFields: [],  // All fields are user-specified
  };
}

/**
 * Process simulation inputs based on mode
 * 
 * @param inputs Mode-specific inputs
 * @param hpc HP correction factor (default 1.0)
 * @returns Normalized simulation parameters
 */
export function processSimInputs(
  inputs: SimModeInputs,
  hpc: number = 1.0
): NormalizedSimParams {
  if (inputs.mode === 'quarterJr') {
    return processQuarterJrInputs(inputs, hpc);
  } else {
    return processQuarterProInputs(inputs, hpc);
  }
}

/**
 * Detect mode from available inputs
 * 
 * If the user provides a full HP curve, use QuarterPro mode.
 * If only peak HP/RPM, use QuarterJr mode.
 */
export function detectSimMode(inputs: Record<string, unknown>): SimMode {
  // Check for full HP curve
  if (inputs.hpCurve && Array.isArray(inputs.hpCurve) && inputs.hpCurve.length >= 2) {
    return 'quarterPro';
  }
  
  // Check for per-gear efficiencies
  if (inputs.gearEfficiencies && Array.isArray(inputs.gearEfficiencies)) {
    return 'quarterPro';
  }
  
  // Check for per-gear shift RPMs
  if (inputs.shiftRPMs && Array.isArray(inputs.shiftRPMs)) {
    return 'quarterPro';
  }
  
  // Check for user-specified aero
  if (inputs.dragCoef !== undefined && inputs.liftCoef !== undefined) {
    return 'quarterPro';
  }
  
  // Check for user-specified PMI
  if (inputs.enginePMI !== undefined && inputs.transPMI !== undefined) {
    return 'quarterPro';
  }
  
  // Default to QuarterJr (simplified mode)
  return 'quarterJr';
}

/**
 * Get list of required inputs for each mode
 */
export function getRequiredInputs(mode: SimMode): string[] {
  if (mode === 'quarterJr') {
    return [
      'peakHP',
      'rpmAtPeakHP', 
      'displacement_cid',
      'fuelSystem',
      'weight_lbf',
      'wheelbase_in',
      'tireDia_in',
      'tireWidth_in',
      'rollout_in',
      'isConverter',
      'gearRatios',
      'finalDrive',
      'shiftRPM',
    ];
  } else {
    return [
      'hpCurve',
      'weight_lbf',
      'wheelbase_in',
      'tireDia_in',
      'tireWidth_in',
      'rollout_in',
      'isConverter',
      'gearRatios',
      'gearEfficiencies',
      'finalDrive',
      'shiftRPMs',
      'launchRPM',
      'slipStallRPM',
      'dragCoef',
      'liftCoef',
      'frontalArea_ft2',
      'enginePMI',
      'transPMI',
      'tiresPMI',
    ];
  }
}

/**
 * Get list of optional inputs for each mode
 */
export function getOptionalInputs(mode: SimMode): string[] {
  if (mode === 'quarterJr') {
    return [
      'bodyStyle',
      'converterDia_in',
      'slipStallRPM',
      'hpc',
    ];
  } else {
    return [
      'hpTqMult',
      'fuelSystem',
      'overhang_in',
      'slippage',
      'torqueMult',
      'lockup',
      'staticFrontWeight_lbf',
      'cgHeight_in',
      'hpc',
    ];
  }
}

/**
 * Validate inputs for a given mode
 */
export function validateInputs(
  inputs: Record<string, unknown>,
  mode: SimMode
): { valid: boolean; missing: string[]; warnings: string[] } {
  const required = getRequiredInputs(mode);
  const missing: string[] = [];
  const warnings: string[] = [];
  
  for (const field of required) {
    if (inputs[field] === undefined || inputs[field] === null) {
      missing.push(field);
    }
  }
  
  // Mode-specific validation
  if (mode === 'quarterJr') {
    const peakHP = inputs.peakHP as number;
    const rpmAtPeakHP = inputs.rpmAtPeakHP as number;
    
    if (peakHP !== undefined && peakHP < 50) {
      warnings.push('Peak HP seems low (< 50)');
    }
    if (peakHP !== undefined && peakHP > 10000) {
      warnings.push('Peak HP seems high (> 10000)');
    }
    if (rpmAtPeakHP !== undefined && rpmAtPeakHP < 2000) {
      warnings.push('RPM at Peak HP seems low (< 2000)');
    }
    if (rpmAtPeakHP !== undefined && rpmAtPeakHP > 16000) {
      warnings.push('RPM at Peak HP seems high (> 16000)');
    }
  }
  
  return {
    valid: missing.length === 0,
    missing,
    warnings,
  };
}
