// Quick test of engine calculations
// Run with: node test-engine.js

// Inline the constants and functions we need
const PI = 3.141593;
const PSIA = 14.696;
const Z6 = (60 / (2 * PI)) * 550;
const KRPM = (144 / PI) * 60 * 12;

// Test with Engine Pro BASECASE values
const inputs = {
  noCyl: 8,
  inline: 0, // V-engine
  bore: 4.03,
  stroke: 3.48,
  rod: 5.85,
  compressionRatio: 12.9,
  camType: 4, // Normal Flat Tappet
  inCamDur: 264,
  carb: true,
  carbCFM: 750,
  fuel: 1, // Gasoline
  manifold: 1, // Plenum
  curved: true,
  manFlow: 96,
  noInValves: 1,
  valveDia: 2.05,
  maxInFlow: 250,
  deltaP: 28,
  refBore: 4.0,
  chamber: 62,
  deck: 0.015,
  gasket: 0.039,
  dome: 12.0,
};

// Calculate CID
const cid = (PI * Math.pow(inputs.bore / 2, 2) * inputs.stroke * inputs.noCyl);

console.log('\n=== Engine Pro BASECASE Test ===');
console.log('Input Configuration:');
console.log(`  Cylinders: ${inputs.noCyl} (${inputs.inline === 0 ? 'V' : inputs.inline === 1 ? 'Inline' : 'Flat'})`);
console.log(`  Bore: ${inputs.bore}" × Stroke: ${inputs.stroke}"`);
console.log(`  Rod Length: ${inputs.rod}"`);
console.log(`  Compression Ratio: ${inputs.compressionRatio}:1`);
console.log(`  Cam Duration: ${inputs.inCamDur}°`);
console.log(`  Carburetor: ${inputs.carbCFM} CFM`);
console.log(`  Fuel: Gasoline`);
console.log(`  Manifold: Common Plenum, Curved Runners`);
console.log(`  Intake Valve: ${inputs.valveDia}" dia, ${inputs.maxInFlow} CFM @ ${inputs.deltaP}" H2O`);

console.log('\nCalculated Values:');
console.log(`  CID: ${cid.toFixed(1)}`);
console.log(`  Bore/Stroke Ratio: ${(inputs.bore / inputs.stroke).toFixed(3)}`);
console.log(`  Rod/Stroke Ratio: ${(inputs.rod / inputs.stroke).toFixed(3)}`);

console.log('\nExpected VB6 Output:');
console.log('  Peak HP: 461 @ 6650 RPM');
console.log('  Peak TQ: 415 lb-ft @ 5450 RPM');
console.log('  HP/CID: 1.30');
console.log('  TQ/CID: 1.17');
console.log('  Shift: 7200 RPM');
console.log('  Redline: 8350 RPM');

console.log('\nTo verify TypeScript implementation:');
console.log('  1. Import calcEngPerf from enginePerf.ts');
console.log('  2. Pass ENGINE_PRO_BASECASE inputs');
console.log('  3. Compare output to values above');
console.log('  4. Must match exactly for 100% VB6 parity\n');
