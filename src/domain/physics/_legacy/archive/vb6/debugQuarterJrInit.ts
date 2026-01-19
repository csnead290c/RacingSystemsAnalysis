/**
 * Debug QuarterJr initialization
 */

import { simulateVB6Exact } from '../models/vb6Exact';
import type { SimInputs } from '../index';

// Minimal QuarterJr test case
const QJR_TEST: SimInputs = {
  vehicle: {
    id: 'qjr-test',
    name: 'QuarterJr Test',
    defaultRaceLength: 'QUARTER',
    powerHP: 1300,
    rpmAtPeakHP: 8900,
    weightLb: 2355,
    wheelbaseIn: 105,
    rolloutIn: 12,
    rearGear: 4.86,
    tireDiaIn: 32.62676,
    tireWidthIn: 17.30,
    transmissionType: 'clutch',
    clutch: {
      slipRPM: 7400,
    },
    gearRatios: [2.60, 1.90, 1.50, 1.20, 1.00],
    shiftRPM: 9300,  // QuarterJr uses single shift RPM, not array
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
} as any;

console.log('='.repeat(80));
console.log('QUARTERJR INITIALIZATION DEBUG');
console.log('='.repeat(80));

console.log('\nRunning simulation...\n');

try {
  const result = simulateVB6Exact(QJR_TEST);
  
  console.log('\n' + '='.repeat(80));
  console.log('RESULT');
  console.log('='.repeat(80));
  console.log(`ET: ${result.et_s.toFixed(3)}s`);
  console.log(`MPH: ${result.mph.toFixed(1)}`);
  
  if (result.et_s < 0 || result.et_s > 100) {
    console.log('\n❌ CATASTROPHIC FAILURE - Invalid ET');
  } else if (result.et_s < 6 || result.et_s > 8) {
    console.log('\n⚠️  ET out of expected range (6-8s for Pro Stock)');
  } else {
    console.log('\n✅ ET in reasonable range');
  }
} catch (error) {
  console.log('\n❌ ERROR:', error);
}

console.log('='.repeat(80));
