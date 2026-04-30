/**
 * VB6 QUARTER Pro Input Validation Limits
 * 
 * These ranges are extracted from the QUARTER Pro 3.2 User Manual (QPRO3W.txt)
 * and enforce the same auto-clamping behavior as the VB6 application.
 * 
 * Extends quarterJrLimits.ts with Pro-specific fields.
 */

import { FieldLimit } from './quarterJrLimits';

/**
 * VB6 QUARTER Pro field validation limits
 * Source: QPRO3W.txt manual, Chapter 4
 */
export const QUARTER_PRO_LIMITS: Record<string, FieldLimit> = {
  // Vehicle Data - Pro only (manual page 4-5)
  overhang: {
    min: 16,
    max: 40,
    fieldName: 'Overhang',
    unit: 'inches',
  },

  // Final Drive - Pro only (manual page 4-6)
  finalDriveEfficiency: {
    min: 0.97,
    max: 0.98,
    fieldName: 'Final Drive Efficiency',
    unit: '',
  },

  // Aerodynamics - Pro only (manual page 4-8)
  dragCoefficient: {
    min: 0.25,
    max: 0.80,
    fieldName: 'Drag Coefficient',
    unit: '',
  },
  liftCoefficient: {
    min: 0.10,
    max: 0.80,
    fieldName: 'Lift Coefficient',
    unit: '',
  },

  // Engine Dyno Data - Pro only (manual pages 4-9 to 4-10)
  engineRPM: {
    min: 2000,
    max: 12000,
    fieldName: 'Engine RPM',
    unit: 'RPM',
  },
  engineHP: {
    min: 200,
    max: 6000,
    fieldName: 'Engine HP',
    unit: 'HP',
  },
  engineTorque: {
    min: 150,
    max: 5000,
    fieldName: 'Engine Torque',
    unit: 'lb-ft',
  },
  hpTorqueMultiplier: {
    min: 0.9,
    max: 1.1,
    fieldName: 'HP/Torque Multiplier',
    unit: '',
  },

  // Transmission - Clutch Pro fields (manual page 4-11)
  clutchLaunchRPM: {
    min: 4500,
    max: 12000,
    fieldName: 'Clutch Launch RPM',
    unit: 'RPM',
  },
  clutchSlipRPM: {
    min: 2000,
    max: 7000,
    fieldName: 'Clutch Slip RPM',
    unit: 'RPM',
  },
  clutchSlippage: {
    min: 1.00,
    max: 1.01,
    fieldName: 'Clutch Slippage',
    unit: '',
  },

  // Transmission - Converter Pro fields (manual pages 4-12 to 4-13)
  converterLaunchRPM: {
    min: 2000,
    max: 12000,
    fieldName: 'Converter Launch RPM',
    unit: 'RPM',
  },
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
  converterSlippage: {
    min: 1.03,
    max: 1.08,
    fieldName: 'Converter Slippage',
    unit: '',
  },
  converterTorqueMult: {
    min: 1.4,
    max: 2.0,
    fieldName: 'Torque Multiplication',
    unit: '',
  },

  // Transmission - Gear data (manual pages 4-14, 4-15)
  gearEfficiency: {
    min: 0.96,
    max: 0.99,
    fieldName: 'Gear Efficiency',
    unit: '',
  },
  shiftRPM: {
    min: 4500,
    max: 12500,
    fieldName: 'Shift RPM',
    unit: 'RPM',
  },

  // PMI - Pro only (manual pages 4-15 to 4-16)
  enginePMI: {
    min: 2.0,
    max: 5.0,
    fieldName: 'Engine PMI',
    unit: 'in-lbs sec²',
  },
  transPMI: {
    min: 0.1,
    max: 0.8,
    fieldName: 'Trans PMI',
    unit: 'in-lbs sec²',
  },
  tiresPMI: {
    min: 20,
    max: 60,
    fieldName: 'Tires PMI',
    unit: 'in-lbs sec²',
  },
};

/**
 * Validate HP curve according to VB6 QUARTER Pro semantics
 * 
 * Rules (manual pages 4-9 to 4-10):
 * 1. Maximum 11 RPM/power points
 * 2. RPM range: 2000-12000
 * 3. HP range: 200-6000
 * 4. Blank or zero RPM indicates end of table
 */
export interface HPCurveValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  validatedCurve: { rpm: number; hp: number }[];
}

export function validateHPCurve(
  curve: { rpm: number; hp: number }[] | undefined
): HPCurveValidationResult {
  const result: HPCurveValidationResult = {
    valid: true,
    errors: [],
    warnings: [],
    validatedCurve: [],
  };

  if (!curve || curve.length === 0) {
    return result; // Empty curve is valid (will use synthetic curve)
  }

  // Check maximum 11 points
  if (curve.length > 11) {
    result.errors.push(`HP curve exceeds maximum 11 points (has ${curve.length} points)`);
    result.valid = false;
    // Truncate to 11 points
    result.validatedCurve = curve.slice(0, 11);
  } else {
    result.validatedCurve = [...curve];
  }

  // Validate each point
  result.validatedCurve.forEach((point, index) => {
    // Check for blank/zero RPM (termination marker in VB6)
    if (point.rpm === 0) {
      result.warnings.push(`Point ${index + 1}: Zero RPM (VB6 table terminator)`);
      return;
    }

    // Validate RPM range
    if (point.rpm < QUARTER_PRO_LIMITS.engineRPM.min) {
      result.warnings.push(
        `Point ${index + 1}: RPM ${point.rpm} below minimum ${QUARTER_PRO_LIMITS.engineRPM.min}`
      );
      point.rpm = QUARTER_PRO_LIMITS.engineRPM.min;
    } else if (point.rpm > QUARTER_PRO_LIMITS.engineRPM.max) {
      result.warnings.push(
        `Point ${index + 1}: RPM ${point.rpm} above maximum ${QUARTER_PRO_LIMITS.engineRPM.max}`
      );
      point.rpm = QUARTER_PRO_LIMITS.engineRPM.max;
    }

    // Validate HP range
    if (point.hp < QUARTER_PRO_LIMITS.engineHP.min) {
      result.warnings.push(
        `Point ${index + 1}: HP ${point.hp} below minimum ${QUARTER_PRO_LIMITS.engineHP.min}`
      );
      point.hp = QUARTER_PRO_LIMITS.engineHP.min;
    } else if (point.hp > QUARTER_PRO_LIMITS.engineHP.max) {
      result.warnings.push(
        `Point ${index + 1}: HP ${point.hp} above maximum ${QUARTER_PRO_LIMITS.engineHP.max}`
      );
      point.hp = QUARTER_PRO_LIMITS.engineHP.max;
    }
  });

  return result;
}

/**
 * Apply HP/Torque multiplier to curve and reset multiplier
 * Matches VB6 Recalc button behavior (manual page 4-10)
 */
export function applyHPMultiplier(
  curve: { rpm: number; hp: number }[] | undefined,
  multiplier: number
): { rpm: number; hp: number }[] | undefined {
  if (!curve || curve.length === 0 || multiplier === 1.0) {
    return curve;
  }

  return curve.map(point => ({
    rpm: point.rpm,
    hp: Math.round(point.hp * multiplier),
  }));
}

/**
 * Calculate torque from HP and RPM
 * Formula: Torque (lb-ft) = (HP × 5252) / RPM
 */
export function calculateTorque(hp: number, rpm: number): number {
  if (rpm === 0) return 0;
  return (hp * 5252) / rpm;
}

/**
 * Calculate HP from torque and RPM
 * Formula: HP = (Torque × RPM) / 5252
 */
export function calculateHP(torque: number, rpm: number): number {
  return (torque * rpm) / 5252;
}
