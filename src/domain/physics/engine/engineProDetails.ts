/**
 * Engine Pro Details Calculations
 * Ports VB6 CDETAILS.CLS exactly
 */

import type { EngineProConfig } from './engineProSim';
import type { EngineSimConfig } from './engineAdapter';
import { DTABY } from './vb6Interpolation';
import { getCalculatedCamDefaults } from './camDefaults';

const PI = Math.PI;
const GC = 32.174; // gravitational constant

/**
 * Calculate angle of maximum piston speed
 * From VB6 ENGPERF.BAS
 */
// @ts-expect-error - Reserved for future use
function calcAngMPS(lrqs: number): number {
  // Maximum piston speed angle (degrees ATDC)
  const lrqs2 = 2 * lrqs;
  const angRad = Math.asin(1 / lrqs2);
  return angRad * 180 / PI;
}

/**
 * Mechanical Details Data Point
 */
export interface MechDetailPoint {
  angle_deg: number;
  pistonDepth_in: number;
  pistonSpeed_fpm: number;
  pistonSpeed_fps: number;
  pistonAccel_gs: number;
}

/**
 * Calculate mechanical details at specified RPM
 * Ports VB6 CDETAILS.CLS CalcMechDetails function (lines 98-271)
 * 
 * VB6 Reference: EPro3w\CDETAILS.CLS lines 98-271
 * 
 * @param smoothCurve If true, generates points every 5 degrees for smooth graphing (default: true)
 */
export function calcMechDetails(
  rpm: number,
  stroke_in: number,
  rodLength_in: number,
  smoothCurve: boolean = true
): MechDetailPoint[] {
  const PI = Math.PI;
  const GC = 32.174; // gravitational constant ft/s^2
  
  // Calculate rod/stroke ratio (VB6 line 122)
  const LRQS = rodLength_in / stroke_in;
  const lrqs2 = 2 * LRQS;
  const lrqsq = lrqs2 ** 2;
  const lrqs4 = 4 * LRQS;
  
  // zhp = RPM * PI * stroke / 12 (VB6 line 121)
  const zhp = rpm * PI * stroke_in / 12;
  
  // Determine angles to calculate
  let angles: number[];
  if (smoothCurve) {
    // Generate smooth curve with points every 5 degrees
    angles = [];
    for (let deg = 0; deg <= 180; deg += 5) {
      angles.push(deg);
    }
  } else {
    // VB6 table display points only (lines 110-114)
    const AngMPS = Math.asin(1 / Math.sqrt(1 + LRQS ** 2)) * 180 / PI;
    angles = [5, 15, 30, 45, 60, AngMPS, 80, 85, 90, 105, 120, 135, 150, 165, 180];
  }
  
  const results: MechDetailPoint[] = [];
  
  // VB6 lines 125-155
  for (const angleDeg of angles) {
    const ang = angleDeg * PI / 180;
    const zsin = Math.sin(ang);
    const zcos = Math.cos(ang);
    const zsin2 = Math.sin(2 * ang);
    const zcos2 = Math.cos(2 * ang);
    const zy = Math.sqrt(1 - zsin ** 2 / lrqsq);
    
    // Calculate piston position - inch (VB6 line 131)
    const pxs = (stroke_in / 2) * (1 + lrqs2 - zcos - Math.sqrt(lrqsq - zsin ** 2));
    
    // Calculate piston speed - ft/min (VB6 lines 134-135)
    let vxs = zhp * (zsin + (zsin2 / lrqs4) / zy);
    if (vxs < 0) vxs = 0;
    
    // Calculate piston acceleration - g's (VB6 lines 138-140)
    let zxs = zcos + (zcos2 / lrqs2) / zy + (zsin2 ** 2 / (4 * lrqs2 ** 3)) / zy ** 3;
    zxs = zxs / (stroke_in / 24);
    const axs = (zhp / 60) ** 2 * zxs / GC;
    
    results.push({
      angle_deg: angleDeg,
      pistonDepth_in: pxs,
      pistonSpeed_fpm: vxs,
      pistonSpeed_fps: vxs / 60,
      pistonAccel_gs: axs,
    });
  }
  
  return results;
}

/**
 * Flow Details Data Point
 */
export interface FlowDetailPoint {
  angle_deg: number;
  eventLabel: string;
  valveLift_in: number;
  flowArea_sqin: number;
  pistonSpeed_fpm: number;
  flowDemand_cfm: number;
  flowVelocity_fps: number;
  testPressure_inH2O: number;
}

/**
 * Calculate valve lift at a specific crank angle using VB6 DTABY interpolation
 * VB6 CDETAILS.CLS CalcMechDetails function lines 380-399
 */
function calcValveLift(
  angleDeg: number,
  duration_deg: number,
  lobeCenterline_deg: number,
  maxLift_in: number,
  camType: number
): number {
  // VB6 cam lift profile data (CDETAILS.CLS lines 327-343)
  // xangle: angle from lobe centerline (% of half duration)
  const xangle = [0, 0, 8, 15, 23, 31, 40, 50, 58, 66, 73, 80, 87, 94, 100, 106, 114.3];
  
  // z50: lift % at 50% duration for each cam type (6 types)
  const z50 = [0, 69, 67.75, 66.5, 65.25, 64, 62.75];
  
  // ylift: 2D array of lift % vs angle and cam type
  // Stored as flattened array: ylift[camType * 16 + angleIndex]
  // VB6: ylift(angleIndex + (camType-1)*16)
  const ylift = [
    0, // dummy for 1-based indexing
    // Cam type 1 (z50=69)
    100, 99.14, 97.38, 93.81, 88.59, 80.59, 69, 57.97, 45.47, 34.02, 22.96, 13.21, 5.32, 0, -3.97, -7.2,
    // Cam type 2 (z50=67.75)
    100, 99.05, 97.15, 93.37, 87.9, 79.61, 67.75, 56.61, 44.22, 33.06, 22.45, 13.12, 5.39, 0, -4.12, -7.2,
    // Cam type 3 (z50=66.5)
    100, 99.02, 97.04, 93.06, 87.33, 78.68, 66.5, 55.29, 43.1, 32.27, 22.02, 12.97, 5.38, 0, -4.19, -7.2,
    // Cam type 4 (z50=65.25)
    100, 99, 96.94, 92.76, 86.7, 77.64, 65.25, 54.15, 42.38, 32.03, 22.15, 13.2, 5.51, 0, -4.28, -7.2,
    // Cam type 5 (z50=64)
    100, 98.94, 96.76, 92.37, 86.04, 76.65, 64, 52.87, 41.28, 31.2, 21.6, 12.88, 5.38, 0, -4.2, -7.2,
    // Cam type 6 (z50=62.75)
    100, 98.91, 96.69, 92.2, 85.66, 75.9, 62.75, 51.29, 39.6, 29.69, 20.53, 12.36, 5.25, 0, -4.2, -7.2
  ];
  
  // Map camType to z50 index (VB6 CDETAILS.CLS lines 346-353)
  let zz50: number;
  switch (camType) {
    case 0: zz50 = 69; break;      // Roller Cam & Lifter (Pro only)
    case 1: zz50 = 67.1; break;    // Roller Cam & Lifter
    case 2: zz50 = 66.7; break;    // Mushroom Tappet
    case 3: zz50 = 66.5; break;    // High Rate-of-Lift Flat Tappet
    case 4: zz50 = 66; break;      // Normal Flat Tappet & Solid Lifter
    case 5: zz50 = 64; break;      // Hydraulic Roller Cam & Lifter
    default: zz50 = 62.75; break;  // Normal Hydraulic Cam & Lifter
  }
  
  // Calculate angle relative to lobe centerline
  const halfDuration = duration_deg / 2;
  const ivoAngle = lobeCenterline_deg - halfDuration;
  const ivcAngle = lobeCenterline_deg + halfDuration;
  
  // VB6 lines 383-384: Check if valve is closed (before IVO)
  if (angleDeg < ivoAngle) {
    return 0; // Valve not yet open
  }
  
  // VB6 line 398: At IVC, valve is at lash (0.050")
  if (angleDeg >= ivcAngle) {
    return 0.05; // Valve closed (0.050" lash)
  }
  
  // VB6 line 391: At lobe centerline, valve is at max lift
  if (Math.abs(angleDeg - lobeCenterline_deg) < 0.1) {
    return maxLift_in;
  }
  
  // VB6 lines 386-389: Before lobe centerline (opening)
  // VB6 lines 393-396: After lobe centerline (closing)
  // zang = 100 * |angle - lobeCenterline| / halfDuration
  const angleFromCenter = Math.abs(angleDeg - lobeCenterline_deg);
  const zang = 100 * angleFromCenter / halfDuration;
  
  // Use VB6 DTABY Lagrangian interpolation
  // DTABY(xangle(), z50(), ylift(), 16, 6, 2, 1, zang, zz50, work)
  const liftPct = DTABY(xangle, z50, ylift, 16, 6, 2, 1, zang, zz50);
  
  // VB6 line 389, 396: vl = 0.05 + (maxLift - 0.05) * work / 100
  return 0.05 + (maxLift_in - 0.05) * liftPct / 100;
}

/**
 * Calculate curtain area (flow area) for a given valve lift
 * VB6 CalcWSCSArea function (ENGPERF.BAS lines 1262-1310)
 * 
 * @param valveLift_in - Valve lift in inches
 * @param valveDia_in - Valve head diameter in inches
 * @param seatDia_in - Valve seat throat diameter in inches (default: 90% of valve dia)
 * @param stemDia_in - Valve stem diameter in inches (default: 0.344)
 * @param seatAngle_deg - Valve seat angle in degrees (default: 45)
 * @param seatWidth_in - Valve seat width in inches (default: 0.08)
 * @param numValves - Number of intake valves per cylinder
 */
function calcCurtainArea(
  valveLift_in: number,
  valveDia_in: number,
  numValves: number,
  seatDia_in?: number,
  stemDia_in?: number,
  seatAngle_deg?: number,
  seatWidth_in?: number
): number {
  const PI = 3.141593;
  
  // VB6 defaults
  const vd = valveDia_in;
  const vsd = seatDia_in ?? (0.90 * valveDia_in);  // Default 90% of valve dia
  const vstmd = stemDia_in ?? 0.344;               // Default stem diameter
  const vsAngle = seatAngle_deg ?? 45;             // Default 45 degrees
  const vsWidth = seatWidth_in ?? 0.08;            // Default 0.08 inch
  
  // VB6 line 1281-1282: calculate trig functions for valve seat angle
  const vsa = vsAngle * PI / 180;
  const sinb = Math.sin(vsa);
  const cosb = Math.cos(vsa);
  const tanb = Math.tan(vsa);
  
  // VB6 line 1285: convert input valve seat width to Heywood definition
  const w = vsWidth * cosb;
  
  // VB6 line 1288: very low lift - where valve seat really controls
  const a1 = numValves * PI * (valveLift_in * cosb) * (vd - 2 * w + valveLift_in * sinb * cosb);
  
  // VB6 lines 1291-1293: valve curtain area - moderate valve lift
  let H = Math.sqrt(Math.pow(valveLift_in - w * tanb, 2) + w * w);
  if (valveLift_in === 0) H = 0;
  const a2 = numValves * PI * (vd - w) * H;
  
  // VB6 line 1296: valve throat area - high valve lift
  const a3 = numValves * PI * (vsd * vsd - vstmd * vstmd) / 4;
  
  // VB6 lines 1299-1304: choose the controlling flow area
  let work: number;
  if (valveLift_in < w / (sinb * cosb)) {
    work = a1;
  } else {
    work = a2;
    if (a3 < work) work = a3;
  }
  
  return work;
}

/**
 * Calculate Flow Details at a specific RPM
 * Ports VB6 CalcFlowDetails from CDETAILS.CLS lines 274-657
 */
export function calcFlowDetails(
  rpm: number,
  stroke_in: number,
  rodLength_in: number,
  bore_in: number,
  valveDia_in: number,
  numValves: number,
  duration_deg: number,
  lobeCenterline_deg: number,
  maxLift_in: number,
  camType: number
): FlowDetailPoint[] {
  // VB6 LRQS = rod / stroke (not rod / (stroke/2))
  const LRQS = rodLength_in / stroke_in;
  // VB6 AngMPS formula from ENGPERF.BAS line 65
  const angMPS = 62 + Math.pow(750 * (LRQS - 0.958), 0.4027);
  
  // VB6 lines 301-318: Angles to calculate
  // VB6 uses advertised duration for IVO/IVC calculation
  const ivoAngle = lobeCenterline_deg - duration_deg / 2;
  const ivcAngle = lobeCenterline_deg + duration_deg / 2;
  
  // VB6 CDETAILS.CLS lines 301-324: Build angles array
  // If IVO > 0 (after TDC), swap so TDC comes first
  // If IVO <= 0 (before TDC), IVO comes first
  let angles: { angle: number; label: string }[];
  
  if (ivoAngle > 0) {
    // IVO is after TDC - TDC comes first
    angles = [
      { angle: 0, label: 'TDC' },
      { angle: ivoAngle, label: 'IVO @ .050"' },
      { angle: 30, label: '30 deg ATDC' },
      { angle: 60, label: '60 deg ATDC' },
      { angle: angMPS, label: 'Max Piston FPM' },
      { angle: 90, label: '90 deg ATDC' },
      { angle: lobeCenterline_deg, label: 'ILC - Max Lift' },
      { angle: 120, label: '120 deg ATDC' },
      { angle: 150, label: '150 deg ATDC' },
      { angle: 180, label: 'BDC' },
      { angle: ivcAngle < 240 ? Math.floor((180 + ivcAngle) / 2 / 5) * 5 : 210, label: ivcAngle < 240 ? `${Math.floor((180 + ivcAngle) / 2 / 5) * 5 - 180} deg ABDC` : '210 deg ATDC' },
      { angle: ivcAngle, label: 'IVC @ .050"' },
    ];
  } else {
    // IVO is before TDC - IVO comes first
    angles = [
      { angle: ivoAngle, label: 'IVO @ .050"' },
      { angle: 0, label: 'TDC' },
      { angle: 30, label: '30 deg ATDC' },
      { angle: 60, label: '60 deg ATDC' },
      { angle: angMPS, label: 'Max Piston FPM' },
      { angle: 90, label: '90 degree' },
      { angle: lobeCenterline_deg, label: 'ILC - Max Lift' },
      { angle: 120, label: '120 deg ATDC' },
      { angle: 150, label: '150 deg ATDC' },
      { angle: 180, label: 'BDC' },
      { angle: ivcAngle < 240 ? Math.floor((180 + ivcAngle) / 2 / 5) * 5 : 210, label: ivcAngle < 240 ? `${Math.floor((180 + ivcAngle) / 2 / 5) * 5 - 180} deg ABDC` : '210 deg ATDC' },
      { angle: ivcAngle, label: 'IVC @ .050"' },
    ];
  }
  
  // VB6 CDETAILS.CLS line 374: zhp = RPM * PI * stroke / 12
  const zhp = rpm * PI * stroke_in / 12;
  // VB6 line 375: lrqs2 = 2 * LRQS
  const lrqs2 = 2 * LRQS;
  const lrqsq = lrqs2 * lrqs2;
  const lrqs4 = 4 * LRQS;
  const BArea = PI * bore_in * bore_in / 4;
  
  // Speed of sound calculation (VB6 CDETAILS.CLS line 376)
  // VB6: degr = 60 + 459.67: spd = Sqr(1.4 * GC * RSTD * degr)
  const degr = 60 + 459.67;
  const RSTD = 53.345; // VB6 gas constant from DECLARES.BAS
  const spd = Math.sqrt(1.4 * GC * RSTD * degr);
  
  const points: FlowDetailPoint[] = [];
  
  for (const angleData of angles) {
    const angleDeg = angleData.angle;
    const ang = angleDeg * PI / 180;
    const zsin = Math.sin(ang);
    const zcos = Math.cos(ang);
    const zsin2 = Math.sin(2 * ang);
    
    // Calculate valve lift (VB6 lines 381-399)
    const vl = calcValveLift(angleDeg, duration_deg, lobeCenterline_deg, maxLift_in, camType);
    
    // Calculate flow area (VB6 line 402)
    const flowArea = calcCurtainArea(vl, valveDia_in, numValves);
    
    // Calculate piston position (VB6 line 406)
    const pxs = (stroke_in / 2) * (1 + lrqs2 - zcos - Math.sqrt(lrqsq - zsin * zsin));
    
    // Calculate piston speed (VB6 line 409)
    const vxs = zhp * (zsin + (zsin2 / lrqs4) / Math.sqrt(1 - zsin * zsin / lrqsq));
    
    // Estimate piston induced valve flow demand (VB6 lines 412-416)
    const dt = ((pxs + 0.1 * valveDia_in) / 12) / (spd - vxs / 60);
    const zang = ang - dt * (rpm / 60) * 2 * PI;
    const zsinhp = Math.sin(zang);
    const zxs = zsinhp + (Math.sin(2 * zang) / lrqs4) / Math.sqrt(1 - zsinhp * zsinhp / lrqsq);
    const cfmxs = zhp * zxs * BArea / 144;
    
    // Calculate flow velocity (VB6 line 441)
    const vel = flowArea > 0 ? 2.4 * cfmxs / flowArea : 0;
    
    points.push({
      angle_deg: angleDeg,
      eventLabel: angleData.label,
      valveLift_in: vl,
      flowArea_sqin: flowArea,
      pistonSpeed_fpm: vxs,
      flowDemand_cfm: cfmxs,
      flowVelocity_fps: vel,
      testPressure_inH2O: 0 // Simplified - VB6 calculates from quadratic equation
    });
  }
  
  return points;
}

/**
 * Recommendation values
 */
export interface EngineRecommendations {
  // Intake system
  intakeValveLift_in: number;
  intakeMinFlowArea_sqin: number;
  intakeTrackLength_in: number;
  intakeMaxFlowArea_sqin: number;  // MISSING - at entry
  intakeTrackVolume_cc: number;    // MISSING
  intakeTrackDia_in: number;       // Calculated from min area
  intakePlenumVolume_ci: number;
  
  // Exhaust system
  exhaustFlow_cfm: number;
  exhaustFlow_pctIntake: number;
  exhaustValveDia_in: number;
  exhaustValveDiaMin_in: number;   // Min of range
  exhaustValveDiaMax_in: number;   // Max of range
  exhaustValveLift_in: number;
  exhaustMinFlowArea_sqin: number;
  exhaustMaxFlowArea_sqin: number;
  exhaustPrimaryLength_in: number;
  exhaustPrimaryDia_in: number;
  exhaustCollectorDia_in: number;
  
  // Camshaft
  lobeSeparationAngle_deg: number;
  intakeLobeCenterline_deg: number;
  exhaustDuration_deg: number;
}

/**
 * Calculate Engine Recommendations
 * Ports VB6 CalcRecommendations from ENGPERF.BAS lines 668-1074
 * 
 * Accepts either EngineProConfig or EngineSimConfig
 * 
 * IMPORTANT: This function requires values calculated from the full engine simulation.
 * If these are not provided, it will use estimates which will NOT match VB6 accurately.
 */
export function calcRecommendations(
  config: EngineProConfig | EngineSimConfig,
  _peakHP: number,
  rpmAtPeakHP: number,
  _peakTQ: number,
  rpmAtPeakTQ: number,
  // REQUIRED calculated values from engine simulation for VB6 accuracy
  calculatedValues: {
    hpcfm: number;      // CFM at peak HP
    tqcfm: number;      // CFM at peak TQ
    hpfps: number;      // Piston speed at peak HP (ft/sec)
    tqfps: number;      // Piston speed at peak TQ (ft/sec)
    RamVEHP: number;    // Ram volumetric efficiency at HP
    EffCR: number;      // Effective compression ratio
    acrit: number;      // Critical area ratio
    flrqs: number;      // Rod ratio factor
  }
): EngineRecommendations {
  // VB6 DECLARES.BAS constants
  const PI = 3.141593;
  const GC = 32.174;
  const RSTD = 53.345;  // VB6 gas constant (NOT 1716!)
  const GAM = 1.28;     // VB6 uses 1.28 for fuel GAM, 1.4 for air
  
  // Engine geometry (VB6 global variables)
  const bore = config.bore_in;
  const stroke = config.stroke_in;
  const numCyl = config.numCylinders;
  const CID = PI * bore * bore / 4 * stroke * numCyl;
  const cylCID = CID / numCyl;
  const BArea = PI * bore * bore / 4;
  const LRQS = config.rodLength_in / stroke;
  
  // Use calculated values from engine simulation (REQUIRED)
  const { hpcfm, tqcfm, hpfps, RamVEHP, EffCR, acrit, flrqs } = calculatedValues;
  
  // VB6 global variable AngMPS (ENGPERF.BAS line 65)
  // AngMPS = 62 + (750 * (LRQS - 0.958)) ^ 0.4027
  const AngMPS = 62 + Math.pow(750 * (LRQS - 0.958), 0.4027);
  
  // Valve and cam data
  const vd = config.intakeValveDia_in;
  const inCamDur = config.intakeDuration050_deg;
  
  // Get LSA and ILC - use provided values or calculate defaults
  let lobeSepAng: number;
  let inLobeCL: number;
  
  if ('lobeSeparationAngle_deg' in config && config.lobeSeparationAngle_deg !== undefined) {
    // User provided LSA
    lobeSepAng = config.lobeSeparationAngle_deg;
  } else {
    // Calculate default LSA - pass EffCR from engine simulation
    const defaults = getCalculatedCamDefaults(
      rpmAtPeakHP,
      inCamDur,
      config.rodLength_in,
      stroke,
      config.compressionRatio,
      config.fuelType,
      EffCR  // Use EffCR from engine simulation
    );
    lobeSepAng = defaults.lobeSeparationAngle_deg;
  }
  
  if ('intakeLobeCenterline_deg' in config && config.intakeLobeCenterline_deg !== undefined) {
    // User provided ILC
    inLobeCL = config.intakeLobeCenterline_deg;
  } else {
    // Calculate default ILC - pass EffCR from engine simulation
    const defaults = getCalculatedCamDefaults(
      rpmAtPeakHP,
      inCamDur,
      config.rodLength_in,
      stroke,
      config.compressionRatio,
      config.fuelType,
      EffCR  // Use EffCR from engine simulation
    );
    inLobeCL = defaults.intakeLobeCenterline_deg;
  }
  
  // Map camshaft type string to number
  const camTypeMap: Record<string, number> = {
    'overhead_cam': 0,
    'roller': 1,
    'mushroom_tappet': 2,
    'high_rate_flat_tappet': 3,
    'normal_flat_tappet': 4,
    'hydraulic_roller': 5,
    'hydraulic_flat_tappet': 6
  };
  const camType = camTypeMap[config.camshaftType] || 0;
  
  // Map manifold type string to number (needed early for epek calculation)
  const manifoldTypeMap: Record<string, number> = {
    'plenum': 1,
    'individual_runner': 2,
    'dual_plane_divided': 3,
    'dual_plane_slot': 4
  };
  const manifoldTypeNum = manifoldTypeMap[config.intakeManifoldType] || 1;
  
  // VB6 lines 715-726: Cam durations
  const InAdvDur = 1.08 * inCamDur + 10;
  
  // VB6 lines 138-165: Calculate epek (manifold effect on intake ramming)
  // Map engine layout: 0=inline, 1=vee, 2=flat
  const engineLayoutMap: Record<string, number> = {
    'inline': 0,
    'vee': 1,
    'flat': 2
  };
  const engineLayout = engineLayoutMap[(config as { engineLayout?: string }).engineLayout || 'vee'] ?? 1;
  
  let epek = 1;
  switch (manifoldTypeNum) {
    case 1: // common plenum
      switch (engineLayout) {
        case 0: epek = 0.9; break;
        case 1: epek = numCyl <= 4 ? 0.92 : 1; break;
        case 2: epek = numCyl <= 4 ? 0.92 : 0.98; break;
      }
      if (numCyl <= 2) epek = 0.875;
      break;
    case 2: // individual runner
      epek = 0.85;
      break;
    case 3: // dual plane/100% divided plenum
      switch (engineLayout) {
        case 0: epek = 0.875; break;
        case 1: epek = numCyl <= 8 ? 0.9 : 0.92; break;
        case 2: epek = numCyl <= 4 ? 0.875 : 0.9; break;
      }
      if (numCyl <= 2) epek = 0.85;
      break;
    case 4: // dual plane w/small slot
      switch (engineLayout) {
        case 0: epek = 0.885; break;
        case 1: epek = numCyl <= 8 ? 0.92 : 0.94; break;
        case 2: epek = numCyl <= 4 ? 0.885 : 0.91; break;
      }
      if (numCyl <= 2) epek = 0.86;
      break;
  }
  if (numCyl === 1) epek = 0.85; // all single cylinder engines are IR
  
  // VB6 lines 720-725: Exhaust cam duration
  let ExCamDur = inCamDur * (flrqs / 1.038);
  // VB6 line 723: intake runner pressure effect during overlap
  ExCamDur = ExCamDur + Math.pow(epek, 6) * 12;
  const ExAdvDur = 1.08 * ExCamDur + 10;
  const ExLobeCL = 2 * lobeSepAng - inLobeCL;
  
  // VB6 lines 729-735: Speed of sound for intake
  // Map fuel type string to number
  const fuelTypeMap: Record<string, number> = {
    'gasoline': 1,
    'racing_gasoline': 2,
    'methanol': 3
  };
  const fuelTypeNum = fuelTypeMap[config.fuelType] || 1;
  const degr_intake = (fuelTypeNum === 3 ? 0 : 30) + 459.67;
  // VB6 line 735: spd = Sqr(1.4 * GC * RSTD * degr)
  const spd_intake = Math.sqrt(1.4 * GC * RSTD * degr_intake);
  
  // VB6 lines 738-755: Intake valve max lift
  let bin: number;
  switch (camType) {
    case 0: bin = 0.38; break;
    case 1: bin = 0.38; break;
    case 2: bin = 0.33; break;
    case 3: bin = 0.31; break;
    case 4: bin = 0.31; break;
    case 5: bin = 0.29; break;
    default: bin = 0.26; break;
  }
  let intakeValveLift = bin * vd * Math.pow(hpfps / 130, 0.5);
  const zmin_lift = 0.24 * vd;
  const zmax_lift = 0.41 * vd;
  if (intakeValveLift < zmin_lift) intakeValveLift = zmin_lift;
  if (intakeValveLift > zmax_lift) intakeValveLift = zmax_lift;
  
  // VB6 lines 758-792: Intake minimum flow area
  const FlowBenchCorr = 1.0; // VB6 global variable
  const maxInFlow = config.maxIntakeFlow_cfm || 250;
  let intakeMinFlowArea: number;
  if (config.numIntakeValvesPerCyl === 1) {
    intakeMinFlowArea = maxInFlow * FlowBenchCorr / 133;
  } else {
    intakeMinFlowArea = maxInFlow * FlowBenchCorr / 137;
  }
  
  // VB6 lines 769-775: Raise minimum throat area
  let zmin = 0.18 * BArea;
  if (zmin < cylCID / 17.4) zmin = cylCID / 17.4;
  if (BArea * hpfps / zmin > 625) zmin = BArea * hpfps / 625;
  
  // VB6 lines 777-784: Average throat velocity at Peak TQ
  let fpsk = 0.3245096 * spd_intake;
  if (fuelTypeNum === 3) fpsk = fpsk / 1.06; // methanol
  const zy_tq = (2.4 * tqcfm / numCyl) / (fpsk / 4);
  if (zmin < zy_tq) zmin = zy_tq;
  if (intakeMinFlowArea < zmin) intakeMinFlowArea = zmin;
  
  // VB6 lines 786-787: acrit maximum area ratio rule
  let zmax = BArea / acrit;
  if (intakeMinFlowArea > zmax) intakeMinFlowArea = zmax;
  
  // VB6 lines 789-791: 94% throat area rule
  const zvsw = 0.94;
  zmax = config.numIntakeValvesPerCyl * (PI * vd * vd / 4) * (zvsw * zvsw - 0.02);
  if (intakeMinFlowArea > zmax) intakeMinFlowArea = zmax;
  
  // VB6 lines 795-820: Intake track length
  // VB6 line 797: RPM = 0.75 * gc_RPMPeakTQ.Value + 0.25 * gc_RPMPeakHP.Value
  let RPM = 0.75 * rpmAtPeakTQ + 0.25 * rpmAtPeakHP;
  
  // VB6 line 799: lrqs2 = 2 * LRQS
  const lrqs2 = 2 * LRQS;
  // VB6 line 800: ang = AngMPS * PI / 180
  const ang = AngMPS * PI / 180;
  const zsin = Math.sin(ang);
  // VB6 line 801: zy = Sqr(1 - (zsin / lrqs2) ^ 2)
  const zy = Math.sqrt(1 - Math.pow(zsin / lrqs2, 2));
  // VB6 line 802: pxs = (stroke / 2) * (1 + lrqs2 - Cos(ang) - Sqr(lrqs2 ^ 2 - zsin ^ 2))
  const pxs = (stroke / 2) * (1 + lrqs2 - Math.cos(ang) - Math.sqrt(lrqs2 * lrqs2 - zsin * zsin));
  // VB6 line 803: vxs = (RPM * PI * stroke / 12) * (zsin + (Sin(2 * ang) / (2 * lrqs2)) / zy)
  const vxs = (RPM * PI * stroke / 12) * (zsin + (Math.sin(2 * ang) / (2 * lrqs2)) / zy);
  // VB6 line 804: dt = ((pxs + 0.1 * vd) / 12) / (spd - vxs / 60)
  const dt = ((pxs + 0.1 * vd) / 12) / (spd_intake - vxs / 60);
  // VB6 line 805: da = (dt / 60) * RPM * 360
  const da = (dt / 60) * RPM * 360;
  // VB6 line 806: dur1 = gc_InLobeCL.Value + (InAdvDur / 2) - (AngMPS + da)
  const dur1 = inLobeCL + (InAdvDur / 2) - (AngMPS + da);
  // VB6 line 807: spd1 = spd - 0.95 * (vxs / 60) / (gc_CSArea.Value / BArea)
  // gc_CSArea is a USER INPUT in VB6 (default 2.4 sq.in. per ENGPERF.BAS line 2263)
  // It represents the actual intake port minimum cross-section area
  // Use config.intakePortCSArea_sqin if provided, otherwise use VB6 default of 2.4
  const gc_CSArea = (config as { intakePortCSArea_sqin?: number }).intakePortCSArea_sqin || 2.4;
  let spd1 = spd_intake - 0.95 * (vxs / 60) / (gc_CSArea / BArea);
  // VB6 lines 808-809: zmin = spd - 0.6 * spd; If spd1 < zmin Then spd1 = zmin
  let zmin_spd = spd_intake - 0.6 * spd_intake;
  if (spd1 < zmin_spd) spd1 = zmin_spd;
  // VB6 line 810: ritl1 = 12 * (dur1 / 360) / (RPM / 60) / (1 / spd1 + 3 / spd)
  const ritl1 = 12 * (dur1 / 360) / (RPM / 60) / (1 / spd1 + 3 / spd_intake);
  
  // VB6 lines 812-815: Second wave calculation
  // VB6 line 813: RPM = gc_Shift.Value
  const shift = (config as { shift_rpm?: number }).shift_rpm || rpmAtPeakHP * 1.08;
  RPM = shift;
  // VB6 line 814: dur2 = 720 - InAdvDur
  const dur2 = 720 - InAdvDur;
  // VB6 line 815: ritl2 = (dur2 / 360) * 60 * spd * 12 / (2 * wave * RPM)
  // wave = 4 for closing wave
  const ritl2 = (dur2 / 360) * 60 * spd_intake * 12 / (2 * 4 * RPM);
  
  // VB6 lines 817-820: Weight both values
  let intakeTrackLength = 0.6 * ritl1 + 0.4 * ritl2;
  if (intakeTrackLength < ritl1) intakeTrackLength = ritl1;
  
  // VB6 lines 823-830: Intake track volume
  let intakeTrackVol = 1.2 * cylCID * flrqs * Math.pow(PI * dur1 / 720, 2);
  const zmin_vol = 1.1 * intakeTrackLength * intakeMinFlowArea;
  if (intakeTrackVol < zmin_vol) intakeTrackVol = zmin_vol;
  
  // VB6 lines 833-857: Intake max flow area
  const avgica = intakeTrackVol / intakeTrackLength;
  let intakeMaxFlowArea = avgica + 2.6 * (avgica - intakeMinFlowArea);
  if (BArea * hpfps / intakeMaxFlowArea > 390) {
    intakeMaxFlowArea = BArea * hpfps / 390;
  }
  
  // VB6 lines 860-879: Plenum volume
  // manifoldTypeNum already declared above for epek calculation
  let npipes = numCyl;
  if (manifoldTypeNum >= 3) {
    npipes = Math.floor(numCyl / 2);
    if (npipes === 0) npipes = 1;
  }
  let nrev = npipes / 2;
  if (numCyl >= 8) nrev = npipes / 4;
  if (nrev === 0) nrev = 1;
  
  let plenumVol = intakeTrackVol + numCyl * CID * Math.pow(79 / (nrev * rpmAtPeakTQ / 60), 2);
  if (plenumVol < cylCID) plenumVol = cylCID;
  if (plenumVol > CID) plenumVol = CID;
  
  // VB6 lines 882-888: Speed of sound for exhaust
  // VB6 line 883-886: degr = 1100 + 459.67 (methanol) or 1250 + 459.67 (gasoline)
  const degr_exhaust = (fuelTypeNum === 3 ? 1100 : 1250) + 459.67;
  // VB6 line 888: spd = Sqr(GAM * GC * RSTD * degr)
  // Note: VB6 uses GAM = 1.28 from fuel properties
  const spd_exhaust = Math.sqrt(GAM * GC * RSTD * degr_exhaust);
  
  // VB6 lines 891-903: Exhaust flow
  // VB6 line 894: .Value = (RamVEHP * hpcfm / gc_NoCyl.Value) / FlowBenchCorr / 725
  let exhaustFlow = (RamVEHP * hpcfm / numCyl) / FlowBenchCorr / 725;
  // VB6 line 895: dur = ExLobeCL + ExAdvDur / 2 (TDC - EVO @ adv dur)
  const dur_evo = ExLobeCL + ExAdvDur / 2;
  // VB6 line 896: .Value = .Value * gc_RPMPeakHP.Value ^ 0.8 * (270 / dur) ^ 0.8
  exhaustFlow = exhaustFlow * Math.pow(rpmAtPeakHP, 0.8) * Math.pow(270 / dur_evo, 0.8);
  // VB6 line 897: .Value = .Value / (EffCR / crx) ^ 0.5 / (flrqs / 1.038)
  // crx is the fuel's max compression ratio (11.5 for gasoline, 13.5 for methanol)
  const crx = fuelTypeNum === 3 ? 13.5 : 11.5;
  exhaustFlow = exhaustFlow / Math.pow(EffCR / crx, 0.5) / (flrqs / 1.038);
  
  const zmin_exflow = 0.64 * maxInFlow;
  const zmax_exflow = 0.86 * maxInFlow;
  if (exhaustFlow < zmin_exflow) exhaustFlow = zmin_exflow;
  if (exhaustFlow > zmax_exflow) exhaustFlow = zmax_exflow;
  
  // VB6 lines 906-955: Exhaust minimum flow area
  let exhaustMinFlowArea: number;
  if (config.numIntakeValvesPerCyl === 1) {
    exhaustMinFlowArea = exhaustFlow * FlowBenchCorr / 195;
  } else {
    exhaustMinFlowArea = exhaustFlow * FlowBenchCorr / 180;
  }
  
  let zmin_ex = 0.11 * BArea;
  if (BArea * hpfps / zmin_ex > 1450) zmin_ex = BArea * hpfps / 1450;
  const zy_ex = 0.46 * intakeMinFlowArea;
  if (zmin_ex < zy_ex) zmin_ex = zy_ex;
  if (exhaustMinFlowArea < zmin_ex) exhaustMinFlowArea = zmin_ex;
  
  // VB6 lines 958-975: Exhaust valve lift
  let bin_ex: number;
  switch (camType) {
    case 0: bin_ex = 0.46; break;
    case 1: bin_ex = 0.46; break;
    case 2: bin_ex = 0.4; break;
    case 3: bin_ex = 0.38; break;
    case 4: bin_ex = 0.38; break;
    case 5: bin_ex = 0.36; break;
    default: bin_ex = 0.33; break;
  }
  
  // VB6 lines 929-954: Calculate exhaust valve diameter from exhaust min flow area
  const nev = config.numIntakeValvesPerCyl === 1 ? 1 : 2;
  let zvsw_ex = config.numIntakeValvesPerCyl === 1 ? 0.91 : 0.88;
  if (manifoldTypeNum === 2) zvsw_ex = zvsw_ex - 0.02; // IR bias toward low lift flow
  
  let exValveDia = Math.sqrt((exhaustMinFlowArea / nev) * 4 / (PI * (zvsw_ex * zvsw_ex - 0.03)));
  
  // Check if there is room for this exhaust valve head area
  let zmax_exvd = (config.numIntakeValvesPerCyl === 1 ? 0.48 : 0.61) * bore * bore - config.numIntakeValvesPerCyl * vd * vd;
  if (zmax_exvd > 0) {
    zmax_exvd = Math.sqrt(zmax_exvd / nev);
    if (exValveDia > zmax_exvd) {
      exValveDia = zmax_exvd;
      zvsw_ex = 0.925;
      if (manifoldTypeNum === 2) zvsw_ex = zvsw_ex - 0.02;
      // Recalculate exhaustMinFlowArea if valve diameter was constrained
      const newExhaustMinFlowArea = nev * (PI * exValveDia * exValveDia / 4) * (zvsw_ex * zvsw_ex - 0.03);
      if (newExhaustMinFlowArea < exhaustMinFlowArea) {
        exhaustMinFlowArea = newExhaustMinFlowArea;
      }
    }
  }
  
  let exhaustValveLift = bin_ex * exValveDia * Math.pow(hpfps / 130, 0.5);
  const zmin_exlift = 0.3 * exValveDia;
  const zmax_exlift = 0.5 * exValveDia;
  if (exhaustValveLift < zmin_exlift) exhaustValveLift = zmin_exlift;
  if (exhaustValveLift > zmax_exlift) exhaustValveLift = zmax_exlift;
  
  // VB6 lines 982-988: Primary tube length
  const dur_pri = ExLobeCL + ExAdvDur / 2;
  let primaryLength = spd_exhaust * 12 * (dur_pri / 360) / (2 * 2 * rpmAtPeakHP / 60);
  primaryLength = primaryLength - 2 * exValveDia;
  
  // VB6 lines 991-1008: Primary tube diameter
  let area = (2.4 * RamVEHP * hpcfm / numCyl) / (440 / 4);
  let area1 = 2 * BArea * stroke / primaryLength;
  area1 = 0.9 * area1;
  area = 0.6 * area + 0.4 * area1;
  const zmin_pri = BArea * hpfps / 575;
  if (area < zmin_pri) area = zmin_pri;
  const expd = Math.sqrt(4 * area / PI);
  let primaryDia = expd + 2 * 0.05;
  
  // VB6 lines 1011-1019: Collector diameter
  let collectorDia = 0;
  if (numCyl >= 3) {
    let npipes_coll = numCyl;
    if (numCyl >= 6) npipes_coll = Math.floor(numCyl / 2);
    collectorDia = expd * Math.sqrt(7.2 - npipes_coll) + 2 * 0.05;
  }
  
  // VB6 lines 1021-1046: Rounding for normal engines
  if (CID > 10) {
    intakeValveLift = Math.round(intakeValveLift / 0.02) * 0.02;
    intakeMinFlowArea = Math.round(intakeMinFlowArea / 0.05) * 0.05;
    intakeTrackLength = Math.ceil(intakeTrackLength / 0.25) * 0.25;
    plenumVol = Math.round(plenumVol / 5) * 5;
    ExCamDur = Math.round(ExCamDur / 2) * 2;
    exhaustValveLift = Math.round(exhaustValveLift / 0.02) * 0.02;
    exhaustMinFlowArea = Math.ceil(exhaustMinFlowArea / 0.02) * 0.02;
    primaryLength = Math.ceil(primaryLength / 0.5) * 0.5;
    primaryDia = Math.floor(primaryDia / 0.125) * 0.125;
    collectorDia = Math.round(collectorDia / 0.25) * 0.25;
  }
  
  // VB6 line 978: Exhaust max flow area
  const exhaustMaxFlowArea = 1.45 * exhaustMinFlowArea;
  
  // Round intake track volume and max flow area
  let intakeTrackVol_cc = intakeTrackVol * 16.387064; // Convert ci to cc
  let intakeMaxFlowArea_rounded = intakeMaxFlowArea;
  if (CID > 10) {
    intakeTrackVol_cc = Math.ceil(intakeTrackVol_cc / 5) * 5;
    intakeMaxFlowArea_rounded = Math.ceil(intakeMaxFlowArea / 0.05) * 0.05;
    exhaustFlow = Math.floor(exhaustFlow / 5) * 5;
  }
  
  return {
    intakeValveLift_in: intakeValveLift,
    intakeMinFlowArea_sqin: intakeMinFlowArea,
    intakeTrackLength_in: intakeTrackLength,
    intakeMaxFlowArea_sqin: intakeMaxFlowArea_rounded,
    intakeTrackVolume_cc: intakeTrackVol_cc,
    intakeTrackDia_in: Math.sqrt(4 * intakeMinFlowArea / PI),
    intakePlenumVolume_ci: plenumVol,
    
    exhaustFlow_cfm: exhaustFlow,
    exhaustFlow_pctIntake: (exhaustFlow / maxInFlow) * 100,
    exhaustValveDia_in: exValveDia,
    exhaustValveDiaMin_in: Math.round(exValveDia / 0.02) * 0.02,  // Rounded down
    exhaustValveDiaMax_in: Math.round((exValveDia + 0.04) / 0.02) * 0.02,  // +0.04" range
    exhaustValveLift_in: exhaustValveLift,
    exhaustMinFlowArea_sqin: exhaustMinFlowArea,
    exhaustMaxFlowArea_sqin: exhaustMaxFlowArea,
    exhaustPrimaryLength_in: primaryLength,
    exhaustPrimaryDia_in: primaryDia,
    exhaustCollectorDia_in: collectorDia,
    
    lobeSeparationAngle_deg: lobeSepAng,
    intakeLobeCenterline_deg: inLobeCL,
    exhaustDuration_deg: ExCamDur
  };
}
