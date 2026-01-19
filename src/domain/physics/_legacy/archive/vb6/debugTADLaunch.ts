/**
 * Debug Top Alcohol Dragster launch calculations
 * Focus on initial acceleration and 60ft time
 */

import { simulateVB6Exact } from '../models/vb6Exact';

const TA_DRAGSTER: any = {
  vehicle: {
    id: 'test-tadrag',
    name: 'Top Alcohol Dragster',
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
console.log('TOP ALCOHOL DRAGSTER - LAUNCH DEBUG');
console.log('='.repeat(80));

console.log('\nVB6 Expected Results:');
console.log('  Launch:  0.00s @ 0.0 MPH, 3.25g');
console.log('  Rollout: 0.146s @ 10.3 MPH, 3.38g');
console.log('  60ft:    0.88s @ 75.4 MPH, 3.25g');
console.log('  1/4:     5.52s @ 243.1 MPH');

console.log('\n' + '='.repeat(80));
console.log('RUNNING SIMULATION...');
console.log('='.repeat(80));

const result = simulateVB6Exact(TA_DRAGSTER);

console.log('\n' + '='.repeat(80));
console.log('RESULTS');
console.log('='.repeat(80));
console.log(`Final: ${result.et_s.toFixed(2)}s @ ${result.mph.toFixed(1)} MPH`);
console.log(`Error: ${((result.et_s - 5.52) * 1000).toFixed(1)}ms ET, ${(result.mph - 243.1).toFixed(1)} MPH`);

console.log('\n' + '='.repeat(80));
console.log('CRITICAL FINDING');
console.log('='.repeat(80));

console.log('\nFrom console logs above:');
console.log('  Our 60ft: 0.909s @ 77.0 MPH');
console.log('  VB6 60ft: 0.88s @ 75.4 MPH');
console.log('  Error: +29ms, +1.6 MPH');

console.log('\nThis 29ms error at 60 feet proves the issue is NOT high-speed precision.');
console.log('The problem is in the LAUNCH or EARLY ACCELERATION calculations.');

console.log('\nPossible causes:');
console.log('  1. Initial acceleration (Ags0) calculation incorrect');
console.log('  2. Clutch slippage calculation wrong');
console.log('  3. Traction limit (AMax/CRTF) calculation wrong');
console.log('  4. Launch RPM or stall RPM handling incorrect');
console.log('  5. Initial torque or HP calculation wrong');
console.log('  6. Gear efficiency or final drive ratio wrong');

console.log('\nFrom initial state log:');
console.log('  Launch RPM: 6000 (correct)');
console.log('  Stall RPM: 7200 (correct)');
console.log('  Slippage: 1.01 (correct)');
console.log('  Tire Dia: 35.014 (correct)');
console.log('  Final Drive: 4.56 (correct)');
console.log('  Gear Ratios: [1.85, 1.30, 1.00] (correct)');
console.log('  Gear Eff: [0.97, 0.98, 0.99] (correct)');

console.log('\nThe parameters are correct, so the issue is in the PHYSICS CALCULATION.');
console.log('Need to compare VB6 force/acceleration formulas line-by-line.');
console.log('='.repeat(80));
