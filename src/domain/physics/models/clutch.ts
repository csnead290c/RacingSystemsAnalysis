/**
 * Clutch Pro Physics Model
 * Ported from VB6 CLUTCH Pro source code
 * 
 * This module calculates centrifugal clutch behavior including:
 * - Centrifugal force coefficients (CF)
 * - Total plate force vs RPM
 * - Low and high gear lockup RPM
 * - Friction PSI calculations
 */

// ============================================================================
// CONSTANTS
// ============================================================================

export const PI = 3.141593;
export const GRAV = 32.174;  // ft/s^2
export const PI180 = PI / 180;
export const ZPI = 12 * 60 / (2 * PI);  // Conversion factor for RPM calculations
export const Z6 = (60 / (2 * PI)) * 550;  // HP to torque conversion

// Standard atmospheric conditions
export const TSTD = 519.67;  // Standard temperature (Rankine)
export const PSTD = 14.696;  // Standard pressure (psi)
export const BSTD = 29.92;   // Standard barometer (inHg)

// ============================================================================
// INTERFACES
// ============================================================================

/** Clutch arm geometry data - matches VB6 AData array */
export interface ClutchArmData {
  id: number;
  name: string;
  description: string;
  armWeight: number;           // AData(i, 1) - arm weight in grams (negative = fixed pivot)
  plateDiameter: number;       // AData(i, 2) - plate pin diameter
  pivotRadius: number;         // AData(i, 3) - pivot pin radius
  counterweightRadius: number; // AData(i, 4) - counterweight CG radius
  armCGRadius: number;         // AData(i, 5) - arm CG radius
  refRingHeight: number;       // AData(i, 6) - reference ring height
  refArmDepth: number;         // AData(i, 7) - reference arm depth
  armDepthDiameter: number;    // AData(i, 8) - arm depth checking diameter (0 = no arm depth)
  refAngle: number;            // AData(i, 9) - reference angle (degrees)
  counterweightAngle: number;  // AData(i, 10) - counterweight angle offset
  armCGAngle: number;          // AData(i, 11) - arm CG angle offset
}

/** Clutch arm configuration */
export interface ClutchArmConfig {
  armType: number;             // Index into arm data array
  numArms: number;             // Number of arms
  totalCounterweight: number;  // Total counterweight (grams)
  counterweightPerArm: number; // Counterweight per arm (grams)
  ringHeight: number;          // Ring height (inches)
  armDepth: number;            // Arm depth (inches) or return spring force (lbs) for bikes
}

/** Clutch disk configuration */
export interface ClutchDiskConfig {
  numDisks: number;            // Number of friction disks
  diskWeight: number;          // Weight per disk (lbs)
  outerDiameter: number;       // Disk OD (inches)
  innerDiameter: number;       // Disk ID (inches)
  frictionArea: number;        // Effective friction area (%)
  frictionCoefficient: number; // Coefficient of friction (CMU)
}

/** Clutch spring configuration */
export interface ClutchSpringConfig {
  numSprings: number;          // Number of springs
  basePreload: number;         // Base preload per spring (lbs)
  springRate: number;          // Spring rate (lbs/inch)
  turns: number;               // Adjuster turns
  threadPitch: number;         // Thread pitch (threads per inch)
  deltaRingHeight: number;     // Ring height change from reference
}

/** Engine dyno data point */
export interface DynoDataPoint {
  rpm: number;
  horsepower: number;
  torque: number;
}

/** Complete clutch input configuration */
export interface ClutchInput {
  note: string;
  
  // Environment
  barometer: number;           // Barometric pressure (inHg)
  temperature: number;         // Temperature (°F)
  humidity: number;            // Relative humidity (%)
  
  // Vehicle type
  isBike: boolean;             // Motorcycle vs car
  isGlide: boolean;            // Powerglide transmission
  
  // Drivetrain
  lowGear: number;             // Low gear ratio
  highGear: number;            // High gear ratio
  gearRatio: number;           // Final drive ratio
  tireDiameter: number;        // Tire diameter (inches) or rollout
  primaryDriveRatio: number;   // Primary drive ratio (bikes)
  
  // Track conditions
  estimated60ft: number;       // Estimated 60ft time (seconds)
  maxAcceleration: number;     // Maximum acceleration (g's)
  tractionIndex: number;       // Traction index (1-5)
  
  // Polar moments of inertia
  enginePMI: number;           // Engine PMI (lb-in²)
  transPMI: number;            // Transmission PMI (lb-in²)
  tiresPMI: number;            // Tires/wheels PMI (lb-in²)
  
  // Engine data
  fuelSystem: number;          // Fuel system type
  hpTorqueMultiplier: number;  // HP/Torque correction multiplier
  dynoData: DynoDataPoint[];   // Engine dyno curve
  
  // Clutch arms (up to 2 arm types)
  arm1: ClutchArmConfig;
  arm2: ClutchArmConfig;
  
  // Clutch disk
  disk: ClutchDiskConfig;
  
  // Clutch spring
  spring: ClutchSpringConfig;
  
  // Launch conditions
  launchRPM: number;           // Launch RPM (negative = CMU heating disabled)
  airGap: number;              // Air gap at launch (inches)
  
  // Static plate force
  staticPlateForce: number;    // Static plate force (lbs)
}

/** Clutch calculation results */
export interface ClutchResult {
  // Centrifugal force coefficients
  cf1: number;                 // CF for arm type 1
  cf2: number;                 // CF for arm type 2
  retLbf1: number;             // Return spring force for arm type 1
  retLbf2: number;             // Return spring force for arm type 2
  
  // Plate force vs RPM
  plateForceData: { rpm: number; centrifugalForce: number; totalForce: number }[];
  
  // Lockup calculations
  lowGearLockupRPM: number;
  highGearLockupRPM: number;
  lowGearPlateForce: number;
  highGearPlateForce: number;
  lowGearFrictionPSI: number;
  highGearFrictionPSI: number;
  
  // Launch conditions
  launchPlateForceWithAirGap: number;
  launchPlateForceZeroAirGap: number;
  launchFrictionPSI: number;
  
  // Torque capacity
  clutchTorqueCapacityLow: number[];  // At each RPM point
  clutchTorqueCapacityHigh: number[];
  engineTorqueLow: number[];          // Corrected engine torque
  engineTorqueHigh: number[];
  
  // Geometry
  frictionArea: number;        // Total friction surface area (in²)
  geometryConstant: number;    // Geometry constant for torque calculation
  
  // Warnings
  warnings: string[];
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Calculate HP correction factor based on atmospheric conditions
 */
export function calculateHPCorrection(
  barometer: number,
  temperature: number,
  humidity: number
): number {
  // Standard conditions
  const pStd = PSTD;
  const tStd = TSTD;
  
  // Convert temperature to Rankine
  const tRankine = temperature + 459.67;
  
  // Calculate vapor pressure (simplified)
  const vaporPressure = humidity / 100 * 0.49;
  
  // Pressure correction
  const pActual = barometer / BSTD * pStd - vaporPressure;
  
  // HP correction factor
  const hpc = Math.sqrt(tStd / tRankine) * (pActual / pStd);
  
  return hpc;
}

/**
 * Calculate static plate force from spring configuration
 */
export function calculateStaticPlateForce(spring: ClutchSpringConfig, isGlide: boolean): number {
  if (isGlide) {
    return spring.basePreload + spring.springRate * spring.turns;
  } else {
    return spring.basePreload + spring.springRate * (spring.turns - spring.deltaRingHeight * spring.threadPitch);
  }
}

/**
 * Calculate total plate force at a given RPM
 * TotalLbs = Static + CF1 * RPM² + CF2 * RPM² - RetLbf1 - RetLbf2
 */
export function calculateTotalPlateForce(
  staticForce: number,
  cf1: number,
  retLbf1: number,
  cf2: number,
  retLbf2: number,
  rpm: number
): number {
  const rpmSquared = rpm * rpm;
  const centrifugalForce = cf1 * rpmSquared + cf2 * rpmSquared;
  const returnForce = retLbf1 + retLbf2;
  
  // Centrifugal force only applies when positive (above threshold RPM)
  const netCentrifugal = Math.max(0, centrifugalForce - returnForce);
  
  return staticForce + netCentrifugal;
}

/**
 * Calculate centrifugal force coefficient for a clutch arm
 * This is the core physics calculation from VB6 CalcCF subroutine
 */
export function calculateCF(
  armData: ClutchArmData,
  armConfig: ClutchArmConfig,
  _airGap: number = 0,           // Reserved for HUNT iteration
  _ringHeightDelta: number = 0,  // Reserved for future use
  isBike: boolean = false
): { cf: number; retLbf: number } {
  if (!armData || armConfig.numArms === 0) {
    return { cf: 0, retLbf: 0 };
  }
  
  // Z5 constant for centrifugal force calculation
  // Z5 = (60/PI)² * 6 * 453.6 * grav
  const Z5 = Math.pow(60 / PI, 2) * 6 * 453.6 * GRAV;
  
  let cf = 0;
  let retLbf = 0;
  
  const angle = armData.refAngle;
  // drnht would be used in HUNT iteration for angle adjustment
  // const drnht = armData.refRingHeight - armConfig.ringHeight;
  
  // Note: Full VB6 implementation uses HUNT iteration to find the angle
  // that gives the desired pivot pin height. This simplified version uses
  // the reference angle directly, which is accurate for small air gaps.
  
  // Simplified angle calculation (would use HUNT iteration in full implementation)
  const angleRad = angle * PI180;
  const cosAngle = Math.cos(angleRad);
  
  let dPlate = armData.plateDiameter;
  const denom = armData.pivotRadius * cosAngle;
  
  // Check for fixed pivot option
  if (armData.armWeight < 0) {
    dPlate = armData.plateDiameter + 2 * denom;
  }
  
  // Counterweight contribution
  const dcw = dPlate - 2 * armData.counterweightRadius * Math.cos((angle + armData.counterweightAngle) * PI180);
  const alr = (armData.counterweightRadius * Math.sin((angle + armData.counterweightAngle) * PI180)) / denom;
  cf = armConfig.numArms * armConfig.counterweightPerArm * dcw * alr;
  
  // Arm CG contribution
  const dcg = dPlate - 2 * armData.armCGRadius * Math.cos((angle + armData.armCGAngle) * PI180);
  const cglr = (armData.armCGRadius * Math.sin((angle + armData.armCGAngle) * PI180)) / denom;
  cf = cf + armConfig.numArms * Math.abs(armData.armWeight) * dcg * cglr;
  
  // Convert to proper units
  cf = cf / Z5;
  
  // Check for bike with return springs
  if (isBike && armData.armDepthDiameter > 0) {
    const rtslvr = (0.5 * (dPlate - armData.armDepthDiameter) - denom) / denom;
    retLbf = armConfig.numArms * armConfig.armDepth * rtslvr;  // armDepth = return spring force for bikes
  }
  
  return { cf, retLbf };
}

/**
 * Calculate friction surface area
 */
export function calculateFrictionArea(disk: ClutchDiskConfig): number {
  const baseArea = PI * (Math.pow(disk.outerDiameter, 2) - Math.pow(disk.innerDiameter, 2)) / 4;
  return 2 * disk.numDisks * (disk.frictionArea / 100) * baseArea;
}

/**
 * Calculate geometry constant for torque calculation
 */
export function calculateGeometryConstant(disk: ClutchDiskConfig): number {
  const od = disk.outerDiameter;
  const id = disk.innerDiameter;
  return ((Math.pow(od, 3) - Math.pow(id, 3)) / (3 * (Math.pow(od, 2) - Math.pow(id, 2))) / 12);
}

/**
 * Find lockup RPM where clutch torque capacity equals engine torque
 * Uses quadratic solution from VB6 ClutchCalc
 */
export function findLockupRPM(
  engineTorque: { rpm: number; torque: number }[],
  c1: number,
  c2: number,
  staticForce: number,
  retLbf: number,
  zCorrection: number,
  primaryDriveRatio: number
): number {
  const c2Adjusted = c2 / Math.pow(primaryDriveRatio, 2);
  let lockupRPM = 1;
  
  for (let k = 1; k < engineTorque.length; k++) {
    const k1 = k - 1;
    const rpm1 = engineTorque[k1].rpm;
    const rpm2 = engineTorque[k].rpm;
    const tq1 = engineTorque[k1].torque;
    const tq2 = engineTorque[k].torque;
    
    // Linear interpolation coefficients
    const b = (tq2 - tq1) / (rpm2 - rpm1);
    const a = tq2 - rpm2 * b;
    
    let r1 = 0, r2 = 0;
    
    if (c2Adjusted * Math.pow(rpm1, 2) <= retLbf) {
      if (b !== 0) {
        r1 = (c1 * staticForce - zCorrection - a) / b;
      }
    } else {
      const z = 4 * (c1 * c2Adjusted) * (c1 * (staticForce - retLbf) - zCorrection - a);
      const discriminant = Math.pow(b, 2) - z;
      const sqrtDisc = discriminant > 0 ? Math.sqrt(discriminant) : 0;
      
      if (c2Adjusted !== 0) {
        r1 = (b - sqrtDisc) / (2 * c1 * c2Adjusted);
        r2 = (b + sqrtDisc) / (2 * c1 * c2Adjusted);
      }
    }
    
    // Validate solutions are within RPM range
    if (r1 < rpm1 && k > 1) r1 = 0;
    if (r2 < rpm1 && k > 1) r2 = 0;
    if (r1 > rpm2 && k < engineTorque.length - 1) r1 = 0;
    if (r2 > rpm2 && k < engineTorque.length - 1) r2 = 0;
    
    if (r1 > 0) lockupRPM = r1;
    if (r2 > 0) lockupRPM = r2;
  }
  
  return lockupRPM;
}

// ============================================================================
// MAIN ANALYSIS FUNCTION
// ============================================================================

/**
 * Perform complete clutch analysis
 */
export function analyzeClutch(input: ClutchInput, armDataArray: ClutchArmData[]): ClutchResult {
  const warnings: string[] = [];
  
  // Calculate HP correction factor
  const hpc = calculateHPCorrection(input.barometer, input.temperature, input.humidity);
  
  // Get arm data
  const armData1 = armDataArray[input.arm1.armType] || null;
  const armData2 = armDataArray[input.arm2.armType] || null;
  
  // Calculate CF for zero air gap
  const cf1Result = armData1 ? calculateCF(armData1, input.arm1, 0, 0, input.isBike) : { cf: 0, retLbf: 0 };
  const cf2Result = armData2 ? calculateCF(armData2, input.arm2, 0, 0, input.isBike) : { cf: 0, retLbf: 0 };
  
  const cf1 = cf1Result.cf;
  const cf2 = cf2Result.cf;
  const retLbf1 = cf1Result.retLbf;
  const retLbf2 = cf2Result.retLbf;
  
  // Calculate plate force vs RPM
  const plateForceData: { rpm: number; centrifugalForce: number; totalForce: number }[] = [];
  const rpmPoints = input.dynoData.filter(d => d.rpm > 0).map(d => d.rpm);
  
  for (const rpm of rpmPoints) {
    const centrifugalForce = (cf1 + cf2) * rpm * rpm - retLbf1 - retLbf2;
    const totalForce = input.staticPlateForce + Math.max(0, centrifugalForce);
    plateForceData.push({ rpm, centrifugalForce: Math.max(0, centrifugalForce), totalForce });
  }
  
  // Calculate friction area and geometry
  const frictionArea = calculateFrictionArea(input.disk);
  const geometryConstant = calculateGeometryConstant(input.disk);
  
  // Calculate torque capacity coefficient
  const c1 = 2 * input.disk.numDisks * input.disk.frictionCoefficient * geometryConstant * Math.pow(input.disk.frictionArea / 100, 0.2);
  
  // Prepare engine torque data (corrected for HP)
  const engineTorque = input.dynoData
    .filter(d => d.rpm > 0)
    .map(d => ({
      rpm: d.rpm,
      torque: input.hpTorqueMultiplier * d.torque / hpc * input.primaryDriveRatio
    }));
  
  // Calculate clutch torque capacity at each RPM
  const clutchTorqueCapacityLow: number[] = [];
  const clutchTorqueCapacityHigh: number[] = [];
  
  for (const pf of plateForceData) {
    clutchTorqueCapacityLow.push(c1 * pf.totalForce);
    clutchTorqueCapacityHigh.push(c1 * pf.totalForce);
  }
  
  // Find lockup RPMs
  const combinedCF = (cf1 + cf2) / Math.pow(input.primaryDriveRatio, 2);
  const combinedRetLbf = retLbf1 + retLbf2;
  
  const lowGearLockupRPM = findLockupRPM(
    engineTorque,
    c1,
    combinedCF,
    input.staticPlateForce,
    combinedRetLbf,
    0, // ZLO correction
    input.primaryDriveRatio
  );
  
  const highGearLockupRPM = findLockupRPM(
    engineTorque,
    c1,
    combinedCF,
    input.staticPlateForce,
    combinedRetLbf,
    0, // ZHI correction
    input.primaryDriveRatio
  );
  
  // Calculate plate force and PSI at lockup
  const lowGearPlateForce = calculateTotalPlateForce(input.staticPlateForce, cf1, retLbf1, cf2, retLbf2, lowGearLockupRPM);
  const highGearPlateForce = calculateTotalPlateForce(input.staticPlateForce, cf1, retLbf1, cf2, retLbf2, highGearLockupRPM);
  const lowGearFrictionPSI = lowGearPlateForce / frictionArea;
  const highGearFrictionPSI = highGearPlateForce / frictionArea;
  
  // Calculate launch conditions
  const launchRPM = Math.abs(input.launchRPM);
  const launchPlateForceZeroAirGap = calculateTotalPlateForce(input.staticPlateForce, cf1, retLbf1, cf2, retLbf2, launchRPM);
  
  // Calculate with air gap
  const cf1AG = armData1 ? calculateCF(armData1, input.arm1, input.airGap, 0, input.isBike) : { cf: 0, retLbf: 0 };
  const cf2AG = armData2 ? calculateCF(armData2, input.arm2, input.airGap, 0, input.isBike) : { cf: 0, retLbf: 0 };
  const springForceWithAirGap = input.staticPlateForce + input.spring.springRate * input.airGap * input.spring.threadPitch;
  const launchPlateForceWithAirGap = calculateTotalPlateForce(springForceWithAirGap, cf1AG.cf, cf1AG.retLbf, cf2AG.cf, cf2AG.retLbf, launchRPM);
  
  const launchFrictionPSI = launchPlateForceZeroAirGap / frictionArea;
  
  // Check for warnings
  if (highGearFrictionPSI > 60) {
    warnings.push('Friction PSI is very high! Consider adding more surface area.');
  }
  
  return {
    cf1,
    cf2,
    retLbf1,
    retLbf2,
    plateForceData,
    lowGearLockupRPM: Math.round(lowGearLockupRPM / 20) * 20,
    highGearLockupRPM: Math.round(highGearLockupRPM / 20) * 20,
    lowGearPlateForce: Math.round(lowGearPlateForce / 5) * 5,
    highGearPlateForce: Math.round(highGearPlateForce / 5) * 5,
    lowGearFrictionPSI,
    highGearFrictionPSI,
    launchPlateForceWithAirGap: Math.round(launchPlateForceWithAirGap / 5) * 5,
    launchPlateForceZeroAirGap: Math.round(launchPlateForceZeroAirGap / 5) * 5,
    launchFrictionPSI,
    clutchTorqueCapacityLow,
    clutchTorqueCapacityHigh,
    engineTorqueLow: engineTorque.map(e => e.torque),
    engineTorqueHigh: engineTorque.map(e => e.torque),
    frictionArea,
    geometryConstant,
    warnings,
  };
}

// ============================================================================
// DEFAULT ARM DATA (Sample from VB6)
// ============================================================================

export const defaultArmData: ClutchArmData[] = [
  {
    id: 0,
    name: 'None',
    description: 'No arm selected',
    armWeight: 0,
    plateDiameter: 0,
    pivotRadius: 0,
    counterweightRadius: 0,
    armCGRadius: 0,
    refRingHeight: 0,
    refArmDepth: 0,
    armDepthDiameter: 0,
    refAngle: 0,
    counterweightAngle: 0,
    armCGAngle: 0,
  },
  {
    id: 1,
    name: 'STD-6',
    description: 'Standard 6-arm clutch',
    armWeight: 85,
    plateDiameter: 7.25,
    pivotRadius: 1.5,
    counterweightRadius: 1.2,
    armCGRadius: 0.8,
    refRingHeight: 0.375,
    refArmDepth: 0.125,
    armDepthDiameter: 5.5,
    refAngle: 15,
    counterweightAngle: 5,
    armCGAngle: 3,
  },
  {
    id: 2,
    name: 'PRO-6',
    description: 'Pro 6-arm clutch',
    armWeight: 95,
    plateDiameter: 8.0,
    pivotRadius: 1.75,
    counterweightRadius: 1.4,
    armCGRadius: 0.9,
    refRingHeight: 0.400,
    refArmDepth: 0.150,
    armDepthDiameter: 6.0,
    refAngle: 18,
    counterweightAngle: 6,
    armCGAngle: 4,
  },
];

/** Default clutch input for testing */
export const defaultClutchInput: ClutchInput = {
  note: 'Sample Clutch Setup',
  
  barometer: 29.92,
  temperature: 70,
  humidity: 50,
  
  isBike: false,
  isGlide: false,
  
  lowGear: 2.48,
  highGear: 1.48,
  gearRatio: 4.10,
  tireDiameter: 33,
  primaryDriveRatio: 1.0,
  
  estimated60ft: 1.10,
  maxAcceleration: 2.5,
  tractionIndex: 3,
  
  enginePMI: 150,
  transPMI: 25,
  tiresPMI: 200,
  
  fuelSystem: 1,
  hpTorqueMultiplier: 1.0,
  dynoData: [
    { rpm: 4000, horsepower: 350, torque: 460 },
    { rpm: 4500, horsepower: 420, torque: 490 },
    { rpm: 5000, horsepower: 490, torque: 515 },
    { rpm: 5500, horsepower: 560, torque: 535 },
    { rpm: 6000, horsepower: 620, torque: 543 },
    { rpm: 6500, horsepower: 670, torque: 542 },
    { rpm: 7000, horsepower: 710, torque: 533 },
    { rpm: 7500, horsepower: 740, torque: 518 },
    { rpm: 8000, horsepower: 750, torque: 492 },
    { rpm: 8500, horsepower: 740, torque: 457 },
  ],
  
  arm1: {
    armType: 1,
    numArms: 6,
    totalCounterweight: 180,
    counterweightPerArm: 30,
    ringHeight: 0.375,
    armDepth: 0.125,
  },
  arm2: {
    armType: 0,
    numArms: 0,
    totalCounterweight: 0,
    counterweightPerArm: 0,
    ringHeight: 0,
    armDepth: 0,
  },
  
  disk: {
    numDisks: 5,
    diskWeight: 0.8,
    outerDiameter: 7.25,
    innerDiameter: 4.5,
    frictionArea: 85,
    frictionCoefficient: 0.35,
  },
  
  spring: {
    numSprings: 9,
    basePreload: 50,
    springRate: 180,
    turns: 3.5,
    threadPitch: 24,
    deltaRingHeight: 0,
  },
  
  launchRPM: 6500,
  airGap: 0.020,
  
  staticPlateForce: 680,
};
