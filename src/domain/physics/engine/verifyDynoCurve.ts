/**
 * Verify dyno curve matches VB6 table exactly
 */

import { calcEngPerf } from './enginePerf';
import { generateVB6DynoCurve } from './vb6CurveGen';
import type { EngineInputs } from './engineTypes';

const exactVB6Config: EngineInputs = {
  noCyl: 8,
  inline: 1,
  bore: 4.030,
  stroke: 3.480,
  rod: 5.850,
  compressionRatio: 12.9,
  camType: 4,
  inCamDur: 264,
  carb: true,
  carbCFM: 750,
  fuel: 1,
  manifold: 1,
  curved: true,
  manFlow: 96.0,
  noInValves: 1,
  valveDia: 2.050,
  maxInFlow: 250.0,
  deltaP: 28.0,
  refBore: 4.000,
};

const result = calcEngPerf(exactVB6Config);
const displacement = Math.PI * Math.pow(exactVB6Config.bore / 2, 2) * exactVB6Config.stroke * exactVB6Config.noCyl;
const curve = generateVB6DynoCurve(
  result.peakHP,
  result.rpmPeakHP,
  result.peakTQ,
  result.rpmPeakTQ,
  result.redline,
  displacement
);

// VB6 table data from screenshot
const vb6Table = [
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

console.log('=== Dyno Curve Accuracy Verification ===\n');
console.log('RPM    VB6_HP  TS_HP   Diff    VB6_TQ  TS_TQ   Diff    Status');
console.log('-----  ------  ------  ------  ------  ------  ------  ------');

let maxHPError = 0;
let maxTQError = 0;
let totalHPError = 0;
let totalTQError = 0;

vb6Table.forEach(vb6Point => {
  const tsPoint = curve.find(p => p.rpm === vb6Point.rpm);
  if (tsPoint) {
    const hpDiff = tsPoint.hp - vb6Point.hp;
    const tqDiff = tsPoint.torque_lbft - vb6Point.tq;
    const hpError = Math.abs(hpDiff / vb6Point.hp * 100);
    const tqError = Math.abs(tqDiff / vb6Point.tq * 100);
    
    maxHPError = Math.max(maxHPError, hpError);
    maxTQError = Math.max(maxTQError, tqError);
    totalHPError += hpError;
    totalTQError += tqError;
    
    const status = (hpError < 2 && tqError < 2) ? '✓' : '⚠';
    
    console.log(
      `${vb6Point.rpm}   ${vb6Point.hp.toString().padStart(3)}     ${tsPoint.hp.toFixed(0).padStart(3)}     ` +
      `${hpDiff >= 0 ? '+' : ''}${hpDiff.toFixed(0).padStart(2)}     ` +
      `${vb6Point.tq.toString().padStart(3)}     ${tsPoint.torque_lbft.toFixed(0).padStart(3)}     ` +
      `${tqDiff >= 0 ? '+' : ''}${tqDiff.toFixed(0).padStart(2)}     ${status}`
    );
  }
});

const avgHPError = totalHPError / vb6Table.length;
const avgTQError = totalTQError / vb6Table.length;

console.log('\n=== Error Statistics ===');
console.log(`Max HP Error: ${maxHPError.toFixed(2)}%`);
console.log(`Max TQ Error: ${maxTQError.toFixed(2)}%`);
console.log(`Avg HP Error: ${avgHPError.toFixed(2)}%`);
console.log(`Avg TQ Error: ${avgTQError.toFixed(2)}%`);

console.log('\n=== Overall Assessment ===');
if (maxHPError < 2 && maxTQError < 2) {
  console.log('✓ EXCELLENT - All points within 2% (VB6 uses 250 RPM increments, we use 125 RPM)');
} else if (maxHPError < 5 && maxTQError < 5) {
  console.log('⚠ ACCEPTABLE - Within 5% error (likely due to interpolation differences)');
} else {
  console.log('✗ NEEDS INVESTIGATION - Errors exceed 5%');
}

console.log('\n=== Note ===');
console.log('VB6 generates dyno table at 250 RPM increments.');
console.log('Our implementation uses 125 RPM increments for smoother graphs.');
console.log('Small differences at extremes are expected due to interpolation.');
