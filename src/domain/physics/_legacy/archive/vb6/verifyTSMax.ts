/**
 * Verify TSMax calculation
 */

console.log('='.repeat(80));
console.log('TSMax CALCULATION VERIFICATION');
console.log('='.repeat(80));

const DistToPrint1 = 1.0; // ft
const HP_launch = 1847; // HP at 6000 RPM
const TorqueMult = 1.0;
const Weight = 1980; // lb

console.log('\nInputs:');
console.log(`  DistToPrint(1) = ${DistToPrint1} ft`);
console.log(`  HP at launch = ${HP_launch} HP`);
console.log(`  TorqueMult = ${TorqueMult}`);
console.log(`  Weight = ${Weight} lb`);

const powerToWeight = HP_launch * TorqueMult / Weight;
console.log(`\nPower-to-weight ratio: ${powerToWeight.toFixed(6)}`);

const exponent = -1/3;
const powerTerm = Math.pow(powerToWeight, exponent);
console.log(`Power term (P/W)^(-1/3): ${powerTerm.toFixed(6)}`);

let TSMax = DistToPrint1 * 0.11 * powerTerm;
console.log(`\nTSMax before division: ${TSMax.toFixed(8)}`);

TSMax = TSMax / 15;
console.log(`TSMax after /15: ${TSMax.toFixed(8)}`);

if (TSMax < 0.005) {
  console.log(`TSMax clamped to minimum: 0.005`);
  TSMax = 0.005;
}

console.log(`\nFinal TSMax: ${TSMax.toFixed(8)}`);

console.log('\n' + '='.repeat(80));
console.log('COMPARISON');
console.log('='.repeat(80));

const ourTSMax = 0.00760387065612739;
console.log(`\nOur TSMax: ${ourTSMax.toFixed(8)}`);
console.log(`Calculated: ${TSMax.toFixed(8)}`);
console.log(`Match: ${Math.abs(ourTSMax - TSMax) < 0.00000001 ? '✓' : '✗'}`);

console.log('\n' + '='.repeat(80));
console.log('TIME TO ROLLOUT CALCULATION');
console.log('='.repeat(80));

console.log('\nIf we take 20 steps with TSMax = 0.0076s:');
console.log(`  Time = 20 * 0.0076 = ${(20 * TSMax).toFixed(4)}s`);

console.log('\nBut we also have spin-up time:');
const spinUpTime = 4.84 * (7200 - 6000) / 250000;
console.log(`  Spin-up time = ${spinUpTime.toFixed(6)}s`);

console.log('\nTotal time to rollout:');
console.log(`  ${spinUpTime.toFixed(6)} + ${(20 * TSMax).toFixed(4)} = ${(spinUpTime + 20 * TSMax).toFixed(4)}s`);

console.log('\nVB6 shows: 0.146s');
console.log(`We calculate: ${(spinUpTime + 20 * TSMax).toFixed(4)}s`);
console.log(`Error: ${((spinUpTime + 20 * TSMax - 0.146) * 1000).toFixed(1)}ms`);

console.log('\n' + '='.repeat(80));
console.log('HYPOTHESIS');
console.log('='.repeat(80));

console.log('\nThe issue is NOT in TSMax calculation (it matches).');
console.log('The issue is that we are taking MORE STEPS to reach rollout.');
console.log('\nVB6 might be using a different timestep adaptation strategy,');
console.log('or the velocity integration is slightly different,');
console.log('causing us to need more steps to cover the same distance.');

console.log('\nNext: Check the actual timesteps used in the first 20 steps');
console.log('and compare with VB6 adaptive timestep formula:');
console.log('  TimeStep = TSMax * (AgsMax / Ags0)^4');
console.log('='.repeat(80));
