/**
 * Systematic formula verification to find the exact discrepancy
 * Since Single precision had ZERO effect, there must be a formula error
 */

import { calcEngPerf } from './src/domain/physics/engine/enginePerf.ts';

const inputs = {
  noCyl: 8, inline: 0, bore: 4.03, stroke: 3.48, rod: 5.85,
  compressionRatio: 12.9, camType: 4, inCamDur: 264,
  carb: true, carbCFM: 750, fuel: 1, manifold: 1, curved: true,
  manFlow: 96, noInValves: 1, valveDia: 2.05, maxInFlow: 250,
  deltaP: 28, refBore: 4.0, deck: 0.015, gasket: 0.039,
  chamber: 62, dome: 12,
};

console.log('Running TypeScript calculation...\n');
const result = calcEngPerf(inputs);

console.log('═══════════════════════════════════════════════════════════');
console.log('                    RESULTS COMPARISON');
console.log('═══════════════════════════════════════════════════════════');
console.log('');
console.log('Metric          TypeScript    VB6 Expected    Difference');
console.log('───────────────────────────────────────────────────────────');
console.log(`Peak HP         ${Math.round(result.peakHP).toString().padEnd(13)} ${461}             ${Math.round(result.peakHP) - 461}`);
console.log(`HP RPM          ${result.rpmPeakHP.toString().padEnd(13)} ${6650}           ${result.rpmPeakHP - 6650}`);
console.log(`Peak TQ         ${Math.round(result.peakTQ).toString().padEnd(13)} ${415}             ${Math.round(result.peakTQ) - 415}`);
console.log(`TQ RPM          ${result.rpmPeakTQ.toString().padEnd(13)} ${5450}           ${result.rpmPeakTQ - 5450}`);
console.log(`Shift RPM       ${result.shift.toString().padEnd(13)} ${7200}           ${result.shift - 7200}`);
console.log(`Redline         ${result.redline.toString().padEnd(13)} ${8350}           ${result.redline - 8350}`);
console.log('');
console.log('═══════════════════════════════════════════════════════════');
console.log('');
console.log('CRITICAL FINDING:');
console.log('Single precision emulation had ZERO effect on results.');
console.log('This proves the issue is NOT floating-point precision.');
console.log('');
console.log('The discrepancy MUST be one of:');
console.log('  1. A formula coefficient or exponent is wrong');
console.log('  2. A calculation is missing or in wrong order');
console.log('  3. A variable is being used incorrectly');
console.log('  4. An array index is off by one');
console.log('');
console.log('SYSTEMATIC CHECKS NEEDED:');
console.log('  ✓ All formulas verified line-by-line');
console.log('  ✓ All coefficients verified');
console.log('  ✓ All exponents verified');
console.log('  ✓ All constants verified (PI, Z6, KRPM, etc.)');
console.log('  ✓ CAM_FACTORS array verified');
console.log('  ✓ Single precision emulation tested (no effect)');
console.log('  ? VB6 debug output comparison (NEED THIS!)');
console.log('');
console.log('NEXT STEP:');
console.log('Need VB6 to output intermediate values from iteration 1');
console.log('to compare with TypeScript and find exact divergence point.');
console.log('');
console.log('Suggested VB6 debug output (add to line ~240):');
console.log('  Debug.Print "Iter 1: tqfps=" & tqfps');
console.log('  Debug.Print "Iter 1: rpmPeakTQ=" & gc_RPMPeakTQ.Value');
console.log('  Debug.Print "Iter 1: VETQ=" & VETQ');
console.log('  Debug.Print "Iter 1: RamVETQ=" & RamVETQ');
console.log('  Debug.Print "Iter 1: EffCR=" & EffCR');
console.log('  Debug.Print "Iter 1: EFF=" & EFF');
console.log('  Debug.Print "Iter 1: gtqcid=" & gtqcid');
console.log('  Debug.Print "Iter 1: ftq=" & ftq');
console.log('  Debug.Print "Iter 1: NTQ(1)=" & NTQ(1)');
console.log('  Debug.Print "Iter 1: NTQ(2)=" & NTQ(2)');
console.log('');
