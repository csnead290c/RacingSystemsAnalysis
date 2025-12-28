/**
 * Detailed Pro Stock diagnostic - compare every intermediate value
 */

import { simulateVB6Exact } from '../models/vb6Exact';
import type { SimInputs } from '../index';

const PRO_STOCK: SimInputs = {
  vehicle: {
    id: 'test-prostock',
    name: 'Pro Stock',
    defaultRaceLength: 'QUARTER',
    powerHP: 1300,
    weightLb: 2355,
    wheelbaseIn: 107,
    rolloutIn: 9,
    overhangIn: 40,
    rearGear: 4.86,
    finalDriveEfficiency: 0.975,
    tireDiaIn: 32.62676,
    tireWidthIn: 17.0,
    cd: 0.240,
    frontalArea_ft2: 18.2,
    liftCoeff: 0.100,
    transmissionType: 'clutch',
    clutch: {
      launchRPM: 7600,
      slipRPM: 7600,
      slipRatio: 1.000,
    },
    gearRatios: [2.60, 1.90, 1.50, 1.20, 1.00],
    gearEfficiencies: [0.990, 0.991, 0.992, 0.993, 0.994],
    shiftRPMs: [9400, 9400, 9400, 9400, 100],
    hpCurve: [
      { rpm: 6000, hp: 1050 },
      { rpm: 7000, hp: 1180 },
      { rpm: 8000, hp: 1270 },
      { rpm: 9000, hp: 1300 },
      { rpm: 9400, hp: 1295 },
      { rpm: 10000, hp: 1250 },
      { rpm: 11000, hp: 1100 },
    ],
    fuelType: 'Gasoline Fuel Injection',
    hpTorqueMultiplier: 1.000,
    pmi: {
      engine_flywheel_clutch: 3.26,
      transmission_driveshaft: 0.511,
      tires_wheels_ringgear: 52.7,
    },
  },
  env: {
    elevation: 850,
    barometerInHg: 29.92,
    temperatureF: 87,
    humidityPct: 35,
    windMph: 0.0,
    windAngleDeg: 0,
    trackTempF: 112,
    tractionIndex: 5,
  },
  raceLength: 'QUARTER',
};

console.log('='.repeat(80));
console.log('PRO STOCK DETAILED DIAGNOSTIC');
console.log('='.repeat(80));

const result = simulateVB6Exact(PRO_STOCK);

console.log('\n' + '='.repeat(80));
console.log('EXPECTED vs ACTUAL');
console.log('='.repeat(80));
console.log(`Expected: 6.800s @ 202.3 MPH`);
console.log(`Actual:   ${result.et_s.toFixed(3)}s @ ${result.mph.toFixed(1)} MPH`);
console.log(`Delta:    ${(result.et_s - 6.800).toFixed(4)}s, ${(result.mph - 202.3).toFixed(2)} MPH`);
console.log(`Error:    ${((result.et_s - 6.800) / 6.800 * 100).toFixed(2)}% ET, ${((result.mph - 202.3) / 202.3 * 100).toFixed(2)}% MPH`);

console.log('\n' + '='.repeat(80));
console.log('KEY VALUES TO VERIFY AGAINST VB6:');
console.log('='.repeat(80));
console.log('\n1. Slippage calculation:');
console.log(`   Formula: 1.0025 + slipRPM / 1000000`);
console.log(`   slipRPM = 7600`);
console.log(`   Expected: 1.0025 + 7600/1000000 = 1.0101`);
console.log(`   Check VB6 output for gc_Slippage.Value`);

console.log('\n2. Launch RPM:');
console.log(`   For clutch: LaunchRPM should equal slipRPM = 7600`);
console.log(`   Check VB6 output for gc_LaunchRPM.Value`);

console.log('\n3. Gear efficiencies:');
console.log(`   TGEff(1) = 0.990`);
console.log(`   TGEff(2) = 0.991`);
console.log(`   Overall efficiency = 0.975`);
console.log(`   Check VB6 output for these values`);

console.log('\n4. Initial acceleration factor:');
console.log(`   Clutch uses 0.88 (12% loss)`);
console.log(`   Converter uses 0.96 (4% loss)`);
console.log(`   Check VB6 calculation: Ags0 = 0.88 * force / Weight`);

console.log('\n5. Tire slip:');
console.log(`   Initial: 1.02 + (TractionIndex-1)*0.005 + (TrackTempEffect-1)*3`);
console.log(`   TractionIndex = 5`);
console.log(`   TrackTempEffect = ?`);
console.log(`   Check VB6 output for TireSlip value`);

console.log('\n' + '='.repeat(80));
console.log('NEXT STEPS:');
console.log('='.repeat(80));
console.log('1. Run VB6 program with exact same inputs');
console.log('2. Compare intermediate values step-by-step');
console.log('3. Find first value that diverges');
console.log('4. Fix that specific calculation');
console.log('='.repeat(80));
