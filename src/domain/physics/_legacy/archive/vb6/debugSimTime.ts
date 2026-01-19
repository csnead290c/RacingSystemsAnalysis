/**
 * Debug actual simulation time (not track time) for Funny Car
 */

import { simulateVB6Exact } from '../models/vb6Exact';

const FUNNY: any = {
  vehicle: {
    id: 'test-funny',
    name: 'Funny Car',
    powerHP: 6000,
    weightLb: 2450,
    wheelbaseIn: 125,
    rolloutIn: 12,
    overhangIn: 30,
    rearGear: 3.20,
    finalDriveEfficiency: 0.970,
    tireDiaIn: 36.0,
    tireWidthIn: 17.5,
    cd: 0.580,
    frontalArea_ft2: 25.0,
    liftCoeff: 0.400,
    transmissionType: 'clutch',
    clutch: { launchRPM: 6000, slipRPM: 8000, slipRatio: 1.010 },
    gearRatios: [1.85, 1.30, 1.00],
    gearEfficiencies: [0.970, 0.980, 0.990],
    shiftRPMs: [9800, 10000, 100],
    hpCurve: [
      { rpm: 6000, hp: 4000 }, { rpm: 6500, hp: 4500 }, { rpm: 7000, hp: 5000 },
      { rpm: 7500, hp: 5500 }, { rpm: 8000, hp: 6000 }, { rpm: 8500, hp: 6000 },
      { rpm: 9000, hp: 6000 }, { rpm: 9500, hp: 5800 }, { rpm: 10000, hp: 5500 },
      { rpm: 11000, hp: 73 }, { rpm: 11500, hp: 72 },
    ],
    fuelType: 'Supercharged Nitromethane',
    hpTorqueMultiplier: 1.000,
    pmi: { engine_flywheel_clutch: 5.5, transmission_driveshaft: 0.5, tires_wheels_ringgear: 70.0 },
  },
  env: { elevation: 0, barometerInHg: 29.92, temperatureF: 77, humidityPct: 45, windMph: 0.0, windAngleDeg: 0, trackTempF: 110, tractionIndex: 2 },
  raceLength: 'QUARTER',
};

console.log('='.repeat(80));
console.log('SIMULATION TIME DEBUG - FUNNY CAR');
console.log('='.repeat(80));

console.log('\nThe trace shows trackTime (time after rollout), not absolute sim time.');
console.log('Need to check if the simulation is actually progressing or stuck.');
console.log('\nLooking at console logs for actual state.time_s values...\n');

const result = simulateVB6Exact(FUNNY);

console.log('\n' + '='.repeat(80));
console.log('RESULT');
console.log('='.repeat(80));
console.log(`Final ET: ${result.et_s.toFixed(3)}s`);
console.log(`Final MPH: ${result.mph.toFixed(1)}`);
console.log(`Total trace points: ${result.traces?.length ?? 0}`);

console.log('\n' + '='.repeat(80));
console.log('ANALYSIS');
console.log('='.repeat(80));

console.log('\nFrom the console logs above, check the vb6Step outputs.');
console.log('Look for patterns like:');
console.log('  - Are timesteps (dt) extremely small?');
console.log('  - Is Time0 progressing or stuck?');
console.log('  - Is the simulation making forward progress in distance?');

console.log('\nIf timesteps are ~0.0004s (as shown in L=19-21), then:');
console.log('  - 5000 steps * 0.0004s = 2.0s total time');
console.log('  - But we only reached 4.7ft, should be much farther');
console.log('  - This suggests distance calculation is wrong, not timestep');

console.log('\nPossible root causes:');
console.log('  1. Distance formula is incorrect');
console.log('  2. Velocity is not being calculated correctly');
console.log('  3. There is a bug in the convergence iteration');
console.log('  4. PQWT calculation is wrong for high-HP vehicles');
console.log('='.repeat(80));
