/**
 * Debug MPH calculation for TAD and Funny Car
 * Both have perfect ET but MPH is 0.18-0.19 off
 */

import { simulateVB6Exact } from '../models/vb6Exact';

// TAD test case
const TAD: any = {
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
    clutch: { launchRPM: 6000, slipRPM: 7200, slipRatio: 1.010 },
    gearRatios: [1.85, 1.30, 1.00],
    gearEfficiencies: [0.970, 0.980, 0.990],
    shiftRPMs: [9200, 9400, 100],
    hpCurve: [
      { rpm: 6000, hp: 1847 }, { rpm: 6500, hp: 2058 }, { rpm: 7000, hp: 2256 },
      { rpm: 7500, hp: 2458 }, { rpm: 8000, hp: 2639 }, { rpm: 8500, hp: 2729 },
      { rpm: 9000, hp: 2672 }, { rpm: 9500, hp: 2415 }, { rpm: 10000, hp: 1999 },
      { rpm: 11000, hp: 73 }, { rpm: 11500, hp: 72 },
    ],
    fuelType: 'Supercharged Methanol',
    hpTorqueMultiplier: 1.000,
    pmi: { engine_flywheel_clutch: 4.84, transmission_driveshaft: 0.426, tires_wheels_ringgear: 64.6 },
  },
  env: { elevation: 0, barometerInHg: 29.92, temperatureF: 77, humidityPct: 45, windMph: 0.0, windAngleDeg: 0, trackTempF: 110, tractionIndex: 2 },
  raceLength: 'QUARTER',
};

console.log('='.repeat(80));
console.log('MPH CALCULATION DEBUG');
console.log('='.repeat(80));

console.log('\nRunning TAD simulation...');
const result = simulateVB6Exact(TAD);

console.log('\n' + '='.repeat(80));
console.log('RESULTS');
console.log('='.repeat(80));
console.log(`ET: ${result.et_s.toFixed(4)}s (expected 5.52s)`);
console.log(`MPH: ${result.mph.toFixed(2)} (expected 243.1 MPH)`);
console.log(`Delta: ${((result.et_s - 5.52) * 1000).toFixed(1)}ms, ${(result.mph - 243.1).toFixed(2)} MPH`);

if (result.traces && result.traces.length > 0) {
  const lastTrace = result.traces[result.traces.length - 1];
  console.log('\n' + '='.repeat(80));
  console.log('FINAL TRACE POINT');
  console.log('='.repeat(80));
  console.log(`Time: ${lastTrace.t_s.toFixed(4)}s`);
  console.log(`Distance: ${lastTrace.s_ft.toFixed(2)}ft`);
  console.log(`Velocity: ${lastTrace.v_mph.toFixed(2)} MPH`);
  console.log(`Acceleration: ${lastTrace.a_g.toFixed(3)}g`);
  console.log(`RPM: ${lastTrace.rpm.toFixed(0)}`);
  console.log(`Gear: ${lastTrace.gear}`);
}

console.log('\n' + '='.repeat(80));
console.log('MPH CALCULATION ANALYSIS');
console.log('='.repeat(80));

console.log('\nVB6 MPH calculation happens at the finish line (1320ft).');
console.log('The MPH is calculated from the velocity at that point.');
console.log('\nPossible causes of 0.19 MPH error:');
console.log('  1. Velocity interpolation at finish line');
console.log('  2. FPS to MPH conversion rounding');
console.log('  3. Final velocity calculation method');
console.log('  4. Distance targeting precision');

console.log('\nVB6 uses: MPH = Vel(L) * Z5');
console.log('where Z5 = 3600/5280 = 0.681818...');
console.log('and Vel(L) is in ft/s');

console.log('\nFor 243.1 MPH:');
console.log('  Vel(L) = 243.1 / 0.681818 = 356.52 fps');
console.log('\nFor 242.9 MPH (our result):');
console.log('  Vel(L) = 242.9 / 0.681818 = 356.23 fps');
console.log('\nDifference: 0.29 fps');

console.log('\nThis 0.29 fps difference at the finish line is causing the 0.19 MPH error.');
console.log('Need to check:');
console.log('  - How we interpolate to exactly 1320ft');
console.log('  - Whether VB6 uses a different interpolation method');
console.log('  - Rounding in the final MPH calculation');

console.log('='.repeat(80));
