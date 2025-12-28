/**
 * Compare QuarterJr vs QuarterPro execution to identify differences
 */

import { simulateVB6Exact } from '../models/vb6Exact';

// Same vehicle, two modes: QuarterJr (synthetic curve) vs QuarterPro (full curve)
const baseVehicle = {
  id: 'test',
  name: 'Test',
  weightLb: 2355,
  wheelbaseIn: 105,
  rolloutIn: 12,
  rearGear: 4.86,
  tireDiaIn: 32.62676,
  tireWidthIn: 17.30,
  transmissionType: 'clutch' as const,
  clutch: { slipRPM: 7400, slipRatio: 1.004 },
  gearRatios: [2.60, 1.90, 1.50, 1.20, 1.00],
  fuelType: 'Gasoline Carburetor',
};

const baseEnv = {
  elevation: 400,
  barometerInHg: 29.92,
  temperatureF: 70,
  humidityPct: 30,
  trackTempF: 100,
  tractionIndex: 2,
};

// QuarterJr: Only peak HP/RPM, no curve
const quarterJr: any = {
  vehicle: {
    ...baseVehicle,
    powerHP: 1300,
    rpmAtPeakHP: 8900,
    displacementCID: 500,
    shiftRPM: 9300,
  },
  env: baseEnv,
  raceLength: 'QUARTER',
};

// QuarterPro: Full HP curve
const quarterPro: any = {
  vehicle: {
    ...baseVehicle,
    powerHP: 1300,
    shiftRPMs: [9300, 9300, 9300, 9300, 0],
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
    pmi: {
      engine_flywheel_clutch: 3.42,
      transmission_driveshaft: 0.247,
      tires_wheels_ringgear: 50.8,
    },
    gearEfficiencies: [0.990, 0.991, 0.992, 0.993, 0.994],
    finalDriveEfficiency: 0.975,
    cd: 0.240,
    frontalArea_ft2: 18.2,
    liftCoeff: 0.100,
  },
  env: baseEnv,
  raceLength: 'QUARTER',
};

console.log('='.repeat(80));
console.log('QUARTERJR VS QUARTERPRO COMPARISON');
console.log('='.repeat(80));

console.log('\nQuarterJr Mode (synthetic curve from peak HP):');
const qjrResult = simulateVB6Exact(quarterJr);
console.log(`  Result: ${qjrResult.et_s.toFixed(3)}s @ ${qjrResult.mph.toFixed(1)} MPH`);

console.log('\nQuarterPro Mode (full HP curve):');
const qproResult = simulateVB6Exact(quarterPro);
console.log(`  Result: ${qproResult.et_s.toFixed(3)}s @ ${qproResult.mph.toFixed(1)} MPH`);
console.log(`  Expected: 6.80s @ 202.3 MPH`);
console.log(`  Delta: ${((qproResult.et_s - 6.80) * 1000).toFixed(0)}ms`);

console.log('\n' + '='.repeat(80));
console.log('COMPARISON');
console.log('='.repeat(80));
console.log(`QuarterJr ET:  ${qjrResult.et_s.toFixed(3)}s`);
console.log(`QuarterPro ET: ${qproResult.et_s.toFixed(3)}s`);
console.log(`Difference:    ${((qjrResult.et_s - qproResult.et_s) * 1000).toFixed(0)}ms`);

console.log('\n' + '='.repeat(80));
console.log('KEY DIFFERENCES');
console.log('='.repeat(80));
console.log('QuarterJr:');
console.log('  - Generates 16-point synthetic HP curve');
console.log('  - Calculates gear efficiencies (0.975, 0.980, 0.985, 0.990, 0.995)');
console.log('  - Calculates PMI from displacement');
console.log('  - Calculates aero from body style');
console.log('  - Slippage: 1.0025 + stallRPM/1000000 = 1.0099');
console.log('  - Single shift RPM for all gears');
console.log('\nQuarterPro:');
console.log('  - Uses provided 11-point HP curve');
console.log('  - Uses provided gear efficiencies');
console.log('  - Uses provided PMI values');
console.log('  - Uses provided aero values');
console.log('  - Slippage: User input (1.004)');
console.log('  - Per-gear shift RPMs');
console.log('='.repeat(80));
