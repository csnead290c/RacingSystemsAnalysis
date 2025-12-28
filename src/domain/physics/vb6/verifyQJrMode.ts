/**
 * Verify QuarterJr mode is being detected and used correctly
 */

import { simulateVB6Exact } from '../models/vb6Exact';

// Motorcycle QuarterJr - simplest test case
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

console.log('='.repeat(80));
console.log('QUARTERJR MODE VERIFICATION');
console.log('='.repeat(80));

console.log('\nTest case configuration:');
console.log('  - Has powerHP and rpmAtPeakHP (no HP curve array)');
console.log('  - Has displacementCID for ENGINE() calculation');
console.log('  - Uses single shiftRPM value');
console.log('  - Should trigger QuarterJr mode');

console.log('\nExpected VB6 result: 12.00s @ 104.5 MPH');

const result = simulateVB6Exact(MOTORCYC);

console.log(`\nActual result: ${result.et_s.toFixed(2)}s @ ${result.mph.toFixed(1)} MPH`);
console.log(`Delta: ${((result.et_s - 12.00) * 1000).toFixed(0)}ms, ${(result.mph - 104.5).toFixed(1)} MPH`);

const etError = Math.abs(result.et_s - 12.00);
const mphError = Math.abs(result.mph - 104.5);

console.log('\n' + '='.repeat(80));
console.log('ANALYSIS');
console.log('='.repeat(80));

if (etError <= 0.01 && mphError <= 0.1) {
  console.log('✅ PASS - QuarterJr mode working correctly!');
} else if (etError < 1.0) {
  console.log('⚠️  Close but not within tolerance');
  console.log(`   ET error: ${(etError * 1000).toFixed(0)}ms (tolerance: 10ms)`);
  console.log(`   MPH error: ${mphError.toFixed(1)} (tolerance: 0.1)`);
  console.log('\nThis suggests QuarterJr mode is working but has small calculation differences.');
} else {
  console.log('❌ FAIL - Significant error');
  console.log(`   ET error: ${(etError * 1000).toFixed(0)}ms`);
  console.log(`   MPH error: ${mphError.toFixed(1)}`);
  console.log('\nThis suggests a fundamental issue with QuarterJr calculations.');
}

console.log('\n' + '='.repeat(80));
console.log('NEXT STEPS');
console.log('='.repeat(80));
console.log('Since we have verified:');
console.log('  ✅ HP curve generation is correct');
console.log('  ✅ TABY interpolation is correct');
console.log('  ✅ Gear efficiency calculation is correct');
console.log('  ✅ QuarterPro tests pass');
console.log('\nThe issue must be in:');
console.log('  - How calculated parameters (PMI, aero, efficiency) are applied');
console.log('  - Some QuarterJr-specific calculation we haven\'t checked');
console.log('  - Test case parameter differences from VB6 .dat files');
console.log('='.repeat(80));
