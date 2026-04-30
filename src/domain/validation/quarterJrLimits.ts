/**
 * VB6 QUARTER Jr Input Validation Limits
 * 
 * These ranges are extracted from the QUARTER Jr 3.2 User Manual (QJR3W.txt)
 * and enforce the same auto-clamping behavior as the VB6 application.
 * 
 * VB6 Behavior (manual page 4-1):
 * "if you enter a value outside the range of acceptable variable inputs, 
 * you will receive a warning message on the screen and QUARTER jr will 
 * automatically change the value to be within the established QUARTER jr limits."
 */

export interface FieldLimit {
  min: number;
  max: number;
  fieldName: string;
  unit: string;
}

/**
 * VB6 QUARTER Jr field validation limits
 * Source: QJR3W.txt manual, Chapter 4
 */
export const QUARTER_JR_LIMITS: Record<string, FieldLimit> = {
  // General / Environment (manual pages 4-3)
  elevation: {
    min: 0,
    max: 6000,
    fieldName: 'Elevation',
    unit: 'ft',
  },
  barometer: {
    min: 29.0,
    max: 31.0,
    fieldName: 'Barometer',
    unit: 'in Hg',
  },
  temperature: {
    min: 40,
    max: 110,
    fieldName: 'Temperature',
    unit: '°F',
  },
  relativeHumidity: {
    min: 15,
    max: 90,
    fieldName: 'Relative Humidity',
    unit: '%',
  },

  // Vehicle (manual pages 4-4)
  weight: {
    min: 1200,
    max: 4000,
    fieldName: 'Weight',
    unit: 'lbs',
  },
  rollout: {
    min: 0.0, // 0.0 = no rollout (immediate timing start)
    max: 14,
    fieldName: 'Rollout',
    unit: 'inches',
  },
  wheelbase: {
    min: 90,
    max: 300,
    fieldName: 'Wheelbase',
    unit: 'inches',
  },
  frontalArea: {
    min: 12,
    max: 28,
    fieldName: 'Frontal Area',
    unit: 'sq ft',
  },

  // Engine (manual pages 4-6 to 4-7)
  displacement: {
    min: 77,
    max: 632,
    fieldName: 'Displacement',
    unit: 'CID',
  },
  rpmAtPeakHP: {
    min: 2000,
    max: 12000,
    fieldName: 'RPM @ Peak HP',
    unit: 'RPM',
  },
  peakHP: {
    min: 100,
    max: 6000,
    fieldName: 'Peak HP',
    unit: 'HP',
  },
  shiftRPM: {
    min: 4500,
    max: 12500,
    fieldName: 'Shift RPM',
    unit: 'RPM',
  },

  // Transmission - Clutch (manual page 4-8)
  clutchSlipRPM: {
    min: 2000,
    max: 7000,
    fieldName: 'Clutch Slip RPM',
    unit: 'RPM',
  },

  // Transmission - Converter (manual pages 4-8 to 4-9)
  converterStallRPM: {
    min: 2000,
    max: 7500,
    fieldName: 'Converter Stall RPM',
    unit: 'RPM',
  },
  converterStallIndex: {
    min: 30,
    max: 160,
    fieldName: 'Stall Index',
    unit: '',
  },
  converterDiameter: {
    min: 7,
    max: 12,
    fieldName: 'Converter Diameter',
    unit: 'inches',
  },

  // Final Drive (manual pages 4-10 to 4-11)
  finalDriveRatio: {
    min: 3.07,
    max: 6.50,
    fieldName: 'Final Drive Ratio',
    unit: '',
  },
  tireDiameter: {
    min: 24,
    max: 37,
    fieldName: 'Tire Diameter',
    unit: 'inches',
  },
  tireRollout: {
    min: 75,
    max: 118,
    fieldName: 'Tire Rollout',
    unit: 'inches',
  },
  tireWidth: {
    min: 6,
    max: 18,
    fieldName: 'Tire Width',
    unit: 'inches',
  },
  tractionIndex: {
    min: 1,  // 1 = best traction (national event)
    max: 12, // 12 = street-like traction
    fieldName: 'Traction Index',
    unit: '',
  },
};

/**
 * Clamp a numeric value to VB6 QUARTER Jr limits
 * Returns clamped value and whether clamping occurred
 */
export function clampToVB6Limit(
  value: number,
  limitKey: keyof typeof QUARTER_JR_LIMITS
): { value: number; clamped: boolean; limit: FieldLimit } {
  const limit = QUARTER_JR_LIMITS[limitKey];
  
  if (value < limit.min) {
    return { value: limit.min, clamped: true, limit };
  }
  if (value > limit.max) {
    return { value: limit.max, clamped: true, limit };
  }
  
  return { value, clamped: false, limit };
}

/**
 * Validate and clamp a value, returning the clamped value
 * This is the primary function to use in input handlers
 */
export function validateAndClamp(
  value: number | undefined | null,
  limitKey: keyof typeof QUARTER_JR_LIMITS
): number | undefined {
  if (value === undefined || value === null || isNaN(value)) {
    return undefined;
  }
  
  const result = clampToVB6Limit(value, limitKey);
  return result.value;
}

/**
 * Get a warning message for clamped values (VB6-style)
 */
export function getClampWarning(
  originalValue: number,
  limitKey: keyof typeof QUARTER_JR_LIMITS
): string | null {
  const result = clampToVB6Limit(originalValue, limitKey);
  
  if (!result.clamped) {
    return null;
  }
  
  const { limit } = result;
  const direction = originalValue < limit.min ? 'below' : 'above';
  const boundary = originalValue < limit.min ? limit.min : limit.max;
  
  return `${limit.fieldName} ${direction} valid range. Value clamped to ${boundary} ${limit.unit}`.trim();
}
