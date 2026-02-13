/**
 * VB6 Flow Details Calculations - Exact Port from CDETAILS.CLS
 * 
 * This module provides deterministic flow details calculations
 * matching the original VB6 ENGINE Pro code exactly.
 */

import { calcPistonKinematicsAtAngle } from './vb6Kinematics';
import { calcEffectiveFlowArea, type FlowbenchValveSeatData } from './vb6Flowbench';
import { vb6ValveLiftAtAngle, VB6CamType } from './vb6CamProfile';
import { TABY } from './vb6Interpolation';

const PI = 3.141593; // VB6 constant
const GC = 32.174;   // VB6 gravity constant
const RSTD = 53.35;  // VB6 gas constant for air
const PSTD = 406.8;  // VB6 standard pressure (inH2O) - VB6 uses inH2O units for vpd calculations (14.696 psi * 27.68)

// VB6 CDETAILS.CLS lines 363-367: xlift() and yflow() arrays
// These are populated from gc_IntLift and gc_IntFlow controls
// Now passed as parameters from the caller (EngineSimConfig.flowBenchLifts_in / flowBenchFlows_cfm)

export interface FlowDetailPoint {
  angle_deg: number;
  valveLift_in: number;
  flowArea_sqin: number;
  pistonSpeed_fpm: number;
  flowDemand_cfm: number;
  flowbenchVel_fps: number;
  flowbenchTest_inH2O: number;
}

/**
 * Get VB6 flow details table angles
 * VB6 CDETAILS.CLS lines 380-620
 * Includes specific angles from IVO to IVC
 */
export function getVB6FlowDetailsAngles(
  duration_deg: number,
  lobeCenterline_deg: number
): number[] {
  // VB6 uses specific angles: IVO, 0, 30, 60, AngMPS, 90, 105, 120, 150, 180, 205, 237, IVC
  // For base case with duration=264, ILC=105:
  // IVO = 105 - 264/2 = -27
  // IVC = 105 + 264/2 = 237
  
  const IVO = lobeCenterline_deg - duration_deg / 2;
  const IVC = lobeCenterline_deg + duration_deg / 2;
  
  // VB6 specific angles (from CDETAILS.CLS)
  return [IVO, 0, 30, 60, 74.6, 90, 105, 120, 150, 180, 205, IVC];
}

/**
 * Calculate flow demand using exact VB6 logic
 * VB6 CDETAILS.CLS lines 411-442
 * 
 * This includes:
 * - Time delay for sound propagation (dt)
 * - Retarded angle calculation (zang)
 * - Quadratic equation for pressure drop (vpd)
 * - Dump loss corrections
 * - YFactor corrections
 */
function calcFlowDemandVB6(
  angle_deg: number,
  rpm: number,
  stroke_in: number,
  rodLength_in: number,
  bore_in: number,
  valveDia_in: number,
  valveLift_in: number,
  flowArea_sqin: number,
  numValves: number,
  flowAtLift_cfm: number,
  testPressure_inH2O: number
): { cfm: number; velocity: number; testPressure: number } {
  // VB6 constants and calculations
  const LRQS = rodLength_in / stroke_in;
  const lrqs2 = 2 * LRQS;
  const lrqsq = lrqs2 * lrqs2;
  const lrqs4 = 4 * LRQS;
  const zhp = rpm * PI * stroke_in / 12;
  const BArea = PI * bore_in * bore_in / 4;
  
  // VB6 line 123: degr = 60 + 459.67 (temperature in Rankine)
  // VB6 line 123: spd = Sqr(1.4 * GC * RSTD * degr) (speed of sound)
  const degr = 60 + 459.67;
  const spd = Math.sqrt(1.4 * GC * RSTD * degr);
  
  // Convert angle to radians
  const ang = angle_deg * PI / 180;
  const zsin = Math.sin(ang);
  const zcos = Math.cos(ang);
  const zsin2 = Math.sin(2 * ang);
  const zy = Math.sqrt(1 - zsin * zsin / lrqsq);
  
  // VB6 line 406: piston position
  const pxs = (stroke_in / 2) * (1 + lrqs2 - zcos - Math.sqrt(lrqsq - zsin * zsin));
  
  // VB6 line 409: piston speed
  const vxs = zhp * (zsin + (zsin2 / lrqs4) / zy);
  
  // VB6 line 412: time delay for sound propagation
  // VB6 line 119: ivd = gc_ValveDia.Value
  const ivd = valveDia_in;
  const dt = ((pxs + 0.1 * ivd) / 12) / (spd - vxs / 60);
  
  // VB6 line 413: retarded angle
  const zang = ang - dt * (rpm / 60) * 2 * PI;
  const zsinhp = Math.sin(zang);
  const zxs = zsinhp + (Math.sin(2 * zang) / lrqs4) / Math.sqrt(1 - zsinhp * zsinhp / lrqsq);
  
  // VB6 line 416: flow demand at retarded angle
  let cfmxs = zhp * zxs * BArea / 144;
  
  // VB6 lines 419-423: dump loss factor
  const qdump = numValves === 1 ? 1.593 : 1.204;
  
  let vpd = 0;
  let vel = 0;
  
  // VB6 lines 426-442: solve quadratic equation if valve is open
  // Note: VB6 uses > 0.05, so at exactly 0.05 the quadratic is not applied
  if (valveLift_in > 0.05 && flowArea_sqin > 0) {
    // VB6 lines 428-431: quadratic equation coefficients
    // VB6: A = (cfmxs * qdump / PSTD) ^ 2
    // VB6: B = -cfmxs ^ 2 * 2 * qdump / PSTD - FlowVal ^ 2 / gc_DeltaP.Value
    // VB6: c = cfmxs ^ 2
    // CRITICAL: VB6 uses PSTD in inH2O units here so vpd result is in inH2O
    const A = Math.pow(cfmxs * qdump / PSTD, 2);
    const B = -cfmxs * cfmxs * 2 * qdump / PSTD - flowAtLift_cfm * flowAtLift_cfm / testPressure_inH2O;
    const c = cfmxs * cfmxs;
    
    // VB6 line 431: solve quadratic (use negative root)
    // VB6: vpd = (-B - Sqr(B ^ 2 - 4 * A * c)) / (2 * A)
    const discriminant = B * B - 4 * A * c;
    if (discriminant >= 0) {
      vpd = (-B - Math.sqrt(discriminant)) / (2 * A); // VB6 uses negative root (line 431)
      
      // VB6 line 437: adjust flow demand for pressure drop and dump loss
      // Note: vpd is in inH2O, PSTD is in inH2O for dimensional consistency
      cfmxs = cfmxs * (1 - qdump * vpd / PSTD) / (1.044429 * (1 - 0.618 * vpd / PSTD));
      
      // VB6 line 441: calculate velocity
      vel = 2.4 * cfmxs / flowArea_sqin;
      
      // VB6 line 442: use sign of velocity for vpd
      if (vel < 0) vpd = -vpd;
    }
  }
  
  // VB6 clamps negative CFM to 0 at valve opening/closing points
  if (cfmxs < 0 && valveLift_in <= 0.05) {
    cfmxs = 0;
  }
  
  return {
    cfm: Math.round(cfmxs),
    velocity: Math.round(vel),
    testPressure: Math.round(vpd)
  };
}

/**
 * Calculate full flow details for a given RPM
 * VB6 CDETAILS.CLS lines 274-465
 *
 * @param flowbenchLifts - 1-indexed lift array (element 0 is dummy) from gc_IntLift
 * @param flowbenchFlows - 1-indexed flow array (element 0 is dummy) from gc_IntFlow
 * @param lastRow - number of valid data points (VB6 FindLastRow result)
 * @param testPressure_inH2O - flowbench test pressure from gc_DeltaP
 */
export function calcFlowDetailsForRPM(
  rpm: number,
  stroke_in: number,
  rodLength_in: number,
  bore_in: number,
  numValves: number,
  duration_deg: number,
  lobeCenterline_deg: number,
  maxLift_in: number,
  valveSeatData: FlowbenchValveSeatData,
  camType: VB6CamType = VB6CamType.NormalFlatTappet,
  flowbenchLifts?: number[],
  flowbenchFlows?: number[],
  lastRow?: number,
  testPressure_inH2O: number = 28.0
): FlowDetailPoint[] {
  // Build 1-indexed arrays for TABY (VB6 convention: element 0 is dummy)
  // If no flowbench data provided, return empty (caller should provide data)
  const xlifts = flowbenchLifts ?? [0];
  const yflows = flowbenchFlows ?? [0];
  const nRows = lastRow ?? Math.max(xlifts.length - 1, 0);

  const angles = getVB6FlowDetailsAngles(duration_deg, lobeCenterline_deg);
  
  return angles.map(angle => {
    // Calculate piston kinematics at this angle
    const kinematics = calcPistonKinematicsAtAngle(angle, rpm, stroke_in, rodLength_in);
    
    // Calculate valve lift using exact VB6 cam profile interpolation
    const valveLift = vb6ValveLiftAtAngle(
      angle,
      camType,
      duration_deg,
      lobeCenterline_deg,
      maxLift_in
    );
    
    // Calculate effective flow area
    const flowArea = calcEffectiveFlowArea(valveLift, valveSeatData, numValves);
    
    // VB6 line 427: Call TABY(xlift(), yflow(), LastRow, 1, vl, FlowVal)
    // Get flow at this lift using TABY interpolation of flowbench data
    const flowAtLift_cfm = (valveLift > 0.05 && nRows > 0)
      ? TABY(xlifts, yflows, nRows, 1, valveLift)
      : 0;
    
    // Calculate flow demand using exact VB6 logic
    const flowResult = calcFlowDemandVB6(
      angle,
      rpm,
      stroke_in,
      rodLength_in,
      bore_in,
      valveSeatData.valveDia_in, // VB6 line 119: ivd = gc_ValveDia.Value
      valveLift,
      flowArea,
      numValves,
      flowAtLift_cfm,
      testPressure_inH2O
    );
    
    return {
      angle_deg: angle,
      valveLift_in: valveLift,
      flowArea_sqin: flowArea,
      pistonSpeed_fpm: kinematics.pistonSpeed_fpm,
      flowDemand_cfm: flowResult.cfm,
      flowbenchVel_fps: flowResult.velocity,
      flowbenchTest_inH2O: flowResult.testPressure,
    };
  });
}
