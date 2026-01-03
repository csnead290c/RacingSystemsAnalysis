/**
 * Engine Performance Calculation with VB6 Single Precision Simulation
 * 
 * This version simulates VB6's Single precision (32-bit float) by rounding
 * intermediate values to 7 significant digits, matching VB6's behavior.
 */

import { CONSTANTS, CAM_FACTORS, calcGulp } from './engineConstants';
import type { EngineInputs, EnginePerformance } from './engineTypes';

// Simulate VB6 Single precision (7 significant digits)
function toSingle(value: number): number {
  if (value === 0) return 0;
  const sign = value < 0 ? -1 : 1;
  const abs = Math.abs(value);
  const exp = Math.floor(Math.log10(abs));
  const mantissa = abs / Math.pow(10, exp);
  const rounded = Math.round(mantissa * 1e6) / 1e6; // 7 significant digits
  return sign * rounded * Math.pow(10, exp);
}

function calcEffCR(VE: number, RamVE: number): number {
  const EffCR = toSingle(toSingle(VE) * toSingle(RamVE));
  return Math.max(0.5, Math.min(1, EffCR));
}

function calcEFF(EffCR: number, CR: number, GAM: number, crx: number): number {
  const term1 = toSingle(toSingle(EffCR) * toSingle(CR - 1) + 1);
  const term2 = toSingle(Math.pow(term1, toSingle(GAM - 1)) - 1);
  const term3 = toSingle(Math.pow(toSingle(crx - 1), toSingle(GAM - 1)) - 1);
  const EFF = toSingle(term2 / term3);
  return Math.max(0.5, Math.min(1.05, EFF));
}

function fpsToRPM(fps: number, flrqs: number, stroke: number): number {
  return toSingle(toSingle(fps * 60) / toSingle(CONSTANTS.PI * toSingle(flrqs) * toSingle(stroke) / 12));
}

function friction(rpm: number, CID: number, bore: number, stroke: number, CR: number, inline: number, camType: number, noInValves: number): number {
  const fcid = toSingle(0.011 + toSingle(0.000006 * rpm));
  let ptq = toSingle(toSingle(fcid * CID) * toSingle(1 + toSingle(stroke / bore)));
  if (CR > 10) ptq = toSingle(ptq * toSingle(1 + toSingle(0.002 * toSingle(CR - 10))));
  if (inline === 1) ptq = toSingle(ptq * 0.98);
  if (camType === 0) ptq = toSingle(ptq * 0.97);
  if (noInValves > 1) ptq = toSingle(ptq * 0.99);
  return ptq;
}

function headLoss(fps: number): number {
  const term1 = toSingle(CONSTANTS.RHOair * toSingle(fps ** 2));
  const term2 = toSingle(term1 / toSingle(2 * toSingle(CONSTANTS.GC * 144)));
  const term3 = toSingle(term2 / CONSTANTS.PSIA);
  return toSingle(1 - toSingle(2 * term3));
}

function flowBenchCorr(deltaP: number): number {
  const yFactor = toSingle(1.044429 * toSingle(1 - toSingle(0.618 * toSingle(deltaP / CONSTANTS.PSTD))));
  return toSingle(Math.sqrt(toSingle(28 / deltaP)) * yFactor);
}

function roundTo(value: number, increment: number): number {
  return Math.round(value / increment) * increment;
}

export function calcEngPerfVB6Precision(inputs: EngineInputs): EnginePerformance {
  const {
    noCyl, inline, bore, stroke, rod, compressionRatio: CR,
    camType, inCamDur, carb, carbCFM, fuel, manifold, curved,
    manFlow, noInValves, valveDia, maxInFlow, deltaP, refBore
  } = inputs;

  const VSW = 0.915;
  const VSTM = 0.022;

  // Basic geometry with Single precision
  const BQS = toSingle(bore / stroke);
  const B2QS = toSingle(bore * BQS);
  const S3QB = toSingle(toSingle(stroke ** 2) / BQS);
  const LRQS = toSingle(rod / stroke);
  const flrqs = toSingle(1 + toSingle(Math.pow(toSingle(0.348 / LRQS), 1.99)));
  const crvf = toSingle(1 + toSingle(1 / toSingle(CR - 1)));
  const BArea = toSingle(toSingle(CONSTANTS.PI * toSingle(bore ** 2)) / 4);
  const CID = toSingle(toSingle(BArea * stroke) * noCyl);

  // Fuel properties
  const GAM = 1.28;
  const aqf = 14.7;
  const fhv = 20700;
  const crx = 11.5;
  const hpcfmx = toSingle(toSingle(toSingle(0.07634 * toSingle(fhv / toSingle(550 * aqf))) * 778.16) / 60);
  const tqcidx = toSingle(toSingle(hpcfmx * 5252.113) / toSingle(2 * 1728));

  // Manifold effects
  const efik = 1;
  let epek = 1;
  if (manifold === 1) {
    epek = inline === 0 ? 0.9 : (inline === 1 ? 0.95 : 1);
  } else if (manifold === 2) {
    epek = inline === 0 ? 0.95 : (inline === 1 ? 0.98 : 1);
  }

  const crektq = curved ? 0.994 : 1;
  const crekhp = curved ? 0.904 : 1;

  const cvexhp = 0.8827;
  const cvextq = 0.8827;

  // Flow calculations with Single precision
  const ICFM = toSingle(toSingle(toSingle(maxInFlow * flowBenchCorr(deltaP)) * Math.pow(toSingle(bore / refBore), 0.5)));
  const athroat = toSingle(toSingle(toSingle(noInValves * toSingle(CONSTANTS.PI / 4)) * toSingle(valveDia ** 2)) * toSingle(toSingle(VSW ** 2) - VSTM));
  let cdi = toSingle(toSingle(ICFM / athroat) / 133);
  if (cdi > 1) cdi = 1;

  const ICFMnorm = toSingle(toSingle(ICFM * toSingle(manFlow / 100)) / BArea);
  let EqvPS = toSingle(toSingle(ICFMnorm * 144) / 60);
  EqvPS = toSingle(EqvPS / toSingle(319.2 / 4.2));

  // Iteration variables
  let ilc = 109, PHI = 1, icdtq = 0.995, icdrpm = 1;
  let metq = 0.818, mehp = 0.778;
  let lcetq = 0, PortVETQ = 0, CarbVETQ = 0;
  let lcehp = 0, PortVEHP = 0, CarbVEHP = 0;

  const NTQ = [0, 0, 0];
  const NHP = [0, 0, 0];

  const camk = CAM_FACTORS[camType];
  const gulp = calcGulp(manifold, noCyl);

  let tqfps = 0, hpfps = 0;
  let rpmPeakTQ = 0, rpmPeakHP = 0;

  // 5 iterations
  for (let itr = 1; itr <= 5; itr++) {
    // Peak Torque calculations
    const xqs = toSingle(0.5 * toSingle(1 + Math.cos(toSingle(CONSTANTS.PI * toSingle(toSingle(inCamDur + ilc) - 180) / 180))));

    let acrit: number;
    if (itr === 1) {
      acrit = toSingle(toSingle(toSingle(1.414 * toSingle(gulp * carbCFM)) / toSingle(toSingle(noCyl * BArea) * EqvPS)));
    } else {
      acrit = toSingle(toSingle(toSingle(1.414 * toSingle(gulp * carbCFM)) / toSingle(toSingle(noCyl * BArea) * tqfps)));
    }
    if (noInValves > 1) acrit = toSingle(acrit / toSingle(137 / 133));
    if (fuel === 3) acrit = toSingle(acrit / 1.06);

    const astar = toSingle(acrit / toSingle(BArea / athroat));
    let psitq: number;
    if (astar < 1) {
      psitq = toSingle(toSingle(Math.pow(cdi, 1.56)) * toSingle(Math.pow(astar, 0.44)));
    } else {
      psitq = toSingle(Math.pow(cdi, 1.56));
    }

    const RamVETQ = toSingle(toSingle(toSingle(crektq * camk[1]) * toSingle(Math.pow(psitq, camk[2]))));
    const VETQ = toSingle(toSingle(camk[3] * toSingle(Math.pow(EqvPS, 0.18))) * epek);
    const EffCRTQ = calcEffCR(VETQ, RamVETQ);
    const EFFTQ = calcEFF(EffCRTQ, CR, GAM, crx);

    tqfps = toSingle(Math.pow(toSingle(toSingle(toSingle(toSingle(tqcidx * EFFTQ) * toSingle(efik * cvextq)) * xqs) / crvf), toSingle(1 / 1.52)));
    rpmPeakTQ = fpsToRPM(tqfps, flrqs, stroke);

    const gtqcid = toSingle(toSingle(toSingle(toSingle(toSingle(tqcidx * EFFTQ) * toSingle(efik * cvextq)) * xqs) / crvf) * toSingle(Math.pow(tqfps, 0.52)));
    const ftqTQ = friction(rpmPeakTQ, CID, bore, stroke, CR, inline, camType, noInValves);
    NTQ[1] = toSingle(toSingle(gtqcid - toSingle(ftqTQ / CID)) * CID);

    metq = toSingle(toSingle(0.5 * metq) + toSingle(0.5 * toSingle(1 - toSingle(ftqTQ / toSingle(gtqcid * CID)))));

    const ntqcid = toSingle(gtqcid * metq);
    NTQ[2] = toSingle(ntqcid * CID);

    const tqcfm = toSingle(toSingle(toSingle(toSingle(noCyl * BArea) * tqfps) * 60) / 1728);
    CarbVETQ = toSingle(toSingle(0.5 * CarbVETQ) + toSingle(0.5 * toSingle(tqcfm / carbCFM)));
    PortVETQ = toSingle(toSingle(0.5 * PortVETQ) + toSingle(0.5 * toSingle(toSingle(headLoss(tqfps) * CarbVETQ) * icdtq)));
    lcetq = toSingle(toSingle(0.5 * lcetq) + toSingle(0.5 * toSingle(PortVETQ / RamVETQ)));

    // Peak Horsepower calculations
    if (itr === 1) {
      acrit = toSingle(toSingle(toSingle(1.414 * toSingle(gulp * carbCFM)) / toSingle(toSingle(noCyl * BArea) * EqvPS)));
    } else {
      acrit = toSingle(toSingle(toSingle(1.414 * toSingle(gulp * carbCFM)) / toSingle(toSingle(noCyl * BArea) * hpfps)));
    }
    if (noInValves > 1) acrit = toSingle(acrit / toSingle(137 / 133));
    if (fuel === 3) acrit = toSingle(acrit / 1.06);

    const astarHP = toSingle(acrit / toSingle(BArea / athroat));
    let psihp: number;
    if (astarHP < 1) {
      psihp = toSingle(toSingle(Math.pow(cdi, 1.52)) * toSingle(Math.pow(astarHP, 0.48)));
    } else {
      psihp = toSingle(Math.pow(cdi, 1.52));
    }

    const RamVEHP = toSingle(toSingle(toSingle(crekhp * camk[4]) * toSingle(Math.pow(psihp, camk[5]))));
    const VEHP = toSingle(toSingle(camk[6] * toSingle(Math.pow(EqvPS, 0.177))) * epek);
    const EffCRHP = calcEffCR(VEHP, RamVEHP);
    const EFFHP = calcEFF(EffCRHP, CR, GAM, crx);

    hpfps = toSingle(Math.pow(toSingle(toSingle(toSingle(toSingle(hpcfmx * EFFHP) * toSingle(efik * cvexhp)) * xqs) / crvf), toSingle(1 / 1.52)));
    rpmPeakHP = fpsToRPM(hpfps, flrqs, stroke);

    const gtqhp = toSingle(toSingle(toSingle(toSingle(toSingle(hpcfmx * EFFHP) * toSingle(efik * cvexhp)) * xqs) / crvf) * toSingle(Math.pow(hpfps, 0.52)) * CONSTANTS.Z6);
    const ftqHP = friction(rpmPeakHP, CID, bore, stroke, CR, inline, camType, noInValves);
    NHP[1] = toSingle(toSingle(toSingle(gtqhp - toSingle(ftqHP / CID)) * CID) * toSingle(rpmPeakHP / CONSTANTS.Z6));

    mehp = toSingle(toSingle(0.5 * mehp) + toSingle(0.5 * toSingle(1 - toSingle(ftqHP / toSingle(gtqhp * CID)))));

    const ntqhp = toSingle(gtqhp * mehp);
    NHP[2] = toSingle(toSingle(ntqhp * CID) * toSingle(rpmPeakHP / CONSTANTS.Z6));

    const hpcfm = toSingle(toSingle(toSingle(toSingle(noCyl * BArea) * hpfps) * 60) / 1728);
    CarbVEHP = toSingle(toSingle(0.5 * CarbVEHP) + toSingle(0.5 * toSingle(hpcfm / carbCFM)));
    PortVEHP = toSingle(toSingle(0.5 * PortVEHP) + toSingle(0.5 * toSingle(toSingle(headLoss(hpfps) * CarbVEHP) * icdrpm)));
    lcehp = toSingle(toSingle(0.5 * lcehp) + toSingle(0.5 * toSingle(PortVEHP / RamVEHP)));

    // Off-design camshaft modeling
    const optcam = toSingle(108 + toSingle(8.5 * Math.log(toSingle(rpmPeakHP / rpmPeakTQ))));
    PHI = toSingle(toSingle(inCamDur - 224) / toSingle(optcam - 108));
    icdrpm = toSingle(1 - toSingle(0.0078 * toSingle(Math.pow(toSingle(PHI - 1), 2))));
    icdtq = toSingle(1 - toSingle(0.006 * toSingle(Math.pow(toSingle(PHI - 1), 2))));

    const lsa = toSingle(84 + toSingle(0.5 * inCamDur) + toSingle(17 / toSingle(Math.pow(EffCRHP, 2.7))));
    ilc = toSingle(lsa - toSingle(0.5 * inCamDur));
    if (ilc < 95) ilc = 95;
    if (ilc > 118) ilc = 118;
  }

  // Calculate Summary Values
  let peakTQ = toSingle(toSingle(NTQ[1] + NTQ[2]) / 2);
  let peakHP = toSingle(toSingle(NHP[1] + NHP[2]) / 2);

  // Is Peak TQ value properly related to TQ @ Peak HP?
  const ntqhp = toSingle(toSingle(peakHP * CONSTANTS.Z6) / rpmPeakHP);
  const xrpm = toSingle(rpmPeakTQ / rpmPeakHP);
  const tqmin = toSingle(ntqhp * toSingle(1 + toSingle(0.31 * toSingle(toSingle(1 / xrpm) - 1))));
  if (peakTQ < tqmin) peakTQ = tqmin;

  // Calculate redline and shift RPM
  let redline = toSingle(toSingle(1.24 * CONSTANTS.KRPM) / toSingle(toSingle(flrqs * stroke) * Math.sqrt(BQS)));
  if (redline > toSingle(1.25 * rpmPeakHP)) {
    redline = toSingle(1.25 * rpmPeakHP);
  } else if (redline < rpmPeakHP) {
    redline = rpmPeakHP;
  }

  let shift = toSingle(1.08 * rpmPeakHP);
  if (shift > redline) shift = redline;

  // Round values
  rpmPeakTQ = roundTo(rpmPeakTQ, 50);
  rpmPeakHP = roundTo(rpmPeakHP, 50);
  shift = roundTo(shift, 50);
  redline = roundTo(redline, 50);

  return {
    peakHP,
    peakTQ,
    rpmPeakHP,
    rpmPeakTQ,
    hpPerCID: peakHP / CID,
    tqPerCID: peakTQ / CID,
    shift,
    redline,
    cid: CID,
  };
}
