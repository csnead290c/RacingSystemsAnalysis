/**
 * Engine Simulation - Based on EnginePro/EngineJr physics
 * 
 * This module calculates engine performance (HP, Torque, BMEP, VE)
 * based on engine specifications and environmental conditions.
 * 
 * Key formulas:
 * - Theoretical airflow = (Displacement × RPM) / 3456 (CFM for 4-stroke)
 * - Actual airflow = Theoretical × VE
 * - HP = (Torque × RPM) / 5252
 * - BMEP = (Torque × 150.8) / Displacement (psi for 4-stroke)
 * - Torque = (BMEP × Displacement) / 150.8
 */

// ============================================================================
// Types and Interfaces
// ============================================================================

/**
 * Engine configuration parameters
 */
export interface EngineConfig {
  // Basic dimensions
  bore_in: number;           // Cylinder bore diameter (inches)
  stroke_in: number;         // Piston stroke (inches)
  numCylinders: number;      // Number of cylinders
  displacement_ci?: number;  // Override calculated displacement (cubic inches)
  
  // Compression
  compressionRatio: number;  // Static compression ratio (e.g., 10.5:1 = 10.5)
  
  // Camshaft
  intakeDuration_deg: number;   // Intake duration at 0.050" lift
  exhaustDuration_deg: number;  // Exhaust duration at 0.050" lift
  intakeCenterline_deg: number; // Intake centerline (ATDC)
  lsa_deg: number;              // Lobe separation angle
  
  // Cylinder head flow
  intakeFlow_cfm: number[];     // Intake flow at test pressure (CFM at each lift point)
  exhaustFlow_cfm: number[];    // Exhaust flow at test pressure
  flowTestPressure_inH2O: number; // Test pressure (typically 28" H2O)
  flowLiftPoints_in: number[];  // Lift points for flow data
  maxIntakeLift_in: number;     // Maximum intake valve lift
  maxExhaustLift_in: number;    // Maximum exhaust valve lift
  
  // Intake/Exhaust
  intakeRunnerVolume_cc: number;   // Intake runner volume per cylinder
  exhaustHeaderPrimaryDia_in: number; // Primary tube diameter
  exhaustHeaderPrimaryLen_in: number; // Primary tube length
  
  // Induction
  carbCFM?: number;          // Carburetor CFM rating (if carbureted)
  throttleBodyDia_in?: number; // Throttle body diameter (if EFI)
  
  // Fuel system
  fuelType: 'gasoline' | 'methanol' | 'e85' | 'nitromethane';
  airFuelRatio: number;      // Target A/F ratio
}

/**
 * Environmental conditions
 */
export interface EngineEnv {
  barometer_inHg: number;    // Barometric pressure
  temperature_F: number;     // Air temperature
  humidity_pct: number;      // Relative humidity (0-100)
  elevation_ft?: number;     // Elevation (optional, for display)
}

/**
 * Single RPM point result
 */
export interface EnginePoint {
  rpm: number;
  hp: number;
  torque_lbft: number;
  bmep_psi: number;
  ve_pct: number;           // Volumetric efficiency
  airflow_cfm: number;      // Actual airflow
  fuelFlow_lbhr: number;    // Fuel flow rate
  bsfc: number;             // Brake specific fuel consumption (lb/hp-hr)
  mep_friction_psi: number; // Friction MEP
  mep_pumping_psi: number;  // Pumping MEP
}

/**
 * Full engine simulation result
 */
export interface EngineResult {
  config: EngineConfig;
  env: EngineEnv;
  displacement_ci: number;
  points: EnginePoint[];
  peakHP: { hp: number; rpm: number };
  peakTorque: { torque_lbft: number; rpm: number };
  peakBMEP: { bmep_psi: number; rpm: number };
  correctionFactor: number;  // Weather correction factor
}

// ============================================================================
// Constants
// ============================================================================

/** Standard atmospheric pressure (inHg) */
const STD_BARO = 29.92;

/** Standard temperature (°F) */
const STD_TEMP = 60;

// Reserved for future use:
// const R_AIR = 53.35;  // Gas constant for air (ft-lbf/lbm-°R)
// const MW_AIR = 28.97; // Molecular weight of air
// const MW_H2O = 18.02; // Molecular weight of water

/** Fuel properties */
const FUEL_PROPS = {
  gasoline: { stoich_afr: 14.7, lhv_btu_lb: 18400, density_lb_gal: 6.1 },
  methanol: { stoich_afr: 6.4, lhv_btu_lb: 9500, density_lb_gal: 6.6 },
  e85: { stoich_afr: 9.8, lhv_btu_lb: 12500, density_lb_gal: 6.5 },
  nitromethane: { stoich_afr: 1.7, lhv_btu_lb: 5000, density_lb_gal: 9.5 },
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Calculate displacement from bore, stroke, and number of cylinders
 */
export function calcDisplacement(bore_in: number, stroke_in: number, numCylinders: number): number {
  // Displacement = π/4 × bore² × stroke × numCylinders
  return (Math.PI / 4) * bore_in * bore_in * stroke_in * numCylinders;
}

/**
 * Calculate theoretical airflow (CFM) for a 4-stroke engine
 * This is the volume of air the engine would consume at 100% VE
 */
export function calcTheoreticalAirflow(displacement_ci: number, rpm: number): number {
  // For 4-stroke: CFM = (Displacement × RPM) / 3456
  // 3456 = 2 (revs per cycle) × 1728 (ci per cf)
  return (displacement_ci * rpm) / 3456;
}

/**
 * Calculate air density correction factor
 * Returns ratio of actual air density to standard air density
 */
export function calcAirDensityCorrection(env: EngineEnv): number {
  // Convert to absolute units
  const T_R = env.temperature_F + 459.67;  // °R
  const T_std = STD_TEMP + 459.67;
  
  // Saturation pressure of water vapor (simplified)
  const Psat = 0.0886 * Math.exp(0.0386 * env.temperature_F);  // psia approx
  const Pv = (env.humidity_pct / 100) * Psat;  // Partial pressure of water vapor
  
  // Dry air pressure
  const P_total = env.barometer_inHg * 0.4912;  // Convert inHg to psia
  const P_dry = P_total - Pv;
  
  // Standard conditions
  const P_std = STD_BARO * 0.4912;
  
  // Density ratio (accounting for humidity reducing density)
  // ρ/ρ_std = (P_dry/P_std) × (T_std/T)
  const densityRatio = (P_dry / P_std) * (T_std / T_R);
  
  return densityRatio;
}

/**
 * Calculate HP correction factor (SAE J1349 style)
 * Corrects measured HP to standard conditions
 */
export function calcHPCorrectionFactor(env: EngineEnv): number {
  const densityRatio = calcAirDensityCorrection(env);
  // HP correction is inverse of density ratio (more air = more power)
  return 1 / densityRatio;
}

/**
 * Estimate volumetric efficiency based on engine parameters
 * This is a simplified model - real VE depends on many factors
 */
export function estimateVE(
  rpm: number,
  config: EngineConfig,
  _displacement_ci: number  // Reserved for future cylinder-specific calculations
): number {
  // Base VE from cam timing (simplified)
  // Longer duration generally improves high-RPM VE but hurts low-RPM
  // const avgDuration = (config.intakeDuration_deg + config.exhaustDuration_deg) / 2;
  
  // Peak VE RPM estimate based on intake duration
  // Rule of thumb: Peak RPM ≈ 456000 / duration (at 0.050")
  const peakVE_rpm = 456000 / config.intakeDuration_deg;
  
  // VE curve shape (parabolic approximation)
  const rpmRatio = rpm / peakVE_rpm;
  
  // Base VE at peak (depends on head flow, compression, etc.)
  // Higher compression and better flow = higher peak VE
  const flowEfficiency = Math.min(1.0, config.intakeFlow_cfm[config.intakeFlow_cfm.length - 1] / 300);
  const compressionBonus = Math.min(0.05, (config.compressionRatio - 9) * 0.01);
  const baseVE = 0.85 + flowEfficiency * 0.10 + compressionBonus;
  
  // VE falloff at low and high RPM
  let ve: number;
  if (rpmRatio <= 1) {
    // Below peak: gradual rise
    ve = baseVE * (0.7 + 0.3 * rpmRatio);
  } else {
    // Above peak: gradual fall
    ve = baseVE * Math.max(0.5, 1 - 0.15 * (rpmRatio - 1));
  }
  
  // Clamp to reasonable range
  return Math.max(0.5, Math.min(1.1, ve));
}

/**
 * Estimate friction mean effective pressure (FMEP)
 * Based on empirical correlations
 */
export function estimateFMEP(rpm: number, _bore_in: number, _stroke_in: number): number {
  // Chen-Flynn correlation (simplified)
  // FMEP = A + B×(rpm/1000) + C×(rpm/1000)²
  // Typical values for automotive engines
  const A = 10;  // psi base friction
  const B = 2;   // psi per 1000 rpm
  const C = 0.5; // psi per (1000 rpm)²
  
  const rpmK = rpm / 1000;
  return A + B * rpmK + C * rpmK * rpmK;
}

/**
 * Estimate pumping mean effective pressure (PMEP)
 */
export function estimatePMEP(rpm: number, ve: number): number {
  // Pumping losses increase with RPM and decrease with VE
  // At WOT, PMEP is relatively small
  const rpmK = rpm / 1000;
  return 2 + rpmK * 0.5 * (1 - ve);
}

/**
 * Calculate brake mean effective pressure from indicated MEP
 */
export function calcBMEP(imep: number, fmep: number, pmep: number): number {
  return imep - fmep - pmep;
}

/**
 * Calculate torque from BMEP
 */
export function calcTorqueFromBMEP(bmep_psi: number, displacement_ci: number): number {
  // Torque (lb-ft) = BMEP × Displacement / 150.8 (for 4-stroke)
  return (bmep_psi * displacement_ci) / 150.8;
}

/**
 * Calculate HP from torque and RPM
 */
export function calcHP(torque_lbft: number, rpm: number): number {
  return (torque_lbft * rpm) / 5252;
}

/**
 * Calculate BMEP from torque
 */
export function calcBMEPFromTorque(torque_lbft: number, displacement_ci: number): number {
  return (torque_lbft * 150.8) / displacement_ci;
}

// ============================================================================
// Main Simulation Function
// ============================================================================

/**
 * Run engine simulation across RPM range
 */
export function simulateEngine(
  config: EngineConfig,
  env: EngineEnv,
  rpmStart: number = 2000,
  rpmEnd: number = 8000,
  rpmStep: number = 500
): EngineResult {
  // Calculate displacement
  const displacement_ci = config.displacement_ci ?? 
    calcDisplacement(config.bore_in, config.stroke_in, config.numCylinders);
  
  // Calculate correction factor
  const correctionFactor = calcHPCorrectionFactor(env);
  const densityRatio = calcAirDensityCorrection(env);
  
  // Fuel properties
  const fuel = FUEL_PROPS[config.fuelType];
  
  // Generate points across RPM range
  const points: EnginePoint[] = [];
  let peakHP = { hp: 0, rpm: 0 };
  let peakTorque = { torque_lbft: 0, rpm: 0 };
  let peakBMEP = { bmep_psi: 0, rpm: 0 };
  
  for (let rpm = rpmStart; rpm <= rpmEnd; rpm += rpmStep) {
    // Estimate VE
    const ve = estimateVE(rpm, config, displacement_ci);
    
    // Calculate airflow
    const theoreticalCFM = calcTheoreticalAirflow(displacement_ci, rpm);
    const actualCFM = theoreticalCFM * ve * densityRatio;
    
    // Estimate MEP components
    const fmep = estimateFMEP(rpm, config.bore_in, config.stroke_in);
    const pmep = estimatePMEP(rpm, ve);
    
    // Estimate indicated MEP from VE and compression
    // IMEP ≈ k × VE × (CR - 1) × fuel_factor
    // This is a simplified thermal efficiency model
    const thermalEff = 1 - Math.pow(1 / config.compressionRatio, 0.4);
    // const fuelFactor = fuel.lhv_btu_lb / FUEL_PROPS.gasoline.lhv_btu_lb;  // For future fuel-specific adjustments
    
    // Air mass flow (lb/min)
    const airDensity_lb_cf = 0.0765 * densityRatio;  // lb/ft³
    const airMassFlow = actualCFM * airDensity_lb_cf;
    
    // Fuel mass flow (lb/hr)
    const fuelFlow_lbhr = (airMassFlow * 60) / config.airFuelRatio;
    
    // Heat release rate (BTU/min)
    const heatRate = (fuelFlow_lbhr / 60) * fuel.lhv_btu_lb * thermalEff;
    
    // Convert to indicated power (HP)
    // 1 HP = 42.44 BTU/min
    const indicatedHP = heatRate / 42.44;
    
    // Calculate IMEP from indicated HP
    // HP = (IMEP × Displacement × RPM) / (150.8 × 5252)
    const imep = (indicatedHP * 150.8 * 5252) / (displacement_ci * rpm);
    
    // Calculate BMEP
    const bmep = calcBMEP(imep, fmep, pmep);
    
    // Calculate torque and HP
    const torque = calcTorqueFromBMEP(bmep, displacement_ci);
    const hp = calcHP(torque, rpm);
    
    // BSFC
    const bsfc = hp > 0 ? fuelFlow_lbhr / hp : 0;
    
    const point: EnginePoint = {
      rpm,
      hp: Math.max(0, hp),
      torque_lbft: Math.max(0, torque),
      bmep_psi: Math.max(0, bmep),
      ve_pct: ve * 100,
      airflow_cfm: actualCFM,
      fuelFlow_lbhr,
      bsfc,
      mep_friction_psi: fmep,
      mep_pumping_psi: pmep,
    };
    
    points.push(point);
    
    // Track peaks
    if (point.hp > peakHP.hp) {
      peakHP = { hp: point.hp, rpm };
    }
    if (point.torque_lbft > peakTorque.torque_lbft) {
      peakTorque = { torque_lbft: point.torque_lbft, rpm };
    }
    if (point.bmep_psi > peakBMEP.bmep_psi) {
      peakBMEP = { bmep_psi: point.bmep_psi, rpm };
    }
  }
  
  return {
    config,
    env,
    displacement_ci,
    points,
    peakHP,
    peakTorque,
    peakBMEP,
    correctionFactor,
  };
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Create a default engine configuration (small block Chevy style)
 */
export function createDefaultEngineConfig(): EngineConfig {
  return {
    bore_in: 4.00,
    stroke_in: 3.48,
    numCylinders: 8,
    compressionRatio: 10.5,
    
    intakeDuration_deg: 224,
    exhaustDuration_deg: 230,
    intakeCenterline_deg: 106,
    lsa_deg: 112,
    
    intakeFlow_cfm: [0, 62, 120, 168, 205, 232, 252, 265, 272, 276, 278],
    exhaustFlow_cfm: [0, 48, 92, 128, 156, 176, 190, 200, 206, 210, 212],
    flowTestPressure_inH2O: 28,
    flowLiftPoints_in: [0, 0.05, 0.10, 0.15, 0.20, 0.25, 0.30, 0.35, 0.40, 0.45, 0.50],
    maxIntakeLift_in: 0.500,
    maxExhaustLift_in: 0.500,
    
    intakeRunnerVolume_cc: 180,
    exhaustHeaderPrimaryDia_in: 1.75,
    exhaustHeaderPrimaryLen_in: 32,
    
    carbCFM: 750,
    
    fuelType: 'gasoline',
    airFuelRatio: 12.5,
  };
}

/**
 * Create default environment (sea level, 70°F)
 */
export function createDefaultEnv(): EngineEnv {
  return {
    barometer_inHg: 29.92,
    temperature_F: 70,
    humidity_pct: 50,
    elevation_ft: 0,
  };
}
