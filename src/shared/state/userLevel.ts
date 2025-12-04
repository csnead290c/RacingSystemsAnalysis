/**
 * User Level / Program Tier System
 * 
 * This is the SINGLE SOURCE OF TRUTH for user access levels.
 * 
 * Program Tiers (matching VB6 product line):
 * - quarterJr: Basic mode - peak HP/RPM only, calculated parameters
 * - quarterPro: Full mode - complete HP curve, all parameters editable
 * - admin: Developer mode - all features + dev tools
 * 
 * Future expansion possibilities:
 * - bonnevillePro: Top speed simulation mode
 * - enterprise: Multi-user, fleet management
 */

// ============================================================================
// Types
// ============================================================================

/**
 * User access levels (program tiers)
 * 
 * IMPORTANT: Order matters - higher index = more access
 */
export const USER_LEVELS = ['quarterJr', 'quarterPro', 'admin'] as const;
export type UserLevel = typeof USER_LEVELS[number];

/**
 * Display names for each level
 */
export const USER_LEVEL_DISPLAY: Record<UserLevel, string> = {
  quarterJr: 'Quarter Jr',
  quarterPro: 'Quarter Pro', 
  admin: 'Admin / Developer',
};

/**
 * Descriptions for each level
 */
export const USER_LEVEL_DESCRIPTIONS: Record<UserLevel, string> = {
  quarterJr: 'Basic mode - enter peak HP and RPM, other parameters are calculated automatically',
  quarterPro: 'Full mode - enter complete HP curve and all vehicle parameters',
  admin: 'Developer mode - all features plus dev tools and diagnostics',
};

// ============================================================================
// Access Control
// ============================================================================

/**
 * Check if a user level has access to a required level
 */
export function hasAccess(currentLevel: UserLevel, requiredLevel: UserLevel): boolean {
  const currentIndex = USER_LEVELS.indexOf(currentLevel);
  const requiredIndex = USER_LEVELS.indexOf(requiredLevel);
  return currentIndex >= requiredIndex;
}

/**
 * Check if user has QuarterPro or higher access
 */
export function hasProAccess(level: UserLevel): boolean {
  return hasAccess(level, 'quarterPro');
}

/**
 * Check if user has Admin access
 */
export function hasAdminAccess(level: UserLevel): boolean {
  return hasAccess(level, 'admin');
}

// ============================================================================
// Input Field Visibility
// ============================================================================

/**
 * Input field categories and their required access levels
 */
export type InputCategory = 
  | 'basic'           // Available to all (weight, wheelbase, tire size)
  | 'engine_basic'    // QuarterJr engine inputs (peak HP, peak RPM, displacement)
  | 'engine_curve'    // QuarterPro only (full HP curve)
  | 'drivetrain_basic'// Basic drivetrain (gear ratios, final drive)
  | 'drivetrain_adv'  // Advanced drivetrain (per-gear efficiency, shift RPMs)
  | 'aero'            // Aerodynamics (Cd, Cl, frontal area)
  | 'pmi'             // Polar moments of inertia
  | 'clutch_conv'     // Clutch/converter settings
  | 'cg'              // Center of gravity
  | 'dev';            // Developer-only fields

/**
 * Required access level for each input category
 */
export const INPUT_CATEGORY_ACCESS: Record<InputCategory, UserLevel> = {
  basic: 'quarterJr',
  engine_basic: 'quarterJr',
  engine_curve: 'quarterPro',
  drivetrain_basic: 'quarterJr',
  drivetrain_adv: 'quarterPro',
  aero: 'quarterPro',
  pmi: 'quarterPro',
  clutch_conv: 'quarterPro',
  cg: 'quarterPro',
  dev: 'admin',
};

/**
 * Check if a user can access an input category
 */
export function canAccessCategory(level: UserLevel, category: InputCategory): boolean {
  return hasAccess(level, INPUT_CATEGORY_ACCESS[category]);
}

/**
 * Get all accessible categories for a user level
 */
export function getAccessibleCategories(level: UserLevel): InputCategory[] {
  return (Object.keys(INPUT_CATEGORY_ACCESS) as InputCategory[])
    .filter(cat => canAccessCategory(level, cat));
}

// ============================================================================
// QuarterJr vs QuarterPro Input Lists
// ============================================================================

/**
 * Inputs available in QuarterJr mode
 */
export const QUARTER_JR_INPUTS = {
  engine: [
    'peakHP',
    'rpmAtPeakHP',
    'displacement_cid',
    'fuelSystem',
  ],
  vehicle: [
    'weight_lb',
    'wheelbase_in',
    'tireDia_in',
    'tireWidth_in',
    'rollout_in',
    'bodyStyle',
  ],
  drivetrain: [
    'gearRatios',
    'finalDrive',
    'shiftRPM',  // Single value for all gears
    'isConverter',
    'slipStallRPM',
    'converterDia_in',  // Only if converter
  ],
  environment: [
    'elevation_ft',
    'barometer_inHg',
    'temperature_F',
    'relHumidity_pct',
    'trackTemp_F',
    'tractionIndex',
    'wind_mph',
    'wind_angle_deg',
  ],
} as const;

/**
 * Additional inputs available in QuarterPro mode (on top of QuarterJr)
 */
export const QUARTER_PRO_ADDITIONAL_INPUTS = {
  engine: [
    'hpCurve',          // Full HP curve (replaces peak HP/RPM)
    'hpTorqueMultiplier',
  ],
  vehicle: [
    'staticFrontWeight_lb',
    'cgHeight_in',
    'overhang_in',
  ],
  drivetrain: [
    'perGearEff',       // Per-gear efficiencies
    'shiftsRPM',        // Per-gear shift RPMs (replaces single shiftRPM)
    'launchRPM',
    'slippage',
    'torqueMult',
    'lockup',
  ],
  aero: [
    'frontalArea_ft2',
    'Cd',
    'Cl',
  ],
  pmi: [
    'engine_flywheel_clutch',
    'transmission_driveshaft',
    'tires_wheels_ringgear',
  ],
} as const;

/**
 * Get the list of visible inputs for a user level
 */
export function getVisibleInputs(level: UserLevel): {
  engine: readonly string[];
  vehicle: readonly string[];
  drivetrain: readonly string[];
  environment: readonly string[];
  aero: readonly string[];
  pmi: readonly string[];
} {
  if (hasProAccess(level)) {
    // QuarterPro: All inputs
    return {
      engine: [...QUARTER_JR_INPUTS.engine, ...QUARTER_PRO_ADDITIONAL_INPUTS.engine],
      vehicle: [...QUARTER_JR_INPUTS.vehicle, ...QUARTER_PRO_ADDITIONAL_INPUTS.vehicle],
      drivetrain: [...QUARTER_JR_INPUTS.drivetrain, ...QUARTER_PRO_ADDITIONAL_INPUTS.drivetrain],
      environment: [...QUARTER_JR_INPUTS.environment],
      aero: [...QUARTER_PRO_ADDITIONAL_INPUTS.aero],
      pmi: [...QUARTER_PRO_ADDITIONAL_INPUTS.pmi],
    };
  }
  
  // QuarterJr: Basic inputs only
  return {
    engine: QUARTER_JR_INPUTS.engine,
    vehicle: QUARTER_JR_INPUTS.vehicle,
    drivetrain: QUARTER_JR_INPUTS.drivetrain,
    environment: QUARTER_JR_INPUTS.environment,
    aero: [],
    pmi: [],
  };
}
