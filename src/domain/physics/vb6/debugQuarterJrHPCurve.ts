/**
 * Debug QuarterJr HP curve generation
 */

import { buildEngineCurve, convertToZeroIndexed } from '../vb6/engineCurve';

console.log('='.repeat(80));
console.log('QUARTERJR HP CURVE DEBUG');
console.log('='.repeat(80));

// QuarterJr Pro Stock parameters
const params = {
  peakHP: 1300,
  peakRPM: 8900,
  displacement_cid: 500,
  fuelSystem: 1, // Gasoline Carburetor
};

console.log('\nInput Parameters:');
console.log(`  Peak HP: ${params.peakHP}`);
console.log(`  Peak RPM: ${params.peakRPM}`);
console.log(`  Displacement: ${params.displacement_cid} CID`);
console.log(`  Fuel System: ${params.fuelSystem} (Gasoline Carburetor)`);

const curve = buildEngineCurve(params);
const { rpm, hp } = convertToZeroIndexed(curve);

console.log('\n' + '='.repeat(80));
console.log('GENERATED HP CURVE');
console.log('='.repeat(80));
console.log('\nRPM    | HP');
console.log('-------|-------');
for (let i = 0; i < rpm.length; i++) {
  console.log(`${rpm[i].toString().padStart(6)} | ${hp[i].toFixed(1).padStart(6)}`);
}

console.log('\n' + '='.repeat(80));
console.log('ANALYSIS');
console.log('='.repeat(80));
console.log(`Number of points: ${rpm.length}`);
console.log(`RPM range: ${rpm[0]} - ${rpm[rpm.length - 1]}`);
console.log(`HP range: ${Math.min(...hp).toFixed(1)} - ${Math.max(...hp).toFixed(1)}`);
console.log(`Peak HP in curve: ${Math.max(...hp).toFixed(1)} @ ${rpm[hp.indexOf(Math.max(...hp))]} RPM`);

// Check if curve is valid
const hasNegativeHP = hp.some(h => h < 0);
const hasNaN = hp.some(h => isNaN(h)) || rpm.some(r => isNaN(r));

if (hasNegativeHP) {
  console.log('\n❌ ERROR: Curve contains negative HP values!');
}
if (hasNaN) {
  console.log('\n❌ ERROR: Curve contains NaN values!');
}
if (!hasNegativeHP && !hasNaN) {
  console.log('\n✅ Curve appears valid');
}

console.log('='.repeat(80));
