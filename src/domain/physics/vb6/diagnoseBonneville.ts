/**
 * Diagnose Bonneville Roadster test failure
 * Expected: 26.31s @ 351.8 MPH
 * Actual: 26.45s @ 351.9 MPH
 * Error: +138ms (tolerance: 10ms)
 */

import { simulateVB6Exact } from '../models/vb6Exact';

const BONNEVILLE_ROADSTER: any = {
  vehicle: {
    id: 'test-roadster',
    name: 'Bonneville Roadster',
    defaultRaceLength: 'TWO_MILE',
    powerHP: 5734,
    weightLb: 2350,
    wheelbaseIn: 125,
    rolloutIn: 0,
    overhangIn: 0,
    rearGear: 2.10,
    finalDriveEfficiency: 0.960,
    tireDiaIn: 35.987,
    tireWidthIn: 10.00,
    cd: 0.240,
    frontalArea_ft2: 24.1,
    liftCoeff: 0.800,
    transmissionType: 'clutch',
    clutch: {
      launchRPM: 6400,
      slipRPM: 6400,
      slipRatio: 1.000,
    },
    gearRatios: [1.25, 1.00],
    gearEfficiencies: [0.800, 0.990],
    shiftRPMs: [7000, 100],
    hpCurve: [
      { rpm: 6400, hp: 5560 },
      { rpm: 6600, hp: 5734 },
      { rpm: 6800, hp: 5733 },
      { rpm: 7000, hp: 5581 },
      { rpm: 7200, hp: 5299 },
      { rpm: 7400, hp: 4858 },
      { rpm: 7600, hp: 4302 },
      { rpm: 7800, hp: 3630 },
      { rpm: 10500, hp: 73 },
      { rpm: 11000, hp: 74 },
      { rpm: 11500, hp: 73 },
    ],
    fuelType: 'Supercharged Nitro',
    hpTorqueMultiplier: 0.960,
    pmi: {
      engine_flywheel_clutch: 6.03,
      transmission_driveshaft: 0.107,
      tires_wheels_ringgear: 75.4,
    },
  },
  env: {
    elevation: 4500,
    barometerInHg: 29.92,
    temperatureF: 76,
    humidityPct: 50,
    windMph: 0.0,
    windAngleDeg: 0,
    trackTempF: 90,
    tractionIndex: 6,
  },
  raceLength: 'TWO_MILE',
};

console.log('='.repeat(80));
console.log('BONNEVILLE ROADSTER DIAGNOSTIC');
console.log('='.repeat(80));

console.log('\nTest Configuration:');
console.log('  - Race Length: 2 miles (10,560 feet)');
console.log('  - Power: 5734 HP');
console.log('  - Weight: 2350 lbs');
console.log('  - Elevation: 4500 ft (Bonneville Salt Flats)');
console.log('  - Expected: 26.31s @ 351.8 MPH');
console.log('  - Fuel: Supercharged Nitro');

console.log('\nRunning simulation...');
const result = simulateVB6Exact(BONNEVILLE_ROADSTER);

console.log('\n' + '='.repeat(80));
console.log('RESULTS');
console.log('='.repeat(80));
console.log(`Actual:   ${result.et_s.toFixed(2)}s @ ${result.mph.toFixed(1)} MPH`);
console.log(`Expected: 26.31s @ 351.8 MPH`);
console.log(`Delta:    ${((result.et_s - 26.31) * 1000).toFixed(0)}ms, ${(result.mph - 351.8).toFixed(1)} MPH`);

const etError = Math.abs(result.et_s - 26.31);
const mphError = Math.abs(result.mph - 351.8);

console.log('\n' + '='.repeat(80));
console.log('ANALYSIS');
console.log('='.repeat(80));

if (etError <= 0.01 && mphError <= 0.1) {
  console.log('✅ PASS - Within tolerance!');
} else {
  console.log('❌ FAIL - Outside tolerance');
  console.log(`   ET error: ${(etError * 1000).toFixed(0)}ms (tolerance: 10ms)`);
  console.log(`   MPH error: ${mphError.toFixed(1)} (tolerance: 0.1)`);
}

console.log('\nBonneville-specific physics:');
console.log('  - Uses kd = 29 (vs 33 for QuarterPro, 28 for QuarterJr)');
console.log('  - LaunchRPM = Stall (same as QuarterJr)');
console.log('  - Very long distance (2 miles vs 1/4 mile)');
console.log('  - Very high speeds (350+ MPH)');
console.log('  - High elevation (4500 ft)');

console.log('\nPossible causes of 138ms error:');
console.log('  1. Accumulated precision errors over 2-mile distance');
console.log('  2. High-speed aerodynamic drag calculation differences');
console.log('  3. Air density correction at high elevation');
console.log('  4. Bonneville-specific kd constant or other parameter');

console.log('\n' + '='.repeat(80));
console.log('NEXT STEPS');
console.log('='.repeat(80));
console.log('Need to compare intermediate values with VB6 output to identify');
console.log('where the divergence occurs in the 2-mile run.');
console.log('='.repeat(80));
