/**
 * QuarterJr test cases from VB6 output data
 * These use the exact inputs and expected outputs from VB6 .dat files
 */

import { simulateVB6Exact } from '../models/vb6Exact';

// etracer.dat - Expected: 13.50s @ 100.8 MPH
const ETRACER: any = {
  vehicle: {
    id: 'qjr-etracer',
    name: 'E-Tracer',
    powerHP: 325,
    rpmAtPeakHP: 5600,
    weightLb: 3600,
    wheelbaseIn: 108,
    rolloutIn: 14,
    rearGear: 4.11,
    tireDiaIn: 28.0,
    tireWidthIn: 10.0,
    frontalArea_ft2: 26.1,  // From VB6 .dat file
    transmissionType: 'converter',
    converter: { stallRPM: 3000, diameterIn: 10 },
    gearRatios: [2.48, 1.48, 1.00],
    shiftRPM: 6000,
    fuelType: 'Gasoline Carburetor',
    displacementCID: 350,
  },
  env: {
    elevation: 680,
    barometerInHg: 29.92,
    temperatureF: 86,
    humidityPct: 60,
    trackTempF: 116,
    tractionIndex: 8,
  },
  raceLength: 'QUARTER',
};

// exp.dat - Expected: 8.18s @ 160.2 MPH
const EXP: any = {
  vehicle: {
    id: 'qjr-exp',
    name: 'Experimental',
    powerHP: 850,
    rpmAtPeakHP: 7200,
    weightLb: 2250,
    wheelbaseIn: 102,
    rolloutIn: 14,
    rearGear: 4.86,
    tireDiaIn: 33.0,
    tireWidthIn: 17.0,
    frontalArea_ft2: 26.1,  // From VB6 .dat file
    transmissionType: 'converter',
    converter: { stallRPM: 6900, diameterIn: 8 },
    gearRatios: [1.80, 1.00],
    shiftRPM: 7900,
    fuelType: 'Gasoline Carburetor',
    displacementCID: 460,
  },
  env: {
    elevation: 680,
    barometerInHg: 29.92,
    temperatureF: 86,
    humidityPct: 60,
    trackTempF: 116,
    tractionIndex: 6,
  },
  raceLength: 'QUARTER',
};

// motorcyc.dat - Expected: 12.00s @ 104.5 MPH
const MOTORCYC: any = {
  vehicle: {
    id: 'qjr-motorcyc',
    name: 'Motorcycle',
    powerHP: 80,
    rpmAtPeakHP: 7200,
    weightLb: 730,
    wheelbaseIn: 54,
    rolloutIn: 12,
    rearGear: 6.81,
    tireDiaIn: 28.0,
    tireWidthIn: 5.0,
    frontalArea_ft2: 7.9,  // From VB6 .dat file
    transmissionType: 'clutch',
    clutch: { slipRPM: 6000, lockup: true },
    gearRatios: [2.74, 1.96, 1.40, 1.00],
    shiftRPM: 8000,
    fuelType: 'Gasoline Carburetor',
    displacementCID: 60,
  },
  env: {
    elevation: 900,
    barometerInHg: 29.92,
    temperatureF: 74,
    humidityPct: 40,
    trackTempF: 104,
    tractionIndex: 3,
  },
  raceLength: 'QUARTER',
};

// prostock.dat - Expected: 6.84s @ 199.4 MPH
const PROSTOCK: any = {
  vehicle: {
    id: 'qjr-prostock',
    name: 'Pro Stock',
    powerHP: 1300,
    rpmAtPeakHP: 8900,
    weightLb: 2355,
    wheelbaseIn: 105,
    rolloutIn: 12,
    rearGear: 4.86,
    tireDiaIn: 32.62676, // 102.5" rollout
    tireWidthIn: 17.30,
    frontalArea_ft2: 18.2,  // From VB6 .dat file
    transmissionType: 'clutch',
    clutch: { slipRPM: 7400, lockup: false },
    gearRatios: [2.60, 1.90, 1.50, 1.20, 1.00],
    shiftRPM: 9300,
    fuelType: 'Gasoline Carburetor',
    displacementCID: 500,
  },
  env: {
    elevation: 400,
    barometerInHg: 29.92,
    temperatureF: 70,
    humidityPct: 30,
    trackTempF: 100,
    tractionIndex: 2,
  },
  raceLength: 'QUARTER',
};

// supercmp.dat - Expected: 8.90s @ 146.2 MPH
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
  env: {
    elevation: 1200,
    barometerInHg: 29.92,
    temperatureF: 88,
    humidityPct: 35,
    trackTempF: 118,
    tractionIndex: 5,
  },
  raceLength: 'QUARTER',
};

const testCases = [
  { name: 'E-Tracer', inputs: ETRACER, expected: { et: 13.50, mph: 100.8 } },
  { name: 'Experimental', inputs: EXP, expected: { et: 8.18, mph: 160.2 } },
  { name: 'Motorcycle', inputs: MOTORCYC, expected: { et: 12.00, mph: 104.5 } },
  { name: 'Pro Stock', inputs: PROSTOCK, expected: { et: 6.84, mph: 199.4 } },
  { name: 'Super Comp', inputs: SUPERCMP, expected: { et: 8.90, mph: 146.2 } },
];

console.log('='.repeat(80));
console.log('QUARTERJR VB6 TEST CASES');
console.log('='.repeat(80));

let passCount = 0;
let failCount = 0;

testCases.forEach(test => {
  console.log(`\n${test.name}:`);
  console.log(`  Expected: ${test.expected.et.toFixed(2)}s @ ${test.expected.mph.toFixed(1)} MPH`);
  
  const result = simulateVB6Exact(test.inputs);
  
  console.log(`  Actual:   ${result.et_s.toFixed(2)}s @ ${result.mph.toFixed(1)} MPH`);
  
  const deltaET = result.et_s - test.expected.et;
  const deltaMPH = result.mph - test.expected.mph;
  
  console.log(`  Delta:    ${deltaET >= 0 ? '+' : ''}${(deltaET * 1000).toFixed(0)}ms, ${deltaMPH >= 0 ? '+' : ''}${deltaMPH.toFixed(1)} MPH`);
  
  const etPass = Math.abs(deltaET) <= 0.01;
  const mphPass = Math.abs(deltaMPH) <= 0.1;
  const pass = etPass && mphPass;
  
  if (pass) {
    console.log('  ✅ PASS');
    passCount++;
  } else {
    console.log('  ❌ FAIL');
    if (!etPass) console.log(`     ET error: ${Math.abs(deltaET * 1000).toFixed(0)}ms > 10ms`);
    if (!mphPass) console.log(`     MPH error: ${Math.abs(deltaMPH).toFixed(1)} > 0.1`);
    failCount++;
  }
});

console.log('\n' + '='.repeat(80));
console.log(`RESULTS: ${passCount}/${testCases.length} PASS (${((passCount / testCases.length) * 100).toFixed(0)}%)`);
console.log('='.repeat(80));
