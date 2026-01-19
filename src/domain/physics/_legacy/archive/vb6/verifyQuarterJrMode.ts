/**
 * Verify QuarterJr mode detection is working correctly
 */

import { simulateVB6Exact } from '../models/vb6Exact';

// Test case that should trigger QuarterJr mode
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
console.log('QUARTERJR MODE DETECTION VERIFICATION');
console.log('='.repeat(80));

console.log('\nTest case has:');
console.log('  - powerHP: 80');
console.log('  - rpmAtPeakHP: 7200');
console.log('  - displacementCID: 60');
console.log('  - NO hpCurve array');
console.log('  - shiftRPM: 8000 (single value, not array)');

console.log('\nThis should trigger QuarterJr mode because:');
console.log('  1. No HP curve array provided');
console.log('  2. Has powerHP and rpmAtPeakHP');
console.log('  3. Has displacement for ENGINE() calculation');

console.log('\nRunning simulation...');

const result = simulateVB6Exact(MOTORCYC);

console.log('\n' + '='.repeat(80));
console.log('RESULT');
console.log('='.repeat(80));
console.log(`ET: ${result.et_s.toFixed(3)}s`);
console.log(`MPH: ${result.mph.toFixed(1)}`);
console.log(`Expected: 12.00s @ 104.5 MPH`);
console.log(`Delta: ${((result.et_s - 12.00) * 1000).toFixed(0)}ms, ${(result.mph - 104.5).toFixed(1)} MPH`);

// Check if warnings include QuarterJr mode
if (result.warnings) {
  console.log('\nWarnings:');
  result.warnings.forEach(w => console.log(`  - ${w}`));
  
  const hasQJrWarning = result.warnings.some(w => w.includes('QuarterJr'));
  if (hasQJrWarning) {
    console.log('\n✅ QuarterJr mode was detected');
  } else {
    console.log('\n❌ QuarterJr mode was NOT detected - this is the problem!');
  }
}

console.log('='.repeat(80));
