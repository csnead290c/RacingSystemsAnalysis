import { z } from 'zod';

export const EnvSchema = z.object({
  elevation: z.number(),
  temperatureF: z.number(),
  barometerInHg: z.number(),
  humidityPct: z.number().min(0).max(100),
  trackTempF: z.number().optional(),
  tractionIndex: z.number().optional(),
  windMph: z.number().optional(),
  windAngleDeg: z.number().optional(),
});

export type Env = z.infer<typeof EnvSchema>;

/**
 * Default environment values (sea level, standard conditions).
 */
export const DEFAULT_ENV: Env = {
  elevation: 0,
  temperatureF: 75,
  barometerInHg: 29.92,
  humidityPct: 50,
};
