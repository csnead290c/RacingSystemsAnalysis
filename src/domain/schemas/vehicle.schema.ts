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
  tireRolloutIn: z.number().optional(),        // Tire circumference (inches) - calculated or measured
  tireWidthIn: z.number().optional(),          // gc_TireWidth
  
  // Aerodynamics
  frontalAreaFt2: z.number().optional(),       // gc_RefArea
  cd: z.number().optional(),                   // gc_DragCoef
  liftCoeff: z.number().optional(),            // gc_LiftCoef
  
  // Final Drive (rear end)
  rearGear: z.number(),                        // gc_GearRatio (final drive ratio)
  finalDriveEfficiency: z.number().optional(), // Final drive efficiency (0.95-0.98 typical)
  tireRolloutMode: z.enum(['circumference', 'diameter']).optional(), // How tire size is entered
  
  // Transmission
  transEfficiency: z.number().optional(),      // gc_Efficiency (overall trans efficiency, legacy)
  gearRatios: z.array(z.number()).optional(),  // Transmission gear ratios
  gearEfficiencies: z.array(z.number()).optional(), // Per-gear efficiencies (from QUARTER Pro table)
  shiftRPMs: z.array(z.number()).optional(),   // gc_ShiftRPM (shift by RPM)
  
  // Shift by Time (alternative to shift by RPM)
  shiftMode: z.enum(['rpm', 'time']).optional(), // 'rpm' = shift at RPM, 'time' = shift at elapsed time
  shiftTimes: z.array(z.number()).optional(),    // Shift at these elapsed times (seconds)
  
  // Rev Limiter
  revLimiterRPM: z.number().optional(),        // High-side RPM limit (cuts power above this)
  
  // Clutch (manual trans)
  clutchLaunchRPM: z.number().optional(),      // gc_LaunchRPM
  clutchSlipRPM: z.number().optional(),        // gc_SlipStallRPM
  clutchSlippage: z.number().optional(),       // gc_Slippage
  clutchLockup: z.boolean().optional(),        // gc_LockUp
  
  // Converter (automatic trans)
  converterStallRPM: z.number().optional(),    // gc_SlipStallRPM
  converterLaunchRPM: z.number().optional(),   // gc_LaunchRPM (for converter)
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
  
  // Throttle Stop Configuration
  throttleStopEnabled: z.boolean().optional(),       // Whether throttle stop is active
  throttleStopPct: z.number().optional(),            // Throttle percentage while on stop (0-100)
  throttleStopDelay: z.number().optional(),          // Delay before stop activates (seconds)
  throttleStopDuration: z.number().optional(),       // How long stop is active (seconds)
  throttleStopTargetET: z.number().optional(),       // Target ET for optimizer (seconds)
  
  // Organization
  group: z.string().optional(),                // Vehicle group/category for organization
  notes: z.string().optional(),                // User notes about the vehicle
  
  // Editor Mode - determines which input set is used for simulation
  // 'simple' = Quarter Jr style (peak HP, single shift RPM, etc.)
  // 'advanced' = Quarter Pro style (HP curve, per-gear shifts, PMI, etc.)
  editorMode: z.enum(['simple', 'advanced']).optional(), // default: 'simple'
  
  // Component References (optional - use saved components from sims)
  // When a ref is set, inline data for that component is ignored
  engineRef: z.string().optional(),            // UUID of engine (from Engine Library DB)
  engineRevision: z.number().optional(),      // Pinned revision number (null = use latest)
  clutchRef: z.string().optional(),            // ID of SavedClutch (from Clutch Sim)
  converterRef: z.string().optional(),         // ID of SavedConverter (from Converter Sim)
});

export type Vehicle = z.infer<typeof VehicleSchema>;
