/**
 * Engine Performance Calculations
 * 
 * Direct port of VB6 ENGPERF.BAS CalcEngPerf() function
 * This is the core engine simulation that calculates HP/TQ curves
 */

import { CONSTANTS, FUEL_PROPERTIES, CAM_FACTORS, calcGulp, VSW, VSTM } from './engineConstants';
import type { EngineInputs, EngineOutputs, FuelProperties } from './engineTypes';

// Helper functions (from ENGPERF.BAS)

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

function rpmToFPS(rpm: number, flrqs: number, stroke: number): number {
  return (rpm / 60) * (CONSTANTS.PI * flrqs * stroke / 12);
}

function fpsToRPM(fps: number, flrqs: number, stroke: number): number {
  return (fps * 60) / (CONSTANTS.PI * flrqs * stroke / 12);
}

function headLoss(fps: number): number {
  // Assumes a loss coefficient = 2.0
  return 1 - 2 * (CONSTANTS.RHOair * Math.pow(fps, 2) / (2 * CONSTANTS.GC * 144)) / CONSTANTS.PSIA;
}

function friction(rpm: number, vef: number, inputs: EngineInputs, effCR: number, crx: number, CID: number): number {
  const { noCyl, bore, stroke, inline, camType, noInValves } = inputs;
  
  // Friction torque that does not vary with RPM
  
  // Compute effective CID friction torque for model
  let fcid = 0.268 * Math.pow(noCyl, 0.96) * Math.pow(bore, 1.6) * stroke;
  fcid = fcid * Math.pow(effCR / crx, 0.5);  // Compression ratio effect
  
  // Inline engine friction model - 01/07/00
  // Correlation increases fcid by 8% for 4I vs 4V
  let icid = 0;
  if (inline === 0 && noCyl > 1) {
    const nrb = noCyl;
    const nmb = 1 + noCyl / 2;
    icid = 0.08 * ((4 + 5) / (4 + 3)) * ((nrb + nmb)) / (nrb + nrb + 1);
  }
  fcid = fcid * (1 + icid);
  
  // Overhead cam friction model - 02/17/00
  if (camType === 0) fcid = 0.95 * fcid;
  
  // Number of valves friction model - 01/19/00
  fcid = fcid * Math.pow(noInValves, 0.1);
  
  // Pumping torque (assumed to only vary with VE%)
  const ptq = CID * (1.01 - vef) * CONSTANTS.PSIA / 12;
  
  // Friction torque that varies with RPM
  const rtq = 1.07 * fcid * Math.pow(rpm * Math.pow(stroke, 0.8) / CONSTANTS.KRPM, 1.6);
  
  // Sum all the friction torques
  return fcid + ptq + rtq;
}

/**
 * Main engine performance calculation
 * Direct port of VB6 CalcEngPerf() from ENGPERF.BAS
 */
export function calcEngPerf(inputs: EngineInputs): EngineOutputs {
  const { 
    noCyl, inline, bore, stroke, rod, compressionRatio, 
    camType, inCamDur,
    carb, carbCFM, fuel, manifold, curved, manFlow,
    noInValves, valveDia, maxInFlow, deltaP, refBore 
  } = inputs;
  
  // Get fuel properties
  const fuelProps: FuelProperties = FUEL_PROPERTIES[fuel];
  const { GAM, aqf, fhv, crx } = fuelProps;
  
  // Calculate basic engine geometry
  const BQS = bore / stroke;
  const B2QS = bore * BQS;
  const S3QB = Math.pow(stroke, 2) / BQS;
  const LRQS = rod / stroke;
  const flrqs = 1 + Math.pow(0.348 / LRQS, 1.99);  // Max piston speed effect of LRQS
  // Note: AngMPS and DQR are calculated in VB6 but not used in CalcEngPerf
  // They may be used in Engine Pro recommendations (not yet ported)
  
  const BArea = CONSTANTS.PI * Math.pow(bore, 2) / 4;
  const cylCID = BArea * stroke;
  const CID = cylCID * noCyl;
  
  const Gulp = calcGulp(manifold, noCyl);
  const clk = (1.5 / 29.92) / Math.pow(carbCFM, 2);  // Carb loss coefficient
  
  const crvf = 1 + 1 / (compressionRatio - 1);  // Compression ratio volume factor
  
  // Max HP per CFM and max TQ per CID @ 100% VE
  const hpcfmx = CONSTANTS.RHOair * fhv / (550 * aqf) * 778.16 / 60;
  const tqcidx = hpcfmx * CONSTANTS.Z6 / (2 * 1728);
  
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
    } else if (manifold >= 3) {  // Dual plane/100% divided plenum and dual plane w/small slot
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
    if (manifold === 1) cvexhp = 0.987;       // Common plenum
    else if (manifold === 2) cvexhp = 0.989;  // Individual runner
    else if (manifold === 3) cvexhp = 0.988;  // Dual plane/100% divided
    else if (manifold === 4) cvexhp = 0.9877; // Dual plane w/small slot
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
  } else if (manifold === 2) {  // Individual runner
    epek = 0.85;
  } else if (manifold === 3) {  // Dual plane/100% divided
    if (inline === 0) epek = 0.875;
    else if (inline === 1) {
      epek = 0.92;
      if (noCyl <= 8) epek = 0.9;
    } else if (inline === 2) {
      epek = 0.9;
      if (noCyl <= 4) epek = 0.875;
    }
    if (noCyl <= 2) epek = 0.85;
  } else if (manifold === 4) {  // Dual plane w/small slot
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
  // All single cylinder engines are IR
  if (noCyl === 1) epek = 0.85;
  
  // Curved Runner Effect on Intake Ramming
  let crektq = 1, crekhp = 1;
  if (curved) {
    crektq = 0.994;
    crekhp = 0.904;
  }
  
  // Intake Ramming - calculate cdi for psi function
  const ICFM = maxInFlow * flowBenchCorr(deltaP) * Math.pow(bore / refBore, 0.5);
  const athroat = noInValves * (CONSTANTS.PI / 4) * Math.pow(valveDia, 2) * (Math.pow(VSW, 2) - VSTM);
  let cdi: number;
  if (noInValves === 1) {
    cdi = (ICFM / athroat) / 133;  // Single intake valve
  } else {
    cdi = (ICFM / athroat) / 137;  // Multiple intake valves
  }
  if (cdi > 1) cdi = 1;
  
  // Intake Pumping - derive CFM/Bore Area at 28" H2O from flowbench data
  const ICFMnorm = ICFM * (manFlow / 100) / BArea;
  // Convert to equivalent piston speed - ft/sec
  let EqvPS = ICFMnorm * 144 / 60;  // 144 / 60 == 2.4
  // Normalize around bore/throat area ratio = 4.2 and 319.2 ft/sec
  // 319.2 ft/sec from 133 cfm/in^2 = maximum velocity at 28" H2O
  EqvPS = EqvPS / (319.2 / 4.2);  // 319.2 / 4.2 == 76 ft/sec
  
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
  
  // Arrays to store results
  const NTQ: number[] = [0, 0, 0];
  const NHP: number[] = [0, 0, 0];
  
  let rpmPeakTQ = 0;
  let rpmPeakHP = 0;
  let tqcfm = 0;
  let hpcfm = 0;
  let tqfps = 0;
  let hpfps = 0;
  
  // Get cam factors
  const camk = CAM_FACTORS[camType];
  
  // Begin Iteration (5 iterations)
  for (let itr = 1; itr <= 5; itr++) {
    let xqs = 1;
    const ivc = ilc + 1.08 * inCamDur / 2;
    if (ivc > 180) {
      const ivcr = ivc * CONSTANTS.PI / 180;
      xqs = (1 + 2 * LRQS - Math.cos(ivcr) - Math.sqrt(Math.pow(2 * LRQS, 2) - Math.pow(Math.sin(ivcr), 2))) / 2;
    }
    
    // *************************** Peak TQ and RPM ****************************
    let acrit: number;
    if (itr === 1) {
      acrit = 4.4;
    } else {
      acrit = 4.2 * Math.pow(524 / (4.2 * tqfps), 0.181);
    }
    if (noInValves > 1) acrit = acrit / (137 / 133);
    if (fuel === 3) acrit = acrit / 1.06;
    const astarTQ = acrit / (BArea / athroat);
    
    let psitq: number;
    if (astarTQ < 1) {
      psitq = Math.pow(cdi, 1.56) * Math.pow(astarTQ, 0.44);
    } else {
      psitq = Math.pow(cdi, 1.56) * Math.pow(astarTQ, -3 * 0.44);
    }
    psitq = psitq - 4.3 * Math.pow(cdi - astarTQ, 2);
    if (psitq < 0) psitq = 0;
    
    const RamVETQ = (1 + 0.177 * epek * crektq * Math.pow(psitq, 1.52) * Math.pow(noInValves, 0.13))
                    * icdtq * Math.pow(camk[2], 0.5) * lcetq;
    
    const VETQ = CarbVETQ * PortVETQ;
    const EffCRTQ = calcEffCR(VETQ * RamVETQ, compressionRatio, xqs, crx);
    const EFFTQ = calcEFF(EffCRTQ, GAM);
    
    // RPM @ Peak TQ from Peak Piston Speed
    tqfps = (5683.2 / 60) * Math.pow(S3QB, 0.172) * Math.pow(bore, 0) * Math.pow(flrqs, 0.42);
    
    // Intake Pumping
    let PumpVE = Math.pow(VETQ, 0.32) * Math.pow(crvf, -2.7) * Math.pow(EqvPS, 0.608);
    PumpVE = PumpVE * Math.pow(camk[1], 0.5);
    tqfps = tqfps * PumpVE;
    
    // Intake Ramming
    let RamVE = Math.pow(RamVETQ, 0.015) * Math.pow(noInValves, 0.047);
    RamVE = RamVE * icdrpm * Math.pow(camk[1], 0.5);
    tqfps = tqfps * RamVE;
    
    // Compression, Fuel Burning and Friction
    tqfps = tqfps * Math.pow(EFFTQ, -0.22) * Math.pow(efik, 0) * Math.pow(metq, 0.59);
    rpmPeakTQ = fpsToRPM(tqfps, flrqs, stroke);
    
    // *************** Gross TQ @ Peak TQ *****************
    let gtqcid = 0.8827 * Math.pow(B2QS, 0.018) * Math.pow(stroke, -0.008) * Math.pow(flrqs, 0.18);
    
    // Intake Pumping
    PumpVE = Math.pow(VETQ, 0.7) * Math.pow(crvf, 1.4) * Math.pow(EqvPS, 0.187);
    PumpVE = PumpVE * Math.pow(camk[2], 0.5);
    gtqcid = gtqcid * PumpVE;
    
    // Intake Ramming
    gtqcid = gtqcid * RamVETQ;
    
    // Compression and Fuel Burning
    gtqcid = gtqcid * Math.pow(EFFTQ, 1.18) * tqcidx * efik;
    
    // Friction
    const ftqTQ = friction(rpmPeakTQ, VETQ, inputs, EffCRTQ, crx, CID);
    NTQ[1] = gtqcid * CID - ftqTQ;
    if (NTQ[1] < 0) NTQ[1] = 0;
    
    // Dampen metq effect on RPMPeakTQ iteration
    metq = 0.4 * metq + 0.6 * NTQ[1] / (gtqcid * CID);
    
    // ****************** Net TQ @ Peak TQ ********************
    let ntqcid = 0.6966 * Math.pow(B2QS, 0.058) * Math.pow(stroke, -0.016) * Math.pow(flrqs, 0.62);
    
    // Intake Pumping
    PumpVE = Math.pow(VETQ, 1.66) * Math.pow(crvf, 1.76) * Math.pow(EqvPS, 0.221);
    PumpVE = PumpVE * Math.pow(camk[3], 0.5);
    ntqcid = ntqcid * PumpVE;
    
    // Intake Ramming
    RamVE = (1 + 0.218 * epek * crektq * Math.pow(psitq, 1.22) * Math.pow(noInValves, 0.039))
            * icdtq * Math.pow(camk[3], 0.5) * lcetq;
    ntqcid = ntqcid * RamVE;
    
    // Compression, Fuel Burning and Friction
    ntqcid = ntqcid * Math.pow(EFFTQ, 1.22) * tqcidx * efik * Math.pow(metq, 0.075);
    NTQ[2] = ntqcid * CID;
    if (NTQ[2] < 0) NTQ[2] = 0;
    
    // ********** Carb Pumping Losses at Peak TQ RPM **********
    tqcfm = VETQ * crvf * (CID / 1728) * rpmPeakTQ / 2;  // Pat Hale - missing RamVETQ
    CarbVETQ = 1 - clk * Math.pow(Gulp * tqcfm, 2);
    zmin = 0.65;
    if (CarbVETQ < zmin) CarbVETQ = zmin;
    
    // Port Pumping Losses at Peak TQ RPM
    PortVETQ = headLoss(tqfps);
    
    // Large Carb Effect on Intake Ramming
    lcetq = 1;
    if (CarbVETQ > cvextq) lcetq = Math.pow((1 - CarbVETQ) / (1 - cvextq), 0.3);
    
    // *************************** Peak HP and RPM ****************************
    if (itr === 1) {
      acrit = 4.4;
    } else {
      acrit = 4.2 * Math.pow(622 / (4.2 * hpfps), 0.152);
    }
    if (noInValves > 1) acrit = acrit / (137 / 133);
    if (fuel === 3) acrit = acrit / 1.06;
    const astarHP = acrit / (BArea / athroat);
    
    let psihp: number;
    if (astarHP < 1) {
      psihp = Math.pow(cdi, 1.52) * Math.pow(astarHP, 0.48);
    } else {
      psihp = Math.pow(cdi, 1.52) * Math.pow(astarHP, -3 * 0.48);
    }
    psihp = psihp - 1.5 * Math.pow(cdi - astarHP, 2);
    if (psihp < 0) psihp = 0;
    
    const RamVEHP = (1 + 0.202 * epek * crekhp * Math.pow(psihp, 1.9) * Math.pow(noInValves, 0.145))
                    * icdtq * Math.pow(camk[5], 0.5) * lcehp;
    
    const VEHP = CarbVEHP * PortVEHP;
    const EffCRHP = calcEffCR(VEHP * RamVEHP, compressionRatio, xqs, crx);
    const EFFHP = calcEFF(EffCRHP, GAM);
    
    // RPM @ Peak HP from Peak Piston Speed
    hpfps = (6896.4 / 60) * Math.pow(S3QB, 0.198) * Math.pow(bore, 0) * Math.pow(flrqs, 1.25);
    
    // Intake Pumping
    PumpVE = Math.pow(VEHP, 0.14) * Math.pow(crvf, -1.2) * Math.pow(EqvPS, 0.604);
    PumpVE = PumpVE * Math.pow(camk[4], 0.5);
    hpfps = hpfps * PumpVE;
    
    // Intake Ramming
    RamVE = Math.pow(RamVEHP, -0.035) * Math.pow(noInValves, 0.049);
    RamVE = RamVE * icdrpm * Math.pow(camk[4], 0.5);
    hpfps = hpfps * RamVE;
    
    // Compression, Fuel Burning and Friction
    hpfps = hpfps * Math.pow(EFFHP, 0.07) * Math.pow(efik, 0) * Math.pow(mehp, 0.49);
    rpmPeakHP = fpsToRPM(hpfps, flrqs, stroke);
    
    // *************** Gross TQ @ Peak HP *****************
    let gtqhp = 0.6261 * Math.pow(B2QS, 0.022) * Math.pow(stroke, 0.032) * Math.pow(flrqs, -0.48);
    
    // Intake Pumping
    PumpVE = Math.pow(VEHP, -0.02) * Math.pow(crvf, 0.36) * Math.pow(EqvPS, 0.184);
    PumpVE = PumpVE * Math.pow(camk[5], 0.5);
    gtqhp = gtqhp * PumpVE;
    
    // Intake Ramming
    gtqhp = gtqhp * RamVEHP;
    
    // Compression and Fuel Burning
    gtqhp = gtqhp * Math.pow(EFFHP, 0.76) * tqcidx * efik;
    
    // Friction
    const ftqHP = friction(rpmPeakHP, VEHP, inputs, EffCRHP, crx, CID);
    NHP[1] = (gtqhp * CID - ftqHP) * rpmPeakHP / CONSTANTS.Z6;
    if (NHP[1] < 0) NHP[1] = 0;
    
    // Dampen mehp effect on RPMPeakHP iteration
    mehp = 0.4 * mehp + 0.6 * NHP[1] / (gtqhp * CID * rpmPeakHP / CONSTANTS.Z6);
    
    // **************** Net TQ @ Peak HP ******************
    let ntqhp = 0.4506 * Math.pow(B2QS, 0.111) * Math.pow(stroke, 0.037) * Math.pow(flrqs, 0.16);
    
    // Intake Pumping
    PumpVE = Math.pow(VEHP, 0.88) * Math.pow(crvf, 0.72) * Math.pow(EqvPS, 0.19);
    PumpVE = PumpVE * Math.pow(camk[6], 0.5);
    ntqhp = ntqhp * PumpVE;
    
    // Intake Ramming
    RamVE = (1 + 0.243 * epek * crekhp * Math.pow(psihp, 1.7) * Math.pow(noInValves, 0.082))
            * icdtq * Math.pow(camk[6], 0.5) * lcehp;
    ntqhp = ntqhp * RamVE;
    
    // Compression, Fuel Burning and Friction
    ntqhp = ntqhp * Math.pow(EFFHP, 0.86) * tqcidx * efik * Math.pow(mehp, 0.065);
    NHP[2] = ntqhp * CID * rpmPeakHP / CONSTANTS.Z6;
    if (NHP[2] < 0) NHP[2] = 0;
    
    // ********** Carb Pumping Losses at Peak HP RPM **********
    hpcfm = VEHP * crvf * (CID / 1728) * rpmPeakHP / 2;  // Pat Hale - missing RamVEHP
    CarbVEHP = 1 - clk * Math.pow(Gulp * hpcfm, 2);
    zmin = 0.65;
    if (CarbVEHP < zmin) CarbVEHP = zmin;
    
    // Port Pumping Losses at Peak HP RPM
    PortVEHP = headLoss(hpfps);
    
    // Large Carb Effect on Intake Ramming
    lcehp = 1;
    if (CarbVEHP > cvexhp) lcehp = Math.pow((1 - CarbVEHP) / (1 - cvexhp), 0.3);
    
    // ********************* Off-design Camshaft Modelling ********************
    let optcam = 148.1 + 3.8 * compressionRatio + 12 / (rpmPeakTQ * stroke / CONSTANTS.KRPM);
    optcam = optcam + 0.007 * Math.pow(rpmPeakTQ, 0.77) * Math.pow(bore, 0.27) * Math.pow(stroke, 1.47);
    
    if (noInValves > 1) optcam = optcam - 18.9;
    
    zmin = 200;
    if (optcam < zmin) optcam = zmin;
    let zmax = 330;
    if (optcam > zmax) optcam = zmax;
    
    PHI = inCamDur / optcam;
    icdrpm = 1;
    icdtq = 1;
    
    if (PHI < 0.99) {
      const phi1 = PHI + 0.01;
      icdrpm = Math.pow(phi1, 0.85);
      icdtq = Math.pow(phi1, 0.15);  // ICDHP exp = 1.00
    } else if (PHI > 1.01) {
      const phi1 = PHI - 0.01;
      icdrpm = Math.pow(phi1, 0.35);
      icdtq = Math.pow(phi1, -0.9);  // ICDHP exp = -0.55
    }
    
    // Recommended Lobe Separation Angle
    let lsa = 100 + 1.2 * rpmPeakHP / 1000;
    lsa = lsa * Math.pow(inCamDur / 270, 0.5) + Math.pow(1.8 / LRQS, 4) - 1;
    zmin = 102;
    if (lsa < zmin) lsa = zmin;
    zmax = 116;
    if (lsa > zmax) lsa = zmax;
    
    // Recommended Intake Lobe Centerline
    ilc = lsa - (1 - EffCRHP / crx) * 15;
    zmin = 100;
    if (ilc < zmin) ilc = zmin;
    zmax = 118;
    if (ilc > zmax) ilc = zmax;
  }
  
  // Calculate Summary Values
  let peakTQ = (NTQ[1] + NTQ[2]) / 2;
  let peakHP = (NHP[1] + NHP[2]) / 2;
  
  // Is Peak TQ value properly related to TQ @ Peak HP?
  const ntqhp = peakHP * CONSTANTS.Z6 / rpmPeakHP;
  const xrpm = rpmPeakTQ / rpmPeakHP;
  const tqmin = ntqhp * (1 + 0.31 * ((1 / xrpm) - 1));
  if (peakTQ < tqmin) peakTQ = tqmin;
  
  // Calculate redline and shift RPM
  let redline = 1.24 * CONSTANTS.KRPM / (flrqs * stroke * Math.sqrt(BQS));
  if (redline > 1.25 * rpmPeakHP) {
    redline = 1.25 * rpmPeakHP;
  } else if (redline < rpmPeakHP) {
    redline = rpmPeakHP;
  }
  
  let shift = 1.08 * rpmPeakHP;
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

// Helper function for flowbench correction
function flowBenchCorr(deltaP: number): number {
  const yFactor = 1.044429 * (1 - 0.618 * deltaP / CONSTANTS.PSTD);
  return Math.sqrt(28 / deltaP) * yFactor;
}

// Helper function to round to nearest increment
function roundTo(value: number, increment: number): number {
  return Math.round(value / increment) * increment;
}
