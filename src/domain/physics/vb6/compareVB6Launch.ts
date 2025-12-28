/**
 * Compare our launch calculations with VB6 step-by-step
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
    tireDiaIn: 35.014,
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
console.log('VB6 vs OUR SIMULATION - LAUNCH COMPARISON');
console.log('='.repeat(80));

console.log('\nVB6 Printout Values:');
console.log('  Time    Dist    MPH     Accel   Gear  RPM');
console.log('  ----    ----    ---     -----   ----  ---');
console.log('  0.00    0       0.0     3.25    1     6,000');
console.log('  0.146   3.9     10.3    3.38(s) 1     7,200');
console.log('  0.25    11      29.2    3.36(s) 1     7,200');
console.log('  0.50    25      47.6    3.32    1     7,200');
console.log('  0.75    42      65.0    3.28    1     7,200');
console.log('  0.88    60      75.4    3.25    1     7,200');  // ← KEY: 60ft time
console.log('  1.00    69      81.5    3.24    1     7,200');

console.log('\n' + '='.repeat(80));
console.log('RUNNING OUR SIMULATION...');
console.log('='.repeat(80));

const result = simulateVB6Exact(TA_DRAGSTER);

console.log('\n' + '='.repeat(80));
console.log('KEY FINDINGS FROM CONSOLE LOGS ABOVE');
console.log('='.repeat(80));

console.log('\nFrom the simulation logs, our 60ft time is approximately 0.909s');
console.log('VB6 shows 60ft time of 0.88s');
console.log('Error: +29ms at 60 feet');

console.log('\n' + '='.repeat(80));
console.log('ANALYSIS');
console.log('='.repeat(80));

console.log('\nVB6 shows acceleration values with "(s)" notation at early times:');
console.log('  0.146s: 3.38(s) - slipping (traction limited)');
console.log('  0.25s:  3.36(s) - slipping (traction limited)');
console.log('  0.50s:  3.32    - no longer slipping');

console.log('\nThe "(s)" indicates SLIP = 1 (traction limited).');
console.log('Our simulation may not be correctly detecting or handling traction limits.');

console.log('\nPossible issues:');
console.log('  1. Traction limit (AMax/CRTF) calculation incorrect');
console.log('  2. SLIP flag not being set correctly');
console.log('  3. Tire slip calculation wrong');
console.log('  4. Track temperature effect calculation wrong');
console.log('  5. Initial acceleration clamping logic wrong');

console.log('\nFrom initial state log, we see:');
console.log('  Ags0_unclamped: 3.637g');
console.log('  AMax_init: 3.248g');
console.log('  Ags0_clamped: 3.248g (clamped to AMax)');

console.log('\nVB6 shows:');
console.log('  Launch: 3.25g');
console.log('  Rollout: 3.38g (higher than launch!)');

console.log('\nThis is strange - VB6 shows HIGHER acceleration at rollout than at launch.');
console.log('This suggests VB6 may be recalculating AMax dynamically based on weight transfer.');

console.log('\n' + '='.repeat(80));
console.log('HYPOTHESIS');
console.log('='.repeat(80));

console.log('\nVB6 recalculates traction limit (AMax) at each step based on:');
console.log('  - Dynamic weight transfer (more weight on rear = more traction)');
console.log('  - Tire growth (affects effective gear ratio)');
console.log('  - Velocity-dependent factors');

console.log('\nOur simulation may be using a STATIC AMax from launch,');
console.log('instead of recalculating it dynamically at each step.');

console.log('\nNext step: Verify that vb6SimulationStep recalculates AMax');
console.log('at each iteration, not just at launch.');
console.log('='.repeat(80));
