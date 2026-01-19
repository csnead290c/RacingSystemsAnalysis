/**
 * Debug trap speed calculation for TAD
 * Check if saveTime_1254ft and interpolation are correct
 */

import { simulateVB6Exact } from '../models/vb6Exact';

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

console.log('='.repeat(80));
console.log('TRAP SPEED CALCULATION DEBUG');
console.log('='.repeat(80));

const result = simulateVB6Exact(TAD);

console.log('\nFinal Results:');
console.log(`  ET: ${result.et_s.toFixed(4)}s (expected 5.52s)`);
console.log(`  MPH: ${result.mph.toFixed(2)} (expected 243.1 MPH)`);
console.log(`  Error: ${((result.mph - 243.1)).toFixed(2)} MPH`);

if (result.timeslip) {
  console.log('\nTimeslip data:');
  result.timeslip.forEach(t => {
    console.log(`  ${t.d_ft}ft: ${t.t_s.toFixed(4)}s @ ${t.v_mph.toFixed(2)} MPH`);
  });
  
  const t1254 = result.timeslip.find(t => t.d_ft === 1254);
  const t1320 = result.timeslip.find(t => t.d_ft === 1320);
  
  if (t1254 && t1320) {
    console.log('\n' + '='.repeat(80));
    console.log('TRAP SPEED CALCULATION');
    console.log('='.repeat(80));
    console.log(`\nTime at 1254ft: ${t1254.t_s.toFixed(6)}s`);
    console.log(`Time at 1320ft: ${t1320.t_s.toFixed(6)}s`);
    console.log(`Time difference: ${(t1320.t_s - t1254.t_s).toFixed(6)}s`);
    console.log(`Distance: 66 ft`);
    
    const Z5 = 3600 / 5280;
    const calculatedMPH = Z5 * 66 / (t1320.t_s - t1254.t_s);
    console.log(`\nCalculated MPH: Z5 * 66 / dt = ${Z5.toFixed(8)} * 66 / ${(t1320.t_s - t1254.t_s).toFixed(6)}`);
    console.log(`                = ${calculatedMPH.toFixed(6)} MPH`);
    console.log(`Recorded MPH: ${t1320.v_mph.toFixed(2)} MPH`);
    console.log(`Expected MPH: 243.1 MPH`);
    console.log(`\nDifference from expected: ${(calculatedMPH - 243.1).toFixed(2)} MPH`);
    
    // Check if rounding is the issue
    const rounded = Math.round(calculatedMPH * 10) / 10;
    console.log(`\nAfter rounding to 1 decimal: ${rounded.toFixed(1)} MPH`);
    console.log(`Expected after rounding: 243.1 MPH`);
    
    if (Math.abs(rounded - 243.1) < 0.05) {
      console.log('✅ Rounding matches!');
    } else {
      console.log(`❌ Still off by ${(rounded - 243.1).toFixed(2)} MPH after rounding`);
    }
  }
}

console.log('\n' + '='.repeat(80));
console.log('ANALYSIS');
console.log('='.repeat(80));
console.log('\nThe 0.19 MPH error could be caused by:');
console.log('  1. Interpolation precision at 1254ft or 1320ft');
console.log('  2. Accumulated velocity error throughout the run');
console.log('  3. Float32 vs Float64 precision differences');
console.log('  4. Rounding method differences');
console.log('\nSince ET is perfect (+8.9ms), the issue is specifically in MPH calculation.');
console.log('='.repeat(80));
