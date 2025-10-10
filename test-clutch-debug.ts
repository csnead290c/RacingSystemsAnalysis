/**
 * Debug clutch implementation
 */

import { getModel } from './src/domain/physics';
import { BENCHMARK_CONFIGS } from './src/domain/physics/fixtures/benchmark-configs';

const model = getModel('RSACLASSIC');

// Test ProStock_Pro (has clutch)
const config = BENCHMARK_CONFIGS['ProStock_Pro'];

const input = {
  vehicle: {
    ...config.vehicle,
    id: 'test-prostock',
    name: 'ProStock_Pro',
    defaultRaceLength: 'EIGHTH' as const,
    weightLb: config.vehicle.weightLb,
    tireDiaIn: config.vehicle.tireDiaIn ?? 28,
    rearGear: config.vehicle.finalDrive ?? 3.73,
    rolloutIn: config.vehicle.rolloutIn ?? 9,
    powerHP: config.vehicle.powerHP ?? 500,
  },
  env: config.env,
  raceLength: 'EIGHTH' as const,
};

console.log('Testing ProStock_Pro with clutch:');
console.log('Clutch config:', input.vehicle.clutch);

const res = model.simulate(input);

console.log('\nResult:');
console.log('  ET:', res.et_s.toFixed(2), 's');
console.log('  MPH:', res.mph.toFixed(1));
console.log('  Clutch meta:', res.meta.clutch);
console.log('  Converter meta:', res.meta.converter);

if (res.traces && res.traces.length > 0) {
  console.log('\nFirst 30 trace points:');
  for (let i = 0; i < Math.min(30, res.traces.length); i++) {
    const t = res.traces[i];
    console.log(`  t=${t.t_s.toFixed(3)}s  v=${t.v_mph.toFixed(1)}mph  rpm=${t.rpm.toFixed(0)}  gear=${t.gear}  s=${t.s_ft.toFixed(1)}ft`);
  }
}
