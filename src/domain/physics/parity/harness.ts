/**
 * Parity harness for comparing RSACLASSIC simulation results against VB6 targets.
 * Provides types and utilities for running parity tests.
 */

import { getModel } from '../index';

/**
 * A point on the power/torque curve.
 */
export type ParityPoint = { rpm: number; hp?: number; torque?: number };

/**
 * A parity test fixture with VB6 target values.
 */
export type ParityFixture = {
  name: string;
  distanceFt: 660 | 1320;
  vb6ET_s: number;
  vb6MPH: number;
  vehicle: any;   // Vehicle configuration as used today
  env: any;       // Environment configuration as used today
  classKey?: string; // Optional explicit class key for tolerance lookup
  flags?: {
    vb6Strict?: boolean; // Force VB6-identical Float32 math path
  };
};

/**
 * Result of a parity comparison.
 */
export type ParityResult = {
  name: string;
  et: number;
  mph: number;
  etDelta: number;   // sim - vb6 (positive = slower than VB6)
  mphDelta: number;  // sim - vb6 (positive = faster than VB6)
  pass: boolean;     // Within tolerance
  classKey?: string; // Class used for tolerance lookup
  tolerance?: { et_s: number; mph: number }; // Tolerance used
};

/**
 * Summary of parity evaluation across multiple fixtures.
 */
export type ParityEvaluation = {
  meanAbsET: number;
  meanAbsMPH: number;
  results: ParityResult[];
};

/**
 * Default tolerances for parity pass/fail.
 * @deprecated Use getToleranceForFixture from parity.tolerances.ts instead
 */
export const DEFAULT_ET_TOLERANCE_S = 0.05;
export const DEFAULT_MPH_TOLERANCE = 1.0;

/**
 * Run a single parity test against VB6 target values.
 * 
 * @param fixt - Parity fixture with vehicle, env, and VB6 targets
 * @param etTolerance - ET tolerance in seconds (default 0.05s)
 * @param mphTolerance - MPH tolerance (default 1.0 mph)
 * @returns ParityResult with deltas and pass/fail
 */
export async function runParity(
  fixt: ParityFixture,
  etTolerance = DEFAULT_ET_TOLERANCE_S,
  mphTolerance = DEFAULT_MPH_TOLERANCE
): Promise<ParityResult> {
  // Build SimInput from fixture
  const simInput: any = {
    vehicle: fixt.vehicle,
    env: fixt.env,
    raceLength: fixt.distanceFt === 660 ? 'EIGHTH' : 'QUARTER',
    raceLengthFt: fixt.distanceFt,
    flags: {
      vb6Strict: fixt.flags?.vb6Strict ?? true, // Default to strict for parity
    },
  };
  
  // Pass tuning at top level if present in vehicle
  if (fixt.vehicle?.tuning) {
    simInput.tuning = fixt.vehicle.tuning;
  }

  // Run simulation directly (not through worker bridge to avoid Node issues)
  const model = getModel('RSACLASSIC');
  const result = await model.simulate(simInput as any);

  const et = result.et_s;
  const mph = result.mph;
  const etDelta = et - fixt.vb6ET_s;
  const mphDelta = mph - fixt.vb6MPH;

  const pass = Math.abs(etDelta) <= etTolerance && Math.abs(mphDelta) <= mphTolerance;

  return {
    name: fixt.name,
    et,
    mph,
    etDelta,
    mphDelta,
    pass,
    classKey: fixt.classKey,
    tolerance: { et_s: etTolerance, mph: mphTolerance },
  };
}

/**
 * Run a single parity test with per-class tolerances.
 * Automatically derives class from fixture name or uses explicit classKey.
 * 
 * @param fixt - Parity fixture with vehicle, env, and VB6 targets
 * @param toleranceMap - Map of class keys to tolerances (optional, uses defaults)
 * @returns ParityResult with deltas and pass/fail
 */
export async function runParityWithClassTolerance(
  fixt: ParityFixture,
  toleranceMap?: Record<string, { et_s: number; mph: number }>
): Promise<ParityResult> {
  // Derive class key from fixture name or use explicit
  const classKey = fixt.classKey ?? deriveClassKeyFromName(fixt.name);
  
  // Get tolerance for this class
  const defaultTolerance = { et_s: DEFAULT_ET_TOLERANCE_S, mph: DEFAULT_MPH_TOLERANCE };
  const tolerance = toleranceMap?.[classKey] ?? toleranceMap?.['default'] ?? defaultTolerance;
  
  // Run with class-specific tolerance
  const result = await runParity(fixt, tolerance.et_s, tolerance.mph);
  result.classKey = classKey;
  
  return result;
}

/**
 * Derive a class key from a fixture name.
 * Simple heuristic based on common naming patterns.
 */
function deriveClassKeyFromName(name: string): string {
  const lower = name.toLowerCase();
  
  if (lower.includes('prostock') || lower.includes('pro_stock') || lower.includes('pro-stock')) {
    return 'prostock';
  }
  if (lower.includes('topfuel') || lower.includes('top_fuel') || lower.includes('top-fuel') || lower.includes('tf_')) {
    return 'topfuel';
  }
  if (lower.includes('funnycar') || lower.includes('funny_car') || lower.includes('funny-car') || lower.includes('fc_')) {
    return 'funnycar';
  }
  if (lower.includes('psm') || lower.includes('promstock') || lower.includes('pro_mod')) {
    return 'psm';
  }
  
  return 'default';
}

/**
 * Evaluate multiple parity fixtures and compute summary statistics.
 * 
 * @param fixts - Array of parity fixtures to evaluate
 * @param etTolerance - ET tolerance in seconds (default 0.05s)
 * @param mphTolerance - MPH tolerance (default 1.0 mph)
 * @returns Evaluation summary with mean absolute errors and individual results
 */
export async function evaluate(
  fixts: ParityFixture[],
  etTolerance = DEFAULT_ET_TOLERANCE_S,
  mphTolerance = DEFAULT_MPH_TOLERANCE
): Promise<ParityEvaluation> {
  const results: ParityResult[] = [];

  for (const fixt of fixts) {
    try {
      const result = await runParity(fixt, etTolerance, mphTolerance);
      results.push(result);
    } catch (err) {
      // Record failed simulation as NaN with large delta
      results.push({
        name: fixt.name,
        et: NaN,
        mph: NaN,
        etDelta: Infinity,
        mphDelta: Infinity,
        pass: false,
      });
      console.error(`[PARITY] ${fixt.name} failed:`, err);
    }
  }

  // Compute mean absolute errors (excluding NaN results)
  const validResults = results.filter(r => Number.isFinite(r.etDelta));
  const meanAbsET = validResults.length > 0
    ? validResults.reduce((sum, r) => sum + Math.abs(r.etDelta), 0) / validResults.length
    : NaN;
  const meanAbsMPH = validResults.length > 0
    ? validResults.reduce((sum, r) => sum + Math.abs(r.mphDelta), 0) / validResults.length
    : NaN;

  return {
    meanAbsET,
    meanAbsMPH,
    results,
  };
}

/**
 * Format parity results as a summary string.
 */
export function formatParitySummary(evaluation: ParityEvaluation): string {
  const lines: string[] = [
    `Parity Evaluation Summary`,
    `========================`,
    `Mean Absolute ET Delta: ${evaluation.meanAbsET.toFixed(3)}s`,
    `Mean Absolute MPH Delta: ${evaluation.meanAbsMPH.toFixed(2)} mph`,
    ``,
    `Results:`,
  ];

  for (const r of evaluation.results) {
    const status = r.pass ? '✓' : '✗';
    const etSign = r.etDelta >= 0 ? '+' : '';
    const mphSign = r.mphDelta >= 0 ? '+' : '';
    lines.push(
      `  ${status} ${r.name}: ET=${r.et.toFixed(3)}s (${etSign}${r.etDelta.toFixed(3)}s), ` +
      `MPH=${r.mph.toFixed(1)} (${mphSign}${r.mphDelta.toFixed(1)})`
    );
  }

  const passCount = evaluation.results.filter(r => r.pass).length;
  lines.push(``);
  lines.push(`Passed: ${passCount}/${evaluation.results.length}`);

  return lines.join('\n');
}
