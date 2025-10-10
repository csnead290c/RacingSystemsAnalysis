import type { Vehicle } from '../schemas/vehicle.schema';
import type { Env } from '../schemas/env.schema';
import type { RaceLength } from '../config/raceLengths';

/**
 * Request structure for quarter-mile prediction calculations.
 */
export interface PredictRequest {
  vehicle: Vehicle;
  env: Env;
  raceLength: RaceLength;
}

/**
 * Result structure containing prediction data and timeslip.
 */
export interface PredictResult {
  /** Base elapsed time in seconds (uncorrected) */
  baseET_s: number;
  /** Base trap speed in miles per hour */
  baseMPH: number;
  /** Timeslip with incremental distances, times, and speeds */
  timeslip: { d_ft: number; t_s: number; v_mph: number }[];
  /** Correction factors applied to the prediction */
  factors: { name: string; delta_s: number }[];
}
