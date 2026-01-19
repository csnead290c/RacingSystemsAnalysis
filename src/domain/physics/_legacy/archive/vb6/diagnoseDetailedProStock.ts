/**
 * Detailed Pro Stock diagnostic comparing against VB6 printout
 * 
 * VB6 printout shows intermediate points with time, distance, MPH, acceleration, gear, RPM
 * We'll compare our simulation against these exact points to find where we diverge
 */

import { simulateVB6Exact } from '../models/vb6Exact';
import type { SimInputs } from '../index';

const PRO_STOCK_INPUTS: SimInputs = {
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
      slipRatio: 1.004,
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

// VB6 printout data points from prostock.dat
const VB6_POINTS = [
  { time: 0.131, dist: 0, mph: 7.9, accel: 2.69, gear: 1, rpm: 7600, label: 'Rollout' },
  { time: 0.50, dist: 21, mph: 37.4, accel: 2.66, gear: 1, rpm: 7600 },
  { time: 0.64, dist: 30, mph: 45.9, accel: 2.65, gear: 1, rpm: 7600 },
  { time: 0.90, dist: 50, mph: 60.0, accel: 2.19, gear: 1, rpm: 8570 },
  { time: 1.00, dist: 59, mph: 64.5, accel: 2.03, gear: 1, rpm: 9170 },
  { time: 1.01, dist: 60, mph: 64.9, accel: 2.05, gear: 1, rpm: 9200 },
  { time: 1.05, dist: 64, mph: 66.5, accel: 1.99, gear: 1, rpm: 9410 },
  { time: 1.25, dist: 85, mph: 76.9, accel: 2.22, gear: 2, rpm: 7950 },
  { time: 1.50, dist: 115, mph: 87.2, accel: 1.74, gear: 2, rpm: 8810 },
  { time: 1.69, dist: 141, mph: 93.8, accel: 1.44, gear: 2, rpm: 9400 },
  { time: 1.89, dist: 169, mph: 101.4, accel: 1.67, gear: 3, rpm: 7970 },
  { time: 2.00, dist: 186, mph: 105.0, accel: 1.43, gear: 3, rpm: 8210 },
  { time: 2.50, dist: 269, mph: 119.9, accel: 1.23, gear: 3, rpm: 9220 },
  { time: 2.60, dist: 287, mph: 122.6, accel: 1.16, gear: 3, rpm: 9390 },
  { time: 2.80, dist: 323, mph: 128.3, accel: 1.27, gear: 4, rpm: 7830 },
  { time: 2.84, dist: 330, mph: 129.2, accel: 1.14, gear: 4, rpm: 7870 },
  { time: 3.00, dist: 362, mph: 133.3, accel: 1.10, gear: 4, rpm: 8060 },
  { time: 3.50, dist: 463, mph: 145.2, accel: 1.04, gear: 4, rpm: 8670 },
  { time: 4.00, dist: 574, mph: 156.2, accel: 0.94, gear: 4, rpm: 9210 },
  { time: 4.19, dist: 617, mph: 159.9, accel: 0.89, gear: 4, rpm: 9380 },
  { time: 4.37, dist: 660, mph: 163.7, accel: 0.94, gear: 5, rpm: 8120 },
  { time: 4.39, dist: 665, mph: 164.2, accel: 0.94, gear: 5, rpm: 8020 },
  { time: 4.50, dist: 693, mph: 166.3, accel: 0.85, gear: 5, rpm: 8100 },
  { time: 5.00, dist: 818, mph: 175.6, accel: 0.83, gear: 5, rpm: 8470 },
  { time: 5.50, dist: 950, mph: 184.3, accel: 0.77, gear: 5, rpm: 8830 },
  { time: 5.68, dist: 1000, mph: 187.4, accel: 0.76, gear: 5, rpm: 8950 },
  { time: 6.00, dist: 1088, mph: 192.4, accel: 0.72, gear: 5, rpm: 9150 },
  { time: 6.50, dist: 1232, mph: 199.7, accel: 0.64, gear: 5, rpm: 9420 },
  { time: 6.80, dist: 1320, mph: 203.8, accel: 0.59, gear: 5, rpm: 9570 },
];

console.log('='.repeat(80));
console.log('PRO STOCK DETAILED DIAGNOSTIC - Point-by-Point Comparison');
console.log('='.repeat(80));

const result = simulateVB6Exact(PRO_STOCK_INPUTS);

if (!result.traces || result.traces.length === 0) {
  console.log('ERROR: No trace data available');
  throw new Error('No trace data available');
}

console.log('\n--- POINT-BY-POINT COMPARISON ---');
console.log('Time  | Dist  | VB6 MPH | Our MPH | ΔMPH  | VB6 Gear | Our Gear | VB6 RPM | Our RPM | ΔRPM | Label');
console.log('------|-------|---------|---------|-------|----------|----------|---------|---------|------|-------');

let maxMphError = 0;
let maxMphErrorPoint = '';

for (const vb6Point of VB6_POINTS) {
  // Find closest trace point by time
  const ourPoint = result.traces.reduce((closest, pt) => {
    const timeDiff = Math.abs(pt.t_s - vb6Point.time);
    const closestDiff = Math.abs(closest.t_s - vb6Point.time);
    return timeDiff < closestDiff ? pt : closest;
  });
  
  const mphError = ourPoint.v_mph - vb6Point.mph;
  const rpmError = ourPoint.rpm - vb6Point.rpm;
  
  if (Math.abs(mphError) > Math.abs(maxMphError)) {
    maxMphError = mphError;
    maxMphErrorPoint = vb6Point.label || `${vb6Point.dist}ft`;
  }
  
  console.log(
    `${vb6Point.time.toFixed(2).padStart(5)} | ` +
    `${vb6Point.dist.toString().padStart(5)} | ` +
    `${vb6Point.mph.toFixed(1).padStart(7)} | ` +
    `${ourPoint.v_mph.toFixed(1).padStart(7)} | ` +
    `${(mphError >= 0 ? '+' : '') + mphError.toFixed(1).padStart(5)} | ` +
    `${vb6Point.gear.toString().padStart(8)} | ` +
    `${ourPoint.gear.toString().padStart(8)} | ` +
    `${vb6Point.rpm.toString().padStart(7)} | ` +
    `${ourPoint.rpm.toFixed(0).padStart(7)} | ` +
    `${(rpmError >= 0 ? '+' : '') + rpmError.toFixed(0).padStart(4)} | ` +
    `${vb6Point.label || ''}`
  );
}

console.log('\n--- SUMMARY ---');
console.log(`Maximum MPH error: ${maxMphError.toFixed(1)} mph at ${maxMphErrorPoint}`);
console.log(`Final ET: ${result.et_s.toFixed(2)}s (expected 6.80s, delta ${(result.et_s - 6.80).toFixed(3)}s)`);
console.log(`Final MPH: ${result.mph.toFixed(1)} (expected 202.3, delta ${(result.mph - 202.3).toFixed(1)})`);

console.log('\n' + '='.repeat(80));
