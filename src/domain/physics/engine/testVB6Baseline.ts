/**
 * VB6 Baseline Test Case
 * 
 * This file contains the exact inputs and expected outputs from VB6 ENGINE Pro 3.1
 * Used to verify 100% accuracy of TypeScript implementation
 */

import { simulateEngine, type EngineSimConfig } from './engineAdapter';
import { calcMechDetails } from './engineProDetails';

// VB6 Baseline Input Configuration
export const VB6_BASELINE_CONFIG: EngineSimConfig = {
  // Engine Design
  numCylinders: 8,
  layout: 'vee',
  bore_in: 4.030,
  stroke_in: 3.480,
  rodLength_in: 5.850,
  compressionRatio: 12.9,
  
  // Compression Ratio Worksheet values
  combustionChamberVolume_cc: 62.0,
  pistonToDeckHeight_in: 0.015,
  headGasketThickness_in: 0.039,
  pistonDomeVolume_cc: 12.0,
  
  // Camshaft
  camshaftType: 'normal_flat_tappet',
  intakeDuration050_deg: 264,
  
  // Throttle/Carburetor
  throttleCFM_at_1_5inHg: 750,  // From worksheet: 730 (4x1.688") + 0 (no secondaries)
  isEFI: false,
  
  // Fuel
  fuelType: 'gasoline',
  
  // Intake Manifold
  intakeManifoldType: 'plenum',
  runnerStyle: 'curved',
  intakeManifoldFlowFactor_pct: 96.0,
  
  // Cylinder Head
  numIntakeValvesPerCyl: 1,
  intakeValveDia_in: 2.050,
  maxIntakeFlow_cfm: 250.0,
  flowTestPressure_inH2O: 28.0,
  flowTestBoreDia_in: 4.000,
  maxIntakeValveLift_in: 0.550,
};

// VB6 Expected Outputs
export const VB6_BASELINE_EXPECTED = {
  // Peak Performance
  peakHP: 461,
  rpmPeakHP: 6650,
  peakTQ: 415,
  rpmPeakTQ: 5450,
  
  // Specific Output
  hpPerCID: 1.30,
  tqPerCID: 1.17,
  
  // Operating Range
  shift: 7200,
  redline: 8350,
  
  // Displacement
  cid: 355.1,
  
  // Dyno Curve Points (RPM, HP, TQ)
  dynoCurve: [
    { rpm: 4500, hp: 327, tq: 382 },
    { rpm: 4750, hp: 358, tq: 396 },
    { rpm: 5000, hp: 387, tq: 407 },
    { rpm: 5250, hp: 412, tq: 412 },
    { rpm: 5500, hp: 434, tq: 415 },
    { rpm: 5750, hp: 448, tq: 409 },
    { rpm: 6000, hp: 456, tq: 399 },
    { rpm: 6250, hp: 460, tq: 387 },
    { rpm: 6500, hp: 461, tq: 373 },
    { rpm: 6750, hp: 459, tq: 357 },
    { rpm: 7000, hp: 445, tq: 334 },
    { rpm: 7250, hp: 423, tq: 306 },
    { rpm: 7500, hp: 393, tq: 275 },
  ],
  
  // Mechanical Details
  mechanical: {
    estimatedCrankingCompression_psig: 230,
    boreToStrokeRatio: 1.16,
    rodToStrokeRatio: 1.68,
    pistonToHeadRodLengthRatio: 0.0092,
    intakeThroatBoreAreaRatio: 0.191,
    intakeValveLiftDiameterRatio: 0.268,
    
    // Piston Speed Summary
    pistonSpeed: {
      peakTQ: { rpm: 5450, avg: 3161, max: 5181 },
      peakHP: { rpm: 6650, avg: 3857, max: 6322 },
      shift: { rpm: 7200, avg: 4176, max: 6845 },
      redline: { rpm: 8350, avg: 4843, max: 7939 },
    },
    
    maxPistonSpeedAngle_deg: 74.6,
  },
  
  // Flow Details @ Peak TQ (5450 RPM)
  flowDetailsPeakTQ: [
    { event: 'IVO @ .050"', angle: -27, lift: 0.050, area: 0.218, pistonSpeed: -2857, flowDemand: 0 },
    { event: 'TDC', angle: 0, lift: 0.163, area: 0.757, pistonSpeed: 0, flowDemand: -5 },
    { event: '30 deg ATDC', angle: 30, lift: 0.333, area: 1.765, pistonSpeed: 3129, flowDemand: 228 },
    { event: '60 deg ATDC', angle: 60, lift: 0.471, area: 2.435, pistonSpeed: 4962, flowDemand: 349 },
    { event: 'Max Piston FPM', angle: 74.6, lift: 0.515, area: 2.435, pistonSpeed: 5182, flowDemand: 370 },
    { event: '90 degree', angle: 90, lift: 0.541, area: 2.435, pistonSpeed: 4965, flowDemand: 369 },
    { event: 'ILC - Max Lift', angle: 105, lift: 0.550, area: 2.435, pistonSpeed: 4411, flowDemand: 347 },
    { event: '120 deg ATDC', angle: 120, lift: 0.541, area: 2.435, pistonSpeed: 3638, flowDemand: 308 },
    { event: '150 deg ATDC', angle: 150, lift: 0.471, area: 2.435, pistonSpeed: 1836, flowDemand: 192 },
    { event: 'BDC', angle: 180, lift: 0.333, area: 1.765, pistonSpeed: 0, flowDemand: 46 },
    { event: '25 deg ABDC', angle: 205, lift: 0.190, area: 0.909, pistonSpeed: -1528, flowDemand: -82 },
    { event: 'IVC @ .050"', angle: 237, lift: 0.050, area: 0.218, pistonSpeed: -3468, flowDemand: 0 },
  ],
  
  // Flow Details @ Peak HP (6650 RPM)
  flowDetailsPeakHP: [
    { event: 'IVO @ .050"', angle: -27, lift: 0.050, area: 0.218, pistonSpeed: -3486, flowDemand: 0 },
    { event: 'TDC', angle: 0, lift: 0.163, area: 0.757, pistonSpeed: 0, flowDemand: -7 },
    { event: '30 deg ATDC', angle: 30, lift: 0.333, area: 1.765, pistonSpeed: 3818, flowDemand: 266 },
    { event: '60 deg ATDC', angle: 60, lift: 0.471, area: 2.435, pistonSpeed: 6054, flowDemand: 402 },
    { event: 'Max Piston FPM', angle: 74.6, lift: 0.515, area: 2.435, pistonSpeed: 6323, flowDemand: 427 },
    { event: '90 degree', angle: 90, lift: 0.541, area: 2.435, pistonSpeed: 6059, flowDemand: 427 },
    { event: 'ILC - Max Lift', angle: 105, lift: 0.550, area: 2.435, pistonSpeed: 5382, flowDemand: 407 },
    { event: '120 deg ATDC', angle: 120, lift: 0.541, area: 2.435, pistonSpeed: 4439, flowDemand: 367 },
    { event: '150 deg ATDC', angle: 150, lift: 0.471, area: 2.435, pistonSpeed: 2240, flowDemand: 240 },
    { event: 'BDC', angle: 180, lift: 0.333, area: 1.765, pistonSpeed: 0, flowDemand: 68 },
    { event: '25 deg ABDC', angle: 205, lift: 0.190, area: 0.909, pistonSpeed: -1865, flowDemand: -88 },
    { event: 'IVC @ .050"', angle: 237, lift: 0.050, area: 0.218, pistonSpeed: -4231, flowDemand: 0 },
  ],
  
  // Recommendations
  recommendations: {
    // Intake System
    intakeValveLift_in: 0.580,
    intakeMinFlowArea_sqin: 2.55,
    intakeMaxFlowArea_sqin: 3.50,
    intakeTrackLength_in: 14.75,
    intakeTrackVolume_cc: 680,
    intakePlenumVolume_ci: 355,
    
    // Exhaust Port
    exhaustFlow_cfm: 160,
    exhaustFlow_pctIntake: 64,
    exhaustValveDiaMin_in: 1.50,
    exhaustValveDiaMax_in: 1.54,
    exhaustValveLift_in: 0.520,
    exhaustMinFlowArea_sqin: 1.42,
    exhaustMaxFlowArea_sqin: 2.04,
    
    // Camshaft
    lobeSeparationAngle_deg: 108,
    intakeLobeCenterline_deg: 105,
    exhaustDuration_deg: 278,
    
    // Exhaust System
    exhaustPrimaryLength_in: 36.0,
    exhaustPrimaryDia_in: 1.750,
    exhaustCollectorDia_in: 3.25,
  },
};

/**
 * Run baseline test and compare results
 */
export function testVB6Baseline() {
  console.log('='.repeat(80));
  console.log('VB6 BASELINE TEST - ENGINE Pro 3.1');
  console.log('='.repeat(80));
  
  // Run simulation
  const result = simulateEngine(VB6_BASELINE_CONFIG);
  
  // Calculate displacement
  const displacement = (Math.PI / 4) * Math.pow(VB6_BASELINE_CONFIG.bore_in, 2) * 
                      VB6_BASELINE_CONFIG.stroke_in * VB6_BASELINE_CONFIG.numCylinders;
  
  console.log('\n--- DISPLACEMENT ---');
  console.log(`TypeScript: ${displacement.toFixed(1)} CID`);
  console.log(`VB6:        ${VB6_BASELINE_EXPECTED.cid} CID`);
  console.log(`Match:      ${Math.abs(displacement - VB6_BASELINE_EXPECTED.cid) < 0.1 ? '✓' : '✗'}`);
  
  console.log('\n--- PEAK PERFORMANCE ---');
  console.log(`Peak HP:    TS=${result.peakHP.toFixed(0)} | VB6=${VB6_BASELINE_EXPECTED.peakHP} | ${Math.abs(result.peakHP - VB6_BASELINE_EXPECTED.peakHP) < 1 ? '✓' : '✗'}`);
  console.log(`RPM@PeakHP: TS=${result.rpmPeakHP} | VB6=${VB6_BASELINE_EXPECTED.rpmPeakHP} | ${result.rpmPeakHP === VB6_BASELINE_EXPECTED.rpmPeakHP ? '✓' : '✗'}`);
  console.log(`Peak TQ:    TS=${result.peakTQ.toFixed(0)} | VB6=${VB6_BASELINE_EXPECTED.peakTQ} | ${Math.abs(result.peakTQ - VB6_BASELINE_EXPECTED.peakTQ) < 1 ? '✓' : '✗'}`);
  console.log(`RPM@PeakTQ: TS=${result.rpmPeakTQ} | VB6=${VB6_BASELINE_EXPECTED.rpmPeakTQ} | ${result.rpmPeakTQ === VB6_BASELINE_EXPECTED.rpmPeakTQ ? '✓' : '✗'}`);
  
  console.log('\n--- SPECIFIC OUTPUT ---');
  console.log(`HP/CID:     TS=${result.hpPerCID.toFixed(2)} | VB6=${VB6_BASELINE_EXPECTED.hpPerCID} | ${Math.abs(result.hpPerCID - VB6_BASELINE_EXPECTED.hpPerCID) < 0.01 ? '✓' : '✗'}`);
  console.log(`TQ/CID:     TS=${result.tqPerCID.toFixed(2)} | VB6=${VB6_BASELINE_EXPECTED.tqPerCID} | ${Math.abs(result.tqPerCID - VB6_BASELINE_EXPECTED.tqPerCID) < 0.01 ? '✓' : '✗'}`);
  
  console.log('\n--- OPERATING RANGE ---');
  console.log(`Shift RPM:  TS=${result.shift} | VB6=${VB6_BASELINE_EXPECTED.shift} | ${result.shift === VB6_BASELINE_EXPECTED.shift ? '✓' : '✗'}`);
  console.log(`Redline:    TS=${result.redline} | VB6=${VB6_BASELINE_EXPECTED.redline} | ${result.redline === VB6_BASELINE_EXPECTED.redline ? '✓' : '✗'}`);
  
  // Test mechanical details
  console.log('\n--- MECHANICAL DETAILS ---');
  const mechDetails = calcMechDetails(
    result.rpmPeakHP,
    VB6_BASELINE_CONFIG.stroke_in,
    VB6_BASELINE_CONFIG.rodLength_in
  );
  console.log(`Generated ${mechDetails.length} mechanical detail points`);
  
  // TODO: Test flow details (requires function signature updates)
  // TODO: Test recommendations (requires implementation completion)
  
  console.log('\n' + '='.repeat(80));
  
  return result;
}

// Export for use in test files
export default testVB6Baseline;
