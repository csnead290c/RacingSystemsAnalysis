/**
 * Debug VB6 curve generation algorithm step-by-step
 * Compare intermediate values with VB6 to find exact mismatch point
 */

import { CONSTANTS } from './engineConstants';

// VB6 lookup tables (1-based indexing)
const SX = [0, 0.25, 0.5, 0.6, 0.65, 0.7, 0.75, 0.8, 0.85, 0.9, 0.95, 1.0, 1.02, 1.05, 1.1, 1.15, 1.2, 1.25];
const sz = [0, 0.7, 1.2, 1.7, 2.5, 3.4];
const sy = [
  0, // dummy
  // sz=0.7
  0.53, 0.975, 1.098, 1.13, 1.152, 1.16, 1.153, 1.122, 1.086, 1.045, 1.0, 0.978, 0.938, 0.865, 0.795, 0.72, 0.63,
  // sz=1.2
  0.365, 0.87, 1.018, 1.066, 1.11, 1.129, 1.132, 1.11, 1.079, 1.042, 1.0, 0.977, 0.935, 0.855, 0.762, 0.66, 0.54,
  // sz=1.7
  0.24, 0.79, 0.96, 1.023, 1.08, 1.106, 1.117, 1.102, 1.074, 1.04, 1.0, 0.976, 0.932, 0.845, 0.736, 0.612, 0.474,
  // sz=2.5
  0.1, 0.7, 0.894, 0.972, 1.04, 1.08, 1.096, 1.09, 1.069, 1.037, 1.0, 0.974, 0.928, 0.83, 0.698, 0.55, 0.39,
  // sz=3.4
  0, 0.63, 0.84, 0.924, 1.0, 1.055, 1.079, 1.082, 1.064, 1.035, 1.0, 0.973, 0.923, 0.815, 0.662, 0.49, 0.31
];

// Test case: VB6 base case
const PeakHP = 461;
const RPMHP = 6650;
const PeakTQ = 415;
const RPMTQ = 5450;
const CID = 355.1;
const Z6 = CONSTANTS.Z6;

console.log('=== VB6 Curve Generation Debug ===\n');
console.log('Input Values:');
console.log(`  Peak HP: ${PeakHP} @ ${RPMHP} RPM`);
console.log(`  Peak TQ: ${PeakTQ} @ ${RPMTQ} RPM`);
console.log(`  CID: ${CID}`);
console.log(`  Z6: ${Z6}`);

// Step 1: Calculate TQPHP and HPCID (from ENGINE function)
const TQPHP = Z6 * PeakHP / RPMHP;
let HPCID = PeakHP / CID;

console.log(`\nStep 1: Initial calculations`);
console.log(`  TQPHP = Z6 * PeakHP / RPMHP = ${Z6} * ${PeakHP} / ${RPMHP} = ${TQPHP.toFixed(6)}`);
console.log(`  HPCID = PeakHP / CID = ${PeakHP} / ${CID} = ${HPCID.toFixed(6)}`);

// Clamp HPCID to sz range
if (HPCID < sz[1]) HPCID = sz[1];
if (HPCID > sz[5]) HPCID = sz[5];
console.log(`  HPCID (clamped) = ${HPCID.toFixed(6)}`);

// Step 2: Generate 29-point base curve using DTABY
console.log(`\nStep 2: Generate 29-point base curve`);
console.log('n   RPMR    RPM     TQR      TQ');

const NHP = 29;
const xxrpm: number[] = [0]; // 1-based
const yytq: number[] = [0];   // 1-based

function DTABY(x: number[], z: number[], y: number[], nx: number, nz: number, xval: number, zval: number): number {
  let ix = 1;
  for (let i = 1; i <= nx; i++) {
    if (xval >= x[i]) ix = i;
  }
  if (ix >= nx) ix = nx - 1;
  
  let iz = 1;
  for (let i = 1; i <= nz; i++) {
    if (zval >= z[i]) iz = i;
  }
  if (iz >= nz) iz = nz - 1;
  
  const x1 = x[ix];
  const x2 = x[ix + 1];
  const z1 = z[iz];
  const z2 = z[iz + 1];
  
  const fx = (xval - x1) / (x2 - x1);
  const fz = (zval - z1) / (z2 - z1);
  
  const y11 = y[ix + (iz - 1) * nx];
  const y21 = y[ix + 1 + (iz - 1) * nx];
  const y12 = y[ix + iz * nx];
  const y22 = y[ix + 1 + iz * nx];
  
  const y1 = y11 + fx * (y21 - y11);
  const y2 = y12 + fx * (y22 - y12);
  const yval = y1 + fz * (y2 - y1);
  
  return yval;
}

// Generate odd points (1, 3, 5, ..., 29)
for (let n = 1; n <= 29; n += 2) {
  const RPMR = SX[(n + 3) / 2];
  const RPM = RPMR * RPMHP;
  const TQR = DTABY(SX, sz, sy, 17, 5, RPMR, HPCID);
  const TQ = TQR * TQPHP;
  
  xxrpm[n] = RPM;
  yytq[n] = TQ;
  
  if (n <= 9 || n >= 25) { // Print first few and last few
    console.log(`${n.toString().padStart(2)}  ${RPMR.toFixed(3)}  ${RPM.toFixed(0).padStart(4)}  ${TQR.toFixed(4)}  ${TQ.toFixed(2)}`);
  } else if (n === 11) {
    console.log('...');
  }
}

// Generate even points (2, 4, 6, ..., 28)
for (let n = 2; n <= 28; n += 2) {
  const RPMR = (SX[(n + 2) / 2] + SX[(n + 4) / 2]) / 2;
  const RPM = RPMR * RPMHP;
  const TQR = DTABY(SX, sz, sy, 17, 5, RPMR, HPCID);
  const TQ = TQR * TQPHP;
  
  xxrpm[n] = RPM;
  yytq[n] = TQ;
}

// Step 3: Find peak TQ on the 29-point curve
let TQMax = 0;
let TQRPM = 0;
for (let k = 1; k <= NHP; k++) {
  if (yytq[k] > TQMax) {
    TQMax = yytq[k];
    TQRPM = xxrpm[k];
  }
}

console.log(`\nStep 3: Find peak on 29-point curve`);
console.log(`  TQMax = ${TQMax.toFixed(2)} @ ${TQRPM.toFixed(0)} RPM`);
console.log(`  Target: PeakTQ = ${PeakTQ} @ ${RPMTQ} RPM`);

// Step 4: Stretch/adjust the curve
const DRPM = RPMTQ - TQRPM;
const DTQ = PeakTQ / TQMax - 1;

console.log(`\nStep 4: Stretch curve to match target`);
console.log(`  DRPM = RPMTQ - TQRPM = ${RPMTQ} - ${TQRPM.toFixed(0)} = ${DRPM.toFixed(2)}`);
console.log(`  DTQ = PeakTQ / TQMax - 1 = ${PeakTQ} / ${TQMax.toFixed(2)} - 1 = ${DTQ.toFixed(6)}`);

console.log(`\nAdjusted curve (first 10 points):`);
console.log('k   RPM_old  RPM_new  TQ_old   TQ_new   HP_new');

for (let k = 1; k <= NHP; k++) {
  const rpm_old = xxrpm[k];
  const tq_old = yytq[k];
  
  // Adjust TQ
  let tq_new: number;
  if (xxrpm[k] <= TQRPM) {
    tq_new = yytq[k] + (PeakTQ - TQMax);
  } else if (xxrpm[k] > TQRPM && xxrpm[k] < RPMHP) {
    tq_new = yytq[k] * (1 + DTQ * Math.pow((RPMHP - xxrpm[k]) / (RPMHP - TQRPM), 2));
  } else {
    tq_new = yytq[k] * (1 + 0.8 * DTQ * Math.pow((RPMHP - xxrpm[k]) / (RPMHP - TQRPM), 2));
  }
  
  // Adjust RPM
  let rpm_new: number;
  if (xxrpm[k] <= TQRPM) {
    rpm_new = xxrpm[k] + DRPM;
  } else if (xxrpm[k] > TQRPM && xxrpm[k] < RPMHP) {
    rpm_new = xxrpm[k] + DRPM * (RPMHP - xxrpm[k]) / (RPMHP - TQRPM);
  } else {
    rpm_new = xxrpm[k] + 0.8 * DRPM * (RPMHP - xxrpm[k]) / (RPMHP - TQRPM);
  }
  
  xxrpm[k] = rpm_new;
  yytq[k] = tq_new;
  
  // Calculate HP
  let hp_new = tq_new * rpm_new / Z6;
  if (hp_new > PeakHP) {
    hp_new = PeakHP;
    yytq[k] = hp_new * Z6 / rpm_new;
  }
  
  if (k <= 10) {
    console.log(`${k.toString().padStart(2)}  ${rpm_old.toFixed(0).padStart(4)}     ${rpm_new.toFixed(0).padStart(4)}     ${tq_old.toFixed(1).padStart(5)}    ${yytq[k].toFixed(1).padStart(5)}    ${hp_new.toFixed(1).padStart(5)}`);
  }
}

console.log('\n=== This shows the 29-point base curve that gets interpolated ===');
console.log('The final dyno table is created by interpolating this curve at 125 RPM increments');
