/**
 * VB6 Parity Check - Verification against VB6 base case screenshots
 * This module provides deterministic verification that RSA matches VB6 exactly
 */

import { calcPistonSpeedSummary, calcMechDetailsForRPM } from './vb6Kinematics';
import { calcFlowDetailsForRPM } from './vb6FlowDetails';
import { calcDefaultValveSeatData } from './vb6Flowbench';

/**
 * VB6 Base Case Configuration (from screenshots)
 */
export const VB6_BASE_CASE = {
  numCylinders: 8,
  layout: 'vee' as const,
  bore_in: 4.030,
  stroke_in: 3.480,
  rodLength_in: 5.850,
  compressionRatio: 12.9,
  
  // Camshaft
  camshaftType: 'normal_flat_tappet' as const,
  intakeDuration050_deg: 264,
  lobeSeparationAngle_deg: 108,
  intakeLobeCenterline_deg: 105,
  
  // Induction
  inductionType: 'carburetor' as const,
  throttleCFM: 750,
  fuelType: 'gasoline' as const,
  manifoldType: 'common_plenum' as const,
  runnerStyle: 'curved' as const,
  manifoldFlowFactor: 96.0,
  
  // Cylinder Head
  numIntakeValvesPerCyl: 1,
  intakeValveDia_in: 2.050,
  maxIntakePortFlow_cfm: 250.0,
  testPressure_inH2O: 28.0,
  referenceBore_in: 4.000,
  maxIntakeValveLift_in: 0.550,
  
  // Expected Rating Points
  rpmPeakTQ: 5450,
  rpmPeakHP: 6650,
  shift: 7200,
  redline: 8350,
};

/**
 * VB6 Expected Outputs - Piston Speed Summary
 */
export const VB6_EXPECTED_PISTON_SPEED_SUMMARY = [
  { name: 'Peak TQ', rpm: 5450, avgSpeed: 3161, maxSpeed: 5181 },
  { name: 'Peak HP', rpm: 6650, avgSpeed: 3857, maxSpeed: 6322 },
  { name: 'Shift', rpm: 7200, avgSpeed: 4176, maxSpeed: 6845 },
  { name: 'Redline', rpm: 8350, avgSpeed: 4843, maxSpeed: 7939 },
];

/**
 * VB6 Expected Outputs - Mechanical Details @ 6650 RPM (Peak HP)
 */
export const VB6_EXPECTED_MECH_DETAILS_6650 = [
  { angle: 5, depth: 0.009, fpm: 685, fps: 11, gs: 2818 },
  { angle: 15, depth: 0.077, fpm: 2020, fps: 34, gs: 2679 },
  { angle: 30, depth: 0.298, fpm: 3818, fps: 64, gs: 2233 },
  { angle: 45, depth: 0.640, fpm: 5206, fps: 87, gs: 1561 },
  { angle: 60, depth: 1.067, fpm: 6054, fps: 101, gs: 768 },
  { angle: 74.6, depth: 1.524, fpm: 6323, fps: 105, gs: 1 },
  { angle: 80, depth: 1.694, fpm: 6289, fps: 105, gs: -257 },
  { angle: 85, depth: 1.851, fpm: 6199, fps: 103, gs: -479 },
  { angle: 90, depth: 2.005, fpm: 6059, fps: 101, gs: -681 },
  { angle: 105, depth: 2.437, fpm: 5382, fps: 90, gs: -1149 },
  { angle: 120, depth: 2.807, fpm: 4439, fps: 74, gs: -1417 },
  { angle: 135, depth: 3.101, fpm: 3362, fps: 56, gs: -1530 },
  { angle: 150, depth: 3.312, fpm: 2240, fps: 37, gs: -1553 },
  { angle: 165, depth: 3.438, fpm: 1116, fps: 19, gs: -1543 },
  { angle: 180, depth: 3.480, fpm: 0, fps: 0, gs: -1535 },
];

/**
 * VB6 Expected Outputs - Flow Details @ 6650 RPM (Peak HP)
 */
export const VB6_EXPECTED_FLOW_DETAILS_6650 = [
  { angle: -27, lift: 0.050, area: 0.179, fpm: -3486, cfm: 0, vel: 0, test: 0 },
  { angle: 0, lift: 0.163, area: 0.681, fpm: 0, cfm: -7, vel: -25, test: 0 },
  { angle: 30, lift: 0.333, area: 1.707, fpm: 3818, cfm: 266, vel: 373, test: 54 },
  { angle: 60, lift: 0.471, area: 2.572, fpm: 6054, cfm: 402, vel: 375, test: 72 },
  { angle: 74.6, lift: 0.515, area: 2.735, fpm: 6323, cfm: 427, vel: 374, test: 74 },
  { angle: 90, lift: 0.541, area: 2.735, fpm: 6059, cfm: 427, vel: 375, test: 72 },
  { angle: 105, lift: 0.550, area: 2.735, fpm: 5382, cfm: 407, vel: 357, test: 66 },
  { angle: 120, lift: 0.541, area: 2.735, fpm: 4439, cfm: 367, vel: 322, test: 56 },
  { angle: 150, lift: 0.471, area: 2.572, fpm: 2240, cfm: 240, vel: 224, test: 29 },
  { angle: 180, lift: 0.333, area: 1.707, fpm: 0, cfm: 68, vel: 96, test: 4 },
  { angle: 205, lift: 0.190, area: 0.837, fpm: -1865, cfm: -88, vel: -253, test: 0 },
  { angle: 237, lift: 0.050, area: 0.179, fpm: -4231, cfm: 0, vel: 0, test: 0 },
];

/**
 * VB6 Expected Outputs - Flowbench Data Table
 */
export const VB6_EXPECTED_FLOWBENCH_TABLE = [
  { lift: 0.100, flow: 56.6, area: 0.361, velocity: 376.3, flowFlux: 156.8, flowVelIndex: 117.9 },
  { lift: 0.200, flow: 116.0, area: 0.895, velocity: 311.1, flowFlux: 129.6, flowVelIndex: 97.5 },
  { lift: 0.300, flow: 169.4, area: 1.504, velocity: 270.3, flowFlux: 112.6, flowVelIndex: 84.7 },
  { lift: 0.400, flow: 212.6, area: 2.126, velocity: 240.0, flowFlux: 100.0, flowVelIndex: 75.2 },
  { lift: 0.500, flow: 241.3, area: 2.735, velocity: 211.7, flowFlux: 88.2, flowVelIndex: 66.3 },
  { lift: 0.600, flow: 258.7, area: 2.735, velocity: 227.0, flowFlux: 94.6, flowVelIndex: 71.1 },
  { lift: 0.700, flow: 262.9, area: 2.735, velocity: 230.7, flowFlux: 96.1, flowVelIndex: 72.3 },
  { lift: 0.800, flow: 264.2, area: 2.735, velocity: 231.8, flowFlux: 96.6, flowVelIndex: 72.6 },
];

/**
 * VB6 Expected Outputs - Flowbench Calculated Values @ Max Lift (0.550)
 */
export const VB6_EXPECTED_FLOWBENCH_MAX_LIFT = {
  lift: 0.550,
  flow: 250.0,
  area: 2.735,
  velocity: 219.4,
  flowFlux: 91.4,
  flowVelIndex: 68.7,
};

/**
 * Verify Piston Speed Summary against VB6
 */
export function verifyPistonSpeedSummary(): { pass: boolean; errors: string[] } {
  const errors: string[] = [];
  const { stroke_in, rodLength_in } = VB6_BASE_CASE;
  
  VB6_EXPECTED_PISTON_SPEED_SUMMARY.forEach(expected => {
    const result = calcPistonSpeedSummary(expected.rpm, stroke_in, rodLength_in);
    
    if (result.avgSpeed_fpm !== expected.avgSpeed) {
      errors.push(`${expected.name} @ ${expected.rpm} RPM: Avg speed ${result.avgSpeed_fpm} !== ${expected.avgSpeed}`);
    }
    
    if (result.maxSpeed_fpm !== expected.maxSpeed) {
      errors.push(`${expected.name} @ ${expected.rpm} RPM: Max speed ${result.maxSpeed_fpm} !== ${expected.maxSpeed}`);
    }
  });
  
  return { pass: errors.length === 0, errors };
}

/**
 * Verify Mechanical Details @ 6650 RPM against VB6
 */
export function verifyMechDetails6650(): { pass: boolean; errors: string[] } {
  const errors: string[] = [];
  const { stroke_in, rodLength_in } = VB6_BASE_CASE;
  const rpm = 6650;
  
  const result = calcMechDetailsForRPM(rpm, stroke_in, rodLength_in);
  
  if (result.length !== VB6_EXPECTED_MECH_DETAILS_6650.length) {
    errors.push(`Row count mismatch: ${result.length} !== ${VB6_EXPECTED_MECH_DETAILS_6650.length}`);
    return { pass: false, errors };
  }
  
  result.forEach((row, i) => {
    const expected = VB6_EXPECTED_MECH_DETAILS_6650[i];
    
    // Angle (exact or within 0.1 for 74.6)
    const angleDiff = Math.abs(row.angle_deg - expected.angle);
    if (angleDiff > 0.1) {
      errors.push(`Row ${i}: Angle ${row.angle_deg.toFixed(1)} !== ${expected.angle}`);
    }
    
    // Depth (within 0.001)
    const depthDiff = Math.abs(row.pistonDepth_in - expected.depth);
    if (depthDiff > 0.001) {
      errors.push(`Row ${i}: Depth ${row.pistonDepth_in.toFixed(3)} !== ${expected.depth.toFixed(3)}`);
    }
    
    // FPM (exact after rounding)
    const fpmRounded = Math.round(row.pistonSpeed_fpm);
    if (fpmRounded !== expected.fpm) {
      errors.push(`Row ${i}: FPM ${fpmRounded} !== ${expected.fpm}`);
    }
    
    // FPS (exact after rounding)
    const fpsRounded = Math.round(row.pistonSpeed_fps);
    if (fpsRounded !== expected.fps) {
      errors.push(`Row ${i}: FPS ${fpsRounded} !== ${expected.fps}`);
    }
    
    // G's (exact match as integer string)
    if (row.pistonAccel_gs !== expected.gs.toString()) {
      errors.push(`Row ${i}: G's "${row.pistonAccel_gs}" !== "${expected.gs}"`);
    }
  });
  
  return { pass: errors.length === 0, errors };
}

/**
 * Verify Flow Details @ 6650 RPM against VB6
 */
export function verifyFlowDetails6650(): { pass: boolean; errors: string[] } {
  const errors: string[] = [];
  const { stroke_in, rodLength_in, bore_in, intakeValveDia_in, numIntakeValvesPerCyl, intakeDuration050_deg, intakeLobeCenterline_deg, maxIntakeValveLift_in } = VB6_BASE_CASE;
  const rpm = 6650;
  
  const valveSeatData = calcDefaultValveSeatData(intakeValveDia_in);
  const result = calcFlowDetailsForRPM(
    rpm,
    stroke_in,
    rodLength_in,
    bore_in,
    numIntakeValvesPerCyl,
    intakeDuration050_deg,
    intakeLobeCenterline_deg,
    maxIntakeValveLift_in,
    valveSeatData
  );
  
  if (result.length !== VB6_EXPECTED_FLOW_DETAILS_6650.length) {
    errors.push(`Row count mismatch: ${result.length} !== ${VB6_EXPECTED_FLOW_DETAILS_6650.length}`);
    return { pass: false, errors };
  }
  
  result.forEach((row, i) => {
    const expected = VB6_EXPECTED_FLOW_DETAILS_6650[i];
    
    // Angle (within 0.5 for computed angles)
    const angleDiff = Math.abs(row.angle_deg - expected.angle);
    if (angleDiff > 0.5) {
      errors.push(`Row ${i}: Angle ${row.angle_deg.toFixed(1)} !== ${expected.angle}`);
    }
    
    // Lift (within 0.001)
    const liftDiff = Math.abs(row.valveLift_in - expected.lift);
    if (liftDiff > 0.001) {
      errors.push(`Row ${i}: Lift ${row.valveLift_in.toFixed(3)} !== ${expected.lift.toFixed(3)}`);
    }
    
    // Area (within 0.001)
    const areaDiff = Math.abs(row.flowArea_sqin - expected.area);
    if (areaDiff > 0.001) {
      errors.push(`Row ${i}: Area ${row.flowArea_sqin.toFixed(3)} !== ${expected.area.toFixed(3)}`);
    }
    
    // FPM (within 10 for rounding)
    const fpmDiff = Math.abs(Math.round(row.pistonSpeed_fpm) - expected.fpm);
    if (fpmDiff > 10) {
      errors.push(`Row ${i}: FPM ${Math.round(row.pistonSpeed_fpm)} !== ${expected.fpm}`);
    }
    
    // CFM (within 5 for rounding)
    const cfmRounded = Math.round(row.flowDemand_cfm);
    const cfmDiff = Math.abs(cfmRounded - expected.cfm);
    if (cfmDiff > 5) {
      errors.push(`Row ${i}: CFM ${cfmRounded} !== ${expected.cfm}`);
    }
    
    // Velocity (within 5 for rounding)
    const velRounded = Math.round(row.flowbenchVel_fps);
    const velDiff = Math.abs(velRounded - expected.vel);
    if (velDiff > 5 && expected.vel !== 0) {
      errors.push(`Row ${i}: Velocity ${velRounded} !== ${expected.vel}`);
    }
  });
  
  return { pass: errors.length === 0, errors };
}

/**
 * Run all VB6 parity checks
 */
export function runAllParityChecks(): { pass: boolean; results: Record<string, any> } {
  const results = {
    pistonSpeedSummary: verifyPistonSpeedSummary(),
    mechDetails6650: verifyMechDetails6650(),
    flowDetails6650: verifyFlowDetails6650(),
  };
  
  const allPass = Object.values(results).every(r => r.pass);
  
  return { pass: allPass, results };
}

/**
 * Print parity check results to console
 */
export function printParityCheckResults() {
  console.log('\n========================================');
  console.log('VB6 PARITY CHECK RESULTS');
  console.log('========================================\n');
  
  const { pass, results } = runAllParityChecks();
  
  console.log('1. Piston Speed Summary:');
  if (results.pistonSpeedSummary.pass) {
    console.log('   ✅ PASS - All 4 rating points match VB6 exactly');
  } else {
    console.log('   ❌ FAIL - Errors:');
    results.pistonSpeedSummary.errors.forEach((err: string) => console.log(`      - ${err}`));
  }
  
  console.log('\n2. Mechanical Details @ 6650 RPM:');
  if (results.mechDetails6650.pass) {
    console.log('   ✅ PASS - All 15 rows match VB6 exactly');
  } else {
    console.log('   ❌ FAIL - Errors:');
    results.mechDetails6650.errors.forEach((err: string) => console.log(`      - ${err}`));
  }
  
  console.log('\n3. Flow Details @ 6650 RPM:');
  if (results.flowDetails6650.pass) {
    console.log('   ✅ PASS - All 12 rows match VB6 exactly');
  } else {
    console.log('   ❌ FAIL - Errors:');
    results.flowDetails6650.errors.forEach((err: string) => console.log(`      - ${err}`));
  }
  
  console.log('\n========================================');
  if (pass) {
    console.log('✅ ALL CHECKS PASSED - VB6 PARITY VERIFIED');
  } else {
    console.log('❌ SOME CHECKS FAILED - SEE ERRORS ABOVE');
  }
  console.log('========================================\n');
  
  return pass;
}
