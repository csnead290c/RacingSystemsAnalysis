/**
 * Diagnostic to investigate gear shift behavior
 * 
 * Logs detailed values during gear shifts to identify discrepancy
 */

import { simulateVB6Exact } from '../models/vb6Exact';
import type { SimInputs } from '../index';

const PRO_STOCK_INPUTS: SimInputs = {
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
      launchRPM: 7200,
      slipRPM: 7600,
      slipRatio: 1.004,
    },
    gearRatios: [2.60, 1.90, 1.50, 1.20, 1.00],
    gearEfficiencies: [0.990, 0.991, 0.992, 0.993, 0.994],
    shiftRPMs: [9400, 9400, 9400, 9400, 0],
    hpCurve: [
      { rpm: 7000, hp: 1078 },
      { rpm: 7250, hp: 1131 },
      { rpm: 7500, hp: 1177 },
      { rpm: 7750, hp: 1216 },
      { rpm: 8000, hp: 1251 },
      { rpm: 8250, hp: 1274 },
      { rpm: 8500, hp: 1288 },
      { rpm: 8750, hp: 1300 },
      { rpm: 9000, hp: 1297 },
      { rpm: 9250, hp: 1269 },
      { rpm: 9500, hp: 1222 },
    ],
    fuelType: 'Gasoline Carburetor',
    hpTorqueMultiplier: 1.000,
    pmi: {
      engine_flywheel_clutch: 3.42,
      transmission_driveshaft: 0.247,
      tires_wheels_ringgear: 50.8,
    },
  },
  env: {
    elevation: 32,
    barometerInHg: 29.92,
    temperatureF: 75,
    humidityPct: 55,
    windMph: 5.0,
    windAngleDeg: 135,
    trackTempF: 105,
    tractionIndex: 3,
  },
  raceLength: 'QUARTER',
};

console.log('='.repeat(80));
console.log('GEAR SHIFT DIAGNOSTIC - Pro Stock 1→2 Shift');
console.log('='.repeat(80));

const result = simulateVB6Exact(PRO_STOCK_INPUTS);

if (!result.traces || result.traces.length === 0) {
  console.log('ERROR: No trace data available');
  throw new Error('No trace data available');
}

// Find the 1→2 shift (around t=1.25s, gear changes from 1 to 2)
console.log('\n--- TRACE AROUND 1→2 SHIFT ---');
console.log('Time  | Gear | RPM  | MPH   | Accel | Notes');
console.log('------|------|------|-------|-------|-------');

let prevGear = 1;
for (let i = 0; i < result.traces.length; i++) {
  const pt = result.traces[i];
  
  // Show points around the 1→2 shift (t=1.0 to t=1.5)
  if (pt.t_s >= 1.0 && pt.t_s <= 1.5) {
    const gearChanged = pt.gear !== prevGear;
    const notes = gearChanged ? `← SHIFT ${prevGear}→${pt.gear}` : '';
    
    console.log(
      `${pt.t_s.toFixed(3)} | ` +
      `${pt.gear.toString().padStart(4)} | ` +
      `${pt.rpm.toFixed(0).padStart(4)} | ` +
      `${pt.v_mph.toFixed(1).padStart(5)} | ` +
      `${pt.a_g.toFixed(2).padStart(5)} | ` +
      `${notes}`
    );
    
    prevGear = pt.gear;
  }
}

// Compare against VB6 expected values
console.log('\n--- COMPARISON AT KEY POINTS ---');
console.log('Time  | Expected MPH | Actual MPH | Delta');
console.log('------|--------------|------------|-------');

const keyPoints = [
  { time: 1.00, mph: 64.5 },
  { time: 1.25, mph: 76.9 },  // After 1→2 shift
  { time: 1.50, mph: 87.2 },
];

for (const kp of keyPoints) {
  const closest = result.traces.reduce((prev, curr) => 
    Math.abs(curr.t_s - kp.time) < Math.abs(prev.t_s - kp.time) ? curr : prev
  );
  
  const delta = closest.v_mph - kp.mph;
  console.log(
    `${kp.time.toFixed(2).padStart(5)} | ` +
    `${kp.mph.toFixed(1).padStart(12)} | ` +
    `${closest.v_mph.toFixed(1).padStart(10)} | ` +
    `${(delta >= 0 ? '+' : '') + delta.toFixed(1).padStart(5)}`
  );
}

console.log('\n' + '='.repeat(80));
console.log(`Final: ${result.et_s.toFixed(2)}s @ ${result.mph.toFixed(1)} MPH`);
console.log(`Expected: 6.80s @ 202.3 MPH`);
console.log(`Delta: ${(result.et_s - 6.80).toFixed(3)}s, ${(result.mph - 202.3).toFixed(1)} MPH`);
console.log('='.repeat(80));
