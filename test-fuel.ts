/**
 * Test fuel delivery factor
 */

import { getModel } from './src/domain/physics';
import { BENCHMARK_CONFIGS } from './src/domain/physics/fixtures/benchmark-configs';

const model = getModel('RSACLASSIC');

console.log('Testing Fuel Delivery Factor\n');

// Test FunnyCar_Pro (NITRO)
const funnycarConfig = BENCHMARK_CONFIGS['FunnyCar_Pro'];

const funnycarInput = {
  fuel: funnycarConfig.fuel,
  vehicle: {
    ...funnycarConfig.vehicle,
    id: 'test-funnycar',
    name: 'FunnyCar_Pro',
    defaultRaceLength: 'EIGHTH' as const,
    weightLb: funnycarConfig.vehicle.weightLb,
    tireDiaIn: funnycarConfig.vehicle.tireDiaIn ?? 28,
    rearGear: funnycarConfig.vehicle.finalDrive ?? 3.73,
    rolloutIn: funnycarConfig.vehicle.rolloutIn ?? 9,
    powerHP: funnycarConfig.vehicle.powerHP ?? 500,
  },
  env: funnycarConfig.env,
  raceLength: 'EIGHTH' as const,
} as any;

console.log('FunnyCar_Pro (NITRO):');
console.log('  Fuel:', (funnycarInput.vehicle as any).fuel);

const funnycarRes = model.simulate(funnycarInput);

console.log('\nResult:');
console.log('  ET:', funnycarRes.et_s.toFixed(2), 's');
console.log('  MPH:', funnycarRes.mph.toFixed(1));
console.log('  Fuel meta:', funnycarRes.meta.fuel);

// Test TA_Dragster_Pro (METHANOL)
const dragsterConfig = BENCHMARK_CONFIGS['TA_Dragster_Pro'];

const dragsterInput = {
  fuel: dragsterConfig.fuel,
  vehicle: {
    ...dragsterConfig.vehicle,
    id: 'test-dragster',
    name: 'TA_Dragster_Pro',
    defaultRaceLength: 'EIGHTH' as const,
    weightLb: dragsterConfig.vehicle.weightLb,
    tireDiaIn: dragsterConfig.vehicle.tireDiaIn ?? 28,
    rearGear: dragsterConfig.vehicle.finalDrive ?? 3.73,
    rolloutIn: dragsterConfig.vehicle.rolloutIn ?? 9,
    powerHP: dragsterConfig.vehicle.powerHP ?? 500,
  },
  env: dragsterConfig.env,
  raceLength: 'EIGHTH' as const,
} as any;

console.log('\n\nTA_Dragster_Pro (METHANOL):');
console.log('  Fuel:', (dragsterInput.vehicle as any).fuel);
console.log('  Track temp:', dragsterInput.env.trackTempF, 'F');

const dragsterRes = model.simulate(dragsterInput);

console.log('\nResult:');
console.log('  ET:', dragsterRes.et_s.toFixed(2), 's');
console.log('  MPH:', dragsterRes.mph.toFixed(1));
console.log('  Fuel meta:', dragsterRes.meta.fuel);

// Test SuperGas_Pro (GAS)
const supergasConfig = BENCHMARK_CONFIGS['SuperGas_Pro'];

const supergasInput = {
  fuel: supergasConfig.fuel,
  vehicle: {
    ...supergasConfig.vehicle,
    id: 'test-supergas',
    name: 'SuperGas_Pro',
    defaultRaceLength: 'EIGHTH' as const,
    weightLb: supergasConfig.vehicle.weightLb,
    tireDiaIn: supergasConfig.vehicle.tireDiaIn ?? 28,
    rearGear: supergasConfig.vehicle.finalDrive ?? 3.73,
    rolloutIn: supergasConfig.vehicle.rolloutIn ?? 9,
    powerHP: supergasConfig.vehicle.powerHP ?? 500,
  },
  env: supergasConfig.env,
  raceLength: 'EIGHTH' as const,
} as any;

console.log('\n\nSuperGas_Pro (GAS):');
console.log('  Fuel:', (supergasInput.vehicle as any).fuel);

const supergasRes = model.simulate(supergasInput);

console.log('\nResult:');
console.log('  ET:', supergasRes.et_s.toFixed(2), 's');
console.log('  MPH:', supergasRes.mph.toFixed(1));
console.log('  Fuel meta:', supergasRes.meta.fuel);
