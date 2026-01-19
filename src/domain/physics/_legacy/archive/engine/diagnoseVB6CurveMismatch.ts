/**
 * Comprehensive diagnostic to find exact VB6 curve mismatch
 * Compare every intermediate value step-by-step
 */

import { calcEngPerf } from './enginePerf';
import { generateVB6DynoCurve } from './vb6CurveGen';
import type { EngineInputs } from './engineTypes';
import { CONSTANTS } from './engineConstants';

const vb6Config: EngineInputs = {
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

console.log('=== VB6 Curve Mismatch Diagnostic ===\n');

// Step 1: Calculate engine performance
const result = calcEngPerf(vb6Config);
const CID = Math.PI * Math.pow(vb6Config.bore / 2, 2) * vb6Config.stroke * vb6Config.noCyl;

console.log('Step 1: Engine Performance Results');
console.log(`  Peak HP: ${result.peakHP.toFixed(6)} @ ${result.rpmPeakHP} RPM`);
console.log(`  Peak TQ: ${result.peakTQ.toFixed(6)} @ ${result.rpmPeakTQ} RPM`);
console.log(`  CID: ${CID.toFixed(6)}`);
console.log(`  VB6 expects: HP=461 @ 6650, TQ=415 @ 5450, CID=355.1`);

// Step 2: Check constants
console.log('\nStep 2: Constants Check');
console.log(`  PI: ${CONSTANTS.PI} (VB6: 3.141593)`);
console.log(`  Z6: ${CONSTANTS.Z6} (VB6: ${(60 / (2 * 3.141593)) * 550})`);
console.log(`  Match: ${Math.abs(CONSTANTS.PI - 3.141593) < 0.000001 && Math.abs(CONSTANTS.Z6 - 5252.112542904189) < 0.001 ? '✓' : '✗'}`);

// Step 3: Generate curve
console.log('\nStep 3: Generate Dyno Curve');
const curve = generateVB6DynoCurve(
  result.peakHP,
  result.rpmPeakHP,
  result.peakTQ,
  result.rpmPeakTQ,
  result.redline,
  CID
);

// Step 4: Compare specific VB6 table points
console.log('\nStep 4: VB6 Dyno Table Comparison');
console.log('RPM    VB6_HP  RSA_HP  Diff    VB6_TQ  RSA_TQ  Diff');

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
];

vb6Table.forEach(vb6 => {
  const rsa = curve.find(p => p.rpm === vb6.rpm);
  if (rsa) {
    const hpDiff = rsa.hp - vb6.hp;
    const tqDiff = rsa.torque_lbft - vb6.tq;
    console.log(`${vb6.rpm}   ${vb6.hp}     ${rsa.hp}     ${hpDiff >= 0 ? '+' : ''}${hpDiff}      ${vb6.tq}     ${rsa.torque_lbft}     ${tqDiff >= 0 ? '+' : ''}${tqDiff}`);
  }
});

// Step 5: Hypothesis testing
console.log('\n=== ROOT CAUSE ANALYSIS ===\n');

// Hypothesis 1: Peak values differ
const peakHPError = Math.abs(result.peakHP - 461);
const peakTQError = Math.abs(result.peakTQ - 415);
console.log(`Hypothesis 1: Peak values differ`);
console.log(`  Peak HP error: ${peakHPError.toFixed(2)} (${(peakHPError / 461 * 100).toFixed(2)}%)`);
console.log(`  Peak TQ error: ${peakTQError.toFixed(2)} (${(peakTQError / 415 * 100).toFixed(2)}%)`);
console.log(`  Verdict: ${peakHPError < 1 && peakTQError < 1 ? '✓ Peaks match - NOT the issue' : '✗ Peaks differ - THIS IS THE ISSUE'}`);

// Hypothesis 2: CID calculation differs
const vb6CID = 355.1;
const cidError = Math.abs(CID - vb6CID);
console.log(`\nHypothesis 2: CID calculation differs`);
console.log(`  RSA CID: ${CID.toFixed(6)}`);
console.log(`  VB6 CID: ${vb6CID}`);
console.log(`  Error: ${cidError.toFixed(6)} (${(cidError / vb6CID * 100).toFixed(4)}%)`);
console.log(`  Verdict: ${cidError < 0.1 ? '✓ CID matches - NOT the issue' : '✗ CID differs - THIS IS THE ISSUE'}`);

// Hypothesis 3: Curve generation algorithm differs
const rsa4500 = curve.find(p => p.rpm === 4500);
if (rsa4500) {
  const curveError = Math.abs(rsa4500.hp - 327);
  console.log(`\nHypothesis 3: Curve generation algorithm differs`);
  console.log(`  RSA @ 4500 RPM: ${rsa4500.hp} HP, ${rsa4500.torque_lbft} TQ`);
  console.log(`  VB6 @ 4500 RPM: 327 HP, 382 TQ`);
  console.log(`  HP Error: ${curveError} (${(curveError / 327 * 100).toFixed(2)}%)`);
  console.log(`  TQ Error: ${rsa4500.torque_lbft - 382} (${((rsa4500.torque_lbft - 382) / 382 * 100).toFixed(2)}%)`);
  console.log(`  Verdict: ${curveError > 5 ? '✗ Curve algorithm differs - THIS IS THE ISSUE' : '✓ Curve matches'}`);
}

// Hypothesis 4: VB6 uses different peak values for curve generation
console.log(`\nHypothesis 4: VB6 passes different values to Cgraph`);
console.log(`  We pass: HP=${result.peakHP.toFixed(1)}, TQ=${result.peakTQ.toFixed(1)}`);
console.log(`  VB6 might pass: HP=461, TQ=415 (rounded values)`);
console.log(`  Testing with rounded values...`);

const curveRounded = generateVB6DynoCurve(
  461,  // Rounded peak HP
  6650, // Rounded RPM
  415,  // Rounded peak TQ
  5450, // Rounded RPM
  8350, // Rounded redline
  355.1 // Rounded CID
);

const rsaRounded4500 = curveRounded.find(p => p.rpm === 4500);
if (rsaRounded4500) {
  const roundedError = Math.abs(rsaRounded4500.hp - 327);
  console.log(`  With rounded inputs @ 4500 RPM: ${rsaRounded4500.hp} HP, ${rsaRounded4500.torque_lbft} TQ`);
  console.log(`  HP Error: ${roundedError} (${(roundedError / 327 * 100).toFixed(2)}%)`);
  console.log(`  Verdict: ${roundedError < 5 ? '✓ Rounding fixes it - THIS WAS THE ISSUE' : '✗ Still differs'}`);
}

console.log('\n=== CONCLUSION ===');
if (cidError > 0.1) {
  console.log('❌ CID calculation is wrong - fix CID calculation first');
} else if (peakHPError > 1 || peakTQError > 1) {
  console.log('❌ Peak values are wrong - fix CalcEngPerf first');
} else if (rsaRounded4500 && Math.abs(rsaRounded4500.hp - 327) < 5) {
  console.log('✓ Issue is input rounding - VB6 rounds peak values before passing to Cgraph');
  console.log('  Solution: Round peak HP, TQ, RPMs, and CID before curve generation');
} else {
  console.log('❌ Curve generation algorithm differs from VB6');
  console.log('  Need to debug DTABY/TABY interpolation or curve stretching logic');
}
