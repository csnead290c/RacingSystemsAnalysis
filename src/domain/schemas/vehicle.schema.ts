import { z } from 'zod';
import type { RaceLength } from '../config/raceLengths';

export const VehicleSchema = z.object({
  id: z.string(),
  name: z.string(),
  weightLb: z.number(),
  tireDiaIn: z.number(),
  rearGear: z.number(),
  rolloutIn: z.number(),
  powerHP: z.number(),
  defaultRaceLength: z.custom<RaceLength>(),
});

export type Vehicle = z.infer<typeof VehicleSchema>;
