/**
 * Test XMin/XMax calculation to see if VB6 uses different RPM range
 */

import { CONSTANTS } from './engineConstants';

const PeakTQ = 415;
const RPMTQ = 5450;
const PeakHP = 461;
const RPMHP = 6650;
const Shift = 7200;
const Redline = 8350;

console.log('=== Test XMin/XMax Calculation ===\n');

// VB6 lines 211-215 from Cgraph.CLS
function RoundDown(value: number, increment: number): number {
  return Math.floor(value / increment) * increment;
}

function RoundUp(value: number, increment: number): number {
  return Math.ceil(value / increment) * increment;
}

// VB6 calculation
let XMin = RoundDown(0.9 * RPMTQ, 500);
if (XMin < 0) XMin = 0;

console.log(`XMin calculation:`);
console.log(`  0.9 * ${RPMTQ} = ${0.9 * RPMTQ}`);
console.log(`  RoundDown(${0.9 * RPMTQ}, 500) = ${XMin}`);

// VB6 lines 213-215
let XMax = RoundUp(Redline, 500);
console.log(`\nXMax calculation (initial):`);
console.log(`  RoundUp(${Redline}, 500) = ${XMax}`);

// Check condition 1
if (XMax > Shift + 500) {
  XMax = RoundUp(Shift, 500);
  console.log(`  Condition: XMax > Shift + 500 (${XMax} > ${Shift + 500})`);
  console.log(`  New XMax = RoundUp(${Shift}, 500) = ${XMax}`);
}

// Check condition 2
if (XMax < RPMHP + 1000) {
  XMax = RoundUp(RPMHP + 500, 500);
  console.log(`  Condition: XMax < RPMHP + 1000 (${XMax} < ${RPMHP + 1000})`);
  console.log(`  New XMax = RoundUp(${RPMHP + 500}, 500) = ${XMax}`);
}

console.log(`\nFinal range: ${XMin} to ${XMax} RPM`);

// Calculate number of points
const DRPM = 125;
let NX = Math.floor((XMax - XMin) / DRPM) + 1;
console.log(`\nNumber of points:`);
console.log(`  NX = floor((${XMax} - ${XMin}) / ${DRPM}) + 1 = ${NX}`);

if (NX > 33) {
  const oldXMin = XMin;
  XMin = XMin + (NX - 33) * DRPM;
  NX = 33;
  console.log(`  NX > 33, adjusting:`);
  console.log(`  New XMin = ${oldXMin} + (${NX} - 33) * ${DRPM} = ${XMin}`);
  console.log(`  New NX = 33`);
}

console.log(`\n=== RPM Points Generated ===`);
console.log('Point   RPM');
for (let k = 0; k < Math.min(NX, 15); k++) {
  const rpm = XMin + k * DRPM;
  console.log(`${(k + 1).toString().padStart(2)}      ${rpm}`);
}
if (NX > 15) {
  console.log('...');
  for (let k = NX - 3; k < NX; k++) {
    const rpm = XMin + k * DRPM;
    console.log(`${(k + 1).toString().padStart(2)}      ${rpm}`);
  }
}

// Check if 4500 is in the range
console.log(`\n=== Check 4500 RPM ===`);
if (4500 >= XMin && 4500 <= XMax) {
  const index = Math.floor((4500 - XMin) / DRPM);
  const actualRPM = XMin + index * DRPM;
  console.log(`4500 RPM is in range`);
  console.log(`  Index: ${index + 1}`);
  console.log(`  Actual RPM at that index: ${actualRPM}`);
  console.log(`  Match: ${actualRPM === 4500 ? '✓' : '✗'}`);
} else {
  console.log(`4500 RPM is NOT in range (${XMin} to ${XMax})`);
  console.log(`This could explain the mismatch!`);
}

// List all RPM points that would be displayed (every other point)
console.log(`\n=== Displayed RPM Points (every other point) ===`);
const displayedPoints: number[] = [];
for (let k = 0; k < NX; k += 2) {
  const rpm = XMin + k * DRPM;
  displayedPoints.push(rpm);
}
console.log(displayedPoints.join(', '));

console.log(`\n=== VB6 Expected Points ===`);
const vb6Points = [4500, 4750, 5000, 5250, 5500, 5750, 6000, 6250, 6500, 6750, 7000, 7250, 7500];
console.log(vb6Points.join(', '));

console.log(`\n=== Comparison ===`);
const match = displayedPoints.length === vb6Points.length && 
              displayedPoints.every((rpm, i) => rpm === vb6Points[i]);
console.log(`RPM points match: ${match ? '✓' : '✗'}`);

if (!match) {
  console.log(`\nDifferences:`);
  console.log(`  Our points: ${displayedPoints.length} points`);
  console.log(`  VB6 points: ${vb6Points.length} points`);
  if (displayedPoints[0] !== vb6Points[0]) {
    console.log(`  First point differs: ${displayedPoints[0]} vs ${vb6Points[0]}`);
  }
}
