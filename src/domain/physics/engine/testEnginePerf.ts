/**
 * Engine Performance Test Cases
 * 
 * Test the TypeScript port against VB6 BASECASE.ENG files
 */

import { calcEngPerf } from './enginePerf';
import type { EngineInputs, EngineOutputs } from './engineTypes';

// BASECASE.ENG from Engine Pro (EPro3w/BASECASE.ENG)
// Line 1: " 2 "
// Line 2: "base case for ENGINE Pro"
// Line 3:  8  4.03  3.48  5.85  12.9  750  0 
// Line 4:  1  250  28  4  96  3  264 
// Line 5:  2.05  .55  2.4  250  79.48335 
// Line 6:  .015  .039  12  62 
// Line 7:  4  1.688  1.375  0  730 
// Line 8:  1.794  .344  2.434 

export const ENGINE_PRO_BASECASE: EngineInputs = {
  noCyl: 8,
  inline: 1,              // V-engine
  bore: 4.03,
  stroke: 3.48,
  rod: 5.85,
  compressionRatio: 12.9,
  camType: 4,             // Normal Flat Tappet & Solid Lifter (from SetAllValues default)
  inCamDur: 264,
  carb: true,
  carbCFM: 750,
  fuel: 1,                // Gasoline
  manifold: 1,            // Common Plenum (from SetAllValues default)
  curved: false,          // Line 7 shows 0
  manFlow: 96,
  noInValves: 1,
  valveDia: 2.05,
  maxInFlow: 250,
  deltaP: 28,
  refBore: 4.03,          // Assuming same as bore
  deck: 0.015,
  gasket: 0.039,
};

// BASECASE.ENG from Engine Jr (Ejr3w/BASECASE.ENG)
// Line 1: 2
// Line 2: base case for ENGINE jr
// Line 3:  8             4.03          3.48          5.85          13.5          750           0 
// Line 4:  1             250           28            4.03          96            3             264 
// Line 5:  2.05          0.5125        2.463         243.6054      77.4503 
// Line 6:  0.01755       0.04095       20.61919      66.58411 
// Line 7:  4             1.75          1.375         0             730 
// Line 8:  1.804         0.344         2.463071 

export const ENGINE_JR_BASECASE: EngineInputs = {
  noCyl: 8,
  inline: 1,
  bore: 4.03,
  stroke: 3.48,
  rod: 5.85,
  compressionRatio: 13.5,
  camType: 4,
  inCamDur: 264,
  carb: true,
  carbCFM: 750,
  fuel: 1,
  manifold: 1,
  curved: false,
  manFlow: 96,
  noInValves: 1,
  valveDia: 2.05,
  maxInFlow: 250,
  deltaP: 28,
  refBore: 4.03,
  deck: 0.01755,
  gasket: 0.04095,
};

/**
 * Run test cases and display results
 */
export function testEnginePerf(): void {
  console.log('=== Engine Pro BASECASE Test ===');
  const proBASECASE = calcEngPerf(ENGINE_PRO_BASECASE);
  displayResults('Engine Pro BASECASE', proBASECASE);
  
  console.log('\n=== Engine Jr BASECASE Test ===');
  const jrBASECASE = calcEngPerf(ENGINE_JR_BASECASE);
  displayResults('Engine Jr BASECASE', jrBASECASE);
}

function displayResults(name: string, results: EngineOutputs): void {
  console.log(`\n${name} Results:`);
  console.log(`  CID: ${results.cid.toFixed(2)}`);
  console.log(`  Peak HP: ${results.peakHP.toFixed(2)} @ ${results.rpmPeakHP} RPM`);
  console.log(`  Peak TQ: ${results.peakTQ.toFixed(2)} lb-ft @ ${results.rpmPeakTQ} RPM`);
  console.log(`  HP/CID: ${results.hpPerCID.toFixed(3)}`);
  console.log(`  TQ/CID: ${results.tqPerCID.toFixed(3)}`);
  console.log(`  Shift: ${results.shift} RPM`);
  console.log(`  Redline: ${results.redline} RPM`);
}

// Run tests if this file is executed directly
if (require.main === module) {
  testEnginePerf();
}
