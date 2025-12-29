/**
 * Quick test of user's test case
 */

import { calcEngPerf } from './src/domain/physics/engine/enginePerf.ts';

const USER_INPUTS = {
  noCyl: 8,
  inline: 0,
  bore: 4.03,
  stroke: 3.48,
  rod: 5.85,
  compressionRatio: 12.9,
  camType: 4,
  inCamDur: 264,
  carb: true,
  carbCFM: 750,
  fuel: 1,
  manifold: 1,
  curved: true,
  manFlow: 96,
  noInValves: 1,
  valveDia: 2.05,
  maxInFlow: 250,
  deltaP: 28,
  refBore: 4.0,
  deck: 0.015,
  gasket: 0.039,
  chamber: 62,
  dome: 12,
};

console.log('Testing user case...\n');

const result = calcEngPerf(USER_INPUTS);

console.log('TypeScript Output:');
console.log(`  CID: ${result.cid.toFixed(1)}`);
console.log(`  Peak HP: ${Math.round(result.peakHP)} @ ${result.rpmPeakHP} RPM`);
console.log(`  Peak TQ: ${Math.round(result.peakTQ)} @ ${result.rpmPeakTQ} RPM`);
console.log(`  HP/CID: ${result.hpPerCID.toFixed(2)}`);
console.log(`  TQ/CID: ${result.tqPerCID.toFixed(2)}`);
console.log(`  Shift: ${result.shift} RPM`);
console.log(`  Redline: ${result.redline} RPM`);

console.log('\nExpected VB6 Output:');
console.log('  CID: 355.1');
console.log('  Peak HP: 461 @ 6650 RPM');
console.log('  Peak TQ: 415 @ 5450 RPM');
console.log('  HP/CID: 1.30');
console.log('  TQ/CID: 1.17');
console.log('  Shift: 7200 RPM');
console.log('  Redline: 8350 RPM');

console.log('\nDiscrepancies:');
console.log(`  HP: ${Math.round(result.peakHP) - 461}`);
console.log(`  TQ: ${Math.round(result.peakTQ) - 415}`);
console.log(`  HP RPM: ${result.rpmPeakHP - 6650}`);
console.log(`  TQ RPM: ${result.rpmPeakTQ - 5450}`);
