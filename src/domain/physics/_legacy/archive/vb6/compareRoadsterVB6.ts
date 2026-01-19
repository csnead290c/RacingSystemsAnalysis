/**
 * Compare our Roadster simulation with VB6 output checkpoint by checkpoint
 */

import { simulateVB6Exact } from '../models/vb6Exact';

const ROADSTER: any = {
  vehicle: {
    id: 'test-roadster',
    name: 'Bonneville Roadster',
    powerHP: 5734,
    weightLb: 2350,
    wheelbaseIn: 125,
    rolloutIn: 0,  // VB6 shows 113" rollout but uses 0 for timer
    overhangIn: 0,
    rearGear: 2.10,
    finalDriveEfficiency: 0.960,
    tireDiaIn: 35.987,
    tireWidthIn: 10.00,
    cd: 0.580,
    frontalArea_ft2: 24.1,
    liftCoeff: 0.800,
    transmissionType: 'clutch',
    clutch: { launchRPM: 6400, slipRPM: 6400, slipRatio: 1.000 },
    gearRatios: [1.25, 1.00],
    gearEfficiencies: [0.800, 0.990],
    shiftRPMs: [7000, 100],
    hpCurve: [
      { rpm: 6400, hp: 5559.987 },
      { rpm: 6600, hp: 5733.737 },
      { rpm: 6800, hp: 5733.451 },
      { rpm: 7000, hp: 5581.357 },
      { rpm: 7200, hp: 5298.826 },
      { rpm: 7400, hp: 4857.974 },
      { rpm: 7600, hp: 4302.36 },
      { rpm: 7800, hp: 3629.627 },
      { rpm: 10500, hp: 73 },
      { rpm: 11000, hp: 74 },
      { rpm: 11500, hp: 73 },
    ],
    fuelType: 'Supercharged Nitro',
    hpTorqueMultiplier: 0.960,  // VB6 line 7 field 1
    pmi: { engine_flywheel_clutch: 4.178682, transmission_driveshaft: 0.1671473, tires_wheels_ringgear: 44.36557 },
  },
  env: { elevation: 4500, barometerInHg: 29.92, temperatureF: 76, humidityPct: 50, windMph: 0.0, windAngleDeg: 0, trackTempF: 106, tractionIndex: 6 },
  raceLength: 'TWO_MILE',
};

console.log('='.repeat(80));
console.log('ROADSTER VB6 COMPARISON');
console.log('='.repeat(80));

const result = simulateVB6Exact(ROADSTER);

console.log('\n' + '='.repeat(80));
console.log('FINAL RESULTS');
console.log('='.repeat(80));
console.log(`Our result: ${result.et_s.toFixed(2)}s @ ${result.mph.toFixed(1)} MPH`);
console.log(`VB6 result: 26.31s @ 351.8 MPH`);
console.log(`Error: ${((result.et_s - 26.31) * 1000).toFixed(0)}ms, ${(result.mph - 351.8).toFixed(1)} MPH`);

console.log('\n' + '='.repeat(80));
console.log('CHECKPOINT COMPARISON');
console.log('='.repeat(80));

const vb6Checkpoints = [
  { time: 0.00, dist_mi: 0.00, mph: 0.0, gear: 1, rpm: 6400 },
  { time: 2.88, dist_mi: 0.04, mph: 100.0, gear: 1, rpm: 6400 },
  { time: 6.13, dist_mi: 0.18, mph: 200.0, gear: 1, rpm: 6400 },
  { time: 9.01, dist_mi: 0.37, mph: 273.7, gear: 1, rpm: 7000 },  // Shift point
  { time: 9.21, dist_mi: 0.39, mph: 277.8, gear: 2, rpm: 6400 },  // After shift
  { time: 10.63, dist_mi: 0.50, mph: 303.2, gear: 2, rpm: 6400 },
  { time: 16.05, dist_mi: 1.00, mph: 347.4, gear: 2, rpm: 7080 },
  { time: 21.19, dist_mi: 1.50, mph: 351.3, gear: 2, rpm: 7160 },
  { time: 26.31, dist_mi: 2.00, mph: 351.8, gear: 2, rpm: 7170 },
];

console.log('\nTime   | Dist(mi) | MPH   | Gear | RPM  | Source');
console.log('-------|----------|-------|------|------|-------');

for (const cp of vb6Checkpoints) {
  const dist_ft = cp.dist_mi * 5280;
  
  // Find closest trace point in our simulation
  const ourTrace = result.traces?.reduce((closest, t) => {
    const timeDiff = Math.abs(t.t_s - cp.time);
    const closestDiff = Math.abs(closest.t_s - cp.time);
    return timeDiff < closestDiff ? t : closest;
  });

  console.log(`${cp.time.toFixed(2).padStart(6)} | ${cp.dist_mi.toFixed(2).padStart(8)} | ${cp.mph.toFixed(1).padStart(5)} | ${cp.gear.toString().padStart(4)} | ${cp.rpm.toString().padStart(4)} | VB6`);
  
  if (ourTrace) {
    const ourDistMi = ourTrace.s_ft / 5280;
    console.log(`${ourTrace.t_s.toFixed(2).padStart(6)} | ${ourDistMi.toFixed(2).padStart(8)} | ${ourTrace.v_mph.toFixed(1).padStart(5)} | ${ourTrace.gear.toString().padStart(4)} | ${Math.round(ourTrace.rpm).toString().padStart(4)} | Ours`);
    
    const timeDiff = (ourTrace.t_s - cp.time) * 1000;
    const mphDiff = ourTrace.v_mph - cp.mph;
    console.log(`       | Δ${(ourDistMi - cp.dist_mi).toFixed(3).padStart(6)} | Δ${mphDiff.toFixed(1).padStart(4)} |      |      | Δ${timeDiff.toFixed(0)}ms`);
  }
  console.log('-------|----------|-------|------|------|-------');
}

console.log('\n' + '='.repeat(80));
console.log('KEY OBSERVATIONS');
console.log('='.repeat(80));
console.log('1. VB6 shift occurs at 9.01s when RPM hits 7000');
console.log('2. After shift (9.21s), RPM drops to 6400 in gear 2');
console.log('3. VB6 reaches 1 mile (5280 ft) at 16.05s @ 347.4 MPH');
console.log('4. VB6 reaches 2 miles (10560 ft) at 26.31s @ 351.8 MPH');
console.log('5. Final speed is 351.8 MPH, still accelerating slowly');
console.log('='.repeat(80));
