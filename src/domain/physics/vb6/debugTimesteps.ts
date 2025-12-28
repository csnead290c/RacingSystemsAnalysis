/**
 * Debug timestep calculation for Funny Car
 */

import { simulateVB6Exact } from '../models/vb6Exact';

// Temporarily enable detailed timestep logging
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
console.log('TIMESTEP ANALYSIS - FUNNY CAR');
console.log('='.repeat(80));

console.log('\nThe simulation is taking 5000+ steps to reach only 4.7ft.');
console.log('This suggests the timestep is extremely small.');
console.log('\nVB6 adaptive timestep formula:');
console.log('  TimeStep = TSMax * (AgsMax / Ags0)^4');
console.log('\nIf Ags0 is very large and AgsMax is small, TimeStep becomes tiny.');
console.log('\nChecking initial conditions...');

const result = simulateVB6Exact(FUNNY);

console.log('\n' + '='.repeat(80));
console.log('DIAGNOSIS');
console.log('='.repeat(80));

if (result.traces && result.traces.length > 0) {
  const first = result.traces[0];
  const step10 = result.traces[Math.min(10, result.traces.length - 1)];
  const step100 = result.traces[Math.min(100, result.traces.length - 1)];
  
  console.log('\nStep 0 (launch):');
  console.log(`  Time: ${first.t_s.toFixed(6)}s`);
  console.log(`  Dist: ${first.s_ft.toFixed(6)}ft`);
  console.log(`  Vel: ${first.v_mph.toFixed(3)}mph`);
  console.log(`  Accel: ${first.a_g.toFixed(3)}g`);
  
  console.log('\nStep 10:');
  console.log(`  Time: ${step10.t_s.toFixed(6)}s`);
  console.log(`  Dist: ${step10.s_ft.toFixed(6)}ft`);
  console.log(`  Vel: ${step10.v_mph.toFixed(3)}mph`);
  console.log(`  Accel: ${step10.a_g.toFixed(3)}g`);
  console.log(`  Avg timestep: ${(step10.t_s / 10).toFixed(6)}s`);
  
  console.log('\nStep 100:');
  console.log(`  Time: ${step100.t_s.toFixed(6)}s`);
  console.log(`  Dist: ${step100.s_ft.toFixed(6)}ft`);
  console.log(`  Vel: ${step100.v_mph.toFixed(3)}mph`);
  console.log(`  Accel: ${step100.a_g.toFixed(3)}g`);
  console.log(`  Avg timestep: ${(step100.t_s / 100).toFixed(6)}s`);
}

console.log('\n' + '='.repeat(80));
console.log('LIKELY CAUSE');
console.log('='.repeat(80));
console.log('\nThe Funny Car has:');
console.log('  - Very high HP (6000 HP)');
console.log('  - Low weight (2450 lb)');
console.log('  - High power-to-weight ratio (2.45 HP/lb)');
console.log('  - Low traction (tractionIndex=2, very sticky)');
console.log('\nThis creates extremely high initial acceleration (Ags0),');
console.log('which makes the adaptive timestep formula produce tiny steps.');
console.log('\nPossible issues:');
console.log('  1. TSMax calculation is wrong for high-HP cars');
console.log('  2. Traction limit (AMax) is too low, causing Ags0 to be clamped incorrectly');
console.log('  3. Adaptive timestep formula is producing negative or near-zero values');
console.log('  4. There is a bug in the timestep limiting logic');
console.log('='.repeat(80));
