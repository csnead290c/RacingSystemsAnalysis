/**
 * Detailed diagnostic for Pro Stock gear shifts
 * Compare our implementation against VB6 step-by-step during shifts
 */

import { simulateVB6Exact } from '../models/vb6Exact';
import type { SimInputs } from '../index';

// Pro Stock test case
const inputs: SimInputs = {
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
      launchRPM: 7600,
      slipRPM: 7600,
      slipRatio: 1.000,
    },
    gearRatios: [2.60, 1.90, 1.50, 1.20, 1.00],
    gearEfficiencies: [0.990, 0.991, 0.992, 0.993, 0.994],
    shiftRPMs: [9400, 9400, 9400, 9400, 100],
    hpCurve: [
      { rpm: 6000, hp: 1050 },
      { rpm: 7000, hp: 1180 },
      { rpm: 8000, hp: 1270 },
      { rpm: 9000, hp: 1300 },
      { rpm: 9400, hp: 1295 },
      { rpm: 10000, hp: 1250 },
      { rpm: 11000, hp: 1100 },
    ],
    fuelType: 'Gasoline Fuel Injection',
    hpTorqueMultiplier: 1.000,
    pmi: {
      engine_flywheel_clutch: 3.26,
      transmission_driveshaft: 0.511,
      tires_wheels_ringgear: 52.7,
    },
  },
  env: {
    elevation: 850,
    barometerInHg: 29.92,
    temperatureF: 87,
    humidityPct: 35,
    windMph: 0.0,
    windAngleDeg: 0,
    trackTempF: 112,
    tractionIndex: 5,
  },
  raceLength: 'QUARTER',
};

console.log('='.repeat(80));
console.log('Pro Stock Shift Diagnostic - VB6 Exact Port');
console.log('='.repeat(80));

const result = simulateVB6Exact(inputs);

console.log('\nFinal Results:');
console.log(`ET: ${result.et_s.toFixed(3)}s (expected 6.800s, delta: ${(result.et_s - 6.800).toFixed(4)}s)`);
console.log(`MPH: ${result.mph.toFixed(1)} (expected 202.3, delta: ${(result.mph - 202.3).toFixed(2)})`);

// Show trace around first shift (1→2 at ~1.25s)
if (result.traces) {
  console.log('\n' + '='.repeat(80));
  console.log('Trace around 1→2 shift (expected ~1.25s):');
  console.log('='.repeat(80));
  console.log('Time   | Dist  | MPH    | Accel | Gear | RPM   | Notes');
  console.log('-------|-------|--------|-------|------|-------|-------');
  
  for (const pt of result.traces) {
    if (pt.t_s >= 1.15 && pt.t_s <= 1.40) {
      const notes = pt.gear === 2 && pt.t_s < 1.30 ? '← SHIFT' : '';
      console.log(
        `${pt.t_s.toFixed(3)} | ` +
        `${pt.s_ft.toFixed(1).padStart(5)} | ` +
        `${pt.v_mph.toFixed(2).padStart(6)} | ` +
        `${pt.a_g.toFixed(3).padStart(5)} | ` +
        `${pt.gear.toString().padStart(4)} | ` +
        `${pt.rpm.toFixed(0).padStart(5)} | ` +
        notes
      );
    }
  }
  
  // Show trace around second shift (2→3 at ~2.36s)
  console.log('\n' + '='.repeat(80));
  console.log('Trace around 2→3 shift (expected ~2.36s):');
  console.log('='.repeat(80));
  console.log('Time   | Dist  | MPH    | Accel | Gear | RPM   | Notes');
  console.log('-------|-------|--------|-------|------|-------|-------');
  
  for (const pt of result.traces) {
    if (pt.t_s >= 2.26 && pt.t_s <= 2.51) {
      const notes = pt.gear === 3 && pt.t_s < 2.41 ? '← SHIFT' : '';
      console.log(
        `${pt.t_s.toFixed(3)} | ` +
        `${pt.s_ft.toFixed(1).padStart(5)} | ` +
        `${pt.v_mph.toFixed(2).padStart(6)} | ` +
        `${pt.a_g.toFixed(3).padStart(5)} | ` +
        `${pt.gear.toString().padStart(4)} | ` +
        `${pt.rpm.toFixed(0).padStart(5)} | ` +
        notes
      );
    }
  }
}

// Show timeslip
if (result.timeslip) {
  console.log('\n' + '='.repeat(80));
  console.log('Timeslip:');
  console.log('='.repeat(80));
  console.log('Distance | Time    | MPH     | Expected Time | Delta');
  console.log('---------|---------|---------|---------------|-------');
  
  const expected = [
    { dist: 60, time: 0.918, mph: 67.1 },
    { dist: 330, time: 2.358, mph: 141.3 },
    { dist: 660, time: 4.370, mph: 160.9 },
    { dist: 1000, time: 5.611, mph: 181.3 },
    { dist: 1320, time: 6.800, mph: 202.3 },
  ];
  
  for (const split of result.timeslip) {
    const exp = expected.find(e => e.dist === split.d_ft);
    if (exp) {
      const deltaT = split.t_s - exp.time;
      const deltaMPH = split.v_mph - exp.mph;
      console.log(
        `${split.d_ft.toString().padStart(7)}' | ` +
        `${split.t_s.toFixed(3).padStart(7)} | ` +
        `${split.v_mph.toFixed(1).padStart(7)} | ` +
        `${exp.time.toFixed(3).padStart(13)} | ` +
        `${deltaT >= 0 ? '+' : ''}${deltaT.toFixed(4)}`
      );
    }
  }
}

console.log('\n' + '='.repeat(80));
