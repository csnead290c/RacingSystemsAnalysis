/**
 * Debug version of engine performance calculation
 * Traces all intermediate values to identify discrepancies with VB6
 */

import { calcEngPerf } from './enginePerf';
import type { EngineInputs } from './engineTypes';

// User's test case from full VB6 output
const USER_INPUTS: EngineInputs = {
  noCyl: 8,
  inline: 1,              // Vee (VB6: 0=Inline, 1=Vee, 2=Flat)
  bore: 4.03,
  stroke: 3.48,
  rod: 5.85,
  compressionRatio: 12.9,
  camType: 4,             // Normal Flat Tappet & Solid Lifter
  inCamDur: 264,
  carb: true,
  carbCFM: 750,
  fuel: 1,                // Gasoline
  manifold: 1,            // Common Plenum
  curved: true,           // CURVED RUNNER (critical!)
  manFlow: 96,
  noInValves: 1,
  valveDia: 2.05,
  maxInFlow: 250,
  deltaP: 28,
  refBore: 4.0,           // 4.000 from test case
  deck: 0.015,
  gasket: 0.039,
  chamber: 62,
  dome: 12,
};

console.log('='.repeat(80));
console.log('ENGINE PERFORMANCE DEBUG - User Test Case');
console.log('='.repeat(80));

console.log('\nINPUTS:');
console.log(`  Cylinders: ${USER_INPUTS.noCyl} (${USER_INPUTS.inline === 0 ? 'Inline' : USER_INPUTS.inline === 1 ? 'Vee' : 'Flat'})`);
console.log(`  Bore: ${USER_INPUTS.bore}" × Stroke: ${USER_INPUTS.stroke}"`);
console.log(`  Rod: ${USER_INPUTS.rod}"`);
console.log(`  CR: ${USER_INPUTS.compressionRatio}:1`);
console.log(`  Cam: Type ${USER_INPUTS.camType}, ${USER_INPUTS.inCamDur}° duration`);
console.log(`  Fuel: ${USER_INPUTS.fuel === 1 ? 'Gasoline' : 'Other'}`);
console.log(`  Carb: ${USER_INPUTS.carbCFM} CFM`);
console.log(`  Manifold: ${USER_INPUTS.manifold} (${USER_INPUTS.curved ? 'Curved' : 'Straight'}), ${USER_INPUTS.manFlow}% flow`);
console.log(`  Valves: ${USER_INPUTS.noInValves} × ${USER_INPUTS.valveDia}" dia, ${USER_INPUTS.maxInFlow} CFM @ ${USER_INPUTS.deltaP}" H2O`);

const result = calcEngPerf(USER_INPUTS);

console.log('\n' + '='.repeat(80));
console.log('TYPESCRIPT OUTPUT:');
console.log('='.repeat(80));
console.log(`  CID: ${result.cid.toFixed(1)}`);
console.log(`  Peak HP: ${Math.round(result.peakHP)} @ ${result.rpmPeakHP} RPM`);
console.log(`  Peak TQ: ${Math.round(result.peakTQ)} @ ${result.rpmPeakTQ} RPM`);
console.log(`  HP/CID: ${result.hpPerCID.toFixed(2)}`);
console.log(`  TQ/CID: ${result.tqPerCID.toFixed(2)}`);
console.log(`  Shift: ${result.shift} RPM`);
console.log(`  Redline: ${result.redline} RPM`);

console.log('\n' + '='.repeat(80));
console.log('EXPECTED VB6 OUTPUT:');
console.log('='.repeat(80));
console.log('  CID: 355.1');
console.log('  Peak HP: 461 @ 6650 RPM');
console.log('  Peak TQ: 415 @ 5450 RPM');
console.log('  HP/CID: 1.30');
console.log('  TQ/CID: 1.17');
console.log('  Shift: 7200 RPM');
console.log('  Redline: 8350 RPM');

console.log('\n' + '='.repeat(80));
console.log('DISCREPANCIES:');
console.log('='.repeat(80));
const hpDiff = Math.round(result.peakHP) - 461;
const tqDiff = Math.round(result.peakTQ) - 415;
const hpRpmDiff = result.rpmPeakHP - 6650;
const tqRpmDiff = result.rpmPeakTQ - 5450;
const shiftDiff = result.shift - 7200;
const redlineDiff = result.redline - 8350;

console.log(`  HP: ${Math.round(result.peakHP)} vs 461 (${hpDiff >= 0 ? '+' : ''}${hpDiff})`);
console.log(`  TQ: ${Math.round(result.peakTQ)} vs 415 (${tqDiff >= 0 ? '+' : ''}${tqDiff})`);
console.log(`  HP RPM: ${result.rpmPeakHP} vs 6650 (${hpRpmDiff >= 0 ? '+' : ''}${hpRpmDiff})`);
console.log(`  TQ RPM: ${result.rpmPeakTQ} vs 5450 (${tqRpmDiff >= 0 ? '+' : ''}${tqRpmDiff})`);
console.log(`  Shift: ${result.shift} vs 7200 (${shiftDiff >= 0 ? '+' : ''}${shiftDiff})`);
console.log(`  Redline: ${result.redline} vs 8350 (${redlineDiff >= 0 ? '+' : ''}${redlineDiff})`);

const totalError = Math.abs(hpDiff) + Math.abs(tqDiff) + Math.abs(hpRpmDiff/50) + Math.abs(tqRpmDiff/50);
console.log(`\n  Total Error Score: ${totalError.toFixed(1)}`);

if (totalError < 5) {
  console.log('\n✓ PASS - Within acceptable tolerance');
} else {
  console.log('\n✗ FAIL - Significant discrepancies found');
  console.log('\nNeed to debug the calculation step-by-step...');
}

console.log('\n' + '='.repeat(80));
