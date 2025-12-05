/**
 * Test runner for Bonneville Pro 3.2 test case
 * 
 * Run with: npx tsx src/domain/physics/vb6/testFixtures/runBonnevilleTest.ts
 */

import { BONNEVILLE_PRO_32_GASCOUPE, EXPECTED_RESULTS } from './bonnevillePro32';
import { fixtureToSimInputs } from '../fixtures';
import { VB6ExactModel } from '../../models/vb6Exact';
import { airDensityVB6 } from '../air';

async function runTest() {
  console.log('='.repeat(70));
  console.log('Bonneville Pro 3.2 Test Case - gascoupe.dat');
  console.log('='.repeat(70));
  
  // Convert fixture to sim inputs
  const simInputs = fixtureToSimInputs(BONNEVILLE_PRO_32_GASCOUPE, 'BONNEVILLE_LONG');
  
  // Calculate air density to debug
  const airResult = airDensityVB6({
    barometer_inHg: BONNEVILLE_PRO_32_GASCOUPE.env.barometer_inHg,
    temperature_F: BONNEVILLE_PRO_32_GASCOUPE.env.temperature_F,
    relHumidity_pct: BONNEVILLE_PRO_32_GASCOUPE.env.relHumidity_pct,
    elevation_ft: BONNEVILLE_PRO_32_GASCOUPE.env.elevation_ft,
    fuelSystem: 1, // Gas + Carb
  });
  
  console.log('\nInput Summary:');
  console.log(`  Weight: ${simInputs.vehicle.weightLb} lb`);
  console.log(`  Power: ${simInputs.vehicle.powerHP} HP`);
  console.log(`  Final Drive: ${simInputs.vehicle.rearGear}`);
  console.log(`  Gears: ${simInputs.vehicle.gearRatios.join(', ')}`);
  console.log(`  Elevation: ${simInputs.env.elevation} ft`);
  console.log(`  Race Length: ${simInputs.raceLength} (${simInputs.raceLengthFt} ft)`);
  const rho_lbm = airResult.rho_slug_per_ft3 * 32.174;
  console.log(`  Air Density: ${airResult.rho_slug_per_ft3.toFixed(6)} slug/ft³ = ${rho_lbm.toFixed(6)} lbm/ft³`);
  console.log(`  HP Correction (hpc): ${airResult.hpc.toFixed(4)}`);
  console.log(`  Pressure Ratio (delta): ${airResult.delta.toFixed(4)}`);
  
  // Calculate expected terminal velocity
  // Terminal velocity: Power = Drag
  // HP * 550 = 0.5 * rho * v³ * Cd * A / gc
  // v³ = HP * 550 * 2 * gc / (rho * Cd * A)
  const effectiveHP = 1200 / airResult.hpc;
  const v_cubed = effectiveHP * 550 * 2 * 32.174 / (rho_lbm * 0.29 * 19.5);
  const v_fps = Math.pow(v_cubed, 1/3);
  const v_mph = v_fps * 3600 / 5280;
  console.log(`  Effective HP at altitude: ${effectiveHP.toFixed(0)} HP`);
  console.log(`  Theoretical terminal velocity: ${v_mph.toFixed(1)} MPH (simplified calc)`);
  console.log(`  Frontal Area: ${simInputs.vehicle.frontalAreaFt2} ft²`);
  console.log(`  Drag Coef: ${simInputs.vehicle.cd}`);
  console.log(`  Lift Coef: ${simInputs.vehicle.liftCoeff}`);
  console.log(`  HP Curve: ${JSON.stringify(simInputs.vehicle.hpCurve)}`);
  
  console.log('\nRunning simulation...');
  const startTime = Date.now();
  
  // Run simulation
  const result = VB6ExactModel.simulate(simInputs);
  
  const elapsed = Date.now() - startTime;
  console.log(`Simulation completed in ${elapsed}ms`);
  console.log(`Steps: ${result.meta?.steps}`);
  if (result.meta?.warnings?.length) {
    console.log(`Warnings: ${result.meta.warnings.join(', ')}`);
  }
  
  // Print results
  console.log('\n' + '='.repeat(70));
  console.log('RESULTS COMPARISON');
  console.log('='.repeat(70));
  
  console.log('\nFinal Results:');
  console.log(`  VB6 Expected: ${EXPECTED_RESULTS.finalTime_s}s @ ${EXPECTED_RESULTS.topSpeed_mph} MPH`);
  console.log(`  Our Result:   ${result.et_s.toFixed(2)}s @ ${result.mph.toFixed(1)} MPH`);
  console.log(`  Time Error:   ${(result.et_s - EXPECTED_RESULTS.finalTime_s).toFixed(2)}s`);
  console.log(`  Speed Error:  ${(result.mph - EXPECTED_RESULTS.topSpeed_mph).toFixed(1)} MPH`);
  
  // Print trace comparison at key checkpoints
  console.log('\n' + '-'.repeat(70));
  console.log('Checkpoint Comparison (VB6 vs Our Sim):');
  console.log('-'.repeat(70));
  console.log('Time(s)   Dist(mi)  VB6 MPH   Our MPH   Error   VB6 Gear  Our Gear');
  console.log('-'.repeat(70));
  
  for (const checkpoint of EXPECTED_RESULTS.checkpoints) {
    // Find closest trace point by time
    const trace = result.traces?.find((t: any) => Math.abs(t.t_s - checkpoint.time) < 0.5);
    if (trace) {
      const distMi = trace.s_ft / 5280;
      const mphError = trace.v_mph - checkpoint.mph;
      console.log(
        `${checkpoint.time.toFixed(2).padStart(6)}    ` +
        `${checkpoint.distance_mi.toFixed(2).padStart(5)}     ` +
        `${checkpoint.mph.toFixed(1).padStart(6)}    ` +
        `${trace.v_mph.toFixed(1).padStart(6)}    ` +
        `${(mphError >= 0 ? '+' : '') + mphError.toFixed(1).padStart(5)}   ` +
        `${checkpoint.gear.toString().padStart(6)}        ` +
        `${trace.gear}`
      );
    }
  }
  
  // Print warnings if any
  if (result.meta?.warnings && result.meta.warnings.length > 0) {
    console.log('\nWarnings:');
    for (const warning of result.meta.warnings) {
      console.log(`  - ${warning}`);
    }
  }
  
  // Print full trace for debugging
  console.log('\n' + '-'.repeat(70));
  console.log('Full Trace (every 5 seconds):');
  console.log('-'.repeat(70));
  console.log('Time(s)   Dist(ft)   Dist(mi)   MPH      Accel(g)  Gear  RPM');
  console.log('-'.repeat(70));
  
  let lastPrintTime = -5;
  for (const trace of result.traces || []) {
    if (trace.t_s - lastPrintTime >= 5 || trace.t_s === 0) {
      const distMi = trace.s_ft / 5280;
      console.log(
        `${trace.t_s.toFixed(2).padStart(7)}   ` +
        `${trace.s_ft.toFixed(0).padStart(8)}   ` +
        `${distMi.toFixed(2).padStart(7)}    ` +
        `${trace.v_mph.toFixed(1).padStart(6)}   ` +
        `${trace.a_g.toFixed(2).padStart(7)}     ` +
        `${trace.gear}    ` +
        `${trace.rpm.toFixed(0)}`
      );
      lastPrintTime = trace.t_s;
    }
  }
  
  // Print last trace point
  const lastTrace = result.traces?.[result.traces.length - 1];
  if (lastTrace && lastTrace.t_s - lastPrintTime > 1) {
    const distMi = lastTrace.s_ft / 5280;
    console.log(
      `${lastTrace.t_s.toFixed(2).padStart(7)}   ` +
      `${lastTrace.s_ft.toFixed(0).padStart(8)}   ` +
      `${distMi.toFixed(2).padStart(7)}    ` +
      `${lastTrace.v_mph.toFixed(1).padStart(6)}   ` +
      `${lastTrace.a_g.toFixed(2).padStart(7)}     ` +
      `${lastTrace.gear}    ` +
      `${lastTrace.rpm.toFixed(0)}`
    );
  }
  
  // Print HP and drag HP at various points
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
}

runTest().catch(console.error);
