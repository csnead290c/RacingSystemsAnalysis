/**
 * Engine Simulation Adapter
 * 
 * Converts between UI config format and VB6-exact EngineInputs
 */

import { calcEngPerf } from './enginePerf';
import type { EngineInputs, EngineOutputs } from './engineTypes';

// UI-friendly configuration interface
export interface EngineSimConfig {
  // Basic engine design
  numCylinders: number;
  layout: 'inline' | 'vee' | 'flat';
  bore_in: number;
  stroke_in: number;
  rodLength_in: number;
  compressionRatio: number;
  deckHeight_in?: number;  // 0.0-0.050" typical
  headGasketThickness_in?: number;  // 0.018-0.060" typical
  
  // Camshaft
  camshaftType: 'overhead_cam' | 'roller' | 'mushroom_tappet' | 'high_rate_flat_tappet' | 'normal_flat_tappet' | 'hydraulic_roller' | 'hydraulic_flat_tappet';
  intakeDuration050_deg: number;  // 180-320°, even numbers only
  
  // Advanced cam properties (Engine Pro mode)
  // These have calculated defaults but can be manually edited
  lobeSeparationAngle_deg?: number;  // 102-116°, calculated if not provided
  intakeLobeCenterline_deg?: number;  // 100-118°, calculated if not provided
  
  // Throttle/Carburetor
  throttleCFM_at_1_5inHg: number;
  isEFI: boolean;
  
  // Fuel
  fuelType: 'gasoline' | 'racing_gasoline' | 'methanol';
  
  // Intake manifold
  intakeManifoldType: 'plenum' | 'individual_runner' | 'dual_plane_divided' | 'dual_plane_slot';
  runnerStyle: 'curved' | 'straight';
  intakeManifoldFlowFactor_pct: number;
  
  // Cylinder head
  numIntakeValvesPerCyl: number;
  intakeValveDia_in: number;
  maxIntakeFlow_cfm: number;
  flowTestPressure_inH2O: number;
  flowTestBoreDia_in: number;
  maxIntakeValveLift_in?: number;  // 0.450-0.750" typical, Engine Pro only
  
  // Flowbench data (Engine Pro mode)
  // Up to 10 lift/flow pairs from the Flow Bench worksheet
  // VB6: gc_IntLift(0..9), gc_IntFlow(0..9)
  flowBenchLifts_in?: number[];   // Valve lift at each point (inches)
  flowBenchFlows_cfm?: number[];  // Flow at each point (CFM)

  // Valve seat geometry for flowbench calculations (Engine Pro mode)
  // VB6: gc_SeatDia, gc_SeatPer, gc_VSAngle, gc_VSWidth, gc_StemDia
  seatDia_in?: number;       // Valve seat throat diameter (inches)
  seatPer?: number;          // Valve seat percentage (%)
  vsAngle_deg?: number;      // Valve seat angle (degrees)
  vsWidth_in?: number;       // Valve seat width (inches)
  stemDia_in?: number;       // Valve stem diameter (inches)

  // Performance targets (calculated but can be estimated)
  shift_rpm?: number;  // Estimated from peak HP if not provided
  redline_rpm?: number;  // Estimated from shift if not provided
  
  // Optional compression ratio worksheet
  combustionChamberVolume_cc?: number;
  pistonToDeckHeight_in?: number;
  pistonDomeVolume_cc?: number;
}

// Map UI cam types to VB6 cam type numbers
const CAM_TYPE_MAP: Record<string, number> = {
  'overhead_cam': 0,
  'roller': 1,
  'mushroom_tappet': 2,
  'high_rate_flat_tappet': 3,
  'normal_flat_tappet': 4,
  'hydraulic_roller': 5,
  'hydraulic_flat_tappet': 6,
};

// Map UI fuel types to VB6 fuel numbers
const FUEL_TYPE_MAP: Record<string, number> = {
  'gasoline': 1,
  'racing_gasoline': 2,
  'methanol': 3,
};

// Map UI manifold types to VB6 manifold numbers
const MANIFOLD_TYPE_MAP: Record<string, number> = {
  'plenum': 1,
  'individual_runner': 2,
  'dual_plane_divided': 3,
  'dual_plane_slot': 4,
};

// Map UI layout to VB6 inline number
// VB6: 0=Inline, 1=Vee, 2=Flat/Opposed
const LAYOUT_MAP: Record<string, number> = {
  'inline': 0,
  'vee': 1,
  'flat': 2,
};

/**
 * Convert UI config to VB6 EngineInputs
 */
export function configToVB6Inputs(config: EngineSimConfig): EngineInputs {
  return {
    noCyl: config.numCylinders,
    inline: LAYOUT_MAP[config.layout],
    bore: config.bore_in,
    stroke: config.stroke_in,
    rod: config.rodLength_in,
    compressionRatio: config.compressionRatio,
    camType: CAM_TYPE_MAP[config.camshaftType],
    inCamDur: config.intakeDuration050_deg,
    carb: !config.isEFI,
    carbCFM: config.throttleCFM_at_1_5inHg,
    fuel: FUEL_TYPE_MAP[config.fuelType],
    manifold: MANIFOLD_TYPE_MAP[config.intakeManifoldType],
    curved: config.runnerStyle === 'curved',
    manFlow: config.intakeManifoldFlowFactor_pct,
    noInValves: config.numIntakeValvesPerCyl,
    valveDia: config.intakeValveDia_in,
    maxInFlow: config.maxIntakeFlow_cfm,
    deltaP: config.flowTestPressure_inH2O,
    refBore: config.flowTestBoreDia_in,
    chamber: config.combustionChamberVolume_cc,
    deck: config.pistonToDeckHeight_in,
    gasket: config.headGasketThickness_in,
    dome: config.pistonDomeVolume_cc,
  };
}

/**
 * Simulate engine with UI-friendly config
 */
export function simulateEngine(config: EngineSimConfig): EngineOutputs {
  const vb6Inputs = configToVB6Inputs(config);
  return calcEngPerf(vb6Inputs);
}

/**
 * Create default Engine Jr configuration (simple mode)
 */
export function createDefaultEngineJrConfig(): EngineSimConfig {
  return {
    numCylinders: 8,
    layout: 'vee',
    bore_in: 4.03,
    stroke_in: 3.48,
    rodLength_in: 5.85,
    compressionRatio: 10.5,
    camshaftType: 'normal_flat_tappet',
    intakeDuration050_deg: 220,
    throttleCFM_at_1_5inHg: 600,
    isEFI: false,
    fuelType: 'gasoline',
    intakeManifoldType: 'plenum',
    runnerStyle: 'straight',
    intakeManifoldFlowFactor_pct: 96,
    numIntakeValvesPerCyl: 1,
    intakeValveDia_in: 2.02,
    maxIntakeFlow_cfm: 220,
    flowTestPressure_inH2O: 28,
    flowTestBoreDia_in: 4.03,
  };
}

/**
 * Create default Engine Pro configuration (advanced mode)
 * Based on VB6 BASECASE.ENG - produces Peak HP: 461 @ 6650 RPM, Peak TQ: 415 @ 5450 RPM
 */
export function createDefaultEngineProConfig(): EngineSimConfig {
  return {
    numCylinders: 8,
    layout: 'vee',
    bore_in: 4.03,
    stroke_in: 3.48,
    rodLength_in: 5.85,
    compressionRatio: 12.9,
    camshaftType: 'normal_flat_tappet',  // Normal Flat Tappet & Solid Lifter
    intakeDuration050_deg: 264,
    throttleCFM_at_1_5inHg: 750,
    isEFI: false,
    fuelType: 'gasoline',
    intakeManifoldType: 'plenum',
    runnerStyle: 'curved',
    intakeManifoldFlowFactor_pct: 96,
    numIntakeValvesPerCyl: 1,
    intakeValveDia_in: 2.05,
    maxIntakeFlow_cfm: 250,
    flowTestPressure_inH2O: 28,
    flowTestBoreDia_in: 4.0,
    maxIntakeValveLift_in: 0.55,
    // Valve seat geometry (VB6 SetAllValues defaults)
    seatDia_in: 1.794,
    seatPer: 87.5,
    vsAngle_deg: 45,
    vsWidth_in: 0.08,
    stemDia_in: 0.344,
    combustionChamberVolume_cc: 62,
    pistonToDeckHeight_in: 0.015,
    headGasketThickness_in: 0.039,
    pistonDomeVolume_cc: 12,
  };
}

/**
 * Calculate displacement in cubic inches
 */
export function calcDisplacement(bore_in: number, stroke_in: number, numCylinders: number): number {
  const cylinderVolume = Math.PI * Math.pow(bore_in / 2, 2) * stroke_in;
  return cylinderVolume * numCylinders;
}
