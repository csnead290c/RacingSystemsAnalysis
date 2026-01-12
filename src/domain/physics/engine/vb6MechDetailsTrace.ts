/**
 * VB6 Mechanical Details Trace - Debug utility for parity verification
 * 
 * VB6 Source: ENGPERF.BAS lines 61-67, DETAILS.FRM lines 386-391
 */

import { VB6_BASE_CASE } from './vb6ParityCheck';

const PI = 3.141593; // VB6 constant

/**
 * Calculate geometric ratios with VB6 trace output
 * VB6 Source: ENGPERF.BAS lines 61-67
 */
export function calcGeometricRatiosVB6(
  bore_in: number,
  stroke_in: number,
  rod_in: number,
  deck_in: number,
  gasket_in: number
) {
  // VB6 ENGPERF.BAS line 61
  const BQS = bore_in / stroke_in;
  
  // VB6 ENGPERF.BAS line 64
  const LRQS = rod_in / stroke_in;
  
  // VB6 ENGPERF.BAS line 67
  const DQR = (deck_in + gasket_in) / rod_in;
  
  // VB6 ENGPERF.BAS line 61-63 (derived values)
  const B2QS = bore_in * BQS;
  const S3QB = Math.pow(stroke_in, 2) / BQS;
  
  // VB6 ENGPERF.BAS line 65
  const AngMPS = 62 + Math.pow(750 * (LRQS - 0.958), 0.4027);
  
  // VB6 ENGPERF.BAS line 66
  const flrqs = 1 + Math.pow(0.348 / LRQS, 1.99);
  
  // Bore area
  const BArea = PI * Math.pow(bore_in, 2) / 4;
  
  return {
    BQS,
    LRQS,
    DQR,
    B2QS,
    S3QB,
    AngMPS,
    flrqs,
    BArea,
  };
}

/**
 * Calculate throat area with VB6 trace output
 * VB6 Source: ENGPERF.BAS lines 1262-1298 (CalcWSCSArea)
 */
export function calcThroatAreaVB6(
  valveDia_in: number,
  valveLift_in: number,
  seatDia_in: number,
  stemDia_in: number,
  numValves: number
) {
  const vd = valveDia_in;
  const vl = valveLift_in;
  const vsd = seatDia_in;
  const vstmd = stemDia_in;
  const niv = numValves;
  
  // VB6 ENGPERF.BAS line 1268-1270: seat angle and width
  const w = 0.06; // Seat width (estimated, need VB6 value)
  
  // VB6 ENGPERF.BAS line 1272-1274: curtain height
  let H: number;
  if (vl <= w) {
    H = vl;
  } else {
    H = w + 0.707 * (vl - w);
  }
  
  // VB6 ENGPERF.BAS line 1276-1277: valve seat area - low valve lift
  const a1 = niv * PI * vd * H;
  
  // VB6 ENGPERF.BAS line 1279-1280: valve curtain area - mid valve lift
  const a2 = niv * PI * (vd - w) * H;
  
  // VB6 ENGPERF.BAS line 1282-1283: valve throat area - high valve lift
  const a3 = niv * PI * (Math.pow(vsd, 2) - Math.pow(vstmd, 2)) / 4;
  
  // VB6 ENGPERF.BAS line 1285-1298: choose controlling flow area
  const throatArea = Math.min(a1, a2, a3);
  
  return {
    vd,
    vl,
    vsd,
    vstmd,
    niv,
    w,
    H,
    a1,
    a2,
    a3,
    throatArea,
  };
}

/**
 * Generate VB6 trace output for base case
 */
export function generateVB6MechDetailsTrace() {
  console.log('\n========== VB6 MECHANICAL DETAILS TRACE ==========\n');
  
  const { bore_in, stroke_in, rodLength_in } = VB6_BASE_CASE;
  
  // Base case deck and gasket from BASECASE.ENG line 6
  const deck_in = 0.015;
  const gasket_in = 0.039;
  
  console.log('INPUT VALUES (from BASECASE.ENG):');
  console.log(`  Bore:    ${bore_in.toFixed(3)} inches`);
  console.log(`  Stroke:  ${stroke_in.toFixed(3)} inches`);
  console.log(`  Rod:     ${rodLength_in.toFixed(3)} inches`);
  console.log(`  Deck:    ${deck_in.toFixed(3)} inches`);
  console.log(`  Gasket:  ${gasket_in.toFixed(3)} inches`);
  console.log('');
  
  const ratios = calcGeometricRatiosVB6(bore_in, stroke_in, rodLength_in, deck_in, gasket_in);
  
  console.log('CALCULATED RATIOS (VB6 ENGPERF.BAS lines 61-67):');
  console.log(`  BQS (Bore/Stroke):           ${ratios.BQS.toFixed(6)} → ${ratios.BQS.toFixed(2)} (2 decimals per DETAILS.FRM line 386)`);
  console.log(`  LRQS (Rod/Stroke):           ${ratios.LRQS.toFixed(6)} → ${ratios.LRQS.toFixed(2)} (2 decimals per DETAILS.FRM line 387)`);
  console.log(`  DQR (Piston-to-Head/Rod):    ${ratios.DQR.toFixed(6)} → ${ratios.DQR.toFixed(4)} (4 decimals per DETAILS.FRM line 388)`);
  console.log(`  BArea (Bore Area):           ${ratios.BArea.toFixed(6)} sq in`);
  console.log(`  AngMPS (Max Speed Angle):    ${ratios.AngMPS.toFixed(2)} degrees ATDC`);
  console.log(`  flrqs (LRQS effect):         ${ratios.flrqs.toFixed(6)}`);
  console.log('');
  
  console.log('DQR CALCULATION BREAKDOWN:');
  console.log(`  deck + gasket = ${deck_in} + ${gasket_in} = ${(deck_in + gasket_in).toFixed(6)}`);
  console.log(`  DQR = (deck + gasket) / rod = ${(deck_in + gasket_in).toFixed(6)} / ${rodLength_in} = ${ratios.DQR.toFixed(6)}`);
  console.log(`  VB6 Expected: 0.0092 (4 decimals)`);
  console.log(`  RSA Actual:   ${ratios.DQR.toFixed(4)}`);
  console.log(`  Match: ${ratios.DQR.toFixed(4) === '0.0092' ? '✓' : '✗'}`);
  console.log('');
  
  // Throat area calculation
  const { intakeValveDia_in, maxIntakeValveLift_in, numIntakeValvesPerCyl } = VB6_BASE_CASE;
  
  // Actual VB6 values from BASECASE.ENG line 8: 1.794 .344 2.434
  const seatDia_in = 1.794; // VB6 BASECASE.ENG line 8
  const stemDia_in = 0.344; // VB6 BASECASE.ENG line 8
  
  console.log('THROAT AREA CALCULATION (VB6 ENGPERF.BAS lines 1262-1298):');
  console.log(`  Valve Diameter:  ${intakeValveDia_in} inches`);
  console.log(`  Valve Lift:      ${maxIntakeValveLift_in} inches`);
  console.log(`  Seat Diameter:   ${seatDia_in} inches (BASECASE.ENG line 8)`);
  console.log(`  Stem Diameter:   ${stemDia_in} inches (BASECASE.ENG line 8)`);
  console.log(`  Num Valves:      ${numIntakeValvesPerCyl}`);
  console.log('');
  
  const throat = calcThroatAreaVB6(
    intakeValveDia_in,
    maxIntakeValveLift_in,
    seatDia_in,
    stemDia_in,
    numIntakeValvesPerCyl
  );
  
  console.log('THROAT AREA BREAKDOWN:');
  console.log(`  Curtain Height (H):          ${throat.H.toFixed(6)} inches`);
  console.log(`  a1 (Seat Area):              ${throat.a1.toFixed(6)} sq in`);
  console.log(`  a2 (Curtain Area):           ${throat.a2.toFixed(6)} sq in`);
  console.log(`  a3 (Throat Area):            ${throat.a3.toFixed(6)} sq in`);
  console.log(`  Final Throat Area:           ${throat.throatArea.toFixed(6)} sq in`);
  console.log(`  Throat/Bore Ratio:           ${(throat.throatArea / ratios.BArea).toFixed(6)} → ${(throat.throatArea / ratios.BArea).toFixed(3)} (3 decimals per DETAILS.FRM line 389)`);
  console.log(`  VB6 Expected: 0.191`);
  console.log(`  RSA Actual:   ${(throat.throatArea / ratios.BArea).toFixed(3)}`);
  console.log(`  Match: ${(throat.throatArea / ratios.BArea).toFixed(3) === '0.191' ? '✓' : '✗'}`);
  console.log('');
  
  console.log('VB6 DISPLAY FORMAT (DETAILS.FRM lines 386-391):');
  console.log(`  lblRatio(0) = RightAlign(5, 2, BQS)           → "${ratios.BQS.toFixed(2).padStart(5)}"`);
  console.log(`  lblRatio(1) = RightAlign(5, 2, LRQS)          → "${ratios.LRQS.toFixed(2).padStart(5)}"`);
  console.log(`  lblRatio(2) = RightAlign(5, 4, DQR)           → "${ratios.DQR.toFixed(4).padStart(5)}"`);
  console.log(`  lblRatio(3) = RightAlign(5, 3, Throat/Bore)   → "${(throat.throatArea / ratios.BArea).toFixed(3).padStart(5)}"`);
  console.log('');
  
  console.log('========== END VB6 TRACE ==========\n');
  
  return {
    ratios,
    throat,
  };
}

// Auto-run trace when imported
generateVB6MechDetailsTrace();
