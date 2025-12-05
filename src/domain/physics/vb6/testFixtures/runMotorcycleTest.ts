/**
 * Run Bonneville Pro 3.2 Motorcycle Test Case
 * 
 * This script runs the motorcycle test case and compares results
 * with the original VB6 Bonneville Pro 3.2 output.
 */

import { VB6ExactModel } from '../../models/vb6Exact';
import { fixtureToSimInputs } from '../fixtures';
import { airDensityVB6 } from '../air';
import { 
  BONNEVILLE_MOTORCYCLE, 
  BONNEVILLE_MOTORCYCLE_EXPECTED,
  BONNEVILLE_MOTORCYCLE_CHECKPOINTS 
} from './bonnevilleMotorcycle';

// Run the test
console.log('='.repeat(70));
console.log('Bonneville Pro 3.2 Test Case - motorcyc.dat (Motorcycle)');
console.log('='.repeat(70));

// Convert fixture to sim inputs
// VB6 shows "Track: El Mirage Dry Lake" which is 1.3 miles (6864 ft)
const simInputs = fixtureToSimInputs(BONNEVILLE_MOTORCYCLE, 'EL_MIRAGE');

// Calculate air density for display
const airResult = airDensityVB6({
  barometer_inHg: BONNEVILLE_MOTORCYCLE.env.barometer_inHg,
  temperature_F: BONNEVILLE_MOTORCYCLE.env.temperature_F,
  relHumidity_pct: BONNEVILLE_MOTORCYCLE.env.relHumidity_pct,
  elevation_ft: BONNEVILLE_MOTORCYCLE.env.elevation_ft,
  fuelSystem: 1, // Gas + Carb
});

console.log('\nInput Summary:');
console.log(`  Weight: ${simInputs.vehicle.weightLb} lb`);
console.log(`  Power: ${BONNEVILLE_MOTORCYCLE.engineHP[BONNEVILLE_MOTORCYCLE.engineHP.length - 2][1]} HP peak`);
console.log(`  Final Drive: ${simInputs.vehicle.rearGear}`);
console.log(`  Gears: ${simInputs.vehicle.gearRatios.join(', ')}`);
console.log(`  Elevation: ${simInputs.env.elevation} ft`);
console.log(`  Race Length: ${simInputs.raceLength} (${simInputs.raceLengthFt} ft)`);
console.log(`  Body Style: 8 (Motorcycle)`);
const rho_lbm = airResult.rho_slug_per_ft3 * 32.174;
console.log(`  Air Density: ${rho_lbm.toFixed(6)} lbm/ft³`);
console.log(`  HP Correction (hpc): ${airResult.hpc.toFixed(4)}`);
console.log(`  Frontal Area: ${simInputs.vehicle.frontalAreaFt2} ft²`);
console.log(`  Drag Coef: ${simInputs.vehicle.cd}`);
console.log(`  Lift Coef: ${simInputs.vehicle.liftCoeff}`);
console.log(`  Traction Index: ${BONNEVILLE_MOTORCYCLE.env.tractionIndex}`);

console.log('\nRunning simulation...');
const tractionIdx = simInputs.env.tractionIndex ?? 5;
console.log(`  TireSlip (BVPro): ${1.01 + (tractionIdx-1) * 0.01}`);
const startTime = Date.now();

// Run simulation
const result = VB6ExactModel.simulate(simInputs);

// Debug: Check first and last few trace points
const traces = result.traces || [];
if (traces.length > 10) {
  console.log('\nFirst 5 trace points:');
  for (let i = 0; i < 5; i++) {
    const t = traces[i] as any;
    console.log(`  t=${t.t_s.toFixed(2)}s, d=${t.s_ft.toFixed(0)}ft, v=${t.v_mph.toFixed(1)}mph, a=${t.a_g.toFixed(4)}g, gear=${t.gear}, rpm=${t.rpm.toFixed(0)}`);
  }
  console.log('\nLast 5 trace points:');
  for (let i = traces.length - 5; i < traces.length; i++) {
    const t = traces[i] as any;
    console.log(`  t=${t.t_s.toFixed(2)}s, d=${t.s_ft.toFixed(0)}ft, v=${t.v_mph.toFixed(1)}mph, a=${t.a_g.toFixed(4)}g, gear=${t.gear}, rpm=${t.rpm.toFixed(0)}`);
  }
}

const elapsed = Date.now() - startTime;
console.log(`\nSimulation completed in ${elapsed}ms`);
console.log(`Steps: ${result.meta?.steps}`);
if (result.meta?.warnings?.length) {
  console.log(`Warnings: ${result.meta.warnings.join(', ')}`);
}

// Get final results
const finalTrace = traces[traces.length - 1] as any;
const finalTime = finalTrace?.t_s ?? 0;
const finalSpeed = finalTrace?.v_mph ?? 0;
const finalRPM = finalTrace?.rpm ?? 0;
const finalGear = finalTrace?.gear ?? 0;

// Print results
console.log('\n' + '='.repeat(70));
console.log('RESULTS COMPARISON');
console.log('='.repeat(70));

console.log('\nFinal Results:');
console.log(`  VB6 Expected: ${BONNEVILLE_MOTORCYCLE_EXPECTED.finalTime_s}s @ ${BONNEVILLE_MOTORCYCLE_EXPECTED.finalSpeed_mph} MPH @ ${BONNEVILLE_MOTORCYCLE_EXPECTED.finalRPM} RPM`);
console.log(`  Our Result:   ${finalTime.toFixed(2)}s @ ${finalSpeed.toFixed(1)} MPH @ ${finalRPM.toFixed(0)} RPM`);
console.log(`  Time Error:   ${(finalTime - BONNEVILLE_MOTORCYCLE_EXPECTED.finalTime_s).toFixed(2)}s`);
console.log(`  Speed Error:  ${(finalSpeed - BONNEVILLE_MOTORCYCLE_EXPECTED.finalSpeed_mph).toFixed(1)} MPH`);
console.log(`  RPM Error:    ${(finalRPM - BONNEVILLE_MOTORCYCLE_EXPECTED.finalRPM).toFixed(0)} RPM`);

// Checkpoint comparison
console.log('\n' + '-'.repeat(70));
console.log('Checkpoint Comparison (VB6 vs Our Sim):');
console.log('-'.repeat(70));
console.log('Time(s)   Dist(mi)  VB6 MPH   Our MPH   Error   VB6 Gear  Our Gear');
console.log('-'.repeat(70));

for (const checkpoint of BONNEVILLE_MOTORCYCLE_CHECKPOINTS) {
  // Find closest trace point by time
  let closestTrace: any = null;
  let minTimeDiff = Infinity;
  for (const trace of traces) {
    const t = trace as any;
    const timeDiff = Math.abs(t.t_s - checkpoint.time);
    if (timeDiff < minTimeDiff) {
      minTimeDiff = timeDiff;
      closestTrace = t;
    }
  }
  
  if (closestTrace && minTimeDiff < 0.5) {
    const speedError = closestTrace.v_mph - checkpoint.mph;
    const errorStr = speedError >= 0 ? `+${speedError.toFixed(1)}` : speedError.toFixed(1);
    console.log(
      `${checkpoint.time.toFixed(2).padStart(6)}   ` +
      `${checkpoint.dist_mi.toFixed(2).padStart(6)}   ` +
      `${checkpoint.mph.toFixed(1).padStart(7)}   ` +
      `${closestTrace.v_mph.toFixed(1).padStart(7)}   ` +
      `${errorStr.padStart(6)}   ` +
      `${checkpoint.gear.toString().padStart(6)}   ` +
      `${closestTrace.gear.toString().padStart(6)}`
    );
  }
}

// HP Analysis
console.log('\n' + '-'.repeat(70));
console.log('HP Analysis (every 10 seconds):');
console.log('-'.repeat(70));
console.log('Time(s)   MPH      HP       DragHP   NetHP    Accel(g)');
console.log('-'.repeat(70));

let lastHPPrintTime = -10;
for (const trace of result.traces || []) {
  const t = trace as any;
  if (t.t_s - lastHPPrintTime >= 10 || t.t_s === 0) {
    const netHP = (t.hp || 0) - (t.dragHp || 0);
    console.log(
      `${t.t_s.toFixed(2).padStart(7)}   ` +
      `${t.v_mph.toFixed(1).padStart(6)}   ` +
      `${(t.hp || 0).toFixed(0).padStart(6)}   ` +
      `${(t.dragHp || 0).toFixed(0).padStart(6)}   ` +
      `${netHP.toFixed(0).padStart(6)}   ` +
      `${t.a_g.toFixed(3).padStart(7)}`
    );
    lastHPPrintTime = t.t_s;
  }
}
