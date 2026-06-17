import { z } from 'zod';
import { EnvSchema } from './env.schema';
import type { RaceLength } from '../config/raceLengths';

/** Round types for drag racing */
export const RoundTypes = [
  'T1', 'T2', 'T3', 'T4', 'T5', // Time trials
  'Q1', 'Q2', 'Q3', 'Q4',       // Qualifying
  'E1', 'E2', 'E3', 'E4', 'E5', 'E6', 'E7', // Eliminations
  'Final',                       // Final round
  'Test',                        // Test & tune
] as const;

export type RoundType = typeof RoundTypes[number];

export const RunRecordSchema = z.object({
  id: z.string(),
  createdAt: z.number(),
  vehicleId: z.string(),
  raceLength: z.custom<RaceLength>(),
  env: EnvSchema,
  
  // Run context (like Crew Chief)
  runDate: z.string().optional(),           // Date of run (YYYY-MM-DD)
  runTime: z.string().optional(),           // Time of run (HH:MM)
  runNumber: z.number().optional(),         // Run number for the day (1, 2, 3...)
  round: z.string().optional(),             // Round type (T1, E1, Final, etc.)
  lane: z.enum(['left', 'right']).optional(), // Lane choice
  carNumber: z.string().optional(),          // My car number from scanned slip (preserves letters)
  trackName: z.string().optional(),         // Track name
  
  // Timing data
  reactionTime: z.number().optional(),      // Reaction time (e.g., 0.015)
  sixtyFt: z.number().optional(),           // 60' time
  threeThirtyFt: z.number().optional(),     // 330' time
  eighthMileET: z.number().optional(),      // 1/8 mile ET
  eighthMileMPH: z.number().optional(),     // 1/8 mile MPH
  thousandFt: z.number().optional(),        // 1000' time
  quarterMileET: z.number().optional(),     // 1/4 mile ET
  quarterMileMPH: z.number().optional(),    // 1/4 mile MPH
  
  // Dial-in / Index (for bracket racing)
  dialIn: z.number().optional(),            // Dial-in time
  
  // Opponent information (for MOV calculation)
  opponent: z.object({
    name: z.string().optional(),            // Opponent name/car number
    carNumber: z.string().optional(),       // Opponent car # as string (may include letters)
    runNumber: z.number().optional(),       // Opponent run number from slip
    dialIn: z.number().optional(),          // Opponent dial-in
    reactionTime: z.number().optional(),    // Opponent RT
    sixtyFt: z.number().optional(),         // Opponent 60 ft
    threeThirtyFt: z.number().optional(),   // Opponent 330 ft
    eighthMileET: z.number().optional(),    // Opponent 1/8 ET
    eighthMileMPH: z.number().optional(),   // Opponent 1/8 MPH
    thousandFt: z.number().optional(),      // Opponent 1000 ft
    et: z.number().optional(),              // Opponent final ET
    mph: z.number().optional(),             // Opponent final MPH
    lane: z.enum(['left', 'right']).optional(),
    notes: z.string().optional(),           // Notes about opponent
  }).optional(),
  
  // Margin of Victory calculation
  marginOfVictory: z.object({
    winner: z.enum(['you', 'opponent']).optional(),
    marginSeconds: z.number().optional(),   // Time difference at finish
    marginFeet: z.number().optional(),      // Distance in feet
    marginInches: z.number().optional(),    // Distance in inches
    breakout: z.boolean().optional(),       // Did winner break out?
  }).optional(),
  
  // Run completion (for brake runs)
  runCompletion: z.object({
    didBrake: z.boolean().optional(),       // Did driver lift/brake?
    brakePoint: z.number().optional(),      // Distance (ft) where braking started
    completedET: z.number().optional(),     // Calculated full-pass ET
    completedMPH: z.number().optional(),    // Calculated full-pass MPH
  }).optional(),
  
  // Denormalized vehicle name for DB display (optional; UI also looks up by id)
  vehicleName: z.string().optional(),

  // ── Hybrid DB-first sync fields (optional, backward compatible) ──
  /** Stable client-generated id for offline dedupe / idempotent upsert. */
  clientId: z.string().optional(),
  /** Local sync state. Absent or 'synced' = persisted to DB. */
  syncStatus: z.enum(['pending', 'synced']).optional(),
  /** Server updated_at (ms epoch) for last-write-wins. */
  updatedAt: z.number().optional(),
  /** 'logged' (real run) vs 'prediction' (saved prediction scenario). */
  runKind: z.enum(['logged', 'prediction']).optional(),
  /** ET corrected to RSA Standard Day (sea level, 29.92 inHg, 60F, 0% RH). */
  correctedET: z.number().optional(),
  /** Empirical correction factor applied to reach correctedET. */
  correctionFactor: z.number().optional(),
  /** Source of the weather used: manual | forecast_prefill | observed_station | imported. */
  weatherSource: z
    .enum(['manual', 'forecast_prefill', 'observed_station', 'imported'])
    .optional(),

  prediction: z
    .object({ et_s: z.number(), mph: z.number() })
    .optional(),
  outcome: z
    .object({
      slipET_s: z.number().optional(),
      slipMPH: z.number().optional(),
      liftedFromFt: z.number().optional(),
    })
    .optional(),
  increments: z
    .array(
      z.object({
        d_ft: z.number(),
        t_s: z.number(),
        v_mph: z.number().optional(),
      })
    )
    .optional(),
  notes: z.string().optional(),
});

export type RunRecordV1 = z.infer<typeof RunRecordSchema>;
