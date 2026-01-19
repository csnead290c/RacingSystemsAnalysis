/**
 * Detailed trace comparison for Top Alcohol Dragster
 * Compare our simulation step-by-step with VB6 output
 */

import { simulateVB6Exact } from '../models/vb6Exact';

const TA_DRAGSTER: any = {
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
    tireDiaIn: 35.014, // 110" rollout
    tireWidthIn: 17.00,
    cd: 0.580,
    frontalArea_ft2: 19.5,
    liftCoeff: 0.400,
    transmissionType: 'clutch',
    clutch: {
      launchRPM: 6000,
      slipRPM: 7200,
      slipRatio: 1.010,
    },
    gearRatios: [1.85, 1.30, 1.00],
    gearEfficiencies: [0.970, 0.980, 0.990],
    shiftRPMs: [9200, 9400, 100],
    hpCurve: [
      { rpm: 6000, hp: 1847 },
      { rpm: 6500, hp: 2058 },
      { rpm: 7000, hp: 2256 },
      { rpm: 7500, hp: 2458 },
      { rpm: 8000, hp: 2639 },
      { rpm: 8500, hp: 2729 },
      { rpm: 9000, hp: 2672 },
      { rpm: 9500, hp: 2415 },
      { rpm: 10000, hp: 1999 },
      { rpm: 11000, hp: 73 },
      { rpm: 11500, hp: 72 },
    ],
    fuelType: 'Supercharged Methanol',
    hpTorqueMultiplier: 1.000,
    pmi: {
      engine_flywheel_clutch: 4.84,
      transmission_driveshaft: 0.426,
      tires_wheels_ringgear: 64.6,
    },
  },
  env: {
    elevation: 0,
    barometerInHg: 29.92,
    temperatureF: 77,
    humidityPct: 45,
    windMph: 0.0,
    windAngleDeg: 0,
    trackTempF: 110,
    tractionIndex: 2,
  },
  raceLength: 'QUARTER',
};

console.log('='.repeat(80));
console.log('TOP ALCOHOL DRAGSTER - DETAILED TRACE COMPARISON');
console.log('='.repeat(80));

const result = simulateVB6Exact(TA_DRAGSTER);

console.log('\n' + '='.repeat(80));
console.log('VB6 TRACE DATA (from printout)');
console.log('='.repeat(80));

// VB6 trace points from the printout
const vb6Trace = [
  { time: 0.00, dist: 0, mph: 0.0, accel: 3.25, gear: 1, rpm: 6000 },
  { time: 0.146, dist: 0, mph: 10.3, accel: 3.38, gear: 1, rpm: 7200, note: 'Rollout' },
  { time: 0.25, dist: 11, mph: 29.2, accel: 3.36, gear: 1, rpm: 7200 },
  { time: 0.50, dist: 25, mph: 47.6, accel: 3.32, gear: 1, rpm: 7200 },
  { time: 0.56, dist: 30, mph: 52.3, accel: 3.31, gear: 1, rpm: 7200 },
  { time: 0.67, dist: 39, mph: 60.0, accel: 3.29, gear: 1, rpm: 7200 },
  { time: 0.75, dist: 46, mph: 65.8, accel: 3.26, gear: 1, rpm: 7200 },
  { time: 0.88, dist: 60, mph: 75.4, accel: 3.25, gear: 1, rpm: 7200, note: '60ft' },
  { time: 1.00, dist: 74, mph: 83.7, accel: 3.22, gear: 1, rpm: 7670 },
  { time: 1.23, dist: 105, mph: 100.0, accel: 3.16, gear: 1, rpm: 9050 },
  { time: 1.25, dist: 107, mph: 101.2, accel: 3.11, gear: 1, rpm: 9130 },
  { time: 1.26, dist: 109, mph: 102.0, accel: 3.06, gear: 1, rpm: 9210 },
  { time: 1.46, dist: 141, mph: 116.5, accel: 3.12, gear: 2, rpm: 7370, note: 'Shift 1->2' },
  { time: 1.50, dist: 148, mph: 119.1, accel: 2.97, gear: 2, rpm: 7430 },
  { time: 1.75, dist: 194, mph: 134.0, accel: 2.62, gear: 2, rpm: 8160 },
  { time: 2.00, dist: 246, mph: 147.8, accel: 2.40, gear: 2, rpm: 8820 },
  { time: 2.25, dist: 303, mph: 159.9, accel: 2.04, gear: 2, rpm: 9340 },
  { time: 2.28, dist: 309, mph: 161.0, accel: 1.93, gear: 2, rpm: 9410 },
  { time: 2.36, dist: 330, mph: 165.0, accel: 1.98, gear: 3, rpm: 8420, note: '330ft + Shift 2->3' },
  { time: 2.48, dist: 358, mph: 170.2, accel: 2.01, gear: 3, rpm: 7620 },
  { time: 2.50, dist: 363, mph: 171.1, accel: 1.92, gear: 3, rpm: 7640 },
  { time: 2.75, dist: 428, mph: 180.9, accel: 1.72, gear: 3, rpm: 7970 },
  { time: 3.00, dist: 496, mph: 190.2, accel: 1.62, gear: 3, rpm: 8310 },
  { time: 3.25, dist: 567, mph: 198.9, accel: 1.51, gear: 3, rpm: 8620 },
  { time: 3.50, dist: 642, mph: 206.8, accel: 1.34, gear: 3, rpm: 8890 },
  { time: 3.56, dist: 660, mph: 208.6, accel: 1.33, gear: 3, rpm: 8920, note: '1/8 mile' },
  { time: 3.75, dist: 719, mph: 214.0, accel: 1.24, gear: 3, rpm: 9110 },
  { time: 4.00, dist: 799, mph: 220.3, accel: 1.05, gear: 3, rpm: 9300 },
  { time: 4.25, dist: 881, mph: 225.8, accel: 0.92, gear: 3, rpm: 9450 },
  { time: 4.50, dist: 964, mph: 230.5, accel: 0.79, gear: 3, rpm: 9590 },
  { time: 4.61, dist: 1000, mph: 232.3, accel: 0.73, gear: 3, rpm: 9640 },
  { time: 4.75, dist: 1050, mph: 234.6, accel: 0.67, gear: 3, rpm: 9690 },
  { time: 5.00, dist: 1136, mph: 238.1, accel: 0.58, gear: 3, rpm: 9790 },
  { time: 5.25, dist: 1224, mph: 241.1, accel: 0.50, gear: 3, rpm: 9860 },
  { time: 5.50, dist: 1313, mph: 243.8, accel: 0.43, gear: 3, rpm: 9940 },
  { time: 5.52, dist: 1320, mph: 244.0, accel: 0.46, gear: 3, rpm: 9930, note: '1/4 mile' },
];

console.log('\nKey VB6 checkpoints:');
console.log('  Launch:  0.00s @ 0.0 MPH, 3.25g, gear 1, 6000 RPM');
console.log('  Rollout: 0.146s @ 10.3 MPH, 3.38g, gear 1, 7200 RPM');
console.log('  60ft:    0.88s @ 75.4 MPH, 3.25g, gear 1, 7200 RPM');
console.log('  330ft:   2.36s @ 165.0 MPH, 1.98g, gear 3, 8420 RPM');
console.log('  1/8:     3.56s @ 208.6 MPH, 1.33g, gear 3, 8920 RPM');
console.log('  1/4:     5.52s @ 244.0 MPH, 0.46g, gear 3, 9930 RPM');

console.log('\n' + '='.repeat(80));
console.log('OUR SIMULATION RESULTS');
console.log('='.repeat(80));
console.log(`Final: ${result.et_s.toFixed(2)}s @ ${result.mph.toFixed(1)} MPH`);

if (result.trace && result.trace.length > 0) {
  console.log('\nFirst few trace points:');
  for (let i = 0; i < Math.min(10, result.trace.length); i++) {
    const t = result.trace[i];
    console.log(`  ${t.time_s.toFixed(3)}s: ${t.distance_ft.toFixed(1)}ft @ ${t.mph.toFixed(1)} MPH, ${t.accel_g.toFixed(2)}g, gear ${t.gear}, ${t.rpm.toFixed(0)} RPM`);
  }
}

console.log('\n' + '='.repeat(80));
console.log('COMPARISON AT KEY POINTS');
console.log('='.repeat(80));

// Compare at rollout
console.log('\nROLLOUT (should be ~0.146s):');
console.log('  VB6:  0.146s @ 10.3 MPH, 3.38g, 7200 RPM');
if (result.trace) {
  const rolloutPoint = result.trace.find(t => t.distance_ft >= 1.0 && t.distance_ft < 5);
  if (rolloutPoint) {
    console.log(`  Ours: ${rolloutPoint.time_s.toFixed(3)}s @ ${rolloutPoint.mph.toFixed(1)} MPH, ${rolloutPoint.accel_g.toFixed(2)}g, ${rolloutPoint.rpm.toFixed(0)} RPM`);
    const timeDiff = (rolloutPoint.time_s - 0.146) * 1000;
    const mphDiff = rolloutPoint.mph - 10.3;
    console.log(`  Δ: ${timeDiff >= 0 ? '+' : ''}${timeDiff.toFixed(1)}ms, ${mphDiff >= 0 ? '+' : ''}${mphDiff.toFixed(1)} MPH`);
  }
}

// Compare at 60ft
console.log('\n60 FEET (should be 0.88s):');
console.log('  VB6:  0.88s @ 75.4 MPH, 3.25g, 7200 RPM');
if (result.trace) {
  const sixtyPoint = result.trace.find(t => t.distance_ft >= 60 && t.distance_ft < 65);
  if (sixtyPoint) {
    console.log(`  Ours: ${sixtyPoint.time_s.toFixed(3)}s @ ${sixtyPoint.mph.toFixed(1)} MPH, ${sixtyPoint.accel_g.toFixed(2)}g, ${sixtyPoint.rpm.toFixed(0)} RPM`);
    const timeDiff = (sixtyPoint.time_s - 0.88) * 1000;
    const mphDiff = sixtyPoint.mph - 75.4;
    console.log(`  Δ: ${timeDiff >= 0 ? '+' : ''}${timeDiff.toFixed(1)}ms, ${mphDiff >= 0 ? '+' : ''}${mphDiff.toFixed(1)} MPH`);
  }
}

// Compare at 330ft
console.log('\n330 FEET (should be 2.36s):');
console.log('  VB6:  2.36s @ 165.0 MPH, 1.98g, 8420 RPM, gear 3');
if (result.trace) {
  const threeThirtyPoint = result.trace.find(t => t.distance_ft >= 330 && t.distance_ft < 335);
  if (threeThirtyPoint) {
    console.log(`  Ours: ${threeThirtyPoint.time_s.toFixed(3)}s @ ${threeThirtyPoint.mph.toFixed(1)} MPH, ${threeThirtyPoint.accel_g.toFixed(2)}g, ${threeThirtyPoint.rpm.toFixed(0)} RPM, gear ${threeThirtyPoint.gear}`);
    const timeDiff = (threeThirtyPoint.time_s - 2.36) * 1000;
    const mphDiff = threeThirtyPoint.mph - 165.0;
    console.log(`  Δ: ${timeDiff >= 0 ? '+' : ''}${timeDiff.toFixed(1)}ms, ${mphDiff >= 0 ? '+' : ''}${mphDiff.toFixed(1)} MPH`);
  }
}

console.log('\n' + '='.repeat(80));
console.log('ANALYSIS');
console.log('='.repeat(80));

const etError = (result.et_s - 5.52) * 1000;
const mphError = result.mph - 243.1;

console.log(`\nFinal Error: ${etError >= 0 ? '+' : ''}${etError.toFixed(1)}ms ET, ${mphError >= 0 ? '+' : ''}${mphError.toFixed(1)} MPH`);

console.log('\nThis trace comparison will show exactly where the divergence begins.');
console.log('If rollout time is off, the issue is in launch/bootstrap calculations.');
console.log('If 60ft is off, the issue is in early acceleration physics.');
console.log('If divergence grows over time, it\'s accumulating in the main loop.');
console.log('='.repeat(80));
