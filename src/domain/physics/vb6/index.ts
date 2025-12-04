/**
 * VB6 Physics Module Index
 * 
 * This module provides exact VB6 TIMESLIP.FRM physics calculations.
 * All functions are ported directly from the VB6 source code with
 * line number references for verification.
 */

// Core simulation
export { 
  vb6SimulationStep, 
  vb6InitState, 
  vb6CalcTSMaxInit,
  vb6Tire,
  calcCAXI,
  calcAX,
  TABY,
  type VB6SimState,
  type VB6VehicleParams,
  type VB6EnvParams,
  type VB6StepComputed,
} from './vb6SimulationStep';

// Integrator functions
export {
  vb6Step,
  vb6CheckShift,
  vb6InitialState,
  vb6StepDistance,
  vb6SelectTimeStep,
  vb6ApplyAccelClamp,
  vb6AGSFromPQWT,
  vb6PQWTFromHP,
  vb6Jerk,
  vb6AdaptiveTimestep,
  vb6CalcTSMax,
  vb6IterateConvergence,
  type VB6State,
  type VB6Params,
  type VB6IterationParams,
  type VB6IterationResult,
} from './integrator';

// Constants
export {
  PI,
  gc,
  g,
  Z5,
  Z6,
  CMU,
  CMUK,
  TimeTol,
  KV,
  K7,
  AMin,
  JMin,
  JMax,
  K6,
  K61,
  KP21,
  KP22,
  FRCT,
  AX,
  HP_TO_FTLBPS,
  FPS_TO_MPH,
  INCH_TO_FT,
  RANKINE_OFFSET,
  TSTD,
  PSTD,
  BSTD,
  WTAIR,
  WTH20,
  RSTD,
} from './constants';

// Atmosphere/Weather
export {
  airDensityVB6,
  type FuelSystemType,
  type Vb6AirInputs,
  type Vb6AirResult,
} from './air';

// Interpolation
export {
  taby,
  dtaby,
  bisc,
  tabyLinear,
  flattenVB6Array,
} from './dtaby';

// Fuel system
export {
  calcWork,
  FUEL_SYSTEM_NAMES,
  isNaturallyAspirated,
  isSupercharged,
  getFuelType,
  getCarburetionType,
  type FuelSystemValue,
} from './calcWork';

// Engine curve generation
export {
  buildEngineCurve,
  convertToZeroIndexed,
  type EngineCurveInputs,
  type EngineCurveResult,
} from './engineCurve';

// QuarterJr mode
export {
  calculateQuarterJr,
  calcBodyStyle,
  getAeroByBodyStyle,
  calcTransEfficiencies,
  calcConverterParams,
  calcPMI,
  calcEfficiency,
  calcClutchSlippage,
  type QuarterJrInputs,
  type QuarterJrOutputs,
} from './quarterJr';

// Graph data
export {
  loadGraphData,
  loadAllGraphs,
  buildRPMHistogram,
  toRechartsFormat,
  GPH_TIME_RPM,
  GPH_TIME_G,
  GPH_SEPARATOR,
  GPH_DIST_RPM,
  GPH_DIST_G,
  GPH_RPM_HIST,
  type SimDataPoint,
  type GraphPoint,
  type VB6GraphData,
} from './graphData';

// Simulation mode handling
export {
  processSimInputs,
  detectSimMode,
  getRequiredInputs,
  getOptionalInputs,
  validateInputs,
  type SimMode,
  type QuarterJrModeInputs,
  type QuarterProModeInputs,
  type SimModeInputs,
  type NormalizedSimParams,
} from './simMode';
