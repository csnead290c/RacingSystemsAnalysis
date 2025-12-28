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
  
  // Camshaft
  camshaftType: 'overhead_cam' | 'roller' | 'mushroom_tappet' | 'high_rate_flat_tappet' | 'normal_flat_tappet' | 'hydraulic_roller' | 'hydraulic_flat_tappet';
  intakeDuration050_deg: number;
  
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
  
  // Optional compression ratio worksheet
  combustionChamberVolume_cc?: number;
  pistonToDeckHeight_in?: number;
  headGasketThickness_in?: number;
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
const LAYOUT_MAP: Record<string, number> = {
  'inline': 1,
  'vee': 0,
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
 */
export function createDefaultEngineProConfig(): EngineSimConfig {
  return {
    numCylinders: 8,
    layout: 'vee',
    bore_in: 4.03,
    stroke_in: 3.48,
    rodLength_in: 5.85,
    compressionRatio: 12.0,
    camshaftType: 'roller',
    intakeDuration050_deg: 240,
    throttleCFM_at_1_5inHg: 750,
    isEFI: false,
    fuelType: 'gasoline',
    intakeManifoldType: 'plenum',
    runnerStyle: 'straight',
    intakeManifoldFlowFactor_pct: 96,
    numIntakeValvesPerCyl: 1,
    intakeValveDia_in: 2.08,
    maxIntakeFlow_cfm: 260,
    flowTestPressure_inH2O: 28,
    flowTestBoreDia_in: 4.03,
    combustionChamberVolume_cc: 64,
    pistonToDeckHeight_in: 0.015,
    headGasketThickness_in: 0.039,
    pistonDomeVolume_cc: 0,
  };
}

/**
 * Calculate displacement in cubic inches
 */
export function calcDisplacement(bore_in: number, stroke_in: number, numCylinders: number): number {
  const cylinderVolume = Math.PI * Math.pow(bore_in / 2, 2) * stroke_in;
  return cylinderVolume * numCylinders;
}
