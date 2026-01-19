/**
 * Detailed QuarterJr diagnostic - compare against VB6 checkpoint data
 */

import { simulateVB6Exact } from '../models/vb6Exact';

// motorcyc.dat - simplest clutch case with detailed VB6 checkpoints
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
console.log('QUARTERJR MOTORCYCLE DETAILED DIAGNOSTIC');
console.log('='.repeat(80));

console.log('\nVB6 Expected Checkpoints (from motorcyc.dat):');
console.log('  Rollout: 0.219s @ 5.9 MPH');
console.log('  60ft:    1.61s @ 40.4 MPH');
console.log('  330ft:   4.73s @ 73.4 MPH');
console.log('  1/8 mi:  7.45s @ 90.7 MPH');
console.log('  1/4 mi:  12.00s @ 104.5 MPH');

console.log('\nVB6 shows slippage value: 1.076');
console.log('Our formula: 1.0025 + 6000/1000000 = 1.0085');
console.log('Discrepancy: VB6 shows 1.076, we calculate 1.0085');
console.log('This is a HUGE difference (6.75% vs 0.85%)!');

console.log('\n' + '='.repeat(80));
console.log('Running simulation...');
console.log('='.repeat(80));

const result = simulateVB6Exact(MOTORCYC);

console.log('\nOur Results:');
console.log(`  1/4 mi: ${result.et_s.toFixed(2)}s @ ${result.mph.toFixed(1)} MPH`);
console.log(`  Delta:  ${((result.et_s - 12.00) * 1000).toFixed(0)}ms, ${(result.mph - 104.5).toFixed(1)} MPH`);

console.log('\n' + '='.repeat(80));
console.log('KEY FINDING:');
console.log('='.repeat(80));
console.log('The VB6 output shows "1.076" at the top of the file.');
console.log('This does NOT match our slippage formula: 1.0025 + stallRPM/1000000');
console.log('');
console.log('Possible explanations:');
console.log('1. The number shown is NOT slippage but something else');
console.log('2. There is additional slippage calculation we are missing');
console.log('3. The formula is different than we think');
console.log('='.repeat(80));
