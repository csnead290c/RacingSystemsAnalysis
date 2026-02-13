/**
 * QuarterJr v3.2 Output Extraction
 * 
 * Extracts summary ET/MPH from QuarterJr simulation results.
 * Uses the same methodology as QuarterPro - instantaneous MPH at finish distance.
 */

import type { SimResult } from '../index';

export interface QuarterJrSummary {
  eighth_et_s: number | null;
  eighth_mph: number | null;
  quarter_et_s: number | null;
  quarter_mph: number | null;
}

/**
 * Extract QuarterJr summary ET/MPH from simulation result
 * Uses instantaneous MPH at finish distance (same as QuarterPro)
 */
export function extractQuarterJrSummary(result: SimResult, raceLength: 'EIGHTH' | 'QUARTER'): QuarterJrSummary {
  const { timeslip } = result;
  const summary: QuarterJrSummary = {
    eighth_et_s: null,
    eighth_mph: null,
    quarter_et_s: null,
    quarter_mph: null,
  };
  
  // Find entry closest to 1/8 mile (660 ft)
  if (raceLength === 'EIGHTH' || raceLength === 'QUARTER') {
    let closest660 = timeslip[0];
    for (const entry of timeslip) {
      if (Math.abs(entry.d_ft - 660) < Math.abs(closest660.d_ft - 660)) {
        closest660 = entry;
      }
      if (entry.d_ft > 660) break;
    }
    
    // Compute rollout offset to get ET clock time
    let rolloutTime = 0;
    for (const entry of timeslip) {
      if (entry.d_ft >= 1.0) {
        rolloutTime = entry.t_s;
        break;
      }
    }
    
    summary.eighth_et_s = closest660.t_s - rolloutTime;
    summary.eighth_mph = closest660.v_mph;
  }
  
  // Find entry closest to 1/4 mile (1320 ft)
  if (raceLength === 'QUARTER') {
    let closest1320 = timeslip[0];
    for (const entry of timeslip) {
      if (Math.abs(entry.d_ft - 1320) < Math.abs(closest1320.d_ft - 1320)) {
        closest1320 = entry;
      }
      if (entry.d_ft > 1320) break;
    }
    
    // Compute rollout offset
    let rolloutTime = 0;
    for (const entry of timeslip) {
      if (entry.d_ft >= 1.0) {
        rolloutTime = entry.t_s;
        break;
      }
    }
    
    summary.quarter_et_s = closest1320.t_s - rolloutTime;
    summary.quarter_mph = closest1320.v_mph;
  }
  
  return summary;
}

/**
 * Round ET to 0.01 second (VB6 display format)
 */
export function roundET(et: number): number {
  return Math.round(et * 100) / 100;
}

/**
 * Round MPH to 0.1 mph (VB6 display format)
 */
export function roundMPH(mph: number): number {
  return Math.round(mph * 10) / 10;
}

/**
 * Format QuarterJr summary for display (matching VB6 output)
 */
export function formatQuarterJrSummary(summary: QuarterJrSummary, raceLength: 'EIGHTH' | 'QUARTER'): string {
  if (raceLength === 'EIGHTH' && summary.eighth_et_s !== null && summary.eighth_mph !== null) {
    const et = roundET(summary.eighth_et_s);
    const mph = roundMPH(summary.eighth_mph);
    return `${et.toFixed(2)} @ ${mph.toFixed(1)}`;
  }
  
  if (raceLength === 'QUARTER' && summary.quarter_et_s !== null && summary.quarter_mph !== null) {
    const et = roundET(summary.quarter_et_s);
    const mph = roundMPH(summary.quarter_mph);
    return `${et.toFixed(2)} @ ${mph.toFixed(1)}`;
  }
  
  return 'N/A';
}
