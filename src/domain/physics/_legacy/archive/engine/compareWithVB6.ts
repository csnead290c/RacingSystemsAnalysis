/**
 * Comprehensive comparison of TypeScript vs VB6 calculations
 * This will help identify exactly where the discrepancy occurs
 */

import { CONSTANTS, FUEL_PROPERTIES, CAM_FACTORS, calcGulp, VSW, VSTM } from './engineConstants';
import type { EngineInputs } from './engineTypes';

const TEST_INPUTS: EngineInputs = {
  noCyl: 8,
  inline: 0,
  bore: 4.03,
  stroke: 3.48,
  rod: 5.85,
  compressionRatio: 12.9,
  camType: 4,
  inCamDur: 264,
  carb: true,
  carbCFM: 750,
  fuel: 1,
  manifold: 1,
  curved: true,
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

// VB6 Expected intermediate values (from manual VB6 run with debug output)
const VB6_EXPECTED = {
  CID: 355.1,
  crvf: 1.0840336,
  BQS: 1.1580460,
  B2QS: 4.6669254,
  S3QB: 10.4544,
  LRQS: 1.6810345,
  flrqs: 1.0381966,
  Gulp: 1.0,
  clk: 2.6702e-8,
  hpcfmx: 0.1945,
  tqcidx: 1.2667,
  efik: 1.0,
  crektq: 0.994,
  crekhp: 0.904,
  epek: 0.9,
  // Add more as we trace through VB6
};

console.log('='.repeat(80));
console.log('TYPESCRIPT vs VB6 COMPARISON');
console.log('='.repeat(80));

const { 
  noCyl, inline, bore, stroke, rod, compressionRatio, 
  camType, inCamDur,
  carb, carbCFM, fuel, manifold, curved, manFlow,
  noInValves, valveDia, maxInFlow, deltaP, refBore 
} = TEST_INPUTS;

// Calculate all intermediate values
const crvf = 1 + 1 / (compressionRatio - 1);
const BQS = bore / stroke;
const B2QS = bore * BQS;
const S3QB = Math.pow(stroke, 2) / BQS;
const LRQS = rod / stroke;
const AngMPS = 62 + Math.pow(750 * (LRQS - 0.958), 0.4027);
const flrqs = 1 + Math.pow(0.348 / LRQS, 1.99);
const CID = CONSTANTS.PI * Math.pow(bore / 2, 2) * stroke * noCyl;
const Gulp = calcGulp(manifold, noCyl);
const clk = (1.5 / 29.92) / Math.pow(carbCFM, 2);

const fuelProps = FUEL_PROPERTIES[fuel];
const { GAM, aqf, fhv, crx } = fuelProps;
const hpcfmx = CONSTANTS.RHOair * fhv / (550 * aqf) * 778.16 / 60;
const tqcidx = hpcfmx * CONSTANTS.Z6 / (2 * 1728);

let efik = 1;
if (!carb && manifold === 1 && inline === 0 && noCyl >= 5 && noCyl <= 8) {
  efik = 1.01;
}

let crektq = 1, crekhp = 1;
if (curved) {
  crektq = 0.994;
  crekhp = 0.904;
}

let epek = 1;
if (manifold === 1 && inline === 0) epek = 0.9;

// Flow calculations
const yFactor = 1.044429 * (1 - 0.618 * deltaP / CONSTANTS.PSTD);
const flowBenchCorr = Math.sqrt(28 / deltaP) * yFactor;
const BArea = CONSTANTS.PI * Math.pow(bore, 2) / 4;
const ICFM_raw = maxInFlow * flowBenchCorr * Math.pow(bore / refBore, 0.5);
const athroat = noInValves * (CONSTANTS.PI / 4) * Math.pow(valveDia, 2) * (Math.pow(VSW, 2) - VSTM);

let cdi: number;
if (noInValves === 1) {
  cdi = (ICFM_raw / athroat) / 133;
} else {
  cdi = (ICFM_raw / athroat) / 137;
}
if (cdi > 1) cdi = 1;

const ICFMnorm = ICFM_raw * (manFlow / 100) / BArea;
let EqvPS = ICFMnorm * 144 / 60;
EqvPS = EqvPS / (319.2 / 4.2);

console.log('\n--- INITIAL CALCULATIONS ---');
console.log(`CID:      TS=${CID.toFixed(4)}  VB6=${VB6_EXPECTED.CID}  ${Math.abs(CID - VB6_EXPECTED.CID) < 0.1 ? '✓' : '✗ DIFF=' + (CID - VB6_EXPECTED.CID).toFixed(4)}`);
console.log(`crvf:     TS=${crvf.toFixed(7)}  VB6=${VB6_EXPECTED.crvf}  ${Math.abs(crvf - VB6_EXPECTED.crvf) < 0.0001 ? '✓' : '✗ DIFF=' + (crvf - VB6_EXPECTED.crvf).toFixed(7)}`);
console.log(`BQS:      TS=${BQS.toFixed(7)}  VB6=${VB6_EXPECTED.BQS}  ${Math.abs(BQS - VB6_EXPECTED.BQS) < 0.0001 ? '✓' : '✗ DIFF=' + (BQS - VB6_EXPECTED.BQS).toFixed(7)}`);
console.log(`B2QS:     TS=${B2QS.toFixed(7)}  VB6=${VB6_EXPECTED.B2QS}  ${Math.abs(B2QS - VB6_EXPECTED.B2QS) < 0.0001 ? '✓' : '✗ DIFF=' + (B2QS - VB6_EXPECTED.B2QS).toFixed(7)}`);
console.log(`S3QB:     TS=${S3QB.toFixed(4)}  VB6=${VB6_EXPECTED.S3QB}  ${Math.abs(S3QB - VB6_EXPECTED.S3QB) < 0.01 ? '✓' : '✗ DIFF=' + (S3QB - VB6_EXPECTED.S3QB).toFixed(4)}`);
console.log(`LRQS:     TS=${LRQS.toFixed(7)}  VB6=${VB6_EXPECTED.LRQS}  ${Math.abs(LRQS - VB6_EXPECTED.LRQS) < 0.0001 ? '✓' : '✗ DIFF=' + (LRQS - VB6_EXPECTED.LRQS).toFixed(7)}`);
console.log(`flrqs:    TS=${flrqs.toFixed(7)}  VB6=${VB6_EXPECTED.flrqs}  ${Math.abs(flrqs - VB6_EXPECTED.flrqs) < 0.0001 ? '✓' : '✗ DIFF=' + (flrqs - VB6_EXPECTED.flrqs).toFixed(7)}`);
console.log(`Gulp:     TS=${Gulp.toFixed(1)}  VB6=${VB6_EXPECTED.Gulp}  ${Math.abs(Gulp - VB6_EXPECTED.Gulp) < 0.01 ? '✓' : '✗'}`);
console.log(`clk:      TS=${clk.toExponential(4)}  VB6=${VB6_EXPECTED.clk.toExponential(4)}  ${Math.abs(clk - VB6_EXPECTED.clk) / VB6_EXPECTED.clk < 0.01 ? '✓' : '✗'}`);
console.log(`hpcfmx:   TS=${hpcfmx.toFixed(4)}  VB6=${VB6_EXPECTED.hpcfmx}  ${Math.abs(hpcfmx - VB6_EXPECTED.hpcfmx) < 0.001 ? '✓' : '✗ DIFF=' + (hpcfmx - VB6_EXPECTED.hpcfmx).toFixed(4)}`);
console.log(`tqcidx:   TS=${tqcidx.toFixed(4)}  VB6=${VB6_EXPECTED.tqcidx}  ${Math.abs(tqcidx - VB6_EXPECTED.tqcidx) < 0.001 ? '✓' : '✗ DIFF=' + (tqcidx - VB6_EXPECTED.tqcidx).toFixed(4)}`);

console.log('\n--- EFFECT FACTORS ---');
console.log(`efik:     TS=${efik}  VB6=${VB6_EXPECTED.efik}  ${efik === VB6_EXPECTED.efik ? '✓' : '✗'}`);
console.log(`crektq:   TS=${crektq}  VB6=${VB6_EXPECTED.crektq}  ${crektq === VB6_EXPECTED.crektq ? '✓' : '✗'}`);
console.log(`crekhp:   TS=${crekhp}  VB6=${VB6_EXPECTED.crekhp}  ${crekhp === VB6_EXPECTED.crekhp ? '✓' : '✗'}`);
console.log(`epek:     TS=${epek}  VB6=${VB6_EXPECTED.epek}  ${epek === VB6_EXPECTED.epek ? '✓' : '✗'}`);

console.log('\n--- FLOW CALCULATIONS ---');
console.log(`yFactor:       ${yFactor.toFixed(6)}`);
console.log(`flowBenchCorr: ${flowBenchCorr.toFixed(6)}`);
console.log(`BArea:         ${BArea.toFixed(6)}`);
console.log(`ICFM_raw:      ${ICFM_raw.toFixed(6)}`);
console.log(`athroat:       ${athroat.toFixed(6)}`);
console.log(`cdi:           ${cdi.toFixed(6)}`);
console.log(`ICFMnorm:      ${ICFMnorm.toFixed(6)}`);
console.log(`EqvPS:         ${EqvPS.toFixed(6)}`);

console.log('\n--- CAM FACTORS (Type 4) ---');
const camk = CAM_FACTORS[camType];
for (let i = 0; i < 6; i++) {
  console.log(`camk[${i}]: ${camk[i]}`);
}

console.log('\n' + '='.repeat(80));
console.log('NEXT STEP: Add VB6 debug output to compare iteration values');
console.log('Run VB6 with Debug.Print statements to capture:');
console.log('  - xqs, ivc values');
console.log('  - acrit, astar, psitq, psihp values');
console.log('  - RamVETQ, RamVEHP values');
console.log('  - VETQ, VEHP, EffCR, EFF values');
console.log('  - tqfps, hpfps, rpmPeakTQ, rpmPeakHP values');
console.log('  - NTQ[1], NTQ[2], NHP[1], NHP[2] values per iteration');
console.log('='.repeat(80));
