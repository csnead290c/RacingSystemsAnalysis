/**
 * Debug engine calculation to find exact discrepancy
 * Print all intermediate values to compare with VB6
 */

import { CONSTANTS, FUEL_PROPERTIES, CAM_FACTORS, calcGulp, VSW, VSTM } from './engineConstants';
import type { EngineInputs } from './engineTypes';

const testConfig: EngineInputs = {
  noCyl: 8,
  inline: 1, // Vee
  bore: 4.03,
  stroke: 3.48,
  rod: 5.85,
  compressionRatio: 12.0,
  camType: 1, // Roller
  inCamDur: 240,
  carb: true,
  carbCFM: 750,
  fuel: 1, // Gasoline
  manifold: 1, // Plenum
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

// Get fuel properties
const fuelProps = FUEL_PROPERTIES[fuel];
const { GAM, aqf, fhv, crx } = fuelProps;

// Calculate basic engine geometry
const BQS = bore / stroke;
const B2QS = bore * BQS;
const S3QB = Math.pow(stroke, 2) / BQS;
const LRQS = rod / stroke;
const flrqs = 1 + Math.pow(0.348 / LRQS, 1.99);

const BArea = CONSTANTS.PI * Math.pow(bore, 2) / 4;
const cylCID = BArea * stroke;
const CID = cylCID * noCyl;

const Gulp = calcGulp(manifold, noCyl);
const clk = (1.5 / 29.92) / Math.pow(carbCFM, 2);

const crvf = 1 + 1 / (compressionRatio - 1);

// Max HP per CFM and max TQ per CID @ 100% VE
const hpcfmx = CONSTANTS.RHOair * fhv / (550 * aqf) * 778.16 / 60;
const tqcidx = hpcfmx * CONSTANTS.Z6 / (2 * 1728);

console.log('=== INITIAL CALCULATIONS ===');
console.log(`CID: ${CID.toFixed(4)}`);
console.log(`BQS: ${BQS.toFixed(7)}`);
console.log(`B2QS: ${B2QS.toFixed(7)}`);
console.log(`S3QB: ${S3QB.toFixed(4)}`);
console.log(`LRQS: ${LRQS.toFixed(7)}`);
console.log(`flrqs: ${flrqs.toFixed(7)}`);
console.log(`crvf: ${crvf.toFixed(7)}`);
console.log(`Gulp: ${Gulp.toFixed(1)}`);
console.log(`clk: ${clk.toExponential(4)}`);
console.log(`hpcfmx: ${hpcfmx.toFixed(4)}`);
console.log(`tqcidx: ${tqcidx.toFixed(4)}`);

// Fuel Injection - Cylinder to Cylinder Effect
let efik = 1;
if (!carb) {
  if (manifold === 1) {  // Common plenum
    if (inline === 0) {
      if (noCyl >= 3 && noCyl <= 4) efik = 1.005;
      else if (noCyl >= 5 && noCyl <= 8) efik = 1.01;
      else if (noCyl >= 9 && noCyl <= 12) efik = 1.015;
    } else if (inline === 1) {
      if (noCyl === 4) efik = 1.005;
      else if (noCyl === 6 || noCyl === 8) efik = 1.01;
      else if (noCyl === 10 || noCyl === 12) efik = 1.015;
    } else if (inline === 2) {
      if (noCyl === 4) efik = 1.01;
      else if (noCyl === 6 || noCyl === 8) efik = 1.015;
      else if (noCyl === 10 || noCyl === 12) efik = 1.02;
    }
  } else if (manifold >= 3) {
    if (inline === 0) {
      if (noCyl >= 5 && noCyl <= 8) efik = 1.005;
      else if (noCyl >= 9 && noCyl <= 12) efik = 1.01;
    } else if (inline === 1 || inline === 2) {
      if (noCyl === 6 || noCyl === 8) efik = 1.005;
      else if (noCyl === 10 || noCyl === 12) efik = 1.01;
    }
  }
}

// Large Carb Effect on Intake Ramming
let cvexhp = 0.986;  // All carburetors
if (!carb) {  // Injectors
  if (manifold === 1) cvexhp = 0.987;
  else if (manifold === 2) cvexhp = 0.989;
  else if (manifold === 3) cvexhp = 0.988;
  else if (manifold === 4) cvexhp = 0.9877;
}
const cvextq = cvexhp + 0.004;

// Engine Plenum Manifold Effect on Intake Ramming
let epek = 1;
if (manifold === 1) {  // Common plenum
  if (inline === 0) epek = 0.9;
  else if (inline === 1) {
    if (noCyl <= 4) epek = 0.92;
  } else if (inline === 2) {
    epek = 0.98;
    if (noCyl <= 4) epek = 0.92;
  }
  if (noCyl <= 2) epek = 0.875;
} else if (manifold === 2) {
  epek = 0.85;
} else if (manifold === 3) {
  if (inline === 0) epek = 0.875;
  else if (inline === 1) {
    epek = 0.92;
    if (noCyl <= 8) epek = 0.9;
  } else if (inline === 2) {
    epek = 0.9;
    if (noCyl <= 4) epek = 0.875;
  }
  if (noCyl <= 2) epek = 0.85;
} else if (manifold === 4) {
  if (inline === 0) epek = 0.885;
  else if (inline === 1) {
    epek = 0.94;
    if (noCyl <= 8) epek = 0.92;
  } else if (inline === 2) {
    epek = 0.91;
    if (noCyl <= 4) epek = 0.885;
  }
  if (noCyl <= 2) epek = 0.86;
}
if (noCyl === 1) epek = 0.85;

// Curved Runner Effect on Intake Ramming
let crektq = 1, crekhp = 1;
if (curved) {
  crektq = 0.994;
  crekhp = 0.904;
}

console.log('\n=== EFFECT FACTORS ===');
console.log(`efik: ${efik}`);
console.log(`cvextq: ${cvextq}`);
console.log(`cvexhp: ${cvexhp}`);
console.log(`epek: ${epek}`);
console.log(`crektq: ${crektq}`);
console.log(`crekhp: ${crekhp}`);

// Intake Ramming - calculate cdi for psi function
const yFactor = 1.044429 * (1 - 0.618 * deltaP / CONSTANTS.PSTD);
const flowBenchCorr = Math.sqrt(28 / deltaP) * yFactor;
const ICFM = maxInFlow * flowBenchCorr * Math.pow(bore / refBore, 0.5);
const athroat = noInValves * (CONSTANTS.PI / 4) * Math.pow(valveDia, 2) * (Math.pow(VSW, 2) - VSTM);
let cdi: number;
if (noInValves === 1) {
  cdi = (ICFM / athroat) / 133;
} else {
  cdi = (ICFM / athroat) / 137;
}
if (cdi > 1) cdi = 1;

// Intake Pumping - derive CFM/Bore Area at 28" H2O from flowbench data
const ICFMnorm = ICFM * (manFlow / 100) / BArea;
let EqvPS = ICFMnorm * 144 / 60;
EqvPS = EqvPS / (319.2 / 4.2);

console.log('\n=== FLOW CALCULATIONS ===');
console.log(`yFactor: ${yFactor.toFixed(6)}`);
console.log(`flowBenchCorr: ${flowBenchCorr.toFixed(6)}`);
console.log(`ICFM: ${ICFM.toFixed(6)}`);
console.log(`athroat: ${athroat.toFixed(6)}`);
console.log(`cdi: ${cdi.toFixed(6)}`);
console.log(`ICFMnorm: ${ICFMnorm.toFixed(6)}`);
console.log(`EqvPS: ${EqvPS.toFixed(6)}`);

// Initial values for iteration variables
let ilc = 109;
let PHI = 1;
let icdtq = 0.995;
let icdrpm = 1;
let metq = 0.818;
let mehp = 0.778;

let lcetq = 1;
let PortVETQ = 0.987;
let CarbVETQ = 1 - Math.pow(0.135 * CID * crvf / carbCFM, 1.25);
let zmin = 0.65;
if (CarbVETQ < zmin) CarbVETQ = zmin;

let lcehp = 1;
let PortVEHP = 0.98;
let CarbVEHP = 1 - Math.pow(0.17 * CID * crvf / carbCFM, 1.25);
if (CarbVEHP < zmin) CarbVEHP = zmin;

console.log('\n=== INITIAL ITERATION VALUES ===');
console.log(`ilc: ${ilc}`);
console.log(`PHI: ${PHI}`);
console.log(`icdtq: ${icdtq}`);
console.log(`icdrpm: ${icdrpm}`);
console.log(`metq: ${metq}`);
console.log(`mehp: ${mehp}`);
console.log(`lcetq: ${lcetq}`);
console.log(`PortVETQ: ${PortVETQ}`);
console.log(`CarbVETQ: ${CarbVETQ.toFixed(6)}`);
console.log(`lcehp: ${lcehp}`);
console.log(`PortVEHP: ${PortVEHP}`);
console.log(`CarbVEHP: ${CarbVEHP.toFixed(6)}`);

console.log('\n=== CAM FACTORS (Type 1 - Roller) ===');
const camk = CAM_FACTORS[camType];
for (let i = 1; i <= 6; i++) {
  console.log(`camk[${i}]: ${camk[i]}`);
}

console.log('\n\n=== READY TO DEBUG ITERATION LOOP ===');
console.log('Next step: Add iteration loop debug output to compare with VB6');
console.log('Need VB6 debug output showing:');
console.log('  - xqs, ivc values per iteration');
console.log('  - acrit, astar, psitq, psihp per iteration');
console.log('  - RamVETQ, RamVEHP per iteration');
console.log('  - VETQ, VEHP, EffCR, EFF per iteration');
console.log('  - tqfps, hpfps, rpmPeakTQ, rpmPeakHP per iteration');
console.log('  - NTQ[1], NTQ[2], NHP[1], NHP[2] per iteration');
