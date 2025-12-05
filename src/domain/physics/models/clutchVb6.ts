/**
 * Clutch Pro Physics Model - Complete VB6 Port
 * Ported from VB6 CLUTCH Pro source code (calcs.bas, CPro.bas, Declares.bas)
 * 
 * This module provides exact VB6-compatible clutch calculations including:
 * - Centrifugal force coefficients (CF) with HUNT iteration
 * - Total plate force vs RPM
 * - Low and high gear lockup RPM
 * - Friction PSI calculations
 * - CMU temperature effects
 * - Engine torque corrections for inertia
 */

// ============================================================================
// CONSTANTS (from Declares.bas)
// ============================================================================

export const PI = 3.141593;
export const GRAV = 32.174;           // ft/s^2
export const PI180 = PI / 180;        // Degrees to radians
export const ZPI = 12 * 60 / (2 * PI); // RPM to rad/s conversion factor
export const Z6 = (60 / (2 * PI)) * 550; // HP to torque conversion

// Z5 constant for centrifugal force calculation
// Z5 = (60/PI)² * 6 * 453.6 * grav
export const Z5 = Math.pow(60 / PI, 2) * 6 * 453.6 * GRAV;

// Standard atmospheric conditions
export const TSTD = 519.67;   // Standard temperature (Rankine)
export const PSTD = 14.696;   // Standard pressure (psi)
export const BSTD = 29.92;    // Standard barometer (inHg)
export const WTAIR = 28.9669; // Molecular weight of air
export const WTH2O = 18.016;  // Molecular weight of water
export const RSTD = 1545.32;  // Universal gas constant

export const DYNO_ROWS = 10;

// ============================================================================
// INTERFACES
// ============================================================================

/**
 * Clutch arm geometry data - matches VB6 AData array exactly
 * AData(i, 1-12) mapping:
 *   1 = weight of arm (negative = fixed pivot option)
 *   2 = fixed diameter of arm (plate or pivot - based on #1)
 *   3 = radius from the plate to pivot
 *   4 = radius from the plate to weight
 *   5 = radius from the plate to arm cg
 *   6 = reference ring height for pivot angle (or pack clearance for "glide")
 *   7 = reference arm depth for pivot angle (or return spring force in lbs for bikes)
 *   8 = reference arm depth checking diameter (return spring location diameter)
 *   9 = orientation angle from plate to pivot
 *   10= delta angle from the pivot to weight
 *   11= delta angle from the pivot to arm cg
 *   12= nominal disk outer diameter
 */
export interface ClutchArmData {
  id: number;
  name: string;           // AName(i) - 5 char code like "ACE.1"
  description: string;    // ADesc(i) - full description
  armWeight: number;      // AData(i, 1) - grams, negative = fixed pivot
  plateDiameter: number;  // AData(i, 2) - inches
  pivotRadius: number;    // AData(i, 3) - inches
  weightRadius: number;   // AData(i, 4) - inches
  armCGRadius: number;    // AData(i, 5) - inches
  refRingHeight: number;  // AData(i, 6) - inches
  refArmDepth: number;    // AData(i, 7) - inches or lbs for bikes
  armDepthDiameter: number; // AData(i, 8) - inches, 0 = no arm depth
  refAngle: number;       // AData(i, 9) - degrees
  weightAngle: number;    // AData(i, 10) - degrees
  armCGAngle: number;     // AData(i, 11) - degrees
  nominalDiskOD: number;  // AData(i, 12) - inches
}

/** Clutch arm configuration for a single arm group */
export interface ClutchArmConfig {
  armTypeIndex: number;      // Index into arm data array (gc_Mfg1/gc_Mfg2)
  numArms: number;           // gc_NArm1/gc_NArm2
  totalCounterweight: number; // gc_TCWt1/gc_TCWt2 - total grams
  counterweightPerArm: number; // gc_CWt1/gc_CWt2 - grams per arm
  ringHeight: number;        // gc_RingHt1/gc_RingHt2 - inches
  armDepth: number;          // gc_ArmDepth1/gc_ArmDepth2 - inches or lbs for bikes
}

/** Clutch disk configuration */
export interface ClutchDiskConfig {
  numDisks: number;          // gc_NDisk
  diskWeight: number;        // gc_DiskWt - total weight in lbs
  outerDiameter: number;     // gc_DiskOD - inches
  innerDiameter: number;     // gc_DiskID - inches
  effectiveArea: number;     // gc_ClArea - percent (80-100)
  frictionCoefficient: number; // gc_CMU (0.15-0.75)
}

/** Clutch spring configuration */
export interface ClutchSpringConfig {
  numSprings: number;        // gc_NSpring
  springBasePreload: number; // gc_SBasePr - lbs per spring
  totalBasePreload: number;  // gc_BasePr - total lbs
  springRate: number;        // gc_SSRate - lbs/turn per spring
  totalSpringRate: number;   // gc_SRate - total lbs/turn
  adjusterTurns: number;     // gc_Turns
  threadPitch: number;       // gc_ThrdpI - threads per inch
  deltaRingHeight: number;   // gc_dRnHt - inches
}

/** Engine dyno data point */
export interface DynoDataPoint {
  rpm: number;
  horsepower: number;
  torque: number;
}

/** Complete clutch input configuration */
export interface ClutchInput {
  // Environment
  barometer: number;         // gc_Barometer - inHg or altimeter feet
  barometerIsAltimeter: boolean;
  temperature: number;       // gc_Temperature - °F
  humidity: number;          // gc_Humidity - %

  // Vehicle type flags
  isBike: boolean;
  isGlide: boolean;          // Powerglide transmission

  // Drivetrain
  lowGear: number;           // gc_LowGear
  highGear: number;          // gc_HighGear
  gearRatio: number;         // gc_GearRatio - final drive
  tireDiameter: number;      // gc_TireDia - inches or rollout
  tireDiaIsRollout: boolean;
  primaryDriveRatio: number; // gc_PDRatio (bikes)

  // Track conditions
  estimated60ft: number;     // gc_T60 - seconds
  maxAcceleration: number;   // gc_Amax - g's
  tractionIndex: number;     // gc_TractionIndex (1-12)

  // Polar moments of inertia
  enginePMI: number;         // gc_EnginePMI - lb-in²-sec²
  transPMI: number;          // gc_TransPMI
  tiresPMI: number;          // gc_TiresPMI

  // Engine data
  fuelSystem: number;        // gc_FuelSystem (1-8)
  hpTorqueMultiplier: number; // gc_HPTQMult
  dynoData: DynoDataPoint[]; // Up to DYNO_ROWS points

  // Clutch arms
  arm1: ClutchArmConfig;
  arm2: ClutchArmConfig;

  // Clutch disk
  disk: ClutchDiskConfig;

  // Clutch spring
  spring: ClutchSpringConfig;

  // Launch conditions
  launchRPM: number;         // gc_LaunchRPM (negative = CMU heating disabled)
  airGap: number;            // gc_AirGap - inches

  // Static plate force (can be calculated or input directly)
  staticPlateForce: number;  // gc_Static - lbs
}

/** CF calculation result */
export interface CFResult {
  cf1: number;
  cf2: number;
  retLbf1: number;
  retLbf2: number;
}

/** Complete clutch analysis result */
export interface ClutchResult {
  // HP correction
  hpCorrectionFactor: number;

  // Centrifugal force coefficients (at zero air gap)
  cf1: number;
  cf2: number;
  retLbf1: number;
  retLbf2: number;

  // Centrifugal plate force at each RPM point (CNTF array)
  centrifugalForceData: { rpm: number; force: number }[];

  // Clutch grid data (RPM, Centrifugal, Total)
  clutchGridData: { rpm: number; centrifugal: number; total: number }[];

  // Geometry calculations
  frictionArea: number;      // Total friction surface area (in²)
  geometryConstant: number;  // Geometry constant for torque

  // Torque capacity coefficients
  c1Low: number;
  c1High: number;

  // Clutch torque capacity at each RPM
  clutchTorqueCapacityLow: number[];
  clutchTorqueCapacityHigh: number[];

  // Corrected engine torque at each RPM
  engineTorqueLow: number[];
  engineTorqueHigh: number[];

  // Inertia corrections
  zLow: number;
  zHigh: number;

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

  // Peak torque
  peakTorque: number;

  // CMU ratio (temperature effect)
  cmuRatio: number;

  // Warnings
  warnings: string[];

  // Details calculation data
  detailsData: {
    rpmPoints: number[];
    addArm: number[];
    addCounterweight: number[];
    addRingHeight: number[];
    addArmDepth: number[];
    addAdjusterTurns: number[];
  } | null;
}

// ============================================================================
// HUNT ITERATION (from VB6 HUNT subroutine)
// ============================================================================

/**
 * HUNT iteration algorithm - finds root of function
 * This is the VB6 HUNT subroutine used for angle iteration
 */
export function hunt(
  initialGuess: number,
  errorFunc: (x: number) => number,
  tolerance: number = 0.0005,
  maxIterations: number = 15
): { value: number; converged: boolean } {
  let x = initialGuess;
  let xj1 = 0;
  let xj2 = -2;
  let xj3 = xj1;
  let xj4 = -xj2;

  for (let iter = 0; iter < maxIterations; iter++) {
    const er = errorFunc(x);

    if (Math.abs(er) < tolerance) {
      return { value: x, converged: true };
    }

    // Update bounds based on error sign
    if (er > 0) {
      xj1 = x;
      xj3 = er;
    } else {
      xj2 = x;
      xj4 = er;
    }

    // Calculate next guess using linear interpolation
    if (xj3 !== xj4) {
      x = xj1 - xj3 * (xj2 - xj1) / (xj4 - xj3);
    } else {
      x = (xj1 + xj2) / 2;
    }
  }

  return { value: x, converged: false };
}

// ============================================================================
// HP CORRECTION (from VB6)
// ============================================================================

/**
 * Calculate HP correction factor based on atmospheric conditions
 * Matches VB6 HPC calculation
 */
export function calculateHPCorrection(
  barometer: number,
  barometerIsAltimeter: boolean,
  temperature: number,
  humidity: number
): number {
  // Convert altimeter to barometer if needed
  let baroInHg = barometer;
  if (barometerIsAltimeter) {
    // Altimeter in feet to barometer in inHg
    baroInHg = BSTD * Math.pow(1 - 0.0000068756 * barometer, 5.2559);
  }

  // Convert temperature to Rankine
  const tRankine = temperature + 459.67;

  // Calculate saturation vapor pressure (simplified)
  const satVaporPressure = Math.exp(17.67 * (temperature - 32) / (temperature + 395.14));
  const vaporPressure = (humidity / 100) * satVaporPressure * 0.49;

  // Actual pressure
  const pActual = (baroInHg / BSTD) * PSTD - vaporPressure;

  // HP correction factor
  const hpc = Math.sqrt(TSTD / tRankine) * (pActual / PSTD);

  return hpc;
}

// ============================================================================
// G's TO 60FT TIME CONVERSION (from VB6 GSTOT60)
// ============================================================================

/**
 * Convert between max acceleration (g's) and 60ft time
 * @param gFlag 1 = calculate T60 from amax, 0 = calculate amax from T60
 */
export function gsToT60(
  gFlag: number,
  amax: number,
  t60: number,
  isBike: boolean
): { amax: number; t60: number } {
  const k1 = isBike ? 1.782 : 1.732;
  const exp = 0.534;

  if (gFlag === 1) {
    return { amax, t60: k1 / Math.pow(amax, exp) };
  } else {
    return { amax: Math.pow(k1 / t60, 1 / exp), t60 };
  }
}

// ============================================================================
// TOTAL PLATE FORCE (from VB6 TotalLbs function)
// ============================================================================

/**
 * Calculate total plate force at a given RPM
 * Exact port of VB6 TotalLbs function
 */
export function totalLbs(
  staticLbs: number,
  coef1: number,
  retLbs1: number,
  coef2: number,
  retLbs2: number,
  rev: number,
  pdRatio: number
): number {
  // Calculate centrifugal force from arm group 1
  let cLbs1 = coef1 * Math.pow(rev / pdRatio, 2) - retLbs1;
  if (cLbs1 < 0) cLbs1 = 0;

  // Calculate centrifugal force from arm group 2
  let cLbs2 = coef2 * Math.pow(rev / pdRatio, 2) - retLbs2;
  if (cLbs2 < 0) cLbs2 = 0;

  return staticLbs + cLbs1 + cLbs2;
}

// ============================================================================
// CENTRIFUGAL FORCE COEFFICIENT (from VB6 CalcCF subroutine)
// ============================================================================

/**
 * Calculate centrifugal force coefficients for clutch arms
 * Complete port of VB6 CalcCF subroutine with HUNT iteration
 */
export function calcCF(
  armData: (ClutchArmData | null)[],
  arm1Config: ClutchArmConfig,
  arm2Config: ClutchArmConfig,
  airGap: number,
  add1: number = 0,  // Add to numArms1
  add2: number = 0,  // Add to counterweight1
  add3: number = 0,  // Add to ringHeight1
  add4: number = 0,  // Add to armDepth1
  isBike: boolean = false
): CFResult {
  const result: CFResult = { cf1: 0, cf2: 0, retLbf1: 0, retLbf2: 0 };

  const configs = [
    { config: arm1Config, adds: { narm: add1, cwt: add2, rnght: add3, adpth: add4 } },
    { config: arm2Config, adds: { narm: 0, cwt: 0, rnght: 0, adpth: 0 } }
  ];

  for (let j = 0; j < 2; j++) {
    const { config, adds } = configs[j];
    const armTypeIndex = config.armTypeIndex;

    if (armTypeIndex <= 0 || armTypeIndex >= armData.length || !armData[armTypeIndex]) {
      continue;
    }

    const arm = armData[armTypeIndex]!;
    const nArm = config.numArms + adds.narm;
    const mcw = config.counterweightPerArm + adds.cwt;
    const rnght = config.ringHeight + adds.rnght;
    const adpth = config.armDepth + adds.adpth;

    if (nArm <= 0) continue;

    let cf = 0;
    let retLbf = 0;

    // Initial angle from arm data
    let angle = arm.refAngle;
    const drnht = arm.refRingHeight - rnght;

    // Use HUNT iteration to find the angle that gives the desired height
    const hasArmDepth = !isBike && arm.armDepthDiameter > 0;
    const hasBikeReturnSpring = isBike && arm.armDepthDiameter > 0;

    if (hasArmDepth || drnht !== 0 || airGap !== 0) {
      // Need to iterate to find correct angle
      const errorFunc = (testAngle: number): number => {
        const angleRad = testAngle * PI180;
        const cosAngle = Math.cos(angleRad);
        const sinAngle = Math.sin(angleRad);

        if (hasArmDepth) {
          let dPlate = arm.plateDiameter;
          // Check for fixed pivot option
          if (arm.armWeight < 0) {
            dPlate = arm.plateDiameter + 2 * arm.pivotRadius * cosAngle;
          }

          const length = (dPlate - arm.armDepthDiameter) / 2;
          const alr = length / (arm.pivotRadius * cosAngle);
          const ead = arm.refArmDepth + (alr - 1) * drnht;
          const height = length * Math.tan(angleRad) + (ead - adpth) - alr * (drnht + airGap);

          // Error is difference from target height
          return length * Math.tan(angleRad) - height;
        } else {
          const height = arm.pivotRadius * sinAngle - (drnht + airGap);
          return arm.pivotRadius * sinAngle - height;
        }
      };

      const huntResult = hunt(angle, errorFunc, 0.0005, 15);
      if (huntResult.converged) {
        angle = huntResult.value;
      }
    }

    // Calculate CF with the determined angle
    const angleRad = angle * PI180;
    const cosAngle = Math.cos(angleRad);

    let dPlate = arm.plateDiameter;
    const denom = arm.pivotRadius * cosAngle;

    // Check for fixed pivot option (negative arm weight)
    if (arm.armWeight < 0) {
      dPlate = arm.plateDiameter + 2 * denom;
    }

    // Counterweight contribution
    const weightAngleRad = (angle + arm.weightAngle) * PI180;
    const dcw = dPlate - 2 * arm.weightRadius * Math.cos(weightAngleRad);
    const alr = (arm.weightRadius * Math.sin(weightAngleRad)) / denom;
    cf = nArm * mcw * dcw * alr;

    // Arm CG contribution
    const cgAngleRad = (angle + arm.armCGAngle) * PI180;
    const dcg = dPlate - 2 * arm.armCGRadius * Math.cos(cgAngleRad);
    const cglr = (arm.armCGRadius * Math.sin(cgAngleRad)) / denom;
    cf = cf + nArm * Math.abs(arm.armWeight) * dcg * cglr;

    // Check for bike with return springs
    if (hasBikeReturnSpring) {
      const rtslvr = (0.5 * (dPlate - arm.armDepthDiameter) - denom) / denom;
      retLbf = nArm * adpth * rtslvr; // adpth = return spring force for bikes
    }

    // Store results (divide by Z5 to get coefficient)
    if (j === 0) {
      result.cf1 = cf / Z5;
      result.retLbf1 = retLbf;
    } else {
      result.cf2 = cf / Z5;
      result.retLbf2 = retLbf;
    }
  }

  return result;
}

// ============================================================================
// ENGINE CALCULATIONS (from VB6 EngCalc subroutine)
// ============================================================================

/**
 * Calculate engine torque corrections for inertia effects
 * Port of VB6 EngCalc subroutine
 */
export function engineCalc(
  input: ClutchInput,
  hpc: number
): {
  etqLow: number[];
  etqHigh: number[];
  zLow: number;
  zHigh: number;
  peakTorque: number;
  ntq: number;
} {
  const rpm: number[] = [];
  const tq: number[] = [];
  const etq: number[] = [];

  // Load dyno data
  for (let i = 0; i < input.dynoData.length && i < DYNO_ROWS; i++) {
    rpm[i + 1] = input.dynoData[i].rpm;
    tq[i + 1] = input.dynoData[i].torque;
  }

  // Determine weather corrected peak TQ and number of data values
  let ntq = 1;
  etq[1] = input.hpTorqueMultiplier * tq[1] / hpc;
  let ptq = etq[1];

  for (let i = 2; i <= DYNO_ROWS; i++) {
    if (!rpm[i] || rpm[i] === 0) break;
    etq[i] = input.hpTorqueMultiplier * tq[i] / hpc;
    if (etq[i] > ptq) ptq = etq[i];
    ntq = i;
  }

  // Calculate clutch disk PMI
  let cpmoi = 0.6 * input.disk.diskWeight * Math.pow(input.disk.outerDiameter / 2, 2) / 386;

  if (input.isBike) {
    // For bikes, calculate clutch basket PMI instead
    // Using flywheel weight/dia from worksheets (simplified here)
    const bpmoi = 0; // Would need flywheel data
    cpmoi = bpmoi / input.primaryDriveRatio;
  }

  const z = input.enginePMI - cpmoi;

  // Calculate tire circumference in feet
  let tireDiaFt: number;
  if (input.tireDiaIsRollout) {
    tireDiaFt = input.tireDiameter / 12;
  } else {
    tireDiaFt = PI * input.tireDiameter / 12;
  }

  // Calculate "equivalent car" rear gear ratio for bikes
  const rgr = input.gearRatio / (input.highGear * input.primaryDriveRatio);

  // Estimate Low Gear axle and engine NDot
  const tgLo = 0.96;
  const wdotLo = 0.98 * input.maxAcceleration * GRAV * 60 / (tgLo * tireDiaFt);
  const ndotLo = wdotLo * input.primaryDriveRatio * input.lowGear * rgr;

  // Estimate High Gear (at 660 ft)
  const mph = 83 / (input.estimated60ft - 0.5);
  const tgHi = 1 + 0.0003 * mph;
  const wdotHi = 0.33 * input.maxAcceleration * GRAV * 60 / (tgHi * tireDiaFt);
  const ndotHi = wdotHi * input.primaryDriveRatio * input.highGear * rgr;

  // Correct Engine Dyno TQ for Ndots
  const zLoEngine = z * ndotLo / ZPI;
  const zHiEngine = z * ndotHi / ZPI;

  const etqLow: number[] = [];
  const etqHigh: number[] = [];

  for (let i = 1; i <= ntq; i++) {
    etqLow[i] = (etq[i] - zLoEngine) * input.primaryDriveRatio;
    etqHigh[i] = (etq[i] - zHiEngine) * input.primaryDriveRatio;
  }

  // Calculate low gear clutch TQ capacity reduction due to downstream inertia
  const z1 = cpmoi * input.primaryDriveRatio;
  const z2Lo = input.transPMI / input.lowGear;
  const z3Lo = input.tiresPMI / (input.lowGear * rgr);
  const zLow = (z1 + z2Lo + z3Lo) * (ndotLo / input.primaryDriveRatio) / ZPI;

  // Calculate high gear clutch TQ capacity reduction
  const z2Hi = input.transPMI / input.highGear;
  const z3Hi = input.tiresPMI / (input.highGear * rgr);
  const zHigh = (z1 + z2Hi + z3Hi) * (ndotHi / input.primaryDriveRatio) / ZPI;

  // Estimate effect of traction index
  const zLowAdj = zLow * (1 - 0.03 * (input.tractionIndex - 1));
  const zHighAdj = zHigh * (1 - 0.03 * (input.tractionIndex - 1));

  return {
    etqLow,
    etqHigh,
    zLow: zLowAdj,
    zHigh: zHighAdj,
    peakTorque: ptq,
    ntq
  };
}

// ============================================================================
// MAIN CLUTCH CALCULATION (from VB6 ClutchCalc subroutine)
// ============================================================================

/**
 * Perform complete clutch analysis
 * Complete port of VB6 ClutchCalc subroutine
 */
export function clutchCalc(
  input: ClutchInput,
  armData: (ClutchArmData | null)[]
): ClutchResult {
  const warnings: string[] = [];

  // Calculate HP correction factor
  const hpc = calculateHPCorrection(
    input.barometer,
    input.barometerIsAltimeter,
    input.temperature,
    input.humidity
  );

  // Set rounding value for car and bike plate forces
  const iround = input.isBike ? 2 : 5;

  // Calculate CFs for conditions with Zero AirGap
  const cfZero = calcCF(armData, input.arm1, input.arm2, 0, 0, 0, 0, 0, input.isBike);
  const { cf1, cf2, retLbf1, retLbf2 } = cfZero;

  // Get engine calculations
  const engineData = engineCalc(input, hpc);
  const { etqLow, etqHigh, zLow, zHigh, peakTorque, ntq } = engineData;

  // Build RPM array from dyno data
  const rpm: number[] = [0];
  for (let i = 0; i < input.dynoData.length && i < DYNO_ROWS; i++) {
    rpm[i + 1] = input.dynoData[i].rpm;
  }

  // Calculate centrifugal plate forces (CNTF array)
  const cntf: number[] = [0];
  const centrifugalForceData: { rpm: number; force: number }[] = [];
  const clutchGridData: { rpm: number; centrifugal: number; total: number }[] = [];

  for (let k = 1; k <= ntq; k++) {
    cntf[k] = totalLbs(0, cf1, retLbf1, cf2, retLbf2, rpm[k], input.primaryDriveRatio);
    centrifugalForceData.push({ rpm: rpm[k], force: cntf[k] });

    const centrifugal = Math.round(cntf[k] / iround) * iround;
    const total = input.staticPlateForce + centrifugal;
    clutchGridData.push({ rpm: rpm[k], centrifugal, total });
  }

  // Calculate total friction surface area
  const area = 2 * input.disk.numDisks * (input.disk.effectiveArea / 100) *
    PI * (Math.pow(input.disk.outerDiameter, 2) - Math.pow(input.disk.innerDiameter, 2)) / 4;

  // Calculate geometry constant assuming constant pressure
  const geom = ((Math.pow(input.disk.outerDiameter, 3) - Math.pow(input.disk.innerDiameter, 3)) /
    (3 * (Math.pow(input.disk.outerDiameter, 2) - Math.pow(input.disk.innerDiameter, 2))) / 12);

  // Set launch RPM variable
  const launch = Math.abs(input.launchRPM);

  // Calculate Launch conditions with Zero AirGap
  const fzag = totalLbs(input.staticPlateForce, cf1, retLbf1, cf2, retLbf2, launch, input.primaryDriveRatio);
  const psizag = fzag / area;

  // Friction material temperature effect flag
  let tFlag = (!input.isBike && !input.isGlide) ? 0 : 1;

  // Initial CMU ratio
  let cmuRatio = 1;

  // Calculate C1 coefficients
  let c1Hi = 2 * input.disk.numDisks * input.disk.frictionCoefficient * geom *
    Math.pow(input.disk.effectiveArea / 100, 0.2);
  let c1Lo = c1Hi * cmuRatio;
  c1Hi = c1Hi * Math.pow(cmuRatio, 0.1);

  // Combined CF for lockup calculations
  const c2 = (cf1 + cf2) / Math.pow(input.primaryDriveRatio, 2);
  const retLbf = retLbf1 + retLbf2;

  // Calculate Low Gear Lockup RPM
  let rpmLo = findLockupRPM(rpm, etqLow, ntq, c1Lo, c2, input.staticPlateForce, retLbf, zLow);

  // Calculate plate force and PSI at low gear lockup
  let fLo = totalLbs(input.staticPlateForce, cf1, retLbf1, cf2, retLbf2, rpmLo, input.primaryDriveRatio);
  let psiLo = fLo / area;

  // Friction material temperature effect (for cars with pedal clutches only)
  if (input.launchRPM > 0 && tFlag === 0) {
    const k0 = 2 - 0.05 * (input.tractionIndex - 1);
    let z = k0 * launch * psizag - (k0 - 1) * rpmLo * psiLo;
    if (z < 0) z = 0;

    cmuRatio = Math.pow(z / (rpmLo * psiLo), 0.07);
    if (cmuRatio < 0.86) cmuRatio = 0.86;
    if (cmuRatio > 1.02) cmuRatio = 1.02;

    // Recalculate C1 with CMU ratio
    c1Lo = 2 * input.disk.numDisks * input.disk.frictionCoefficient * geom *
      Math.pow(input.disk.effectiveArea / 100, 0.2) * cmuRatio;
    c1Hi = 2 * input.disk.numDisks * input.disk.frictionCoefficient * geom *
      Math.pow(input.disk.effectiveArea / 100, 0.2) * Math.pow(cmuRatio, 0.1);

    // Recalculate low gear lockup
    rpmLo = findLockupRPM(rpm, etqLow, ntq, c1Lo, c2, input.staticPlateForce, retLbf, zLow);
    fLo = totalLbs(input.staticPlateForce, cf1, retLbf1, cf2, retLbf2, rpmLo, input.primaryDriveRatio);
    psiLo = fLo / area;

    tFlag = 1;
  }

  // Calculate High Gear Lockup RPM
  const rpmHi = findLockupRPM(rpm, etqHigh, ntq, c1Hi, c2, input.staticPlateForce, retLbf, zHigh);
  const fHi = totalLbs(input.staticPlateForce, cf1, retLbf1, cf2, retLbf2, rpmHi, input.primaryDriveRatio);
  const psiHi = fHi / area;

  // Calculate CF for Launch conditions with user input AirGap
  const cfAG = calcCF(armData, input.arm1, input.arm2, input.airGap, 0, 0, 0, 0, input.isBike);
  const springForceWithAirGap = input.staticPlateForce +
    input.spring.totalSpringRate * input.airGap * input.spring.threadPitch;
  const fag = totalLbs(springForceWithAirGap, cfAG.cf1, cfAG.retLbf1, cfAG.cf2, cfAG.retLbf2,
    launch, input.primaryDriveRatio);

  // Calculate clutch torque capacity at each RPM
  const clutchTorqueCapacityLow: number[] = [];
  const clutchTorqueCapacityHigh: number[] = [];

  for (let k = 1; k <= ntq; k++) {
    const z = input.staticPlateForce + cntf[k];
    clutchTorqueCapacityLow.push(c1Lo * z);
    clutchTorqueCapacityHigh.push(c1Hi * z);
  }

  // Check for excessive clutch loading
  const psiVel = psiHi * (rpmHi / input.primaryDriveRatio) * PI * input.disk.outerDiameter / 12;

  if (!input.isBike) {
    if (psiHi > 60 || psiVel > 750000) {
      warnings.push('Friction PSI is very high! Consider adding more surface area or changing to a larger diameter clutch.');
    }
  } else {
    if (psiHi > 6 || psiVel > 75000) {
      warnings.push('Friction PSI is very high! Consider adding more surface area or changing to a larger diameter clutch.');
    }

    // Check minimum required static plate force for bikes
    const mrst = Math.round(0.48 * peakTorque * input.primaryDriveRatio / c1Lo / 5) * 5;
    if (input.staticPlateForce < mrst) {
      warnings.push(`Static Plate Force of ${input.staticPlateForce} lbs may be too low! Minimum recommended: ${mrst} lbs.`);
    }
  }

  return {
    hpCorrectionFactor: hpc,
    cf1,
    cf2,
    retLbf1,
    retLbf2,
    centrifugalForceData,
    clutchGridData,
    frictionArea: area,
    geometryConstant: geom,
    c1Low: c1Lo,
    c1High: c1Hi,
    clutchTorqueCapacityLow,
    clutchTorqueCapacityHigh,
    engineTorqueLow: etqLow.slice(1, ntq + 1),
    engineTorqueHigh: etqHigh.slice(1, ntq + 1),
    zLow,
    zHigh,
    lowGearLockupRPM: Math.round(rpmLo / 20) * 20,
    highGearLockupRPM: Math.round(rpmHi / 20) * 20,
    lowGearPlateForce: Math.round(fLo / iround) * iround,
    highGearPlateForce: Math.round(fHi / iround) * iround,
    lowGearFrictionPSI: psiLo,
    highGearFrictionPSI: psiHi,
    launchPlateForceWithAirGap: Math.round(fag / iround) * iround,
    launchPlateForceZeroAirGap: Math.round(fzag / iround) * iround,
    launchFrictionPSI: psizag,
    peakTorque,
    cmuRatio,
    warnings,
    detailsData: null
  };
}

/**
 * Find lockup RPM where clutch torque capacity equals engine torque
 * Port of VB6 lockup calculation logic
 */
function findLockupRPM(
  rpm: number[],
  etq: number[],
  ntq: number,
  c1: number,
  c2: number,
  staticForce: number,
  retLbf: number,
  zCorrection: number
): number {
  let lockupRPM = 1;

  for (let k = 2; k <= ntq; k++) {
    const k1 = k - 1;

    if (!rpm[k] || !rpm[k1] || rpm[k] === rpm[k1]) continue;

    // Linear interpolation coefficients
    const b = (etq[k] - etq[k1]) / (rpm[k] - rpm[k1]);
    const a = etq[k] - rpm[k] * b;

    let r1 = 0;
    let r2 = 0;

    if (c2 * Math.pow(rpm[k1], 2) <= retLbf) {
      // Below return spring threshold
      if (b !== 0) {
        r1 = (c1 * staticForce - zCorrection - a) / b;
      }
    } else {
      // Above return spring threshold - quadratic solution
      const z = 4 * (c1 * c2) * (c1 * (staticForce - retLbf) - zCorrection - a);
      const discriminant = Math.pow(b, 2) - z;
      const sqrtDisc = discriminant > 0 ? Math.sqrt(discriminant) : 0;

      if (c2 !== 0) {
        r1 = (b - sqrtDisc) / (2 * c1 * c2);
        r2 = (b + sqrtDisc) / (2 * c1 * c2);
      }
    }

    // Validate solutions are within RPM range
    if (r1 < rpm[k1] && k > 2) r1 = 0;
    if (r2 < rpm[k1] && k > 2) r2 = 0;
    if (r1 > rpm[k] && k < ntq) r1 = 0;
    if (r2 > rpm[k] && k < ntq) r2 = 0;

    if (r1 > 0) lockupRPM = r1;
    if (r2 > 0) lockupRPM = r2;
  }

  return lockupRPM;
}

// ============================================================================
// DETAILS CALCULATION (from VB6 CalcDetails subroutine)
// ============================================================================

/**
 * Calculate sensitivity analysis ("what-if" changes)
 * Port of VB6 CalcDetails subroutine
 */
export function calcDetails(
  input: ClutchInput,
  armData: (ClutchArmData | null)[],
  baseResult: ClutchResult,
  rpmPoints: number[]
): {
  rpmPoints: number[];
  addArm: number[];
  addCounterweight: number[];
  addRingHeight: number[];
  addArmDepth: number[];
  addAdjusterTurns: number[];
} {
  const { cf1: cf1Base, cf2: cf2Base, retLbf1: retLbf1Base, retLbf2: retLbf2Base } = baseResult;

  const addArm: number[] = [];
  const addCounterweight: number[] = [];
  const addRingHeight: number[] = [];
  const addArmDepth: number[] = [];
  const addAdjusterTurns: number[] = [];

  // Calculate base plate force at each RPM
  for (let i = 0; i < rpmPoints.length; i++) {
    const rpmVal = rpmPoints[i];
    const baseForce = totalLbs(input.staticPlateForce, cf1Base, retLbf1Base, cf2Base, retLbf2Base,
      rpmVal, input.primaryDriveRatio);

    // +1 arm
    const cfAdd1 = calcCF(armData, input.arm1, input.arm2, 0, 1, 0, 0, 0, input.isBike);
    const forceAdd1 = totalLbs(input.staticPlateForce, cfAdd1.cf1, cfAdd1.retLbf1, cfAdd1.cf2, cfAdd1.retLbf2,
      rpmVal, input.primaryDriveRatio);
    addArm.push(Math.round((forceAdd1 - baseForce) * 10) / 10);

    // +1 gram counterweight per arm
    const cfAdd2 = calcCF(armData, input.arm1, input.arm2, 0, 0, 1, 0, 0, input.isBike);
    const forceAdd2 = totalLbs(input.staticPlateForce, cfAdd2.cf1, cfAdd2.retLbf1, cfAdd2.cf2, cfAdd2.retLbf2,
      rpmVal, input.primaryDriveRatio);
    addCounterweight.push(Math.round((forceAdd2 - baseForce) * 10) / 10);

    // +0.010 inch ring height (or +1 lb return spring for bikes)
    const addVal3 = input.isBike ? 1 : 0.01;
    const cfAdd3 = calcCF(armData, input.arm1, input.arm2, 0, 0, 0, addVal3, 0, input.isBike);
    const forceAdd3 = totalLbs(input.staticPlateForce, cfAdd3.cf1, cfAdd3.retLbf1, cfAdd3.cf2, cfAdd3.retLbf2,
      rpmVal, input.primaryDriveRatio);
    addRingHeight.push(Math.round((forceAdd3 - baseForce) * 10) / 10);

    // +0.010 inch arm depth (or +0.020 inch shim for bikes)
    const addVal4 = input.isBike ? 0.02 : 0.01;
    const cfAdd4 = calcCF(armData, input.arm1, input.arm2, 0, 0, 0, 0, addVal4, input.isBike);
    const forceAdd4 = totalLbs(input.staticPlateForce, cfAdd4.cf1, cfAdd4.retLbf1, cfAdd4.cf2, cfAdd4.retLbf2,
      rpmVal, input.primaryDriveRatio);
    addArmDepth.push(Math.round((forceAdd4 - baseForce) * 10) / 10);

    // +0.5 turn adjuster (spring rate effect)
    const springDelta = input.spring.totalSpringRate * 0.5;
    addAdjusterTurns.push(Math.round(springDelta * 10) / 10);
  }

  return {
    rpmPoints,
    addArm,
    addCounterweight,
    addRingHeight,
    addArmDepth,
    addAdjusterTurns
  };
}

// ============================================================================
// STATIC PLATE FORCE CALCULATION
// ============================================================================

/**
 * Calculate static plate force from spring configuration
 */
export function calculateStaticPlateForce(spring: ClutchSpringConfig, isGlide: boolean): number {
  if (isGlide) {
    return spring.totalBasePreload + spring.totalSpringRate * spring.adjusterTurns;
  } else {
    return spring.totalBasePreload +
      spring.totalSpringRate * (spring.adjusterTurns - spring.deltaRingHeight * spring.threadPitch);
  }
}

/**
 * Calculate turns needed for desired static plate force
 */
export function calculateTurnsForStaticForce(
  targetForce: number,
  spring: ClutchSpringConfig,
  isGlide: boolean
): number {
  if (isGlide) {
    return (targetForce - spring.totalBasePreload) / spring.totalSpringRate;
  } else {
    return (targetForce - spring.totalBasePreload) / spring.totalSpringRate +
      spring.deltaRingHeight * spring.threadPitch;
  }
}
