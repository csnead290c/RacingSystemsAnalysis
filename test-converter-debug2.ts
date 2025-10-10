/**
 * Debug converter implementation with more detail
 */

import { getModel } from './src/domain/physics';
import { BENCHMARK_CONFIGS } from './src/domain/physics/fixtures/benchmark-configs';

const model = getModel('RSACLASSIC');

// Test SuperGas_Pro (has converter)
const config = BENCHMARK_CONFIGS['SuperGas_Pro'];

const input = {
  vehicle: {
    ...config.vehicle,
    id: 'test-supergas',
    name: 'SuperGas_Pro',
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

console.log('Testing SuperGas_Pro with converter:');
console.log('Converter config:', input.vehicle.converter);
console.log('Gear ratios:', input.vehicle.gearRatios);
console.log('Final drive:', input.vehicle.finalDrive);
console.log('Tire dia:', input.vehicle.tireDiaIn);

const res = model.simulate(input);

console.log('\nResult:');
console.log('  ET:', res.et_s.toFixed(2), 's');
console.log('  MPH:', res.mph.toFixed(1));
console.log('  Converter meta:', res.meta.converter);

if (res.traces && res.traces.length > 0) {
  console.log('\nTrace points (first 30):');
  for (let i = 0; i < Math.min(30, res.traces.length); i++) {
    const t = res.traces[i];
    
    // Calculate what baseEngineRPM would be
    const tireRadius_ft = (input.vehicle.tireDiaIn! / 12) / 2;
    const wheelRPM = (t.v_mph / 0.681818 * 60) / (2 * Math.PI * tireRadius_ft);
    const gearRatio = input.vehicle.gearRatios![t.gear - 1];
    const baseEngineRPM = wheelRPM * gearRatio * input.vehicle.finalDrive!;
    const slipRatio = baseEngineRPM > 0 ? t.rpm / baseEngineRPM : 1.0;
    
    console.log(`  t=${t.t_s.toFixed(3)}s  v=${t.v_mph.toFixed(1)}mph  rpm=${t.rpm.toFixed(0)}  baseRPM=${baseEngineRPM.toFixed(0)}  slip=${slipRatio.toFixed(2)}  gear=${t.gear}`);
  }
}
