/**
 * Test Engine Performance Calculation Accuracy
 * Compare TypeScript implementation against VB6 expected values
 */

import { calcEngPerf } from './enginePerf';
import { generateVB6DynoCurve } from './vb6CurveGen';
import type { EngineInputs } from './engineTypes';

// Test case from VB6 screenshot showing:
// Peak HP: 461 @ 6650 RPM
// Peak TQ: 415 @ 5450 RPM
// This appears to be a 355 CID V8 with roller cam

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

console.log('=== Engine Performance Test ===');
console.log('Configuration:', testConfig);

const result = calcEngPerf(testConfig);

console.log('\n=== Results ===');
console.log(`Peak HP: ${result.peakHP.toFixed(1)} @ ${result.rpmPeakHP} RPM`);
console.log(`Peak TQ: ${result.peakTQ.toFixed(1)} @ ${result.rpmPeakTQ} RPM`);
console.log(`Shift: ${result.shift} RPM`);
console.log(`Redline: ${result.redline} RPM`);
console.log(`HP/CID: ${result.hpPerCID.toFixed(3)}`);
console.log(`TQ/CID: ${result.tqPerCID.toFixed(3)}`);
console.log(`Displacement: ${result.cid.toFixed(1)} CID`);

console.log('\n=== Expected VB6 Values ===');
console.log('Peak HP: 461 @ 6650 RPM');
console.log('Peak TQ: 415 @ 5450 RPM');

console.log('\n=== Difference ===');
console.log(`HP Diff: ${(result.peakHP - 461).toFixed(1)} (${((result.peakHP - 461) / 461 * 100).toFixed(1)}%)`);
console.log(`TQ Diff: ${(result.peakTQ - 415).toFixed(1)} (${((result.peakTQ - 415) / 415 * 100).toFixed(1)}%)`);
console.log(`HP RPM Diff: ${result.rpmPeakHP - 6650}`);
console.log(`TQ RPM Diff: ${result.rpmPeakTQ - 5450}`);

// Generate dyno curve
const displacement = Math.PI * Math.pow(testConfig.bore / 2, 2) * testConfig.stroke * testConfig.noCyl;
const curve = generateVB6DynoCurve(
  result.peakHP,
  result.rpmPeakHP,
  result.peakTQ,
  result.rpmPeakTQ,
  result.redline,
  displacement
);

console.log('\n=== Dyno Curve Sample (first 5 points) ===');
curve.slice(0, 5).forEach(p => {
  console.log(`${p.rpm} RPM: ${p.hp} HP, ${p.torque_lbft} TQ`);
});

console.log('\n=== Dyno Curve Sample (around peak HP) ===');
const peakHPIndex = curve.findIndex(p => p.rpm >= result.rpmPeakHP);
if (peakHPIndex >= 0) {
  curve.slice(Math.max(0, peakHPIndex - 2), peakHPIndex + 3).forEach(p => {
    console.log(`${p.rpm} RPM: ${p.hp} HP, ${p.torque_lbft} TQ`);
  });
}

export { testConfig, result };
