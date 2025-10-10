import { z } from 'zod';
import { EnvSchema } from './env.schema';
import type { RaceLength } from '../config/raceLengths';

export const RunRecordSchema = z.object({
  id: z.string(),
  createdAt: z.number(),
  vehicleId: z.string(),
  raceLength: z.custom<RaceLength>(),
  env: EnvSchema,
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
