/**
 * Test with EXACT VB6 configuration from user's screenshot
 * Expected: Peak HP 461 @ 6650 RPM, Peak TQ 415 @ 5450 RPM
 */

import { calcEngPerf } from './enginePerf';
import { generateVB6DynoCurve } from './vb6CurveGen';
import type { EngineInputs } from './engineTypes';

// EXACT configuration from VB6 screenshot:
const exactVB6Config: EngineInputs = {
  noCyl: 8,
  inline: 1, // Vee
  bore: 4.030,
  stroke: 3.480,
  rod: 5.850,
  compressionRatio: 12.9,
  camType: 4, // Normal Flat Tappet & Solid Lifter
  inCamDur: 264,
  carb: true,
  carbCFM: 750,
  fuel: 1, // Gasoline
  manifold: 1, // Common Plenum Style
  curved: true, // Curved Runner
  manFlow: 96.0,
  noInValves: 1,
  valveDia: 2.050,
  maxInFlow: 250.0,
  deltaP: 28.0,
  refBore: 4.000,
  chamber: 62.0,
  deck: 0.015,
  gasket: 0.039,
  dome: 12.0,
};

console.log('=== Testing EXACT VB6 Configuration ===');
console.log('From VB6 Screenshot: Base case for ENGINE Pro');
console.log('');

const result = calcEngPerf(exactVB6Config);

console.log('=== TypeScript Results ===');
console.log(`Peak HP: ${result.peakHP.toFixed(0)} @ ${result.rpmPeakHP} RPM`);
console.log(`Peak TQ: ${result.peakTQ.toFixed(0)} @ ${result.rpmPeakTQ} RPM`);
console.log(`Shift: ${result.shift} RPM`);
console.log(`Redline: ${result.redline} RPM`);
console.log(`HP/CID: ${result.hpPerCID.toFixed(2)}`);
console.log(`TQ/CID: ${result.tqPerCID.toFixed(2)}`);
console.log(`Displacement: ${result.cid.toFixed(1)} CID`);

console.log('\n=== VB6 Expected Results ===');
console.log('Peak HP: 461 @ 6650 RPM');
console.log('Peak TQ: 415 @ 5450 RPM');
console.log('Shift: 7200 RPM');
console.log('Redline: 8350 RPM');
console.log('HP/CID: 1.30');
console.log('TQ/CID: 1.17');
console.log('Displacement: 355.1 CID');

console.log('\n=== Difference ===');
console.log(`HP Diff: ${(result.peakHP - 461).toFixed(1)} (${((result.peakHP - 461) / 461 * 100).toFixed(2)}%)`);
console.log(`TQ Diff: ${(result.peakTQ - 415).toFixed(1)} (${((result.peakTQ - 415) / 415 * 100).toFixed(2)}%)`);
console.log(`HP RPM Diff: ${result.rpmPeakHP - 6650}`);
console.log(`TQ RPM Diff: ${result.rpmPeakTQ - 5450}`);
console.log(`Shift RPM Diff: ${result.shift - 7200}`);
console.log(`Redline RPM Diff: ${result.redline - 8350}`);

// Generate dyno curve
const displacement = Math.PI * Math.pow(exactVB6Config.bore / 2, 2) * exactVB6Config.stroke * exactVB6Config.noCyl;
const curve = generateVB6DynoCurve(
  result.peakHP,
  result.rpmPeakHP,
  result.peakTQ,
  result.rpmPeakTQ,
  result.redline,
  displacement
);

console.log('\n=== Dyno Curve Comparison (VB6 vs TypeScript) ===');
console.log('RPM    VB6_HP  TS_HP   VB6_TQ  TS_TQ');
console.log('----   ------  ------  ------  ------');

const vb6Data = [
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
];

vb6Data.forEach(vb6Point => {
  const tsPoint = curve.find(p => p.rpm === vb6Point.rpm);
  if (tsPoint) {
    const hpDiff = tsPoint.hp - vb6Point.hp;
    const tqDiff = tsPoint.torque_lbft - vb6Point.tq;
    console.log(
      `${vb6Point.rpm}   ${vb6Point.hp.toString().padStart(3)}     ${tsPoint.hp.toFixed(0).padStart(3)}     ` +
      `${vb6Point.tq.toString().padStart(3)}     ${tsPoint.torque_lbft.toFixed(0).padStart(3)}     ` +
      `(HP: ${hpDiff >= 0 ? '+' : ''}${hpDiff.toFixed(0)}, TQ: ${tqDiff >= 0 ? '+' : ''}${tqDiff.toFixed(0)})`
    );
  }
});

console.log('\n=== ACCURACY STATUS ===');
const hpError = Math.abs((result.peakHP - 461) / 461 * 100);
const tqError = Math.abs((result.peakTQ - 415) / 415 * 100);
if (hpError < 0.1 && tqError < 0.1) {
  console.log('✓ PERFECT MATCH - 100% Accuracy Achieved!');
} else if (hpError < 1.0 && tqError < 1.0) {
  console.log('⚠ CLOSE - Within 1% error (acceptable for floating point)');
} else {
  console.log('✗ DISCREPANCY FOUND - Further investigation needed');
  console.log(`  HP Error: ${hpError.toFixed(2)}%`);
  console.log(`  TQ Error: ${tqError.toFixed(2)}%`);
}
