/**
 * RSACLASSIC parity tests against legacy RSA (Quarter Pro / Quarter Jr) printouts.
 * Validates that RSACLASSIC produces results within tolerance of VB6 applications.
 * 
 * Uses window MPH calculation from traces (594-660 ft for eighth, 1254-1320 ft for quarter)
 * to match VB6 trap speed measurement methodology.
 */

import { describe, it, expect } from 'vitest';
import { getModel } from '../domain/physics';
import { LEGACY_BENCHMARKS } from '../domain/physics/fixtures/benchmarks';
import { BENCHMARK_CONFIGS, validateBenchmarkConfig } from '../domain/physics/fixtures/benchmark-configs';
import type { RaceLength } from '../domain/physics/fixtures/benchmarks';

// Helper that runs the worker-free model (unit-test context) synchronously.
const model = getModel('RSACLASSIC');

/**
 * Interpolate trace at specific distance using linear interpolation.
 * @param traces - Simulation traces
 * @param s_ft - Target distance in feet
 * @returns Interpolated time and velocity
 */
function interpAtS(
  traces: Array<{ t_s: number; v_mph: number; s_ft: number }>,
  s_ft: number
): { t_s: number; v_fps: number } {
  if (!traces || traces.length === 0) {
    throw new Error('No traces available for interpolation');
  }

  // Find surrounding points
  for (let i = 0; i < traces.length - 1; i++) {
    const p1 = traces[i];
    const p2 = traces[i + 1];

    if (s_ft >= p1.s_ft && s_ft <= p2.s_ft) {
      // Linear interpolation
      const t = (s_ft - p1.s_ft) / (p2.s_ft - p1.s_ft);
      const t_s = p1.t_s + t * (p2.t_s - p1.t_s);
      const v_mph = p1.v_mph + t * (p2.v_mph - p1.v_mph);
      const v_fps = v_mph / 0.681818;
      return { t_s, v_fps };
    }
  }

  // If outside range, return closest point
  if (s_ft < traces[0].s_ft) {
    return { t_s: traces[0].t_s, v_fps: traces[0].v_mph / 0.681818 };
  }
  const last = traces[traces.length - 1];
  return { t_s: last.t_s, v_fps: last.v_mph / 0.681818 };
}

/**
 * Calculate average velocity between two distances.
 * @param traces - Simulation traces
 * @param s0 - Start distance in feet
 * @param s1 - End distance in feet
 * @returns Average velocity in fps
 */
function avgVfpsBetween(
  traces: Array<{ t_s: number; v_mph: number; s_ft: number }>,
  s0: number,
  s1: number
): number {
  const p0 = interpAtS(traces, s0);
  const p1 = interpAtS(traces, s1);

  // Average velocity = distance / time
  const distance_ft = s1 - s0;
  const time_s = p1.t_s - p0.t_s;

  if (time_s <= 0) {
    // Fallback to average of velocities
    return (p0.v_fps + p1.v_fps) / 2;
  }

  return distance_ft / time_s;
}

/**
 * Calculate window MPH for trap speed measurement.
 * Uses 594-660 ft for eighth mile, 1254-1320 ft for quarter mile.
 * @param traces - Simulation traces
 * @param raceLength - Race length
 * @returns Window MPH
 */
function windowMPH(
  traces: Array<{ t_s: number; v_mph: number; s_ft: number }> | undefined,
  raceLength: RaceLength
): number {
  if (!traces || traces.length === 0) {
    throw new Error('No traces available for window MPH calculation');
  }

  // Define trap windows (66 ft before finish)
  const s0 = raceLength === 'EIGHTH' ? 594 : 1254;
  const s1 = raceLength === 'EIGHTH' ? 660 : 1320;

  const avgVfps = avgVfpsBetween(traces, s0, s1);
  return avgVfps * 0.681818; // Convert fps to mph
}

describe('RSACLASSIC Parity vs Legacy RSA Printouts', () => {
  const LENGTHS: RaceLength[] = ['EIGHTH', 'QUARTER'];

  for (const bm of LEGACY_BENCHMARKS) {
    describe(bm.name, () => {
      for (const len of LENGTHS) {
        const target = bm.raceLengthTargets[len];
        if (!target) continue;

        it(`${len}: ET and MPH within tolerance`, () => {
          // Load detailed config from benchmark-configs
          const config = BENCHMARK_CONFIGS[bm.name];

          if (!config) {
            // Skip if no config available yet
            console.warn(`No config for ${bm.name}, skipping test`);
            return;
          }

          // Validate config has all required VB6 parameters
          validateBenchmarkConfig(config);

          // Build input from config
          const input = {
            vehicle: {
              // Extended fields first
              ...config.vehicle,
              // Required base fields (override if needed)
              id: `benchmark-${bm.name}`,
              name: bm.name,
              defaultRaceLength: len,
              weightLb: config.vehicle.weightLb,
              tireDiaIn: config.vehicle.tireDiaIn ?? 28,
              rearGear: config.vehicle.finalDrive ?? 3.73,
              rolloutIn: config.vehicle.rolloutIn ?? 9,
              powerHP: config.vehicle.powerHP ?? 500,
            },
            env: config.env,
            raceLength: len,
          };

          const res = model.simulate(input);

          // Use window MPH from meta if available, otherwise calculate from traces
          let measuredMPH: number;
          if (res.meta.windowMPH) {
            if (len === 'EIGHTH' && res.meta.windowMPH.e660_mph !== undefined) {
              measuredMPH = res.meta.windowMPH.e660_mph;
            } else if (len === 'QUARTER' && res.meta.windowMPH.q1320_mph !== undefined) {
              measuredMPH = res.meta.windowMPH.q1320_mph;
            } else {
              // Fall back to calculating from traces
              try {
                measuredMPH = windowMPH(res.traces, len);
              } catch {
                measuredMPH = res.mph;
              }
            }
          } else {
            // Calculate from traces (or fall back to res.mph)
            try {
              measuredMPH = windowMPH(res.traces, len);
            } catch {
              measuredMPH = res.mph;
            }
          }

          // Calculate deltas for reporting
          const etDelta = res.et_s - target.et_s;
          const mphDelta = measuredMPH - target.mph;

          // Strict VB6 parity tolerances
          const STRICT_ET_TOL = 0.05;  // ±0.05s
          const STRICT_MPH_TOL = 1.0;  // ±1.0 mph

          // Report failures with details
          const etPass = Math.abs(etDelta) <= STRICT_ET_TOL;
          const mphPass = Math.abs(mphDelta) <= STRICT_MPH_TOL;

          if (!etPass || !mphPass) {
            console.log(`\n${'='.repeat(80)}`);
            console.log(`${bm.name} ${len} FAILED VB6 PARITY:`);
            console.log(
              `  ET:  expected ${target.et_s.toFixed(3)}s ± ${STRICT_ET_TOL.toFixed(2)}s, got ${res.et_s.toFixed(3)}s (Δ ${etDelta >= 0 ? '+' : ''}${etDelta.toFixed(3)}s) ${etPass ? '✓' : '✗'}`
            );
            console.log(
              `  MPH: expected ${target.mph.toFixed(1)} ± ${STRICT_MPH_TOL.toFixed(1)}, got ${measuredMPH.toFixed(1)} (Δ ${mphDelta >= 0 ? '+' : ''}${mphDelta.toFixed(1)}) ${mphPass ? '✓' : '✗'}`
            );

            // Print early trace table (first 0.4s at 0.02s steps)
            console.log(`\n  Early Trace (first 0.4s):`);
            console.log(`  ${'─'.repeat(78)}`);
            console.log(`  ${'t_s'.padEnd(8)} ${'s_ft'.padEnd(8)} ${'v_mph'.padEnd(8)} ${'rpm'.padEnd(8)} ${'gear'.padEnd(6)} ${'Twheel'.padEnd(8)} ${'T_drag'.padEnd(8)} ${'T_rr'.padEnd(8)}`);
            console.log(`  ${'─'.repeat(78)}`);
            
            if (res.traces && res.traces.length > 0) {
              for (let t = 0; t <= 0.4; t += 0.02) {
                // Find closest trace point
                const trace = res.traces.reduce((prev, curr) => 
                  Math.abs(curr.t_s - t) < Math.abs(prev.t_s - t) ? curr : prev
                );
                
                // Format: t_s, s_ft, v_mph, rpm, gear, (Twheel, T_drag, T_rr not in traces)
                console.log(
                  `  ${trace.t_s.toFixed(3).padEnd(8)} ` +
                  `${trace.s_ft.toFixed(2).padEnd(8)} ` +
                  `${trace.v_mph.toFixed(2).padEnd(8)} ` +
                  `${trace.rpm.toFixed(0).padEnd(8)} ` +
                  `${(trace.gear + 1).toString().padEnd(6)} ` +
                  `${'N/A'.padEnd(8)} ` +
                  `${'N/A'.padEnd(8)} ` +
                  `${'N/A'.padEnd(8)}`
                );
              }
            }
            console.log(`  ${'─'.repeat(78)}`);
            console.log(`${'='.repeat(80)}\n`);
          }

          // Assert strict VB6 parity tolerances
          expect(Math.abs(etDelta)).toBeLessThanOrEqual(STRICT_ET_TOL);
          expect(Math.abs(mphDelta)).toBeLessThanOrEqual(STRICT_MPH_TOL);

          // Optional split anchors (e.g., 60 ft)
          if (target.anchors?.t60_s) {
            let t60_actual: number | undefined;

            // Try to get from traces first
            if (res.traces && res.traces.length > 0) {
              try {
                const p60 = interpAtS(res.traces, 60);
                t60_actual = p60.t_s;
              } catch {
                // Fall back to timeslip
              }
            }

            // Fall back to timeslip if traces failed
            if (t60_actual === undefined) {
              const t60Point = res.timeslip.find((p) => Math.abs(p.d_ft - 60) < 0.5);
              if (t60Point) {
                t60_actual = t60Point.t_s;
              }
            }

            expect(t60_actual).toBeDefined();
            if (t60_actual !== undefined) {
              const t60Delta = t60_actual - target.anchors.t60_s;
              expect(Math.abs(t60Delta)).toBeLessThanOrEqual(0.08);
            }
          }
        });
      }
    });
  }
});
