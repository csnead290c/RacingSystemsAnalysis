/**
 * Test VB6 Single Precision vs Double Precision
 */

import { calcEngPerf } from './enginePerf';
import { calcEngPerfVB6Precision } from './enginePerfVB6Precision';
import type { EngineInputs } from './engineTypes';

const testConfig: EngineInputs = {
  noCyl: 8,
  inline: 1, // Vee
  bore: 4.03,
  stroke: 3.48,
  rod: 5.85,
  compressionRatio: 12.0,
  camType: 1, // Roller
  inCamDur: 240,
  carb: true,
  carbCFM: 750,
  fuel: 1, // Gasoline
  manifold: 1, // Plenum
  curved: false,
  manFlow: 96,
  noInValves: 1,
  valveDia: 2.08,
  maxInFlow: 260,
  deltaP: 28,
  refBore: 4.03,
};

console.log('=== Testing Double Precision (standard) ===');
const doubleResult = calcEngPerf(testConfig);
console.log(`Peak HP: ${doubleResult.peakHP.toFixed(1)} @ ${doubleResult.rpmPeakHP} RPM`);
console.log(`Peak TQ: ${doubleResult.peakTQ.toFixed(1)} @ ${doubleResult.rpmPeakTQ} RPM`);

console.log('\n=== Testing Single Precision (VB6 exact) ===');
const singleResult = calcEngPerfVB6Precision(testConfig);
console.log(`Peak HP: ${singleResult.peakHP.toFixed(1)} @ ${singleResult.rpmPeakHP} RPM`);
console.log(`Peak TQ: ${singleResult.peakTQ.toFixed(1)} @ ${singleResult.rpmPeakTQ} RPM`);

console.log('\n=== Difference (Single vs Double) ===');
console.log(`HP Diff: ${(singleResult.peakHP - doubleResult.peakHP).toFixed(1)}`);
console.log(`TQ Diff: ${(singleResult.peakTQ - doubleResult.peakTQ).toFixed(1)}`);
console.log(`HP RPM Diff: ${singleResult.rpmPeakHP - doubleResult.rpmPeakHP}`);
console.log(`TQ RPM Diff: ${singleResult.rpmPeakTQ - doubleResult.rpmPeakTQ}`);

console.log('\n=== Expected VB6 Values ===');
console.log('Peak HP: 461 @ 6650 RPM');
console.log('Peak TQ: 415 @ 5450 RPM');

console.log('\n=== Single Precision vs VB6 ===');
console.log(`HP Diff: ${(singleResult.peakHP - 461).toFixed(1)} (${((singleResult.peakHP - 461) / 461 * 100).toFixed(1)}%)`);
console.log(`TQ Diff: ${(singleResult.peakTQ - 415).toFixed(1)} (${((singleResult.peakTQ - 415) / 415 * 100).toFixed(1)}%)`);
console.log(`HP RPM Diff: ${singleResult.rpmPeakHP - 6650}`);
console.log(`TQ RPM Diff: ${singleResult.rpmPeakTQ - 5450}`);
