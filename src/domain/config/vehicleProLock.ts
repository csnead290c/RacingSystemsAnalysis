/**
 * Vehicle Pro Lock — Strategy A (explicit boolean)
 *
 * A vehicle is locked for Basic users iff vehicle.usesQuarterProFeatures === true.
 * This flag is set explicitly when a Pro user saves a vehicle with Pro-only fields,
 * and is never automatically reverted.
 *
 * The PRO_ONLY_CHECKS list is retained for markProUsedIfNeeded() which detects
 * whether Pro-only fields are present during the save pipeline.
 */

import type { Vehicle } from '../schemas/vehicle.schema';

/**
 * Pro-only vehicle fields.
 * Each entry is a field key + a predicate that returns true when the field
 * holds a meaningful (non-default) value that only Pro users can set.
 * Used by markProUsedIfNeeded to decide whether to set usesQuarterProFeatures.
 */
const PRO_ONLY_CHECKS: Array<{
  field: string;
  label: string;
  test: (v: Partial<Vehicle>) => boolean;
}> = [
  // Editor mode
  { field: 'editorMode', label: 'Advanced editor mode', test: v => v.editorMode === 'advanced' },

  // Vehicle Data (Pro-only geometry)
  { field: 'overhangIn', label: 'Overhang', test: v => v.overhangIn != null },
  { field: 'cgHeightIn', label: 'CG Height', test: v => v.cgHeightIn != null },
  { field: 'staticFrontWeightLb', label: 'Static front weight', test: v => v.staticFrontWeightLb != null },

  // Final Drive
  { field: 'finalDriveEfficiency', label: 'Final drive efficiency', test: v => v.finalDriveEfficiency != null },

  // Engine (Pro: full HP curve, HP/TQ multiplier)
  { field: 'hpCurve', label: 'HP curve', test: v => Array.isArray(v.hpCurve) && v.hpCurve.length > 0 },
  { field: 'hpTorqueMultiplier', label: 'HP/Torque multiplier', test: v => v.hpTorqueMultiplier != null && v.hpTorqueMultiplier !== 1.0 },

  // Clutch (Pro-only fields)
  { field: 'clutchLaunchRPM', label: 'Clutch launch RPM', test: v => v.clutchLaunchRPM != null },
  { field: 'clutchSlippage', label: 'Clutch slippage', test: v => v.clutchSlippage != null },

  // Converter (Pro-only fields)
  { field: 'converterTorqueMult', label: 'Converter torque mult', test: v => v.converterTorqueMult != null },
  { field: 'converterSlippage', label: 'Converter slippage', test: v => v.converterSlippage != null },

  // Transmission (Pro: per-gear efficiencies, per-gear shift RPMs)
  { field: 'gearEfficiencies', label: 'Per-gear efficiencies', test: v => Array.isArray(v.gearEfficiencies) && v.gearEfficiencies.length > 0 },

  // Aero (Pro-only)
  { field: 'cd', label: 'Drag coefficient', test: v => v.cd != null },
  { field: 'liftCoeff', label: 'Lift coefficient', test: v => v.liftCoeff != null },

  // PMI
  { field: 'enginePMI', label: 'Engine PMI', test: v => v.enginePMI != null },
  { field: 'transPMI', label: 'Trans PMI', test: v => v.transPMI != null },
  { field: 'tiresPMI', label: 'Tires PMI', test: v => v.tiresPMI != null },

  // Throttle Stop
  { field: 'throttleStopEnabled', label: 'Throttle stop', test: v => v.throttleStopEnabled === true },
];

export interface ProLockResult {
  /** True if the vehicle is locked (has Pro fields but user lacks Pro access) */
  locked: boolean;
}

/**
 * Strategy A: Check if a vehicle is locked for a Basic user.
 * Locked iff usesQuarterProFeatures === true AND user lacks Pro access.
 */
export function isVehicleProLocked(
  vehicle: Partial<Vehicle>,
  hasProAccess: boolean,
): ProLockResult {
  if (hasProAccess) {
    return { locked: false };
  }

  return {
    locked: vehicle.usesQuarterProFeatures === true,
  };
}

/**
 * Check if a vehicle has any Pro-only fields set (regardless of user access).
 * Useful for displaying badges and for markProUsedIfNeeded.
 */
export function hasProFields(vehicle: Partial<Vehicle>): boolean {
  return PRO_ONLY_CHECKS.some(check => check.test(vehicle));
}

/**
 * Mark a vehicle as using Pro features if needed.
 * Called in the save pipeline when a Pro user saves a vehicle.
 *
 * Rules:
 * - If userHasPro is false, do nothing (Basic users can't set Pro fields).
 * - If the vehicle has any Pro-only field set, set usesQuarterProFeatures = true.
 * - Once true, never automatically revert to false (sticky).
 *
 * @returns The vehicle draft with usesQuarterProFeatures potentially set to true.
 */
export function markProUsedIfNeeded<T extends Partial<Vehicle>>(
  vehicleDraft: T,
  userHasPro: boolean,
): T {
  // Only Pro users can trigger the flag
  if (!userHasPro) return vehicleDraft;

  // Already marked — keep it (never revert)
  if (vehicleDraft.usesQuarterProFeatures === true) return vehicleDraft;

  // Check if any Pro-only fields are set
  if (hasProFields(vehicleDraft)) {
    return { ...vehicleDraft, usesQuarterProFeatures: true };
  }

  return vehicleDraft;
}
