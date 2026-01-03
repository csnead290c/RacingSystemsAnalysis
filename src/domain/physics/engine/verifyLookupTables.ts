/**
 * Verify that our lookup tables match VB6 exactly
 * Check if sy array indexing is correct
 */

// VB6 lookup tables from Cgraph.CLS Class_Initialize (lines 80-99)
const SX_VB6 = [
  0, // dummy for 1-based
  0.25, 0.5, 0.6, 0.65, 0.7, 0.75, 0.8, 0.85, 0.9,
  0.95, 1.0, 1.02, 1.05, 1.1, 1.15, 1.2, 1.25
];

const sz_VB6 = [
  0, // dummy
  0.7, 1.2, 1.7, 2.5, 3.4
];

// VB6 sy array - CRITICAL: Check indexing
// VB6 code shows: sy(1) = 0.53, sy(18) = 0.365, sy(35) = 0.24, etc.
// This means sy is indexed as: sy[i + (j-1)*17] where i=1-17 (SX index), j=1-5 (sz index)
const sy_VB6 = [
  0, // dummy for 1-based indexing
  // j=1 (sz=0.7): sy(1) through sy(17)
  0.53, 0.975, 1.098, 1.13, 1.152, 1.16, 1.153, 1.122, 1.086,
  1.045, 1.0, 0.978, 0.938, 0.865, 0.795, 0.72, 0.63,
  // j=2 (sz=1.2): sy(18) through sy(34)
  0.365, 0.87, 1.018, 1.066, 1.11, 1.129, 1.132, 1.11, 1.079,
  1.042, 1.0, 0.977, 0.935, 0.855, 0.762, 0.66, 0.54,
  // j=3 (sz=1.7): sy(35) through sy(51)
  0.24, 0.79, 0.96, 1.023, 1.08, 1.106, 1.117, 1.102, 1.074,
  1.04, 1.0, 0.976, 0.932, 0.845, 0.736, 0.612, 0.474,
  // j=4 (sz=2.5): sy(52) through sy(68)
  0.1, 0.7, 0.894, 0.972, 1.04, 1.08, 1.096, 1.09, 1.069,
  1.037, 1.0, 0.974, 0.928, 0.83, 0.698, 0.55, 0.39,
  // j=5 (sz=3.4): sy(69) through sy(85)
  0, 0.63, 0.84, 0.924, 1.0, 1.055, 1.079, 1.082, 1.064,
  1.035, 1.0, 0.973, 0.923, 0.815, 0.662, 0.49, 0.31
];

console.log('=== Verify Lookup Tables ===\n');

// Test DTABY indexing at HPCID = 1.298226 (our test case)
const HPCID = 1.298226;

// Find iz bracket for HPCID
let iz = 1;
for (let i = 1; i <= 5; i++) {
  if (HPCID >= sz_VB6[i]) iz = i;
}
if (iz >= 5) iz = 4;

console.log(`HPCID = ${HPCID}`);
console.log(`Falls between sz[${iz}]=${sz_VB6[iz]} and sz[${iz+1}]=${sz_VB6[iz+1]}`);
console.log(`iz = ${iz}`);

// Test at RPMR = 0.6 (which is SX[3])
const RPMR = 0.6;
let ix = 1;
for (let i = 1; i <= 17; i++) {
  if (RPMR >= SX_VB6[i]) ix = i;
}
if (ix >= 17) ix = 16;

console.log(`\nRPMR = ${RPMR}`);
console.log(`Falls between SX[${ix}]=${SX_VB6[ix]} and SX[${ix+1}]=${SX_VB6[ix+1]}`);
console.log(`ix = ${ix}`);

// Get four corner values for bilinear interpolation
// VB6 indexing: y[ix + (iz-1)*nx] where nx=17
const y11 = sy_VB6[ix + (iz - 1) * 17];
const y21 = sy_VB6[ix + 1 + (iz - 1) * 17];
const y12 = sy_VB6[ix + iz * 17];
const y22 = sy_VB6[ix + 1 + iz * 17];

console.log(`\nFour corner values:`);
console.log(`  y11 = sy[${ix + (iz - 1) * 17}] = ${y11}`);
console.log(`  y21 = sy[${ix + 1 + (iz - 1) * 17}] = ${y21}`);
console.log(`  y12 = sy[${ix + iz * 17}] = ${y12}`);
console.log(`  y22 = sy[${ix + 1 + iz * 17}] = ${y22}`);

// Bilinear interpolation
const x1 = SX_VB6[ix];
const x2 = SX_VB6[ix + 1];
const z1 = sz_VB6[iz];
const z2 = sz_VB6[iz + 1];

const fx = (RPMR - x1) / (x2 - x1);
const fz = (HPCID - z1) / (z2 - z1);

console.log(`\nInterpolation factors:`);
console.log(`  fx = (${RPMR} - ${x1}) / (${x2} - ${x1}) = ${fx}`);
console.log(`  fz = (${HPCID} - ${z1}) / (${z2} - ${z1}) = ${fz}`);

const y1 = y11 + fx * (y21 - y11);
const y2 = y12 + fx * (y22 - y12);
const TQR = y1 + fz * (y2 - y1);

console.log(`\nInterpolated value:`);
console.log(`  y1 = ${y11} + ${fx} * (${y21} - ${y11}) = ${y1}`);
console.log(`  y2 = ${y12} + ${fx} * (${y22} - ${y12}) = ${y2}`);
console.log(`  TQR = ${y1} + ${fz} * (${y2} - ${y1}) = ${TQR}`);

// Now check what VB6 expects
// From our debug output, at RPMR=0.6, we got TQR=1.0066
console.log(`\nExpected from VB6 debug: TQR = 1.0066`);
console.log(`Our calculation: TQR = ${TQR.toFixed(4)}`);
console.log(`Match: ${Math.abs(TQR - 1.0066) < 0.0001 ? '✓' : '✗'}`);

// Check sy array values at key indices
console.log(`\n=== Verify sy array values ===`);
console.log(`sy[1] (should be 0.53): ${sy_VB6[1]}`);
console.log(`sy[18] (should be 0.365): ${sy_VB6[18]}`);
console.log(`sy[35] (should be 0.24): ${sy_VB6[35]}`);
console.log(`sy[52] (should be 0.1): ${sy_VB6[52]}`);
console.log(`sy[69] (should be 0): ${sy_VB6[69]}`);
console.log(`sy[11] (should be 1.0): ${sy_VB6[11]}`);
console.log(`sy[28] (should be 1.0): ${sy_VB6[28]}`);
console.log(`sy[45] (should be 1.0): ${sy_VB6[45]}`);
console.log(`sy[62] (should be 1.0): ${sy_VB6[62]}`);
console.log(`sy[79] (should be 1.0): ${sy_VB6[79]}`);
