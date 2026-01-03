/**
 * Test with BASECASE.ENG configuration from VB6
 */

import { calcEngPerf } from './enginePerf';
import type { EngineInputs } from './engineTypes';

// From BASECASE.ENG:
// Line 3: 8  4.03  3.48  5.85  12.9  750  0 
// Line 4: 1  250  28  4  96  3  264 
// Line 5: 2.05  .55  2.4  250  79.48335 
// Line 6: .015  .039  12  62 
// Line 7: 4  1.688  1.375  0  730 

const baseCaseConfig: EngineInputs = {
  noCyl: 8,
  inline: 0, // Inline (from line 3, 6th param = 0)
  bore: 4.03,
  stroke: 3.48,
  rod: 5.85,
  compressionRatio: 12.9,
  camType: 4, // Normal Flat Tappet (from line 7, 1st param = 4)
  inCamDur: 264,
  carb: true,
  carbCFM: 750,
  fuel: 1, // Gasoline
  manifold: 3, // Dual plane/100% divided
  curved: false,
  manFlow: 96,
  noInValves: 4, // From line 7
  valveDia: 1.688, // From line 7
  maxInFlow: 250,
  deltaP: 28,
  refBore: 4.0,
};

console.log('=== Testing BASECASE.ENG Configuration ===');
console.log('Configuration:', baseCaseConfig);

const result = calcEngPerf(baseCaseConfig);

console.log('\n=== Results ===');
console.log(`Peak HP: ${result.peakHP.toFixed(1)} @ ${result.rpmPeakHP} RPM`);
console.log(`Peak TQ: ${result.peakTQ.toFixed(1)} @ ${result.rpmPeakTQ} RPM`);
console.log(`Shift: ${result.shift} RPM`);
console.log(`Redline: ${result.redline} RPM`);
console.log(`HP/CID: ${result.hpPerCID.toFixed(3)}`);
console.log(`TQ/CID: ${result.tqPerCID.toFixed(3)}`);
console.log(`Displacement: ${result.cid.toFixed(1)} CID`);

console.log('\n=== VB6 Screenshot Values (unknown config) ===');
console.log('Peak HP: 461 @ 6650 RPM');
console.log('Peak TQ: 415 @ 5450 RPM');
