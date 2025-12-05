/**
 * Converter Slip Calculator - VB6 Port
 * Ported from VB6 ConvSlip source code (Module1.bas)
 * 
 * Calculates torque converter slip percentage based on:
 * - Tire diameter and growth at speed
 * - Gear ratio
 * - Engine RPM at trap speed
 * - Actual trap speed (MPH)
 */

export const PI = 3.141593;

// ============================================================================
// INTERFACES
// ============================================================================

export interface ConverterSlipInput {
  /** Tire diameter in inches */
  tireDiameter: number;
  /** Rear gear ratio */
  gearRatio: number;
  /** Engine RPM at trap speed */
  rpm: number;
  /** Actual trap speed in MPH */
  mph: number;
}

export interface ConverterSlipResult {
  /** Converter slip percentage (positive = slip, negative = lockup overdrive) */
  converterSlip: number;
  /** Ideal MPH with no slip */
  idealMph: number;
  /** Estimated tire circumference at speed (feet) */
  tireCircumference: number;
  /** Tire growth factor */
  tireGrowth: number;
}

// ============================================================================
// TIRE GROWTH CALCULATION
// ============================================================================

/**
 * Calculate tire circumference with growth at speed
 * Port of VB6 Tire subroutine
 */
function calculateTireCircumference(
  tireDiameter: number,
  mph: number
): { circumference: number; growth: number } {
  // Estimate tire width from diameter (typical slick proportions)
  const tireWidth = 0.33 * tireDiameter;
  
  // Tire growth multiplier based on tire dimensions
  const tireGrowthM = (Math.pow(tireWidth, 1.4) + tireDiameter - 16) / 
                      (0.171 * Math.pow(tireDiameter, 1.7));
  
  // Convert MPH to feet per second
  const vFps = mph * (5280 / 3600);
  
  // Calculate tire growth factor (non-linear at high speed)
  let tireGrowth = 1 + tireGrowthM * 0.0000135 * Math.pow(vFps, 1.6);
  
  // Linear growth model for comparison
  const tireGrowthLinear = 1 + tireGrowthM * 0.000325 * vFps;
  
  // Use the smaller growth factor (linear takes over at very high speeds)
  if (tireGrowthLinear < tireGrowth) {
    tireGrowth = tireGrowthLinear;
  }
  
  // Acceleration effect on tire squish (a0 = 0.25g typical at trap)
  const a0 = 0.25;
  const tsq = tireGrowth - 0.035 * Math.abs(a0);
  
  // Calculate tire circumference in feet
  const tireCirc = tsq * tireDiameter * PI / 12;
  
  return {
    circumference: tireCirc,
    growth: tireGrowth,
  };
}

// ============================================================================
// MAIN CALCULATION
// ============================================================================

/**
 * Calculate converter slip percentage
 * Complete port of VB6 CalcConvSlip subroutine
 */
export function calculateConverterSlip(input: ConverterSlipInput): ConverterSlipResult {
  // Get tire circumference at speed
  const tire = calculateTireCircumference(input.tireDiameter, input.mph);
  
  // Calculate ideal MPH with no tire slip or converter slip
  // MPH = (RPM / GearRatio) * TireCirc * (60 min/hr / 5280 ft/mile)
  let idealMph = (input.rpm / input.gearRatio) * tire.circumference * (60 / 5280);
  
  // Include 0.5% tire slip (tires always slip a little)
  idealMph = idealMph / 1.005;
  
  // Actual top speed is typically 0.6% higher than timeslip MPH
  // (due to timing trap location vs actual peak speed)
  const actualMph = 1.006 * input.mph;
  
  // Calculate converter slip percentage
  // Positive = converter slipping (engine spinning faster than it should)
  // Negative = converter locked up tight or overdrive effect
  const convSlip = 100 * (idealMph / actualMph - 1);
  
  // Round to 0.1%
  const roundedSlip = Math.round(convSlip * 10) / 10;
  
  return {
    converterSlip: roundedSlip,
    idealMph: Math.round(idealMph * 10) / 10,
    tireCircumference: Math.round(tire.circumference * 100) / 100,
    tireGrowth: Math.round(tire.growth * 1000) / 1000,
  };
}

/**
 * Default converter slip input
 */
export const defaultConverterSlipInput: ConverterSlipInput = {
  tireDiameter: 33,
  gearRatio: 4.10,
  rpm: 6800,
  mph: 150,
};
