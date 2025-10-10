/**
 * VB6-ported tire calculations.
 * Source: TIMESLIP.FRM - Tire() subroutine (lines 1585-1607)
 * 
 * VB6 uses a complex tire model with:
 * - Tire growth (centrifugal expansion at speed)
 * - Tire squat (compression under acceleration load)
 * - Dynamic loaded radius calculation
 */

import { PI } from './constants';

/**
 * Calculate VB6 loaded tire radius.
 * 
 * VB6 Source: TIMESLIP.FRM lines 1585-1607, 1036, 1197
 * 
 * VB6 Algorithm:
 * 1. Compute tire growth factor based on speed (TireGrowth)
 * 2. Compute tire squat based on acceleration (TireSQ)
 * 3. Compute tire circumference: TireCirFt = TireSQ * TireDia * PI / 12
 * 4. Compute loaded radius: TireRadIn = 12 * TireCirFt / (2 * PI)
 * 
 * For our fixed-timestep simulation, we use the static (unloaded) radius
 * since VB6's tire growth/squat are velocity and acceleration dependent
 * and would require integration loop access.
 * 
 * @param tireDiaIn - Tire diameter (inches)
 * @param tireRolloutIn - Tire rollout/circumference (inches), optional
 * @returns Tire radius (feet)
 */
export function vb6LoadedRadiusFt(
  tireDiaIn?: number,
  tireRolloutIn?: number
): number {
  // VB6 uses tire diameter or rollout (TIMESLIP.FRM:683-687)
  // If gc_TireDia.UOM = UOM_NORMAL Then
  //     TireDia = gc_TireDia.Value
  // Else
  //     TireDia = gc_TireDia.Value / PI
  // End If
  
  if (tireRolloutIn) {
    // Rollout is circumference, so radius = circumference / (2*PI)
    // VB6: TireRadIn = 12 * TireCirFt / (2 * PI) (TIMESLIP.FRM:1036, 1197)
    // Convert inches to feet
    return (tireRolloutIn / 12) / (2 * PI);
  } else if (tireDiaIn) {
    // Diameter to radius, convert inches to feet
    // VB6 uses static diameter for initial calculations
    return (tireDiaIn / 12) / 2;
  } else {
    throw new Error('Either tireDiaIn or tireRolloutIn must be provided');
  }
}

/**
 * Calculate VB6 tire growth factor (centrifugal expansion).
 * 
 * VB6 Source: TIMESLIP.FRM lines 1589-1593
 * 
 * This is velocity-dependent and used during integration.
 * For reference only - not used in our fixed-radius implementation.
 * 
 * @param vFps - Velocity (feet/second)
 * @param tireDiaIn - Tire diameter (inches)
 * @param tireWidthIn - Tire width (inches)
 * @returns Tire growth factor (1.0 = no growth)
 */
export function vb6TireGrowth(
  vFps: number,
  tireDiaIn: number,
  tireWidthIn: number
): number {
  // VB6: TIMESLIP.FRM:1589-1593 (QUARTER Jr/Pro)
  // TGK = (gc_TireWidth.Value ^ 1.4 + TireDia - 16) / (0.171 * TireDia ^ 1.7)
  // TireGrowth = 1 + TGK * 0.0000135 * Vel(L) ^ 1.6
  // TGLinear = 1 + TGK * 0.00035 * Vel(L)
  // If TGLinear < TireGrowth Then TireGrowth = TGLinear
  
  const TGK = (tireWidthIn ** 1.4 + tireDiaIn - 16) / (0.171 * tireDiaIn ** 1.7);
  const TireGrowth = 1 + TGK * 0.0000135 * vFps ** 1.6;
  const TGLinear = 1 + TGK * 0.00035 * vFps;
  
  return Math.min(TireGrowth, TGLinear);
}

/**
 * Calculate VB6 tire squat factor (compression under load).
 * 
 * VB6 Source: TIMESLIP.FRM line 1595
 * 
 * This is acceleration-dependent and used during integration.
 * For reference only - not used in our fixed-radius implementation.
 * 
 * @param tireGrowth - Tire growth factor from vb6TireGrowth()
 * @param aGs - Acceleration (g's)
 * @returns Tire squat factor (< 1.0 = compressed)
 */
export function vb6TireSquat(
  tireGrowth: number,
  aGs: number
): number {
  // VB6: TIMESLIP.FRM:1595
  // TireSQ = TireGrowth - 0.035 * Abs(Ags0)
  return tireGrowth - 0.035 * Math.abs(aGs);
}
