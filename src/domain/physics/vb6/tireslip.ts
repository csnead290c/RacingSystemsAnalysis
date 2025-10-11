/**
 * VB6 Tire Slip Factor
 * 
 * VB6 Source: TIMESLIP.FRM:872, 1100-1101
 * 
 * Tire slip represents the difference between tire surface speed and vehicle speed.
 * It starts high at launch (tire deformation/spin) and decreases with distance.
 * 
 * VB6 Formula (Quarter Jr/Pro):
 *   Initial: TireSlip = 1.02 + (TractionIndex - 1) * 0.005 + (TrackTempEffect - 1) * 3
 *   During run: Work = 0.005 * (TractionIndex - 1) + 3 * (TrackTempEffect - 1)
 *               TireSlip = 1.02 + Work * (1 - (Dist / 1320)^2)
 * 
 * Where:
 * - TractionIndex: 1-5 (1=poor, 3=average, 5=excellent)
 * - TrackTempEffect: 1.0-1.04 based on track temperature
 * - Dist: Distance traveled (ft)
 * - TireSlip ≥ 1.0 (1.0 = no slip, >1.0 = tire spinning faster than vehicle)
 */

/**
 * Calculate VB6 tire slip factor
 * 
 * VB6: TIMESLIP.FRM:1100-1101
 * Work = 0.005 * (gc_TractionIndex.Value - 1) + 3 * (TrackTempEffect - 1)
 * TireSlip = 1.02 + Work * (1 - (Dist0 / 1320) ^ 2)
 * 
 * @param distance_ft - Distance traveled (ft)
 * @param tractionIndex - Traction index (1-5, typically 3)
 * @param trackTempEffect - Track temperature effect (1.0-1.04, typically 1.0)
 * @returns Tire slip factor (≥1.0)
 */
export function tireSlipFactor(
  distance_ft: number,
  tractionIndex: number = 3,
  trackTempEffect: number = 1.0
): number {
  // VB6: Work = 0.005 * (gc_TractionIndex.Value - 1) + 3 * (TrackTempEffect - 1)
  const Work = 0.005 * (tractionIndex - 1) + 3 * (trackTempEffect - 1);
  
  // VB6: TireSlip = 1.02 + Work * (1 - (Dist0 / 1320) ^ 2)
  const distRatio = distance_ft / 1320;
  const TireSlip = 1.02 + Work * (1 - Math.pow(distRatio, 2));
  
  return TireSlip;
}

/**
 * Calculate initial tire slip at launch
 * 
 * VB6: TIMESLIP.FRM:872
 * TireSlip = 1.02 + (gc_TractionIndex.Value - 1) * 0.005 + (TrackTempEffect - 1) * 3
 * 
 * This is the same as tireSlipFactor(0, ...) but kept for clarity.
 * 
 * @param tractionIndex - Traction index (1-5, typically 3)
 * @param trackTempEffect - Track temperature effect (1.0-1.04, typically 1.0)
 * @returns Initial tire slip factor at launch
 */
export function initialTireSlip(
  tractionIndex: number = 3,
  trackTempEffect: number = 1.0
): number {
  // VB6: TireSlip = 1.02 + (gc_TractionIndex.Value - 1) * 0.005 + (TrackTempEffect - 1) * 3
  const TireSlip = 1.02 + (tractionIndex - 1) * 0.005 + (trackTempEffect - 1) * 3;
  return TireSlip;
}
