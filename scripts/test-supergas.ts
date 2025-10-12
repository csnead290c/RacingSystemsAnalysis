import { getModel } from '../src/domain/physics/index.js';
import { BENCHMARK_CONFIGS } from '../src/domain/physics/fixtures/benchmark-configs.js';

const model = getModel('RSACLASSIC');
const config = BENCHMARK_CONFIGS['SuperGas_Pro'];

console.log('Running SuperGas_Pro QUARTER...\n');

const result = model.simulate({
  ...config,
  raceLength: 'QUARTER',
});

console.log('\n=== FINAL RESULT ===');
console.log('ET:', result.et_s.toFixed(3), 's');
console.log('MPH:', result.mph.toFixed(1));
