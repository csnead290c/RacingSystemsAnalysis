import { z } from 'zod';

/**
 * Saved Component Schemas
 * 
 * These schemas define reusable components that can be created in their
 * respective simulators and then referenced by vehicles. This allows:
 * 
 * 1. Engine Sim → SavedEngine → Vehicle.engineRef
 * 2. Clutch Sim → SavedClutch → Vehicle.clutchRef  
 * 3. Converter Sim → SavedConverter → Vehicle.converterRef
 * 
 * Users can also manually enter component data directly in the vehicle
 * editor without going through the simulators.
 */

// ============================================================================
// HP Curve Point (shared)
// ============================================================================

export const HpCurvePointSchema = z.object({
  rpm: z.number(),
  hp: z.number(),
  torque: z.number().optional(), // Calculated from HP if not provided
});

export type HpCurvePoint = z.infer<typeof HpCurvePointSchema>;

// ============================================================================
// Saved Engine
// ============================================================================

export type EngineSource = 'engineJr' | 'enginePro' | 'manual' | 'dyno';
export type AspirationType = 'na' | 'turbo' | 'supercharged' | 'nitrous';

export const SavedEngineSchema = z.object({
  id: z.string(),
  name: z.string(),
  createdAt: z.number(),
  updatedAt: z.number().optional(),
  source: z.enum(['engineJr', 'enginePro', 'manual', 'dyno']),
  
  // Core power data - at minimum need peak HP
  peakHP: z.number(),
  rpmAtPeakHP: z.number(),
  peakTorque: z.number().optional(),
  rpmAtPeakTorque: z.number().optional(),
  
  // Full HP curve (Pro feature) - supersedes peak values when present
  hpCurve: z.array(HpCurvePointSchema).optional(),
  
  // Engine specs
  displacement: z.number().optional(),        // CID
  fuelType: z.string().optional(),            // Gasoline, Methanol, etc.
  aspirationType: z.enum(['na', 'turbo', 'supercharged', 'nitrous']).optional(),
  
  // HP/Torque multiplier for fuel correction
  hpTorqueMultiplier: z.number().optional(),  // gc_HPTQMult
  
  // Engine Pro config (preserved if created from Engine Pro sim)
  engineProConfig: z.any().optional(),
  
  // User notes
  notes: z.string().optional(),
});

export type SavedEngine = z.infer<typeof SavedEngineSchema>;

// ============================================================================
// Saved Clutch
// ============================================================================

export type ClutchSource = 'clutchSim' | 'manual';

export const SavedClutchSchema = z.object({
  id: z.string(),
  name: z.string(),
  createdAt: z.number(),
  updatedAt: z.number().optional(),
  source: z.enum(['clutchSim', 'manual']),
  
  // Core clutch data
  launchRPM: z.number(),
  slipRPM: z.number(),
  slippage: z.number(),                       // gc_Slippage (typically 1.0-1.02)
  lockup: z.boolean().optional(),             // gc_LockUp
  
  // Clutch Sim config (preserved if created from Clutch Sim)
  clutchSimConfig: z.any().optional(),
  
  // User notes
  notes: z.string().optional(),
});

export type SavedClutch = z.infer<typeof SavedClutchSchema>;

// ============================================================================
// Saved Converter
// ============================================================================

export type ConverterSource = 'converterSim' | 'manual';

export const SavedConverterSchema = z.object({
  id: z.string(),
  name: z.string(),
  createdAt: z.number(),
  updatedAt: z.number().optional(),
  source: z.enum(['converterSim', 'manual']),
  
  // Core converter data
  stallRPM: z.number(),
  torqueMultiplier: z.number(),               // gc_TorqueMult (typically 1.8-2.5)
  slippage: z.number(),                       // gc_Slippage
  diameter: z.number().optional(),            // gc_ConvDia (inches)
  lockup: z.boolean().optional(),             // gc_LockUp
  
  // Stall curve (future - for advanced converter modeling)
  stallCurve: z.array(z.object({
    rpm: z.number(),
    mult: z.number(),
  })).optional(),
  
  // Converter Sim config (preserved if created from Converter Sim)
  converterSimConfig: z.any().optional(),
  
  // User notes
  notes: z.string().optional(),
});

export type SavedConverter = z.infer<typeof SavedConverterSchema>;

// ============================================================================
// Field Requirement Rules
// ============================================================================

/**
 * Defines which fields are required, optional, or superseded by other fields.
 * Used by the vehicle editor to show validation state and hints.
 */
export interface FieldRequirements {
  // Always required for simulation
  required: string[];
  
  // Required unless one of the superseding fields is present
  requiredUnless: Record<string, string[]>;
  
  // Optional but recommended for accuracy
  recommended: string[];
  
  // Pro-only fields (hidden or locked for Jr users)
  proOnly: string[];
}

export const VEHICLE_FIELD_REQUIREMENTS: FieldRequirements = {
  required: [
    'name',
    'weightLb',
    'rolloutIn',
    'tireDiaIn',
    'rearGear',
  ],
  
  requiredUnless: {
    // Power fields - not required if engine ref or HP curve present
    powerHP: ['engineRef', 'hpCurve'],
    rpmAtPeakHP: ['engineRef', 'hpCurve'],
    
    // Clutch fields - not required if clutch ref present (when trans=clutch)
    clutchLaunchRPM: ['clutchRef'],
    clutchSlipRPM: ['clutchRef'],
    
    // Converter fields - not required if converter ref present (when trans=converter)
    converterStallRPM: ['converterRef'],
    converterTorqueMult: ['converterRef'],
  },
  
  recommended: [
    'wheelbaseIn',
    'gearRatios',
    'shiftRPMs',
    'displacementCID',
    'fuelType',
  ],
  
  proOnly: [
    // Geometry
    'staticFrontWeightLb',
    'cgHeightIn',
    'overhangIn',
    
    // Aerodynamics
    'frontalAreaFt2',
    'cd',
    'liftCoeff',
    
    // Engine
    'hpCurve',
    'hpTorqueMultiplier',
    
    // Drivetrain
    'gearEfficiencies',
    'transEfficiency',
    
    // PMI
    'enginePMI',
    'transPMI',
    'tiresPMI',
    
    // Converter
    'converterDiameterIn',
    
    // Throttle Stop
    'throttleStopEnabled',
    'throttleStopPct',
    'throttleStopDelay',
    'throttleStopDuration',
    'throttleStopTargetET',
  ],
};

/**
 * Check if a field is superseded by another field's presence
 */
export function isFieldSuperseded(
  fieldName: string,
  vehicle: Record<string, unknown>
): boolean {
  const supersedingFields = VEHICLE_FIELD_REQUIREMENTS.requiredUnless[fieldName];
  if (!supersedingFields) return false;
  
  return supersedingFields.some(sf => {
    const value = vehicle[sf];
    if (Array.isArray(value)) return value.length > 0;
    return value !== undefined && value !== null && value !== '';
  });
}

/**
 * Get validation status for a vehicle
 */
export function validateVehicle(
  vehicle: Record<string, unknown>,
  _isPro: boolean = false
): { valid: boolean; missing: string[]; warnings: string[] } {
  const missing: string[] = [];
  const warnings: string[] = [];
  
  // Check required fields
  for (const field of VEHICLE_FIELD_REQUIREMENTS.required) {
    const value = vehicle[field];
    if (value === undefined || value === null || value === '') {
      missing.push(field);
    }
  }
  
  // Check conditionally required fields
  for (const [field] of Object.entries(VEHICLE_FIELD_REQUIREMENTS.requiredUnless)) {
    if (isFieldSuperseded(field, vehicle)) continue;
    
    const value = vehicle[field];
    if (value === undefined || value === null || value === '') {
      // Check if this field applies based on transmission type
      if (field.startsWith('clutch') && vehicle.transmissionType !== 'clutch') continue;
      if (field.startsWith('converter') && vehicle.transmissionType !== 'converter') continue;
      
      missing.push(field);
    }
  }
  
  // Check recommended fields
  for (const field of VEHICLE_FIELD_REQUIREMENTS.recommended) {
    const value = vehicle[field];
    if (value === undefined || value === null || value === '') {
      warnings.push(`${field} recommended for accuracy`);
    }
  }
  
  return {
    valid: missing.length === 0,
    missing,
    warnings,
  };
}
