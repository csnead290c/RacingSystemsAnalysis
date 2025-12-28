/**
 * Diagnostic tool to identify clutch discrepancies
 * 
 * Compares Pro Stock simulation against expected VB6 output
 * to identify exact point of divergence
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

// Expected VB6 output from prostock.dat
const EXPECTED = {
  et_60ft: 1.01,
  et_330ft: 2.84,
  et_660ft: 4.37,
  mph_660ft: 163.7,
  et_1000ft: 5.68,
  et_1320ft: 6.80,
  mph_1320ft: 202.3,
  
  // Key intermediate points from VB6 printout
  rollout_time: 0.131,
  rollout_mph: 7.9,
  
  // Launch conditions
  launch_rpm: 7200,
  slip_rpm: 7600,
};

console.log('='.repeat(80));
console.log('PRO STOCK CLUTCH DIAGNOSTIC');
console.log('='.repeat(80));

const result = simulateVB6Exact(PRO_STOCK_INPUTS);

console.log('\n--- FINAL RESULTS ---');
console.log(`Expected ET: ${EXPECTED.et_1320ft.toFixed(2)}s`);
console.log(`Actual ET:   ${result.et_s.toFixed(2)}s`);
console.log(`Delta:       ${(result.et_s - EXPECTED.et_1320ft).toFixed(4)}s (${((result.et_s - EXPECTED.et_1320ft) * 1000).toFixed(1)}ms)`);
console.log();
console.log(`Expected MPH: ${EXPECTED.mph_1320ft.toFixed(1)}`);
console.log(`Actual MPH:   ${result.mph.toFixed(1)}`);
console.log(`Delta:        ${(result.mph - EXPECTED.mph_1320ft).toFixed(2)} mph`);

if (result.timeslip && result.timeslip.length > 0) {
  console.log('\n--- SPLIT COMPARISON ---');
  console.log('Distance | VB6 Time | Actual Time | Delta (ms) | VB6 MPH | Actual MPH | Delta');
  console.log('---------|----------|-------------|------------|---------|------------|-------');
  
  const splits = [
    { dist: 60, vb6_t: EXPECTED.et_60ft, vb6_mph: null },
    { dist: 330, vb6_t: EXPECTED.et_330ft, vb6_mph: null },
    { dist: 660, vb6_t: EXPECTED.et_660ft, vb6_mph: EXPECTED.mph_660ft },
    { dist: 1000, vb6_t: EXPECTED.et_1000ft, vb6_mph: null },
    { dist: 1320, vb6_t: EXPECTED.et_1320ft, vb6_mph: EXPECTED.mph_1320ft },
  ];
  
  for (const split of splits) {
    const actual = result.timeslip.find(s => s.d_ft === split.dist);
    if (actual) {
      const deltaMs = (actual.t_s - split.vb6_t) * 1000;
      const deltaMph = split.vb6_mph ? (actual.v_mph - split.vb6_mph) : null;
      console.log(
        `${split.dist.toString().padStart(7)}' | ` +
        `${split.vb6_t.toFixed(2).padStart(8)} | ` +
        `${actual.t_s.toFixed(2).padStart(11)} | ` +
        `${deltaMs >= 0 ? '+' : ''}${deltaMs.toFixed(1).padStart(10)} | ` +
        `${split.vb6_mph ? split.vb6_mph.toFixed(1).padStart(7) : '    N/A'} | ` +
        `${actual.v_mph.toFixed(1).padStart(10)} | ` +
        `${deltaMph !== null ? (deltaMph >= 0 ? '+' : '') + deltaMph.toFixed(1) : '   N/A'}`
      );
    }
  }
}

// Analyze where the error accumulates
if (result.timeslip && result.timeslip.length > 0) {
  console.log('\n--- ERROR ACCUMULATION ANALYSIS ---');
  
  const splits = [
    { dist: 60, vb6_t: EXPECTED.et_60ft },
    { dist: 330, vb6_t: EXPECTED.et_330ft },
    { dist: 660, vb6_t: EXPECTED.et_660ft },
    { dist: 1000, vb6_t: EXPECTED.et_1000ft },
    { dist: 1320, vb6_t: EXPECTED.et_1320ft },
  ];
  
  let prevDelta = 0;
  for (const split of splits) {
    const actual = result.timeslip.find(s => s.d_ft === split.dist);
    if (actual) {
      const deltaMs = (actual.t_s - split.vb6_t) * 1000;
      const incrementMs = deltaMs - prevDelta;
      console.log(
        `${split.dist.toString().padStart(4)}ft: ` +
        `Total error = ${deltaMs >= 0 ? '+' : ''}${deltaMs.toFixed(1)}ms, ` +
        `Increment = ${incrementMs >= 0 ? '+' : ''}${incrementMs.toFixed(1)}ms`
      );
      prevDelta = deltaMs;
    }
  }
}

// Check if error is consistent (systematic) or increasing (accumulating)
if (result.timeslip && result.timeslip.length >= 2) {
  const split60 = result.timeslip.find(s => s.d_ft === 60);
  const split1320 = result.timeslip.find(s => s.d_ft === 1320);
  
  if (split60 && split1320) {
    const error60 = (split60.t_s - EXPECTED.et_60ft) * 1000;
    const error1320 = (split1320.t_s - EXPECTED.et_1320ft) * 1000;
    const errorGrowth = error1320 - error60;
    
    console.log('\n--- ERROR PATTERN ---');
    console.log(`Error at 60ft:   ${error60 >= 0 ? '+' : ''}${error60.toFixed(1)}ms`);
    console.log(`Error at 1320ft: ${error1320 >= 0 ? '+' : ''}${error1320.toFixed(1)}ms`);
    console.log(`Error growth:    ${errorGrowth >= 0 ? '+' : ''}${errorGrowth.toFixed(1)}ms`);
    
    if (Math.abs(errorGrowth) < 2) {
      console.log('Pattern: SYSTEMATIC (constant offset) - likely initial condition issue');
    } else {
      console.log('Pattern: ACCUMULATING - likely integration or force calculation issue');
    }
  }
}

console.log('\n' + '='.repeat(80));
