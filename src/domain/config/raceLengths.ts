export const DISTANCES = {
  EIGHTH: [60, 330, 660] as const,
  QUARTER: [60, 330, 660, 1000, 1320] as const,
};

export type RaceLength = keyof typeof DISTANCES;
