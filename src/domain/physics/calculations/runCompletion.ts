/**
 * Run Completion Calculator
 * 
 * Estimates what a run would have been if the driver hadn't braked.
 * 
 * APPROACH: Uses the VB6 exact physics model to match simulated incrementals
 * to actual run incrementals. This ensures consistency with run prediction.
 * 
 * Algorithm:
 * 1. If we have a simulation result (predicted timeslip), compare predicted
 *    incrementals to actual incrementals
 * 2. Find the best "fit factor" - how much faster/slower the actual run is
 *    vs predicted, using the most reliable early incremental
 * 3. Apply that factor to the predicted full-pass ET to estimate completion
 * 
 * Fallback: If no simulation data available, use empirical split ratios.
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

/**
 * Predicted timeslip from VB6 simulation
 * Standard VB6 checkpoints: 60ft, 330ft, 660ft (1/8), 1000ft, 1320ft (1/4)
 */
export interface PredictedTimeslip {
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
  brakePoint: number;        // Estimated distance where braking started (ft)
  etLost: number;            // How much ET was lost due to braking (positive = slower)
  confidence: 'high' | 'medium' | 'low';
  method: 'simulation' | 'ratio';  // Which method was used
  fitFactor?: number;        // Ratio of actual to predicted (e.g., 0.98 = 2% faster)
  matchedIncremental?: string; // Which incremental was matched
}

/**
 * Standard split time ratios for fallback (typical bracket car)
 * Used only when no simulation data is available
 */
const SPLIT_RATIOS = {
  sixtyToEighth: 2.15,
  threeThirtyToEighth: 1.38,
  eighthToQuarter: 1.55,
  thousandToQuarter: 1.10,
  eighthMPHToQuarterMPH: 1.18,
};

/**
 * Calculate completed run using VB6 physics model matching
 * 
 * @param incrementals - Actual run incremental times
 * @param predictedTimeslip - Predicted timeslip from VB6 simulation (optional)
 * @param actualET - Actual (brake) ET if available
 * @param actualMPH - Actual (brake) MPH if available  
 * @param raceLength - Race distance
 * @returns Estimated full-pass result
 */
export function calculateRunCompletion(
  incrementals: IncrementalTimes,
  actualET?: number,
  _actualMPH?: number,
  raceLength: 'QUARTER' | 'EIGHTH' = 'QUARTER',
  predictedTimeslip?: PredictedTimeslip
): RunCompletionResult | null {
  // Need at least some incremental data
  if (!incrementals.sixtyFt && !incrementals.threeThirtyFt && !incrementals.eighthMileET) {
    return null;
  }

  // If we have simulation data, use the matching approach
  if (predictedTimeslip) {
    const result = calculateWithSimulationMatching(
      incrementals, 
      predictedTimeslip, 
      actualET, 
      raceLength
    );
    if (result) return result;
  }

  // Fallback to ratio-based estimation
  return calculateWithRatios(incrementals, actualET, raceLength);
}

/**
 * Calculate run completion by matching actual incrementals to simulated incrementals
 * This is the preferred method - uses the exact same physics model as prediction
 */
function calculateWithSimulationMatching(
  actual: IncrementalTimes,
  predicted: PredictedTimeslip,
  actualET: number | undefined,
  raceLength: 'QUARTER' | 'EIGHTH'
): RunCompletionResult | null {
  // Find the best match point - use the latest available incremental for highest accuracy
  // Priority: 1000ft > 1/8 mile > 330ft > 60ft
  
  let fitFactor: number;
  let matchedIncremental: string;
  let brakePoint: number;
  let confidence: 'high' | 'medium' | 'low';
  
  if (raceLength === 'QUARTER') {
    // Quarter mile run
    if (actual.thousandFt && predicted.thousandFt && predicted.thousandFt > 0) {
      fitFactor = actual.thousandFt / predicted.thousandFt;
      matchedIncremental = '1000ft';
      brakePoint = 1100;
      confidence = 'high';
    } else if (actual.eighthMileET && predicted.eighthMileET && predicted.eighthMileET > 0) {
      fitFactor = actual.eighthMileET / predicted.eighthMileET;
      matchedIncremental = '1/8 mile';
      brakePoint = 800;
      confidence = 'high';
    } else if (actual.threeThirtyFt && predicted.threeThirtyFt && predicted.threeThirtyFt > 0) {
      fitFactor = actual.threeThirtyFt / predicted.threeThirtyFt;
      matchedIncremental = '330ft';
      brakePoint = 500;
      confidence = 'medium';
    } else if (actual.sixtyFt && predicted.sixtyFt && predicted.sixtyFt > 0) {
      fitFactor = actual.sixtyFt / predicted.sixtyFt;
      matchedIncremental = '60ft';
      brakePoint = 200;
      confidence = 'low';
    } else {
      return null; // No matching data
    }
    
    // Apply fit factor to predicted quarter mile
    if (!predicted.quarterMileET || predicted.quarterMileET <= 0) return null;
    
    const completedET = predicted.quarterMileET * fitFactor;
    const completedMPH = predicted.quarterMileMPH 
      ? predicted.quarterMileMPH / Math.pow(fitFactor, 0.3) // MPH scales inversely with time
      : estimateMPHFromET(completedET, 1320);
    
    return {
      completedET: Math.round(completedET * 1000) / 1000,
      completedMPH: Math.round(completedMPH * 100) / 100,
      brakePoint,
      etLost: actualET ? Math.round((actualET - completedET) * 1000) / 1000 : 0,
      confidence,
      method: 'simulation',
      fitFactor: Math.round(fitFactor * 10000) / 10000,
      matchedIncremental,
    };
    
  } else {
    // Eighth mile run
    if (actual.threeThirtyFt && predicted.threeThirtyFt && predicted.threeThirtyFt > 0) {
      fitFactor = actual.threeThirtyFt / predicted.threeThirtyFt;
      matchedIncremental = '330ft';
      brakePoint = 500;
      confidence = 'high';
    } else if (actual.sixtyFt && predicted.sixtyFt && predicted.sixtyFt > 0) {
      fitFactor = actual.sixtyFt / predicted.sixtyFt;
      matchedIncremental = '60ft';
      brakePoint = 200;
      confidence = 'medium';
    } else {
      return null;
    }
    
    if (!predicted.eighthMileET || predicted.eighthMileET <= 0) return null;
    
    const completedET = predicted.eighthMileET * fitFactor;
    const completedMPH = predicted.eighthMileMPH 
      ? predicted.eighthMileMPH / Math.pow(fitFactor, 0.3)
      : estimateMPHFromET(completedET, 660);
    
    return {
      completedET: Math.round(completedET * 1000) / 1000,
      completedMPH: Math.round(completedMPH * 100) / 100,
      brakePoint,
      etLost: actualET ? Math.round((actualET - completedET) * 1000) / 1000 : 0,
      confidence,
      method: 'simulation',
      fitFactor: Math.round(fitFactor * 10000) / 10000,
      matchedIncremental,
    };
  }
}

/**
 * Fallback: Calculate run completion using empirical split ratios
 * Used when no simulation data is available
 */
function calculateWithRatios(
  incrementals: IncrementalTimes,
  actualET: number | undefined,
  raceLength: 'QUARTER' | 'EIGHTH'
): RunCompletionResult | null {
  let completedET: number;
  let completedMPH: number;
  let brakePoint: number;
  let confidence: 'high' | 'medium' | 'low';

  if (raceLength === 'EIGHTH') {
    if (incrementals.threeThirtyFt) {
      completedET = incrementals.threeThirtyFt * SPLIT_RATIOS.threeThirtyToEighth;
      brakePoint = 500;
      confidence = 'high';
    } else if (incrementals.sixtyFt) {
      completedET = incrementals.sixtyFt * SPLIT_RATIOS.sixtyToEighth;
      brakePoint = 200;
      confidence = 'medium';
    } else {
      return null;
    }
    completedMPH = estimateMPHFromET(completedET, 660);
    
  } else {
    if (incrementals.thousandFt && incrementals.eighthMileET) {
      completedET = incrementals.thousandFt * SPLIT_RATIOS.thousandToQuarter;
      brakePoint = 1100;
      confidence = 'high';
      completedMPH = incrementals.eighthMileMPH 
        ? incrementals.eighthMileMPH * SPLIT_RATIOS.eighthMPHToQuarterMPH
        : estimateMPHFromET(completedET, 1320);
    } else if (incrementals.eighthMileET) {
      completedET = incrementals.eighthMileET * SPLIT_RATIOS.eighthToQuarter;
      brakePoint = 800;
      confidence = 'high';
      completedMPH = incrementals.eighthMileMPH 
        ? incrementals.eighthMileMPH * SPLIT_RATIOS.eighthMPHToQuarterMPH
        : estimateMPHFromET(completedET, 1320);
    } else if (incrementals.threeThirtyFt) {
      const estimatedEighth = incrementals.threeThirtyFt * SPLIT_RATIOS.threeThirtyToEighth;
      completedET = estimatedEighth * SPLIT_RATIOS.eighthToQuarter;
      brakePoint = 500;
      confidence = 'medium';
      completedMPH = estimateMPHFromET(completedET, 1320);
    } else if (incrementals.sixtyFt) {
      const estimatedEighth = incrementals.sixtyFt * SPLIT_RATIOS.sixtyToEighth;
      completedET = estimatedEighth * SPLIT_RATIOS.eighthToQuarter;
      brakePoint = 200;
      confidence = 'low';
      completedMPH = estimateMPHFromET(completedET, 1320);
    } else {
      return null;
    }
  }

  return {
    completedET: Math.round(completedET * 1000) / 1000,
    completedMPH: Math.round(completedMPH * 100) / 100,
    brakePoint,
    etLost: actualET ? Math.round((actualET - completedET) * 1000) / 1000 : 0,
    confidence,
    method: 'ratio',
  };
}

/**
 * Estimate MPH from ET using empirical formula
 * Based on relationship: MPH ≈ distance / ET * conversion_factor
 */
function estimateMPHFromET(et_s: number, distance_ft: number): number {
  // Empirical factor for drag racing (accounts for acceleration profile)
  const factor = distance_ft === 660 ? 0.68 : 0.68;
  return distance_ft / et_s * factor;
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
