/**
 * Debug Top Alcohol Dragster to match dev server results
 */

import { simulateVB6Exact } from '../models/vb6Exact';

const TA_DRAGSTER: any = {
  vehicle: {
    id: 'test-tadrag',
    name: 'Top Alcohol Dragster',
    defaultRaceLength: 'QUARTER',
    powerHP: 2729,
    weightLb: 1980,
    wheelbaseIn: 280,
    rolloutIn: 12,
    overhangIn: 30,
    rearGear: 4.56,
    finalDriveEfficiency: 0.970,
    tireDiaIn: 35.014, // 110" rollout
    tireWidthIn: 17.00,
    cd: 0.580,
    frontalArea_ft2: 19.5,
    liftCoeff: 0.400,
    transmissionType: 'clutch',
    clutch: {
      launchRPM: 6000,
      slipRPM: 7200,
      slipRatio: 1.010,
    },
    gearRatios: [1.85, 1.30, 1.00],
    gearEfficiencies: [0.970, 0.980, 0.990],
    shiftRPMs: [9200, 9400, 100],
    hpCurve: [
      { rpm: 6000, hp: 1847 },
      { rpm: 6500, hp: 2058 },
      { rpm: 7000, hp: 2256 },
      { rpm: 7500, hp: 2458 },
      { rpm: 8000, hp: 2639 },
      { rpm: 8500, hp: 2729 },
      { rpm: 9000, hp: 2672 },
      { rpm: 9500, hp: 2415 },
      { rpm: 10000, hp: 1999 },
      { rpm: 11000, hp: 73 },
      { rpm: 11500, hp: 72 },
    ],
    fuelType: 'Supercharged Methanol',
    hpTorqueMultiplier: 1.000,
    pmi: {
      engine_flywheel_clutch: 4.84,
      transmission_driveshaft: 0.426,
      tires_wheels_ringgear: 64.6,
    },
  },
  env: {
    elevation: 0,
    barometerInHg: 29.92,
    temperatureF: 77,
    humidityPct: 45,
    windMph: 0.0,
    windAngleDeg: 0,
    trackTempF: 110,
    tractionIndex: 2,
  },
  raceLength: 'QUARTER',
};

console.log('='.repeat(80));
console.log('TOP ALCOHOL DRAGSTER DEBUG');
console.log('='.repeat(80));

console.log('\nRunning simulation...');
const result = simulateVB6Exact(TA_DRAGSTER);

console.log('\n' + '='.repeat(80));
console.log('RESULTS');
console.log('='.repeat(80));
console.log(`Test Result:     5.53s @ 242.9 MPH`);
console.log(`Your Dev Server: 5.54s @ 242.4 MPH`);
console.log(`This Run:        ${result.et_s.toFixed(2)}s @ ${result.mph.toFixed(1)} MPH`);
console.log(`VB6 Expected:    5.52s @ 243.1 MPH`);

console.log('\n' + '='.repeat(80));
console.log('COMPARISON');
console.log('='.repeat(80));
console.log(`ET Difference (This vs Dev):  ${((result.et_s - 5.54) * 1000).toFixed(1)}ms`);
console.log(`MPH Difference (This vs Dev): ${(result.mph - 242.4).toFixed(1)} MPH`);
console.log(`ET Difference (This vs VB6):  ${((result.et_s - 5.52) * 1000).toFixed(1)}ms`);
console.log(`MPH Difference (This vs VB6): ${(result.mph - 243.1).toFixed(1)} MPH`);

console.log('\n' + '='.repeat(80));
console.log('ANALYSIS');
console.log('='.repeat(80));

if (Math.abs(result.et_s - 5.54) < 0.001 && Math.abs(result.mph - 242.4) < 0.1) {
  console.log('✅ Results MATCH dev server - no discrepancy');
} else if (Math.abs(result.et_s - 5.53) < 0.001 && Math.abs(result.mph - 242.9) < 0.1) {
  console.log('✅ Results match test suite');
  console.log('⚠️  Dev server has different result - investigating cause...');
} else {
  console.log('❌ Results differ from both test and dev server');
}

console.log('\nPossible causes of dev server difference:');
console.log('  1. Different parameter values in dev server vehicle');
console.log('  2. Different environmental conditions');
console.log('  3. Code version difference between test and dev server');
console.log('  4. Rounding or precision differences in display');
console.log('='.repeat(80));
