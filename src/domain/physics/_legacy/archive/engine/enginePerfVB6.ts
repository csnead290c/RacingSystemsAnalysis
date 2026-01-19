/**
 * Engine Performance Calculations with VB6 Single Precision Emulation
 * 
 * This is a complete rewrite of enginePerf.ts with VB6 Single precision (32-bit float)
 * emulation applied to EVERY arithmetic operation to achieve 100% parity with VB6.
 * 
 * VB6 Single: 32-bit float, ~7 decimal digits precision
 * JavaScript Number: 64-bit double, ~15 decimal digits precision
 */

import { CONSTANTS, FUEL_PROPERTIES, CAM_FACTORS, calcGulp, VSW, VSTM } from './engineConstants';
import type { EngineInputs, EngineOutputs, FuelProperties } from './engineTypes';

// VB6 Single precision emulation using Float32Array
function s(value: number): number {
  const f32 = new Float32Array(1);
  f32[0] = value;
  return f32[0];
}

// VB6 Single precision for all Math operations
const sPow = (base: number, exp: number): number => s(Math.pow(s(base), s(exp)));
const sSqrt = (value: number): number => s(Math.sqrt(s(value)));
const sCos = (value: number): number => s(Math.cos(s(value)));
const sSin = (value: number): number => s(Math.sin(s(value)));
const sLog = (value: number): number => s(Math.log(s(value)));

// Helper functions with Single precision
function calcEffCR(vef: number, compressionRatio: number, xqs: number, crx: number): number {
  let effCR = s(s(vef) * s(s(s(xqs) * s(s(compressionRatio) - 1)) + 1));
  const zmin = 2;
  if (effCR < zmin) effCR = zmin;
  if (effCR > crx) effCR = crx;
  return s(effCR);
}

function calcEFF(effCR: number, GAM: number): number {
  let eff = s(1 - sPow(s(effCR), s(-(s(GAM) - 1))));
  if (eff <= 0) eff = 0.01;
  return s(eff);
}

function fpsToRPM(fps: number, flrqs: number, stroke: number): number {
  return s(s(s(fps) * 60) / s(s(s(CONSTANTS.PI) * s(flrqs) * s(stroke)) / 12));
}

function headLoss(fps: number): number {
  const term1 = s(s(CONSTANTS.RHOair) * sPow(s(fps), 2));
  const term2 = s(s(term1) / s(s(2) * s(s(CONSTANTS.GC) * 144)));
  const term3 = s(s(term2) / s(CONSTANTS.PSIA));
  return s(1 - s(2 * s(term3)));
}

function friction(rpm: number, vef: number, inputs: EngineInputs, effCR: number, crx: number, CID: number): number {
  const { noCyl, bore, stroke, inline, camType, noInValves } = inputs;
  
  let fcid = s(s(s(0.268) * sPow(s(noCyl), 0.96)) * s(sPow(s(bore), 1.6) * s(stroke)));
  fcid = s(s(fcid) * sPow(s(s(effCR) / s(crx)), 0.5));
  
  let icid = 0;
  if (inline === 0 && noCyl > 1) {
    const nrb = s(noCyl);
    const nmb = s(1 + s(s(noCyl) / 2));
    icid = s(s(0.08) * s(s(s(4 + 5) / s(4 + 3)) * s(s(s(nrb) + s(nmb)) / s(s(nrb) + s(s(nrb) + 1)))));
  }
  fcid = s(s(fcid) * s(1 + s(icid)));
  
  if (camType === 0) fcid = s(0.95 * s(fcid));
  
  fcid = s(s(fcid) * sPow(s(noInValves), 0.1));
  
  const ptq = s(s(s(CID) * s(1.01 - s(vef))) * s(s(CONSTANTS.PSIA) / 12));
  
  const rtq = s(s(1.07) * s(s(fcid) * sPow(s(s(s(rpm) * sPow(s(stroke), 0.8)) / s(CONSTANTS.KRPM)), 1.6)));
  
  return s(s(fcid) + s(s(ptq) + s(rtq)));
}

function flowBenchCorr(deltaP: number): number {
  const yFactor = s(s(1.044429) * s(1 - s(s(0.618) * s(s(deltaP) / s(CONSTANTS.PSTD)))));
  return s(sSqrt(s(28 / s(deltaP))) * s(yFactor));
}

function roundTo(value: number, increment: number): number {
  return s(Math.round(s(s(value) / s(increment))) * s(increment));
}

export function calcEngPerfVB6(inputs: EngineInputs): EngineOutputs {
  const { 
    noCyl, inline, bore, stroke, rod, compressionRatio, 
    camType, inCamDur,
    carb, carbCFM, fuel, manifold, curved, manFlow,
    noInValves, valveDia, maxInFlow, deltaP, refBore 
  } = inputs;
  
  const fuelProps: FuelProperties = FUEL_PROPERTIES[fuel];
  const { GAM, aqf, fhv, crx } = fuelProps;
  
  // Basic geometry with Single precision
  const BQS = s(s(bore) / s(stroke));
  const B2QS = s(s(bore) * s(BQS));
  const S3QB = s(sPow(s(stroke), 2) / s(BQS));
  const LRQS = s(s(rod) / s(stroke));
  const flrqs = s(1 + sPow(s(0.348 / s(LRQS)), 1.99));
  
  const BArea = s(s(s(CONSTANTS.PI) * sPow(s(bore), 2)) / 4);
  const CID = s(s(s(BArea) * s(stroke)) * s(noCyl));
  
  const Gulp = calcGulp(manifold, noCyl);
  const clk = s(s(1.5 / 29.92) / sPow(s(carbCFM), 2));
  
  const crvf = s(1 + s(1 / s(s(compressionRatio) - 1)));
  
  const hpcfmx = s(s(s(s(CONSTANTS.RHOair) * s(fhv)) / s(s(550) * s(aqf))) * s(778.16 / 60));
  const tqcidx = s(s(s(hpcfmx) * s(CONSTANTS.Z6)) / s(2 * 1728));
  
  // Fuel Injection effects
  let efik = 1;
  if (!carb) {
    if (manifold === 1) {
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
  
  // Large Carb Effect
  let cvexhp = 0.986;
  if (!carb) {
    if (manifold === 1) cvexhp = 0.987;
    else if (manifold === 2) cvexhp = 0.989;
    else if (manifold === 3) cvexhp = 0.988;
    else if (manifold === 4) cvexhp = 0.9877;
  }
  const cvextq = s(s(cvexhp) + 0.004);
  
  // Engine Plenum Manifold Effect
  let epek = 1;
  if (manifold === 1) {
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
  
  // Curved Runner Effect
  let crektq = 1, crekhp = 1;
  if (curved) {
    crektq = 0.994;
    crekhp = 0.904;
  }
  
  // Intake Ramming
  const ICFM = s(s(s(maxInFlow) * flowBenchCorr(deltaP)) * sPow(s(s(bore) / s(refBore)), 0.5));
  const athroat = s(s(s(s(noInValves) * s(s(CONSTANTS.PI) / 4)) * sPow(s(valveDia), 2)) * s(sPow(s(VSW), 2) - s(VSTM)));
  
  let cdi: number;
  if (noInValves === 1) {
    cdi = s(s(s(ICFM) / s(athroat)) / 133);
  } else {
    cdi = s(s(s(ICFM) / s(athroat)) / 137);
  }
  if (cdi > 1) cdi = 1;
  
  // Intake Pumping
  const ICFMnorm = s(s(s(ICFM) * s(s(manFlow) / 100)) / s(BArea));
  let EqvPS = s(s(s(ICFMnorm) * 144) / 60);
  EqvPS = s(s(EqvPS) / s(319.2 / 4.2));
  
  // Initial values for iteration
  let ilc = 109;
  let PHI = 1;
  let icdtq = 0.995;
  let icdrpm = 1;
  let metq = 0.818;
  let mehp = 0.778;
  
  let lcetq = 1;
  let PortVETQ = 0.987;
  let CarbVETQ = s(1 - sPow(s(s(s(0.135) * s(s(CID) * s(crvf))) / s(carbCFM)), 1.25));
  let zmin = 0.65;
  if (CarbVETQ < zmin) CarbVETQ = zmin;
  
  let lcehp = 1;
  let PortVEHP = 0.98;
  let CarbVEHP = s(1 - sPow(s(s(s(0.17) * s(s(CID) * s(crvf))) / s(carbCFM)), 1.25));
  if (CarbVEHP < zmin) CarbVEHP = zmin;
  
  const NTQ: number[] = [0, 0, 0];
  const NHP: number[] = [0, 0, 0];
  
  let rpmPeakTQ = 0;
  let rpmPeakHP = 0;
  let tqcfm = 0;
  let hpcfm = 0;
  let tqfps = 0;
  let hpfps = 0;
  
  // Variables needed for recommendations (declared at function level)
  let RamVEHP = 0;
  let EffCRHP = 0;
  let acrit = 4.4;
  
  const camk = CAM_FACTORS[camType];
  
  // Begin 5 iterations
  for (let itr = 1; itr <= 5; itr++) {
    let xqs = 1;
    const ivc = s(s(ilc) + s(s(1.08) * s(s(inCamDur) / 2)));
    if (ivc > 180) {
      const ivcr = s(s(ivc) * s(s(CONSTANTS.PI) / 180));
      xqs = s(s(1 + s(s(2) * s(LRQS)) - sCos(ivcr) - sSqrt(s(sPow(s(s(2) * s(LRQS)), 2) - sPow(sSin(ivcr), 2)))) / 2);
    }
    
    // *************************** Peak TQ and RPM ****************************
    if (itr === 1) {
      acrit = 4.4;
    } else {
      acrit = s(s(4.2) * sPow(s(524 / s(s(4.2) * s(tqfps))), 0.181));
    }
    if (noInValves > 1) acrit = s(s(acrit) / s(137 / 133));
    if (fuel === 3) acrit = s(s(acrit) / 1.06);
    const astarTQ = s(s(acrit) / s(s(BArea) / s(athroat)));
    
    let psitq: number;
    if (astarTQ < 1) {
      psitq = s(sPow(s(cdi), 1.56) * sPow(s(astarTQ), 0.44));
    } else {
      psitq = s(sPow(s(cdi), 1.56) * sPow(s(astarTQ), s(-3 * 0.44)));
    }
    psitq = s(s(psitq) - s(s(4.3) * sPow(s(s(cdi) - s(astarTQ)), 2)));
    if (psitq < 0) psitq = 0;
    
    const RamVETQ = s(s(1 + s(s(s(s(0.177) * s(s(epek) * s(crektq))) * sPow(s(psitq), 1.52)) * sPow(s(noInValves), 0.13))) * s(s(s(icdtq) * sPow(camk[2], 0.5)) * s(lcetq)));
    
    const VETQ = s(s(CarbVETQ) * s(PortVETQ));
    const EffCRTQ = calcEffCR(s(s(VETQ) * s(RamVETQ)), compressionRatio, xqs, crx);
    const EFFTQ = calcEFF(EffCRTQ, GAM);
    
    // RPM @ Peak TQ from Peak Piston Speed
    tqfps = s(s(5683.2 / 60) * s(s(sPow(s(S3QB), 0.172) * sPow(s(bore), 0)) * sPow(s(flrqs), 0.42)));
    
    // Intake Pumping
    let PumpVE = s(s(sPow(s(VETQ), 0.32) * sPow(s(crvf), -2.7)) * sPow(s(EqvPS), 0.608));
    PumpVE = s(s(PumpVE) * sPow(camk[1], 0.5));
    tqfps = s(s(tqfps) * s(PumpVE));
    
    // Intake Ramming
    let RamVE = s(sPow(s(RamVETQ), 0.015) * sPow(s(noInValves), 0.047));
    RamVE = s(s(RamVE) * s(s(icdrpm) * sPow(camk[1], 0.5)));
    tqfps = s(s(tqfps) * s(RamVE));
    
    // Compression, Fuel Burning and Friction
    tqfps = s(s(tqfps) * s(s(sPow(s(EFFTQ), -0.22) * sPow(s(efik), 0)) * sPow(s(metq), 0.59)));
    rpmPeakTQ = fpsToRPM(tqfps, flrqs, stroke);
    
    // *************** Gross TQ @ Peak TQ *****************
    let gtqcid = s(s(0.8827) * s(s(sPow(s(B2QS), 0.018) * sPow(s(stroke), -0.008)) * sPow(s(flrqs), 0.18)));
    
    // Intake Pumping
    PumpVE = s(s(sPow(s(VETQ), 0.7) * sPow(s(crvf), 1.4)) * sPow(s(EqvPS), 0.187));
    PumpVE = s(s(PumpVE) * sPow(camk[2], 0.5));
    gtqcid = s(s(gtqcid) * s(PumpVE));
    
    // Intake Ramming
    gtqcid = s(s(gtqcid) * s(RamVETQ));
    
    // Compression and Fuel Burning
    gtqcid = s(s(gtqcid) * s(s(sPow(s(EFFTQ), 1.18) * s(tqcidx)) * s(efik)));
    
    // Friction
    const ftqTQ = friction(rpmPeakTQ, VETQ, inputs, EffCRTQ, crx, CID);
    NTQ[1] = s(s(s(gtqcid) - s(s(ftqTQ) / s(CID))) * s(CID));
    if (NTQ[1] < 0) NTQ[1] = 0;
    
    // Dampen metq effect
    metq = s(s(s(0.4) * s(metq)) + s(s(0.6) * s(s(NTQ[1]) / s(s(gtqcid) * s(CID)))));
    
    // ****************** Net TQ @ Peak TQ ********************
    let ntqcid = s(s(0.6966) * s(s(sPow(s(B2QS), 0.058) * sPow(s(stroke), -0.016)) * sPow(s(flrqs), 0.62)));
    
    // Intake Pumping
    PumpVE = s(s(sPow(s(VETQ), 1.66) * sPow(s(crvf), 1.76)) * sPow(s(EqvPS), 0.221));
    PumpVE = s(s(PumpVE) * sPow(camk[3], 0.5));
    ntqcid = s(s(ntqcid) * s(PumpVE));
    
    // Intake Ramming
    RamVE = s(s(1 + s(s(s(s(0.218) * s(s(epek) * s(crektq))) * sPow(s(psitq), 1.22)) * sPow(s(noInValves), 0.039))) * s(s(s(icdtq) * sPow(camk[3], 0.5)) * s(lcetq)));
    ntqcid = s(s(ntqcid) * s(RamVE));
    
    // Compression, Fuel Burning and Friction
    ntqcid = s(s(ntqcid) * s(s(s(sPow(s(EFFTQ), 1.22) * s(tqcidx)) * s(efik)) * sPow(s(metq), 0.075)));
    NTQ[2] = s(s(ntqcid) * s(CID));
    if (NTQ[2] < 0) NTQ[2] = 0;
    
    // ********** Carb Pumping Losses at Peak TQ RPM **********
    tqcfm = s(s(s(s(VETQ) * s(crvf)) * s(s(CID) / 1728)) * s(s(rpmPeakTQ) / 2));
    CarbVETQ = s(1 - s(s(clk) * sPow(s(s(Gulp) * s(tqcfm)), 2)));
    zmin = 0.65;
    if (CarbVETQ < zmin) CarbVETQ = zmin;
    
    // Port Pumping Losses
    PortVETQ = headLoss(tqfps);
    
    // Large Carb Effect
    lcetq = 1;
    if (CarbVETQ > cvextq) lcetq = sPow(s(s(1 - s(CarbVETQ)) / s(1 - s(cvextq))), 0.3);
    
    // *************************** Peak HP and RPM ****************************
    if (itr === 1) {
      acrit = 4.4;
    } else {
      acrit = s(s(4.2) * sPow(s(622 / s(s(4.2) * s(hpfps))), 0.152));
    }
    if (noInValves > 1) acrit = s(s(acrit) / s(137 / 133));
    if (fuel === 3) acrit = s(s(acrit) / 1.06);
    const astarHP = s(s(acrit) / s(s(BArea) / s(athroat)));
    
    let psihp: number;
    if (astarHP < 1) {
      psihp = s(sPow(s(cdi), 1.52) * sPow(s(astarHP), 0.48));
    } else {
      psihp = s(sPow(s(cdi), 1.52) * sPow(s(astarHP), s(-3 * 0.48)));
    }
    psihp = s(s(psihp) - s(s(1.5) * sPow(s(s(cdi) - s(astarHP)), 2)));
    if (psihp < 0) psihp = 0;
    
    RamVEHP = s(s(1 + s(s(s(s(0.202) * s(s(epek) * s(crekhp))) * sPow(s(psihp), 1.9)) * sPow(s(noInValves), 0.145))) * s(s(s(icdtq) * sPow(camk[5], 0.5)) * s(lcehp)));
    
    const VEHP = s(s(CarbVEHP) * s(PortVEHP));
    EffCRHP = calcEffCR(s(s(VEHP) * s(RamVEHP)), compressionRatio, xqs, crx);
    const EFFHP = calcEFF(EffCRHP, GAM);
    
    // RPM @ Peak HP from Peak Piston Speed
    hpfps = s(s(6896.4 / 60) * s(s(sPow(s(S3QB), 0.198) * sPow(s(bore), 0)) * sPow(s(flrqs), 1.25)));
    
    // Intake Pumping
    PumpVE = s(s(sPow(s(VEHP), 0.14) * sPow(s(crvf), -1.2)) * sPow(s(EqvPS), 0.604));
    PumpVE = s(s(PumpVE) * sPow(camk[4], 0.5));
    hpfps = s(s(hpfps) * s(PumpVE));
    
    // Intake Ramming
    RamVE = s(sPow(s(RamVEHP), -0.035) * sPow(s(noInValves), 0.049));
    RamVE = s(s(RamVE) * s(s(icdrpm) * sPow(camk[4], 0.5)));
    hpfps = s(s(hpfps) * s(RamVE));
    
    // Compression, Fuel Burning and Friction
    hpfps = s(s(hpfps) * s(s(sPow(s(EFFHP), 0.07) * sPow(s(efik), 0)) * sPow(s(mehp), 0.49)));
    rpmPeakHP = fpsToRPM(hpfps, flrqs, stroke);
    
    // *************** Gross TQ @ Peak HP *****************
    let gtqhp = s(s(0.6261) * s(s(sPow(s(B2QS), 0.022) * sPow(s(stroke), 0.032)) * sPow(s(flrqs), -0.48)));
    
    // Intake Pumping
    PumpVE = s(s(sPow(s(VEHP), -0.02) * sPow(s(crvf), 0.36)) * sPow(s(EqvPS), 0.184));
    PumpVE = s(s(PumpVE) * sPow(camk[5], 0.5));
    gtqhp = s(s(gtqhp) * s(PumpVE));
    
    // Intake Ramming
    gtqhp = s(s(gtqhp) * s(RamVEHP));
    
    // Compression and Fuel Burning
    gtqhp = s(s(gtqhp) * s(s(sPow(s(EFFHP), 0.76) * s(tqcidx)) * s(efik)));
    
    // Friction
    const ftqHP = friction(rpmPeakHP, VEHP, inputs, EffCRHP, crx, CID);
    NHP[1] = s(s(s(s(gtqhp) * s(CID)) - s(ftqHP)) * s(s(rpmPeakHP) / s(CONSTANTS.Z6)));
    if (NHP[1] < 0) NHP[1] = 0;
    
    // Dampen mehp effect
    mehp = s(s(s(0.4) * s(mehp)) + s(s(0.6) * s(s(NHP[1]) / s(s(s(gtqhp) * s(CID)) * s(s(rpmPeakHP) / s(CONSTANTS.Z6))))));
    
    // **************** Net TQ @ Peak HP ******************
    let ntqhp = s(s(0.4506) * s(s(sPow(s(B2QS), 0.111) * sPow(s(stroke), 0.037)) * sPow(s(flrqs), 0.16)));
    
    // Intake Pumping
    PumpVE = s(s(sPow(s(VEHP), 0.88) * sPow(s(crvf), 0.72)) * sPow(s(EqvPS), 0.19));
    PumpVE = s(s(PumpVE) * sPow(camk[6], 0.5));
    ntqhp = s(s(ntqhp) * s(PumpVE));
    
    // Intake Ramming
    RamVE = s(s(1 + s(s(s(s(0.243) * s(s(epek) * s(crekhp))) * sPow(s(psihp), 1.7)) * sPow(s(noInValves), 0.082))) * s(s(s(icdtq) * sPow(camk[6], 0.5)) * s(lcehp)));
    ntqhp = s(s(ntqhp) * s(RamVE));
    
    // Compression, Fuel Burning and Friction
    ntqhp = s(s(ntqhp) * s(s(s(sPow(s(EFFHP), 0.86) * s(tqcidx)) * s(efik)) * sPow(s(mehp), 0.065)));
    NHP[2] = s(s(s(ntqhp) * s(CID)) * s(s(rpmPeakHP) / s(CONSTANTS.Z6)));
    if (NHP[2] < 0) NHP[2] = 0;
    
    // ********** Carb Pumping Losses at Peak HP RPM **********
    hpcfm = s(s(s(s(VEHP) * s(crvf)) * s(s(CID) / 1728)) * s(s(rpmPeakHP) / 2));
    CarbVEHP = s(1 - s(s(clk) * sPow(s(s(Gulp) * s(hpcfm)), 2)));
    zmin = 0.65;
    if (CarbVEHP < zmin) CarbVEHP = zmin;
    
    // Port Pumping Losses
    PortVEHP = headLoss(hpfps);
    
    // Large Carb Effect
    lcehp = 1;
    if (CarbVEHP > cvexhp) lcehp = sPow(s(s(1 - s(CarbVEHP)) / s(1 - s(cvexhp))), 0.3);
    
    // ********************* Off-design Camshaft Modelling ********************
    let optcam = s(s(148.1) + s(s(s(3.8) * s(compressionRatio)) + s(12 / s(s(s(rpmPeakTQ) * s(stroke)) / s(CONSTANTS.KRPM)))));
    optcam = s(s(optcam) + s(s(0.007) * s(s(sPow(s(rpmPeakTQ), 0.77) * sPow(s(bore), 0.27)) * sPow(s(stroke), 1.47))));
    
    if (noInValves > 1) optcam = s(s(optcam) - 18.9);
    
    zmin = 200;
    if (optcam < zmin) optcam = zmin;
    let zmax = 330;
    if (optcam > zmax) optcam = zmax;
    
    PHI = s(s(inCamDur) / s(optcam));
    icdrpm = 1;
    icdtq = 1;
    
    if (PHI < 0.99) {
      const phi1 = s(s(PHI) + 0.01);
      icdrpm = sPow(s(phi1), 0.85);
      icdtq = sPow(s(phi1), 0.15);
    } else if (PHI > 1.01) {
      const phi1 = s(s(PHI) - 0.01);
      icdrpm = sPow(s(phi1), 0.35);
      icdtq = sPow(s(phi1), -0.9);
    }
    
    // Recommended Lobe Separation Angle
    let lsa = s(100 + s(s(1.2) * s(s(rpmPeakHP) / 1000)));
    lsa = s(s(s(lsa) * sPow(s(s(inCamDur) / 270), 0.5)) + s(sPow(s(1.8 / s(LRQS)), 4) - 1));
    zmin = 102;
    if (lsa < zmin) lsa = zmin;
    zmax = 116;
    if (lsa > zmax) lsa = zmax;
    
    // Recommended Intake Lobe Centerline
    ilc = s(s(lsa) - s(s(1 - s(s(EffCRHP) / s(crx))) * 15));
    zmin = 100;
    if (ilc < zmin) ilc = zmin;
    zmax = 118;
    if (ilc > zmax) ilc = zmax;
  }
  
  // Calculate Summary Values
  let peakTQ = s(s(s(NTQ[1]) + s(NTQ[2])) / 2);
  let peakHP = s(s(s(NHP[1]) + s(NHP[2])) / 2);
  
  // Is Peak TQ value properly related to TQ @ Peak HP?
  const ntqhp = s(s(s(peakHP) * s(CONSTANTS.Z6)) / s(rpmPeakHP));
  const xrpm = s(s(rpmPeakTQ) / s(rpmPeakHP));
  const tqmin = s(s(ntqhp) * s(1 + s(s(0.31) * s(s(1 / s(xrpm)) - 1))));
  if (peakTQ < tqmin) peakTQ = tqmin;
  
  // Calculate redline and shift RPM
  let redline = s(s(s(1.24) * s(CONSTANTS.KRPM)) / s(s(s(flrqs) * s(stroke)) * sSqrt(s(BQS))));
  if (redline > s(s(1.25) * s(rpmPeakHP))) {
    redline = s(s(1.25) * s(rpmPeakHP));
  } else if (redline < rpmPeakHP) {
    redline = rpmPeakHP;
  }
  
  let shift = s(s(1.08) * s(rpmPeakHP));
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
    hpPerCID: s(s(peakHP) / s(CID)),
    tqPerCID: s(s(peakTQ) / s(CID)),
    shift,
    redline,
    cid: CID,
    calculatedValues: {
      hpcfm,
      tqcfm,
      hpfps,
      tqfps,
      RamVEHP,
      EffCR: EffCRHP,
      acrit,
      flrqs
    }
  };
}
