/**
 * Debug QuarterJr converter slippage calculation
 */

import { simulateVB6Exact } from '../models/vb6Exact';

// exp.dat - simplest converter case
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

console.log('='.repeat(80));
console.log('QUARTERJR CONVERTER DIAGNOSTIC (exp.dat)');
console.log('='.repeat(80));

console.log('\nVB6 Expected: 8.18s @ 160.2 MPH');
console.log('\nConverter parameters:');
console.log('  Stall RPM: 6900');
console.log('  Diameter: 8 inches');
console.log('  Peak HP: 850 @ 7200 RPM');

console.log('\nVB6 Converter Slippage Formula (QuarterJr):');
console.log('  lrat = Work / (200 * (7 / ConvDia)^4)');
console.log('  Slippage = 1.01 + lrat/20 + Work/8000');
console.log('  TorqueMult = 2.633 - lrat^0.3 - Work/1500');

const result = simulateVB6Exact(EXP);

console.log('\n' + '='.repeat(80));
console.log('RESULT');
console.log('='.repeat(80));
console.log(`Expected: 8.18s @ 160.2 MPH`);
console.log(`Actual:   ${result.et_s.toFixed(2)}s @ ${result.mph.toFixed(1)} MPH`);
console.log(`Delta:    ${((result.et_s - 8.18) * 1000).toFixed(0)}ms, ${(result.mph - 160.2).toFixed(1)} MPH`);

if (Math.abs(result.et_s - 8.18) <= 0.01 && Math.abs(result.mph - 160.2) <= 0.1) {
  console.log('\n✅ PASS');
} else {
  console.log('\n❌ FAIL');
  console.log('\nThe +225ms error suggests an issue with QuarterJr converter calculations.');
  console.log('Possible issues:');
  console.log('1. Stall RPM calculation from torque curve intersection');
  console.log('2. Work value calculation');
  console.log('3. Slippage or torque multiplier formula');
  console.log('4. Gear efficiency calculation for converters');
}
console.log('='.repeat(80));
