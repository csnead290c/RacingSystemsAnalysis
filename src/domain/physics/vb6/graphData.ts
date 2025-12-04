/**
 * VB6 Graph Data Structures
 * 
 * Source: TIMESLIP.FRM lines 1538-1583 (LoadGraph subroutine)
 *         DECLARES.BAS lines 14-19 (Graph constants)
 * 
 * VB6 provides 5 graph types:
 * - GPH_TIME_RPM (0): Time vs RPM/MPH
 * - GPH_TIME_G (1): Time vs Acceleration/Distance
 * - GPH_SEPARATOR (2): Not used
 * - GPH_DIST_RPM (3): Distance vs RPM/MPH
 * - GPH_DIST_G (4): Distance vs Acceleration/Time
 * - GPH_RPM_HIST (6): RPM Histogram
 */

import { Z5 } from './constants';

// Graph type constants (from DECLARES.BAS)
export const GPH_TIME_RPM = 0;
export const GPH_TIME_G = 1;
export const GPH_SEPARATOR = 2;
export const GPH_DIST_RPM = 3;
export const GPH_DIST_G = 4;
export const GPH_RPM_HIST = 6;

/**
 * Single data point from simulation
 */
export interface SimDataPoint {
  time_s: number;
  dist_ft: number;
  vel_fps: number;
  ags_g: number;
  engineRPM: number;
  gear: number;
  slip: boolean;
}

/**
 * Graph data point with X, Y, and optional Y2 values
 */
export interface GraphPoint {
  x: number;
  y: number;
  y2?: number;
}

/**
 * Graph data structure matching VB6's CGraph class
 */
export interface VB6GraphData {
  graphType: number;
  points: number;
  xValues: number[];
  yValues: number[];
  y2Values: number[];
  xLabel: string;
  yLabel: string;
  y2Label?: string;
  title: string;
}

/**
 * Load graph data from simulation trace
 * 
 * VB6: TIMESLIP.FRM lines 1538-1583
 * 
 * @param graphIndex Graph type (0, 1, 3, or 4)
 * @param trace Simulation trace data
 * @returns Graph data structure
 */
export function loadGraphData(
  graphIndex: number,
  trace: SimDataPoint[]
): VB6GraphData {
  const points = trace.length;
  const xValues: number[] = [];
  const yValues: number[] = [];
  const y2Values: number[] = [];
  
  let xLabel = '';
  let yLabel = '';
  let y2Label = '';
  let title = '';
  
  for (let i = 0; i < points; i++) {
    const pt = trace[i];
    
    switch (graphIndex) {
      case GPH_TIME_RPM:
        // Time vs RPM/MPH
        xValues.push(pt.time_s);
        yValues.push(pt.engineRPM);
        y2Values.push(pt.vel_fps * Z5);  // Convert to MPH
        xLabel = 'Time (s)';
        yLabel = 'Engine RPM';
        y2Label = 'MPH';
        title = 'RPM and MPH vs Time';
        break;
        
      case GPH_TIME_G:
        // Time vs Acceleration/Distance
        xValues.push(pt.time_s);
        yValues.push(pt.ags_g);
        y2Values.push(pt.dist_ft);
        xLabel = 'Time (s)';
        yLabel = 'Acceleration (g)';
        y2Label = 'Distance (ft)';
        title = 'Acceleration and Distance vs Time';
        break;
        
      case GPH_DIST_RPM:
        // Distance vs RPM/MPH
        xValues.push(pt.dist_ft);
        yValues.push(pt.engineRPM);
        y2Values.push(pt.vel_fps * Z5);  // Convert to MPH
        xLabel = 'Distance (ft)';
        yLabel = 'Engine RPM';
        y2Label = 'MPH';
        title = 'RPM and MPH vs Distance';
        break;
        
      case GPH_DIST_G:
        // Distance vs Acceleration/Time
        xValues.push(pt.dist_ft);
        yValues.push(pt.ags_g);
        y2Values.push(pt.time_s);
        xLabel = 'Distance (ft)';
        yLabel = 'Acceleration (g)';
        y2Label = 'Time (s)';
        title = 'Acceleration and Time vs Distance';
        break;
        
      default:
        break;
    }
  }
  
  return {
    graphType: graphIndex,
    points,
    xValues,
    yValues,
    y2Values,
    xLabel,
    yLabel,
    y2Label,
    title,
  };
}

/**
 * Build RPM histogram from simulation trace
 * 
 * @param trace Simulation trace data
 * @param binSize RPM bin size (default 500)
 * @returns Histogram data
 */
export function buildRPMHistogram(
  trace: SimDataPoint[],
  binSize: number = 500
): { rpm: number; count: number; percentage: number }[] {
  // Find RPM range
  let minRPM = Infinity;
  let maxRPM = -Infinity;
  
  for (const pt of trace) {
    if (pt.engineRPM < minRPM) minRPM = pt.engineRPM;
    if (pt.engineRPM > maxRPM) maxRPM = pt.engineRPM;
  }
  
  // Round to bin boundaries
  const binStart = Math.floor(minRPM / binSize) * binSize;
  const binEnd = Math.ceil(maxRPM / binSize) * binSize;
  const numBins = Math.ceil((binEnd - binStart) / binSize);
  
  // Count samples in each bin
  const bins: number[] = new Array(numBins).fill(0);
  
  for (const pt of trace) {
    const binIndex = Math.floor((pt.engineRPM - binStart) / binSize);
    if (binIndex >= 0 && binIndex < numBins) {
      bins[binIndex]++;
    }
  }
  
  // Convert to output format
  const total = trace.length;
  const result: { rpm: number; count: number; percentage: number }[] = [];
  
  for (let i = 0; i < numBins; i++) {
    result.push({
      rpm: binStart + i * binSize + binSize / 2,  // Bin center
      count: bins[i],
      percentage: (bins[i] / total) * 100,
    });
  }
  
  return result;
}

/**
 * Convert simulation trace to all graph data formats
 */
export function loadAllGraphs(trace: SimDataPoint[]): Record<number, VB6GraphData> {
  return {
    [GPH_TIME_RPM]: loadGraphData(GPH_TIME_RPM, trace),
    [GPH_TIME_G]: loadGraphData(GPH_TIME_G, trace),
    [GPH_DIST_RPM]: loadGraphData(GPH_DIST_RPM, trace),
    [GPH_DIST_G]: loadGraphData(GPH_DIST_G, trace),
  };
}

/**
 * Format graph data for Recharts
 */
export function toRechartsFormat(graph: VB6GraphData): Array<{
  x: number;
  y: number;
  y2?: number;
}> {
  const result: Array<{ x: number; y: number; y2?: number }> = [];
  
  for (let i = 0; i < graph.points; i++) {
    result.push({
      x: graph.xValues[i],
      y: graph.yValues[i],
      y2: graph.y2Values[i],
    });
  }
  
  return result;
}
