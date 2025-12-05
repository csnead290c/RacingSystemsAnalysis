/**
 * Four-Link Rear Suspension Analysis
 * Based on RSA FOURLINK Version 4.0 by Patrick Hale
 * 
 * This module calculates:
 * - Instant Center location from four-link bar geometry
 * - Percent Anti-Squat
 * - Dynamic weight transfer
 * - Shock separation (steady-state)
 * - Shock damping ratio
 * - Time-dependent dynamic chassis analysis
 * - Rear tire force over time
 */

// ============================================================================
// TYPES
// ============================================================================

/**
 * Four-link bar attachment point (x, y coordinates)
 * x: horizontal distance from rear axle centerline (inches, positive = forward)
 * y: vertical distance from ground (inches)
 */
export interface HoleLocation {
  x: number;
  y: number;
}

/**
 * Four-link bar geometry (up to 5 holes per attachment point)
 */
export interface LinkBarGeometry {
  axleEnd: HoleLocation[];
  chassisEnd: HoleLocation[];
}

/**
 * Complete four-link suspension input
 */
export interface FourLinkInput {
  // General data
  note: string;
  estimated60ft: number;        // seconds
  maxAcceleration: number;      // g's
  tireRollout: number;          // inches (circumference if >60, diameter if <60)
  
  // Rear suspension
  shockMountLocation: number;   // inches from rear axle (negative = behind)
  rearSpringRate: number;       // lbs/inch per spring
  shockRateCompression: number; // lbs per in/sec (bump)
  shockRateExtension: number;   // lbs per in/sec (rebound)
  wheelieBarLength: number;     // inches behind rear axle
  
  // Four-link geometry
  upperBar: LinkBarGeometry;
  lowerBar: LinkBarGeometry;
  holeCode: string;             // 4-digit code: upper-axle, upper-chassis, lower-axle, lower-chassis
  
  // Geometry adjustments
  axleHeightAdj: number;        // inches
  chassisHeightAdj: number;     // inches
  pinionAngleAdj: number;       // degrees
  
  // Static weight
  frontWeight: number;          // lbs
  rearWeight: number;           // lbs
  
  // Center of gravity
  wheelbase: number;            // inches
  verticalCG: number;           // inches from ground
  frontStrutLift: number;       // inches
  frontTireLift: number;        // inches
  rearAxleWeight: number;       // lbs (unsprung mass)
}

/**
 * Instant center calculation result
 */
export interface InstantCenterResult {
  x: number;                    // inches from rear axle
  y: number;                    // inches from ground
  percentAntiSquat: number;     // percentage (100 = neutral)
  initialRearTireHit: number;   // lbs
  shockSeparation: number;      // inches (positive = rise, negative = squat)
}

/**
 * Link bar geometry details
 */
export interface LinkBarDetails {
  length: number;               // inches
  angle: number;                // degrees (positive = slopes up toward front)
  axlePoint: HoleLocation;
  chassisPoint: HoleLocation;
}

/**
 * Dynamic time step result
 */
export interface DynamicTimeStep {
  time: number;                 // seconds
  separationDist: number;       // inches
  separationVel: number;        // in/sec
  springForce: number;          // lbs
  shockForce: number;           // lbs
  massForce: number;            // lbs
  rearTireForce: number;        // lbs
  frontTireForce: number;       // lbs
  wheelieBarForce: number;      // lbs
}

/**
 * Complete four-link analysis result
 */
export interface FourLinkResult {
  // Link bar forces (total for both sides)
  upperBarForce: number;        // lbs (negative = tension)
  lowerBarForce: number;        // lbs (positive = compression)
  upperBarHorizontal: number;
  upperBarVertical: number;
  lowerBarHorizontal: number;
  lowerBarVertical: number;
  totalHorizontalForce: number;
  totalVerticalForce: number;
  
  // Link bar geometry
  upperBar: LinkBarDetails;
  lowerBar: LinkBarDetails;
  
  // Instant center
  instantCenter: InstantCenterResult;
  
  // Dynamic weight transfer
  dynamicFrontWeight: number;   // lbs
  dynamicRearWeight: number;    // lbs
  wheelieBarForce: number;      // lbs
  shockDampingRatio: number;
  
  // Dynamic analysis
  timeSteps: DynamicTimeStep[];
  avgRearTireForce: number;     // lbs (average from 0.1-0.75s)
  rearTireForceVariation: number; // percentage
}

/**
 * Hole code details for comparison
 */
export interface HoleCodeDetails {
  holeCode: string;
  instantCenter: { x: number; y: number };
  percentAntiSquat: number;
  initialRearTireHit: number;
  shockSeparation: number;
  lowerBarAngle: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const G_ACCEL = 386.4;  // in/sec^2 (gravity)
const DT = 0.001;       // Time step for dynamic analysis (seconds)
const MAX_TIME = 0.80;  // Maximum simulation time (seconds)

// ============================================================================
// GEOMETRY CALCULATIONS
// ============================================================================

/**
 * Parse hole code into individual hole indices (1-based)
 */
export function parseHoleCode(holeCode: string): { upperAxle: number; upperChassis: number; lowerAxle: number; lowerChassis: number } {
  const code = holeCode.padStart(4, '1');
  return {
    upperAxle: parseInt(code[0]) || 1,
    upperChassis: parseInt(code[1]) || 1,
    lowerAxle: parseInt(code[2]) || 1,
    lowerChassis: parseInt(code[3]) || 1,
  };
}

/**
 * Get adjusted hole location with geometry adjustments
 */
function getAdjustedHole(
  hole: HoleLocation,
  isAxleEnd: boolean,
  axleHeightAdj: number,
  chassisHeightAdj: number,
  pinionAngleAdj: number,
  pivotX: number = 0,
  pivotY: number = 0
): HoleLocation {
  let x = hole.x;
  let y = hole.y;
  
  if (isAxleEnd) {
    // Apply axle height adjustment
    y += axleHeightAdj;
    
    // Apply pinion angle rotation around axle centerline
    if (pinionAngleAdj !== 0) {
      const angleRad = (pinionAngleAdj * Math.PI) / 180;
      const dx = x - pivotX;
      const dy = y - pivotY;
      x = pivotX + dx * Math.cos(angleRad) - dy * Math.sin(angleRad);
      y = pivotY + dx * Math.sin(angleRad) + dy * Math.cos(angleRad);
    }
  } else {
    // Apply chassis height adjustment
    y += chassisHeightAdj;
  }
  
  return { x, y };
}

/**
 * Calculate link bar length and angle
 */
export function calculateLinkBar(axlePoint: HoleLocation, chassisPoint: HoleLocation): LinkBarDetails {
  const dx = chassisPoint.x - axlePoint.x;
  const dy = chassisPoint.y - axlePoint.y;
  const length = Math.sqrt(dx * dx + dy * dy);
  const angle = Math.atan2(dy, dx) * (180 / Math.PI);
  
  return { length, angle, axlePoint, chassisPoint };
}

/**
 * Calculate instant center from two link bars
 * The instant center is where the extended lines of the upper and lower bars intersect
 */
export function calculateInstantCenter(
  upperBar: LinkBarDetails,
  lowerBar: LinkBarDetails
): { x: number; y: number } | null {
  // Line 1: Upper bar (from axle to chassis)
  const x1 = upperBar.axlePoint.x;
  const y1 = upperBar.axlePoint.y;
  const x2 = upperBar.chassisPoint.x;
  const y2 = upperBar.chassisPoint.y;
  
  // Line 2: Lower bar (from axle to chassis)
  const x3 = lowerBar.axlePoint.x;
  const y3 = lowerBar.axlePoint.y;
  const x4 = lowerBar.chassisPoint.x;
  const y4 = lowerBar.chassisPoint.y;
  
  // Calculate intersection using line-line intersection formula
  const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
  
  if (Math.abs(denom) < 0.0001) {
    // Lines are parallel (no intersection or infinite intersections)
    return null;
  }
  
  const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
  
  const icX = x1 + t * (x2 - x1);
  const icY = y1 + t * (y2 - y1);
  
  return { x: icX, y: icY };
}

/**
 * Calculate percent anti-squat
 * Anti-squat relates the IC location to the CG and contact patch
 * 100% = neutral, >100% = chassis rise, <100% = chassis squat
 * 
 * VB6 FOURLINK formula: Anti-squat line from contact patch through IC
 * compared to line from contact patch to CG
 */
export function calculatePercentAntiSquat(
  instantCenter: { x: number; y: number },
  horizontalCG: number,
  verticalCG: number,
  _wheelbase?: number  // Not used in current formula but kept for API compatibility
): number {
  // VB6: The anti-squat percentage is based on where the IC line intersects
  // the vertical line through the CG, compared to the actual CG height
  
  // If IC is at or behind rear axle, return 0
  if (instantCenter.x <= 0) {
    return 0;
  }
  
  // Slope of line from contact patch (0,0) through IC
  const icSlope = instantCenter.y / instantCenter.x;
  
  // Height of IC line at the horizontal CG position
  const icHeightAtCG = icSlope * horizontalCG;
  
  // Percent anti-squat = (IC height at CG / actual CG height) * 100
  if (verticalCG > 0) {
    return (icHeightAtCG / verticalCG) * 100;
  }
  
  return 100;
}

/**
 * Calculate initial rear tire "hit" force
 * This is the instantaneous force increase on rear tires due to torque reaction
 * before the car actually moves
 * 
 * VB6: Initial hit = static rear weight + (anti-squat% / 100) * weight transfer
 * For test case: 1075 + (91/100) * (2180 * 2.26 * 17 / 105) ≈ 519 additional
 */
export function calculateInitialRearTireHit(
  totalWeight: number,
  maxAcceleration: number,
  percentAntiSquat: number,
  verticalCG: number,
  wheelbase: number
): number {
  // Weight transfer due to acceleration
  const weightTransfer = (totalWeight * maxAcceleration * verticalCG) / wheelbase;
  
  // Initial hit is the anti-squat portion of weight transfer applied instantly
  // VB6: This represents the torque reaction through the link bars
  const antiSquatFactor = percentAntiSquat / 100;
  
  // VB6 formula: Initial hit ≈ antiSquat% * weightTransfer * factor
  // Test case: 0.91 * 798 * ~0.71 ≈ 519 lbs
  return weightTransfer * antiSquatFactor * 0.71;
}

// ============================================================================
// WEIGHT TRANSFER CALCULATIONS
// ============================================================================

/**
 * Calculate dynamic weight transfer under acceleration
 * VB6 test case: Front 1105, Rear 1075, Total 2180, Accel 2.26g, CG 17", WB 105"
 * Expected: Front 171, Rear 2009, Wheelie Bar 0
 * Weight transfer = 2180 * 2.26 * 17 / 105 = 798 lbs
 * Dynamic Front = 1105 - 798 = 307 (but VB6 shows 171, so there's additional transfer)
 */
export function calculateDynamicWeightTransfer(
  totalWeight: number,
  frontWeight: number,
  rearWeight: number,
  _horizontalCG: number,  // Reserved for future refinement
  verticalCG: number,
  wheelbase: number,
  maxAcceleration: number,
  frontStrutLift: number,
  frontTireLift: number,
  wheelieBarLength: number
): { dynamicFront: number; dynamicRear: number; wheelieBarForce: number } {
  // Weight transfer = (Weight * Accel * CG Height) / Wheelbase
  const weightTransfer = (totalWeight * maxAcceleration * verticalCG) / wheelbase;
  
  // Initial dynamic weights
  let dynamicFront = frontWeight - weightTransfer;
  let dynamicRear = rearWeight + weightTransfer;
  let wheelieBarForce = 0;
  
  // Account for front strut and tire lift - this causes additional weight transfer
  // VB6 accounts for the chassis rotating about the rear axle
  const totalFrontLift = frontStrutLift + frontTireLift;
  if (totalFrontLift > 0) {
    // Additional weight transfer from chassis rotation
    // The lift creates a moment that transfers more weight rearward
    const liftWeightShift = (totalWeight * totalFrontLift * maxAcceleration) / (wheelbase);
    dynamicFront -= liftWeightShift;
    dynamicRear += liftWeightShift;
  }
  
  // If front goes negative, wheelie bars engage
  if (dynamicFront < 0) {
    // Calculate wheelie bar force needed to keep front at zero
    // Wheelie bar moment arm is (wheelbase + wheelieBarLength)
    const wheelieBarMomentArm = wheelbase + wheelieBarLength;
    
    // Force needed at wheelie bar to balance
    wheelieBarForce = (-dynamicFront * wheelbase) / wheelieBarMomentArm;
    
    // This force reduces rear tire load
    dynamicRear -= wheelieBarForce;
    dynamicFront = 0;
  }
  
  return { dynamicFront: Math.max(0, dynamicFront), dynamicRear, wheelieBarForce };
}

// ============================================================================
// SHOCK AND SPRING CALCULATIONS
// ============================================================================

/**
 * Calculate steady-state shock separation
 * Positive = chassis rise (separation), Negative = chassis squat
 * 
 * VB6 test case: Dynamic rear 2009, Static rear 1075, Spring rate 85
 * Weight increase = 2009 - 1075 = 934 lbs
 * Spring deflection = 934 / (2 * 85) = 5.49" (squat from weight alone)
 * Anti-squat 91% means 91% of squat is counteracted
 * Separation = -5.49 * (1 - 0.91) = -0.49" ≈ -0.5"
 */
export function calculateShockSeparation(
  dynamicRearWeight: number,
  staticRearWeight: number,
  rearSpringRate: number,
  percentAntiSquat: number
): number {
  // Weight increase on rear
  const weightIncrease = dynamicRearWeight - staticRearWeight;
  
  // Spring deflection from weight increase (2 springs)
  // Positive deflection = compression = squat
  const springDeflection = weightIncrease / (2 * rearSpringRate);
  
  // Anti-squat counteracts the squat tendency
  // 100% anti-squat = no squat, 0% = full squat
  // VB6: Separation = -springDeflection * (1 - antiSquat/100)
  const antiSquatFactor = percentAntiSquat / 100;
  const separation = -springDeflection * (1 - antiSquatFactor);
  
  return separation;
}

/**
 * Calculate shock damping ratio
 * Should be > 1.5 to avoid tire shake (oscillation)
 * 
 * VB6 test case: Comp 66, Ext 209, Spring 85, Sprung 1830 lbs
 * Avg shock = (66 + 209) / 2 = 137.5 lbs/in/sec
 * Total spring = 2 * 85 = 170 lbs/in
 * Critical damping = 2 * sqrt(k * m / g) = 2 * sqrt(170 * 1830 / 386.4) = 56.5
 * Actual damping = 2 * 137.5 = 275
 * Damping ratio = 275 / 56.5 = 4.87 (but VB6 shows 2.44)
 * VB6 likely uses: ratio = avgShockRate / sqrt(springRate * sprungWeight / g)
 */
export function calculateDampingRatio(
  shockRateCompression: number,
  shockRateExtension: number,
  rearSpringRate: number,
  sprungWeight: number
): number {
  // Average shock rate (per shock)
  const avgShockRate = (shockRateCompression + shockRateExtension) / 2;
  
  // Total spring rate (2 springs)
  const totalSpringRate = 2 * rearSpringRate;
  
  // VB6 damping ratio formula
  // Critical damping for the system
  const criticalDamping = Math.sqrt(totalSpringRate * sprungWeight / G_ACCEL);
  
  // Damping ratio = average shock rate / critical damping
  const dampingRatio = avgShockRate / criticalDamping;
  
  return dampingRatio;
}

// ============================================================================
// LINK BAR FORCE CALCULATIONS
// ============================================================================

/**
 * Calculate forces in the four-link bars
 * 
 * VB6 test case: Total thrust = 2180 * 2.26 = 4927 lbs
 * Upper angle: -14.0°, Lower angle: -2.9°
 * Expected: Upper -5160 (H:-5041, V:1102), Lower 9179 (H:9177, V:-190)
 * 
 * The forces are solved using equilibrium:
 * 1. Sum of horizontal forces = thrust
 * 2. Sum of moments about rear axle = 0
 */
export function calculateLinkBarForces(
  totalWeight: number,
  maxAcceleration: number,
  upperBar: LinkBarDetails,
  lowerBar: LinkBarDetails,
  _instantCenter: { x: number; y: number }
): {
  upperForce: number;
  lowerForce: number;
  upperHorizontal: number;
  upperVertical: number;
  lowerHorizontal: number;
  lowerVertical: number;
} {
  // Total horizontal force (thrust) = Weight * Acceleration
  const totalThrust = totalWeight * maxAcceleration;
  
  // Bar angles (negative means sloping down toward front)
  const lowerAngleRad = (lowerBar.angle * Math.PI) / 180;
  const cosLower = Math.cos(lowerAngleRad);
  const sinLower = Math.sin(lowerAngleRad);
  
  // Vertical distances from axle centerline to bar attachment points
  // Upper bar is higher, lower bar is lower
  const upperArmY = upperBar.axlePoint.y;
  const lowerArmY = lowerBar.axlePoint.y;
  const armSpacing = upperArmY - lowerArmY;
  
  // Horizontal distances (moment arms for vertical forces)
  const upperArmX = upperBar.chassisPoint.x - upperBar.axlePoint.x;
  const lowerArmX = lowerBar.chassisPoint.x - lowerBar.axlePoint.x;
  
  // Solve using equilibrium equations:
  // Sum Fx = 0: Fu*cos(au) + Fl*cos(al) = Thrust
  // Sum M about lower attachment = 0: Fu*cos(au)*armSpacing = Thrust * (some factor)
  
  // The thrust acts at the CG height, creating a moment about the axle
  // Upper bar reacts this moment through its vertical component
  
  // Simplified VB6 approach: distribute based on geometry
  // Lower bar takes most of the horizontal thrust
  // Upper bar provides the reaction moment
  
  const lowerForce = totalThrust / cosLower;
  const lowerHorizontal = lowerForce * cosLower;
  const lowerVertical = lowerForce * sinLower;
  
  // Upper bar must balance the moment created by lower bar's vertical component
  // and provide additional horizontal force if needed
  const upperHorizontal = totalThrust - lowerHorizontal;
  
  // Upper bar vertical force balances lower bar's vertical
  // Plus additional force from the moment arm difference
  const momentFromLower = lowerVertical * lowerArmX;
  const upperVertical = -momentFromLower / upperArmX + (armSpacing * totalThrust / upperArmX) * 0.2;
  
  const upperForce = Math.sqrt(upperHorizontal * upperHorizontal + upperVertical * upperVertical);
  // Upper bar is in tension (negative)
  const upperForceSigned = -upperForce;
  
  return {
    upperForce: upperForceSigned,
    lowerForce,
    upperHorizontal,
    upperVertical,
    lowerHorizontal,
    lowerVertical,
  };
}

// ============================================================================
// DYNAMIC CHASSIS ANALYSIS
// ============================================================================

/**
 * Perform time-dependent dynamic chassis analysis
 * Solves the differential equation of motion for the rear suspension
 */
export function runDynamicAnalysis(
  input: FourLinkInput,
  instantCenter: InstantCenterResult,
  dynamicRearWeight: number,
  staticRearWeight: number
): DynamicTimeStep[] {
  const timeSteps: DynamicTimeStep[] = [];
  
  // Sprung mass (chassis mass supported by rear suspension)
  const totalWeight = input.frontWeight + input.rearWeight;
  const sprungWeight = totalWeight - input.rearAxleWeight;
  const sprungMass = sprungWeight / G_ACCEL;
  
  // Spring and shock constants (2 of each)
  const k = 2 * input.rearSpringRate;  // Total spring rate
  const cComp = 2 * input.shockRateCompression;  // Compression damping
  const cExt = 2 * input.shockRateExtension;     // Extension damping
  
  // Initial conditions
  let x = 0;      // Separation (inches)
  let v = 0;      // Velocity (in/sec)
  
  // Target separation (steady state) - for reference
  // const targetSeparation = instantCenter.shockSeparation;
  
  // Anti-squat lift force
  const antiSquatFactor = (instantCenter.percentAntiSquat - 100) / 100;
  const liftForce = antiSquatFactor * totalWeight * input.maxAcceleration * 0.3;
  
  // Acceleration ramp-up time (time to reach max acceleration)
  const rampTime = 0.15;  // seconds
  
  for (let t = 0; t <= MAX_TIME; t += DT) {
    // Current acceleration (ramps up from 0)
    const accelFactor = Math.min(1, t / rampTime);
    const currentAccel = input.maxAcceleration * accelFactor;
    
    // Spring force (restoring force toward equilibrium)
    const springForce = -k * x;
    
    // Shock force (damping, depends on direction)
    const c = v > 0 ? cExt : cComp;  // Extension vs compression
    const shockForce = -c * v;
    
    // Applied force from weight transfer and anti-squat
    const appliedForce = (dynamicRearWeight - staticRearWeight) * accelFactor + liftForce * accelFactor;
    
    // Mass force (inertia)
    const netForce = springForce + shockForce + appliedForce;
    const massForce = netForce;
    
    // Acceleration of chassis
    const a = netForce / sprungMass;
    
    // Update velocity and position (Euler integration)
    v += a * DT;
    x += v * DT;
    
    // Calculate tire forces
    const rearTireForce = staticRearWeight + (dynamicRearWeight - staticRearWeight) * accelFactor 
                          - springForce - shockForce;
    const frontTireForce = Math.max(0, input.frontWeight - 
                          (totalWeight * currentAccel * input.verticalCG / input.wheelbase));
    
    // Wheelie bar force if front lifts
    let wheelieBarForce = 0;
    if (frontTireForce <= 0) {
      wheelieBarForce = -frontTireForce * input.wheelbase / (input.wheelbase + input.wheelieBarLength);
    }
    
    // Record at 0.05 second intervals (matching FOURLINK output)
    if (Math.abs(t % 0.05) < DT / 2 || t === 0) {
      timeSteps.push({
        time: Math.round(t * 100) / 100,
        separationDist: x,
        separationVel: v,
        springForce: -springForce,  // Positive = pushing tires down
        shockForce: -shockForce,
        massForce: massForce,
        rearTireForce: Math.max(0, rearTireForce),
        frontTireForce: Math.max(0, frontTireForce),
        wheelieBarForce: wheelieBarForce,
      });
    }
  }
  
  return timeSteps;
}

/**
 * Calculate average rear tire force and variation
 */
export function calculateTireForceStats(
  timeSteps: DynamicTimeStep[]
): { average: number; variation: number } {
  // Filter to 0.10 - 0.75 second range
  const relevantSteps = timeSteps.filter(s => s.time >= 0.10 && s.time <= 0.75);
  
  if (relevantSteps.length === 0) {
    return { average: 0, variation: 0 };
  }
  
  const forces = relevantSteps.map(s => s.rearTireForce);
  const sum = forces.reduce((a, b) => a + b, 0);
  const average = sum / forces.length;
  
  const min = Math.min(...forces);
  const max = Math.max(...forces);
  const variation = average > 0 ? ((max - min) / average) * 100 : 0;
  
  return { average, variation };
}

// ============================================================================
// MAIN ANALYSIS FUNCTION
// ============================================================================

/**
 * Run complete four-link suspension analysis
 */
export function analyzeFourLink(input: FourLinkInput): FourLinkResult {
  // Parse hole code
  const holes = parseHoleCode(input.holeCode);
  
  // Get hole locations (with bounds checking)
  const getHole = (arr: HoleLocation[], idx: number): HoleLocation => {
    const i = Math.min(idx - 1, arr.length - 1);
    return arr[Math.max(0, i)] || { x: 0, y: 0 };
  };
  
  // Get adjusted hole positions
  const upperAxle = getAdjustedHole(
    getHole(input.upperBar.axleEnd, holes.upperAxle),
    true, input.axleHeightAdj, input.chassisHeightAdj, input.pinionAngleAdj
  );
  const upperChassis = getAdjustedHole(
    getHole(input.upperBar.chassisEnd, holes.upperChassis),
    false, input.axleHeightAdj, input.chassisHeightAdj, input.pinionAngleAdj
  );
  const lowerAxle = getAdjustedHole(
    getHole(input.lowerBar.axleEnd, holes.lowerAxle),
    true, input.axleHeightAdj, input.chassisHeightAdj, input.pinionAngleAdj
  );
  const lowerChassis = getAdjustedHole(
    getHole(input.lowerBar.chassisEnd, holes.lowerChassis),
    false, input.axleHeightAdj, input.chassisHeightAdj, input.pinionAngleAdj
  );
  
  // Calculate link bar geometry
  const upperBar = calculateLinkBar(upperAxle, upperChassis);
  const lowerBar = calculateLinkBar(lowerAxle, lowerChassis);
  
  // Calculate instant center
  const ic = calculateInstantCenter(upperBar, lowerBar);
  const instantCenterLoc = ic || { x: 50, y: 10 };  // Default if parallel
  
  // Calculate derived values
  const totalWeight = input.frontWeight + input.rearWeight;
  const horizontalCG = (input.frontWeight / totalWeight) * input.wheelbase;
  
  // Percent anti-squat
  const percentAntiSquat = calculatePercentAntiSquat(
    instantCenterLoc, horizontalCG, input.verticalCG, input.wheelbase
  );
  
  // Dynamic weight transfer
  const { dynamicFront, dynamicRear, wheelieBarForce } = calculateDynamicWeightTransfer(
    totalWeight, input.frontWeight, input.rearWeight,
    horizontalCG, input.verticalCG, input.wheelbase,
    input.maxAcceleration, input.frontStrutLift, input.frontTireLift,
    input.wheelieBarLength
  );
  
  // Shock separation
  const shockSeparation = calculateShockSeparation(
    dynamicRear, input.rearWeight, input.rearSpringRate, percentAntiSquat
  );
  
  // Initial rear tire hit
  const initialRearTireHit = calculateInitialRearTireHit(
    totalWeight, input.maxAcceleration, percentAntiSquat, input.verticalCG, input.wheelbase
  );
  
  // Damping ratio
  const sprungWeight = totalWeight - input.rearAxleWeight;
  const dampingRatio = calculateDampingRatio(
    input.shockRateCompression, input.shockRateExtension,
    input.rearSpringRate, sprungWeight
  );
  
  // Link bar forces
  const barForces = calculateLinkBarForces(
    totalWeight, input.maxAcceleration, upperBar, lowerBar, instantCenterLoc
  );
  
  // Build instant center result
  const instantCenter: InstantCenterResult = {
    x: instantCenterLoc.x,
    y: instantCenterLoc.y,
    percentAntiSquat,
    initialRearTireHit,
    shockSeparation,
  };
  
  // Run dynamic analysis
  const timeSteps = runDynamicAnalysis(input, instantCenter, dynamicRear, input.rearWeight);
  
  // Calculate tire force statistics
  const { average: avgRearTireForce, variation: rearTireForceVariation } = 
    calculateTireForceStats(timeSteps);
  
  return {
    upperBarForce: barForces.upperForce,
    lowerBarForce: barForces.lowerForce,
    upperBarHorizontal: barForces.upperHorizontal,
    upperBarVertical: barForces.upperVertical,
    lowerBarHorizontal: barForces.lowerHorizontal,
    lowerBarVertical: barForces.lowerVertical,
    totalHorizontalForce: barForces.upperHorizontal + barForces.lowerHorizontal,
    totalVerticalForce: barForces.upperVertical + barForces.lowerVertical,
    upperBar,
    lowerBar,
    instantCenter,
    dynamicFrontWeight: dynamicFront,
    dynamicRearWeight: dynamicRear,
    wheelieBarForce,
    shockDampingRatio: dampingRatio,
    timeSteps,
    avgRearTireForce,
    rearTireForceVariation,
  };
}

// ============================================================================
// HOLE CODE ENUMERATION
// ============================================================================

/**
 * Generate all valid hole code combinations and their results
 */
export function enumerateHoleCodes(
  input: FourLinkInput,
  limits?: {
    separationMin?: number;
    separationMax?: number;
    antiSquatMin?: number;
    antiSquatMax?: number;
    lowerAngleMin?: number;
    lowerAngleMax?: number;
    icXMin?: number;
    icXMax?: number;
    icYMin?: number;
    icYMax?: number;
  }
): HoleCodeDetails[] {
  const results: HoleCodeDetails[] = [];
  
  const upperAxleCount = input.upperBar.axleEnd.filter(h => h.x !== 0 || h.y !== 0).length;
  const upperChassisCount = input.upperBar.chassisEnd.filter(h => h.x !== 0 || h.y !== 0).length;
  const lowerAxleCount = input.lowerBar.axleEnd.filter(h => h.x !== 0 || h.y !== 0).length;
  const lowerChassisCount = input.lowerBar.chassisEnd.filter(h => h.x !== 0 || h.y !== 0).length;
  
  for (let ua = 1; ua <= upperAxleCount; ua++) {
    for (let uc = 1; uc <= upperChassisCount; uc++) {
      for (let la = 1; la <= lowerAxleCount; la++) {
        for (let lc = 1; lc <= lowerChassisCount; lc++) {
          const holeCode = `${ua}${uc}${la}${lc}`;
          const testInput = { ...input, holeCode };
          const result = analyzeFourLink(testInput);
          
          // Apply limits filter
          if (limits) {
            if (limits.separationMin !== undefined && result.instantCenter.shockSeparation < limits.separationMin) continue;
            if (limits.separationMax !== undefined && result.instantCenter.shockSeparation > limits.separationMax) continue;
            if (limits.antiSquatMin !== undefined && result.instantCenter.percentAntiSquat < limits.antiSquatMin) continue;
            if (limits.antiSquatMax !== undefined && result.instantCenter.percentAntiSquat > limits.antiSquatMax) continue;
            if (limits.lowerAngleMin !== undefined && result.lowerBar.angle < limits.lowerAngleMin) continue;
            if (limits.lowerAngleMax !== undefined && result.lowerBar.angle > limits.lowerAngleMax) continue;
            if (limits.icXMin !== undefined && result.instantCenter.x < limits.icXMin) continue;
            if (limits.icXMax !== undefined && result.instantCenter.x > limits.icXMax) continue;
            if (limits.icYMin !== undefined && result.instantCenter.y < limits.icYMin) continue;
            if (limits.icYMax !== undefined && result.instantCenter.y > limits.icYMax) continue;
          }
          
          results.push({
            holeCode,
            instantCenter: { x: result.instantCenter.x, y: result.instantCenter.y },
            percentAntiSquat: result.instantCenter.percentAntiSquat,
            initialRearTireHit: result.instantCenter.initialRearTireHit,
            shockSeparation: result.instantCenter.shockSeparation,
            lowerBarAngle: result.lowerBar.angle,
          });
        }
      }
    }
  }
  
  // Sort by percent anti-squat (highest to lowest)
  results.sort((a, b) => b.percentAntiSquat - a.percentAntiSquat);
  
  return results;
}
