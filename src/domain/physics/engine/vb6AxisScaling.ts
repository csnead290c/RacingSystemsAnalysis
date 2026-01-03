/**
 * VB6 Axis Scaling Logic
 * Ports the exact axis scaling algorithm from VB6 CDETAILS.CLS
 */

/**
 * Calculate Y-axis scaling for piston speed graph
 * VB6 CDETAILS.CLS lines 177-211
 */
export function calcPistonSpeedAxisScaling(
  rpm: number,
  stroke_in: number,
  rodLength_in: number
): { min: number; max: number; ticks: number; tickInterval: number } {
  const PI = Math.PI;
  const flrqs = Math.sqrt(1 + (rodLength_in / stroke_in) ** 2);
  
  // VB6 line 179: Calculate theoretical max piston speed
  const maxSpeed = rpm * PI * flrqs * stroke_in / 12;
  
  // VB6 lines 182-195: Select tick interval
  let ticks = 5;
  let DY = maxSpeed / ticks;
  
  if (DY <= 100) DY = 100;
  else if (DY <= 200) DY = 200;
  else if (DY <= 400) DY = 400;
  else if (DY <= 500) DY = 500;
  else if (DY <= 800) DY = 800;
  else if (DY <= 1000) DY = 1000;
  else if (DY <= 2000) DY = 2000;
  else if (DY <= 4000) DY = 4000;
  else DY = 5000;
  
  // VB6 lines 198-206: Adjust tick count
  ticks = ticks - 1;
  if (maxSpeed > 0 + ticks * DY) {
    ticks = ticks + 1;
  }
  
  if (0 + ticks * DY > maxSpeed + DY) {
    ticks = ticks - 1;
  }
  
  const yMax = 0 + ticks * DY;
  if (ticks === 3) ticks = 6;
  
  return {
    min: 0,
    max: yMax,
    ticks: ticks,
    tickInterval: DY
  };
}

/**
 * Calculate Y-axis scaling for piston depth graph
 * VB6 CDETAILS.CLS lines 213-244
 */
export function calcPistonDepthAxisScaling(
  stroke_in: number,
  speedAxisTicks: number
): { min: number; max: number; ticks: number; tickInterval: number } {
  // VB6 lines 218-243: Match tick count with speed axis
  let ticks = speedAxisTicks;
  let DY = stroke_in / ticks;
  
  if (DY <= 0.1) DY = 0.1;
  else if (DY <= 0.2) DY = 0.2;
  else if (DY <= 0.4) DY = 0.4;
  else if (DY <= 0.5) DY = 0.5;
  else if (DY <= 0.8) DY = 0.8;
  else if (DY <= 1.0) DY = 1.0;
  else if (DY <= 2.0) DY = 2.0;
  else if (DY <= 4.0) DY = 4.0;
  else DY = 5.0;
  
  // VB6 lines 233-243: Adjust tick count
  ticks = ticks - 1;
  if (stroke_in > 0 + ticks * DY) {
    ticks = ticks + 1;
  }
  
  if (0 + ticks * DY > stroke_in + DY) {
    ticks = ticks - 1;
  }
  
  const yMax = 0 + ticks * DY;
  if (ticks === 3) ticks = 6;
  
  return {
    min: 0,
    max: yMax,
    ticks: ticks,
    tickInterval: DY
  };
}

/**
 * Calculate X-axis scaling for crank angle
 * VB6 CDETAILS.CLS lines 172-175
 */
export function calcCrankAngleAxisScaling(): { min: number; max: number; ticks: number } {
  return {
    min: 0,
    max: 180,
    ticks: 6  // (180 - 0) / 30 = 6
  };
}

/**
 * Calculate Y-axis scaling for dyno graph (HP/TQ)
 * Based on VB6 graph control logic
 */
export function calcDynoAxisScaling(
  peakHP: number,
  peakTQ: number
): { 
  hpAxis: { min: number; max: number; ticks: number };
  tqAxis: { min: number; max: number; ticks: number };
} {
  // Find the larger of the two peaks to determine scale
  const maxValue = Math.max(peakHP, peakTQ);
  
  // Round up to nice number
  let tickInterval: number;
  if (maxValue <= 100) tickInterval = 20;
  else if (maxValue <= 200) tickInterval = 50;
  else if (maxValue <= 400) tickInterval = 50;
  else if (maxValue <= 600) tickInterval = 100;
  else if (maxValue <= 1000) tickInterval = 100;
  else tickInterval = 200;
  
  const ticks = Math.ceil(maxValue / tickInterval);
  const max = ticks * tickInterval;
  
  return {
    hpAxis: { min: 0, max, ticks },
    tqAxis: { min: 0, max, ticks }
  };
}
