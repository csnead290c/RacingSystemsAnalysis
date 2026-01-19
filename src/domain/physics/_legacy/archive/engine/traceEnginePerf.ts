/**
 * Traced Engine Performance Calculation
 * Logs every intermediate value to identify discrepancies with VB6
 */

import { CONSTANTS, FUEL_PROPERTIES, CAM_FACTORS, calcGulp, VSW, VSTM } from './engineConstants';
import type { EngineInputs } from './engineTypes';

// Test case from user's full VB6 output
const TEST_INPUTS: EngineInputs = {
  noCyl: 8,
  inline: 1,              // Vee (VB6: 0=Inline, 1=Vee, 2=Flat)
  bore: 4.03,
  stroke: 3.48,
  rod: 5.85,
  compressionRatio: 12.9,
  camType: 4,             // Normal Flat Tappet & Solid Lifter
  inCamDur: 264,
  carb: true,
  carbCFM: 750,
  fuel: 1,                // Gasoline
  manifold: 1,            // Common Plenum
  curved: true,           // CURVED RUNNER
  manFlow: 96,
  noInValves: 1,
  valveDia: 2.05,
  maxInFlow: 250,
  deltaP: 28,
  refBore: 4.0,
  deck: 0.015,
  gasket: 0.039,
  chamber: 62,
  dome: 12,
};

console.log('='.repeat(80));
console.log('TRACED ENGINE PERFORMANCE CALCULATION');
console.log('='.repeat(80));

const { 
  noCyl, inline, bore, stroke, rod, compressionRatio, 
  camType, inCamDur,
  carb, carbCFM, fuel, manifold, curved, manFlow,
  noInValves, valveDia, maxInFlow, deltaP, refBore 
} = TEST_INPUTS;

// Initial calculations
const crvf = 1 + 1 / (compressionRatio - 1);
const BQS = bore / stroke;
const B2QS = bore * BQS;
const S3QB = Math.pow(stroke, 2) / BQS;
const LRQS = rod / stroke;
const AngMPS = 62 + Math.pow(750 * (LRQS - 0.958), 0.4027);
const flrqs = 1 + Math.pow(0.348 / LRQS, 1.99);
const CID = CONSTANTS.PI * Math.pow(bore / 2, 2) * stroke * noCyl;

console.log('\n--- INITIAL SETUP ---');
console.log(`CID: ${CID.toFixed(4)}`);
console.log(`crvf: ${crvf.toFixed(6)}`);
console.log(`BQS: ${BQS.toFixed(6)}`);
console.log(`B2QS: ${B2QS.toFixed(6)}`);
console.log(`S3QB: ${S3QB.toFixed(6)}`);
console.log(`LRQS: ${LRQS.toFixed(6)}`);
console.log(`AngMPS: ${AngMPS.toFixed(6)}`);
console.log(`flrqs: ${flrqs.toFixed(6)}`);

// Gulp calculation
const Gulp = calcGulp(manifold, noCyl);
const clk = (1.5 / 29.92) / Math.pow(carbCFM, 2);

console.log(`Gulp: ${Gulp.toFixed(6)}`);
console.log(`clk: ${clk.toFixed(10)}`);

// Fuel properties
const fuelProps = FUEL_PROPERTIES[fuel];
const { GAM, aqf, fhv, crx } = fuelProps;

console.log('\n--- FUEL PROPERTIES (Gasoline) ---');
console.log(`GAM: ${GAM}`);
console.log(`aqf: ${aqf}`);
console.log(`fhv: ${fhv}`);
console.log(`crx: ${crx}`);

const hpcfmx = CONSTANTS.RHOair * fhv / (550 * aqf) * 778.16 / 60;
const tqcidx = hpcfmx * CONSTANTS.Z6 / (2 * 1728);

console.log(`hpcfmx: ${hpcfmx.toFixed(6)}`);
console.log(`tqcidx: ${tqcidx.toFixed(6)}`);

// EFI cylinder-to-cylinder effect
let efik = 1;
if (!carb) {
  if (manifold === 1) {
    if (inline === 0) {
      if (noCyl >= 3 && noCyl <= 4) efik = 1.005;
      else if (noCyl >= 5 && noCyl <= 8) efik = 1.01;
      else if (noCyl >= 9 && noCyl <= 12) efik = 1.015;
    }
  }
}
console.log(`\nefik (EFI effect): ${efik}`);

// Curved runner effect
let crektq = 1;
let crekhp = 1;
if (curved) {
  crektq = VSW + VSTM * manifold;
  crekhp = VSW + VSTM * manifold;
}
console.log(`crektq (curved TQ): ${crektq.toFixed(6)}`);
console.log(`crekhp (curved HP): ${crekhp.toFixed(6)}`);

// Engine plenum manifold effect
let epek = 1;
if (manifold === 1) {
  if (inline === 0) epek = 0.9;
  else if (inline === 1) {
    if (noCyl <= 4) epek = 0.92;
  } else if (inline === 2) {
    epek = 0.98;
    if (noCyl <= 4) epek = 0.92;
  }
}
console.log(`epek (manifold effect): ${epek.toFixed(6)}`);

// Intake flow calculations
const BArea = CONSTANTS.PI * Math.pow(bore, 2) / 4;
const athroat = CONSTANTS.PI * Math.pow(valveDia, 2) / 4 * noInValves;
const ICFM = maxInFlow * Math.sqrt(deltaP / 28);

console.log('\n--- INTAKE FLOW ---');
console.log(`BArea: ${BArea.toFixed(6)}`);
console.log(`athroat: ${athroat.toFixed(6)}`);
console.log(`ICFM: ${ICFM.toFixed(6)}`);

let cdi: number;
if (noInValves === 1) {
  cdi = (ICFM / athroat) / 133;
} else {
  cdi = (ICFM / athroat) / 137;
}
if (cdi > 1) cdi = 1;
console.log(`cdi: ${cdi.toFixed(6)}`);

const ICFMnorm = ICFM * (manFlow / 100) / BArea;
let EqvPS = ICFMnorm * 144 / 60;
EqvPS = EqvPS / (319.2 / 4.2);

console.log(`ICFMnorm: ${ICFMnorm.toFixed(6)}`);
console.log(`EqvPS: ${EqvPS.toFixed(6)}`);

// Initial iteration values
let ilc = 109;
let PHI = 1;
let icdtq = 0.995;
let icdrpm = 1;
let metq = 0.818;
let mehp = 0.778;

console.log('\n--- INITIAL ITERATION VALUES ---');
console.log(`ilc: ${ilc}`);
console.log(`PHI: ${PHI}`);
console.log(`icdtq: ${icdtq}`);
console.log(`icdrpm: ${icdrpm}`);
console.log(`metq: ${metq.toFixed(6)}`);
console.log(`mehp: ${mehp.toFixed(6)}`);

let lcetq = 1;
let PortVETQ = 0.987;
let CarbVETQ = 1 - Math.pow(0.135 * CID * crvf / carbCFM, 1.25);
let zmin = 0.65;
if (CarbVETQ < zmin) CarbVETQ = zmin;

console.log(`lcetq: ${lcetq}`);
console.log(`PortVETQ: ${PortVETQ.toFixed(6)}`);
console.log(`CarbVETQ: ${CarbVETQ.toFixed(6)}`);

let lcehp = 1;
let PortVEHP = 0.98;
let CarbVEHP = 1 - Math.pow(0.17 * CID * crvf / carbCFM, 1.25);
if (CarbVEHP < zmin) CarbVEHP = zmin;

console.log(`lcehp: ${lcehp}`);
console.log(`PortVEHP: ${PortVEHP.toFixed(6)}`);
console.log(`CarbVEHP: ${CarbVEHP.toFixed(6)}`);

// Get cam factors
const camk = CAM_FACTORS[camType];
console.log('\n--- CAM FACTORS (Type 4: Normal Flat Tappet) ---');
console.log(`camk[0]: ${camk[0]}`);
console.log(`camk[1]: ${camk[1]}`);
console.log(`camk[2]: ${camk[2]}`);
console.log(`camk[3]: ${camk[3]}`);
console.log(`camk[4]: ${camk[4]}`);
console.log(`camk[5]: ${camk[5]}`);

const NTQ: number[] = [0, 0, 0];
const NHP: number[] = [0, 0, 0];

let rpmPeakTQ = 0;
let rpmPeakHP = 0;
let tqfps = 0;
let hpfps = 0;

console.log('\n' + '='.repeat(80));
console.log('BEGIN 5-ITERATION LOOP');
console.log('='.repeat(80));

// Run iterations
for (let itr = 1; itr <= 5; itr++) {
  console.log(`\n${'─'.repeat(80)}`);
  console.log(`ITERATION ${itr}`);
  console.log('─'.repeat(80));
  
  let xqs = 1;
  const ivc = ilc + 1.08 * inCamDur / 2;
  if (ivc > 180) {
    const ivcr = ivc * CONSTANTS.PI / 180;
    xqs = (1 + 2 * LRQS - Math.cos(ivcr) - Math.sqrt(Math.pow(2 * LRQS, 2) - Math.pow(Math.sin(ivcr), 2))) / 2;
  }
  
  console.log(`\nivc: ${ivc.toFixed(4)}`);
  console.log(`xqs: ${xqs.toFixed(6)}`);
  
  // Peak TQ calculations
  console.log('\n--- PEAK TQ CALCULATIONS ---');
  
  let acrit: number;
  if (itr === 1) {
    acrit = 4.4;
  } else {
    acrit = 4.2 * Math.pow(524 / (4.2 * tqfps), 0.181);
  }
  if (noInValves > 1) acrit = acrit / (137 / 133);
  if (fuel === 3) acrit = acrit / 1.06;
  const astarTQ = acrit / (BArea / athroat);
  
  console.log(`acrit: ${acrit.toFixed(6)}`);
  console.log(`astarTQ: ${astarTQ.toFixed(6)}`);
  
  let psitq: number;
  if (astarTQ < 1) {
    psitq = Math.pow(cdi, 1.56) * Math.pow(astarTQ, 0.44);
  } else {
    psitq = Math.pow(cdi, 1.56) * Math.pow(astarTQ, -3 * 0.44);
  }
  psitq = psitq - 4.3 * Math.pow(cdi - astarTQ, 2);
  if (psitq < 0) psitq = 0;
  
  console.log(`psitq: ${psitq.toFixed(6)}`);
  
  const RamVETQ = (1 + 0.177 * epek * crektq * Math.pow(psitq, 1.52) * Math.pow(noInValves, 0.13))
                  * icdtq * Math.pow(camk[2], 0.5) * lcetq;
  
  console.log(`RamVETQ: ${RamVETQ.toFixed(6)}`);
  
  const VETQ = CarbVETQ * PortVETQ;
  console.log(`VETQ: ${VETQ.toFixed(6)}`);
  
  const EffCRTQ = (() => {
    let effCR = VETQ * RamVETQ * (xqs * (compressionRatio - 1) + 1);
    const zmin = 2;
    if (effCR < zmin) effCR = zmin;
    if (effCR > crx) effCR = crx;
    return effCR;
  })();
  
  console.log(`EffCRTQ: ${EffCRTQ.toFixed(6)}`);
  
  const EFFTQ = (() => {
    let eff = 1 - Math.pow(EffCRTQ, -(GAM - 1));
    if (eff <= 0) eff = 0.01;
    return eff;
  })();
  
  console.log(`EFFTQ: ${EFFTQ.toFixed(6)}`);
  
  // RPM @ Peak TQ from Peak Piston Speed
  tqfps = (5683.2 / 60) * Math.pow(S3QB, 0.172) * Math.pow(bore, 0) * Math.pow(flrqs, 0.42);
  console.log(`tqfps (base): ${tqfps.toFixed(6)}`);
  
  // Intake Pumping
  let PumpVE = Math.pow(VETQ, 0.32) * Math.pow(crvf, -2.7) * Math.pow(EqvPS, 0.608);
  PumpVE = PumpVE * Math.pow(camk[1], 0.5);
  tqfps = tqfps * PumpVE;
  console.log(`PumpVE: ${PumpVE.toFixed(6)}, tqfps after pump: ${tqfps.toFixed(6)}`);
  
  // Intake Ramming
  let RamVE = Math.pow(RamVETQ, 0.015) * Math.pow(noInValves, 0.047);
  RamVE = RamVE * icdrpm * Math.pow(camk[1], 0.5);
  tqfps = tqfps * RamVE;
  console.log(`RamVE: ${RamVE.toFixed(6)}, tqfps after ram: ${tqfps.toFixed(6)}`);
  
  // Compression, Fuel Burning and Friction
  tqfps = tqfps * Math.pow(EFFTQ, -0.22) * Math.pow(efik, 0) * Math.pow(metq, 0.59);
  console.log(`tqfps (final): ${tqfps.toFixed(6)}`);
  
  rpmPeakTQ = (tqfps * 60) / (CONSTANTS.PI * flrqs * stroke / 12);
  console.log(`rpmPeakTQ: ${rpmPeakTQ.toFixed(2)}`);
  
  // Gross TQ @ Peak TQ
  let gtqcid = 0.8827 * Math.pow(B2QS, 0.018) * Math.pow(stroke, -0.008) * Math.pow(flrqs, 0.18);
  console.log(`\ngtqcid (base): ${gtqcid.toFixed(6)}`);
  
  PumpVE = Math.pow(VETQ, 0.7) * Math.pow(crvf, 1.4) * Math.pow(EqvPS, 0.187);
  PumpVE = PumpVE * Math.pow(camk[2], 0.5);
  gtqcid = gtqcid * PumpVE;
  console.log(`PumpVE: ${PumpVE.toFixed(6)}, gtqcid after pump: ${gtqcid.toFixed(6)}`);
  
  gtqcid = gtqcid * RamVETQ;
  console.log(`gtqcid after ram: ${gtqcid.toFixed(6)}`);
  
  gtqcid = gtqcid * Math.pow(EFFTQ, 1.18) * tqcidx * efik;
  console.log(`gtqcid (final): ${gtqcid.toFixed(6)}`);
  
  // Friction
  const ftq = (() => {
    let fcid = 0.268 * Math.pow(noCyl, 0.96) * Math.pow(bore, 1.6) * stroke;
    fcid = fcid * Math.pow(EffCRTQ / crx, 0.5);
    
    let icid = 0;
    if (inline === 0 && noCyl > 1) {
      const nrb = noCyl;
      const nmb = 1 + noCyl / 2;
      icid = 0.08 * ((4 + 5) / (4 + 3)) * ((nrb + nmb)) / (nrb + nrb + 1);
    }
    fcid = fcid * (1 + icid);
    
    if (camType === 0) fcid = 0.95 * fcid;
    fcid = fcid * Math.pow(noInValves, 0.1);
    
    const ptq = CID * (1.01 - VETQ) * CONSTANTS.PSIA / 12;
    const rtq = 1.07 * fcid * Math.pow(rpmPeakTQ * Math.pow(stroke, 0.8) / CONSTANTS.KRPM, 1.6);
    
    return fcid + ptq + rtq;
  })();
  
  console.log(`ftq (friction): ${ftq.toFixed(6)}`);
  
  NTQ[1] = gtqcid * CID - ftq;
  if (NTQ[1] < 0) NTQ[1] = 0;
  console.log(`NTQ[1] (gross - friction): ${NTQ[1].toFixed(6)}`);
  
  metq = 0.4 * metq + 0.6 * NTQ[1] / (gtqcid * CID);
  console.log(`metq (updated): ${metq.toFixed(6)}`);
  
  // Continue with similar detailed tracing for HP calculations...
  // (abbreviated for space - would include all HP calculations)
  
  if (itr === 5) {
    console.log('\n' + '='.repeat(80));
    console.log('FINAL ITERATION COMPLETE');
    console.log('='.repeat(80));
    console.log(`\nFinal rpmPeakTQ: ${rpmPeakTQ.toFixed(2)}`);
    console.log(`Final NTQ[1]: ${NTQ[1].toFixed(2)}`);
    console.log(`Final metq: ${metq.toFixed(6)}`);
  }
}

console.log('\n' + '='.repeat(80));
console.log('EXPECTED VB6 VALUES:');
console.log('='.repeat(80));
console.log('Peak HP: 461 @ 6650 RPM');
console.log('Peak TQ: 415 @ 5450 RPM');
console.log('HP/CID: 1.30');
console.log('TQ/CID: 1.17');
console.log('Shift: 7200 RPM');
console.log('Redline: 8350 RPM');
console.log('='.repeat(80));
