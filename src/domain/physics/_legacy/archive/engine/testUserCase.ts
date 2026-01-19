/**
 * User's Test Case from VB6 Screenshot
 * 
 * Expected VB6 Output:
 * - Peak HP: 451 @ 6600 RPM
 * - Peak TQ: 410 @ 5400 RPM
 * - HP/CID: 1.27
 * - TQ/CID: 1.15
 * - Shift: 7150 RPM
 * - Redline: 8250 RPM
 */

import { calcEngPerf } from './enginePerf';
import type { EngineInputs } from './engineTypes';

// From user's screenshot - Engine Pro with these inputs:
// 8 cylinders, Vee, 4.03" bore, 3.48" stroke, 5.85" rod, 12.9:1 CR
// Normal Flat Tappet cam, 264° duration
// Gasoline, Carburetor 750 CFM
// Common Plenum manifold, Straight runners, 96% flow
// 1 intake valve per cyl, 2.05" dia, 250 CFM @ 28" H2O, 4.03" test bore

export const USER_TEST_CASE: EngineInputs = {
  noCyl: 8,
  inline: 1,              // Vee (VB6 uses 0=Inline, 1=Vee, 2=Flat)
  bore: 4.03,
  stroke: 3.48,
  rod: 5.85,
  compressionRatio: 12.9,
  camType: 4,             // Normal Flat Tappet & Solid Lifter
  inCamDur: 264,
  carb: true,
  carbCFM: 750,
  fuel: 1,                // Gasoline
  manifold: 1,            // Common Plenum
  curved: true,           // CURVED RUNNER (from full test case!)
  manFlow: 96,
  noInValves: 1,
  valveDia: 2.05,
  maxInFlow: 250,
  deltaP: 28,
  refBore: 4.0,           // 4.000 from test case
  // Compression ratio worksheet values from test case
  deck: 0.015,
  gasket: 0.039,
  chamber: 62,
  dome: 12,
};

// Run the test
console.log('=== User Test Case ===');
const result = calcEngPerf(USER_TEST_CASE);

console.log('\nTypeScript Output:');
console.log(`  CID: ${result.cid.toFixed(1)}`);
console.log(`  Peak HP: ${Math.round(result.peakHP)} @ ${result.rpmPeakHP} RPM`);
console.log(`  Peak TQ: ${Math.round(result.peakTQ)} @ ${result.rpmPeakTQ} RPM`);
console.log(`  HP/CID: ${result.hpPerCID.toFixed(2)}`);
console.log(`  TQ/CID: ${result.tqPerCID.toFixed(2)}`);
console.log(`  Shift: ${result.shift} RPM`);
console.log(`  Redline: ${result.redline} RPM`);

console.log('\nExpected VB6 Output:');
console.log('  CID: 355.1');
console.log('  Peak HP: 451 @ 6600 RPM');
console.log('  Peak TQ: 410 @ 5400 RPM');
console.log('  HP/CID: 1.27');
console.log('  TQ/CID: 1.15');
console.log('  Shift: 7150 RPM');
console.log('  Redline: 8250 RPM');

console.log('\nDiscrepancies:');
console.log(`  HP: ${Math.round(result.peakHP)} vs 451 (diff: ${Math.round(result.peakHP) - 451})`);
console.log(`  TQ: ${Math.round(result.peakTQ)} vs 410 (diff: ${Math.round(result.peakTQ) - 410})`);
console.log(`  HP RPM: ${result.rpmPeakHP} vs 6600 (diff: ${result.rpmPeakHP - 6600})`);
console.log(`  TQ RPM: ${result.rpmPeakTQ} vs 5400 (diff: ${result.rpmPeakTQ - 5400})`);
