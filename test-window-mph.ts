/**
 * Test window MPH computation
 */

import { getModel } from './src/domain/physics';
import { BENCHMARK_CONFIGS } from './src/domain/physics/fixtures/benchmark-configs';

const model = getModel('RSACLASSIC');

// Test SuperGas_Pro (converter)
const config = BENCHMARK_CONFIGS['SuperGas_Pro'];

console.log('Testing Window MPH Computation\n');

// Test EIGHTH
const inputEighth = {
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

const resEighth = model.simulate(inputEighth);

console.log('EIGHTH Mile:');
console.log('  Final MPH:', resEighth.mph.toFixed(2));
console.log('  Window MPH (594-660ft):', resEighth.meta.windowMPH?.e660_mph?.toFixed(2) ?? 'N/A');
console.log('  Traces collected:', resEighth.traces?.length ?? 0);

// Test QUARTER
const inputQuarter = {
  ...inputEighth,
  raceLength: 'QUARTER' as const,
};

const resQuarter = model.simulate(inputQuarter);

console.log('\nQUARTER Mile:');
console.log('  Final MPH:', resQuarter.mph.toFixed(2));
console.log('  Window MPH (1254-1320ft):', resQuarter.meta.windowMPH?.q1320_mph?.toFixed(2) ?? 'N/A');
console.log('  Traces collected:', resQuarter.traces?.length ?? 0);

console.log('\nWindow MPH Metadata:');
console.log('  EIGHTH:', JSON.stringify(resEighth.meta.windowMPH, null, 2));
console.log('  QUARTER:', JSON.stringify(resQuarter.meta.windowMPH, null, 2));
