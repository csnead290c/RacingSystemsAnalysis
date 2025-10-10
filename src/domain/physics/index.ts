/**
 * Pluggable physics engine with interchangeable models.
 * 
 * Models:
 * - SimpleV1: Current baseline physics (simplified)
 * - RSACLASSIC: Advanced physics for Quarter Jr/Pro parity
 * - Blend: RSACLASSIC + adaptive learning
 */

import type { Vehicle } from '../schemas/vehicle.schema';
import type { Env } from '../schemas/env.schema';
import type { RaceLength } from '../config/raceLengths';
import { predictBaseline } from '../../worker/pipeline';

/**
 * Available physics model identifiers.
 */
export type PhysicsModelId = 'SimpleV1' | 'RSACLASSIC' | 'Blend';

/**
 * Extended vehicle configuration for advanced physics models.
 */
export interface ExtendedVehicle extends Vehicle {
  // Physical dimensions (additional to base Vehicle)
  wheelbaseIn?: number;
  overhangIn?: number;
  tireWidthIn?: number;
  tireRolloutIn?: number;
  
  // Aerodynamics
  frontalArea_ft2?: number;
  cd?: number; // Drag coefficient
  liftCoeff?: number; // Lift/downforce coefficient
  
  // Rolling resistance
  rrCoeff?: number; // Rolling resistance coefficient
  
  // Drivetrain
  finalDrive?: number; // Final drive ratio (defaults to vehicle.rearGear)
  transEff?: number; // Transmission efficiency (0..1)
  
  // Transmission gearing
  gearRatios?: number[]; // [g1, g2, ...] Including top gear, length >= 1
  gearEff?: number[]; // Per-gear efficiency (0..1), optional
  shiftRPM?: number[]; // Per-gear upshift RPM
  
  // Launch device - converter (automatic)
  converter?: {
    launchRPM?: number;
    stallRPM?: number;
    slipRatio?: number; // e.g. 1.06
    torqueMult?: number; // e.g. 1.70
    lockup?: boolean;
    diameterIn?: number;
  };
  
  // Launch device - clutch (manual)
  clutch?: {
    launchRPM?: number;
    slipRPM?: number;
    slipRatio?: number;
    lockup?: boolean;
  };
  
  // Power (powerHP is required in base Vehicle, torqueCurve is optional extension)
  torqueCurve?: { rpm: number; hp?: number; tq_lbft?: number }[]; // Allow hp-only rows
}

/**
 * Simulation inputs for physics models.
 */
export interface SimInputs {
  vehicle: ExtendedVehicle;
  env: Env;
  raceLength: RaceLength;
}

/**
 * Simulation result from physics models.
 */
export interface SimResult {
  // Final results
  et_s: number;
  mph: number;
  
  // Timeslip (standard splits)
  timeslip: { d_ft: number; t_s: number; v_mph: number }[];
  
  // Optional detailed traces (for advanced models)
  traces?: {
    t_s: number;
    v_mph: number;
    a_g: number;
    s_ft: number;
    rpm: number;
    gear: number;
  }[];
  
  // Metadata
  meta: {
    model: PhysicsModelId;
    steps: number;
    warnings: string[];
    windowMPH?: {
      e660_mph?: number;  // Eighth mile trap (594-660 ft)
      q1320_mph?: number; // Quarter mile trap (1254-1320 ft)
    };
    converter?: {
      used: boolean;
      avgTR: number;
      avgETA: number;
      avgSR: number;
      deRateMax: number;
      parasiticConst: number;
      parasiticQuad: number;
    };
    clutch?: {
      used: boolean;
      minC: number;
      lockupAt_ft?: number;
    };
    rollout?: {
      rolloutIn: number;
      t_roll_s: number;
    };
    fuel?: {
      type: string;
      minScale: number;
      maxScale: number;
    };
    vb6?: {
      dt_s: number;
      trapMode: 'time' | 'distance';
      windowsFt: {
        eighth: { start: number; end: number; distance: number };
        quarter: { start: number; end: number; distance: number };
      };
      timeslipPoints: number[];
      rolloutBehavior: string;
    };
  };
}

/**
 * Physics model interface.
 */
export interface PhysicsModel {
  id: PhysicsModelId;
  simulate(input: SimInputs): SimResult;
}

/**
 * SimpleV1 model - wraps existing pipeline.predictBaseline.
 */
class SimpleV1Model implements PhysicsModel {
  id: PhysicsModelId = 'SimpleV1';

  simulate(input: SimInputs): SimResult {
    // Convert to pipeline format
    const pipelineResult = predictBaseline({
      vehicle: input.vehicle,
      env: input.env,
      raceLength: input.raceLength,
    });

    // Convert to SimResult format
    return {
      et_s: pipelineResult.baseET_s,
      mph: pipelineResult.baseMPH,
      timeslip: pipelineResult.timeslip,
      meta: {
        model: 'SimpleV1',
        steps: pipelineResult.timeslip.length,
        warnings: [],
      },
    };
  }
}

// Import RSACLASSIC and Blend implementations
import { RSACLASSIC as RSACLASSICImpl } from './models/rsaclassic';
import { Blend as BlendImpl } from './models/blend';

/**
 * Model registry.
 */
const models: Record<PhysicsModelId, PhysicsModel> = {
  SimpleV1: new SimpleV1Model(),
  RSACLASSIC: RSACLASSICImpl,
  Blend: BlendImpl,
};

/**
 * Get a physics model by ID.
 * 
 * @param id - Model identifier
 * @returns Physics model instance
 */
export function getModel(id: PhysicsModelId): PhysicsModel {
  const model = models[id];
  if (!model) {
    throw new Error(`Unknown physics model: ${id}`);
  }
  return model;
}
