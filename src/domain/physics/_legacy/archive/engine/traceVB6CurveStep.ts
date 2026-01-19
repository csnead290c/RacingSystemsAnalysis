/**
 * Trace VB6 curve generation step-by-step to find exact mismatch
 * Focus on the 29-point curve and interpolation to 4500 RPM
 */

import { CONSTANTS } from './engineConstants';

const SX = [0, 0.25, 0.5, 0.6, 0.65, 0.7, 0.75, 0.8, 0.85, 0.9, 0.95, 1.0, 1.02, 1.05, 1.1, 1.15, 1.2, 1.25];
const sz = [0, 0.7, 1.2, 1.7, 2.5, 3.4];
const sy = [
  0,
  0.53, 0.975, 1.098, 1.13, 1.152, 1.16, 1.153, 1.122, 1.086, 1.045, 1.0, 0.978, 0.938, 0.865, 0.795, 0.72, 0.63,
  0.365, 0.87, 1.018, 1.066, 1.11, 1.129, 1.132, 1.11, 1.079, 1.042, 1.0, 0.977, 0.935, 0.855, 0.762, 0.66, 0.54,
  0.24, 0.79, 0.96, 1.023, 1.08, 1.106, 1.117, 1.102, 1.074, 1.04, 1.0, 0.976, 0.932, 0.845, 0.736, 0.612, 0.474,
  0.1, 0.7, 0.894, 0.972, 1.04, 1.08, 1.096, 1.09, 1.069, 1.037, 1.0, 0.974, 0.928, 0.83, 0.698, 0.55, 0.39,
  0, 0.63, 0.84, 0.924, 1.0, 1.055, 1.079, 1.082, 1.064, 1.035, 1.0, 0.973, 0.923, 0.815, 0.662, 0.49, 0.31
];

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

function TABY(x: number[], y: number[], n: number, xval: number): number {
  let i = 1;
  for (let j = 1; j <= n; j++) {
    if (xval >= x[j]) i = j;
  }
  if (i >= n) i = n - 1;
  
  const x1 = x[i];
  const x2 = x[i + 1];
  const y1 = y[i];
  const y2 = y[i + 1];
  
  const f = (xval - x1) / (x2 - x1);
  const yval = y1 + f * (y2 - y1);
  
  return yval;
}

const PeakHP = 461;
const RPMHP = 6650;
const PeakTQ = 415;
const RPMTQ = 5450;
const CID = 355.1;
const Z6 = CONSTANTS.Z6;

console.log('=== Trace VB6 Curve to 4500 RPM ===\n');

// Step 1: Generate 29-point base curve
const TQPHP = Z6 * PeakHP / RPMHP;
let HPCID = PeakHP / CID;
if (HPCID < sz[1]) HPCID = sz[1];
if (HPCID > sz[5]) HPCID = sz[5];

const xxrpm: number[] = [0];
const yytq: number[] = [0];

for (let n = 1; n <= 29; n += 2) {
  const RPMR = SX[(n + 3) / 2];
  xxrpm[n] = RPMR * RPMHP;
  const TQR = DTABY(SX, sz, sy, 17, 5, RPMR, HPCID);
  yytq[n] = TQR * TQPHP;
}

for (let n = 2; n <= 28; n += 2) {
  const RPMR = (SX[(n + 2) / 2] + SX[(n + 4) / 2]) / 2;
  xxrpm[n] = RPMR * RPMHP;
  const TQR = DTABY(SX, sz, sy, 17, 5, RPMR, HPCID);
  yytq[n] = TQR * TQPHP;
}

// Step 2: Find peak and adjust
let TQMax = 0;
let TQRPM = 0;
for (let k = 1; k <= 29; k++) {
  if (yytq[k] > TQMax) {
    TQMax = yytq[k];
    TQRPM = xxrpm[k];
  }
}

const DRPM = RPMTQ - TQRPM;
const DTQ = PeakTQ / TQMax - 1;

console.log(`Adjustment factors:`);
console.log(`  DRPM = ${DRPM.toFixed(2)}, DTQ = ${DTQ.toFixed(6)}`);
console.log();

for (let k = 1; k <= 29; k++) {
  if (xxrpm[k] <= TQRPM) {
    yytq[k] = yytq[k] + (PeakTQ - TQMax);
  } else if (xxrpm[k] > TQRPM && xxrpm[k] < RPMHP) {
    yytq[k] = yytq[k] * (1 + DTQ * Math.pow((RPMHP - xxrpm[k]) / (RPMHP - TQRPM), 2));
  } else {
    yytq[k] = yytq[k] * (1 + 0.8 * DTQ * Math.pow((RPMHP - xxrpm[k]) / (RPMHP - TQRPM), 2));
  }
  
  if (xxrpm[k] <= TQRPM) {
    xxrpm[k] = xxrpm[k] + DRPM;
  } else if (xxrpm[k] > TQRPM && xxrpm[k] < RPMHP) {
    xxrpm[k] = xxrpm[k] + DRPM * (RPMHP - xxrpm[k]) / (RPMHP - TQRPM);
  } else {
    xxrpm[k] = xxrpm[k] + 0.8 * DRPM * (RPMHP - xxrpm[k]) / (RPMHP - TQRPM);
  }
  
  const hp = yytq[k] * xxrpm[k] / Z6;
  if (hp > PeakHP) {
    yytq[k] = PeakHP * Z6 / xxrpm[k];
  }
}

// Print adjusted 29-point curve
console.log('Adjusted 29-point curve:');
console.log('k    RPM     TQ      HP');
for (let k = 1; k <= 29; k++) {
  const hp = yytq[k] * xxrpm[k] / Z6;
  console.log(`${k.toString().padStart(2)}   ${xxrpm[k].toFixed(0).padStart(4)}    ${yytq[k].toFixed(1).padStart(5)}   ${hp.toFixed(1).padStart(5)}`);
}

// Step 3: Interpolate to 4500 RPM
console.log('\n=== Interpolate to 4500 RPM ===');
const targetRPM = 4500;
const tq_at_4500 = TABY(xxrpm, yytq, 29, targetRPM);
const hp_at_4500 = tq_at_4500 * targetRPM / Z6;

console.log(`Interpolated values at ${targetRPM} RPM:`);
console.log(`  TQ = ${tq_at_4500.toFixed(2)}`);
console.log(`  HP = ${hp_at_4500.toFixed(2)}`);
console.log(`\nVB6 expected:`);
console.log(`  TQ = 382`);
console.log(`  HP = 327`);
console.log(`\nError:`);
console.log(`  TQ error: ${(tq_at_4500 - 382).toFixed(2)} (${((tq_at_4500 - 382) / 382 * 100).toFixed(2)}%)`);
console.log(`  HP error: ${(hp_at_4500 - 327).toFixed(2)} (${((hp_at_4500 - 327) / 327 * 100).toFixed(2)}%)`);

// Find which two points 4500 falls between
let i = 1;
for (let j = 1; j <= 29; j++) {
  if (targetRPM >= xxrpm[j]) i = j;
}
if (i >= 29) i = 28;

console.log(`\n4500 RPM falls between:`);
console.log(`  Point ${i}: ${xxrpm[i].toFixed(0)} RPM, TQ=${yytq[i].toFixed(2)}, HP=${(yytq[i] * xxrpm[i] / Z6).toFixed(2)}`);
console.log(`  Point ${i+1}: ${xxrpm[i+1].toFixed(0)} RPM, TQ=${yytq[i+1].toFixed(2)}, HP=${(yytq[i+1] * xxrpm[i+1] / Z6).toFixed(2)}`);

const f = (targetRPM - xxrpm[i]) / (xxrpm[i+1] - xxrpm[i]);
console.log(`  Interpolation factor: ${f.toFixed(6)}`);
console.log(`  Interpolated TQ: ${yytq[i].toFixed(2)} + ${f.toFixed(6)} * (${yytq[i+1].toFixed(2)} - ${yytq[i].toFixed(2)}) = ${tq_at_4500.toFixed(2)}`);
