import { z } from 'zod';
import type { RaceLength } from '../config/raceLengths';

/**
 * Transmission type - determines whether clutch or converter fields are used
 */
export type TransmissionType = 'clutch' | 'converter';

/**
 * Full Vehicle schema with all VB6-compatible fields.
 * Fields marked optional have sensible defaults.
 */
export const VehicleSchema = z.object({
  // Identity
  id: z.string(),
  name: z.string(),
  defaultRaceLength: z.custom<RaceLength>(),
  
  // Transmission type (determines clutch vs converter)
  transmissionType: z.enum(['clutch', 'converter']).optional(), // default: 'clutch'
  
  // Mass & Geometry
  weightLb: z.number(),
  staticFrontWeightLb: z.number().optional(),  // gc_StaticFWt (default: 38% of weight)
  wheelbaseIn: z.number().optional(),          // gc_Wheelbase
  overhangIn: z.number().optional(),           // gc_Overhang
  cgHeightIn: z.number().optional(),           // gc_YCG
  rolloutIn: z.number(),                       // gc_Rollout (staging beam)
  bodyStyle: z.number().optional(),            // gc_BodyStyle (1=car, 8=motorcycle)
  
  // Tires
  tireDiaIn: z.number(),                       // gc_TireDia
  tireWidthIn: z.number().optional(),          // gc_TireWidth
  
  // Aerodynamics
  frontalAreaFt2: z.number().optional(),       // gc_RefArea
  cd: z.number().optional(),                   // gc_DragCoef
  liftCoeff: z.number().optional(),            // gc_LiftCoef
  
  // Drivetrain
  rearGear: z.number(),                        // gc_GearRatio (final drive)
  transEfficiency: z.number().optional(),      // gc_Efficiency
  gearRatios: z.array(z.number()).optional(),  // Transmission gear ratios
  gearEfficiencies: z.array(z.number()).optional(), // Per-gear efficiencies
  shiftRPMs: z.array(z.number()).optional(),   // gc_ShiftRPM
  
  // Clutch (manual trans)
  clutchLaunchRPM: z.number().optional(),      // gc_LaunchRPM
  clutchSlipRPM: z.number().optional(),        // gc_SlipStallRPM
  clutchSlippage: z.number().optional(),       // gc_Slippage
  clutchLockup: z.boolean().optional(),        // gc_LockUp
  
  // Converter (automatic trans)
  converterStallRPM: z.number().optional(),    // gc_SlipStallRPM
  converterTorqueMult: z.number().optional(),  // gc_TorqueMult
  converterSlippage: z.number().optional(),    // gc_Slippage
  converterDiameterIn: z.number().optional(),  // gc_ConvDia
  converterLockup: z.boolean().optional(),     // gc_LockUp
  
  // PMI (Polar Moments of Inertia)
  enginePMI: z.number().optional(),            // gc_EnginePMI
  transPMI: z.number().optional(),             // gc_TransPMI
  tiresPMI: z.number().optional(),             // gc_TiresPMI
  
  // Engine - QuarterJr mode (peak HP/RPM only)
  powerHP: z.number(),                         // gc_PeakHP (for simple mode)
  rpmAtPeakHP: z.number().optional(),          // gc_RPMPeakHP (default: 6500)
  displacementCID: z.number().optional(),      // gc_Displacement (for synthetic curve)
  
  // Engine - QuarterPro mode (full HP curve)
  hpCurve: z.array(z.object({                  // Full HP curve
    rpm: z.number(),
    hp: z.number(),
  })).optional(),
  hpTorqueMultiplier: z.number().optional(),   // gc_HPTQMult
  
  // Fuel
  fuelType: z.string().optional(),             // gc_FuelSystem (legacy)
  fuelSystem: z.string().optional(),           // VB6 fuel system type (Gas+Carb, etc.)
  
  // N2O Option (QuarterJr)
  n2oEnabled: z.boolean().optional(),          // gc_N2O
  
  // Organization
  group: z.string().optional(),                // Vehicle group/category for organization
  notes: z.string().optional(),                // User notes about the vehicle
});

export type Vehicle = z.infer<typeof VehicleSchema>;
