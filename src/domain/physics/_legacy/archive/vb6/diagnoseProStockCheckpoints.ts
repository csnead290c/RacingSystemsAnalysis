/**
 * Pro Stock Checkpoint Comparison
 * Compare our results against VB6 at specific checkpoints
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
      launchRPM: 7200,  // VB6 shows Launch@ RPM 7200
      slipRPM: 7600,
      slipRatio: 1.004,  // VB6 shows Clutch Slippage 1.004
    },
    gearRatios: [2.60, 1.90, 1.50, 1.20, 1.00],
    gearEfficiencies: [0.990, 0.991, 0.992, 0.993, 0.994],
    shiftRPMs: [9400, 9400, 9400, 9400, 100],
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
    fuelType: 'Gasoline Carburetor',  // VB6 shows Gasoline Carburetor
    hpTorqueMultiplier: 1.000,
    pmi: {
      engine_flywheel_clutch: 3.42,  // VB6 shows 3.42
      transmission_driveshaft: 0.247,  // VB6 shows 0.247
      tires_wheels_ringgear: 50.8,  // VB6 shows 50.8
    },
  },
  env: {
    elevation: 32,  // VB6 shows 32 feet
    barometerInHg: 29.92,
    temperatureF: 75,  // VB6 shows 75°F
    humidityPct: 55,  // VB6 shows 55%
    windMph: 5.0,  // VB6 shows 5.0 MPH
    windAngleDeg: 135,  // VB6 shows 135°
    trackTempF: 105,  // VB6 shows 105°F
    tractionIndex: 3,  // VB6 shows 3
  },
  raceLength: 'QUARTER',
};

console.log('='.repeat(80));
console.log('PRO STOCK CHECKPOINT COMPARISON');
console.log('='.repeat(80));

const result = simulateVB6Exact(PRO_STOCK);

console.log('\n' + '='.repeat(80));
console.log('VB6 CHECKPOINTS vs OUR RESULTS');
console.log('='.repeat(80));

console.log('\nCheckpoint | VB6 Time | VB6 MPH | Our Time | Our MPH | Delta Time | Delta MPH');
console.log('-----------|----------|---------|----------|---------|------------|----------');

// Rollout
const vb6_rollout = { time: 0.131, mph: 7.9 };
console.log(`Rollout    |   ${vb6_rollout.time.toFixed(3)}  |   ${vb6_rollout.mph.toFixed(1)}  |     ?    |    ?    |     ?      |    ?`);

// 60ft
const vb6_60ft = { time: 1.01, mph: 64.9 };
const our_60ft = result.et_60ft || 0;
const our_60mph = result.mph_60ft || 0;
const delta_60t = our_60ft - vb6_60ft.time;
const delta_60mph = our_60mph - vb6_60ft.mph;
console.log(`60ft       |   ${vb6_60ft.time.toFixed(3)}  |  ${vb6_60ft.mph.toFixed(1)}  |  ${our_60ft.toFixed(3)}  | ${our_60mph.toFixed(1)}  | ${delta_60t >= 0 ? '+' : ''}${(delta_60t * 1000).toFixed(0)}ms   | ${delta_60mph >= 0 ? '+' : ''}${delta_60mph.toFixed(1)}`);

// 330ft
const vb6_330ft = { time: 2.84, mph: 129.2 };
const our_330ft = result.et_330ft || 0;
const our_330mph = result.mph_330ft || 0;
const delta_330t = our_330ft - vb6_330ft.time;
const delta_330mph = our_330mph - vb6_330ft.mph;
console.log(`330ft      |   ${vb6_330ft.time.toFixed(3)}  | ${vb6_330ft.mph.toFixed(1)}  |  ${our_330ft.toFixed(3)}  | ${our_330mph.toFixed(1)} | ${delta_330t >= 0 ? '+' : ''}${(delta_330t * 1000).toFixed(0)}ms   | ${delta_330mph >= 0 ? '+' : ''}${delta_330mph.toFixed(1)}`);

// 1/8 Mile (660ft)
const vb6_eighth = { time: 4.37, mph: 160.9 };
const our_eighth = result.et_660ft || 0;
const our_eighthmph = result.mph_660ft || 0;
const delta_8t = our_eighth - vb6_eighth.time;
const delta_8mph = our_eighthmph - vb6_eighth.mph;
console.log(`1/8 Mile   |   ${vb6_eighth.time.toFixed(3)}  | ${vb6_eighth.mph.toFixed(1)}  |  ${our_eighth.toFixed(3)}  | ${our_eighthmph.toFixed(1)} | ${delta_8t >= 0 ? '+' : ''}${(delta_8t * 1000).toFixed(0)}ms   | ${delta_8mph >= 0 ? '+' : ''}${delta_8mph.toFixed(1)}`);

// 1/4 Mile (1320ft)
const vb6_quarter = { time: 6.80, mph: 202.3 };
const our_quarter = result.et_s;
const our_quartermph = result.mph;
const delta_qt = our_quarter - vb6_quarter.time;
const delta_qmph = our_quartermph - vb6_quarter.mph;
console.log(`1/4 Mile   |   ${vb6_quarter.time.toFixed(3)}  | ${vb6_quarter.mph.toFixed(1)}  |  ${our_quarter.toFixed(3)}  | ${our_quartermph.toFixed(1)} | ${delta_qt >= 0 ? '+' : ''}${(delta_qt * 1000).toFixed(0)}ms   | ${delta_qmph >= 0 ? '+' : ''}${delta_qmph.toFixed(1)}`);

console.log('\n' + '='.repeat(80));
console.log('ANALYSIS');
console.log('='.repeat(80));

console.log('\nError accumulation:');
if (Math.abs(delta_60t) > 0.005) {
  console.log('❌ Error starts EARLY (before 60ft) - check launch calculations');
} else {
  console.log('✅ Launch looks good (60ft within 5ms)');
}

if (Math.abs(delta_330t) > Math.abs(delta_60t) * 2) {
  console.log('❌ Error ACCELERATES between 60ft and 330ft - check gear shifts, HP chain');
} else {
  console.log('✅ Error rate is consistent');
}

if (Math.abs(delta_qt) > Math.abs(delta_8t) * 1.5) {
  console.log('❌ Error INCREASES in second half - check top-end calculations');
} else {
  console.log('✅ Error rate stays consistent throughout run');
}

console.log('\n' + '='.repeat(80));
console.log('KEY DIFFERENCES IN TEST DATA:');
console.log('='.repeat(80));
console.log('VB6 Input File shows:');
console.log('  - Launch RPM: 7200 (not 7600!)');
console.log('  - Clutch Slippage: 1.004 (not 1.000!)');
console.log('  - Temperature: 75°F (not 87°F)');
console.log('  - Humidity: 55% (not 35%)');
console.log('  - Track Temp: 105°F (not 112°F)');
console.log('  - Traction Index: 3 (not 5)');
console.log('  - Wind: 5.0 MPH @ 135° (not 0)');
console.log('  - Elevation: 32 ft (not 850 ft)');
console.log('  - PMI values: 3.42, 0.247, 50.8 (not 3.26, 0.511, 52.7)');
console.log('  - HP Curve: Different RPM/HP points');
console.log('\n⚠️  THE TEST CASE INPUTS DO NOT MATCH THE VB6 FILE!');
console.log('='.repeat(80));
