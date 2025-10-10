/**
 * Baseline quarter-mile prediction pipeline.
 * Pure mathematical calculations with no side effects.
 */

import { DISTANCES } from '../domain/config/raceLengths';
import { hpCorrectionV1 } from '../domain/core/weather';
import type { PredictRequest, PredictResult } from '../domain/quarter/types';

/**
 * Predict baseline quarter-mile performance.
 * 
 * Uses cube-root power laws:
 * - Quarter-mile: ET ≈ 5.825 * cbrt(weight/HP), MPH ≈ 234 * cbrt(HP/weight)
 * - Eighth-mile: ET ≈ ETq * 0.64, MPH ≈ MPHq * 0.80
 * - Weather correction applied as small ET delta
 * 
 * Timeslip is built by allocating time fractions to standard splits:
 * - 60ft: 16% of total ET
 * - 330ft: 44% of total ET
 * - 660ft: 79% of total ET (half-track)
 * - 1000ft: 93% of total ET
 * - Finish: 100% of total ET
 * 
 * Only splits present in DISTANCES[raceLength] are included.
 * 
 * @param req - Prediction request with vehicle, environment, and race length
 * @returns Prediction result with ET, MPH, timeslip, and correction factors
 */
export function predictBaseline(req: PredictRequest): PredictResult {
  const { vehicle, env, raceLength } = req;

  // Safety guards
  if (vehicle.weightLb <= 0 || vehicle.powerHP <= 0) {
    throw new Error('Invalid vehicle params');
  }

  // Get distances for this race length from SSOT
  const distances = DISTANCES[raceLength];
  if (!distances) {
    throw new Error(`Invalid race length: ${raceLength}`);
  }

  // Apply weather correction to HP first
  const corr = hpCorrectionV1(env); // >1 = more power
  const effectiveHP = vehicle.powerHP * corr;
  
  // Quarter-mile baseline using cube-root power laws
  const safeHP = Math.max(1, effectiveHP);
  const safeWeight = Math.max(1, vehicle.weightLb);
  
  const ETq = 5.825 * Math.cbrt(safeWeight / safeHP);
  const MPHq = 234 * Math.cbrt(safeHP / safeWeight);

  // Eighth-mile conversion (rules of thumb)
  const ETe = ETq * 0.64;
  const MPHe = MPHq * 0.80;

  // Select baseline based on race length
  let baseET_s: number;
  let baseMPH: number;

  if (raceLength === 'EIGHTH') {
    baseET_s = ETe;
    baseMPH = MPHe;
  } else {
    baseET_s = ETq;
    baseMPH = MPHq;
  }

  // Safety checks
  if (!Number.isFinite(baseET_s) || !Number.isFinite(baseMPH)) {
    throw new Error('Invalid ET or MPH calculation');
  }

  // Calculate weather impact for reporting
  const baseETnoWeather = 5.825 * Math.cbrt(safeWeight / Math.max(1, vehicle.powerHP));
  const weatherDelta_s = baseET_s - baseETnoWeather;

  // Build timeslip using standard split fractions
  // Only include distances that exist in DISTANCES[raceLength]
  const splitFractions: Record<number, number> = {
    60: 0.16,
    330: 0.44,
    660: 0.79,
    1000: 0.93,
    1320: 1.0,
  };

  const timeslip = distances.map((d_ft) => {
    const fraction = splitFractions[d_ft] ?? 1.0;
    const t_s = baseET_s * fraction;

    // Calculate speed at this point - simple increasing ramp to baseMPH
    // Ensure monotonicity by using distance-based progression
    const distanceFraction = d_ft / distances[distances.length - 1];
    const v_mph = baseMPH * distanceFraction;

    return {
      d_ft,
      t_s: Math.max(0, t_s), // Ensure non-negative
      v_mph: Math.max(0, v_mph), // Ensure non-negative
    };
  });

  // Correction factors applied
  const factors = [
    {
      name: 'Weather (HP)',
      delta_s: weatherDelta_s,
    },
  ];

  return {
    baseET_s: Math.max(0, baseET_s),
    baseMPH: Math.max(0, baseMPH),
    timeslip,
    factors,
  };
}
