/**
 * Systematic diagnostic to compare all key physics values
 * This will help identify exactly where our implementation diverges from VB6
 */

import { simulateVB6Exact } from '../models/vb6Exact';
import type { SimInputs } from '../index';

// Pro Stock test case - simplest clutch case
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

// Super Comp test case - converter that PASSES
const SUPER_COMP: SimInputs = {
  vehicle: {
    id: 'test-supercomp',
    name: 'Super Comp',
    defaultRaceLength: 'QUARTER',
    powerHP: 500,
    weightLb: 1700,
    wheelbaseIn: 90,
    rolloutIn: 12,
    overhangIn: 30,
    rearGear: 4.56,
    finalDriveEfficiency: 0.970,
    tireDiaIn: 32.6,
    tireWidthIn: 13.2,
    cd: 0.500,
    frontalArea_ft2: 13.6,
    liftCoeff: 0.150,
    transmissionType: 'converter',
    converter: {
      launchRPM: 5000,
      stallRPM: 5500,
      slipRatio: 1.060,
      lockup: false,
      torqueMult: 1.70,
    },
    gearRatios: [1.76, 1.00],
    gearEfficiencies: [0.970, 0.990],
    shiftRPMs: [7500, 100],
    hpCurve: [
      { rpm: 3500, hp: 267 },
      { rpm: 4500, hp: 351 },
      { rpm: 5500, hp: 432 },
      { rpm: 6500, hp: 491 },
      { rpm: 7000, hp: 500 },
      { rpm: 7500, hp: 468 },
      { rpm: 8000, hp: 421 },
      { rpm: 10000, hp: 72 },
    ],
    fuelType: 'Gasoline Carburetor',
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
console.log('SYSTEMATIC DIAGNOSTIC - Clutch vs Converter Comparison');
console.log('='.repeat(80));

console.log('\n' + '='.repeat(80));
console.log('PRO STOCK (Clutch - FAILS)');
console.log('='.repeat(80));
const psResult = simulateVB6Exact(PRO_STOCK);
console.log(`\nResult: ${psResult.et_s.toFixed(3)}s @ ${psResult.mph.toFixed(1)} MPH`);
console.log(`Expected: 6.800s @ 202.3 MPH`);
console.log(`Delta: ${(psResult.et_s - 6.800).toFixed(4)}s, ${(psResult.mph - 202.3).toFixed(2)} MPH`);

console.log('\n' + '='.repeat(80));
console.log('SUPER COMP (Converter - PASSES)');
console.log('='.repeat(80));
const scResult = simulateVB6Exact(SUPER_COMP);
console.log(`\nResult: ${scResult.et_s.toFixed(3)}s @ ${scResult.mph.toFixed(1)} MPH`);
console.log(`Expected: 8.900s @ 151.6 MPH`);
console.log(`Delta: ${(scResult.et_s - 8.900).toFixed(4)}s, ${(scResult.mph - 151.6).toFixed(2)} MPH`);

console.log('\n' + '='.repeat(80));
console.log('KEY DIFFERENCES TO INVESTIGATE:');
console.log('='.repeat(80));
console.log('\n1. Slippage calculation:');
console.log(`   Pro Stock (clutch): Should be 1.0025 + 7600/1000000 = 1.0101`);
console.log(`   Super Comp (converter): Should be calculated from stall parameters`);

console.log('\n2. ClutchSlip ratio:');
console.log(`   Pro Stock: ClutchSlip = LockRPM / EngRPM(L)`);
console.log(`   Super Comp: ClutchSlip = Work * LockRPM / zStall (when stalling)`);

console.log('\n3. HP chain:');
console.log(`   Both: HP = HP * TGEff * Efficiency / TireSlip - DragHP`);
console.log(`   But ClutchSlip is applied BEFORE this chain`);

console.log('\n4. Check if issue is in:');
console.log(`   - Initial slippage calculation`);
console.log(`   - ClutchSlip ratio during run`);
console.log(`   - HP curve interpolation`);
console.log(`   - Gear efficiency application`);
console.log(`   - Overall efficiency value`);

console.log('\n' + '='.repeat(80));
console.log('RECOMMENDATION:');
console.log('='.repeat(80));
console.log('Since converter vehicles pass perfectly, the core physics loop is correct.');
console.log('The issue must be in clutch-specific calculations:');
console.log('1. Verify slippage formula matches VB6 exactly');
console.log('2. Check if lockup feature affects non-lockup clutches');
console.log('3. Verify EngRPM clamping to stall RPM');
console.log('4. Check ClutchSlip calculation order');
console.log('5. Verify all clutch-specific constants');
console.log('='.repeat(80));
