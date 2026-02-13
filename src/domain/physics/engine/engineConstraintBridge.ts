/**
 * Engine Constraint Bridge
 *
 * Converts between EngineSimConfig (UI state) and the FieldConstraint map
 * used by engineConstraints.ts, runs the VB6-equivalent constraint chains,
 * and writes clamped values back to config.
 *
 * This module is the single integration point between the Dashboard UI
 * and the constraint layer — the Dashboard calls commitConfigField() or
 * commitCamTypeChange() on blur/Enter, and gets back a corrected config
 * plus a list of fields that were adjusted.
 */

import type { EngineSimConfig } from './engineAdapter';
import {
  type FieldKey,
  type FieldConstraint,
  initAllFieldConstraints,
  recomputeOnCommit,
  recomputeOnCamTypeChange,
} from './engineConstraints';

// ---------------------------------------------------------------------------
// clampToLimits — force-clamp a field's value to its current min/max.
// Unlike setValue(), this has no "value === next.value" guard, so it always
// enforces the limits even when the value hasn't changed.
// ---------------------------------------------------------------------------

function clampToLimits(f: FieldConstraint): FieldConstraint {
  if (f.isCalc) return f; // calc fields are not user-clamped
  let v = f.value;
  if (v < f.minVal) v = f.minVal;
  if (v > f.maxVal) v = f.maxVal;
  if (v === f.value) return f;
  return { ...f, value: v, isChanged: true, isError: true };
}

/** Force-clamp all fields in a map to their current limits. */
function clampAllFields(
  m: Record<FieldKey, FieldConstraint>,
  changedKeys: FieldKey[],
): Record<FieldKey, FieldConstraint> {
  const keys = Object.keys(m) as FieldKey[];
  for (const k of keys) {
    const clamped = clampToLimits(m[k]);
    if (clamped !== m[k]) {
      m = { ...m, [k]: clamped };
      if (!changedKeys.includes(k)) changedKeys.push(k);
    }
  }
  return m;
}

// ---------------------------------------------------------------------------
// CAM_TYPE_MAP — duplicated from engineAdapter.ts to avoid circular deps
// ---------------------------------------------------------------------------

const CAM_TYPE_MAP: Record<string, number> = {
  'overhead_cam': 0,
  'roller': 1,
  'mushroom_tappet': 2,
  'high_rate_flat_tappet': 3,
  'normal_flat_tappet': 4,
  'hydraulic_roller': 5,
  'hydraulic_flat_tappet': 6,
};

const MANIFOLD_TYPE_MAP: Record<string, number> = {
  'plenum': 1,
  'individual_runner': 2,
  'dual_plane_divided': 3,
  'dual_plane_slot': 4,
};

// ---------------------------------------------------------------------------
// Config key → FieldKey mapping
// ---------------------------------------------------------------------------

/** Maps EngineSimConfig property names to constraint FieldKeys (only constrained fields). */
export const CONFIG_TO_FIELD: Record<string, FieldKey> = {
  bore_in: 'bore',
  stroke_in: 'stroke',
  rodLength_in: 'rod',
  flowTestBoreDia_in: 'refBore',
  numIntakeValvesPerCyl: 'noInValves',
  intakeValveDia_in: 'valveDia',
  maxIntakeFlow_cfm: 'maxInFlow',
  flowTestPressure_inH2O: 'deltaP',
  throttleCFM_at_1_5inHg: 'carbCFM',
  maxIntakeValveLift_in: 'valveLift',
};

// ---------------------------------------------------------------------------
// Sync config → constraint map
// ---------------------------------------------------------------------------

/**
 * Build a fresh FieldConstraint map seeded with current config values.
 *
 * Directly sets .value on each field (bypassing setValue's "value === next.value"
 * guard). This is safe because we're building a fresh map from initAllFieldConstraints().
 * After the constraint chain runs, callers use clampAllFields() to enforce limits.
 */
export function configToConstraintMap(config: EngineSimConfig): Record<FieldKey, FieldConstraint> {
  const map = initAllFieldConstraints();

  map.bore = { ...map.bore, value: config.bore_in };
  map.stroke = { ...map.stroke, value: config.stroke_in };
  map.rod = { ...map.rod, value: config.rodLength_in };
  map.refBore = { ...map.refBore, value: config.flowTestBoreDia_in };
  map.noInValves = { ...map.noInValves, value: config.numIntakeValvesPerCyl };
  map.valveDia = { ...map.valveDia, value: config.intakeValveDia_in };
  map.maxInFlow = { ...map.maxInFlow, value: config.maxIntakeFlow_cfm };
  map.deltaP = { ...map.deltaP, value: config.flowTestPressure_inH2O };
  map.carbCFM = { ...map.carbCFM, value: config.throttleCFM_at_1_5inHg };
  map.valveLift = { ...map.valveLift, value: config.maxIntakeValveLift_in ?? 0.55 };

  return map;
}

// ---------------------------------------------------------------------------
// Write constraint map back to config
// ---------------------------------------------------------------------------

/** Apply clamped constraint values back to config, returning a new config. */
function constraintMapToConfig(
  config: EngineSimConfig,
  map: Record<FieldKey, FieldConstraint>,
): EngineSimConfig {
  return {
    ...config,
    bore_in: map.bore.value,
    stroke_in: map.stroke.value,
    rodLength_in: map.rod.value,
    flowTestBoreDia_in: map.refBore.value,
    numIntakeValvesPerCyl: map.noInValves.value,
    intakeValveDia_in: map.valveDia.value,
    maxIntakeFlow_cfm: map.maxInFlow.value,
    flowTestPressure_inH2O: map.deltaP.value,
    throttleCFM_at_1_5inHg: map.carbCFM.value,
    maxIntakeValveLift_in: map.valveLift.value,
  };
}

// ---------------------------------------------------------------------------
// Public API: commitConfigField
// ---------------------------------------------------------------------------

export interface ConstraintResult {
  /** The corrected config with all clamped values applied. */
  config: EngineSimConfig;
  /** FieldKeys that were adjusted by the constraint layer. */
  adjustedFields: FieldKey[];
  /** Human-readable labels for adjusted fields (for UI feedback). */
  adjustedLabels: string[];
}

/** Fields that are internal/computed and should not appear in user feedback. */
const INTERNAL_FIELDS = new Set<FieldKey>(['csArea', 'seatDia', 'stemDia', 'vsWidth']);

const FIELD_LABELS: Record<FieldKey, string> = {
  bore: 'Bore',
  stroke: 'Stroke',
  rod: 'Rod Length',
  refBore: 'Ref Bore',
  noInValves: 'Intake Valves',
  valveDia: 'Valve Dia',
  maxInFlow: 'Max Flow',
  deltaP: 'Test Pressure',
  csArea: 'CS Area',
  carbCFM: 'Throttle CFM',
  valveLift: 'Valve Lift',
  seatDia: 'Seat Dia',
  stemDia: 'Stem Dia',
  vsWidth: 'Seat Width',
};

/**
 * Run the VB6-equivalent constraint chain after a field is committed.
 *
 * @param config - Current EngineSimConfig (with the new value already applied)
 * @param configKey - The EngineSimConfig property that was just edited
 * @returns Corrected config + list of adjusted fields
 */
export function commitConfigField(
  config: EngineSimConfig,
  configKey: keyof EngineSimConfig,
): ConstraintResult {
  const fieldKey = CONFIG_TO_FIELD[configKey as string];

  // If this config key has no constraint mapping, return unchanged
  if (!fieldKey) {
    return { config, adjustedFields: [], adjustedLabels: [] };
  }

  const camType = CAM_TYPE_MAP[config.camshaftType] ?? 4;
  const noCyl = config.numCylinders;
  const manifoldType = MANIFOLD_TYPE_MAP[config.intakeManifoldType] ?? 1;

  // Build constraint map seeded with current config values
  const map = configToConstraintMap(config);

  // Run the VB6 constraint chain — this updates min/max limits on downstream
  // fields but may not clamp values due to setValue's "value === next.value" guard.
  const { nextMap, changedKeys } = recomputeOnCommit(map, {
    camType,
    committedKey: fieldKey,
    noCyl,
    manifoldType,
  });

  // Force-clamp ALL fields against their (now-tightened) limits.
  // This catches values that were seeded from config but are now out of the
  // dynamically computed range (e.g., refBore after bore shrinks).
  const allAdjusted = [...changedKeys];
  const finalMap = clampAllFields(nextMap, allAdjusted);

  const nextConfig = constraintMapToConfig(config, finalMap);

  // Filter out internal computed fields not visible to the user
  const userVisible = allAdjusted.filter(k => !INTERNAL_FIELDS.has(k));
  const adjustedLabels = userVisible.map(k => FIELD_LABELS[k] || k);

  return { config: nextConfig, adjustedFields: userVisible, adjustedLabels };
}

/**
 * Run the VB6-equivalent constraint chain after camshaft type changes.
 *
 * @param config - Current EngineSimConfig (with new camshaftType already applied)
 * @returns Corrected config + list of adjusted fields
 */
export function commitCamTypeChange(config: EngineSimConfig): ConstraintResult {
  const camType = CAM_TYPE_MAP[config.camshaftType] ?? 4;

  const map = configToConstraintMap(config);
  const { nextMap, changedKeys } = recomputeOnCamTypeChange(map, { camType });

  // Force-clamp all fields against updated limits
  const allAdjusted = [...changedKeys];
  const finalMap = clampAllFields(nextMap, allAdjusted);

  const nextConfig = constraintMapToConfig(config, finalMap);

  // Filter out internal computed fields not visible to the user
  const userVisible = allAdjusted.filter(k => !INTERNAL_FIELDS.has(k));
  const adjustedLabels = userVisible.map(k => FIELD_LABELS[k] || k);

  return { config: nextConfig, adjustedFields: userVisible, adjustedLabels };
}
