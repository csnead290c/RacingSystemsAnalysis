/**
 * Debug Funny Car simulation failure
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
console.log('FUNNY CAR DEBUG');
console.log('='.repeat(80));

const result = simulateVB6Exact(FUNNY);

console.log('\n' + '='.repeat(80));
console.log('RESULT');
console.log('='.repeat(80));
console.log(`ET: ${result.et_s.toFixed(3)}s`);
console.log(`MPH: ${result.mph.toFixed(1)}`);

console.log('\n' + '='.repeat(80));
console.log('TRACE SUMMARY');
console.log('='.repeat(80));
if (result.traces) {
  console.log(`Total steps: ${result.traces.length}`);
  console.log(`Final time: ${result.traces[result.traces.length - 1]?.t_s.toFixed(3)}s`);
  console.log(`Final dist: ${result.traces[result.traces.length - 1]?.s_ft.toFixed(1)}ft`);
  console.log(`Final vel: ${result.traces[result.traces.length - 1]?.v_mph.toFixed(1)}mph`);

  console.log('\nLast 10 steps:');
  const lastSteps = result.traces.slice(-10);
  lastSteps.forEach(t => {
    console.log(`  t=${t.t_s.toFixed(3)}s, d=${t.s_ft.toFixed(1)}ft, v=${t.v_mph.toFixed(1)}mph, a=${t.a_g.toFixed(2)}g, rpm=${t.rpm.toFixed(0)}, gear=${t.gear}`);
  });
} else {
  console.log('No trace data available');
}

console.log('\n' + '='.repeat(80));
console.log('EXPECTED vs ACTUAL');
console.log('='.repeat(80));
console.log('Expected: 4.98s @ 297.0 MPH');
console.log(`Actual:   ${result.et_s.toFixed(2)}s @ ${result.mph.toFixed(1)} MPH`);
console.log(`Delta:    ${((result.et_s - 4.98) * 1000).toFixed(0)}ms, ${(result.mph - 297.0).toFixed(1)} MPH`);

if (result.et_s < 1.0) {
  console.log('\n❌ CRITICAL: Simulation terminated prematurely!');
  console.log('   Check for NaN, infinite loop, or early termination condition.');
}
console.log('='.repeat(80));
