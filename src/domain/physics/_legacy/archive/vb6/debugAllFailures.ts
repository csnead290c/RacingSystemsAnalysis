/**
 * Comprehensive debugging of all failing test cases
 */

import { simulateVB6Exact } from '../models/vb6Exact';

console.log('='.repeat(80));
console.log('DEBUGGING ALL FAILING TEST CASES');
console.log('='.repeat(80));

// Top Alcohol Dragster (QuarterPro) - Expected: 5.52s @ 243.1 MPH
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

// Funny Car (QuarterPro) - Expected: 4.98s @ 297.0 MPH
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

// Pro Stock Jr (QuarterJr) - Expected: 6.84s @ 199.4 MPH
const PROSTOCK_JR: any = {
  vehicle: {
    id: 'qjr-prostock',
    name: 'Pro Stock Jr',
    powerHP: 1300,
    rpmAtPeakHP: 8900,
    weightLb: 2355,
    wheelbaseIn: 105,
    rolloutIn: 12,
    rearGear: 4.86,
    tireDiaIn: 32.62676,
    tireWidthIn: 17.30,
    frontalArea_ft2: 18.2,
    transmissionType: 'clutch',
    clutch: { slipRPM: 7400, lockup: false },
    gearRatios: [2.60, 1.90, 1.50, 1.20, 1.00],
    shiftRPM: 9300,
    fuelType: 'Gasoline Carburetor',
    displacementCID: 500,
  },
  env: { elevation: 400, barometerInHg: 29.92, temperatureF: 70, humidityPct: 30, trackTempF: 100, tractionIndex: 2 },
  raceLength: 'QUARTER',
};

// Super Comp (QuarterJr) - Expected: 8.90s @ 146.2 MPH
const SUPERCMP: any = {
  vehicle: {
    id: 'qjr-supercmp',
    name: 'Super Comp',
    powerHP: 430,
    rpmAtPeakHP: 6700,
    weightLb: 1450,
    wheelbaseIn: 225,
    rolloutIn: 10,
    rearGear: 4.86,
    tireDiaIn: 32.4,
    tireWidthIn: 12.30,
    frontalArea_ft2: 14.7,
    transmissionType: 'converter',
    converter: { stallRPM: 5500, diameterIn: 8 },
    gearRatios: [1.82, 1.00],
    shiftRPM: 7200,
    fuelType: 'Methanol Carburetor',
    displacementCID: 355,
  },
  env: { elevation: 1200, barometerInHg: 29.92, temperatureF: 88, humidityPct: 35, trackTempF: 118, tractionIndex: 5 },
  raceLength: 'QUARTER',
};

// Bonneville Roadster - Expected: 26.31s @ 351.8 MPH
const BONNEVILLE: any = {
  vehicle: {
    id: 'test-bonneville',
    name: 'Bonneville Roadster',
    powerHP: 4500,
    weightLb: 2350,
    wheelbaseIn: 200,
    rolloutIn: 0,
    rearGear: 2.10,
    tireDiaIn: 35.987,
    tireWidthIn: 10.0,
    cd: 0.150,
    frontalArea_ft2: 10.0,
    liftCoeff: 0.050,
    transmissionType: 'clutch',
    clutch: { launchRPM: 6400, slipRPM: 6400, slipRatio: 1.000 },
    gearRatios: [1.25, 1.00],
    gearEfficiencies: [0.80, 0.99],
    shiftRPMs: [7000, 100],
    hpCurve: [
      { rpm: 5000, hp: 3800 }, { rpm: 5500, hp: 4100 }, { rpm: 6000, hp: 4400 },
      { rpm: 6500, hp: 4500 }, { rpm: 7000, hp: 4500 }, { rpm: 7500, hp: 4400 },
      { rpm: 8000, hp: 4200 }, { rpm: 11000, hp: 73 }, { rpm: 11500, hp: 72 },
    ],
    fuelType: 'Gasoline Carburetor',
    hpTorqueMultiplier: 1.000,
    pmi: { engine_flywheel_clutch: 6.03, transmission_driveshaft: 0.5, tires_wheels_ringgear: 80.0 },
  },
  env: { elevation: 4200, barometerInHg: 29.92, temperatureF: 85, humidityPct: 10, windMph: 0.0, windAngleDeg: 0, trackTempF: 120, tractionIndex: 6 },
  raceLength: 'BONNEVILLE_LONG',
};

const tests = [
  { name: 'Top Alcohol Dragster (QuarterPro)', inputs: TAD, expected: { et: 5.52, mph: 243.1 }, type: 'QuarterPro' },
  { name: 'Funny Car (QuarterPro)', inputs: FUNNY, expected: { et: 4.98, mph: 297.0 }, type: 'QuarterPro' },
  { name: 'Pro Stock Jr (QuarterJr)', inputs: PROSTOCK_JR, expected: { et: 6.84, mph: 199.4 }, type: 'QuarterJr' },
  { name: 'Super Comp (QuarterJr)', inputs: SUPERCMP, expected: { et: 8.90, mph: 146.2 }, type: 'QuarterJr' },
  { name: 'Bonneville Roadster', inputs: BONNEVILLE, expected: { et: 26.31, mph: 351.8 }, type: 'Bonneville' },
];

tests.forEach(test => {
  console.log('\n' + '='.repeat(80));
  console.log(`TEST: ${test.name}`);
  console.log('='.repeat(80));
  console.log(`Type: ${test.type}`);
  console.log(`Expected: ${test.expected.et.toFixed(2)}s @ ${test.expected.mph.toFixed(1)} MPH`);
  
  const result = simulateVB6Exact(test.inputs);
  
  console.log(`Actual:   ${result.et_s.toFixed(2)}s @ ${result.mph.toFixed(1)} MPH`);
  
  const deltaET_ms = (result.et_s - test.expected.et) * 1000;
  const deltaMPH = result.mph - test.expected.mph;
  const etError_pct = (deltaET_ms / (test.expected.et * 1000)) * 100;
  
  console.log(`Delta:    ${deltaET_ms >= 0 ? '+' : ''}${deltaET_ms.toFixed(1)}ms (${etError_pct >= 0 ? '+' : ''}${etError_pct.toFixed(2)}%), ${deltaMPH >= 0 ? '+' : ''}${deltaMPH.toFixed(1)} MPH`);
  
  const etPass = Math.abs(deltaET_ms) <= 10;
  const mphPass = Math.abs(deltaMPH) <= 0.1;
  
  if (etPass && mphPass) {
    console.log('✅ PASS');
  } else {
    console.log('❌ FAIL');
    if (!etPass) console.log(`   ET error: ${Math.abs(deltaET_ms).toFixed(1)}ms > 10ms tolerance`);
    if (!mphPass) console.log(`   MPH error: ${Math.abs(deltaMPH).toFixed(1)} > 0.1 MPH tolerance`);
  }
});

console.log('\n' + '='.repeat(80));
console.log('ANALYSIS');
console.log('='.repeat(80));

console.log('\nError patterns:');
console.log('  QuarterPro: Small errors (< 30ms) - likely precision/integration issues');
console.log('  QuarterJr: LARGE errors (186-448ms) - likely fundamental calculation bug');
console.log('  Bonneville: Moderate error (138ms) - likely land speed specific issue');

console.log('\nNext steps:');
console.log('  1. Fix QuarterJr fundamental issue (highest priority - 186-448ms errors)');
console.log('  2. Fix Bonneville land speed issue (138ms error)');
console.log('  3. Fix QuarterPro precision issues (< 30ms errors)');
console.log('='.repeat(80));
