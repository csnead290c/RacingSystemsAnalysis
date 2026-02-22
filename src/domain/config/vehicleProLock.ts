/**
 * Vehicle Pro Lock — determines if a vehicle requires Pro access to run.
 *
 * A "Pro vehicle" is any vehicle that has Pro-only fields set to non-default values.
 * When a user downgrades from Pro to Basic (Racer), vehicles with Pro-only data
 * should be locked: visible but not selectable/runnable until the user upgrades.
 *
 * The field list mirrors the `isPro &&` guards in VehicleEditor.tsx.
 */

import type { Vehicle } from '../schemas/vehicle.schema';

/**
 * Pro-only vehicle fields.
 * Each entry is a field key + a predicate that returns true when the field
 * holds a meaningful (non-default) value that only Pro users can set.
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
  /** List of Pro-only fields that are set on this vehicle */
  proFields: string[];
}

/**
 * Check if a vehicle requires Pro access to run.
 *
 * @param vehicle - The vehicle to check
 * @param hasProAccess - Whether the current user has quarterProFields access
 * @returns ProLockResult with locked status and list of Pro fields found
 */
export function isVehicleProLocked(
  vehicle: Partial<Vehicle>,
  hasProAccess: boolean,
): ProLockResult {
  if (hasProAccess) {
    return { locked: false, proFields: [] };
  }

  const proFields: string[] = [];
  for (const check of PRO_ONLY_CHECKS) {
    if (check.test(vehicle)) {
      proFields.push(check.label);
    }
  }

  return {
    locked: proFields.length > 0,
    proFields,
  };
}

/**
 * Check if a vehicle has any Pro-only fields set (regardless of user access).
 * Useful for displaying badges.
 */
export function hasProFields(vehicle: Partial<Vehicle>): boolean {
  return PRO_ONLY_CHECKS.some(check => check.test(vehicle));
}
