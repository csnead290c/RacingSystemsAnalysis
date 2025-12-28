/**
 * Debug slippage calculation
 */

import { simulateVB6Exact } from '../models/vb6Exact';
import type { SimInputs } from '../index';

// Intercept console.log to capture initial state
const originalLog = console.log;
let capturedInitState: any = null;

console.log = (...args: any[]) => {
  const msg = args[0];
  if (typeof msg === 'string' && msg.includes('[vb6Exact] Initial state:')) {
    capturedInitState = args[1];
  }
  originalLog(...args);
};

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
      launchRPM: 7200,
      slipRPM: 7600,
      slipRatio: 1.004,  // This is NOT slippage!
    },
    gearRatios: [2.60, 1.90, 1.50, 1.20, 1.00],
    gearEfficiencies: [0.990, 0.991, 0.992, 0.993, 0.994],
    shiftRPMs: [9400, 9400, 9400, 9400, 0],
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
    fuelType: 'Gasoline Carburetor',
    hpTorqueMultiplier: 1.000,
    pmi: {
      engine_flywheel_clutch: 3.42,
      transmission_driveshaft: 0.247,
      tires_wheels_ringgear: 50.8,
    },
  },
  env: {
    elevation: 32,
    barometerInHg: 29.92,
    temperatureF: 75,
    humidityPct: 55,
    windMph: 5.0,
    windAngleDeg: 135,
    trackTempF: 105,
    tractionIndex: 3,
  },
  raceLength: 'QUARTER',
};

console.log('='.repeat(80));
console.log('SLIPPAGE DEBUG');
console.log('='.repeat(80));

console.log('\nInput clutch.slipRatio:', PRO_STOCK.vehicle.clutch?.slipRatio);
console.log('Input clutch.slipRPM:', PRO_STOCK.vehicle.clutch?.slipRPM);

const result = simulateVB6Exact(PRO_STOCK);

console.log('\n' + '='.repeat(80));
console.log('CALCULATED VALUES');
console.log('='.repeat(80));

if (capturedInitState) {
  console.log('\nSlippage used in simulation:', capturedInitState.slippage);
  console.log('Expected slippage: 1.0025 + 7600/1000000 =', 1.0025 + 7600/1000000);
  console.log('Match:', Math.abs(capturedInitState.slippage - (1.0025 + 7600/1000000)) < 0.0001 ? '✅' : '❌');
}

console.log('\n' + '='.repeat(80));
console.log('IMPORTANT NOTE');
console.log('='.repeat(80));
console.log('The clutch.slipRatio field (1.004) is NOT the same as slippage!');
console.log('VB6 calculates slippage as: 1.0025 + slipRPM / 1000000');
console.log('The slipRatio field appears to be unused in VB6.');
console.log('='.repeat(80));

// Restore console.log
console.log = originalLog;
