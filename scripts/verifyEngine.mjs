/**
 * Verification Script - Run with Node.js
 * Usage: node scripts/verifyEngine.mjs
 */

import { calcEngPerf } from '../src/domain/physics/engine/enginePerf.ts';
import { ENGINE_PRO_BASECASE, ENGINE_JR_BASECASE } from '../src/domain/physics/engine/testEnginePerf.ts';

// VB6 Expected values from screenshots
const EXPECTED_PRO = {
  cid: 355.1,
  peakHP: 461,
  peakTQ: 415,
  rpmPeakHP: 6650,
  rpmPeakTQ: 5450,
  hpPerCID: 1.30,
  tqPerCID: 1.17,
  shift: 7200,
  redline: 8350,
};

const EXPECTED_JR = {
  cid: 355.1,
  peakHP: 461,
  peakTQ: 415,
  rpmPeakHP: 6650,
  rpmPeakTQ: 5450,
  hpPerCID: 1.30,
  tqPerCID: 1.17,
  shift: 7200,
  redline: 8350,
};

function compare(name, actual, expected, decimals = 2) {
  const tolerance = Math.pow(10, -decimals);
  const diff = Math.abs(actual - expected);
  const match = diff < tolerance;
  const status = match ? '✓' : '✗';
  
  console.log(`  ${status} ${name.padEnd(20)}: ${actual.toFixed(decimals).padStart(10)} ${match ? '' : `(expected ${expected.toFixed(decimals)}, diff: ${diff.toFixed(6)})`}`);
  
  return match;
}

console.log('\n╔═══════════════════════════════════════════════════════════╗');
console.log('║   VB6 Engine Pro/Jr Verification                          ║');
console.log('╚═══════════════════════════════════════════════════════════╝\n');

// Test Engine Pro
console.log('ENGINE Pro BASECASE');
console.log('─'.repeat(60));
const proResult = calcEngPerf(ENGINE_PRO_BASECASE);
let proMatch = true;
proMatch = compare('CID', proResult.cid, EXPECTED_PRO.cid, 1) && proMatch;
proMatch = compare('Peak HP', proResult.peakHP, EXPECTED_PRO.peakHP, 0) && proMatch;
proMatch = compare('Peak TQ', proResult.peakTQ, EXPECTED_PRO.peakTQ, 0) && proMatch;
proMatch = compare('RPM @ Peak HP', proResult.rpmPeakHP, EXPECTED_PRO.rpmPeakHP, 0) && proMatch;
proMatch = compare('RPM @ Peak TQ', proResult.rpmPeakTQ, EXPECTED_PRO.rpmPeakTQ, 0) && proMatch;
proMatch = compare('HP/CID', proResult.hpPerCID, EXPECTED_PRO.hpPerCID, 2) && proMatch;
proMatch = compare('TQ/CID', proResult.tqPerCID, EXPECTED_PRO.tqPerCID, 2) && proMatch;
proMatch = compare('Shift RPM', proResult.shift, EXPECTED_PRO.shift, 0) && proMatch;
proMatch = compare('Redline RPM', proResult.redline, EXPECTED_PRO.redline, 0) && proMatch;

// Test Engine Jr
console.log('\nENGINE Jr BASECASE');
console.log('─'.repeat(60));
const jrResult = calcEngPerf(ENGINE_JR_BASECASE);
let jrMatch = true;
jrMatch = compare('CID', jrResult.cid, EXPECTED_JR.cid, 1) && jrMatch;
jrMatch = compare('Peak HP', jrResult.peakHP, EXPECTED_JR.peakHP, 0) && jrMatch;
jrMatch = compare('Peak TQ', jrResult.peakTQ, EXPECTED_JR.peakTQ, 0) && jrMatch;
jrMatch = compare('RPM @ Peak HP', jrResult.rpmPeakHP, EXPECTED_JR.rpmPeakHP, 0) && jrMatch;
jrMatch = compare('RPM @ Peak TQ', jrResult.rpmPeakTQ, EXPECTED_JR.rpmPeakTQ, 0) && jrMatch;
jrMatch = compare('HP/CID', jrResult.hpPerCID, EXPECTED_JR.hpPerCID, 2) && jrMatch;
jrMatch = compare('TQ/CID', jrResult.tqPerCID, EXPECTED_JR.tqPerCID, 2) && jrMatch;
jrMatch = compare('Shift RPM', jrResult.shift, EXPECTED_JR.shift, 0) && jrMatch;
jrMatch = compare('Redline RPM', jrResult.redline, EXPECTED_JR.redline, 0) && jrMatch;

// Summary
console.log('\n' + '='.repeat(60));
console.log('SUMMARY');
console.log('='.repeat(60));
console.log(`Engine Pro: ${proMatch ? '✓ PASS' : '✗ FAIL'}`);
console.log(`Engine Jr:  ${jrMatch ? '✓ PASS' : '✗ FAIL'}`);
console.log('='.repeat(60));

if (proMatch && jrMatch) {
  console.log('\n🎉 SUCCESS! 100% VB6 parity achieved!\n');
} else {
  console.log('\n⚠️  FAILED! Review discrepancies above.\n');
}
