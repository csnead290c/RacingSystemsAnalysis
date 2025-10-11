/**
 * Benchmark dump script - outputs CSV summary of all benchmark results
 */

import { getModel } from '../src/domain/physics';
import { BENCHMARK_CONFIGS } from '../src/domain/physics/fixtures/benchmark-configs';
import { LEGACY_BENCHMARKS } from '../src/domain/physics/fixtures/benchmarks';

const model = getModel('RSACLASSIC');

console.log('name,len,et_exp,et_act,delta_et,mph_exp,mph_act,delta_mph,passes');

for (const bm of LEGACY_BENCHMARKS) {
  const config = BENCHMARK_CONFIGS[bm.name];
  if (!config) continue;
  
  for (const len of ['EIGHTH', 'QUARTER'] as const) {
    const target = bm.raceLengthTargets[len];
    if (!target) continue;

    // Build input
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

    try {
      const res = model.simulate(input);

      // Get measured MPH
      let measuredMPH: number;
      if (res.meta.windowMPH) {
        if (len === 'EIGHTH' && res.meta.windowMPH.e660_mph !== undefined) {
          measuredMPH = res.meta.windowMPH.e660_mph;
        } else if (len === 'QUARTER' && res.meta.windowMPH.q1320_mph !== undefined) {
          measuredMPH = res.meta.windowMPH.q1320_mph;
        } else {
          measuredMPH = res.mph;
        }
      } else {
        measuredMPH = res.mph;
      }

      const etDelta = res.et_s - target.et_s;
      const mphDelta = measuredMPH - target.mph;
      
      // Check if passes (strict tolerances)
      const STRICT_ET_TOL = 0.01;
      const STRICT_MPH_TOL = 0.5;
      const passes = Math.abs(etDelta) <= STRICT_ET_TOL && Math.abs(mphDelta) <= STRICT_MPH_TOL ? 'PASS' : 'FAIL';

      console.log(
        `${bm.name},${len},` +
        `${target.et_s.toFixed(3)},${res.et_s.toFixed(3)},${etDelta.toFixed(3)},` +
        `${target.mph.toFixed(1)},${measuredMPH.toFixed(1)},${mphDelta.toFixed(1)},` +
        `${passes}`
      );
    } catch (error) {
      console.log(`${bm.name},${len},${target.et_s.toFixed(3)},ERROR,ERROR,${target.mph.toFixed(1)},ERROR,ERROR,ERROR`);
    }
  }
}
