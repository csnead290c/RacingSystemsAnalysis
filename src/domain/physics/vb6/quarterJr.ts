/**
 * VB6 QuarterJr Mode Calculations
 * 
 * Source: QTRPERF.BAS - Various Set* functions
 *         TIMESLIP.FRM lines 714-806 (QuarterJr initialization)
 * 
 * QuarterJr mode is a simplified input mode where the user provides:
 * - Peak HP
 * - RPM at Peak HP
 * - Displacement (CID)
 * - Fuel System Type
 * 
 * The program then calculates:
 * - Synthetic HP curve (ENGINE subroutine)
 * - Transmission efficiencies
 * - Torque multiplier and slippage (for converter)
 * - PMI values
 * - Drag/lift coefficients by body style
 */

import { type FuelSystemValue, isNaturallyAspirated } from './calcWork';
import { buildEngineCurve, convertToZeroIndexed } from './engineCurve';
import { taby } from './dtaby';

/**
 * QuarterJr input parameters
 */
export interface QuarterJrInputs {
  // Required
  peakHP: number;
  rpmAtPeakHP: number;
  displacement_cid: number;
  fuelSystem: FuelSystemValue;
  
  // Vehicle
  weight_lbf: number;
  wheelbase_in: number;
  tireDia_in: number;
  tireWidth_in: number;
  rollout_in: number;
  
  // Transmission
  isConverter: boolean;  // true = converter, false = clutch
  gearRatios: number[];  // Transmission gear ratios
  finalDrive: number;    // Final drive ratio
  
  // Converter-specific (optional)
  converterDia_in?: number;
  slipStallRPM?: number;  // Can be RPM or index
  
  // Clutch-specific (optional)
  slipRPM?: number;
  
  // Optional overrides
  bodyStyle?: number;    // 1-8, default calculated from weight
  shiftRPM?: number;     // Default = rpmAtPeakHP
}

/**
 * QuarterJr calculated outputs
 */
export interface QuarterJrOutputs {
  // HP curve
  xrpm: number[];
  yhp: number[];
  ztq: number[];
  NHP: number;
  
  // Transmission
  transEff: number[];    // Per-gear efficiency
  shiftRPMs: number[];   // Per-gear shift RPM
  
  // Converter/Clutch
  torqueMult: number;
  slippage: number;
  stallRPM: number;
  launchRPM: number;
  
  // PMI
  enginePMI: number;
  transPMI: number;
  tiresPMI: number;
  
  // Aero
  dragCoef: number;
  liftCoef: number;
  efficiency: number;
  overhang_in: number;
  
  // Body style
  bodyStyle: number;
}

/**
 * Calculate body style from weight
 * VB6: QTRPERF.BAS lines 152-166
 */
export function calcBodyStyle(weight_lbf: number): number {
  // VB6: If gc_Weight.Value > 800 Then gc_BodyStyle.Value = 1 Else gc_BodyStyle.Value = 8
  return weight_lbf > 800 ? 1 : 8;  // 8 = motorcycle
}

/**
 * Get drag/lift coefficients and overhang by body style
 * VB6: TIMESLIP.FRM lines 768-777
 */
export function getAeroByBodyStyle(bodyStyle: number): {
  dragCoef: number;
  liftCoef: number;
  overhang_in: number;
} {
  switch (bodyStyle) {
    case 1:  // Dragster with wing
      return { dragCoef: 0.66, liftCoef: 0.8, overhang_in: 30 };
    case 2:  // Dragster
      return { dragCoef: 0.5, liftCoef: 0.2, overhang_in: 30 };
    case 3:  // Funny car body
      return { dragCoef: 0.52, liftCoef: 0.8, overhang_in: 40 };
    case 4:  // Altered/roadster
      return { dragCoef: 0.52, liftCoef: 0.1, overhang_in: 30 };
    case 5:  // Fastback
      return { dragCoef: 0.28, liftCoef: 0.1, overhang_in: 30 };
    case 6:  // Sedan
      return { dragCoef: 0.4, liftCoef: 0.1, overhang_in: 24 };
    case 7:  // Station wagon/van
      return { dragCoef: 0.46, liftCoef: 0.1, overhang_in: 18 };
    case 8:  // Motorcycle
      return { dragCoef: 0.54, liftCoef: 0.1, overhang_in: 12 };
    default:
      return { dragCoef: 0.5, liftCoef: 0.2, overhang_in: 30 };
  }
}

/**
 * Calculate transmission efficiencies
 * VB6: TIMESLIP.FRM lines 721-737
 */
export function calcTransEfficiencies(
  NGR: number,
  isConverter: boolean
): number[] {
  const efficiencies: number[] = [];
  
  if (!isConverter) {
    // Clutch type trans
    // teff = 0.99
    // TGEff(i) = teff - (NGR - i) * 0.005
    const teff = 0.99;
    for (let i = 1; i <= NGR; i++) {
      efficiencies.push(teff - (NGR - i) * 0.005);
    }
  } else {
    // Converter type trans
    // teff = 0.99: If NGR >= 3 Then teff = 0.985
    // TGEff(i) = teff - (NGR - i) * 2 * 0.005
    const teff = NGR >= 3 ? 0.985 : 0.99;
    for (let i = 1; i <= NGR; i++) {
      efficiencies.push(teff - (NGR - i) * 2 * 0.005);
    }
  }
  
  return efficiencies;
}

/**
 * Calculate converter torque multiplier and slippage
 * VB6: TIMESLIP.FRM lines 739-758
 */
export function calcConverterParams(
  xrpm: number[],
  yhp: number[],
  NHP: number,
  slipStallRPM: number,
  converterDia_in: number,
  hpc: number
): { torqueMult: number; slippage: number; work: number; stallRPM: number } {
  const Z6 = 5252;
  let stallRPM: number;
  let work: number;
  
  if (slipStallRPM > 220) {
    // Direct RPM input
    stallRPM = slipStallRPM;
    
    // Get HP at stall RPM
    const shp = taby(xrpm, yhp, NHP, 1, stallRPM);
    const stq = shp * (Z6 / stallRPM) / hpc;
    work = (stallRPM / 1000) * (stallRPM / stq);
  } else {
    // Stall index input
    work = slipStallRPM;
    stallRPM = 0;  // Will be calculated later
  }
  
  // VB6: lrat = Work / (200 * (7 / gc_ConvDia.Value) ^ 4)
  const lrat = work / (200 * Math.pow(7 / converterDia_in, 4));
  
  // VB6: gc_Slippage.Value = 1.01 + lrat / 20 + Work / 8000
  const slippage = 1.01 + lrat / 20 + work / 8000;
  
  // VB6: TQMult = 2.633 - lrat ^ 0.3 - Work / 1500
  let torqueMult = 2.633 - Math.pow(lrat, 0.3) - work / 1500;
  if (torqueMult < 1) torqueMult = 1;
  if (torqueMult > 2) torqueMult = 2;
  
  return { torqueMult, slippage, work, stallRPM };
}

/**
 * Calculate PMI values
 * VB6: TIMESLIP.FRM lines 780-806
 */
export function calcPMI(
  estCID: number,
  fuelSystem: FuelSystemValue,
  isConverter: boolean,
  NGR: number,
  tireDia_in: number,
  tireWidth_in: number,
  bodyStyle: number
): { enginePMI: number; transPMI: number; tiresPMI: number } {
  let enginePMI: number;
  let transPMI: number;
  let tiresPMI: number;
  
  // VB6: TIMESLIP.FRM lines 787-791
  if (isNaturallyAspirated(fuelSystem)) {
    enginePMI = estCID / 120;
  } else {
    enginePMI = estCID / 90;
  }
  
  // VB6: TIMESLIP.FRM lines 793-797
  if (!isConverter) {
    transPMI = NGR * enginePMI / 50;
  } else {
    transPMI = (NGR - 1) * enginePMI / 10;
  }
  
  // VB6: TIMESLIP.FRM lines 799
  // gc_TiresPMI.Value = 2 * (1.15 * 0.8 * (0.08 * TireDia * gc_TireWidth.Value) * (TireDia / 2) ^ 2 / 386)
  tiresPMI = 2 * (1.15 * 0.8 * (0.08 * tireDia_in * tireWidth_in) * Math.pow(tireDia_in / 2, 2) / 386);
  
  // VB6: TIMESLIP.FRM lines 801-805 - Motorcycle adjustments
  if (bodyStyle === 8) {
    enginePMI = estCID / 240;
    transPMI = transPMI / (240 / 120);
    tiresPMI = tiresPMI / 2;
  }
  
  return { enginePMI, transPMI, tiresPMI };
}

/**
 * Calculate overall driveline efficiency
 * VB6: TIMESLIP.FRM lines 760-765
 */
export function calcEfficiency(bodyStyle: number): number {
  if (bodyStyle === 8) {
    return 0.985;  // Motorcycle
  }
  return 0.97;  // Everything else
}

/**
 * Calculate clutch slippage
 * VB6: TIMESLIP.FRM lines 729
 */
export function calcClutchSlippage(slipStallRPM: number): number {
  // gc_Slippage.Value = 1.0025 + gc_SlipStallRPM.Value / 1000000
  return 1.0025 + slipStallRPM / 1000000;
}

/**
 * Main QuarterJr calculation function
 */
export function calculateQuarterJr(
  inputs: QuarterJrInputs,
  hpc: number = 1.0
): QuarterJrOutputs {
  const {
    peakHP,
    rpmAtPeakHP,
    displacement_cid,
    fuelSystem,
    weight_lbf,
    tireDia_in,
    tireWidth_in,
    isConverter,
    gearRatios,
    converterDia_in = 10,
    slipStallRPM = 5000,
    slipRPM = 6500,
    bodyStyle: inputBodyStyle,
    shiftRPM = rpmAtPeakHP,
  } = inputs;
  
  const NGR = gearRatios.length;
  
  // Calculate body style
  const bodyStyle = inputBodyStyle ?? calcBodyStyle(weight_lbf);
  
  // Build HP curve
  const curve = buildEngineCurve({
    peakHP,
    peakRPM: rpmAtPeakHP,
    displacement_cid,
    fuelSystem,
  });
  
  // Convert to 0-indexed for simulation
  const { rpm: xrpm0, hp: yhp0 } = convertToZeroIndexed(curve);
  
  // Calculate transmission efficiencies
  const transEff = calcTransEfficiencies(NGR, isConverter);
  
  // Calculate shift RPMs (all same for QuarterJr)
  const shiftRPMs = gearRatios.map(() => shiftRPM);
  
  // Calculate converter/clutch parameters
  let torqueMult = 1;
  let slippage = 1.0025;
  let stallRPM = slipRPM;
  let launchRPM = slipRPM;
  
  if (isConverter) {
    const convParams = calcConverterParams(
      xrpm0,
      yhp0,
      curve.NHP,
      slipStallRPM,
      converterDia_in,
      hpc
    );
    torqueMult = convParams.torqueMult;
    slippage = convParams.slippage;
    stallRPM = convParams.stallRPM || slipStallRPM;
    launchRPM = stallRPM;
  } else {
    slippage = calcClutchSlippage(slipRPM);
    stallRPM = slipRPM;
    launchRPM = slipRPM;
  }
  
  // Calculate PMI
  const pmi = calcPMI(
    displacement_cid,
    fuelSystem,
    isConverter,
    NGR,
    tireDia_in,
    tireWidth_in,
    bodyStyle
  );
  
  // Get aero coefficients
  const aero = getAeroByBodyStyle(bodyStyle);
  
  // Calculate efficiency
  const efficiency = calcEfficiency(bodyStyle);
  
  return {
    xrpm: curve.xrpm,
    yhp: curve.yhp,
    ztq: curve.ztq,
    NHP: curve.NHP,
    transEff,
    shiftRPMs,
    torqueMult,
    slippage,
    stallRPM,
    launchRPM,
    enginePMI: pmi.enginePMI,
    transPMI: pmi.transPMI,
    tiresPMI: pmi.tiresPMI,
    dragCoef: aero.dragCoef,
    liftCoef: aero.liftCoef,
    efficiency,
    overhang_in: aero.overhang_in,
    bodyStyle,
  };
}
