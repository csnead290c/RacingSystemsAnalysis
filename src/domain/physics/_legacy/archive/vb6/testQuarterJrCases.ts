/**
 * Test QuarterJr cases from VB6 output data
 */

import { simulateVB6Exact } from '../models/vb6Exact';
import type { SimInputs } from '../index';

// QuarterJr prostock.dat - Expected: 6.84s @ 199.4 MPH
const QJR_PROSTOCK: any = {
  vehicle: {
    id: 'qjr-prostock',
    name: 'QuarterJr Pro Stock',
    defaultRaceLength: 'QUARTER',
    powerHP: 1300,
    rpmAtPeakHP: 8900,
    weightLb: 2355,
    wheelbaseIn: 105,
    rolloutIn: 12,
    overhangIn: 0,
    rearGear: 4.86,
    tireDiaIn: 32.62676, // 102.5" rollout
    tireWidthIn: 17.30,
    cd: 0.52,
    frontalArea_ft2: 18.2,
    liftCoeff: 0.8,
    transmissionType: 'clutch',
    clutch: {
      slipRPM: 7400,
    },
    gearRatios: [2.60, 1.90, 1.50, 1.20, 1.00],
    shiftRPM: 9300,  // QuarterJr uses single shift RPM for all gears
    fuelType: 'Gasoline Carburetor',
    displacementCID: 500,
  },
  env: {
    elevation: 400,
    barometerInHg: 29.92,
    temperatureF: 70,
    humidityPct: 30,
    windMph: 0,
    windAngleDeg: 0,
    trackTempF: 100,
    tractionIndex: 2,
  },
  raceLength: 'QUARTER',
};

// QuarterJr supergas.dat - Expected: 9.90s @ 132.8 MPH
const QJR_SUPERGAS: any = {
  vehicle: {
    id: 'qjr-supergas',
    name: 'QuarterJr Super Gas',
    defaultRaceLength: 'QUARTER',
    powerHP: 450,
    rpmAtPeakHP: 5800,
    weightLb: 2200,
    wheelbaseIn: 108,
    rolloutIn: 12,
    overhangIn: 0,
    rearGear: 4.56,
    tireDiaIn: 32.4,
    tireWidthIn: 14.40,
    cd: 0.46,
    frontalArea_ft2: 18.0,
    liftCoeff: 0.1,
    transmissionType: 'converter',
    converter: {
      stallRPM: 4500,
      diameterIn: 9,
    },
    gearRatios: [1.76, 1.00],
    shiftRPM: 6400,  // QuarterJr uses single shift RPM for all gears
    fuelType: 'Gasoline Carburetor',
    displacementCID: 454,
  },
  env: {
    elevation: 450,
    barometerInHg: 29.92,
    temperatureF: 85,
    humidityPct: 35,
    windMph: 0,
    windAngleDeg: 0,
    trackTempF: 115,
    tractionIndex: 5,
  },
  raceLength: 'QUARTER',
};

console.log('='.repeat(80));
console.log('QUARTERJR TEST CASES');
console.log('='.repeat(80));

console.log('\n1. QuarterJr Pro Stock (prostock.dat)');
console.log('   Expected: 6.84s @ 199.4 MPH');
const ps_result = simulateVB6Exact(QJR_PROSTOCK);
console.log(`   Actual:   ${ps_result.et_s.toFixed(2)}s @ ${ps_result.mph.toFixed(1)} MPH`);
console.log(`   Delta:    ${((ps_result.et_s - 6.84) * 1000).toFixed(0)}ms, ${(ps_result.mph - 199.4).toFixed(1)} MPH`);

console.log('\n2. QuarterJr Super Gas (supergas.dat)');
console.log('   Expected: 9.90s @ 132.8 MPH');
const sg_result = simulateVB6Exact(QJR_SUPERGAS);
console.log(`   Actual:   ${sg_result.et_s.toFixed(2)}s @ ${sg_result.mph.toFixed(1)} MPH`);
console.log(`   Delta:    ${((sg_result.et_s - 9.90) * 1000).toFixed(0)}ms, ${(sg_result.mph - 132.8).toFixed(1)} MPH`);

console.log('\n' + '='.repeat(80));
console.log('ANALYSIS');
console.log('='.repeat(80));
console.log('These are QuarterJr mode tests (synthetic HP curve from peak HP/RPM).');
console.log('Key differences from QuarterPro:');
console.log('  - Slippage calculated: 1.0025 + stallRPM/1000000');
console.log('  - LaunchRPM = Stall (always)');
console.log('  - Efficiency calculated from body style');
console.log('  - PMI values calculated from displacement');
console.log('='.repeat(80));
