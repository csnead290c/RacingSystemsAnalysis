/**
 * ET Simulation Field Help Registry
 *
 * Delegates to the unified tooltips.ts system (single source of truth).
 * This module adds structured metadata (title, source citation) on top
 * of the raw tooltip text for use by the FieldHelp component.
 *
 * All help text is sourced from RSA manuals. Do not invent content.
 */

import { TOOLTIPS, TOOLTIP_CITATIONS, type TooltipKey } from '../config/tooltips';

export interface FieldHelpEntry {
  fieldKey: string;
  title: string;
  helpText: string;
  sourceManual: string;
  sourceCitation: string;
}

/**
 * Map of fieldKey → human-readable title.
 * Keys must exist in TOOLTIPS.
 */
const FIELD_TITLES: Record<string, string> = {
  // Environment
  elevation: 'Elevation',
  barometer: 'Barometer',
  temperature: 'Temperature',
  humidity: 'Relative Humidity',
  windVelocity: 'Wind Velocity',
  windAngle: 'Wind Angle',
  trackTemp: 'Track Temp',
  tractionIndex: 'Traction Index',
  // Vehicle — Weight & Chassis
  weight: 'Weight',
  wheelbase: 'Wheelbase',
  rollout: 'Rollout',
  overhang: 'Overhang',
  cgHeight: 'CG Height',
  frontWeight: 'Static Front Weight',
  // Tires
  tireDiameter: 'Tire Diameter',
  tireRollout: 'Tire Rollout',
  tireWidth: 'Tire Width',
  // Aerodynamics
  frontalArea: 'Frontal Area',
  dragCoefficient: 'Drag Coefficient',
  liftCoefficient: 'Lift Coefficient',
  // Final Drive
  rearGear: 'Final Drive Ratio',
  finalDriveEfficiency: 'Final Drive Efficiency',
  // Transmission
  gearRatio: 'Gear Ratio',
  gearEfficiency: 'Gear Efficiency',
  shiftRPM: 'Shift RPM',
  // Clutch
  clutchLaunchRPM: 'Launch RPM (Clutch)',
  clutchSlipRPM: 'Slip RPM',
  clutchSlippage: 'Clutch Slippage',
  // Torque Converter
  converterStall: 'Stall RPM',
  converterTorqueMult: 'Torque Multiplication',
  converterSlippage: 'Converter Slippage',
  converterLaunchRPM: 'Launch RPM (Converter)',
  // PMI
  enginePMI: 'Engine PMI',
  transPMI: 'Transmission PMI',
  tiresPMI: 'Tires/Wheels PMI',
  // Engine
  peakHP: 'Horsepower',
  peakHPRPM: 'RPM at Peak HP',
  peakTorque: 'Torque',
  fuelSystem: 'Fuel System',
  hpTorqueMultiplier: 'HP/Torque Multiplier',
};

/**
 * Get help entry for a field.
 * Returns undefined if no tooltip text exists for this key.
 */
export function getFieldHelp(fieldKey: string): FieldHelpEntry | undefined {
  const tooltipKey = fieldKey as TooltipKey;
  const text = TOOLTIPS[tooltipKey];
  if (!text) return undefined;

  const title = FIELD_TITLES[fieldKey] ?? fieldKey;
  const citation = TOOLTIP_CITATIONS[tooltipKey];

  return {
    fieldKey,
    title,
    helpText: text,
    sourceManual: citation ? 'QPRO3W.txt' : 'uncited',
    sourceCitation: citation ?? 'No manual citation available',
  };
}

/**
 * Check if a field has help available
 */
export function hasFieldHelp(fieldKey: string): boolean {
  return (fieldKey as TooltipKey) in TOOLTIPS && fieldKey in FIELD_TITLES;
}

/**
 * Fields that need help but don't have verified source yet.
 * Do NOT invent help text for these — they need manual research.
 *
 * NOTE: Many of these were covered in the tooltips.ts upgrade (Mar 2026).
 * This list is now only fields with NO manual citation at all.
 */
export const MISSING_HELP_COVERAGE = [
  // Pro-only fields with no direct QPRO3W.txt citation
  'cgHeight',         // mentioned in code but not in Ch 4 basic section
  'frontWeight',      // same
  'staticFrontWeight', // alias

  // Uncited engine fields
  'peakTorqueRPM',    // derived, no standalone definition
  'idleRPM',          // no manual citation
  'redlineRPM',       // no manual citation

  // No citation
  'transEfficiency',  // generic, not in Ch 4
  'revLimiter',       // no manual citation
];
