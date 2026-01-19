/**
 * Compare generated HP curves for QuarterJr test cases
 */

import { buildEngineCurve, convertToZeroIndexed } from '../vb6/engineCurve';

// Test cases with known VB6 outputs
const testCases = [
  {
    name: 'Motorcycle (80 HP)',
    peakHP: 80,
    peakRPM: 7200,
    displacement_cid: 60,
    fuelSystem: 1,
  },
  {
    name: 'Pro Stock (1300 HP)',
    peakHP: 1300,
    peakRPM: 8900,
    displacement_cid: 500,
    fuelSystem: 1,
  },
  {
    name: 'Experimental (850 HP)',
    peakHP: 850,
    peakRPM: 7200,
    displacement_cid: 460,
    fuelSystem: 1,
  },
];

console.log('='.repeat(80));
console.log('QUARTERJR HP CURVE GENERATION COMPARISON');
console.log('='.repeat(80));

testCases.forEach(test => {
  console.log(`\n${test.name}:`);
  console.log(`  Peak HP: ${test.peakHP} @ ${test.peakRPM} RPM`);
  console.log(`  Displacement: ${test.displacement_cid} CID`);
  
  const curve = buildEngineCurve(test);
  const { rpm, hp } = convertToZeroIndexed(curve);
  
  // Calculate HP/CID ratio
  const hpCidRatio = test.peakHP / test.displacement_cid;
  console.log(`  HP/CID: ${hpCidRatio.toFixed(3)}`);
  
  // Show a few key points
  console.log(`\n  Generated Curve (sample points):`);
  console.log(`    RPM    | HP`);
  console.log(`    -------|-------`);
  
  // Show points at 0.5, 0.7, 1.0, 1.1 of peak RPM
  const indices = [1, 4, 10, 12]; // 0.5, 0.7, 1.0, 1.1
  indices.forEach(i => {
    if (i < rpm.length) {
      const rpmRatio = (rpm[i] / test.peakRPM).toFixed(2);
      console.log(`    ${rpm[i].toString().padStart(6)} | ${hp[i].toFixed(1).padStart(6)} (${rpmRatio}x peak)`);
    }
  });
  
  // Check if peak HP is at the right point
  const maxHP = Math.max(...hp);
  const maxIdx = hp.indexOf(maxHP);
  const peakRPMGenerated = rpm[maxIdx];
  
  console.log(`\n  Peak HP in curve: ${maxHP.toFixed(1)} @ ${peakRPMGenerated} RPM`);
  if (Math.abs(maxHP - test.peakHP) > 0.1) {
    console.log(`  ⚠️  Peak HP mismatch: expected ${test.peakHP}, got ${maxHP.toFixed(1)}`);
  }
  if (Math.abs(peakRPMGenerated - test.peakRPM) > 1) {
    console.log(`  ⚠️  Peak RPM mismatch: expected ${test.peakRPM}, got ${peakRPMGenerated}`);
  }
});

console.log('\n' + '='.repeat(80));
console.log('ANALYSIS');
console.log('='.repeat(80));
console.log('The HP curve generation uses VB6\'s ENGINE subroutine logic:');
console.log('1. Calculate TQPHP = Z6 * peakHP / peakRPM');
console.log('2. Calculate HP/CID ratio');
console.log('3. Use DTABY 2D interpolation to get torque ratios');
console.log('4. Generate 16-point curve from 0.25x to 1.25x peak RPM');
console.log('\nIf curves look correct but results are still off, the issue is likely');
console.log('in how the curve is being used in the simulation, not generation.');
console.log('='.repeat(80));
