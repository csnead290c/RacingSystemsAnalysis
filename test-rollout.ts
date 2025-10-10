/**
 * Test rollout timing
 */

import { getModel } from './src/domain/physics';
import { BENCHMARK_CONFIGS } from './src/domain/physics/fixtures/benchmark-configs';

const model = getModel('RSACLASSIC');

// Test ProStock_Pro
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

console.log('Testing Rollout Timing\n');
console.log('Vehicle:', input.vehicle.name);
console.log('Rollout:', input.vehicle.rolloutIn, 'inches');

const res = model.simulate(input);

console.log('\nRollout Metadata:');
console.log('  rolloutIn:', res.meta.rollout?.rolloutIn, 'inches');
console.log('  t_roll_s:', res.meta.rollout?.t_roll_s?.toFixed(4), 's');
console.log('  rolloutFt:', (res.meta.rollout?.rolloutIn ?? 0) / 12, 'ft');

console.log('\nTimeslip (with rollout subtraction):');
if (res.timeslip) {
  for (const point of res.timeslip) {
    console.log(`  ${point.d_ft}ft: ${point.t_s.toFixed(3)}s @ ${point.v_mph.toFixed(1)} mph`);
  }
}

console.log('\nFinal ET:', res.et_s.toFixed(3), 's');
console.log('Final MPH:', res.mph.toFixed(2));

// Verify rollout subtraction
if (res.traces && res.traces.length > 0) {
  const rolloutFt = (res.meta.rollout?.rolloutIn ?? 0) / 12;
  console.log('\nVerification:');
  console.log('  Rollout distance:', rolloutFt.toFixed(2), 'ft');
  
  // Find first trace after rollout
  const afterRollout = res.traces.find(t => t.s_ft >= rolloutFt);
  if (afterRollout) {
    console.log('  First trace after rollout:');
    console.log('    Raw time:', afterRollout.t_s.toFixed(4), 's');
    console.log('    Rollout time:', res.meta.rollout?.t_roll_s?.toFixed(4), 's');
    console.log('    Measured time:', (afterRollout.t_s - (res.meta.rollout?.t_roll_s ?? 0)).toFixed(4), 's');
  }
}
