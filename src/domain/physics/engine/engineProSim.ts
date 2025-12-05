/**
 * ENGINE Pro Simulation - Based on RSA ENGINE Pro v3.1 User Manual
 * 
 * This module replicates the ENGINE Pro calculations for predicting
 * engine performance (HP, Torque) based on engine design parameters.
 * 
 * Key concepts from the manual:
 * - Power/torque directly related to trapped air mass
 * - Key factors: bore/stroke ratio, rod length, intake flow, cam timing
 * - Fuel properties and compression ratio affect thermodynamic efficiency
 * - Calibrated against hundreds of engines from 77 cid to 800+ cid
 * - Results are for standard conditions: sea level, 29.92 inHg, 60°F, 0% humidity
 * - Consistent with SAE J1349 Standard Method
 */

// ============================================================================
// Types and Interfaces
// ============================================================================

/**
 * Camshaft type options (from manual page 4-4)
 */
export type CamshaftType = 
  | 'overhead_cam'
  | 'roller'
  | 'mushroom_tappet'
  | 'high_rate_flat_tappet'
  | 'normal_flat_tappet'
  | 'hydraulic_roller'
  | 'hydraulic_flat_tappet';

/**
 * Fuel type options (from manual page 4-5)
 */
export type FuelType = 'gasoline' | 'racing_gasoline' | 'methanol';

/**
 * Intake manifold type (from manual page 4-5)
 */
export type IntakeManifoldType = 
  | 'plenum'           // Most common
  | 'individual_runner' // IR
  | 'dual_plane_divided'
  | 'dual_plane_slot';

/**
 * Engine configuration (from manual page 4-3)
 */
export type EngineLayout = 'inline' | 'vee' | 'flat';

/**
 * ENGINE Pro input parameters (from manual Chapter 4)
 */
export interface EngineProConfig {
  // Basic engine design (page 4-3)
  numCylinders: number;           // 4-8 typical
  layout: EngineLayout;           // Inline, Vee, or Flat
  bore_in: number;                // 3.00-4.50" typical
  stroke_in: number;              // 3.00-4.50" typical
  rodLength_in: number;           // 5.0-6.5" typical
  compressionRatio: number;       // 9-16 typical
  
  // Camshaft (page 4-4)
  camshaftType: CamshaftType;
  intakeDuration050_deg: number;  // 200-280° typical
  
  // Throttle/Carburetor (page 4-5)
  throttleCFM_at_1_5inHg: number; // 390-1150 CFM single, 1300-2600 dual
  isEFI: boolean;                 // Carb or EFI
  
  // Fuel (page 4-5)
  fuelType: FuelType;
  
  // Intake manifold (page 4-5, 4-6)
  intakeManifoldType: IntakeManifoldType;
  runnerStyle: 'curved' | 'straight';
  intakeManifoldFlowFactor_pct: number;  // 90-98% typical
  
  // Cylinder head (page 4-6, 4-7)
  numIntakeValvesPerCyl: number;  // 1, 2, or 3
  intakeValveDia_in: number;      // 1.60-2.25" typical
  maxIntakeFlow_cfm: number;      // 120-450 CFM typical
  flowTestPressure_inH2O: number; // 10-28" H2O typical
  flowTestBoreDia_in: number;     // Within 2% of actual bore
  maxIntakeValveLift_in: number;  // 0.450-0.750" typical
  
  // Optional: Compression ratio worksheet data (page 4-8)
  combustionChamberVolume_cc?: number;  // 40-100 cc typical
  pistonToDeckHeight_in?: number;       // 0.0-0.025" typical
  headGasketThickness_in?: number;      // 0.018-0.048" typical
  pistonDomeVolume_cc?: number;         // -10 to +25 cc (negative for dish)
  
  // Optional: Valve seat data (page 4-13)
  valveSeatThroatDia_in?: number;
  valveSeatAngle_deg?: number;          // Usually 45°
  valveSeatWidth_in?: number;           // 0.060-0.090" typical
  valveStemDia_in?: number;             // 0.25-0.375" typical
}

/**
 * ENGINE Pro output - Estimated engine performance (page 5-1, 5-2)
 */
export interface EngineProResult {
  // Displacement
  displacement_ci: number;
  displacement_L: number;
  
  // Peak values (page 5-2)
  peakHP: number;
  peakHP_kW: number;
  rpmAtPeakHP: number;
  peakHP_perCID: number;
  
  peakTorque_lbft: number;
  peakTorque_Nm: number;
  rpmAtPeakTorque: number;
  peakTorque_perCID: number;
  
  // Operating limits (page 5-2)
  shiftRPM: number;      // 8% above peak HP RPM
  redlineRPM: number;    // Based on mechanical stress limits
  
  // Geometric ratios (page 5-4)
  boreToStrokeRatio: number;
  rodToStrokeRatio: number;
  intakeThroatToBoreAreaRatio: number;
  intakeValveLiftToDiaRatio: number;
  
  // Piston speeds at key RPMs (page 5-3)
  avgPistonSpeed_fpm: { peakTQ: number; peakHP: number; shift: number; redline: number };
  maxPistonSpeed_fpm: { peakTQ: number; peakHP: number; shift: number; redline: number };
  
  // Full dyno curve
  dynoCurve: { rpm: number; hp: number; torque_lbft: number }[];
  
  // Recommendations (page 5-11 to 5-15)
  recommendations: EngineProRecommendations;
}

/**
 * ENGINE Pro Recommendations (Chapter 5, page 5-11 to 5-15)
 */
export interface EngineProRecommendations {
  // Intake system (page 5-12)
  intakeValveLift_in: number;
  minFlowArea_sqin: number;
  totalIntakeTrackLength_in: number;
  maxFlowArea_sqin: number;
  totalIntakeTrackVolume_cc: number;
  plenumVolume_ci: number;
  
  // Camshaft (page 5-13)
  lobeSeparationAngle_deg: number;
  intakeLobeCenterline_deg: number;
  exhaustDuration050_deg: number;
  
  // Exhaust port (page 5-14)
  exhaustFlow_cfm: number;
  exhaustFlow_pctIntake: number;
  exhaustValveDia_in: number;
  exhaustValveLift_in: number;
  exhaustMinFlowArea_sqin: number;
  exhaustMaxFlowArea_sqin: number;
  
  // Exhaust system (page 5-15)
  primaryTubeLength_in: number;
  primaryTubeDia_in: number;
  collectorDia_in: number;
}

// ============================================================================
// Constants
// ============================================================================

/** Camshaft type multipliers for valve lift capability */
const CAM_TYPE_LIFT_MULT: Record<CamshaftType, number> = {
  'overhead_cam': 1.00,
  'roller': 0.98,
  'mushroom_tappet': 0.95,
  'high_rate_flat_tappet': 0.92,
  'normal_flat_tappet': 0.88,
  'hydraulic_roller': 0.90,
  'hydraulic_flat_tappet': 0.85,
};

/** Fuel type thermal efficiency factors */
const FUEL_EFFICIENCY: Record<FuelType, number> = {
  'gasoline': 1.00,
  'racing_gasoline': 1.02,
  'methanol': 1.08,  // Methanol has higher thermal efficiency
};

/** Intake manifold type efficiency factors */
const MANIFOLD_EFFICIENCY: Record<IntakeManifoldType, number> = {
  'plenum': 1.00,
  'individual_runner': 1.03,
  'dual_plane_divided': 0.96,
  'dual_plane_slot': 0.98,
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Calculate displacement from bore, stroke, and number of cylinders
 */
export function calcDisplacement(bore_in: number, stroke_in: number, numCylinders: number): number {
  return (Math.PI / 4) * bore_in * bore_in * stroke_in * numCylinders;
}

/**
 * Calculate average piston speed (page 5-3, 5-6)
 * Avg Piston Speed = stroke (inches) × RPM / 6
 */
export function calcAvgPistonSpeed(stroke_in: number, rpm: number): number {
  return (stroke_in * rpm) / 6;
}

/**
 * Calculate maximum piston speed (page 5-3, 5-6)
 * Takes into account eccentric motion due to crank/rod geometry
 */
export function calcMaxPistonSpeed(stroke_in: number, rodLength_in: number, rpm: number): number {
  const avgSpeed = calcAvgPistonSpeed(stroke_in, rpm);
  const rodRatio = rodLength_in / stroke_in;
  // Max speed occurs around 75-80° ATDC, approximately 1.6-1.7× average
  // More accurate: Vmax = π × stroke × RPM / 60 × sqrt(1 + 1/(4×R²))
  // where R = rod/stroke ratio
  const maxMultiplier = Math.PI / 2 * Math.sqrt(1 + 1 / (4 * rodRatio * rodRatio));
  return avgSpeed * maxMultiplier;
}

/**
 * Calculate compression ratio from component volumes (page 4-8)
 */
export function calcCompressionRatio(
  bore_in: number,
  stroke_in: number,
  combustionChamber_cc: number,
  pistonToDeck_in: number,
  gasketThickness_in: number,
  pistonDome_cc: number  // Negative for dish
): number {
  // Swept volume in cc (1 ci = 16.387 cc)
  const sweptVolume_cc = (Math.PI / 4) * bore_in * bore_in * stroke_in * 16.387;
  
  // Clearance volume components
  const deckVolume_cc = (Math.PI / 4) * bore_in * bore_in * pistonToDeck_in * 16.387;
  const gasketVolume_cc = (Math.PI / 4) * bore_in * bore_in * gasketThickness_in * 16.387;
  
  // Total clearance volume
  const clearanceVolume_cc = combustionChamber_cc + deckVolume_cc + gasketVolume_cc - pistonDome_cc;
  
  // CR = (Swept + Clearance) / Clearance
  return (sweptVolume_cc + clearanceVolume_cc) / clearanceVolume_cc;
}

/**
 * Estimate peak HP RPM based on cam duration and engine parameters
 * Rule of thumb: Peak RPM ≈ 456000 / duration (at 0.050")
 */
export function estimatePeakHPRPM(
  intakeDuration050_deg: number,
  camType: CamshaftType
): number {
  // Base estimate from duration
  let peakRPM = 456000 / intakeDuration050_deg;
  
  // Adjust for cam type (aggressive cams can rev higher)
  const camMult = CAM_TYPE_LIFT_MULT[camType];
  peakRPM *= (1 + (1 - camMult) * 0.5);  // Higher lift cams = higher RPM potential
  
  return Math.round(peakRPM / 100) * 100;  // Round to nearest 100
}

/**
 * Estimate peak torque RPM (typically 75-85% of peak HP RPM)
 */
export function estimatePeakTorqueRPM(peakHPRPM: number): number {
  return Math.round(peakHPRPM * 0.78 / 100) * 100;
}

/**
 * Calculate flow velocity index (page 4-15)
 * Normal values: 70-90%, state-of-the-art can approach 100%
 */
export function calcFlowVelocityIndex(
  flow_cfm: number,
  area_sqin: number,
  testPressure_inH2O: number
): number {
  // Theoretical max velocity based on test pressure
  // V_max = sqrt(2 × ΔP × ρ_std / ρ_air) 
  // At standard conditions, approximately:
  const theoreticalVelocity_fps = 18.3 * Math.sqrt(testPressure_inH2O);
  
  // Actual velocity
  const actualVelocity_fps = (flow_cfm / area_sqin) / 60 * 144;  // CFM/sqin to fps
  
  return (actualVelocity_fps / theoreticalVelocity_fps) * 100;
}

// ============================================================================
// Main Simulation Function
// ============================================================================

/**
 * Run ENGINE Pro simulation
 */
export function simulateEnginePro(config: EngineProConfig): EngineProResult {
  // Calculate displacement
  const displacement_ci = calcDisplacement(config.bore_in, config.stroke_in, config.numCylinders);
  const displacement_L = displacement_ci * 0.01639;
  
  // Geometric ratios (page 5-4)
  const boreToStrokeRatio = config.bore_in / config.stroke_in;
  const rodToStrokeRatio = config.rodLength_in / config.stroke_in;
  
  // Intake throat area (assuming throat is 87% of valve diameter for typical heads)
  const throatDia = config.valveSeatThroatDia_in ?? (config.intakeValveDia_in * 0.87);
  const throatArea = (Math.PI / 4) * throatDia * throatDia * config.numIntakeValvesPerCyl;
  const boreArea = (Math.PI / 4) * config.bore_in * config.bore_in;
  const intakeThroatToBoreAreaRatio = throatArea / boreArea;
  
  const intakeValveLiftToDiaRatio = config.maxIntakeValveLift_in / config.intakeValveDia_in;
  
  // Estimate peak RPMs
  const rpmAtPeakHP = estimatePeakHPRPM(config.intakeDuration050_deg, config.camshaftType);
  const rpmAtPeakTorque = estimatePeakTorqueRPM(rpmAtPeakHP);
  const shiftRPM = Math.round(rpmAtPeakHP * 1.08 / 100) * 100;  // 8% above peak HP (page 5-2)
  
  // Redline based on piston speed limits (page 5-2)
  // Typical limit: 4500-5000 fpm average piston speed for steel rods
  const maxAvgPistonSpeed = 4800;  // fpm
  const redlineRPM = Math.round((maxAvgPistonSpeed * 6 / config.stroke_in) / 100) * 100;
  
  // Calculate piston speeds at key RPMs
  const avgPistonSpeed_fpm = {
    peakTQ: calcAvgPistonSpeed(config.stroke_in, rpmAtPeakTorque),
    peakHP: calcAvgPistonSpeed(config.stroke_in, rpmAtPeakHP),
    shift: calcAvgPistonSpeed(config.stroke_in, shiftRPM),
    redline: calcAvgPistonSpeed(config.stroke_in, redlineRPM),
  };
  
  const maxPistonSpeed_fpm = {
    peakTQ: calcMaxPistonSpeed(config.stroke_in, config.rodLength_in, rpmAtPeakTorque),
    peakHP: calcMaxPistonSpeed(config.stroke_in, config.rodLength_in, rpmAtPeakHP),
    shift: calcMaxPistonSpeed(config.stroke_in, config.rodLength_in, shiftRPM),
    redline: calcMaxPistonSpeed(config.stroke_in, config.rodLength_in, redlineRPM),
  };
  
  // Estimate peak HP based on airflow capacity
  // HP ≈ (CFM × VE × efficiency factors) / K
  // K is an empirical constant calibrated to dyno data
  const flowEfficiency = config.maxIntakeFlow_cfm / 300;  // Normalized to ~300 CFM reference
  const camEfficiency = CAM_TYPE_LIFT_MULT[config.camshaftType];
  const fuelEfficiency = FUEL_EFFICIENCY[config.fuelType];
  const manifoldEfficiency = MANIFOLD_EFFICIENCY[config.intakeManifoldType];
  const flowFactorEff = config.intakeManifoldFlowFactor_pct / 100;
  
  // Compression ratio effect on thermal efficiency
  const compressionEff = 1 + (config.compressionRatio - 10) * 0.02;  // ~2% per point above 10:1
  
  // Base HP per CID (empirical, calibrated to typical racing engines)
  // Good street engine: ~1.0 HP/CID, Pro Stock: ~2.5+ HP/CID
  const baseHP_perCID = 1.2;  // Conservative baseline
  
  const peakHP_perCID = baseHP_perCID * 
    flowEfficiency * 
    camEfficiency * 
    fuelEfficiency * 
    manifoldEfficiency * 
    flowFactorEff *
    compressionEff *
    (config.numIntakeValvesPerCyl > 1 ? 1.08 : 1.0);  // Multi-valve bonus
  
  const peakHP = peakHP_perCID * displacement_ci;
  const peakHP_kW = peakHP * 0.7457;
  
  // Peak torque from HP and RPM
  // HP = (Torque × RPM) / 5252
  // At peak torque RPM, torque is typically 5-10% higher than at peak HP RPM
  const peakTorque_lbft = (peakHP * 5252 / rpmAtPeakHP) * 1.08;
  const peakTorque_Nm = peakTorque_lbft * 1.3558;
  const peakTorque_perCID = peakTorque_lbft / displacement_ci;
  
  // Generate dyno curve
  const dynoCurve = generateDynoCurve(
    peakHP, rpmAtPeakHP,
    peakTorque_lbft, rpmAtPeakTorque,
    redlineRPM
  );
  
  // Generate recommendations (page 5-11 to 5-15)
  const recommendations = generateRecommendations(config, displacement_ci, rpmAtPeakHP);
  
  return {
    displacement_ci,
    displacement_L,
    peakHP,
    peakHP_kW,
    rpmAtPeakHP,
    peakHP_perCID,
    peakTorque_lbft,
    peakTorque_Nm,
    rpmAtPeakTorque,
    peakTorque_perCID,
    shiftRPM,
    redlineRPM,
    boreToStrokeRatio,
    rodToStrokeRatio,
    intakeThroatToBoreAreaRatio,
    intakeValveLiftToDiaRatio,
    avgPistonSpeed_fpm,
    maxPistonSpeed_fpm,
    dynoCurve,
    recommendations,
  };
}

/**
 * Generate full dyno curve from peak values
 */
function generateDynoCurve(
  _peakHP: number,  // Reserved for future curve shape refinement
  rpmAtPeakHP: number,
  peakTorque: number,
  rpmAtPeakTorque: number,
  redlineRPM: number
): { rpm: number; hp: number; torque_lbft: number }[] {
  const curve: { rpm: number; hp: number; torque_lbft: number }[] = [];
  
  // Start at ~40% of peak torque RPM
  const startRPM = Math.round(rpmAtPeakTorque * 0.4 / 500) * 500;
  const endRPM = Math.min(redlineRPM, Math.round(rpmAtPeakHP * 1.15 / 500) * 500);
  
  for (let rpm = startRPM; rpm <= endRPM; rpm += 250) {
    // Torque curve shape (parabolic with asymmetric falloff)
    let torque: number;
    
    if (rpm <= rpmAtPeakTorque) {
      // Rising portion
      const ratio = rpm / rpmAtPeakTorque;
      torque = peakTorque * (0.7 + 0.3 * ratio);
    } else if (rpm <= rpmAtPeakHP) {
      // Plateau/slight decline
      const ratio = (rpm - rpmAtPeakTorque) / (rpmAtPeakHP - rpmAtPeakTorque);
      torque = peakTorque * (1 - 0.08 * ratio);
    } else {
      // Falling portion after peak HP
      const ratio = (rpm - rpmAtPeakHP) / (redlineRPM - rpmAtPeakHP);
      const falloff = 0.15 + 0.25 * ratio;  // 15-40% drop to redline
      torque = peakTorque * 0.92 * (1 - falloff);
    }
    
    // HP = Torque × RPM / 5252
    const hp = (torque * rpm) / 5252;
    
    curve.push({ rpm, hp: Math.round(hp), torque_lbft: Math.round(torque) });
  }
  
  return curve;
}

/**
 * Generate ENGINE Pro recommendations (page 5-11 to 5-15)
 */
function generateRecommendations(
  config: EngineProConfig,
  displacement_ci: number,
  rpmAtPeakHP: number
): EngineProRecommendations {
  const cylDisp = displacement_ci / config.numCylinders;
  
  // Intake valve lift recommendation (page 5-12)
  // Based on valve diameter and cam type
  const liftMult = CAM_TYPE_LIFT_MULT[config.camshaftType];
  const intakeValveLift_in = config.intakeValveDia_in * 0.30 * (1 / liftMult);
  
  // Minimum flow area (page 5-12)
  // Based on valve throat area
  const throatDia = config.valveSeatThroatDia_in ?? (config.intakeValveDia_in * 0.87);
  const minFlowArea_sqin = (Math.PI / 4) * throatDia * throatDia * config.numIntakeValvesPerCyl;
  
  // Total intake track length for tuning (page 5-12)
  // L = (K × 60 × Vs) / (2 × RPM) where K is tuning harmonic, Vs is sonic velocity
  // Simplified: L ≈ 85000 / RPM for primary harmonic
  const totalIntakeTrackLength_in = 85000 / rpmAtPeakHP;
  
  // Max flow area at plenum (page 5-12)
  // Typically 2-3× min area for good taper
  const maxFlowArea_sqin = minFlowArea_sqin * 2.5;
  
  // Intake track volume (page 5-13)
  // Approximately 1.5-2× cylinder displacement
  const totalIntakeTrackVolume_cc = cylDisp * 16.387 * 1.75;
  
  // Plenum volume (page 5-13)
  // Typically 1.5-2× total engine displacement
  const plenumVolume_ci = displacement_ci * 1.75;
  
  // Camshaft recommendations (page 5-13)
  const lobeSeparationAngle_deg = 108 + (config.compressionRatio - 10) * 0.5;  // Wider LSA for higher CR
  const intakeLobeCenterline_deg = lobeSeparationAngle_deg - 2;  // Slight advance
  const exhaustDuration050_deg = config.intakeDuration050_deg + 6;  // Exhaust slightly longer
  
  // Exhaust recommendations (page 5-14)
  const exhaustFlow_pctIntake = 75 + config.numIntakeValvesPerCyl * 2;  // 77-81%
  const exhaustFlow_cfm = config.maxIntakeFlow_cfm * exhaustFlow_pctIntake / 100;
  const exhaustValveDia_in = config.intakeValveDia_in * 0.82;  // ~82% of intake
  const exhaustValveLift_in = intakeValveLift_in * 0.95;
  const exhaustMinFlowArea_sqin = minFlowArea_sqin * 0.75;
  const exhaustMaxFlowArea_sqin = maxFlowArea_sqin * 0.80;
  
  // Exhaust system (page 5-15)
  // Primary length: L ≈ 100000 / RPM for primary harmonic
  const primaryTubeLength_in = 100000 / rpmAtPeakHP;
  // Primary diameter: based on cylinder displacement and RPM
  const primaryTubeDia_in = 1.5 + (cylDisp / 50) * 0.25;
  const collectorDia_in = primaryTubeDia_in * 1.75;
  
  return {
    intakeValveLift_in: Math.round(intakeValveLift_in * 1000) / 1000,
    minFlowArea_sqin: Math.round(minFlowArea_sqin * 100) / 100,
    totalIntakeTrackLength_in: Math.round(totalIntakeTrackLength_in * 10) / 10,
    maxFlowArea_sqin: Math.round(maxFlowArea_sqin * 100) / 100,
    totalIntakeTrackVolume_cc: Math.round(totalIntakeTrackVolume_cc),
    plenumVolume_ci: Math.round(plenumVolume_ci),
    lobeSeparationAngle_deg: Math.round(lobeSeparationAngle_deg),
    intakeLobeCenterline_deg: Math.round(intakeLobeCenterline_deg),
    exhaustDuration050_deg: Math.round(exhaustDuration050_deg),
    exhaustFlow_cfm: Math.round(exhaustFlow_cfm),
    exhaustFlow_pctIntake: Math.round(exhaustFlow_pctIntake),
    exhaustValveDia_in: Math.round(exhaustValveDia_in * 100) / 100,
    exhaustValveLift_in: Math.round(exhaustValveLift_in * 1000) / 1000,
    exhaustMinFlowArea_sqin: Math.round(exhaustMinFlowArea_sqin * 100) / 100,
    exhaustMaxFlowArea_sqin: Math.round(exhaustMaxFlowArea_sqin * 100) / 100,
    primaryTubeLength_in: Math.round(primaryTubeLength_in * 10) / 10,
    primaryTubeDia_in: Math.round(primaryTubeDia_in * 100) / 100,
    collectorDia_in: Math.round(collectorDia_in * 100) / 100,
  };
}

/**
 * Create default ENGINE Pro configuration (355 SBC style from manual)
 */
export function createDefaultEngineProConfig(): EngineProConfig {
  return {
    numCylinders: 8,
    layout: 'vee',
    bore_in: 4.00,
    stroke_in: 3.48,
    rodLength_in: 5.70,
    compressionRatio: 10.5,
    
    camshaftType: 'roller',
    intakeDuration050_deg: 230,
    
    throttleCFM_at_1_5inHg: 750,
    isEFI: false,
    
    fuelType: 'racing_gasoline',
    
    intakeManifoldType: 'plenum',
    runnerStyle: 'curved',
    intakeManifoldFlowFactor_pct: 95,
    
    numIntakeValvesPerCyl: 1,
    intakeValveDia_in: 2.02,
    maxIntakeFlow_cfm: 270,
    flowTestPressure_inH2O: 28,
    flowTestBoreDia_in: 4.00,
    maxIntakeValveLift_in: 0.550,
  };
}
