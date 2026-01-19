/**
 * Debug HP lookup in QuarterJr simulation
 * Check if TABY interpolation is working correctly
 */

import { taby } from '../vb6/dtaby';
import { buildEngineCurve, convertToZeroIndexed } from '../vb6/engineCurve';

// Generate curve for Pro Stock QuarterJr
const curve = buildEngineCurve({
  peakHP: 1300,
  peakRPM: 8900,
  displacement_cid: 500,
  fuelSystem: 1,
});

const { rpm, hp } = convertToZeroIndexed(curve);

console.log('='.repeat(80));
console.log('QUARTERJR HP LOOKUP VERIFICATION');
console.log('='.repeat(80));

console.log('\nGenerated HP Curve:');
console.log('RPM    | HP');
console.log('-------|-------');
rpm.forEach((r, i) => {
  console.log(`${r.toString().padStart(6)} | ${hp[i].toFixed(1).padStart(6)}`);
});

console.log('\n' + '='.repeat(80));
console.log('TABY INTERPOLATION TEST');
console.log('='.repeat(80));

// Test TABY interpolation at various RPMs
const testRPMs = [7400, 8000, 8500, 8900, 9300];

console.log('\nTest HP lookup at key RPMs:');
console.log('RPM    | Expected HP | TABY Result | Difference');
console.log('-------|-------------|-------------|------------');

testRPMs.forEach(testRPM => {
  const hpResult = taby(rpm, hp, rpm.length, 1, testRPM);
  
  // Find expected HP by linear interpolation
  let expectedHP = 0;
  for (let i = 0; i < rpm.length - 1; i++) {
    if (testRPM >= rpm[i] && testRPM <= rpm[i + 1]) {
      const ratio = (testRPM - rpm[i]) / (rpm[i + 1] - rpm[i]);
      expectedHP = hp[i] + ratio * (hp[i + 1] - hp[i]);
      break;
    }
  }
  
  const diff = hpResult - expectedHP;
  const status = Math.abs(diff) < 0.1 ? '✅' : '❌';
  
  console.log(`${testRPM.toString().padStart(6)} | ${expectedHP.toFixed(1).padStart(11)} | ${hpResult.toFixed(1).padStart(11)} | ${diff.toFixed(1).padStart(10)} ${status}`);
});

console.log('\n' + '='.repeat(80));
console.log('ANALYSIS');
console.log('='.repeat(80));
console.log('If TABY results match expected linear interpolation, then HP lookup is correct.');
console.log('If there are differences, the issue is in the TABY implementation.');
console.log('='.repeat(80));
