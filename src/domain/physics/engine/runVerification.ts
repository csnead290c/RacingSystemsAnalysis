/**
 * Run VB6 Verification Tests
 * 
 * Execute this file to verify TypeScript output matches VB6 exactly
 */

import { calcEngPerf } from './enginePerf';
import { ENGINE_PRO_BASECASE, ENGINE_JR_BASECASE } from './testEnginePerf';
import { EXPECTED_ENGINE_PRO_BASECASE, EXPECTED_ENGINE_JR_BASECASE } from './vb6Verification';
import type { EngineOutputs } from './engineTypes';
import type { VB6ExpectedOutput } from './vb6Verification';

function compareValue(name: string, actual: number, expected: number, decimals: number = 2): boolean {
  const tolerance = Math.pow(10, -decimals);
  const diff = Math.abs(actual - expected);
  const match = diff < tolerance;
  
  const actualStr = actual.toFixed(decimals);
  const expectedStr = expected.toFixed(decimals);
  const status = match ? '✓' : '✗';
  
  if (match) {
    console.log(`  ${status} ${name.padEnd(20)}: ${actualStr}`);
  } else {
    console.log(`  ${status} ${name.padEnd(20)}: ${actualStr} (expected ${expectedStr}) DIFF: ${diff.toFixed(6)}`);
  }
  
  return match;
}

function verifyCase(name: string, actual: EngineOutputs, expected: VB6ExpectedOutput): boolean {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`${name}`);
  console.log('='.repeat(60));
  
  let allMatch = true;
  
  // CID - 1 decimal
  allMatch = compareValue('CID', actual.cid, expected.cid, 1) && allMatch;
  
  // Peak HP - integer
  allMatch = compareValue('Peak HP', actual.peakHP, expected.peakHP, 0) && allMatch;
  
  // Peak TQ - integer
  allMatch = compareValue('Peak TQ', actual.peakTQ, expected.peakTQ, 0) && allMatch;
  
  // RPM @ Peak HP - integer (rounded to 50)
  allMatch = compareValue('RPM @ Peak HP', actual.rpmPeakHP, expected.rpmPeakHP, 0) && allMatch;
  
  // RPM @ Peak TQ - integer (rounded to 50)
  allMatch = compareValue('RPM @ Peak TQ', actual.rpmPeakTQ, expected.rpmPeakTQ, 0) && allMatch;
  
  // HP/CID - 2 decimals
  allMatch = compareValue('HP/CID', actual.hpPerCID, expected.hpPerCID, 2) && allMatch;
  
  // TQ/CID - 2 decimals
  allMatch = compareValue('TQ/CID', actual.tqPerCID, expected.tqPerCID, 2) && allMatch;
  
  // Shift RPM - integer (rounded to 50)
  allMatch = compareValue('Shift RPM', actual.shift, expected.shift, 0) && allMatch;
  
  // Redline RPM - integer (rounded to 50)
  allMatch = compareValue('Redline RPM', actual.redline, expected.redline, 0) && allMatch;
  
  // Lobe Sep Angle - integer
  if (expected.lobeSepAng !== undefined && actual.lobeSepAng !== undefined) {
    allMatch = compareValue('Lobe Sep Angle', actual.lobeSepAng, expected.lobeSepAng, 0) && allMatch;
  }
  
  // Intake Lobe CL - integer
  if (expected.inLobeCL !== undefined && actual.inLobeCL !== undefined) {
    allMatch = compareValue('Intake Lobe CL', actual.inLobeCL, expected.inLobeCL, 0) && allMatch;
  }
  
  return allMatch;
}

console.log('\n');
console.log('╔═══════════════════════════════════════════════════════════╗');
console.log('║   VB6 Engine Pro/Jr Verification Test Suite              ║');
console.log('╚═══════════════════════════════════════════════════════════╝');

// Run Engine Pro BASECASE
const proResult = calcEngPerf(ENGINE_PRO_BASECASE);
const proMatch = verifyCase('ENGINE Pro BASECASE', proResult, EXPECTED_ENGINE_PRO_BASECASE);

// Run Engine Jr BASECASE
const jrResult = calcEngPerf(ENGINE_JR_BASECASE);
const jrMatch = verifyCase('ENGINE Jr BASECASE', jrResult, EXPECTED_ENGINE_JR_BASECASE);

// Summary
console.log('\n' + '='.repeat(60));
console.log('VERIFICATION SUMMARY');
console.log('='.repeat(60));
console.log(`Engine Pro BASECASE: ${proMatch ? '✓ PASS' : '✗ FAIL'}`);
console.log(`Engine Jr BASECASE:  ${jrMatch ? '✓ PASS' : '✗ FAIL'}`);
console.log('='.repeat(60));

if (proMatch && jrMatch) {
  console.log('\n🎉 SUCCESS! 100% VB6 parity achieved!\n');
} else {
  console.log('\n⚠️  FAILED! Discrepancies found. Review output above.\n');
}

// Export for use in tests
export { proMatch, jrMatch };
