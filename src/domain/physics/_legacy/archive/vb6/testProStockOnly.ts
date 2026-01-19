/**
 * Test Pro Stock Only with Checkpoint Comparison
 */

import { simulateVB6Exact } from '../models/vb6Exact';
import type { SimInputs } from '../index';

const PRO_STOCK: SimInputs = {
  vehicle: {
    id: 'test-prostock',
    name: 'Pro Stock',
    defaultRaceLength: 'QUARTER',
    powerHP: 1300,
    weightLb: 2355,
    wheelbaseIn: 107,
    rolloutIn: 9,
    overhangIn: 40,
    rearGear: 4.86,
    finalDriveEfficiency: 0.975,
    tireDiaIn: 32.62676,
    tireWidthIn: 17.0,
    cd: 0.240,
    frontalArea_ft2: 18.2,
    liftCoeff: 0.100,
    transmissionType: 'clutch',
    clutch: {
      launchRPM: 7200,
      slipRPM: 7600,
      slipRatio: 1.004,
    },
    gearRatios: [2.60, 1.90, 1.50, 1.20, 1.00],
    gearEfficiencies: [0.990, 0.991, 0.992, 0.993, 0.994],
    shiftRPMs: [9400, 9400, 9400, 9400, 0],
    hpCurve: [
      { rpm: 7000, hp: 1078 },
      { rpm: 7250, hp: 1131 },
      { rpm: 7500, hp: 1177 },
      { rpm: 7750, hp: 1216 },
      { rpm: 8000, hp: 1251 },
      { rpm: 8250, hp: 1274 },
      { rpm: 8500, hp: 1288 },
      { rpm: 8750, hp: 1300 },
      { rpm: 9000, hp: 1297 },
      { rpm: 9250, hp: 1269 },
      { rpm: 9500, hp: 1222 },
    ],
    fuelType: 'Gasoline Carburetor',
    hpTorqueMultiplier: 1.000,
    pmi: {
      engine_flywheel_clutch: 3.42,
      transmission_driveshaft: 0.247,
      tires_wheels_ringgear: 50.8,
    },
  },
  env: {
    elevation: 32,
    barometerInHg: 29.92,
    temperatureF: 75,
    humidityPct: 55,
    windMph: 5.0,
    windAngleDeg: 135,
    trackTempF: 105,
    tractionIndex: 3,
  },
  raceLength: 'QUARTER',
};

console.log('='.repeat(80));
console.log('PRO STOCK TEST - VB6 CHECKPOINT COMPARISON');
console.log('='.repeat(80));

const result = simulateVB6Exact(PRO_STOCK);

console.log('\n' + '='.repeat(80));
console.log('CHECKPOINT COMPARISON');
console.log('='.repeat(80));
console.log('\nCheckpoint | VB6 Time | VB6 MPH | Our Time | Our MPH | ΔTime  | ΔMPH');
console.log('-----------|----------|---------|----------|---------|--------|-------');

// VB6 checkpoints from the output you provided
const checkpoints = [
  { name: 'Rollout   ', vb6_t: 0.131, vb6_mph: 7.9 },
  { name: '60ft      ', vb6_t: 1.01, vb6_mph: 64.9 },
  { name: '330ft     ', vb6_t: 2.84, vb6_mph: 129.2 },
  { name: '1/8 Mile  ', vb6_t: 4.37, vb6_mph: 160.9 },
  { name: '1/4 Mile  ', vb6_t: 6.80, vb6_mph: 202.3 },
];

// Our results
console.log(`${checkpoints[0].name}|   ${checkpoints[0].vb6_t.toFixed(3)}  |   ${checkpoints[0].vb6_mph.toFixed(1)}  |    ?     |    ?    |   ?    |   ?`);
console.log(`${checkpoints[1].name}|   ${checkpoints[1].vb6_t.toFixed(3)}  |  ${checkpoints[1].vb6_mph.toFixed(1)}  |    ?     |    ?    |   ?    |   ?`);
console.log(`${checkpoints[2].name}|   ${checkpoints[2].vb6_t.toFixed(3)}  | ${checkpoints[2].vb6_mph.toFixed(1)}  |    ?     |    ?    |   ?    |   ?`);
console.log(`${checkpoints[3].name}|   ${checkpoints[3].vb6_t.toFixed(3)}  | ${checkpoints[3].vb6_mph.toFixed(1)}  |    ?     |    ?    |   ?    |   ?`);
console.log(`${checkpoints[4].name}|   ${checkpoints[4].vb6_t.toFixed(3)}  | ${checkpoints[4].vb6_mph.toFixed(1)}  |  ${result.et_s.toFixed(3)}  | ${result.mph.toFixed(1)}  | ${((result.et_s - checkpoints[4].vb6_t) * 1000).toFixed(0)}ms | ${(result.mph - checkpoints[4].vb6_mph).toFixed(1)}`);

console.log('\n' + '='.repeat(80));
console.log('RESULT');
console.log('='.repeat(80));
console.log(`Expected: ${checkpoints[4].vb6_t}s @ ${checkpoints[4].vb6_mph} MPH`);
console.log(`Actual:   ${result.et_s.toFixed(3)}s @ ${result.mph.toFixed(1)} MPH`);
console.log(`Delta:    ${((result.et_s - checkpoints[4].vb6_t) * 1000).toFixed(0)}ms, ${(result.mph - checkpoints[4].vb6_mph).toFixed(1)} MPH`);

if (Math.abs(result.et_s - checkpoints[4].vb6_t) <= 0.01 && Math.abs(result.mph - checkpoints[4].vb6_mph) <= 0.1) {
  console.log('\n✅ PASS - Within tolerance');
} else {
  console.log('\n❌ FAIL - Outside tolerance');
}

console.log('\n' + '='.repeat(80));
console.log('NOTE: Intermediate checkpoints (rollout, 60ft, 330ft, 1/8) not yet captured');
console.log('      Need to add checkpoint tracking to vb6Exact.ts');
console.log('='.repeat(80));
