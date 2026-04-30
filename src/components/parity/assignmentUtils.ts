/**
 * Shared assignment utilities for parity surfaces
 * Provides common logic for resolving and managing driver combo/body style assignments
 */

import type { DriverComboRow, ClassDefaultRow, EngineComboRow, DriverBodyStyleRow, BodyStyleRow } from '../../services/parityApi';
import { parityApi } from '../../services/parityApi';

export type AssignmentSource = 'override' | 'classDefault' | 'none';

export interface ResolvedComboAssignment {
  engineComboId: number | null;
  engineComboName: string | null;
  source: AssignmentSource;
  effectiveFrom: string | null;
  effectiveTo: string | null;
  driverComboId?: number;
  t_power?: number;
  d_power?: number;
  friction_factor?: number;
}

export interface ResolvedBodyStyleAssignment {
  bodyStyleId: number | null;
  bodyStyleName: string | null;
  source: AssignmentSource;
  effectiveFrom: string | null;
  effectiveTo: string | null;
  driverBodyStyleId?: number;
  cd?: number;
  frontalArea?: number;
  liftCoef?: number;
  overhangIn?: number;
}

/**
 * Resolve the current effective engine combo assignment for a driver at a specific timestamp
 */
export function resolveComboAssignment(
  driverName: string,
  classIndex: string,
  referenceTimestamp: string | null,
  driverCombos: DriverComboRow[],
  classDefaults: ClassDefaultRow[],
  engineCombos: EngineComboRow[]
): ResolvedComboAssignment {
  const dn = driverName.toUpperCase();
  const ci = classIndex.toUpperCase();
  const refTs = referenceTimestamp || new Date().toISOString();

  // 1. Check for driver-specific override
  const candidates = driverCombos.filter(
    c => c.driver_name.toUpperCase() === dn && c.class_index.toUpperCase() === ci
  );

  // Filter to active assignments at refTs, then pick the one with latest effective_from_utc
  const activeAssignments = candidates.filter(c => {
    if (refTs < c.effective_from_utc) return false;
    if (c.effective_to_utc && refTs >= c.effective_to_utc) return false;
    return true;
  });

  const matched = activeAssignments.length > 0
    ? activeAssignments.reduce((latest, current) => 
        current.effective_from_utc > latest.effective_from_utc ? current : latest
      )
    : null;

  if (matched) {
    const combo = engineCombos.find(ec => ec.id === matched.engine_combo_id);
    return {
      engineComboId: matched.engine_combo_id,
      engineComboName: matched.engine_combo_name,
      source: 'override',
      effectiveFrom: matched.effective_from_utc,
      effectiveTo: matched.effective_to_utc,
      driverComboId: matched.id,
      t_power: combo?.t_power,
      d_power: combo?.d_power,
      friction_factor: combo?.friction_factor,
    };
  }

  // 2. Fall back to class default
  const activeDefaults = classDefaults.filter(cd => {
    if (cd.class_index.toUpperCase() !== ci) return false;
    if (cd.effective_from_utc && refTs < cd.effective_from_utc) return false;
    if (cd.effective_to_utc && refTs >= cd.effective_to_utc) return false;
    return true;
  });

  const classDefault = activeDefaults.length > 0
    ? activeDefaults.reduce((latest, current) => 
        (current.effective_from_utc || '') > (latest.effective_from_utc || '') ? current : latest
      )
    : null;

  if (classDefault) {
    const combo = engineCombos.find(ec => ec.id === classDefault.engine_combo_id);
    return {
      engineComboId: classDefault.engine_combo_id,
      engineComboName: classDefault.engine_combo_name,
      source: 'classDefault',
      effectiveFrom: classDefault.effective_from_utc,
      effectiveTo: classDefault.effective_to_utc,
      t_power: combo?.t_power,
      d_power: combo?.d_power,
      friction_factor: combo?.friction_factor,
    };
  }

  // 3. None
  return {
    engineComboId: null,
    engineComboName: null,
    source: 'none',
    effectiveFrom: null,
    effectiveTo: null,
  };
}

/**
 * Resolve the current effective body style assignment for a driver at a specific timestamp
 */
export function resolveBodyStyleAssignment(
  driverName: string,
  classIndex: string,
  referenceTimestamp: string | null,
  driverBodyStyles: DriverBodyStyleRow[],
  bodyStyles: BodyStyleRow[]
): ResolvedBodyStyleAssignment {
  const dn = driverName.toUpperCase();
  const ci = classIndex.toUpperCase();
  const refTs = referenceTimestamp || new Date().toISOString();

  const candidates = driverBodyStyles.filter(
    dbs => dbs.driver_name.toUpperCase() === dn && dbs.class_index.toUpperCase() === ci
  );

  // Filter to active assignments at refTs, then pick the one with latest effective_from_utc
  const activeAssignments = candidates.filter(dbs => {
    if (refTs < dbs.effective_from_utc) return false;
    if (dbs.effective_to_utc && refTs >= dbs.effective_to_utc) return false;
    return true;
  });

  const matched = activeAssignments.length > 0
    ? activeAssignments.reduce((latest, current) => 
        current.effective_from_utc > latest.effective_from_utc ? current : latest
      )
    : null;

  if (matched) {
    const bs = bodyStyles.find(b => b.id === matched.body_style_id);
    return {
      bodyStyleId: matched.body_style_id,
      bodyStyleName: matched.body_style_name,
      source: 'override',
      effectiveFrom: matched.effective_from_utc,
      effectiveTo: matched.effective_to_utc,
      driverBodyStyleId: matched.id,
      cd: bs?.cd,
      frontalArea: bs?.frontal_area,
      liftCoef: bs?.lift_coef,
      overhangIn: bs?.overhang_in,
    };
  }

  return {
    bodyStyleId: null,
    bodyStyleName: null,
    source: 'none',
    effectiveFrom: null,
    effectiveTo: null,
  };
}

/**
 * Get all historical assignments for a driver (sorted newest first)
 */
export function getComboHistory(
  driverName: string,
  classIndex: string,
  driverCombos: DriverComboRow[]
): DriverComboRow[] {
  const dn = driverName.toUpperCase();
  const ci = classIndex.toUpperCase();
  
  return driverCombos
    .filter(c => c.driver_name.toUpperCase() === dn && c.class_index.toUpperCase() === ci)
    .sort((a, b) => b.effective_from_utc.localeCompare(a.effective_from_utc));
}

/**
 * Get all historical body style assignments for a driver (sorted newest first)
 */
export function getBodyStyleHistory(
  driverName: string,
  classIndex: string,
  driverBodyStyles: DriverBodyStyleRow[]
): DriverBodyStyleRow[] {
  const dn = driverName.toUpperCase();
  const ci = classIndex.toUpperCase();
  
  return driverBodyStyles
    .filter(dbs => dbs.driver_name.toUpperCase() === dn && dbs.class_index.toUpperCase() === ci)
    .sort((a, b) => b.effective_from_utc.localeCompare(a.effective_from_utc));
}

/**
 * Format UTC timestamp for display
 */
export function formatAssignmentDate(utcString: string | null): string {
  if (!utcString) return '—';
  try {
    const date = new Date(utcString);
    return date.toISOString().slice(0, 10); // YYYY-MM-DD
  } catch {
    return utcString;
  }
}

/**
 * Get source badge color
 */
export function getSourceBadgeColor(source: AssignmentSource): string {
  switch (source) {
    case 'override': return '#2563eb'; // blue
    case 'classDefault': return '#eab308'; // yellow
    case 'none': return '#6b7280'; // gray
  }
}

/**
 * Get source display label
 */
export function getSourceLabel(source: AssignmentSource): string {
  switch (source) {
    case 'override': return 'Driver Override';
    case 'classDefault': return 'Class Default';
    case 'none': return 'None';
  }
}

// ============================================================================
// Shared correction-context loader
// ============================================================================

export interface CorrectionContextData {
  engineCombos: EngineComboRow[];
  driverCombos: Array<{
    driver_name: string;
    class_index: string;
    engine_combo_id: number;
    engine_combo_name: string;
    effective_from_utc: string;
    effective_to_utc: string | null;
  }>;
  classDefaults: Array<{
    class_index: string;
    engine_combo_name: string;
    engine_combo_id: number;
    effective_from_utc: string | null;
    effective_to_utc: string | null;
  }>;
}

/**
 * Load correction context for parity surfaces.
 * Loads engine combos, driver combos, and class defaults.
 */
export async function loadCorrectionContext(): Promise<CorrectionContextData> {
  const [ec, dc, cd] = await Promise.all([
    parityApi.listEngineCombos(),
    parityApi.listDriverCombos(),
    parityApi.listClassDefaults(),
  ]);
  
  return {
    engineCombos: ec.combos,
    driverCombos: dc.combos.map(c => ({
      driver_name: c.driver_name,
      class_index: c.class_index,
      engine_combo_id: c.engine_combo_id,
      engine_combo_name: c.engine_combo_name,
      effective_from_utc: c.effective_from_utc,
      effective_to_utc: c.effective_to_utc,
    })),
    classDefaults: cd.classDefaults.map(c => ({
      class_index: c.class_index,
      engine_combo_name: c.engine_combo_name,
      engine_combo_id: c.engine_combo_id,
      effective_from_utc: c.effective_from_utc,
      effective_to_utc: c.effective_to_utc,
    })),
  };
}

// ============================================================================
// Shared bulk assignment result formatter
// ============================================================================

export interface BulkUpsertResult {
  created: number;
  closed: number;
  replaced: number;
  skipped: number;
  errors: string[];
}

export interface FormattedBulkResult {
  message: string;
  hasErrors: boolean;
  errorMessage?: string;
}

/**
 * Format bulkUpsertDriverCombos result into user-facing message.
 * Handles both multi-item and single-item result formatting.
 */
export function formatBulkUpsertDriverCombosResult(
  result: BulkUpsertResult,
  options?: { singleItem?: boolean; driverName?: string }
): FormattedBulkResult {
  // Handle errors first
  if (result.errors.length > 0) {
    return {
      message: '',
      hasErrors: true,
      errorMessage: result.errors.join('; '),
    };
  }
  
  // Single item format (used in change-at-start flows)
  if (options?.singleItem && options.driverName) {
    const closedPart = result.closed > 0 ? ', previous closed' : '';
    return {
      message: `${options.driverName}: new assignment created${closedPart}`,
      hasErrors: false,
    };
  }
  
  // Multi-item format (default)
  const messages: string[] = [];
  if (result.created > 0) messages.push(`${result.created} created`);
  if (result.closed > 0) messages.push(`${result.closed} closed`);
  if (result.replaced > 0) messages.push(`${result.replaced} replaced`);
  if (result.skipped > 0) messages.push(`${result.skipped} skipped`);
  
  return {
    message: messages.join(', ') || 'saved',
    hasErrors: false,
  };
}
