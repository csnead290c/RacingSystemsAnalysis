/**
 * VB6 Flowbench Calculations - Exact Port from ENGPERF.BAS
 * 
 * This module provides deterministic flowbench calculations
 * matching the original VB6 ENGINE Pro code exactly.
 */

const PI = 3.141593; // VB6 constant

export interface FlowbenchValveSeatData {
  valveDia_in: number;
  seatDia_in: number;
  seatPct: number;
  seatAngle_deg: number;
  seatWidth_in: number;
  stemDia_in: number;
}

export interface FlowbenchDataPoint {
  lift_in: number;
  flow_cfm: number;
  area_sqin: number;
  velocity_fps: number;
  flowFlux_cfmPerSqin: number;
  flowVelIndex_pct: number;
}

/**
 * Calculate effective flow area at a given valve lift
 * VB6 ENGPERF.BAS lines 1262-1310 (CalcWSCSArea)
 */
export function calcEffectiveFlowArea(
  valveLift_in: number,
  valveSeatData: FlowbenchValveSeatData,
  numValves: number = 1
): number {
  const vd = valveSeatData.valveDia_in;
  const vsd = valveSeatData.seatDia_in;
  const vstmd = valveSeatData.stemDia_in;
  
  // Calculate trig functions for valve seat angle
  const vsa = valveSeatData.seatAngle_deg * PI / 180;
  const sinb = Math.sin(vsa);
  const cosb = Math.cos(vsa);
  const tanb = Math.tan(vsa);
  
  // Convert input valve seat width to Heywood definition for calculations
  const w = valveSeatData.seatWidth_in * cosb;
  
  // Very low lift - where valve seat really controls
  // VB6 line 1288
  const a1 = numValves * PI * (valveLift_in * cosb) * (vd - 2 * w + valveLift_in * sinb * cosb);
  
  // Valve curtain area - moderate valve lift
  // VB6 lines 1291-1293
  let H = Math.sqrt(Math.pow(valveLift_in - w * tanb, 2) + w * w);
  if (valveLift_in === 0) H = 0;
  const a2 = numValves * PI * (vd - w) * H;
  
  // Valve throat area - high valve lift
  // VB6 line 1296
  const a3 = numValves * PI * (vsd * vsd - vstmd * vstmd) / 4;
  
  // Now choose the controlling flow area
  // VB6 lines 1299-1304
  let work: number;
  if (valveLift_in < w / (sinb * cosb)) {
    work = a1;
  } else {
    work = a2;
    if (a3 < work) work = a3;
  }
  
  // VB6 does a round-trip through formatting to 3 decimals
  // This matches VB6's display precision
  return parseFloat(work.toFixed(3));
}

/**
 * Calculate flowbench data point with derived values
 * VB6 ENGPERF.BAS lines 1200-1250
 */
export function calcFlowbenchDataPoint(
  flow_cfm: number,
  area_sqin: number
): Omit<FlowbenchDataPoint, 'lift_in'> {
  // Velocity (ft/sec) = FlowCFM * 2.4 / Area(in^2)
  // This is because CFM / area(ft^2) / 60 = CFM * 144 / area(in^2) / 60 = CFM * 2.4 / area(in^2)
  const velocity_fps = area_sqin > 0 ? flow_cfm * 2.4 / area_sqin : 0;
  
  // Flow Flux = FlowCFM / Area(in^2)
  const flowFlux_cfmPerSqin = area_sqin > 0 ? flow_cfm / area_sqin : 0;
  
  // Flow Velocity Index - % (VB6 uses 319.0 as reference velocity)
  const flowVelIndex_pct = velocity_fps / 319.0 * 100;
  
  return {
    flow_cfm,
    area_sqin,
    velocity_fps,
    flowFlux_cfmPerSqin,
    flowVelIndex_pct,
  };
}

/**
 * Calculate default valve seat data from valve diameter
 * VB6 defaults from DECLARES.BAS
 */
export function calcDefaultValveSeatData(valveDia_in: number): FlowbenchValveSeatData {
  // VB6 default: seat throat % = 92.4 (typical)
  const seatPct = 92.4;
  // VB6 rounds the seat diameter to 3 decimals
  const seatDia_in = parseFloat((valveDia_in * seatPct / 100).toFixed(3));
  
  // VB6 defaults
  const seatAngle_deg = 55.0;
  const seatWidth_in = 0.080;
  const stemDia_in = 0.324;
  
  return {
    valveDia_in,
    seatDia_in,
    seatPct,
    seatAngle_deg,
    seatWidth_in,
    stemDia_in,
  };
}

/**
 * Calculate flowbench correction factor
 * VB6 ENGPERF.BAS FlowBenchCorr function
 */
export function calcFlowbenchCorrection(
  testPressure_inH2O: number,
  refPressure_inH2O: number = 28.0
): number {
  // VB6: FlowBenchCorr = Sqr(28 / gc_DeltaP.Value) * YFactor
  // YFactor is typically 1.0 for standard conditions
  const YFactor = 1.0;
  return Math.sqrt(refPressure_inH2O / testPressure_inH2O) * YFactor;
}

/**
 * Interpolate flow from flowbench data at a given lift
 */
export function interpolateFlowAtLift(
  lift_in: number,
  flowbenchData: Array<{ lift: number; flow: number }>
): number {
  if (flowbenchData.length === 0) return 0;
  
  // Sort by lift
  const sorted = [...flowbenchData].sort((a, b) => a.lift - b.lift);
  
  // If below minimum, return 0
  if (lift_in <= sorted[0].lift) return sorted[0].flow;
  
  // If above maximum, return max flow
  if (lift_in >= sorted[sorted.length - 1].lift) return sorted[sorted.length - 1].flow;
  
  // Find bracketing points
  for (let i = 0; i < sorted.length - 1; i++) {
    if (lift_in >= sorted[i].lift && lift_in <= sorted[i + 1].lift) {
      // Linear interpolation
      const t = (lift_in - sorted[i].lift) / (sorted[i + 1].lift - sorted[i].lift);
      return sorted[i].flow + t * (sorted[i + 1].flow - sorted[i].flow);
    }
  }
  
  return 0;
}
