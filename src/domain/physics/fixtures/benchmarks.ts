/**
 * Legacy RSA benchmarks from Quarter Pro / Quarter Jr.
 * Expected outputs from VB6 printouts for validation of RSACLASSIC model.
 * Tolerances start loose; tighten as the simulator matures.
 */

export type RaceLength = 'EIGHTH' | 'QUARTER';

/**
 * Target performance for a specific race length.
 */
export interface RaceLengthTarget {
  /** Expected elapsed time in seconds */
  et_s: number;
  /** Expected trap speed in mph */
  mph: number;
  /** Tolerance for ET in seconds (±) */
  tolET_s: number;
  /** Tolerance for MPH (±) */
  tolMPH: number;
  /** Optional sanity anchors for key splits (e.g., t60_s, t330_s) */
  anchors?: Record<string, number>;
}

/**
 * Legacy benchmark from Quarter Pro or Quarter Jr.
 */
export interface LegacyBenchmark {
  /** Benchmark name (vehicle/class identifier) */
  name: string;
  /** Source application */
  source: 'QuarterPro' | 'QuarterJr';
  /** Performance targets by race length */
  raceLengthTargets: {
    EIGHTH?: RaceLengthTarget;
    QUARTER?: RaceLengthTarget;
  };
}

/**
 * Legacy benchmarks from Quarter Pro / Quarter Jr printouts.
 * Values come from uploaded VB6 output files.
 * 
 * NOTE: These represent the "gold standard" from the original VB6 applications.
 * RSACLASSIC should match these within specified tolerances.
 */
export const LEGACY_BENCHMARKS: LegacyBenchmark[] = [
  {
    name: 'SuperGas_Pro',
    source: 'QuarterPro',
    raceLengthTargets: {
      EIGHTH: { et_s: 6.27, mph: 108.2, tolET_s: 0.20, tolMPH: 3.0, anchors: { t60_s: 1.35 } },
      QUARTER: { et_s: 9.90, mph: 135.1, tolET_s: 0.30, tolMPH: 4.0 },
    },
  },
  {
    name: 'TA_Dragster_Pro',
    source: 'QuarterPro',
    raceLengthTargets: {
      EIGHTH: { et_s: 3.56, mph: 205.3, tolET_s: 0.12, tolMPH: 5.0 },
      QUARTER: { et_s: 5.52, mph: 243.1, tolET_s: 0.12, tolMPH: 6.0 },
    },
  },
  {
    name: 'ProStock_Pro',
    source: 'QuarterPro',
    raceLengthTargets: {
      EIGHTH: { et_s: 4.37, mph: 160.9, tolET_s: 0.12, tolMPH: 4.0, anchors: { t60_s: 1.01 } },
      QUARTER: { et_s: 6.80, mph: 202.3, tolET_s: 0.15, tolMPH: 5.0 },
    },
  },
  {
    name: 'FunnyCar_Pro',
    source: 'QuarterPro',
    raceLengthTargets: {
      EIGHTH: { et_s: 3.37, mph: 243.5, tolET_s: 0.10, tolMPH: 6.0 },
      QUARTER: { et_s: 4.98, mph: 297.0, tolET_s: 0.10, tolMPH: 7.0 },
    },
  },
  {
    name: 'Motorcycle_Pro',
    source: 'QuarterPro',
    raceLengthTargets: {
      EIGHTH: { et_s: 7.63, mph: 91.1, tolET_s: 0.25, tolMPH: 3.0 },
      QUARTER: { et_s: 11.99, mph: 111.3, tolET_s: 0.30, tolMPH: 3.0 },
    },
  },
  {
    name: 'SuperComp_Pro',
    source: 'QuarterPro',
    raceLengthTargets: {
      EIGHTH: { et_s: 5.66, mph: 120.4, tolET_s: 0.18, tolMPH: 4.0 },
      QUARTER: { et_s: 8.90, mph: 151.6, tolET_s: 0.20, tolMPH: 4.0 },
    },
  },
  {
    name: 'Motorcycle_Jr',
    source: 'QuarterJr',
    raceLengthTargets: {
      EIGHTH: { et_s: 7.45, mph: 89.4, tolET_s: 0.25, tolMPH: 3.0 },
      QUARTER: { et_s: 12.00, mph: 104.5, tolET_s: 0.30, tolMPH: 3.0 },
    },
  },
  {
    name: 'ETRacer_Jr',
    source: 'QuarterJr',
    raceLengthTargets: {
      EIGHTH: { et_s: 8.60, mph: 80.3, tolET_s: 0.30, tolMPH: 3.0 },
      QUARTER: { et_s: 13.50, mph: 100.8, tolET_s: 0.35, tolMPH: 3.5 },
    },
  },
  {
    name: 'EXP_Jr',
    source: 'QuarterJr',
    raceLengthTargets: {
      EIGHTH: { et_s: 5.15, mph: 130.3, tolET_s: 0.15, tolMPH: 4.0 },
      QUARTER: { et_s: 8.18, mph: 160.2, tolET_s: 0.20, tolMPH: 4.0 },
    },
  },
  {
    name: 'EXP_050523_Jr',
    source: 'QuarterJr',
    raceLengthTargets: {
      EIGHTH: { et_s: 5.06, mph: 132.5, tolET_s: 0.15, tolMPH: 4.0 },
      QUARTER: { et_s: 8.04, mph: 163.5, tolET_s: 0.20, tolMPH: 4.0 },
    },
  },
];

/**
 * Get benchmark by name.
 * 
 * @param name - Benchmark name
 * @returns Benchmark if found, undefined otherwise
 */
export function getBenchmark(name: string): LegacyBenchmark | undefined {
  return LEGACY_BENCHMARKS.find((b) => b.name === name);
}

/**
 * Get all benchmarks from a specific source.
 * 
 * @param source - Source application
 * @returns Array of benchmarks from that source
 */
export function getBenchmarksBySource(
  source: 'QuarterPro' | 'QuarterJr'
): LegacyBenchmark[] {
  return LEGACY_BENCHMARKS.filter((b) => b.source === source);
}

/**
 * Validate simulation result against benchmark.
 * 
 * @param benchmark - Benchmark to validate against
 * @param raceLength - Race length to check
 * @param et_s - Simulated elapsed time
 * @param mph - Simulated trap speed
 * @returns Validation result with pass/fail and deltas
 */
export function validateAgainstBenchmark(
  benchmark: LegacyBenchmark,
  raceLength: RaceLength,
  et_s: number,
  mph: number
): {
  pass: boolean;
  etPass: boolean;
  mphPass: boolean;
  etDelta: number;
  mphDelta: number;
  etTolerance: number;
  mphTolerance: number;
} {
  const target = benchmark.raceLengthTargets[raceLength];

  if (!target) {
    throw new Error(
      `Benchmark ${benchmark.name} has no target for ${raceLength}`
    );
  }

  const etDelta = et_s - target.et_s;
  const mphDelta = mph - target.mph;

  const etPass = Math.abs(etDelta) <= target.tolET_s;
  const mphPass = Math.abs(mphDelta) <= target.tolMPH;

  return {
    pass: etPass && mphPass,
    etPass,
    mphPass,
    etDelta,
    mphDelta,
    etTolerance: target.tolET_s,
    mphTolerance: target.tolMPH,
  };
}
