/**
 * Trace through ONE iteration of calcEngPerf to find exact discrepancy
 */

import { CONSTANTS, FUEL_PROPERTIES, CAM_FACTORS, calcGulp, VSW, VSTM } from './engineConstants';
import type { EngineInputs } from './engineTypes';

// Helper functions
function calcEffCR(vef: number, compressionRatio: number, xqs: number, crx: number): number {
  let effCR = vef * (xqs * (compressionRatio - 1) + 1);
  const zmin = 2;
  if (effCR < zmin) effCR = zmin;
  if (effCR > crx) effCR = crx;
  return effCR;
}

function calcEFF(effCR: number, GAM: number): number {
  let eff = 1 - Math.pow(effCR, -(GAM - 1));
  if (eff <= 0) eff = 0.01;
  return eff;
}

function fpsToRPM(fps: number, flrqs: number, stroke: number): number {
  return (fps * 60) / (CONSTANTS.PI * flrqs * stroke / 12);
}

function headLoss(fps: number): number {
  return 1 - 2 * (CONSTANTS.RHOair * Math.pow(fps, 2) / (2 * CONSTANTS.GC * 144)) / CONSTANTS.PSIA;
}

const testConfig: EngineInputs = {
  noCyl: 8,
  inline: 1,
  bore: 4.03,
  stroke: 3.48,
  rod: 5.85,
  compressionRatio: 12.0,
  camType: 1,
  inCamDur: 240,
  carb: true,
  carbCFM: 750,
  fuel: 1,
  manifold: 1,
  curved: false,
  manFlow: 96,
  noInValves: 1,
  valveDia: 2.08,
  maxInFlow: 260,
  deltaP: 28,
  refBore: 4.03,
};

const { 
  noCyl, inline, bore, stroke, rod, compressionRatio, 
  camType, inCamDur,
  carb, carbCFM, fuel, manifold, curved, manFlow,
  noInValves, valveDia, maxInFlow, deltaP, refBore 
} = testConfig;

const fuelProps = FUEL_PROPERTIES[fuel];
const { GAM, aqf, fhv, crx } = fuelProps;

const BQS = bore / stroke;
const B2QS = bore * BQS;
const S3QB = Math.pow(stroke, 2) / BQS;
const LRQS = rod / stroke;
const flrqs = 1 + Math.pow(0.348 / LRQS, 1.99);

const BArea = CONSTANTS.PI * Math.pow(bore, 2) / 4;
const CID = BArea * stroke * noCyl;

const Gulp = calcGulp(manifold, noCyl);
const clk = (1.5 / 29.92) / Math.pow(carbCFM, 2);
const crvf = 1 + 1 / (compressionRatio - 1);

const hpcfmx = CONSTANTS.RHOair * fhv / (550 * aqf) * 778.16 / 60;
const tqcidx = hpcfmx * CONSTANTS.Z6 / (2 * 1728);

let efik = 1;
let cvexhp = 0.986;
const cvextq = cvexhp + 0.004;
let epek = 1;
let crektq = 1, crekhp = 1;

const yFactor = 1.044429 * (1 - 0.618 * deltaP / CONSTANTS.PSTD);
const flowBenchCorr = Math.sqrt(28 / deltaP) * yFactor;
const ICFM = maxInFlow * flowBenchCorr * Math.pow(bore / refBore, 0.5);
const athroat = noInValves * (CONSTANTS.PI / 4) * Math.pow(valveDia, 2) * (Math.pow(VSW, 2) - VSTM);
let cdi = (ICFM / athroat) / 133;
if (cdi > 1) cdi = 1;

const ICFMnorm = ICFM * (manFlow / 100) / BArea;
let EqvPS = ICFMnorm * 144 / 60;
EqvPS = EqvPS / (319.2 / 4.2);

let ilc = 109;
let icdtq = 0.995;
let icdrpm = 1;
let metq = 0.818;
let mehp = 0.778;

let lcetq = 1;
let PortVETQ = 0.987;
let CarbVETQ = 1 - Math.pow(0.135 * CID * crvf / carbCFM, 1.25);
if (CarbVETQ < 0.65) CarbVETQ = 0.65;

let lcehp = 1;
let PortVEHP = 0.98;
let CarbVEHP = 1 - Math.pow(0.17 * CID * crvf / carbCFM, 1.25);
if (CarbVEHP < 0.65) CarbVEHP = 0.65;

const camk = CAM_FACTORS[camType];

console.log('=== ITERATION 1 ===\n');

// xqs calculation
let xqs = 1;
const ivc = ilc + 1.08 * inCamDur / 2;
console.log(`ivc = ${ilc} + 1.08 * ${inCamDur} / 2 = ${ivc}`);
if (ivc > 180) {
  const ivcr = ivc * CONSTANTS.PI / 180;
  xqs = (1 + 2 * LRQS - Math.cos(ivcr) - Math.sqrt(Math.pow(2 * LRQS, 2) - Math.pow(Math.sin(ivcr), 2))) / 2;
  console.log(`xqs = ${xqs.toFixed(6)} (ivc > 180)`);
} else {
  console.log(`xqs = ${xqs} (ivc <= 180)`);
}

// Peak TQ calculation
console.log('\n--- Peak TQ Calculation ---');
let acrit = 4.4; // First iteration
console.log(`acrit = 4.4 (first iteration)`);

const astarTQ = acrit / (BArea / athroat);
console.log(`astarTQ = ${acrit} / (${BArea.toFixed(6)} / ${athroat.toFixed(6)}) = ${astarTQ.toFixed(6)}`);

let psitq: number;
if (astarTQ < 1) {
  psitq = Math.pow(cdi, 1.56) * Math.pow(astarTQ, 0.44);
  console.log(`psitq = ${cdi.toFixed(6)}^1.56 * ${astarTQ.toFixed(6)}^0.44 = ${psitq.toFixed(6)} (astar < 1)`);
} else {
  psitq = Math.pow(cdi, 1.56) * Math.pow(astarTQ, -3 * 0.44);
  console.log(`psitq = ${cdi.toFixed(6)}^1.56 * ${astarTQ.toFixed(6)}^${-3*0.44} = ${psitq.toFixed(6)} (astar >= 1)`);
}
psitq = psitq - 4.3 * Math.pow(cdi - astarTQ, 2);
if (psitq < 0) psitq = 0;
console.log(`psitq after adjustment = ${psitq.toFixed(6)}`);

const RamVETQ = (1 + 0.177 * epek * crektq * Math.pow(psitq, 1.52) * Math.pow(noInValves, 0.13))
                * icdtq * Math.pow(camk[2], 0.5) * lcetq;
console.log(`RamVETQ = ${RamVETQ.toFixed(6)}`);

const VETQ = CarbVETQ * PortVETQ;
console.log(`VETQ = ${CarbVETQ.toFixed(6)} * ${PortVETQ} = ${VETQ.toFixed(6)}`);

const EffCRTQ = calcEffCR(VETQ * RamVETQ, compressionRatio, xqs, crx);
console.log(`EffCRTQ = calcEffCR(${(VETQ * RamVETQ).toFixed(6)}, ${compressionRatio}, ${xqs.toFixed(6)}, ${crx}) = ${EffCRTQ.toFixed(6)}`);

const EFFTQ = calcEFF(EffCRTQ, GAM);
console.log(`EFFTQ = calcEFF(${EffCRTQ.toFixed(6)}, ${GAM}) = ${EFFTQ.toFixed(6)}`);

// RPM @ Peak TQ
console.log('\n--- RPM @ Peak TQ ---');
let tqfps = (5683.2 / 60) * Math.pow(S3QB, 0.172) * Math.pow(bore, 0) * Math.pow(flrqs, 0.42);
console.log(`tqfps initial = ${tqfps.toFixed(6)}`);

let PumpVE = Math.pow(VETQ, 0.32) * Math.pow(crvf, -2.7) * Math.pow(EqvPS, 0.608);
PumpVE = PumpVE * Math.pow(camk[1], 0.5);
console.log(`PumpVE = ${PumpVE.toFixed(6)}`);
tqfps = tqfps * PumpVE;
console.log(`tqfps after PumpVE = ${tqfps.toFixed(6)}`);

let RamVE = Math.pow(RamVETQ, 0.015) * Math.pow(noInValves, 0.047);
RamVE = RamVE * icdrpm * Math.pow(camk[1], 0.5);
console.log(`RamVE = ${RamVE.toFixed(6)}`);
tqfps = tqfps * RamVE;
console.log(`tqfps after RamVE = ${tqfps.toFixed(6)}`);

tqfps = tqfps * Math.pow(EFFTQ, -0.22) * Math.pow(efik, 0) * Math.pow(metq, 0.59);
console.log(`tqfps final = ${tqfps.toFixed(6)}`);

const rpmPeakTQ = fpsToRPM(tqfps, flrqs, stroke);
console.log(`rpmPeakTQ = ${rpmPeakTQ.toFixed(2)} RPM`);

console.log('\n=== SUMMARY ===');
console.log(`After Iteration 1:`);
console.log(`  RPM @ Peak TQ: ${rpmPeakTQ.toFixed(0)} RPM`);
console.log(`  tqfps: ${tqfps.toFixed(6)}`);
console.log(`  EffCRTQ: ${EffCRTQ.toFixed(6)}`);
console.log(`  EFFTQ: ${EFFTQ.toFixed(6)}`);
console.log(`  RamVETQ: ${RamVETQ.toFixed(6)}`);
console.log(`  VETQ: ${VETQ.toFixed(6)}`);
