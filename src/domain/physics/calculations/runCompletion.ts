/**
 * Run Completion Calculator
 * Estimates what a run would have been if the driver hadn't braked
 */

export interface IncrementalTimes {
  sixtyFt?: number;
  threeThirtyFt?: number;
  eighthMileET?: number;
  eighthMileMPH?: number;
  thousandFt?: number;
  quarterMileET?: number;
  quarterMileMPH?: number;
}

export interface RunCompletionResult {
  completedET: number;
  completedMPH: number;
  brakePoint: number;        // Estimated distance where braking started
  etLost: number;            // How much ET was lost due to braking
  confidence: 'high' | 'medium' | 'low';
}

/**
 * Standard split time ratios for a typical bracket car
 * These represent typical relationships between incremental times
 */
const SPLIT_RATIOS = {
  // 60ft to 1/8 mile ratio
  sixtyToEighth: 2.15,
  // 330 to 1/8 mile ratio  
  threeThirtyToEighth: 1.38,
  // 1/8 to 1/4 mile ratio
  eighthToQuarter: 1.55,
  // 1000ft to 1/4 mile ratio
  thousandToQuarter: 1.10,
  // 1/8 MPH to 1/4 MPH ratio
  eighthMPHToQuarterMPH: 1.18,
};

/**
 * Calculate completed run from incremental times
 * Uses the last good incremental to project the full pass
 */
export function calculateRunCompletion(
  incrementals: IncrementalTimes,
  actualET?: number,
  _actualMPH?: number,
  raceLength: 'QUARTER' | 'EIGHTH' = 'QUARTER'
): RunCompletionResult | null {
  // Need at least some incremental data
  if (!incrementals.sixtyFt && !incrementals.threeThirtyFt && !incrementals.eighthMileET) {
    return null;
  }

  let completedET: number;
  let completedMPH: number;
  let brakePoint: number;
  let confidence: 'high' | 'medium' | 'low';

  if (raceLength === 'EIGHTH') {
    // For 1/8 mile, use 60ft or 330ft to project
    if (incrementals.threeThirtyFt) {
      completedET = incrementals.threeThirtyFt * SPLIT_RATIOS.threeThirtyToEighth;
      brakePoint = 500; // Braked after 330
      confidence = 'high';
    } else if (incrementals.sixtyFt) {
      completedET = incrementals.sixtyFt * SPLIT_RATIOS.sixtyToEighth;
      brakePoint = 200; // Braked early
      confidence = 'medium';
    } else {
      return null;
    }
    
    // Estimate 1/8 MPH from ET (rough approximation)
    completedMPH = 660 / completedET * 0.68; // Rough conversion
    
  } else {
    // For 1/4 mile
    if (incrementals.thousandFt && incrementals.eighthMileET) {
      // Best case: have 1000ft time
      completedET = incrementals.thousandFt * SPLIT_RATIOS.thousandToQuarter;
      brakePoint = 1100; // Braked after 1000ft
      confidence = 'high';
      
      // Use 1/8 MPH to estimate 1/4 MPH
      if (incrementals.eighthMileMPH) {
        completedMPH = incrementals.eighthMileMPH * SPLIT_RATIOS.eighthMPHToQuarterMPH;
      } else {
        completedMPH = 1320 / completedET * 0.68;
      }
    } else if (incrementals.eighthMileET) {
      // Have 1/8 mile time
      completedET = incrementals.eighthMileET * SPLIT_RATIOS.eighthToQuarter;
      brakePoint = 800; // Braked after 1/8
      confidence = 'high';
      
      if (incrementals.eighthMileMPH) {
        completedMPH = incrementals.eighthMileMPH * SPLIT_RATIOS.eighthMPHToQuarterMPH;
      } else {
        completedMPH = 1320 / completedET * 0.68;
      }
    } else if (incrementals.threeThirtyFt) {
      // Only have 330ft
      const estimatedEighth = incrementals.threeThirtyFt * SPLIT_RATIOS.threeThirtyToEighth;
      completedET = estimatedEighth * SPLIT_RATIOS.eighthToQuarter;
      brakePoint = 500;
      confidence = 'medium';
      completedMPH = 1320 / completedET * 0.68;
    } else if (incrementals.sixtyFt) {
      // Only have 60ft - lowest confidence
      const estimatedEighth = incrementals.sixtyFt * SPLIT_RATIOS.sixtyToEighth;
      completedET = estimatedEighth * SPLIT_RATIOS.eighthToQuarter;
      brakePoint = 200;
      confidence = 'low';
      completedMPH = 1320 / completedET * 0.68;
    } else {
      return null;
    }
  }

  // Calculate ET lost
  const etLost = actualET ? actualET - completedET : 0;

  return {
    completedET: Math.round(completedET * 1000) / 1000,
    completedMPH: Math.round(completedMPH * 100) / 100,
    brakePoint,
    etLost: Math.round(etLost * 1000) / 1000,
    confidence,
  };
}

/**
 * Detect if a run appears to be a brake run based on timing patterns
 */
export function detectBrakeRun(
  incrementals: IncrementalTimes,
  actualET?: number,
  raceLength: 'QUARTER' | 'EIGHTH' = 'QUARTER'
): boolean {
  if (!actualET) return false;

  // Calculate what the ET should be based on incrementals
  const completion = calculateRunCompletion(incrementals, actualET, undefined, raceLength);
  
  if (!completion) return false;
  
  // If actual ET is significantly slower than projected, likely a brake run
  // Threshold: 0.1 seconds slower than projected
  return actualET > completion.completedET + 0.1;
}

/**
 * Calculate split time intervals for analysis
 */
export function calculateSplitIntervals(incrementals: IncrementalTimes): {
  zeroToSixty?: number;
  sixtyToThreeThirty?: number;
  threeThirtyToEighth?: number;
  eighthToThousand?: number;
  thousandToQuarter?: number;
} {
  return {
    zeroToSixty: incrementals.sixtyFt,
    sixtyToThreeThirty: incrementals.threeThirtyFt && incrementals.sixtyFt 
      ? Math.round((incrementals.threeThirtyFt - incrementals.sixtyFt) * 1000) / 1000
      : undefined,
    threeThirtyToEighth: incrementals.eighthMileET && incrementals.threeThirtyFt
      ? Math.round((incrementals.eighthMileET - incrementals.threeThirtyFt) * 1000) / 1000
      : undefined,
    eighthToThousand: incrementals.thousandFt && incrementals.eighthMileET
      ? Math.round((incrementals.thousandFt - incrementals.eighthMileET) * 1000) / 1000
      : undefined,
    thousandToQuarter: incrementals.quarterMileET && incrementals.thousandFt
      ? Math.round((incrementals.quarterMileET - incrementals.thousandFt) * 1000) / 1000
      : undefined,
  };
}
