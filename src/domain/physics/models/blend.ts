/**
 * Blend physics model implementation.
 * Combines RSACLASSIC physics with saved learning deltas (per-vehicle).
 */

import type { PhysicsModel, PhysicsModelId, SimInputs, SimResult } from '../index';
import { RSACLASSIC } from './rsaclassic';
import { getModel as getVehicleModel } from '../../../state/models';
import { apply } from '../../learning/model';
import { densityAltitudeFt } from '../../core/weather';

/**
 * Blend physics model.
 * Uses RSACLASSIC as base physics, then applies learned corrections.
 */
class BlendModel implements PhysicsModel {
  id: PhysicsModelId = 'Blend';

  simulate(input: SimInputs): SimResult {
    // First, run RSACLASSIC to get base physics result
    const rsaResult = RSACLASSIC.simulate(input);
    
    // Try to load saved model for this vehicle
    const vehicleId = input.vehicle.id;
    const savedModel = getVehicleModel(vehicleId);
    
    let delta = 0;
    const warnings = [...rsaResult.meta.warnings];
    
    if (savedModel) {
      // Extract features manually (adapted from learning/features.ts)
      const da = densityAltitudeFt(input.env);
      const featureVector = [
        da / 1000,
        input.vehicle.weightLb / 3000,
        input.vehicle.tireDiaIn / 30,
        input.vehicle.rearGear / 4,
        (rsaResult.et_s - 10) / 5,
      ];
      
      // Apply learned model to get delta
      delta = apply(savedModel, featureVector);
    } else {
      // No saved model found - use RSACLASSIC as-is
      warnings.push('no_learned_model');
    }
    
    // Apply delta with clamping to prevent unrealistic corrections
    // Clamp to ±20% of RSACLASSIC result
    const minET = rsaResult.et_s * 0.8;
    const maxET = rsaResult.et_s * 1.2;
    const correctedET = Math.max(minET, Math.min(maxET, rsaResult.et_s + delta));
    
    // Build result
    const result: SimResult = {
      et_s: correctedET,
      mph: rsaResult.mph, // Keep MPH from RSACLASSIC (learning only adjusts ET)
      timeslip: rsaResult.timeslip,
      traces: rsaResult.traces,
      meta: {
        model: 'Blend',
        steps: rsaResult.meta.steps,
        warnings: warnings,
      },
    };
    
    return result;
  }
}

/**
 * Blend model instance.
 */
export const Blend: PhysicsModel = new BlendModel();
