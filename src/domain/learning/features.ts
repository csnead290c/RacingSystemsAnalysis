/**
 * Feature extraction for learning model.
 * Converts prediction request and baseline result into normalized feature vector.
 */

import { densityAltitudeFt } from '../core/weather';
import type { PredictRequest, PredictResult } from '../quarter/types';

/**
 * Feature extraction result with vector and names.
 */
export interface FeatureExtraction {
  /** Normalized feature vector */
  x: number[];
  /** Feature names for debugging */
  names: string[];
}

/**
 * Extract normalized features from prediction request and baseline result.
 * 
 * Features (all normalized):
 * - Density Altitude / 1000 (typical range: -2 to 10)
 * - Weight / 3000 (typical range: 0.5 to 1.5)
 * - Tire Diameter / 30 (typical range: 0.7 to 1.2)
 * - Rear Gear / 4 (typical range: 0.7 to 1.2)
 * - (Base ET - 10) / 5 (typical range: -0.5 to 1.5)
 * 
 * @param req - Prediction request with vehicle and environment
 * @param base - Baseline prediction result
 * @returns Feature vector and names
 */
export function extractFeatures(
  req: PredictRequest,
  base: PredictResult
): FeatureExtraction {
  const { vehicle, env } = req;
  
  // Calculate density altitude
  const da = densityAltitudeFt(env);
  
  // Extract and normalize features
  const features = [
    {
      name: 'DA/1000',
      value: da / 1000,
    },
    {
      name: 'Weight/3000',
      value: vehicle.weightLb / 3000,
    },
    {
      name: 'TireDia/30',
      value: vehicle.tireDiaIn / 30,
    },
    {
      name: 'RearGear/4',
      value: vehicle.rearGear / 4,
    },
    {
      name: '(ET-10)/5',
      value: (base.baseET_s - 10) / 5,
    },
  ];
  
  return {
    x: features.map(f => f.value),
    names: features.map(f => f.name),
  };
}
