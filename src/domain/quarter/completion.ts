/**
 * Partial-run completion logic for estimating final ET from intermediate splits.
 */

import { predictBaseline } from '../../worker/pipeline';
import type { PredictRequest } from './types';

/**
 * Anchor point representing a known split time and optional speed.
 */
export interface Anchor {
  d_ft: number;
  t_s: number;
  mph?: number;
}

/**
 * Result of run completion calculation.
 */
export interface CompletionResult {
  et_s: number;
  method: 'scale' | 'tail' | 'blend';
  confidence: number;
}

/**
 * Complete a partial run to estimate final ET.
 * 
 * Methods:
 * - scale: Linear scaling based on time ratio
 * - tail: MPH-based tail estimation (requires mph at anchor)
 * - blend: Weighted combination of scale and tail (70% tail, 30% scale)
 * 
 * @param req - Prediction request with vehicle and environment
 * @param anchors - Array of anchor points with known times/speeds
 * @returns Completion result with estimated ET, method, and confidence
 */
export function completeRun(
  req: PredictRequest,
  anchors: Anchor[]
): CompletionResult {
  // Validate inputs
  if (!anchors || anchors.length === 0) {
    throw new Error('At least one anchor point is required');
  }

  // Get baseline prediction
  const baseline = predictBaseline(req);
  const baseET_s = baseline.baseET_s;
  const baseMPH = baseline.baseMPH;

  // Find the best anchor (furthest distance)
  const bestAnchor = anchors.reduce((best, current) =>
    current.d_ft > best.d_ft ? current : best
  );

  // Validate anchor
  if (bestAnchor.d_ft <= 0 || bestAnchor.t_s <= 0) {
    throw new Error('Invalid anchor: distance and time must be positive');
  }

  // Get the finish distance for this race length
  const finishDistance = req.raceLength === 'EIGHTH' ? 660 : 1320;

  // If anchor is at finish, return it directly
  if (bestAnchor.d_ft >= finishDistance) {
    return {
      et_s: bestAnchor.t_s,
      method: 'scale',
      confidence: 100,
    };
  }

  // Find the baseline split fraction for this distance
  const splitFractions: Record<number, number> = {
    60: 0.16,
    330: 0.44,
    660: 0.79,
    1000: 0.93,
    1320: 1.0,
  };

  const baselineFraction = splitFractions[bestAnchor.d_ft];
  if (!baselineFraction) {
    throw new Error(`Unsupported anchor distance: ${bestAnchor.d_ft} ft`);
  }

  // Calculate scale method
  const expectedTimeAtAnchor = baseET_s * baselineFraction;
  const scaleFactor = bestAnchor.t_s / expectedTimeAtAnchor;
  const scaleET = baseET_s * scaleFactor;

  // If no MPH data, use scale method only
  if (!bestAnchor.mph || bestAnchor.mph <= 0) {
    return {
      et_s: clampET(scaleET, baseET_s),
      method: 'scale',
      confidence: calculateConfidence(bestAnchor.d_ft, false),
    };
  }

  // Calculate tail method (MPH-based) - only if anchor is at 660' or beyond
  if (bestAnchor.d_ft >= 660) {
    const remainingFt = finishDistance - bestAnchor.d_ft;
    // Use average of anchor mph and baseline trap mph for remaining distance
    // Clamp to reasonable range: min 1 mph
    const avgMph = Math.max(1, (bestAnchor.mph + baseMPH) / 2);
    // Convert mph to ft/s: mph * 1.46667
    const tail_s = remainingFt / (avgMph * 1.46667);
    const tailET = bestAnchor.t_s + tail_s;

    // Use blend method (70% tail, 30% scale)
    const blendET = tailET * 0.7 + scaleET * 0.3;

    return {
      et_s: clampET(blendET, baseET_s),
      method: 'blend',
      confidence: calculateConfidence(bestAnchor.d_ft, true),
    };
  }

  // If mph provided but anchor < 660', use scale only
  return {
    et_s: clampET(scaleET, baseET_s),
    method: 'scale',
    confidence: calculateConfidence(bestAnchor.d_ft, true),
  };
}

/**
 * Clamp ET to a sane range relative to baseline.
 * Allows -10% to +20% variation from baseline.
 */
function clampET(et: number, baseline: number): number {
  const minET = baseline * 0.9;
  const maxET = baseline * 1.2;
  return Math.max(minET, Math.min(maxET, et));
}

/**
 * Calculate confidence based on anchor distance and whether MPH is available.
 * Returns percentage (0-100).
 */
function calculateConfidence(
  anchorDistance: number,
  hasMPH: boolean
): number {
  // Base confidence by distance
  let confidence = 0;
  
  if (anchorDistance >= 1000) {
    confidence = 90;
  } else if (anchorDistance >= 660) {
    confidence = 80;
  } else if (anchorDistance >= 330) {
    confidence = 60;
  } else if (anchorDistance >= 60) {
    confidence = 40;
  } else {
    confidence = 20;
  }

  // Reduce confidence if MPH is missing
  if (!hasMPH) {
    confidence -= 10;
  }

  // Ensure minimum confidence
  return Math.max(10, confidence);
}
