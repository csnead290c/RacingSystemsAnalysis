/**
 * Engine Simulation - Unified Export
 * 
 * This module exports the VB6-exact engine simulation
 */

export { calcEngPerf } from './enginePerf';
export { parseEngFile } from './engFileParser';
export { CONSTANTS, FUEL_PROPERTIES, CAM_FACTORS, calcGulp } from './engineConstants';
export type { 
  EngineInputs, 
  EngineOutputs, 
  EngineRecommendations,
  EngineConstants,
  FuelProperties,
  CamTypeFactors 
} from './engineTypes';

// Test utilities
export { 
  ENGINE_PRO_BASECASE, 
  ENGINE_JR_BASECASE,
  testEnginePerf 
} from './testEnginePerf';

export { runVerification } from './vb6Verification';
