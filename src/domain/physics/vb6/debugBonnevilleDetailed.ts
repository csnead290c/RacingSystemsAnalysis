/**
 * Detailed debug of Bonneville Roadster 153ms error
 */

import { simulateVB6Exact } from '../models/vb6Exact';

const BONNEVILLE: any = {
  vehicle: {
    id: 'test-roadster',
    name: 'Bonneville Roadster',
    powerHP: 5734,
    weightLb: 2350,
    wheelbaseIn: 125,
    rolloutIn: 0,
    overhangIn: 0,
    rearGear: 2.10,
    finalDriveEfficiency: 0.960,
    tireDiaIn: 35.987,
    tireWidthIn: 10.00,
    cd: 0.580,
    frontalArea_ft2: 24.1,
    liftCoeff: 0.800,
    transmissionType: 'clutch',
    clutch: { launchRPM: 6400, slipRPM: 6400, slipRatio: 1.000 },
    gearRatios: [1.25, 1.00],
    gearEfficiencies: [0.800, 0.990],
    shiftRPMs: [7000, 100],
    hpCurve: [
      { rpm: 6400, hp: 5559.987 },
      { rpm: 6600, hp: 5733.737 },
      { rpm: 6800, hp: 5733.451 },
      { rpm: 7000, hp: 5581.357 },
      { rpm: 7200, hp: 5298.826 },
      { rpm: 7400, hp: 4857.974 },
      { rpm: 7600, hp: 4302.36 },
      { rpm: 7800, hp: 3629.627 },
      { rpm: 10500, hp: 73 },
      { rpm: 11000, hp: 74 },
      { rpm: 11500, hp: 73 },
    ],
    fuelType: 'Gasoline Carburetor',
    hpTorqueMultiplier: 1.000,
    pmi: { engine_flywheel_clutch: 4.178682, transmission_driveshaft: 0.1671473, tires_wheels_ringgear: 44.36557 },
  },
  env: { elevation: 4500, barometerInHg: 29.92, temperatureF: 76, humidityPct: 50, windMph: 0.0, windAngleDeg: 0, trackTempF: 106, tractionIndex: 6 },
  raceLength: 'TWO_MILE',
};

console.log('='.repeat(80));
console.log('BONNEVILLE ROADSTER DEBUG');
console.log('='.repeat(80));

const result = simulateVB6Exact(BONNEVILLE);

console.log('\nResults:');
console.log(`  ET: ${result.et_s.toFixed(4)}s (expected 26.31s)`);
console.log(`  MPH: ${result.mph.toFixed(2)} (expected 351.8 MPH)`);
console.log(`  Error: +${((result.et_s - 26.31) * 1000).toFixed(1)}ms, ${(result.mph - 351.8).toFixed(2)} MPH`);

if (result.timeslip) {
  console.log('\nTimeslip milestones:');
  result.timeslip.forEach(t => {
    console.log(`  ${t.d_ft}ft: ${t.t_s.toFixed(4)}s @ ${t.v_mph.toFixed(2)} MPH`);
  });
}

console.log('\n' + '='.repeat(80));
console.log('ANALYSIS');
console.log('='.repeat(80));

console.log('\n153ms error is significant (0.58% of total time).');
console.log('This suggests a systematic issue, not just rounding.');

console.log('\nPossible causes:');
console.log('  1. Bonneville-specific constants (AX_BV, CMU_BV, etc.) not applied correctly');
console.log('  2. TSMax calculation for Bonneville (fixed 0.1s vs dynamic for Quarter)');
console.log('  3. Land speed tire slip formula different from Quarter');
console.log('  4. Missing Bonneville-specific physics');
console.log('  5. Test expectation incorrect');

console.log('\nKey Bonneville differences from Quarter Pro:');
console.log('  - AX = 9.7 (vs 10.8 for Quarter)');
console.log('  - CMU = 0.03 (vs 0.025 for Quarter)');
console.log('  - CMUK = 0 (vs 0.01 for Quarter)');
console.log('  - FRCT = 1.01 (vs 1.03 for Quarter)');
console.log('  - TSMax = 0.1 (fixed, vs dynamic for Quarter)');
console.log('  - TireSlip = 1.01 + (TI-1)*0.01 (simpler formula)');
console.log('  - No distance-based tire slip reduction');
console.log('  - TrackTempEffect = 1 (always)');

console.log('='.repeat(80));
