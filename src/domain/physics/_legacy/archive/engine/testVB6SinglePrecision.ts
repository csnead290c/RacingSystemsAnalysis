/**
 * Test if Single precision (float32) vs Double precision (float64) causes the curve mismatch
 * VB6 uses Single (32-bit float) heavily, while TypeScript uses Number (64-bit float)
 */

// Simulate VB6 Single precision by converting to float32 and back
function toSingle(value: number): number {
  const buffer = new Float32Array(1);
  buffer[0] = value;
  return buffer[0];
}

// Test constants with Single precision
const PI_double = 3.141593;
const PI_single = toSingle(3.141593);

const Z6_double = (60 / (2 * PI_double)) * 550;
const Z6_single = toSingle(toSingle(60 / toSingle(2 * PI_single)) * 550);

console.log('=== Single vs Double Precision Test ===\n');
console.log('Constants:');
console.log(`  PI (double): ${PI_double}`);
console.log(`  PI (single): ${PI_single}`);
console.log(`  Difference: ${Math.abs(PI_double - PI_single)}`);
console.log();
console.log(`  Z6 (double): ${Z6_double}`);
console.log(`  Z6 (single): ${Z6_single}`);
console.log(`  Difference: ${Math.abs(Z6_double - Z6_single)}`);

// Test curve calculation at 4500 RPM
const PeakHP = 461;
const RPMHP = 6650;
const PeakTQ = 415;
const RPMTQ = 5450;

// Simulate the DTABY interpolation result for 4500 RPM
// From debug output: TQR at RPMR=0.677 (4500/6650) should give specific value
const RPMR = 4500 / RPMHP;
const TQPHP_double = Z6_double * PeakHP / RPMHP;
const TQPHP_single = toSingle(toSingle(Z6_single * PeakHP) / RPMHP);

console.log('\nTQPHP calculation:');
console.log(`  TQPHP (double): ${TQPHP_double}`);
console.log(`  TQPHP (single): ${TQPHP_single}`);
console.log(`  Difference: ${Math.abs(TQPHP_double - TQPHP_single)}`);

// Simulate curve adjustment at 4500 RPM
// After stretching, the 29-point curve is interpolated
// Let's say TABY returns TQ = 391 at 4500 RPM (from our output)
const TQ_interpolated = 391;
const HP_double = TQ_interpolated * 4500 / Z6_double;
const HP_single = toSingle(toSingle(TQ_interpolated * 4500) / Z6_single);

console.log('\nHP calculation at 4500 RPM:');
console.log(`  TQ interpolated: ${TQ_interpolated}`);
console.log(`  HP (double): ${HP_double}`);
console.log(`  HP (single): ${HP_single}`);
console.log(`  Difference: ${Math.abs(HP_double - HP_single)}`);
console.log(`  VB6 expected: 327`);
console.log(`  Error (double): ${HP_double - 327} (${((HP_double - 327) / 327 * 100).toFixed(2)}%)`);
console.log(`  Error (single): ${HP_single - 327} (${((HP_single - 327) / 327 * 100).toFixed(2)}%)`);

console.log('\n=== Analysis ===');
if (Math.abs(HP_single - 327) < Math.abs(HP_double - 327)) {
  console.log('✓ Single precision gets closer to VB6 value');
  console.log('  This suggests precision differences ARE contributing to the mismatch');
} else {
  console.log('✗ Single precision does NOT get closer to VB6 value');
  console.log('  The mismatch is likely due to algorithm differences, not precision');
}

// Test the full curve generation with Single precision
console.log('\n=== Testing DTABY interpolation precision ===');

// Simplified DTABY test at RPMR = 0.677 (4500 RPM / 6650 RPM)
// This should interpolate between SX points
const SX = [0, 0.25, 0.5, 0.6, 0.65, 0.7, 0.75, 0.8, 0.85, 0.9, 0.95, 1.0, 1.02, 1.05, 1.1, 1.15, 1.2, 1.25];
const RPMR_test = 4500 / 6650;

// Find bracket
let ix = 1;
for (let i = 1; i <= 17; i++) {
  if (RPMR_test >= SX[i]) ix = i;
}
if (ix >= 17) ix = 16;

const x1 = SX[ix];
const x2 = SX[ix + 1];
const fx_double = (RPMR_test - x1) / (x2 - x1);
const fx_single = toSingle(toSingle(RPMR_test - x1) / toSingle(x2 - x1));

console.log(`RPMR = ${RPMR_test.toFixed(6)} falls between SX[${ix}]=${x1} and SX[${ix+1}]=${x2}`);
console.log(`  Interpolation factor (double): ${fx_double}`);
console.log(`  Interpolation factor (single): ${fx_single}`);
console.log(`  Difference: ${Math.abs(fx_double - fx_single)}`);

console.log('\nConclusion:');
console.log('Single precision differences are TINY (< 0.001%)');
console.log('The 2.45% HP error at 4500 RPM cannot be explained by precision alone');
console.log('The root cause must be in the algorithm or lookup table interpolation');
