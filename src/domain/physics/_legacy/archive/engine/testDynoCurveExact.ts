/**
 * Test dyno curve generation against VB6 exact values
 * This will identify the root cause of the curve mismatch
 */

import { calcEngPerf } from './enginePerf';
import { generateVB6DynoCurve } from './vb6CurveGen';
import type { EngineInputs } from './engineTypes';

// Exact VB6 base case configuration
const vb6BaseCase: EngineInputs = {
  noCyl: 8,
  inline: 1, // Vee
  bore: 4.030,
  stroke: 3.480,
  rod: 5.850,
  compressionRatio: 12.9,
  camType: 4, // Normal Flat Tappet
  inCamDur: 264,
  carb: true,
  carbCFM: 750,
  fuel: 1, // Gasoline
  manifold: 1, // Common Plenum
  curved: true,
  manFlow: 96.0,
  noInValves: 1,
  valveDia: 2.050,
  maxInFlow: 250.0,
  deltaP: 28.0,
  refBore: 4.000,
};

// VB6 expected dyno table values
const vb6DynoTable = [
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

console.log('=== VB6 Dyno Curve Exact Parity Test ===\n');

// Run engine performance calculation
const result = calcEngPerf(vb6BaseCase);

console.log('Peak Performance:');
console.log(`  Peak HP: ${result.peakHP.toFixed(1)} @ ${result.rpmPeakHP} RPM (VB6: 461 @ 6650)`);
console.log(`  Peak TQ: ${result.peakTQ.toFixed(1)} @ ${result.rpmPeakTQ} RPM (VB6: 415 @ 5450)`);
console.log(`  Shift: ${result.shift} RPM (VB6: 7200)`);
console.log(`  Redline: ${result.redline} RPM (VB6: 8350)`);

// Generate dyno curve
const displacement = Math.PI * Math.pow(vb6BaseCase.bore / 2, 2) * vb6BaseCase.stroke * vb6BaseCase.noCyl;
const curve = generateVB6DynoCurve(
  result.peakHP,
  result.rpmPeakHP,
  result.peakTQ,
  result.rpmPeakTQ,
  result.redline,
  displacement
);

console.log('\n=== Dyno Curve Comparison ===');
console.log('RPM    VB6_HP  RSA_HP  HP_Diff  HP_Err%  VB6_TQ  RSA_TQ  TQ_Diff  TQ_Err%');
console.log('-----  ------  ------  -------  -------  ------  ------  -------  -------');

let maxHPError = 0;
let maxTQError = 0;
let totalHPError = 0;
let totalTQError = 0;
let count = 0;

vb6DynoTable.forEach(vb6Row => {
  const rsaRow = curve.find(p => p.rpm === vb6Row.rpm);
  if (rsaRow) {
    const hpDiff = rsaRow.hp - vb6Row.hp;
    const tqDiff = rsaRow.torque_lbft - vb6Row.tq;
    const hpErr = Math.abs(hpDiff / vb6Row.hp * 100);
    const tqErr = Math.abs(tqDiff / vb6Row.tq * 100);
    
    maxHPError = Math.max(maxHPError, hpErr);
    maxTQError = Math.max(maxTQError, tqErr);
    totalHPError += hpErr;
    totalTQError += tqErr;
    count++;
    
    console.log(
      `${vb6Row.rpm}   ${vb6Row.hp.toString().padStart(3)}     ${rsaRow.hp.toFixed(0).padStart(3)}     ` +
      `${hpDiff >= 0 ? '+' : ''}${hpDiff.toFixed(1).padStart(5)}   ${hpErr.toFixed(2).padStart(6)}%  ` +
      `${vb6Row.tq.toString().padStart(3)}     ${rsaRow.torque_lbft.toFixed(0).padStart(3)}     ` +
      `${tqDiff >= 0 ? '+' : ''}${tqDiff.toFixed(1).padStart(5)}   ${tqErr.toFixed(2).padStart(6)}%`
    );
  }
});

const avgHPError = totalHPError / count;
const avgTQError = totalTQError / count;

console.log('\n=== Error Statistics ===');
console.log(`Max HP Error: ${maxHPError.toFixed(2)}%`);
console.log(`Max TQ Error: ${maxTQError.toFixed(2)}%`);
console.log(`Avg HP Error: ${avgHPError.toFixed(2)}%`);
console.log(`Avg TQ Error: ${avgTQError.toFixed(2)}%`);

console.log('\n=== Root Cause Analysis ===');
if (maxHPError > 0.5 || maxTQError > 0.5) {
  console.log('❌ MISMATCH DETECTED - Errors exceed 0.5%');
  console.log('\nPossible causes:');
  console.log('1. Curve generation algorithm differs from VB6');
  console.log('2. Single vs Double precision differences');
  console.log('3. Interpolation differences in DTABY/TABY functions');
  console.log('4. Constants mismatch (PI, Z6, etc.)');
  console.log('5. Peak values used for curve generation differ');
  
  console.log('\nNext steps:');
  console.log('- Compare intermediate values in curve generation');
  console.log('- Check ENGINE() function output (29-point base curve)');
  console.log('- Verify DTABY interpolation matches VB6 exactly');
  console.log('- Check XMin/XMax calculation and RPM point generation');
} else {
  console.log('✅ EXCELLENT - Curve matches VB6 within 0.5%');
}

// Debug: Print first few curve points to see pattern
console.log('\n=== Full RSA Curve (first 20 points) ===');
console.log('RPM    HP     TQ');
curve.slice(0, 20).forEach(p => {
  console.log(`${p.rpm}   ${p.hp.toFixed(0).padStart(3)}    ${p.torque_lbft.toFixed(0).padStart(3)}`);
});
