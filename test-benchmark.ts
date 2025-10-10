/**
 * Quick benchmark test to see detailed output
 */

import { getModel } from './src/domain/physics';
import { LEGACY_BENCHMARKS } from './src/domain/physics/fixtures/benchmarks';
import { BENCHMARK_CONFIGS } from './src/domain/physics/fixtures/benchmark-configs';
import type { RaceLength } from './src/domain/physics/fixtures/benchmarks';

const model = getModel('RSACLASSIC');

function interpAtS(
  traces: Array<{ t_s: number; v_mph: number; s_ft: number }>,
  s_ft: number
): { t_s: number; v_fps: number } {
  if (!traces || traces.length === 0) {
    throw new Error('No traces available for interpolation');
  }

  for (let i = 0; i < traces.length - 1; i++) {
    const p1 = traces[i];
    const p2 = traces[i + 1];

    if (s_ft >= p1.s_ft && s_ft <= p2.s_ft) {
      const t = (s_ft - p1.s_ft) / (p2.s_ft - p1.s_ft);
      const t_s = p1.t_s + t * (p2.t_s - p1.t_s);
      const v_mph = p1.v_mph + t * (p2.v_mph - p1.v_mph);
      const v_fps = v_mph / 0.681818;
      return { t_s, v_fps };
    }
  }

  if (s_ft < traces[0].s_ft) {
    return { t_s: traces[0].t_s, v_fps: traces[0].v_mph / 0.681818 };
  }
  const last = traces[traces.length - 1];
  return { t_s: last.t_s, v_fps: last.v_mph / 0.681818 };
}

function avgVfpsBetween(
  traces: Array<{ t_s: number; v_mph: number; s_ft: number }>,
  s0: number,
  s1: number
): number {
  const p0 = interpAtS(traces, s0);
  const p1 = interpAtS(traces, s1);

  const distance_ft = s1 - s0;
  const time_s = p1.t_s - p0.t_s;

  if (time_s <= 0) {
    return (p0.v_fps + p1.v_fps) / 2;
  }

  return distance_ft / time_s;
}

function windowMPH(
  traces: Array<{ t_s: number; v_mph: number; s_ft: number }> | undefined,
  raceLength: RaceLength
): number {
  if (!traces || traces.length === 0) {
    throw new Error('No traces available for window MPH calculation');
  }

  const s0 = raceLength === 'EIGHTH' ? 594 : 1254;
  const s1 = raceLength === 'EIGHTH' ? 660 : 1320;

  const avgVfps = avgVfpsBetween(traces, s0, s1);
  return avgVfps * 0.681818;
}

console.log('\n=== RSACLASSIC Benchmark Test Results ===\n');

const LENGTHS: RaceLength[] = ['EIGHTH', 'QUARTER'];

for (const bm of LEGACY_BENCHMARKS) {
  for (const len of LENGTHS) {
    const target = bm.raceLengthTargets[len];
    if (!target) continue;

    const config = BENCHMARK_CONFIGS[bm.name];
    if (!config) {
      console.log(`${bm.name} ${len}: NO CONFIG - SKIPPED`);
      continue;
    }

    const input = {
      vehicle: {
        ...config.vehicle,
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

    // Use window MPH from meta if available
    let measuredMPH: number;
    if (res.meta.windowMPH) {
      if (len === 'EIGHTH' && res.meta.windowMPH.e660_mph !== undefined) {
        measuredMPH = res.meta.windowMPH.e660_mph;
      } else if (len === 'QUARTER' && res.meta.windowMPH.q1320_mph !== undefined) {
        measuredMPH = res.meta.windowMPH.q1320_mph;
      } else {
        try {
          measuredMPH = windowMPH(res.traces, len);
        } catch {
          measuredMPH = res.mph;
        }
      }
    } else {
      try {
        measuredMPH = windowMPH(res.traces, len);
      } catch {
        measuredMPH = res.mph;
      }
    }

    const etDelta = res.et_s - target.et_s;
    const mphDelta = measuredMPH - target.mph;

    const etPass = Math.abs(etDelta) <= target.tolET_s;
    const mphPass = Math.abs(mphDelta) <= target.tolMPH;
    const pass = etPass && mphPass;

    console.log(`${bm.name} ${len}: ${pass ? '✓ PASS' : '✗ FAIL'}`);
    console.log(
      `  ET:  ${target.et_s.toFixed(2)}s ± ${target.tolET_s.toFixed(2)}s → ${res.et_s.toFixed(2)}s (Δ ${etDelta >= 0 ? '+' : ''}${etDelta.toFixed(3)}s) ${etPass ? '✓' : '✗'}`
    );
    console.log(
      `  MPH: ${target.mph.toFixed(1)} ± ${target.tolMPH.toFixed(1)} → ${measuredMPH.toFixed(1)} (Δ ${mphDelta >= 0 ? '+' : ''}${mphDelta.toFixed(1)}) ${mphPass ? '✓' : '✗'}`
    );

    if (target.anchors?.t60_s && res.traces) {
      try {
        const p60 = interpAtS(res.traces, 60);
        const t60Delta = p60.t_s - target.anchors.t60_s;
        const t60Pass = Math.abs(t60Delta) <= 0.08;
        console.log(
          `  60': ${target.anchors.t60_s.toFixed(2)}s ± 0.08s → ${p60.t_s.toFixed(2)}s (Δ ${t60Delta >= 0 ? '+' : ''}${t60Delta.toFixed(3)}s) ${t60Pass ? '✓' : '✗'}`
        );
      } catch (e) {
        console.log(`  60': ERROR - ${e}`);
      }
    }

    console.log('');
  }
}
